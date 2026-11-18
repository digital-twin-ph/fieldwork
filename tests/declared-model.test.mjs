import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStructure,validateParameterSet,missingValues,evidenceSummary,compile,runDeclared} from '../build/disease-model.js';

/** EXPERIMENT 220'S SPIKE: measles declared as data runs in the kernel Fieldwork ships, and gives what measles written
 *  by hand gives, seed for seed. */
const kernel=(await WebAssembly.instantiate(readFileSync(new URL('../kernel/fieldwork-kernel.wasm',import.meta.url)),{})).instance.exports;
const json=path=>JSON.parse(readFileSync(new URL(`../models/${path}`,import.meta.url),'utf8'));
const structure=json('structures/measles-seir-household-class-village/1.0.0.json');
const spike=json('parameter-sets/measles-hagelloch-spike/1.0.0.json');
const pinkBook=json('parameter-sets/measles-hagelloch-pink-book/1.0.0.json');
const n=60,population={n,groups:{household:Array.from({length:n},(_,i)=>Math.floor(i/3)),class:Array.from({length:n},(_,i)=>i%3)}};

const byHand=(seed,index,days)=>{
  assert.equal(kernel.abm_prepare(n,days),1);
  new Int32Array(kernel.memory.buffer,kernel.abm_ptr(0),n).set(population.groups.household);
  new Int32Array(kernel.memory.buffer,kernel.abm_ptr(1),n).set(population.groups.class);
  const ever=kernel.abm_run(BigInt(seed),index,0.08,0.02,0.002,10,12,8,9)>>>0;
  return {ever,counts:new Uint32Array(kernel.memory.buffer,kernel.abm_ptr(5),days*4).slice(),
    infectedOn:new Int32Array(kernel.memory.buffer,kernel.abm_ptr(6),n).slice()};
};

test('the declarations are valid, and the recorded seed gives the recorded table',()=>{
  validateStructure(structure);validateParameterSet(spike,structure);validateParameterSet(pinkBook,structure);
  const run=runDeclared(kernel,compile(structure,spike,population),{seed:42,index:0,days:90});
  assert.equal(run.ever,16);
  assert.equal(Array.from(run.counts).reduce((sum,x,i)=>(sum+(i+1)*x)%2**32,0),967_536);
});

test('over 500 seeds, measles declared gives what measles written by hand gives',()=>{
  const program=compile(structure,spike,population);
  for(let seed=0;seed<500;seed++){
    const hand=byHand(seed,seed%n,120),declared=runDeclared(kernel,program,{seed,index:seed%n,days:120});
    assert.deepEqual(declared,hand,`seed ${seed}`);
  }
});

test('a parameter set may be held with values missing, and is refused only when it is run',()=>{
  const empty={...spike,id:'measles-empty',values:{}};
  validateParameterSet(empty,structure);
  assert.deepEqual(missingValues(empty,structure),['latent_period','infectious_period','p_household','p_class','p_village']);
  assert.throws(()=>compile(structure,empty,population),/cannot run yet: no value for latent_period, infectious_period/);
});

test('each set counts its values by the basis they rest on',()=>{
  assert.deepEqual(evidenceSummary(spike,structure),{cited:0,derived:0,fitted:0,assumed:5,missing:0});
  assert.deepEqual(evidenceSummary(pinkBook,structure),{cited:0,derived:2,fitted:0,assumed:3,missing:0});
});

test('evidence that does not say what it rests on, and a set for another structure, are refused',()=>{
  const noWorking=structuredClone(pinkBook);delete noWorking.values.latent_period.evidence.working;
  assert.throws(()=>validateParameterSet(noWorking,structure),/a derived value shows its working/);
  const noSource=structuredClone(pinkBook);delete noSource.values.latent_period.evidence.source;
  assert.throws(()=>validateParameterSet(noSource,structure),/a derived value names its source/);
  const other={...spike,structure:{id:'tb-fast-slow',version:'1.0.0'}};
  assert.throws(()=>validateParameterSet(other,structure),/is for tb-fast-slow/);
  const outOfRange=structuredClone(spike);outOfRange.values.p_class.value=1.4;
  assert.throws(()=>validateParameterSet(outOfRange,structure),/a probability between 0 and 1/);
});

