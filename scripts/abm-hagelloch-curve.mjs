// EXPERIMENT 199, OPTION 4 (chosen 2026-11-19): the declared measles model's daily curve beside Hagelloch's recorded one.
// Not a fit. Each comparison runs a declared structure and parameter set from models/, 500 seeds, on the 188 children
// in their households and school classes, and sets the model's children per day beside the record's:
//   - SEIR, the spike's set and the Pink Book's: children becoming infectious, against the recorded rash less 4 days
//     (the Pink Book: "transmissible from 4 days before through 4 days after rash onset");
//   - prodrome and rash, the prodrome-rash set, under the scenario hagelloch-as-in-1861 (the school shut on Sundays):
//     children whose rash begins, against the recorded date of rash;
//   - the same, with the periods measured from the record's dates and infectors (2026-11-21).
// Each curve counts from the index child's own day (case 184): its first infectious day, or its rash.
// node scripts/abm-hagelloch-curve.mjs [--json out.json]
import {readFileSync,writeFileSync} from 'node:fs';
import {compile,runDeclared,compileResponse} from '../build/disease-model.js';
const kernel=(await WebAssembly.instantiate(readFileSync(new URL('../kernel/fieldwork-kernel.wasm',import.meta.url)),{})).instance.exports;
const json=path=>JSON.parse(readFileSync(new URL(`../models/${path}/1.0.0.json`,import.meta.url),'utf8'));
const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8')).features.map(f=>f.properties)
  .sort((a,b)=>a.case_ID-b.case_ID);
const n=cases.length,DAYS=150,RUNS=500,index=cases.findIndex(c=>c.case_ID===184);
const families=[...new Set(cases.map(c=>c.family_ID))];
const population={n,groups:{household:cases.map(c=>families.indexOf(c.family_ID)),class:cases.map(c=>Number(c.class))}};
const day=s=>Date.parse(s+'T00:00:00Z')/864e5;

const recorded=shift=>{const on=c=>day(c.date_of_rash)-shift,zero=on(cases[index]),curve=new Array(DAYS).fill(0);let before=0;
  for(const c of cases){const d=on(c)-zero;if(d<0)before++;else if(d<DAYS)curve[d]++;}return {curve,before};};
const q=(xs,f)=>{const s=[...xs].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(f*(s.length-1)+0.5))];};
const summary=curve=>{const total=curve.reduce((a,b)=>a+b,0);let peak=0,cum=0,half=-1,last=0;
  curve.forEach((x,d)=>{if(x>curve[peak])peak=d;cum+=x;if(half<0&&cum>=total/2)half=d;if(x>0)last=d;});
  const after60=curve.slice(61).reduce((a,b)=>a+b,0);
  return {total,peakDay:peak,peakCount:curve[peak],halfDay:half,lastDay:last,after60};};

const COMPARISONS=[
  {id:'spike',structure:'measles-seir-household-class-village',set:'measles-hagelloch-spike',from:['I','R'],against:4,
   what:"SEIR, the spike's set: becoming infectious, against rash less 4 days"},
  {id:'pink-book',structure:'measles-seir-household-class-village',set:'measles-hagelloch-pink-book',from:['I','R'],against:4,
   what:"SEIR, the Pink Book's periods: becoming infectious, against rash less 4 days"},
  {id:'prodrome-rash',structure:'measles-prodrome-rash-household-class-village',set:'measles-hagelloch-prodrome-rash',scenario:'hagelloch-as-in-1861',from:['Q','R'],against:0,
   what:'prodrome and rash, as in 1861 (school shut on Sundays): rash, against the recorded rash'},
  {id:'from-the-record',structure:'measles-prodrome-rash-household-class-village',set:'measles-hagelloch-from-the-record',scenario:'hagelloch-as-in-1861',from:['Q','R'],against:0,
   what:'prodrome and rash, the periods measured from the record, as in 1861: rash, against the recorded rash'},
];
const out={recorded:{},comparisons:{}};
for(const c of COMPARISONS){
  const structure=json(`structures/${c.structure}`),program=compile(structure,json(`parameter-sets/${c.set}`),population);
  const response=c.scenario?compileResponse(structure,json(`response-scenarios/${c.scenario}`),DAYS):undefined;
  const width=structure.states.length,at=c.from.map(id=>structure.states.findIndex(s=>s.id===id));
  const curves=Array.from({length:RUNS},(_,i)=>{
    const run=runDeclared(kernel,program,{seed:i+1,index,days:DAYS,...(response?{response}:{})});
    const reached=d=>at.reduce((t,k)=>t+run.counts[d*width+k],0);
    const fresh=Array.from({length:DAYS},(_,d)=>reached(d)-(d?reached(d-1):0)),zero=fresh.findIndex(x=>x>0);
    return Array.from({length:DAYS},(_,d)=>fresh[d+zero]??0);
  });
  const rec=out.recorded[c.against]??=(()=>{const r=recorded(c.against);return {...r,summary:summary(r.curve)};})();
  const band=Array.from({length:DAYS},(_,d)=>{const xs=curves.map(r=>r[d]);return [q(xs,.05),q(xs,.5),q(xs,.95)];});
  const sums=curves.map(summary),stat=k=>({median:q(sums.map(s=>s[k]),.5),p5:q(sums.map(s=>s[k]),.05),p95:q(sums.map(s=>s[k]),.95)});
  const span=Math.max(rec.summary.lastDay,stat('lastDay').p95)+1;
  let inside=0;for(let d=0;d<span;d++)if(rec.curve[d]>=band[d][0]&&rec.curve[d]<=band[d][2])inside++;
  out.comparisons[c.id]={...c,runs:RUNS,band,inside:`${inside} of ${span} days`,
    ...Object.fromEntries(['total','peakDay','peakCount','halfDay','lastDay','after60'].map(k=>[k,stat(k)]))};
}
const arg=process.argv.indexOf('--json');if(arg>0)writeFileSync(process.argv[arg+1],JSON.stringify(out));
const f=s=>`${s.median} (${s.p5}-${s.p95})`;
for(const [shift,r] of Object.entries(out.recorded)){const s=r.summary;
  console.log(`recorded, rash${shift==='0'?'':` less ${shift} days`}: ${s.total} (${r.before} before the index), peak day ${s.peakDay} with ${s.peakCount}, half by ${s.halfDay}, last ${s.lastDay}, after day 60 ${s.after60}`);}
for(const s of Object.values(out.comparisons))
  console.log(`${s.what}: ${f(s.total)}, peak day ${f(s.peakDay)} with ${f(s.peakCount)}, half by ${f(s.halfDay)}, last ${f(s.lastDay)}, after day 60 ${f(s.after60)}; recorded inside the band ${s.inside}`);
