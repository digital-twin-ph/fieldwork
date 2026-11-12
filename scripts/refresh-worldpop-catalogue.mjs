#!/usr/bin/env node
/** REFRESH THE WORLDPOP GLOBAL2 LISTING in widgets/worldpop-catalogue.json, from WorldPop's own folders.
 *
 *  The browser cannot do this: data.worldpop.org and hub.worldpop.org send no Access-Control-Allow-Origin header
 *  (checked 2026-11-11), so the catalogue is bundled and refreshed here, weekly, by .github/workflows/worldpop-catalogue.yml.
 *
 *  For the release the catalogue names, it reads the year folders, the country folders of the year whose sizes it keeps,
 *  and the Content-Length of each country's 100 m total (HEAD only; nothing is downloaded). A country whose folder holds
 *  no 100 m total is listed under `withoutTotal100m`. A newer release folder is reported, never adopted: its citation, DOI
 *  and licence are read on WorldPop's pages by a person before the catalogue names it.
 *
 *  Any failed request stops the run without writing: a country missing because a request timed out is not a country
 *  WorldPop withdrew.
 *
 *  node scripts/refresh-worldpop-catalogue.mjs [--summary <file>] [--check]
 *    --summary  write what changed, as Markdown, to <file>
 *    --check    report only; never write the catalogue
 *  Prints `changed=true|false` and `report=true|false`, and appends them to $GITHUB_OUTPUT when set. */
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';

const FILE=new URL('../widgets/worldpop-catalogue.json',import.meta.url);
const ROOT='https://data.worldpop.org/GIS/Population/Global_2015_2030/';
const args=process.argv.slice(2);
const summaryAt=args.includes('--summary')?args[args.indexOf('--summary')+1]:null;
const checkOnly=args.includes('--check');

async function request(url,method='GET'){
  for(let attempt=1;;attempt++){
    try{
      const r=await fetch(url,{method,signal:AbortSignal.timeout(60000)});
      if(r.status===404)return null;
      if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);
      return r;
    }catch(e){
      if(attempt>=3)throw new Error(`${method} ${url}: ${e.message}`);
      await new Promise(done=>setTimeout(done,2000*attempt));
    }
  }
}
const folders=async url=>{
  const r=await request(url);
  if(!r)throw new Error(`No listing at ${url}`);
  return [...(await r.text()).matchAll(/href="([^"?/][^"]*)\/"/g)].map(m=>m[1]);
};
async function pool(items,width,work){
  const out=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:width},async()=>{while(next<items.length){const i=next++;out[i]=await work(items[i]);}}));
  return out;
}

const catalogue=JSON.parse(readFileSync(FILE,'utf8'));
const g2=catalogue.global2;
const releases=(await folders(ROOT)).filter(n=>/^R\d{4}[A-Z]$/.test(n)).sort();
const newest=releases.at(-1);
const years=(await folders(`${ROOT}${g2.release}/`)).filter(n=>/^\d{4}$/.test(n)).sort();
const isos=(await folders(`${ROOT}${g2.release}/${g2.sizesFor}/`)).filter(n=>/^[A-Z]{3}$/.test(n)).sort();
const pattern=g2.pathPattern;
const sized=await pool(isos,4,async iso3=>{
  const url=pattern.replaceAll('{year}',g2.sizesFor).replaceAll('{ISO3}',iso3).replaceAll('{iso3}',iso3.toLowerCase());
  const r=await request(url,'HEAD');
  return {iso3,bytes:r?Number(r.headers.get('content-length')):null};
});
const countries=sized.filter(c=>c.bytes).map(c=>({iso3:c.iso3,bytes:c.bytes}));
const without=sized.filter(c=>!c.bytes).map(c=>c.iso3);
const span=[years[0],years.at(-1)];

const lines=[];
const before=new Map(g2.countries.map(c=>[c.iso3,c.bytes])),after=new Map(countries.map(c=>[c.iso3,c.bytes]));
const added=[...after.keys()].filter(k=>!before.has(k)),removed=[...before.keys()].filter(k=>!after.has(k));
const resized=[...after.keys()].filter(k=>before.has(k)&&before.get(k)!==after.get(k));
if(span.join()!==g2.years.join())lines.push(`- Years of ${g2.release}: ${g2.years.join('–')} → ${span.join('–')}`);
if(added.length)lines.push(`- Countries with a 100 m total, added: ${added.join(', ')}`);
if(removed.length)lines.push(`- Countries with a 100 m total, no longer found: ${removed.join(', ')}`);
if(resized.length)lines.push(`- ${g2.sizesFor} file size changed: ${resized.map(k=>`${k} ${before.get(k)} → ${after.get(k)} bytes`).join('; ')}`);
const changed=lines.length>0;
const newer=newest&&newest>g2.release?newest:null;
if(newer)lines.push(`- A newer release folder exists: **${newer}** (the catalogue names ${g2.release}). Not adopted: read its `
  +`release statement, DOI, citation and licence on WorldPop's pages, then set \`release\`, \`pathPattern\`, \`years\`, \`doi\`, `
  +`\`citation\`, \`licence\` and \`note\` in widgets/worldpop-catalogue.json and run this script again.`);

if(changed&&!checkOnly){
  const today=new Date().toISOString().slice(0,10);
  Object.assign(g2,{takenAt:today,years:span,withoutTotal100m:without,countries,sizesFrom:`Content-Length of each ${g2.sizesFor} file, ${today}`});
  writeFileSync(FILE,JSON.stringify(catalogue,null,2)+'\n');
}
const report=changed||Boolean(newer);
if(summaryAt)writeFileSync(summaryAt,report
  ?`WorldPop Global2 listing, read from ${ROOT} on ${new Date().toISOString().slice(0,10)}:\n\n${lines.join('\n')}\n`
  :'No change.\n');
const result=`changed=${changed}\nreport=${report}\n`;
process.stdout.write(lines.length?lines.join('\n')+'\n'+result:`No change: ${g2.release}, ${span.join('–')}, ${countries.length} countries.\n`+result);
if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,result);
