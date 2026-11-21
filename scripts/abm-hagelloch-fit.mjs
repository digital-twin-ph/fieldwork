// EXPERIMENT 199, THE FIT (the practitioner, 2026-11-21: "Yes start", after the periods were read from the record).
// The three probabilities of the prodrome-and-rash model (household, school class, village), fitted to Hagelloch's
// recorded rashes per day, with the periods measured from the record held fixed (measles-hagelloch-from-the-record)
// and the school shut on Sundays (hagelloch-as-in-1861). The measure is the Poisson deviance of the record's children
// per day against the model's mean over its runs, days 0 to 89 from the index child's rash. A coarse grid, then a finer
// one around the best point; the surface is reported, not only its lowest point, since probabilities that trade
// against each other fit equally well.
// --by-class (the practitioner, 2026-11-21, "Agree with probability suggestion"): each school class its own probability,
// on measles-prodrome-rash-household-classes-village, four probabilities fitted together. Class 1 came out in the rash in
// one burst (25 of 30 in four days), which one probability for both classes could not make.
// node scripts/abm-hagelloch-fit.mjs [--by-class] [--json out.json] [--periods latent_period=8-9,prodrome=4-4]
import {readFileSync,writeFileSync} from 'node:fs';
import {compile,runDeclared,compileResponse} from '../build/disease-model.js';
const kernel=(await WebAssembly.instantiate(readFileSync(new URL('../kernel/fieldwork-kernel.wasm',import.meta.url)),{})).instance.exports;
const json=path=>JSON.parse(readFileSync(new URL(`../models/${path}/1.0.0.json`,import.meta.url),'utf8'));
const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8')).features.map(f=>f.properties)
  .sort((a,b)=>a.case_ID-b.case_ID);
const n=cases.length,DAYS=150,SPAN=90,index=cases.findIndex(c=>c.case_ID===184);
const families=[...new Set(cases.map(c=>c.family_ID))];
const population={n,groups:{household:cases.map(c=>families.indexOf(c.family_ID)),class:cases.map(c=>Number(c.class)),
  class_1:cases.map(c=>c.class==='1'?1:0),class_2:cases.map(c=>c.class==='2'?1:0)}};
const day=s=>Date.parse(s+'T00:00:00Z')/864e5;
const recorded=new Array(SPAN).fill(0);
for(const c of cases){const d=day(c.date_of_rash)-day(cases[index].date_of_rash);if(d>=0&&d<SPAN)recorded[d]++;}

const BY_CLASS=process.argv.includes('--by-class');
const NETS=BY_CLASS?['household','class_1','class_2','village']:['household','class','village'];
const structure=json(`structures/${BY_CLASS?'measles-prodrome-rash-household-classes-village':'measles-prodrome-rash-household-class-village'}`);
// The periods of the record's set; by class, its one class probability stands for each class's until the grid sets them.
const set=json('parameter-sets/measles-hagelloch-from-the-record');
if(BY_CLASS){set.structure={id:structure.id,version:structure.version};set.values.p_class_1=set.values.p_class_2=set.values.p_class;delete set.values.p_class;}
const program=compile(structure,set,population);
const response=compileResponse(structure,json(`response-scenarios/${BY_CLASS?'hagelloch-as-in-1861-by-class':'hagelloch-as-in-1861'}`),DAYS);
// --periods latent_period=8-9,prodrome=4-4: a sensitivity, the declared periods replaced for this run only.
const periods=process.argv.indexOf('--periods');
if(periods>0)for(const part of process.argv[periods+1].split(',')){const [id,span]=part.split('='),[lo,hi]=span.split('-').map(Number);
  const k=structure.course.findIndex(c=>c.duration===id);if(k<0)throw new Error(`no period ${id}`);program.steps[k][2]=lo;program.steps[k][3]=hi;}
const width=structure.states.length,at=['Q','R'].map(id=>structure.states.findIndex(s=>s.id===id));
const net=id=>program.nets[structure.networks.findIndex(x=>x.id===id)];

const curves=(p,runs)=>{NETS.forEach((id,i)=>{net(id).probability=p[i];});
  return Array.from({length:runs},(_,i)=>{
    const run=runDeclared(kernel,program,{seed:i+1,index,days:DAYS,response});
    const reached=d=>at.reduce((t,k)=>t+run.counts[d*width+k],0);
    const fresh=Array.from({length:DAYS},(_,d)=>reached(d)-(d?reached(d-1):0)),zero=fresh.findIndex(x=>x>0);
    return Array.from({length:SPAN},(_,d)=>fresh[d+zero]??0);});};
const deviance=mean=>2*recorded.reduce((t,y,d)=>{const m=Math.max(mean[d],1e-3);return t+(y?y*Math.log(y/m):0)-(y-m);},0);
const score=(p,runs)=>{const cs=curves(p,runs),mean=recorded.map((_,d)=>cs.reduce((t,c)=>t+c[d],0)/runs);
  return {p,deviance:deviance(mean),mean,cs};};
const geo=(lo,hi,k)=>Array.from({length:k},(_,i)=>lo*(hi/lo)**(i/(k-1)));
const product=axes=>axes.reduce((all,axis)=>all.flatMap(p=>axis.map(x=>[...p,x])),[[]]);
const grid=(axes,runs)=>{const out=[];for(const p of product(axes)){const s=score(p,runs);out.push({p:s.p,deviance:s.deviance});}
  return out.sort((x,y)=>x.deviance-y.deviance);};

