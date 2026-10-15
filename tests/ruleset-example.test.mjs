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
  assert.equal(result.outputs.length,4,'four outputs: three tables and a map');

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

// The three debts experiment 106 records, exercised here rather than only written down. The
// practitioner, 2026-10-15: "The three debts should go in the worked example for rulesets so
// these can be exercised and evaluated." Two of them are DEFECTS this example now demonstrates,
// which is uncomfortable and is the point: a debt nobody can run is a debt nobody will pay.

test('debt 1 · the two comparators nothing had executed now run, including on the boundary',async()=>{
  const result=await run();
  // `lessThan` and `notLessThan` compiled from the day the compiler was written and were
  // executed by nothing. Step 4 is what makes offering them in the editor defensible.
  assert.equal(attribute(result,'access','s3','access'),'WalkIn');        // 5 < 10
  assert.equal(attribute(result,'access','s10','access'),'WalkIn');       // 7 < 10
  // Exactly on the boundary: NOT less than 10, which is the whole difference between
  // `is less than` and `is at most` and the case a reader checks first.
  assert.equal(attribute(result,'access','s13','access'),'Appointment');  // 10
  assert.equal(attribute(result,'access','s2','access'),'Appointment');   // 48
  assert.equal(attribute(result,'access','s9','access'),'Unrecorded');    // no wait recorded
  const receipt=result.receipts.find(r=>r.nodeId==='walkin');
  assert.match(receipt.rules,/math:lessThan 10/);
  assert.match(receipt.rules,/math:notLessThan 10/);
});

test('debt 2, paid · a unit is required, and a mismatch is refused by name',async()=>{
  // The practitioner, 2026-10-15: "How do we make sure measurements have units in the ruleset
  // widget?" By requiring one on every numeric field and every numeric setting, and refusing a
  // comparison whose two sides disagree -- refused rather than converted, which is the
  // precedent makeN3 set for distances.
  const {authoredUnitProblems}=await import('../build/rulesets.js');
  const workflow=rulesetExample();
  const step=workflow.nodes.find(n=>n.id==='wait');

  // As shipped, every measurement in the example states its unit.
  assert.deepEqual(authoredUnitProblems(step.params.authored),[]);

  // A setting in hours against a field in minutes: the mismatch this could not see before.
  const hours=JSON.parse(JSON.stringify(step.params.authored));
  hours.parameters[0].unit='http://qudt.org/vocab/unit/HR';
  hours.parameters[0].unitLabel='hours';
  const mismatch=authoredUnitProblems(hours);
  assert.equal(mismatch.length,1);
  assert.match(mismatch[0].says,/measured in minutes and the threshold setting is in hours/);
  // It says what to do, in both directions.
  assert.match(mismatch[0].says,/State the setting in minutes/);

  // A number with no unit at all is not a measurement, and is refused before any comparison.
  const bare=JSON.parse(JSON.stringify(step.params.authored));
  delete bare.fields[0].unit;
  assert.match(authoredUnitProblems(bare)[0].says,/not a measurement/);

  // And the run refuses it, naming the step rather than failing somewhere downstream.
  step.params.authored.parameters[0].unit='http://qudt.org/vocab/unit/HR';
  syncProjectManifest(workflow);
  await assert.rejects(
    executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason),
    /1 · Banding a number cannot run: Wait is measured in minutes/);
});

test('debt 2, as it was · a wrong unit used to pass every check',async()=>{
  // The fields declare minutes. A threshold typed as "1", meaning one HOUR, is a number in
  // range, so every check this application has lets it through: the parameter validates and the
  // rules compile.
  // Kept as the record of what the check replaced: a threshold of 1, meaning one hour, against
  // fields in minutes. The units now AGREE in the declaration -- both minutes -- so the unit
  // check passes and this is purely a wrong number, which is the case nothing can catch. It is
  // the reason the editor shows the field's unit beside the box.
  const workflow=rulesetExample();
  const step=workflow.nodes.find(n=>n.id==='wait');
  step.params.parameters.threshold=1;
  assert.doesNotThrow(()=>validateWorkflow(JSON.parse(JSON.stringify(workflow))),
    'a number in range is accepted, whatever the practitioner meant by it');
  syncProjectManifest(workflow);

  // What happens at the run was not what I expected, and is worth recording. The bands are
  // written against a fixed 15 and a parameter: at 1 they OVERLAP, so a 12-minute wait is both
  // at most 15 and more than 1, two rules fire, and the run refuses.
  //
  // So a unit mistake is caught -- by accident, through debt 3, and the message a practitioner
  // reads is about conclusions disagreeing. It does not mention units, the parameter, or which
  // number to look at. Being refused for the wrong reason is better than a wrong answer and is
  // not the same as being told.
  await assert.rejects(
    executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason),
    error=>/two different band conclusions for one record/.test(error.message)
      &&!/unit|minute|hour|threshold/i.test(error.message));
});

test('debt 3 · rules that disagree are caught at the run, which is late',async()=>{
  // Conclusions are free text and the authored form declares no output vocabulary, so nothing
  // stops two rules concluding different values of one predicate for one record. The compiler
  // cannot see it -- both rules are well formed -- and the editor cannot either. The reasoner
  // reaches both conclusions and the projection refuses them.
  const workflow=rulesetExample();
  const step=workflow.nodes.find(n=>n.id==='kind');
  step.params.authored.rules.push({
    any:[{all:[{field:'fwa:category',comparator:'equals',value:'fwa:clinic'}]}],
    then:[{predicate:'fwa:service',value:'fwa:Dispensing'}],   // clinics already conclude Consultation
  });
  syncProjectManifest(workflow);
  await assert.rejects(
    executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason),
    /two different service conclusions for one record/);
  // Late is better than never, and the message says what to do; but the practitioner has by then
  // written the rules, kept them, and run the workflow.
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
