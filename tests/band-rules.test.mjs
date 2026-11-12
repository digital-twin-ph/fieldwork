import test from 'node:test';
import assert from 'node:assert/strict';
import {bandRules} from '../build/authored-rules.js';
import {evaluateAuthored} from '../build/rule-evaluation.js';

/** BANDS FROM CUT POINTS (2026-11-12): one rule per band, no gap, no overlap, labelled as people write age bands. */
test('measles surveillance bands from a start of 0 and cuts 1, 5, 10, 15',()=>{
  const {rules,labels}=bandRules('fwa:AgeYears',0,[1,5,10,15],'age_band');
  assert.deepEqual(labels,['0','1 to 4','5 to 9','10 to 14','15 and over']);
  assert.equal(rules.length,5);
  assert.deepEqual(rules[1].any[0].all,[{field:'fwa:AgeYears',comparator:'notLessThan',value:1},{field:'fwa:AgeYears',comparator:'lessThan',value:5}]);
  assert.deepEqual(rules[4].any[0].all,[{field:'fwa:AgeYears',comparator:'notLessThan',value:15}]);
  assert.equal(rules[1].then[0].predicate,'fwa:age_band');
});
test('every age lands in exactly one band, and an age below the start in none',()=>{
  const {rules}=bandRules('fwa:age',0,[1,5,10,15],'band');
  const fields=[{attribute:'age',predicate:'fwa:age',kind:'number'}];
  const records=[-1,0,0.5,1,4,4.9,5,9,10,14,15,117].map((age,i)=>({id:`r${i}`,label:`r${i}`,properties:{age}}));
  const e=evaluateAuthored(records,fields,rules,{});
  const got=e.records.map(r=>r.values.band??null);
  assert.deepEqual(got,[null,'0','0','1 to 4','1 to 4','1 to 4','5 to 9','5 to 9','10 to 14','10 to 14','15 and over','15 and over']);
  assert.ok(e.records.every(r=>!r.conflicts.length),'no overlap');
});
test('decimals are said as "to under", and cut points that do not rise are refused',()=>{
  assert.deepEqual(bandRules('fwa:x',0,[1.5,3],'b').labels,['0 to under 1.5','1.5 to under 3','3 and over']);
  assert.throws(()=>bandRules('fwa:x',0,[5,5],'b'),/must rise/);
  assert.throws(()=>bandRules('fwa:x',0,[],'b'),/at least one cut point/);
});
