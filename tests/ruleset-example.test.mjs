/** The ruleset worked example, run end to end, over Snow's own data.
 *
 *  The practitioner, 2026-10-15: "We should have a worked example just for the ruleset widget to
 *  exercise different ruleset conditions ... That is one way to execute widget rules and validate
 *  at the same time." Then, 2026-10-16: "1 workflow for table data and another for point data",
 *  and "Why not use the John Snow data sets?"
 *
 *  So the example is two workflows on one canvas, and this is the validate-at-the-same-time
 *  half. The halves share nothing: Table 1 carries no place and a death location carries no
 *  date, so they cannot be joined and the example does not pretend to. What they share is the
 *  rule form, which is the thing under test -- a rule reads a predicate, and a predicate is
 *  bound to an attribute, whether the record is a row or a point.
 *
 *  Every assertion below is against a record Snow recorded. The synthetic version this replaced
 *  put a record on every boundary by construction; this one does not, by the practitioner's
 *  instruction -- "first without the boundary cases" -- and the difference is stated in each
 *  test that is weaker for it.
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
/** A banded day, from the table half: the conclusion arrives as another key column. */
const day=(result,date)=>
  result.outputs.find(o=>o.nodeId==='day-table').rows.find(r=>r.key.date===date);
/** A banded address, from the point half. */
const address=(result,id)=>
  result.outputs.find(o=>o.nodeId==='address-table').rows.find(r=>r.recordId===id).attributes;

test('both halves run: a table is classified, and so is a point layer',async()=>{
  const result=await run();
  assert.deepEqual(result.outputs.map(o=>o.nodeId),
    ['day-table','address-map','address-table','gap-table','text-table']);

  // A · Table data. Until 2026-10-16 this could not run at all: the authored path read
  // `inputs.subjects as PointCollection` and nothing else, so rules could be written about
  // places and not about a table -- which is half of the data anybody has.
  assert.equal(day(result,'1854-08-20').key.day,'NoDeaths');  // 0 deaths
  assert.equal(day(result,'1854-08-19').key.day,'Few');       // 1
  assert.equal(day(result,'1854-09-02').key.day,'Many');      // 127, the worst day
  // The value field is untouched: what the table MEASURES is still what it measured, and the
  // judgement sits beside it rather than replacing it.
  assert.equal(day(result,'1854-09-02').value,127);
  assert.equal(result.outputs.find(o=>o.nodeId==='day-table').rows.length,43);

  // B · Point data, through the same rule form.
  assert.equal(address(result,'location-2').address,'Single');    // 1 death
  assert.equal(address(result,'location-1').address,'Several');   // 2
  assert.equal(address(result,'location-4').address,'Several');   // 4, the cluster setting
  assert.equal(address(result,'location-74').address,'Cluster');  // 5
  // Two conclusions from one rule: the band, and that this one is worth looking at.
  assert.equal(address(result,'location-74').look,'Yes');
  assert.equal(address(result,'location-2').look,undefined);
});

// C and D: the boundary workflows. The practitioner, 2026-10-16: "let's add 2 more boundary
// workflows but this time let's simulate data problems in the existing data set ... we must
// surface the issue on the widget as a toast message that I can then read and close. This not
// only tests the boundary cases but also how the widget surfaces the issue for the user to act
// on." Both halves of that are asserted here: what the rules conclude, and what the step says.

test('C · a table with gaps reaches the branch Snow\'s own data cannot',async()=>{
  const result=await run();
  // Snow recorded a count for every date, so over A's data the Unrecorded branch never fires.
  // C is A's data with three counts removed, running A's rules -- the SAME rules, from one
  // factory, so nothing that differs between the two results is a difference in the rules.
  const gapped=result.outputs.find(o=>o.nodeId==='gap-table').rows;
  const unrecorded=gapped.filter(r=>r.key.day==='Unrecorded').map(r=>r.key.date);
  assert.deepEqual(unrecorded,['1854-09-05','1854-09-06','1854-09-07']);
  // Every other row is banded exactly as its twin in A, which is what makes the comparison fair.
  const plain=result.outputs.find(o=>o.nodeId==='day-table').rows;
  for(const row of gapped)
    if(!unrecorded.includes(row.key.date))
      assert.equal(row.key.day,plain.find(p=>p.key.date===row.key.date).key.day,row.key.date);
});

