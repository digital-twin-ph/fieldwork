/** The ruleset worked example, run end to end.
 *
 *  The practitioner's proposal, 2026-10-15: "We should have a worked example just for the ruleset
 *  widget to exercise different ruleset conditions so users can also see examples of how to
 *  configure it. That is one way to execute widget rules and validate at the same time."
 *
 *  This is the validate-at-the-same-time half. The example is three steps, one condition kind
 *  each, over twelve synthetic records chosen so every branch of every rule has a record in it.
 *  Running it exercises the authored form against the real engine on real workflow plumbing --
 *  which a compiler test cannot do, because a rule that compiles may still fire on nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInThisContext} from 'node:vm';
import {rulesetExample} from '../build/ruleset-example.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {syncProjectManifest} from '../build/project-manifest.js';

const root=new URL('../',import.meta.url);
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('vendor/eye-21.1.24.js',root),'utf8'),{filename:'eye.js'});
const reason=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const run=async()=>{
  const workflow=rulesetExample();
  syncProjectManifest(workflow);
  return executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason);
};
const attribute=(result,nodeId,recordId,key)=>
  result.outputs.find(o=>o.nodeId===nodeId).rows.find(r=>r.recordId===recordId).attributes[key];

test('the example runs, and each step demonstrates one way to write a condition',async()=>{
  const result=await run();
  assert.equal(result.outputs.length,3,'three outputs: two tables and a map');

  // 1 · Bands. Two comparisons on one field, and a boundary value on each edge.
  assert.equal(attribute(result,'bands','s3','band'),'Short');      // 5 min
  assert.equal(attribute(result,'bands','s7','band'),'Short');      // exactly 15 — not greater than
  assert.equal(attribute(result,'bands','s5','band'),'Medium');     // 21
  assert.equal(attribute(result,'bands','s2','band'),'Long');       // 48, over the 30 parameter
  // The record with no waiting time concludes Unrecorded rather than being treated as zero.
  // That is the whole reason a ...Known fact exists, and it is the branch a reader forgets.
  assert.equal(attribute(result,'bands','s9','band'),'Unrecorded');

  // 2 · Alternatives, and two conclusions from one rule.
  assert.equal(attribute(result,'decisions','s6','decision'),'Review');   // 62 > 60, first group
  assert.equal(attribute(result,'decisions','s4','decision'),'Review');   // closed and 33 > 30, second group
  assert.equal(attribute(result,'decisions','s4','reason'),'LongOrClosed');
  assert.equal(attribute(result,'decisions','s8','decision'),'NoFlag');   // closed but quick
  assert.equal(attribute(result,'decisions','s8','reason'),'ClosedButQuick');
  assert.equal(attribute(result,'decisions','s9','decision'),'Unknown');
  assert.equal(attribute(result,'decisions','s9','reason'),'NoWaitRecorded');

  // 3 · A category match, with two kinds sharing one conclusion through `any`.
  assert.equal(attribute(result,'map','s1','service'),'Consultation');
  assert.equal(attribute(result,'map','s3','service'),'Dispensing');
  assert.equal(attribute(result,'map','s5','service'),'FirstContact');
  assert.equal(attribute(result,'map','s7','service'),'FirstContact');
  // `other` matches no rule, so it carries no conclusion at all. A ruleset may decline to
  // classify; reading that silence as a conclusion is the trap 65 exists to prevent.
  assert.equal(attribute(result,'map','s11','service'),undefined);
  assert.equal(attribute(result,'map','s12','service'),undefined);
});

test('the receipt carries the rules themselves, the bindings, and what was left unmatched',async()=>{
  const result=await run();
  const receipt=result.receipts.find(r=>r.nodeId==='kind');
  // An authored ruleset has no published artefact to cite, so the receipt carries the rules.
  // In the AUTHORED namespace: these words were written by whoever wrote the rules, and the
  // framework's fw: vocabulary stays exactly what the ontology declares.
  assert.match(receipt.rules,/fwa:category fwa:clinic/);
  assert.match(receipt.rules,/=> \{ \?s fwa:service fwa:Consultation\. \}/);
  // And the bindings, because a conclusion about fw:category means nothing to a reader who
  // cannot see which column that was.
  assert.match(receipt.facts,/fw:boundAttribute "category"/);
  assert.match(receipt.facts,/fw:boundPredicate "fwa:category"/);
  assert.match(receipt.facts,/fw:ruleSource "authored"/);
  // Two records matched no rule, and the receipt says so rather than letting them pass as
  // classified.
  assert.match(receipt.facts,/fw:unmatchedSubjectCount 2/);
  assert.match(receipt.method,/2 records matched no rule/);
  // What it must not be read as travels with it, as it does for a bundled ruleset.
  assert.match(receipt.facts,/fw:mustNotBeReadAs/);

  // A step whose rules use a parameter records the bound value, not the placeholder.
  const banded=result.receipts.find(r=>r.nodeId==='wait');
  assert.match(banded.rules,/math:greaterThan 30\b/);
  assert.ok(!banded.rules.includes('{{threshold}}'),'nothing reaches the reasoner unbound');
});