test('a course with a step never reached, or one that comes round again, is refused',()=>{
  const unreached=structuredClone(structure);unreached.course[0].from='R';
  assert.throws(()=>validateStructure(unreached),/never reached from E/);
  const round=structuredClone(structure);round.course.push({from:'R',to:'I',duration:'infectious_period'});
  assert.throws(()=>validateStructure(round),/comes back to/);
});

/** BRANCHES (2026-11-17): an infectious person recovers or dies, and the dead transmit until burial; the shares are
 *  parameters, one branch the rest. Illustrative values, assumed: this is a check of the format, not an Ebola model. */
const ebola={...structuredClone(structure),id:'ebola-shaped-check',title:'An Ebola-shaped course, for checking branches',
  states:[...structure.states,{id:'D',label:'Dead, not yet buried'},{id:'B',label:'Buried'}],
  infection:{from:'S',to:'E',infectious:['I','D']},
  course:[{from:'E',to:'I',duration:'latent_period'},{from:'I',to:'R',duration:'infectious_period',share:'rest'},
    {from:'I',to:'D',duration:'time_to_death',share:'case_fatality'},{from:'D',to:'B',duration:'time_to_burial'}],
  parameters:[...structure.parameters,{id:'time_to_death',label:'Infectious to death',kind:'duration',unit:'day'},
    {id:'time_to_burial',label:'Death to burial',kind:'duration',unit:'day'},{id:'case_fatality',label:'Dying',kind:'probability',unit:'share'}]};
const assumed=(v)=>({...v,evidence:{basis:'assumed',note:'a check of the format'}});
const ebolaSet={...structuredClone(spike),id:'ebola-shaped-check-values',structure:{id:ebola.id,version:ebola.version},values:{
  ...spike.values,p_household:assumed({value:0.12}),p_class:assumed({value:0.12}),p_village:assumed({value:0.012}),
  latent_period:assumed({min:8,max:10}),infectious_period:assumed({min:6,max:9}),time_to_death:assumed({min:5,max:8}),
  time_to_burial:assumed({min:2,max:3}),case_fatality:assumed({value:0.67})}};

test('a branching course runs, each branch taken in its share',()=>{
  validateStructure(ebola);validateParameterSet(ebolaSet,ebola);
  const program=compile(ebola,ebolaSet,population);
  assert.deepEqual(program.shares,[1,0.32999999999999996,0.67,1]);
  let died=0,ended=0;
  for(let seed=0;seed<400;seed++){
    const run=runDeclared(kernel,program,{seed,index:seed%n,days:120}),last=119*6;
    for(let day=0;day<120;day++)assert.equal(run.counts.slice(day*6,day*6+6).reduce((a,b)=>a+b,0),n);
    died+=run.counts[last+4]+run.counts[last+5];ended+=run.counts[last+3]+run.counts[last+4]+run.counts[last+5];
  }
  const spread=Math.sqrt(0.67*0.33/ended);
  assert.ok(ended>5000&&Math.abs(died/ended-0.67)<4*spread,`${died} of ${ended} died`);
});

test('branches without a share each, two rests, or shares past a whole are refused',()=>{
  const noShare=structuredClone(ebola);delete noShare.course[2].share;
  assert.throws(()=>validateStructure(noShare),/each branch from I has a share/);
  const twoRests=structuredClone(ebola);twoRests.course[2].share='rest';
  assert.throws(()=>validateStructure(twoRests),/at most one branch from I is the rest/);
  const over=structuredClone(ebola);over.course[1].share='p_household';
  const overSet=structuredClone(ebolaSet);overSet.values.p_household.value=0.5;overSet.values.case_fatality.value=0.67;
  assert.throws(()=>compile(over,overSet,population),/the shares of the branches from I come to 1.170, not 1/);
});

test('the Pink Book periods run: a child infected on day 0 is not yet infectious to day 9, infectious from 10 to 18, recovered from 19',()=>{
  // Transmission off, so the index child alone moves, on the days its course says.
  const alone=structuredClone(pinkBook);for(const p of ['p_household','p_class','p_village'])alone.values[p].value=0;
  const run=runDeclared(kernel,compile(structure,alone,population),{seed:3,index:0,days:30});
  const stateOn=day=>['E','I','R'].find((_,k)=>run.counts[day*4+k+1]===1);
  assert.equal(run.ever,1);
  assert.deepEqual([0,9,10,18,19,29].map(stateOn),['E','E','I','I','R','R']);
});