test('D · a value present but unreadable is reported as a different thing from a value absent',async()=>{
  const result=await run();
  // A count written "3" is not a number. The binding declares one, so the rules are told it is
  // not recorded -- the same word C's genuine gaps produce, for a completely different reason.
  const listed=result.outputs.find(o=>o.nodeId==='text-table').rows;
  assert.equal(listed.filter(r=>r.attributes.address==='Unrecorded').length,63);
  assert.equal(listed.length,250);

  // The step says which of the two it found, and only the step that found it says so. Without
  // this the same finding was raised on every node the value travelled to.
  assert.deepEqual(result.alerts.filter(a=>a.dataIssues?.length).map(a=>a.nodeId),
    ['gap-day','text-address']);
  const [missing]=result.alerts.find(a=>a.nodeId==='gap-day').dataIssues;
  assert.equal(missing.why,'missing');
  assert.match(missing.says,/3 of 43 records have no value for Deaths that day/);
  const [unreadable]=result.alerts.find(a=>a.nodeId==='text-address').dataIssues;
  assert.equal(unreadable.why,'unreadable');
  assert.match(unreadable.says,/63 of 250 records carry a value .* that is not a number/);
  // It names what it saw, so a practitioner can recognise the column without opening the file.
  assert.match(unreadable.says,/"\d+"/);
  assert.match(unreadable.says,/not that/);
});

test('the fail conditions are in the evidence, not only on the screen',async()=>{
  // The practitioner, 2026-10-16: "These fail conditions must be represented also in the
  // ontology." A notice a reader can close is not a record. Every term here is declared in
  // ontology/fieldwork.ttl, which the coupling gate enforces: the application may not assert a
  // term the ontology does not define.
  const result=await run();

  // A value nobody collected.
  const gaps=result.receipts.find(r=>r.nodeId==='gap-day').facts;
  assert.match(gaps,/fw:readingProblem \[ a fw:ReadingProblem;/);
  assert.match(gaps,/fw:boundAttribute "deaths"/);
  assert.match(gaps,/fw:problemKind fw:ValueAbsent/);
  assert.match(gaps,/fw:affectedRecordCount 3; fw:consideredRecordCount 43/);

  // A value somebody collected that the step could not read. The SAME fact reaches the reasoner
  // in both cases -- that the value is not recorded -- so the receipt is the only place the two
  // can be told apart afterwards.
  const text=result.receipts.find(r=>r.nodeId==='text-address').facts;
  assert.match(text,/fw:problemKind fw:ValueUnreadable/);
  assert.match(text,/fw:affectedRecordCount 63; fw:consideredRecordCount 250/);

  // A step that read everything asserts no problem, and says so rather than staying silent --
  // an absent statement and a clean read are not the same thing to a reader.
  const clean=result.receipts.find(r=>r.nodeId==='day');
  assert.ok(!clean.facts.includes('fw:readingProblem'));
  assert.match(clean.method,/Every bound value was readable/);
});

// The three debts experiment 106 records, exercised rather than only written down. The
// practitioner, 2026-10-15: "The three debts should go in the worked example for rulesets so
// these can be exercised and evaluated."

test('debt 1 · all four numeric comparators are executed against the real engine',async()=>{
  const result=await run();
  // `lessThan` and `notLessThan` compiled from the day the compiler was written and were
  // executed by nothing, which is what made offering them in the editor indefensible. The point
  // half uses both; the table half uses the other two.
  const banded=result.receipts.find(r=>r.nodeId==='address');
  assert.match(banded.rules,/math:lessThan 2/);
  assert.match(banded.rules,/math:notLessThan 2/);
  const days=result.receipts.find(r=>r.nodeId==='day');
  assert.match(days.rules,/math:greaterThan 20/);
  assert.match(days.rules,/math:notGreaterThan 20/);
  // And each one decided a record, rather than merely compiling.
  assert.equal(address(result,'location-2').address,'Single');   // less than 2
  assert.equal(address(result,'location-1').address,'Several');  // not less than 2

  // WEAKER THAN THE SYNTHETIC VERSION, deliberately. That example put a record exactly on each
  // boundary, so `is less than 2` and `is at most 2` could be told apart by a run. Snow's data
  // has 1s and 2s either side of this one, which distinguishes them here -- but no boundary is
  // guaranteed, and a future threshold could sit where no record stands. Boundary records are
  // the next thing to add, and they will be labelled as ours when they arrive.
});

test('debt 2 · a unit is required, and a mismatch is refused by name',async()=>{
  // "How do we make sure measurements have units in the ruleset widget?" By requiring one on
  // every numeric field and every numeric setting, and refusing a comparison whose two sides
  // disagree -- refused rather than converted.
  const {authoredUnitProblems}=await import('../build/rulesets.js');
  const workflow=rulesetExample();
  const step=workflow.nodes.find(n=>n.id==='day');

  // A count is dimensionless and still declares what it is. As shipped, both halves do.
  assert.deepEqual(authoredUnitProblems(step.params.authored),[]);
  assert.deepEqual(authoredUnitProblems(workflow.nodes.find(n=>n.id==='address').params.authored),[]);

  // A setting in hours against a field counting deaths: a comparison between two different
  // things, which no amount of arithmetic makes meaningful.
  const hours=JSON.parse(JSON.stringify(step.params.authored));
  hours.parameters[0].unit='http://qudt.org/vocab/unit/HR';
  hours.parameters[0].unitLabel='hours';
  const mismatch=authoredUnitProblems(hours);
  assert.equal(mismatch.length,1);
  assert.match(mismatch[0].says,/is measured in deaths and the busy setting is in hours/);
  assert.match(mismatch[0].says,/State the setting in deaths/);

  // A number with no unit at all is not a measurement, and is refused before any comparison.
  const bare=JSON.parse(JSON.stringify(step.params.authored));
  delete bare.fields[0].unit;
  assert.match(authoredUnitProblems(bare)[0].says,/not a measurement/);

  // And the run refuses it, naming the step rather than failing somewhere downstream.
  step.params.authored.parameters[0].unit='http://qudt.org/vocab/unit/HR';
  syncProjectManifest(workflow);
  await assert.rejects(
    executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason),
    /cannot run: Deaths that day is measured in deaths/);
});

