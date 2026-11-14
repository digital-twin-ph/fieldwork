#!/usr/bin/env node
/** EVERY NUMBER IN A SENTENCE COMES FROM ITS RESULT (experiment 208). Runs each built-in worked example and each example
 *  pinned in widgets/examples.json whose repository is checked out beside this one, at its pinned commit, and for each
 *  step takes the numbers in the sentence its run writes (the receipt's method). Each must be one of the numbers that
 *  step's receipt facts and output hold, as the sentence shows it: rounded to the decimals the sentence gives. A number
 *  found nowhere is one the sentence made up, as "189 records" of 162 was on 2026-11-12.
 *
 *  Not numbers of a result, and set aside before looking: a standard's name ("ISO 8601", "EPSG:32630") and a number
 *  inside a name ("case-141", "SK_39"). A number from 0 to 3 is too common to tell where it came from.
 *
 *  node scripts/sentence-numbers.mjs [--json] [--strict] [--working] [--twice]
 *  --strict: exit 1 on any finding. --working: each example repository's working copy, not its pinned commit.
 *  --twice: run each workflow again and compare every output and table by digest (precision). */
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Parser} from 'n3';
import {EXAMPLE_TEMPLATES} from '../build/example-templates.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';

const root=new URL('..',import.meta.url);
/** THE PINNED FILES, FROM THE CHECKOUTS: a table an example fetches from GitHub at its pinned commit is read from the
 *  repository beside this one at that commit, and the NYC package from NYC_PKG where it is set. Nothing else is fetched. */
const fetchedFrom=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
  const url=String(input?.url??input);
  const raw=url.match(/^https:\/\/raw\.githubusercontent\.com\/digital-twin-ph\/([^/]+)\/([0-9a-f]{7,40})\/(.+)$/);
  if(raw){try{return new Response(execFileSync('git',['-C',new URL(`../${raw[1]}/`,root).pathname,'show',`${raw[2]}:${decodeURIComponent(raw[3])}`],{maxBuffer:1<<30}));}
    catch{return new Response('',{status:404});}}
  if(/zenodo\.org\/api\/records\/22757330\//.test(url)&&process.env.NYC_PKG)return new Response(readFileSync(process.env.NYC_PKG));
  return fetchedFrom(input,init);
};
const STANDARD=/\b(?:ISO|EPSG|RFC|IEC|ICD|WGS|UTM|ISO\/IEC)[\s:-]*\d[\d:.-]*/g;
const DATE=/\b\d{4}-\d{2}(?:-\d{2}(?:T[\d:.]+Z?)?)?\b/g;
/** "and 157 more" is the remainder of a list the sentence names, not a result. */
const REMAINDER=/\band [\d,]+ more\b/g;
/** "Rule 5: 3" names a rule by its place in the ruleset, as "SK_39" names a case: the 5 is a label, the 3 the result
 *  (found 2026-11-13 on MERS's event review, whose fifth rule's number matched no value). */
const RULE_LABEL=/\bRule \d+(?=:)/g;
/** "(Besag and Clifford 1991)" cites a method; its year is a reference, not a result (2026-11-14). */
const CITATION=/\([A-Z][A-Za-z.' -]+(?: and [A-Z][A-Za-z.' -]+| et al\.?)?,? (?:1[89]|20)\d{2}[a-z]?\)/g;
const IN_A_NAME=/[A-Za-z_][\w]*[-_:]\d[\w.-]*|\b[A-Za-z]+\d[\w]*/g;
/** The numbers a sentence states, each with the decimals it is shown to. */
const stated=text=>[...String(text).replace(STANDARD,' ').replace(DATE,' ').replace(REMAINDER,' ').replace(RULE_LABEL,' ').replace(CITATION,' ').replace(IN_A_NAME,' ')
  .matchAll(/-?\d[\d,]*(?:\.(\d+))?(\s?%)?/g)]
  .map(m=>({value:Number(m[0].replace(/[,%\s]/g,'')),decimals:m[1]?.length??0,percent:!!m[2]})).filter(n=>Number.isFinite(n.value));
const numbersIn=text=>[...String(text).matchAll(/-?\d[\d,]*(?:\.\d+)?(?:e-?\d+)?/gi)].map(m=>Number(m[0].replace(/,/g,''))).filter(Number.isFinite);
const harvest=(value,into,depth=0)=>{
  if(depth>6||value==null)return;
  if(typeof value==='number'){into.add(value);return;}
  if(typeof value==='string'){for(const n of numbersIn(value))into.add(n);return;}
  if(Array.isArray(value)){into.add(value.length);for(const v of value.slice(0,5000))harvest(v,into,depth+1);return;}
  if(typeof value==='object')for(const [k,v] of Object.entries(value))if(k!=='method')harvest(v,into,depth+1);
};
const shown=(v,decimals)=>Math.round(v*10**decimals)/10**decimals;

/** Every workflow to run: the built-in examples, then each pinned example checked out beside this repository. */
function* workflows(){
  for(const [key,make] of Object.entries(EXAMPLE_TEMPLATES))yield {example:key,make};
  const pinned=JSON.parse(readFileSync(new URL('widgets/examples.json',root),'utf8'));
  for(const entry of pinned.examples??pinned){
    const repo=new URL(`../${entry.repository.split('/').pop()}/`,root);
    if(!existsSync(repo)||!entry.files?.some(f=>f.path==='fieldwork-project.json.gz'))continue;
    let doc;
    try{doc=JSON.parse(gunzipSync(process.argv.includes('--working')?readFileSync(new URL('fieldwork-project.json.gz',repo))
      :execFileSync('git',['-C',repo.pathname,'show',`${entry.commit}:fieldwork-project.json.gz`],{maxBuffer:1<<30})));}
    catch{yield {example:entry.id,notRun:'the pinned commit is not in the local checkout'};continue;}
    for(const w of doc.workflows??[])yield {example:`${entry.id.split(':').pop()} · ${w.document?.name??w.key}`,make:()=>structuredClone(w.document?.workflow??w.document)};
  }
}