/** THE 7-1-7 SPIKE (2026-11-18): a response scenario dates detection, notification and each action from a run, and
 *  closing the school changes the timing more than the size, as Groendyke, Welch and Hunter (2012) found. */
const split=json('structures/measles-prodrome-rash-household-class-village/1.0.0.json');
const splitSet=json('parameter-sets/measles-hagelloch-prodrome-rash/1.0.0.json');
const scenario=id=>json(`response-scenarios/${id}/1.0.0.json`);
const SCENARIOS=['hagelloch-as-in-1861','hagelloch-school-closed-from-day-0','hagelloch-7-1-7-met','hagelloch-7-1-7-missed'];
const {validateResponseScenario,compileResponse,sevenOneSeven}=await import('../build/disease-model.js');

test('the four response scenarios are valid for the measles structure with a prodrome and a rash',()=>{
  validateStructure(split);validateParameterSet(splitSet,split);
  for(const id of SCENARIOS)validateResponseScenario(scenario(id),split);
  assert.throws(()=>validateResponseScenario(scenario('hagelloch-7-1-7-met'),structure),/is for measles-prodrome-rash/);
  const bad=structuredClone(scenario('hagelloch-7-1-7-met'));bad.values.p_teacher_notices.value=2;
  assert.throws(()=>validateResponseScenario(bad,split),/a chance between 0 and 1/);
  const noNotice=structuredClone(scenario('hagelloch-7-1-7-met'));delete noNotice.notification;
  assert.throws(()=>validateResponseScenario(noNotice,split),/a scenario with actions notifies/);
});

test('the calendar closes the class on Sundays from 30 October 1861, a Wednesday',()=>{
  const r=compileResponse(split,scenario('hagelloch-as-in-1861'),14);
  const classOpen=Array.from({length:14},(_,day)=>r.open[day*3+1]);
  assert.deepEqual(classOpen,[1,1,1,1,0,1,1,1,1,1,1,0,1,1]);
  assert.ok(Array.from({length:14},(_,day)=>r.open[day*3]).every(x=>x===1));
});

test('a run under a response dates its events, and 7-1-7 is scored from them',()=>{
  const program=compile(split,splitSet,population);
  const met=compileResponse(split,scenario('hagelloch-7-1-7-met'),120);
  const run=runDeclared(kernel,program,{seed:3,index:0,days:120,response:met});
  assert.equal(run.emergedOn,10);
  assert.ok(run.detectedOn>=run.emergedOn||run.detectedOn<0);
  if(run.detectedOn>=0){
    assert.equal(run.notifiedOn,run.detectedOn+1);
    assert.deepEqual(run.actionsOn,[run.notifiedOn+1,run.notifiedOn+3]);
    const s=sevenOneSeven(run);
    assert.equal(s.notify,1);assert.equal(s.respond,3);assert.equal(s.met.notify,true);
  }
  const none=runDeclared(kernel,program,{seed:3,index:0,days:120,response:compileResponse(split,scenario('hagelloch-school-closed-from-day-0'),120)});
  assert.equal(none.detectedOn,-1);assert.equal(sevenOneSeven(none).detect,null);
});

test('closed from the first day, the school changes when the outbreak peaks more than how many it reaches',()=>{
  const program=compile(split,splitSet,population);
  const mean=(id,key)=>{const r=compileResponse(split,scenario(id),150);let t=0;
    for(let seed=0;seed<200;seed++)t+=runDeclared(kernel,program,{seed,index:0,days:150,response:r})[key];return t/200;};
  const [openSize,closedSize]=[mean('hagelloch-as-in-1861','ever'),mean('hagelloch-school-closed-from-day-0','ever')];
  const [openPeak,closedPeak]=[mean('hagelloch-as-in-1861','peakOn'),mean('hagelloch-school-closed-from-day-0','peakOn')];
  assert.ok(closedPeak>openPeak,`peak ${openPeak} open, ${closedPeak} closed`);
  assert.ok(closedSize<=openSize,`size ${openSize} open, ${closedSize} closed`);
});
