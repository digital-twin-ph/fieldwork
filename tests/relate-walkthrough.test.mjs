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
  assert.match(text,/Delta stays, its supplier written as "Not known", your words/);
  assert.match(text,/Epsilon is found 2 times\. You chose one row per match, so it becomes 2 rows/);
  assert.match(text,/Zeta is in Water supply by district only\. Nothing in the first table asks for it/);
  assert.equal(fuzzy.steps.at(-1).result.length,5);
  const exact=relateWalkthrough({normalisation:'exact',spelling:false,several:false,decision:'drop',label:''});
  assert.match(exact.steps.map(s=>s.text).join('\n'),/Compared exactly, St\. Ann is not St Ann\. You chose to drop unmatched rows/);
  assert.match(exact.steps.at(-1).text,/^With these choices the step stops: The second table gives "Epsilon" more than one "supplier"/);
});

test('every step is headed as made up, says where it is, and marks its rows in words and a shape',()=>{
  const walk=relateWalkthrough({normalisation:'fuzzy',spelling:false,several:false,decision:'',label:''});
  walk.steps.forEach((_,at)=>{
    const html=walkthroughMarkup(walk,at,esc);
    assert.match(html,/<p class="walk-made-up">Made-up example<\/p>/);
    assert.match(html,new RegExp(`Step ${at+1} of ${walk.steps.length}\\.`));
    assert.match(html,/aria-live="polite"/);
  });
  const html=walkthroughMarkup(walk,4,esc);
  assert.match(html,/<tr class="walk-stopped" data-walk-state="stopped">[\s\S]*?<td class="walk-word"><span aria-hidden="true">■<\/span> stops here<\/td>/);
});