const findings=[],notRun=[],unequal=[];let steps=0,numbers=0;
const digestOf=(value,runId)=>createHash('sha256').update(JSON.stringify(value??null)
  .replaceAll(runId,'RUN').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,'TIME')).digest('hex');
for(const {example,make,notRun:why} of workflows()){
  if(why){notRun.push({example,why});continue;}
  const w=make();
  if(!w?.nodes){notRun.push({example,why:'no workflow in the saved document'});continue;}
  const ready=w.nodes.filter(n=>n.type==='study_area').map(n=>({subject:'urn:fieldwork:area:'+n.id,predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}));
  // A TABLE FETCHED FROM WHERE IT IS PUBLISHED is read as the app reads it before a run: the pinned file, its digest
  // checked, its rows read with the table's own settings.
  try{for(const node of w.nodes){
    if(node.type!=='table_input'||!node.params.remote||node.params.data?.rows?.length)continue;
    const {fetchRemoteTable}=await import('../build/remote-table.js'),{tableFromFetched}=await import('../build/data-table-ui.js');
    const p=node.params,file=await fetchRemoteTable(p.remote);
    const read=await tableFromFetched(file,{keys:p.keys,valueField:p.valueField,unit:p.unit,
      ...((p.source?.sheet??p.data.source?.sheet)?{sheet:p.source?.sheet??p.data.source?.sheet}:{}),
      ...(p.wide?{wide:p.wide}:{}),primaryKey:p.data.primaryKey,secondaryKeys:p.data.secondaryKeys});
    p.data={...read.data,...(p.data.source?{source:p.data.source}:{})};
    if(read.sourceTable){p.sourceTable=read.sourceTable;p.sourceRef=`source:${p.remote.sha256}`;}
  }}catch(error){notRun.push({example,why:`its table could not be read here: ${String(error?.message??error).slice(0,120)}`});continue;}
  let run;try{run=await executeWorkflow(validateWorkflow(w),async()=>ready);}
  catch(error){notRun.push({example,why:String(error?.message??error).slice(0,140)});continue;}
  // PRECISION: the same workflow run again gives the same results, step by step, once its run id and clock times are
  // set aside. Any difference is a result that depends on something other than its inputs.
  if(process.argv.includes('--twice')){
    let again;try{again=await executeWorkflow(validateWorkflow(make()),async()=>ready);}catch{again=null;}
    if(again)for(const o of run.outputs){
      const twin=again.outputs.find(x=>x.nodeId===o.nodeId);
      if(digestOf(o,run.runId)!==digestOf(twin,again.runId)||digestOf(run.tables?.[o.nodeId],run.runId)!==digestOf(again.tables?.[o.nodeId],again.runId))
        unequal.push({example,step:o.nodeId});
    }
  }
  for(const r of run.receipts){
    if(!r.method)continue;steps++;
    // What the step may say a number of: its own receipt, output and table, the settings a person gave it, and what came
    // in from the steps it reads (a count of what it read, a column's name).
    const known=new Set(),node=w.nodes.find(n=>n.id===r.nodeId);
    const about=id=>{
      for(const x of run.receipts.filter(x=>x.nodeId===id)){harvest(x,known);
        try{for(const q of new Parser().parse(x.facts??''))for(const n of numbersIn(q.object.value))known.add(n);}catch{}}
      for(const o of run.outputs.filter(o=>o.nodeId===id))harvest(o,known);
      harvest(run.tables?.[id],known);
    };
    about(r.nodeId);harvest(node?.params,known);
    for(const e of w.edges.filter(e=>e.to===r.nodeId))about(e.from);
    const values=[...known];
    for(const n of stated(r.method)){numbers++;
      if(Math.abs(n.value)<=3)continue;
      if(values.some(v=>Math.abs(shown(v,n.decimals)-n.value)<1e-9||n.percent&&Math.abs(shown(v*100,n.decimals)-n.value)<1e-9))continue;
      findings.push({example,step:r.nodeId,number:n.value,sentence:r.method.slice(0,240)});}
  }
}
if(process.argv.includes('--json'))console.log(JSON.stringify({steps,numbers,findings,notRun,...(process.argv.includes('--twice')?{unequal}:{})},null,1));
else{
  console.log(`${steps} steps, ${numbers} numbers in their sentences, ${findings.length} found in no result of the step.`);
  for(const f of findings)console.log(`  ${f.example} · ${f.step} · ${f.number}  "${f.sentence}"`);
  if(process.argv.includes('--twice'))console.log(unequal.length?`Run twice, ${unequal.length} outputs differed:\n`+unequal.map(u=>`  ${u.example} · ${u.step}`).join('\n'):'Run twice, every output was identical.');
  if(notRun.length){console.log(`Not run (${notRun.length}):`);for(const n of notRun)console.log(`  ${n.example}: ${n.why}`);}
}
if(process.argv.includes('--strict')&&(findings.length||unequal.length))process.exit(1);
