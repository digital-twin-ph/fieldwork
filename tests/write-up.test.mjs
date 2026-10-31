import test from 'node:test';
import assert from 'node:assert/strict';
import {readWriteUp,entryForRun,recordEntry,forgetEntry,writeUpOf,sourceOfNote}
  from '../build/write-up.js';

/** THE WRITE-UP STORE. *"It's supposed to hold notes from all workflows in that project."* */

const note=(id,nodeId)=>({kind:'machined',id,section:'Results',text:'A sentence.',nodeId});
const run=(ids)=>({runId:'r1',machined:Object.fromEntries(
  ids.map(([id,nodeId])=>[nodeId,[note(id,nodeId)]])),derived:[]});
const labels={'rate-node':'Mortality by sub-district','map-node':'The ground'};
const entry=(key,name,ids)=>entryForRun(key,name,run(ids),id=>labels[id],'2026-10-30T10:00:00Z');

test('a run contributes its notes, with the labels of the steps that made them',()=>{
  const e=entry('a/mortality','Mortality',[['n1','rate-node']]);
  assert.equal(e.workflowKey,'a/mortality');
  assert.equal(e.machined.length,1);
  assert.equal(e.machined[0].nodeId,'rate-node');
  // THE LABEL TRAVELS. The panel resolves a note's step through the workflow that produced it,
  // and that workflow is not open when another one is being read.
  assert.deepEqual(e.labels,{'rate-node':'Mortality by sub-district'});
});

test('a run that produced no prose contributes nothing, rather than an empty row',()=>{
  assert.equal(entryForRun('a/x','X',{runId:'r',machined:{},derived:[]},()=>'l','2026-10-30'),null);
  assert.equal(entryForRun('a/x','X',{},()=>'l','2026-10-30'),null);
});

test('the write-up is read in the project order, not the order things were run',()=>{
  // A project lists its workflows in the sequence the practitioner arranged them. Ordering by
  // when each ran would re-sort the write-up every time somebody re-ran a step.
  let store={};
  store=recordEntry(store,entry('b/second','Second',[['n2','map-node']]));
  store=recordEntry(store,entry('a/first','First',[['n1','rate-node']]));
  assert.deepEqual(writeUpOf(store,['a/first','b/second']).map(e=>e.workflowKey),
    ['a/first','b/second']);
  // A workflow that has never run contributes nothing and is simply absent.
  assert.deepEqual(writeUpOf(store,['a/first','never-ran','b/second']).map(e=>e.workflowKey),
    ['a/first','b/second']);
});

test('a workflow the project no longer lists stops contributing',()=>{
  // Nothing else would ever remove it, and a deleted workflow going on writing into a
  // publication is what nobody notices until a reader asks what a paragraph is doing there.
  let store=recordEntry({},entry('a/gone','Gone',[['n1','rate-node']]));
  store=recordEntry(store,entry('a/kept','Kept',[['n2','map-node']]),['a/kept']);
  assert.deepEqual(Object.keys(store),['a/kept']);
  assert.deepEqual(Object.keys(forgetEntry(store,'a/kept')),[]);
});

test('re-running a workflow replaces its contribution rather than appending',()=>{
  let store=recordEntry({},entry('a/one','One',[['n1','rate-node']]));
  store=recordEntry(store,entry('a/one','One',[['n1b','rate-node']]));
  assert.equal(Object.keys(store).length,1);
  assert.equal(store['a/one'].machined[0].id,'n1b');
});

test('a note is attributed to its workflow, except the one being read',()=>{
  const e=entry('a/mortality','Deaths per 1,000 people',[['n1','rate-node']]);
  assert.equal(sourceOfNote(e,'a/mortality'),undefined);
  assert.equal(sourceOfNote(e,'a/other'),'Deaths per 1,000 people · ran 2026-10-30');
});

test('the store is read tolerantly, and junk is dropped rather than taking it down',()=>{
  assert.deepEqual(readWriteUp(null),{});
  assert.deepEqual(readWriteUp('not json'),{});
  assert.deepEqual(readWriteUp('[]'),{});
  // An entry with no readable prose is dropped: a write-up is a convenience over runs that can
  // be repeated, so losing one entry costs a re-run and losing the lot costs the practitioner.
  assert.deepEqual(readWriteUp('{"a":{"machined":[{"kind":"machined","text":"  "}]}}'),{});
  assert.deepEqual(readWriteUp('{"a":{"machined":[{"kind":"quoted","quote":"x"}]}}'),{});
  const good=readWriteUp(JSON.stringify({a:entry('a','A',[['n1','rate-node']])}));
  assert.equal(good.a.machined.length,1);
  assert.equal(good.a.labels['rate-node'],'Mortality by sub-district');
});

test('a round trip through JSON keeps what the panel needs',()=>{
  const e=entry('a/one','One',[['n1','rate-node']]);
  const back=readWriteUp(JSON.stringify(recordEntry({},e))) ['a/one'];
  assert.equal(back.workflowName,'One');
  assert.equal(back.runAt,'2026-10-30T10:00:00Z');
  assert.equal(back.machined[0].text,'A sentence.');
});

test('an entry from another build is dropped, so a stale write-up self-corrects',()=>{
  // THE DEFECT THIS HOLDS OUT, met by the practitioner on 2026-10-30. Equations were wired into
  // the widgets early in 0.13.0 and the artifact descriptions later the same day. A write-up
  // store filled by the earlier build therefore held equations and no descriptions, and because
  // the store is read rather than recomputed, updating the application changed nothing: the
  // practitioner ran every workflow, saw equations, and saw no tables, maps or charts. Nothing
  // anywhere said why, and the author's first two diagnoses -- a stale service worker, then a
  // stale server -- were both wrong and both produced true evidence for a false cause.
  const stamped=entryForRun('a/one','One',run([['n1','rate-node']]),id=>labels[id],
    '2026-10-30T10:00:00Z','build-A');
  assert.equal(stamped.build,'build-A');
  const stored=JSON.stringify(recordEntry({},stamped));
  // Same build: kept.
  assert.equal(Object.keys(readWriteUp(stored,'build-A')).length,1);
  // Another build: dropped, and the Notes tab then reports that workflow as not run -- which is
  // true of THIS build, and tells the practitioner exactly what to do.
  assert.deepEqual(readWriteUp(stored,'build-B'),{});
  // An entry written before the field existed is dropped for the same reason.
  const old=JSON.stringify(recordEntry({},entry('a/one','One',[['n1','rate-node']])));
  assert.deepEqual(readWriteUp(old,'build-A'),{});
  // AND NOTHING IS DROPPED WHEN THE BUILD IS UNKNOWN. The manifest fetch can fail offline, and a
  // write-up that cannot be checked is kept rather than thrown away.
  assert.equal(Object.keys(readWriteUp(stored)).length,1);
  assert.equal(Object.keys(readWriteUp(old)).length,1);
});
