import test from 'node:test';
import assert from 'node:assert/strict';
const {relateWalkthrough,walkOutcome}=await import('../build/relate-walkthrough.js');
const {walkthroughMarkup}=await import('../build/table-walkthrough.js');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/** RELATE ON A MADE-UP EXAMPLE (experiment 223). The validation rule it commits to: the example does what the step
 *  does. For every choice the dialog offers that changes this example, what the steps say lands in the result is what
 *  `relateTable` makes from the same rows; and where the steps say the step stops, it does. */
const every=[];
for(const normalisation of ['fuzzy','exact'])for(const several of [true,false])
  for(const [decision,label] of [['drop',''],['keep','Not known'],['','']])
    every.push({normalisation,spelling:false,several,decision,label});

test('what the walkthrough says lands in the result is what Relate makes, under every choice',()=>{
  for(const settings of every){
    const walk=relateWalkthrough(settings),outcome=walkOutcome(settings),said=JSON.stringify(settings);
    if(walk.expected===null){assert.ok('refusal' in outcome,`${said}: the steps say it stops, and it does`);continue;}
    assert.ok(!('refusal' in outcome),`${said}: ${outcome.refusal}`);
    assert.deepEqual(outcome.rows.map(r=>({district:r.district,supplier:r.supplier})),walk.expected,said);
    // The rows added step by step are the final table, in order.
    const added=walk.steps.filter(s=>!s.final).flatMap(s=>s.result??[]);
    assert.deepEqual(added,walk.steps.at(-1).result,said);
  }
});

test('each case the example was made for is said: a fold, a gap, a key twice, a key only the second table has',()=>{
  const fuzzy=relateWalkthrough({normalisation:'fuzzy',spelling:false,several:true,decision:'keep',label:'Not known'});
  const text=fuzzy.steps.map(s=>s.text).join('\n');
  assert.match(text,/St\. Ann and St Ann are the same district once punctuation is folded: matched/);
  assert.match(text,/You chose to keep unmatched rows under a name you give; in this example that name is "Not known", so Delta stays/);
  // THE PERSON'S NAME IS FOR THEIR DATA (2026-11-19): Hagelloch's "no infector recorded" is not written into the made-up suppliers,
  // and a name that is one of the example's own values does not stop it.
  for(const label of ['no infector recorded','North Water']){
    const walk=relateWalkthrough({normalisation:'fuzzy',spelling:false,several:true,decision:'keep',label});
    assert.ok(!walk.steps.some(s=>s.text.includes(label)&&!s.text.includes('North Water is brought')),label);
    assert.ok(walk.steps.at(-1).result.some(r=>r[2]==='Not known'),label);
  }
  assert.match(text,/Epsilon is found 2 times\. You chose one row per match, so it becomes 2 rows/);
  assert.match(text,/Zeta is in Water supply by district only\. Nothing in the first table asks for it/);
  assert.equal(fuzzy.steps.at(-1).result.length,5);
  const exact=relateWalkthrough({normalisation:'exact',spelling:false,several:false,decision:'drop',label:''});
  assert.match(exact.steps.map(s=>s.text).join('\n'),/Compared exactly, St\. Ann is not St Ann\. You chose to drop unmatched rows/);
  // EVERY ROW CHECKED, THEN IT STOPS, in its own words (2026-11-19: "Should it continue with Epsilon as relate continues
  // until all rows are checked?"). Each problem is marked where it is; the step's message names Epsilon.
  const last=exact.steps.at(-1);
  assert.match(last.text,/^Every row checked, the step stops and passes nothing on\. In its own words: The second table gives "Epsilon" more than one "supplier"/);
  assert.ok(last.stopped&&last.final&&!last.result);
  assert.match(exact.steps.map(s=>s.text).join('\n'),/Epsilon is found 2 times, and you chose to stop and say which key: so the step will stop once every row is checked/);
  assert.match(exact.steps.map(s=>s.text).join('\n'),/Zeta (is|are) in Water supply by district only/,'the rows after a problem are still checked');
  assert.ok(exact.steps.slice(exact.steps.findIndex(s=>s.willStop),-1).every(s=>s.willStop),'once a problem is found, no table will come out');
});

test('every step is headed as made up, says where it is, and marks its rows in words and a shape',()=>{
  const walk=relateWalkthrough({normalisation:'fuzzy',spelling:false,several:false,decision:'',label:''});
  walk.steps.forEach((_,at)=>{
    const html=walkthroughMarkup(walk,at,esc);
    assert.match(html,/<p class="walk-made-up">Made-up example<\/p>/);
    assert.match(html,new RegExp(`Step ${at+1} of ${walk.steps.length}\\.`));
    assert.match(html,/aria-live="polite"/);
  });
  // The row that will stop the step is marked where it is; from then on no table will come out; the last step says it stopped.
  const marked=walk.steps.findIndex(s=>s.marks.some(m=>m.state==='stopped'));
  const html=walkthroughMarkup(walk,marked,esc);
  assert.match(html,/<tr class="walk-stopped" data-walk-state="stopped">[\s\S]*?<td class="walk-word"><span aria-hidden="true">■<\/span> will stop the step<\/td>/);
  // WILL STOP IS NOT STOPPED (2026-11-24). The practitioner, on this walkthrough: *"There is something wrong with
  // this walkthrough. The result is empty after the last match."* Mid-walk the step is STILL CHECKING -- its own
  // sentence says it "will stop once every row is checked" -- so the rows it has matched stay on show, and the pane
  // says they are going nowhere. Emptying it contradicted the sentence beside it and made the earlier steps, which
  // had built Alpha and St. Ann up row by row, look like they had been lying.
  //
  // This replaces the opposite assertion, which read "the rows before the stop are not shown as a result". That was
  // a decision, not an oversight, and it is the practitioner's to reverse.
  const pane=html.slice(html.indexOf('walk-result'));
  assert.match(pane,/<td>Alpha<\/td>/,'the matching really did happen, and goes on happening');
  assert.match(pane,/None of this will be passed on: the step will stop once every row is checked\./);
  assert.match(html,/walk-result walk-result-doomed/,'and the pane is marked, not only worded');
  // THE LAST STEP HAS STOPPED, and there the result truly is nothing.
  const end=walkthroughMarkup(walk,walk.steps.length-1,esc);
  assert.match(end,/No table: the step stops here, so nothing is passed on to the next step\./);
  assert.doesNotMatch(end.slice(end.indexOf('walk-result')),/<td>Alpha<\/td>/,'nothing is passed on, and nothing is shown');
});
