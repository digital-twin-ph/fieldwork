import test from 'node:test';
import assert from 'node:assert/strict';
import {targetRules} from '../build/authored-rules.js';
import {evaluateAuthored} from '../build/rule-evaluation.js';

/** COMPARE WITH A TARGET (2026-11-12): one 7-1-7 interval by hand, as ordinary rules, checked on cases worked by hand. */
test('onset to diagnosis within 7 days: Met, Not met, and No verdict where a date is missing',()=>{
  const made=targetRules({later:'fwa:dt_diag',earlier:'fwa:dt_onset',days:'days_to_detect',target:7,setting:'detection_target',verdict:'detected_within_target'});
  assert.equal(made.rules.length,3);
  assert.equal(made.setting.name,'detection_target');
  const fields=[{attribute:'dt_onset',predicate:'fwa:dt_onset',kind:'date'},{attribute:'dt_diag',predicate:'fwa:dt_diag',kind:'date'}];
  const cases=[['a','2015-05-11','2015-05-20'],['b','2015-05-18','2015-05-20'],['c','','2015-06-01'],['d','2015-05-13','2015-05-20'],['e','2015-05-21','2015-05-20']];
  const records=cases.map(([id,dt_onset,dt_diag])=>({id,label:id,properties:{dt_onset,dt_diag}}));
  const e=evaluateAuthored(records,fields,made.rules,{detection_target:made.value},undefined,made.otherwise);
  const got=e.records.map(r=>[r.values.days_to_detect??null,r.values.detected_within_target]);
  assert.deepEqual(got,[[9,'NotMet'.replace('NotMet','Not met')],[2,'Met'],[null,'No verdict'],[7,'Met'],[-1,'Met']]);
});
test('the same column twice, a negative target, or one name for both columns is refused',()=>{
  const base={later:'fwa:b',earlier:'fwa:a',days:'d',target:7,setting:'t',verdict:'v'};
  assert.throws(()=>targetRules({...base,later:'fwa:a'}),/two different columns/);
  assert.throws(()=>targetRules({...base,target:-1}),/0 or more/);
  assert.throws(()=>targetRules({...base,verdict:'d'}),/different column names/);
});
