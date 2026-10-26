/** `TABLES`: risk, risk ratio, odds ratio and risk difference, on Snow's people.
 *
 *  The expected values are computed in the test from the cell counts rather than pasted as
 *  literals where a formula would do, EXCEPT the four cells and the two headline ratios, which are
 *  stated as numbers so that a change to the arithmetic cannot quietly agree with itself. Check 28
 *  is where these are compared against an independent implementation; this file only asserts that
 *  the application computes what this project says it computes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {computeTwoByTwo,SMALL_CELL} from '../build/two-by-two.js';

// The three-stratum table the relate-and-group chain derives. 16 of 32 sub-districts were supplied
// by BOTH companies, which is Snow's own confounding: that stratum is not an exposure group and
// the 2x2 leaves it out by name.
const CONTINGENCY=[
  ['Southwark and Vauxhall Company only','died',844],
  ['Southwark and Vauxhall Company only','survived',166810],
  ['Lambeth Company and Southwark and Vauxhall Company','died',652],
  ['Lambeth Company and Southwark and Vauxhall Company','survived',299497],
  ['Lambeth Company only','died',18],
  ['Lambeth Company only','survived',19115],
];
const contingency=(rows=CONTINGENCY)=>({kind:'data-table',
  keys:['water_supply','outcome'],valueField:'people',unit:'people',
  rows:rows.map(([water_supply,outcome,value])=>({key:{water_supply,outcome},value})),
  rowCount:rows.length,missingValueCount:0});
const REQUEST={exposureColumn:'water_supply',
  exposed:'Southwark and Vauxhall Company only',
  unexposed:'Lambeth Company only',
  outcomeColumn:'outcome',caseValue:'died',nonCaseValue:'survived',level:95};
const run=(over={},rows)=>computeTwoByTwo(contingency(rows),{...REQUEST,...over});
const named=(result,name)=>result.estimates.find(e=>e.name===name);

test('the four cells and the margins of the two named groups',()=>{
  const r=run();
  assert.deepEqual(r.cells,{exposedCases:844,exposedNonCases:166810,
    unexposedCases:18,unexposedNonCases:19115});
  assert.equal(r.exposedTotal,167654);
  assert.equal(r.unexposedTotal,19133);
  assert.equal(r.caseTotal,862);
  assert.equal(r.total,186787,'the two named groups, NOT the whole table');
});

test('the risk ratio, with its method named',()=>{
  const e=named(run(),'risk ratio');
  assert.equal(e.method,'Katz log');
  assert.equal(e.unavailable,null);
  assert.equal(e.value.toFixed(4),'5.3511');
  assert.equal(e.lower.toFixed(4),'3.3557');
  assert.equal(e.upper.toFixed(4),'8.5328');
  assert.equal(e.level,95);
  // THE SUBJECT is what the note must name. The first draft said "not comparable with a rate
  // ratio", which named the wrong difference: the houses risk ratio is 8.4019 against the rate
  // ratio's 8.40, agreeing to two decimals, while the people risk ratio is 5.35. What moves the
  // number is what is being counted, and that is what a reader must be told.
  assert.ok(e.notes.some(note=>/A risk per people\./.test(note)),e.notes.join(' | '));
  assert.ok(e.notes.some(note=>/a house rather than a person/.test(note)));
});

test('the odds ratio, with its method named',()=>{
  const e=named(run(),'odds ratio');
  assert.equal(e.method,'Wald log');
  assert.equal(e.value.toFixed(4),'5.3731');
  assert.equal(e.lower.toFixed(4),'3.3679');
  assert.equal(e.upper.toFixed(4),'8.5720');
  // Both risks are well under 10% here, so the two ratios nearly agree -- and the result says so
  // rather than letting a reader conclude they are the same quantity.
  assert.ok(e.notes.some(note=>/close to the risk ratio/.test(note)));
});

test('the risk difference is symmetric, because a difference is not a ratio',()=>{
  const r=run(),e=named(r,'risk difference');
  assert.equal(e.method,'Wald unpooled');
  assert.equal(e.value,r.riskExposed-r.riskUnexposed);
  assert.ok(Math.abs((e.upper-e.value)-(e.value-e.lower))<1e-12,
    'equal distance either side, unlike a log interval');
  assert.equal((e.value*1000).toFixed(3),'4.093');
});

test('every estimate owes a real method name and declares its Epi Info label unverified',()=>{
  for(const e of run().estimates){
    assert.ok(e.method&&!/^(default|standard|auto)$/.test(e.method),`${e.name} names its method`);
    // Not filled from memory. The CDC user guide states the statistics in prose and the layout
    // itself is an image, so these stay null until somebody reads them off Epi Info.
    assert.equal(e.epiInfoLabel,null);
    assert.equal(e.level,95);
  }
  assert.deepEqual(run().estimates.map(e=>e.name),
    ['risk ratio','odds ratio','risk difference'],'in the order a trained reader reads them');
});

test('the stratum left out is named, because a silent exclusion is how a 2x2 misleads',()=>{
  const r=run();
  assert.deepEqual(r.strataLeftOut,['Lambeth Company and Southwark and Vauxhall Company']);
  assert.ok(r.warnings.some(w=>/left out of this comparison/.test(w)));
  assert.ok(r.warnings.some(w=>/in neither group/.test(w)));
});

test('a zero reference count takes the risk ratio and leaves the risk difference',()=>{
  const rows=CONTINGENCY.map(([s,o,v])=>
    s==='Lambeth Company only'&&o==='died'?[s,o,0]:[s,o,v]);
  const r=run({},rows);
  const rr=named(r,'risk ratio');
  assert.equal(rr.value,null);
  assert.match(rr.unavailable,/has 0 died/);
  assert.match(rr.unavailable,/assumption rather than a measurement/);
  assert.equal(rr.method,'Katz log','the method is stated even with no value');
  assert.equal(named(r,'odds ratio').value,null);
  assert.match(named(r,'odds ratio').unavailable,/reciprocal of every cell/);
  const rd=named(r,'risk difference');
  assert.equal(rd.unavailable,null,'a difference is defined with a zero cell');
  assert.equal(rd.value,844/167654);
});

test('a small cell is reported rather than refused',()=>{
  const rows=CONTINGENCY.map(([s,o,v])=>
    s==='Lambeth Company only'&&o==='died'?[s,o,SMALL_CELL-1]:[s,o,v]);
  const r=run({},rows);
  assert.ok(named(r,'risk ratio').value>0,'still computed');
  assert.ok(r.warnings.some(w=>/doing most of the work/.test(w)));
});

test('an empty cell is unknown, not zero',()=>{
  const table=contingency();
  table.rows.find(r=>r.key.water_supply==='Lambeth Company only'
    &&r.key.outcome==='died').value=null;
  assert.throws(()=>computeTwoByTwo(table,REQUEST),/empty cell is unknown, not zero/);
});

test('a missing cell is refused, and says it is not a zero',()=>{
  const rows=CONTINGENCY.filter(([s,o])=>!(s==='Lambeth Company only'&&o==='died'));
  assert.throws(()=>run({},rows),/A two-by-two needs all four cells/);
});

test('an ungrouped table is refused, because a cell is not one number',()=>{
  const rows=[...CONTINGENCY,['Southwark and Vauxhall Company only','died',1]];
  assert.throws(()=>run({},rows),/so the cell is not one number/);
});

test('a table of rates is refused, because these estimates need counts',()=>{
  const rows=CONTINGENCY.map(([s,o,v])=>[s,o,v/1000]);
  assert.throws(()=>run({},rows),/not a whole number/);
});

test('a group compared with itself is refused',()=>{
  assert.throws(()=>run({unexposed:REQUEST.exposed}),/risk ratio of 1 by construction/);
});

test('an interval level this does not compute is refused by name',()=>{
  assert.throws(()=>run({level:97}),/not an interval level this computes/);
});
