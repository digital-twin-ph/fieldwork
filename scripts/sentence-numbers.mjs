#!/usr/bin/env node
/** EVERY NUMBER IN A SENTENCE COMES FROM ITS RESULT (experiment 208, observed before enforced). Runs each built-in worked
 *  example and, for each step, takes the numbers in the sentence its run writes (the receipt's method) and looks for each
 *  among the numbers that step's receipt facts and output hold. A number found nowhere is a number the sentence made up,
 *  as "189 records" was on 2026-11-12. Reports; never fails.
 *  node scripts/sentence-numbers.mjs [--json] */
import {Parser} from 'n3';
import {EXAMPLE_TEMPLATES} from '../build/example-templates.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';

const numbersIn=text=>[...String(text).matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map(m=>Number(m[0].replace(/,/g,''))).filter(Number.isFinite);
const harvest=(value,into,depth=0)=>{
  if(depth>6||value==null)return;
  if(typeof value==='number'){into.add(value);return;}
  if(typeof value==='string'){for(const n of numbersIn(value))into.add(n);return;}
  if(Array.isArray(value)){into.add(value.length);for(const v of value.slice(0,5000))harvest(v,into,depth+1);return;}
  if(typeof value==='object')for(const [k,v] of Object.entries(value))if(k!=='method')harvest(v,into,depth+1);
};
const findings=[];let steps=0,numbers=0;
for(const [key,make] of Object.entries(EXAMPLE_TEMPLATES)){
  const w=make();
  const ready=w.nodes.filter(n=>n.type==='study_area').map(n=>({subject:'urn:fieldwork:area:'+n.id,predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}));
  let run;try{run=await executeWorkflow(validateWorkflow(w),async()=>ready);}catch{continue;}
  for(const r of run.receipts){
    if(!r.method)continue;steps++;
    const known=new Set();
    harvest(r,known);
    for(const o of run.outputs.filter(o=>o.nodeId===r.nodeId))harvest(o,known);
    try{for(const q of new Parser().parse(r.facts??''))for(const n of numbersIn(q.object.value))known.add(n);}catch{}
    for(const n of numbersIn(r.method)){numbers++;
      // A year, a small ordinal and the like are not results; a number between 0 and 3 is too common to tell.
      if(known.has(n)||Math.abs(n)<=3)continue;
      findings.push({example:key,step:r.nodeId,number:n,sentence:r.method.slice(0,200)});}
  }
}
if(process.argv.includes('--json'))console.log(JSON.stringify({steps,numbers,findings},null,1));
else{console.log(`${steps} steps, ${numbers} numbers in their sentences, ${findings.length} found in no result of the step:`);
  for(const f of findings)console.log(`  ${f.example} · ${f.step} · ${f.number}  "${f.sentence}"`);}
