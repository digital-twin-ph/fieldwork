import test from 'node:test';
import assert from 'node:assert/strict';
import {readPlan,planView,withPart,markedComplete,unmarked} from '../build/plan.js';

/** THE PLAN (experiment 202, the planning note; the practitioner's four answers, 2026-11-18): one part per outline slot
 *  shared by the targets; targets added or dropped after planning begins; the objectives note is the objectives part;
 *  marked complete with a version of each part, and unmarked keeping them. */
const objectives={kind:'authored',id:'o',section:'Introduction',fn:'objective',text:'Objectives',items:[{id:'a',text:'Where did it spread?'}]};
const version=async(part,at)=>({at,content:{text:part.text},digest:'x'});

test('every slot but the references is a part, the objectives held by the objectives note',()=>{
  const view=planView(['publication'],undefined,[objectives],{},0);
  assert.ok(view.parts.length>5);
  assert.ok(!view.parts.some(p=>p.role==='references'));
  const o=view.parts.find(p=>p.objectives);
  assert.equal(o.role,'objectives');assert.equal(o.text,'Where did it spread?');
  assert.equal(view.written,1);assert.equal(view.of,view.parts.length);
});

test('a part written is counted, and clearing it returns it to its template',()=>{
  let plan=withPart(undefined,'background','Why Hagelloch, and why now.');
  assert.equal(planView(['publication'],plan,[],{},0).written,1);
  plan=withPart(plan,'background','  ');
  assert.equal(plan.parts.length,0);
});

test('a dropped target keeps its written parts, unplaced, and an added one brings its parts empty',()=>{
  const plan=withPart(undefined,'background','Why Hagelloch.');
  const view=planView(['surveillance-mmwr'],plan,[],{},0);
  if(view.parts.some(p=>p.role==='background'))assert.equal(view.unplaced.length,0);
  else assert.deepEqual(view.unplaced.map(p=>p.role),['background']);
  const both=planView(['publication','surveillance-mmwr'],plan,[],{},0);
  assert.equal(both.unplaced.length,0);
  assert.ok(both.parts.length>=planView(['publication'],plan,[],{},0).parts.length);
});

test('marking complete versions every part; a change after it is said; undoing keeps the versions',async()=>{
  let plan=withPart(withPart(undefined,'background','B'),'conclusion','C');
  plan=await markedComplete(plan,'2026-11-18T12:00:00.000Z',version);
  assert.equal(plan.complete.at,'2026-11-18T12:00:00.000Z');
  assert.ok(plan.parts.every(p=>p.versions.length===1));
  assert.deepEqual(planView(['publication'],plan,[],{},0).changedSince,[]);
  plan=withPart(plan,'conclusion','C, rewritten');
  assert.deepEqual(planView(['publication'],plan,[],{},0).changedSince,['conclusion']);
  plan=unmarked(plan);
  assert.equal(plan.complete,undefined);
  assert.equal(plan.parts.find(p=>p.role==='background').versions.length,1);
});

test('read back tolerantly: a part with no role or no words is dropped, a role twice keeps the first',()=>{
  const plan=readPlan({parts:[{role:'background',text:'A'},{role:'background',text:'B'},{role:'',text:'x'},{role:'conclusion',text:''},7],
    complete:{at:'not a date'}});
  assert.deepEqual(plan,{parts:[{role:'background',text:'A'}]});
  assert.equal(readPlan({parts:[]}),undefined);
  assert.equal(readPlan('plan'),undefined);
});
