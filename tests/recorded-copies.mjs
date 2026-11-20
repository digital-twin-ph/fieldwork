import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';

/** RECORDED COPIES OF OUTSIDE SERVICES (docs/audits/gating-audit.md, decided 2026-11-19). Gates 223 to 225 failed only
 *  because geoBoundaries sent Brazil's 76 MB of municipalities at about 33 KB/s. A browser test now asks this folder
 *  first: each answer the service gave, saved by its URL. The live services are checked apart, on GitHub.
 *
 *  The folder is beside this repository, not in it: Brazil's file alone is 76 MB, and geoBoundaries' licences differ
 *  by boundary, some share-alike. FIELDWORK_RECORDED names another folder.
 *
 *  - A URL with a copy is answered from it.
 *  - A URL without one goes to the service, as before, unless FIELDWORK_RECORD=1, which saves the answer.
 *  - FIELDWORK_LIVE=1 ignores the copies: every request goes to the service.
 *
 *  RECORDED.json lists each copy with its URL, size, sha256 and the time it was saved. */
const ROOT=process.env.FIELDWORK_RECORDED?new URL(`file://${process.env.FIELDWORK_RECORDED.replace(/\/?$/,'/')}`)
  :new URL('../../fieldwork-recorded/',import.meta.url);
const INDEX=new URL('RECORDED.json',ROOT);

/** The services answered from copies, and where each URL's copy lives in the folder. */
export const RECORDED_SERVICES=[
  {pattern:/^https:\/\/www\.geoboundaries\.org\/api\/current\//,
    path:url=>`geoboundaries/api/${url.pathname.replace(/^\/api\/current\//,'').replace(/\/$/,'')}.json`,
    type:'application/json'},
  {pattern:/^https:\/\/media\.githubusercontent\.com\/media\/wmgeolab\/geoBoundaries\//,
    path:url=>`geoboundaries/files/${url.pathname.replace(/^\/media\/wmgeolab\/geoBoundaries\//,'')}`,
    type:'application/geo+json'},
];

const readIndex=()=>existsSync(INDEX)?JSON.parse(readFileSync(INDEX,'utf8')):{copies:{}};

export async function answerFromRecordedCopies(page){
  if(process.env.FIELDWORK_LIVE)return;
  const record=!!process.env.FIELDWORK_RECORD;
  for(const service of RECORDED_SERVICES)await page.route(service.pattern,async route=>{
    const url=new URL(route.request().url());
    const file=new URL(service.path(url),ROOT);
    const headers={'access-control-allow-origin':'*','content-type':service.type};
    if(existsSync(file))return route.fulfill({status:200,headers,body:readFileSync(file)});
    if(!record)return route.fallback();
    const response=await route.fetch({timeout:0});
    const body=await response.body();
    if(response.ok()){
      mkdirSync(dirname(file.pathname),{recursive:true});writeFileSync(file,body);
      const index=readIndex();
      index.copies[service.path(url)]={url:url.href,bytes:body.length,
        sha256:createHash('sha256').update(body).digest('hex'),recorded:new Date().toISOString()};
      writeFileSync(INDEX,JSON.stringify(index,null,2)+'\n');
    }
    return route.fulfill({response,body,headers:{...response.headers(),'access-control-allow-origin':'*'}});
  });
}
