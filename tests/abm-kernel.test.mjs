import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The committed module, whose bytes `npm run validate:kernel` checks against the ones the application embeds.
const kernel=(await WebAssembly.instantiate(readFileSync(new URL('../kernel/fieldwork-kernel.wasm',import.meta.url)),{})).instance.exports;

/** EXPERIMENT 199'S FIRST CHECK: a recorded seed gives the same daily table in WebAssembly as natively. The same
 *  population, seed and parameters as `a_recorded_seed_gives_the_recorded_table` in kernel/src/abm.rs, and the same
 *  checksum of the table. */
const run=(seed,days=90)=>{
  const n=60;assert.equal(kernel.abm_prepare(n,days),1);
  new Int32Array(kernel.memory.buffer,kernel.abm_ptr(0),n).set(Array.from({length:n},(_,i)=>Math.floor(i/3)));
  new Int32Array(kernel.memory.buffer,kernel.abm_ptr(1),n).set(Array.from({length:n},(_,i)=>i%3));
  const ever=kernel.abm_run(BigInt(seed),0,0.08,0.02,0.002,10,12,8,9)>>>0;
  return {ever,table:Array.from(new Uint32Array(kernel.memory.buffer,kernel.abm_ptr(5),days*4))};
};

test('a recorded seed gives the table recorded natively',()=>{
  const {ever,table}=run(42);
  assert.equal(ever,16);
  assert.equal(table.reduce((sum,x,i)=>(sum+(i+1)*x)%2**32,0),967_536);
});

test('the same seed twice gives the same table, and every day counts every child once',()=>{
  const a=run(7),b=run(7);
  assert.deepEqual(a,b);
  for(let day=0;day<90;day++)assert.equal(a.table.slice(day*4,day*4+4).reduce((x,y)=>x+y,0),60);
});

test('parameters out of range are refused, not run',()=>{
  assert.equal(kernel.abm_prepare(2,10),1);
  new Int32Array(kernel.memory.buffer,kernel.abm_ptr(0),2).set([0,1]);new Int32Array(kernel.memory.buffer,kernel.abm_ptr(1),2).set([0,0]);
  // A u32 comes back signed: read unsigned, as every caller must.
  assert.equal(kernel.abm_run(1n,0,1.5,0.1,0.1,5,5,3,3)>>>0,2**32-1);
  assert.equal(kernel.abm_run(1n,2,0.1,0.1,0.1,5,5,3,3)>>>0,2**32-1);
});