// --at 0.1,0.3,0.015,0.004: no grid; the run at these values, its deviance and the spread of its runs' peak days.
const atArg=process.argv.indexOf('--at');
if(atArg>0){const p=process.argv[atArg+1].split(',').map(Number),runs=500;
  const s=score(p,runs),peaks=s.cs.map(c=>Math.max(...c)).sort((a,b)=>a-b);
  console.log(`at ${p.join(', ')}: deviance ${s.deviance.toFixed(1)}; peak day count median ${peaks[runs>>1]}, 95th ${peaks[Math.floor(runs*.95)]}`);
  process.exit(0);}
const t0=performance.now();
const around=(x,lo,hi,k)=>geo(Math.max(lo,x/2),Math.min(hi,x*2),k);
const coarse=BY_CLASS?grid([geo(0.05,0.9,5),geo(0.002,0.5,8),geo(0.002,0.5,8),geo(0.0005,0.01,6)],100)
  :grid([geo(0.01,0.5,8),geo(0.002,0.3,10),geo(0.0001,0.01,8)],100);
const fine=grid(coarse[0].p.map((x,i)=>NETS[i]==='village'?around(x,0.00002,0.05,BY_CLASS?5:7):around(x,0.0005,0.9,BY_CLASS?5:7)),300);
const best=score(fine[0].p,1000);
const q=(xs,f)=>{const s=[...xs].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(f*(s.length-1)+0.5))];};
const summary=curve=>{const total=curve.reduce((a,b)=>a+b,0);let peak=0,cum=0,half=-1,last=0;
  curve.forEach((x,d)=>{if(x>curve[peak])peak=d;cum+=x;if(half<0&&cum>=total/2)half=d;if(x>0)last=d;});
  return {total,peakDay:peak,peakCount:curve[peak],halfDay:half,lastDay:last};};
const band=recorded.map((_,d)=>{const xs=best.cs.map(r=>r[d]);return [q(xs,.05),q(xs,.5),q(xs,.95)];});
const sums=best.cs.map(summary),stat=k=>({median:q(sums.map(s=>s[k]),.5),p5:q(sums.map(s=>s[k]),.05),p95:q(sums.map(s=>s[k]),.95)});
const rec=summary(recorded),span=Math.max(rec.lastDay,stat('lastDay').p95)+1;
let inside=0;for(let d=0;d<span;d++)if(recorded[d]>=band[d][0]&&recorded[d]<=band[d][2])inside++;
const peak3=[29,30,31],within=Math.round(fine[0].deviance)+4;
const near=fine.filter(x=>x.deviance<=within);
const range=i=>[Math.min(...near.map(x=>x.p[i])),Math.max(...near.map(x=>x.p[i]))];
const ASSUMED=BY_CLASS?[0.08,0.02,0.02,0.002]:[0.08,0.02,0.002],before=score(ASSUMED,1000);
const out={recorded,coarseTop:coarse.slice(0,10),fineTop:fine.slice(0,10),best:{p:best.p,deviance:best.deviance,
  inside:`${inside} of ${span} days`,peak3p95:peak3.reduce((t,d)=>t+band[d][2],0),peak3recorded:peak3.reduce((t,d)=>t+recorded[d],0),
  ...Object.fromEntries(['total','peakDay','peakCount','halfDay','lastDay'].map(k=>[k,stat(k)]))},
  assumedDeviance:before.deviance,nearBest:{within,count:near.length,of:fine.length,...Object.fromEntries(NETS.map((id,i)=>[id,range(i)]))},
  seconds:Math.round((performance.now()-t0)/1000)};
const arg=process.argv.indexOf('--json');if(arg>0)writeFileSync(process.argv[arg+1],JSON.stringify(out));
const f=s=>`${s.median} (${s.p5}-${s.p95})`,r3=x=>x.map(y=>+y.toPrecision(3));
console.log(`recorded: ${rec.total}, peak day ${rec.peakDay} with ${rec.peakCount}, half by ${rec.halfDay}, last ${rec.lastDay}`);
console.log(`${NETS.join(', ')}; the assumed probabilities (${ASSUMED.join(', ')}): deviance ${before.deviance.toFixed(1)}`);
console.log('coarse, best five:',coarse.slice(0,5).map(x=>`${r3(x.p)} ${x.deviance.toFixed(1)}`).join('; '));
console.log('fine, best five:',fine.slice(0,5).map(x=>`${r3(x.p)} ${x.deviance.toFixed(1)}`).join('; '));
const b=out.best;
console.log(`best ${r3(b.p)}, deviance ${b.deviance.toFixed(1)} over 1000 runs: ${f(b.total)}, peak day ${f(b.peakDay)} with ${f(b.peakCount)}, half by ${f(b.halfDay)}, last ${f(b.lastDay)}; inside the band ${b.inside}; peak three days p95 ${b.peak3p95} against ${b.peak3recorded}`);
console.log(`within 4 of the best on the fine grid: ${near.length} of ${fine.length} points; ${NETS.map((id,i)=>`${id} ${r3(range(i))}`).join(', ')}; ${out.seconds} s`);