test('debt 2, as it was · a wrong number in the right unit passes every check',async()=>{
  // The case nothing can catch, and the reason the editor shows the field's unit beside the box.
  // The units AGREE here -- both count deaths -- and the number is simply wrong: a day banded
  // Many above one death rather than above twenty. Every check this application has passes it.
  const workflow=rulesetExample();
  workflow.nodes.find(n=>n.id==='day').params.parameters.busy=1;
  assert.doesNotThrow(()=>validateWorkflow(JSON.parse(JSON.stringify(workflow))),
    'a number in range is accepted, whatever the practitioner meant by it');
  syncProjectManifest(workflow);

  // It runs, and it answers. Wrongly, and in silence: the 19th had one death and is Few, the
  // 21st had two and is now Many. Nothing in the result says a threshold was mistaken, because
  // nothing can know it was.
  const result=await executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason);
  assert.equal(day(result,'1854-08-19').key.day,'Few');
  assert.equal(day(result,'1854-08-21').key.day,'Many');
});

test('debt 3 · rules that disagree are caught at the run, which is late',async()=>{
  // Conclusions are free text and the authored form declares no output vocabulary, so nothing
  // stops two rules concluding different values of one predicate for one record. The compiler
  // cannot see it -- both rules are well formed -- and the editor cannot either. The reasoner
  // reaches both conclusions and the projection refuses them.
  const workflow=rulesetExample();
  workflow.nodes.find(n=>n.id==='day').params.authored.rules.push({
    any:[{all:[{field:'fwa:deaths',comparator:'notGreaterThan',value:0}]}],
    then:[{predicate:'fwa:day',value:'fwa:Quiet'}],   // a day with no deaths already concludes NoDeaths
  });
  syncProjectManifest(workflow);
  await assert.rejects(
    executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),reason),
    /two different day conclusions for one record/);
  // Late is better than never, and the message says what to do; but the practitioner has by then
  // written the rules, kept them, and run the workflow.
});

test('the receipt carries the rules themselves, the bindings, and what was left unmatched',async()=>{
  const result=await run();
  const receipt=result.receipts.find(r=>r.nodeId==='address');
  // An authored ruleset has no published artefact to cite, so the receipt carries the rules, in
  // the AUTHORED namespace: these words were written by whoever wrote the rules, and the
  // framework's fw: vocabulary stays exactly what the ontology declares.
  assert.match(receipt.rules,/=> \{ \?s fwa:address fwa:Cluster; fwa:look fwa:Yes\. \}/);
  // And the bindings, because a conclusion about fwa:deathsHere means nothing to a reader who
  // cannot see which column that was.
  assert.match(receipt.facts,/fw:boundAttribute "DEATHS"/);
  assert.match(receipt.facts,/fw:boundPredicate "fwa:deathsHere"/);
  assert.match(receipt.facts,/fw:ruleSource "authored"/);
  // Every record fell in a band, and the receipt says so rather than leaving it to be assumed.
  assert.match(receipt.facts,/fw:unmatchedSubjectCount 0/);
  assert.match(receipt.method,/Every record matched a rule/);
  assert.match(receipt.facts,/fw:mustNotBeReadAs/);

  // A step whose rules use a parameter records the bound value, not the placeholder.
  const days=result.receipts.find(r=>r.nodeId==='day');
  assert.match(days.rules,/math:greaterThan 20\b/);
  assert.ok(!days.rules.includes('{{busy}}'),'nothing reaches the reasoner unbound');
});
