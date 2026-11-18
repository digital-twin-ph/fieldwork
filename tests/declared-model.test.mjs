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

test('a structure whose course does not follow on from the infection is refused',()=>{
  const broken=structuredClone(structure);broken.course[0].from='I';
  assert.throws(()=>validateStructure(broken),/does not start where the one before it ends/);
});

test('the Pink Book periods run: a child infected on day 0 is not yet infectious to day 9, infectious from 10 to 18, recovered from 19',()=>{
  // Transmission off, so the index child alone moves, on the days its course says.
  const alone=structuredClone(pinkBook);for(const p of ['p_household','p_class','p_village'])alone.values[p].value=0;
  const run=runDeclared(kernel,compile(structure,alone,population),{seed:3,index:0,days:30});
  const stateOn=day=>['E','I','R'].find((_,k)=>run.counts[day*4+k+1]===1);
  assert.equal(run.ever,1);
  assert.deepEqual([0,9,10,18,19,29].map(stateOn),['E','E','I','I','R','R']);
});
