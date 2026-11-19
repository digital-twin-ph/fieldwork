import test from 'node:test';
import assert from 'node:assert/strict';
const W=await import('../build/table-walkthroughs.js');
const {walkthroughMarkup}=await import('../build/table-walkthrough.js');
const {AGGREGATES}=await import('../build/group-table.js');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/** APPEND ROWS, SELECT ROWS AND TOTAL WITHIN GROUPS ON MADE-UP EXAMPLES (experiment 223). The rule each commits to: what
 *  the sentences say lands in the result is what the step's own function makes from the same rows, under every choice
 *  the dialog offers that changes the example. */
const agrees=(walk,label)=>{
  const last=walk.steps.at(-1);
  assert.ok(last.final&&last.result,`${label}: ends on the step's own table`);
  assert.deepEqual(last.result,walk.expected,label);
  walk.steps.forEach((_,at)=>assert.match(walkthroughMarkup(walk,at,esc),/Made-up example/,label));
};

test('Append rows: the stacked rows are the ones the steps added, with or without a column naming their table',()=>{
  for(const settings of [{nameSource:false,sourceColumn:'',labels:[]},{nameSource:true,sourceColumn:'week',labels:['Week 1','Week 2']}]){
    const walk=W.appendWalkthrough(settings);
    agrees(walk,JSON.stringify(settings));
  }
  const named=W.appendWalkthrough({nameSource:true,sourceColumn:'week',labels:['Week 1','Week 2']});
  assert.deepEqual(named.resultColumns,['district','sex','week','cases']);
  assert.match(named.steps[1].text,/their sex is left empty: not asked, which is not the same as none/);
  assert.deepEqual(named.steps.at(-1).result[0],['Alpha','','Week 1','4']);
  // The person's own column name and labels are about their tables, not these (2026-11-19).
  const theirs=W.appendWalkthrough({nameSource:true,sourceColumn:'year',labels:['2023','2024']});
  assert.deepEqual(theirs.resultColumns,['district','sex','week','cases']);
  assert.ok(!theirs.steps.some(s=>/2023|2024|year/.test(s.text)));
});

test('Select rows: each way of choosing keeps the rows the steps said, an empty cell included or not as the step does',()=>{
  for(const mode of ['values','leave-out','range'])agrees(W.selectWalkthrough(mode),mode);
  const text=mode=>W.selectWalkthrough(mode).steps.map(s=>s.text).join('\n');
  assert.match(text('values'),/Gamma has no region written, so it is neither North nor East: set aside/);
  assert.match(text('leave-out'),/Gamma has no region written\. It is not North, so leaving out North keeps it/);
  assert.match(text('range'),/Delta has no week written, so it is in no range: set aside/);
  assert.deepEqual(W.selectWalkthrough('values').expected.map(r=>r[0]),['Alpha','Epsilon','Delta'],'in the order named');
});

test('Total within groups: every summary, with empty cells left out or not, gives the values the steps said',()=>{
  for(const aggregate of AGGREGATES)for(const excludeMissing of [false,true])
    agrees(W.groupWalkthrough({aggregate,excludeMissing}),`${aggregate} ${excludeMissing}`);
  const sum=W.groupWalkthrough({aggregate:'sum',excludeMissing:false});
  assert.match(sum.steps[1].text,/One cell is empty, so its total is unknown, not smaller: left empty/);
  assert.deepEqual(sum.expected,[['North',''],['South','7']]);
  assert.deepEqual(W.groupWalkthrough({aggregate:'sum',excludeMissing:true}).expected,[['North','7'],['South','7']]);
  assert.match(W.groupWalkthrough({aggregate:'count',excludeMissing:false}).steps[1].text,/Counting rows counts all 3, the empty cell too: 3/);
});
