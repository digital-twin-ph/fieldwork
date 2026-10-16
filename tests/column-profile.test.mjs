/** Column profiles: what a file will and will not tell you. Experiment 117.
 *
 *  The arithmetic is tested against hand-computed values rather than against itself, because a
 *  quartile is exactly the kind of thing that is wrong by one rank for years without anybody
 *  noticing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {profileColumn,castColumn} from '../build/column-profile.js';

test('absent and mismatched are counted separately, because they are different problems',()=>{
  // A declared number holding: two real numbers, numeric text, non-numeric text, and nothing.
  const p=profileColumn('DEATHS',[3,5,'7','three',null,''],'number');
  assert.equal(p.total,6);
  assert.equal(p.absent,2,'null and empty are absent');
  assert.equal(p.mismatched,2,'"7" and "three" are present and not numbers');
  // And of those, only one would survive a cast. That count is what makes a repair honest:
  // it says in advance what the repair will not fix.
  assert.equal(p.repairable,1);
  assert.deepEqual(p.examples,['7','three']);
});

test('a column nobody declared has nothing to mismatch',()=>{
  const p=profileColumn('notes',['a',1,true],undefined);
  assert.equal(p.mismatched,0,'undeclared is not the same as wrong');
  assert.equal(p.repairable,0);
});

test('the shape of a numeric column, by rank rather than by assumption',()=>{
  // 1..9 plus a far value. Hand-computed: q1 over the sorted ten is 3.25, q3 is 7.75,
  // iqr 4.5, upper fence 7.75 + 6.75 = 14.5, so only 100 is beyond it.
  const p=profileColumn('n',[1,2,3,4,5,6,7,8,9,100],'number');
  assert.equal(p.numeric.min,1);
  assert.equal(p.numeric.max,100);
  assert.equal(p.numeric.median,5.5);
  assert.equal(p.numeric.q1,3.25);
  assert.equal(p.numeric.q3,7.75);
  assert.equal(p.numeric.upperFence,14.5);
  assert.equal(p.numeric.beyondFence,1);
});

test('numeric text counts toward the shape: a reader is not asking about JavaScript types',()=>{
  const p=profileColumn('n',['1','2','3','4'],'number');
  assert.equal(p.numeric.min,1);
  assert.equal(p.numeric.max,4);
  // It is still a mismatch against the declared kind, and both facts are true at once.
  assert.equal(p.mismatched,4);
  assert.equal(p.repairable,4);
});

test('too few numbers to describe a shape, so none is described',()=>{
  assert.equal(profileColumn('n',[1,2,3],'number').numeric,undefined,
    'three values state a shape nobody should read');
});

test('a category column says what is in it and how often',()=>{
  const p=profileColumn('kind',['clinic','clinic','pharmacy','clinic','post'],'term');
  assert.equal(p.distinct,3);
  assert.deepEqual(p.frequencies[0],{value:'clinic',count:3});
  assert.equal(p.frequencies.length,3);
});

test('a cast reports both sides, and leaves what it cannot read exactly as it was',()=>{
  const {values,outcome}=castColumn([3,'7','three',null,'  9 '],'number');
  assert.deepEqual(values,[3,7,'three',null,9],'unreadable values are untouched, not blanked');
  assert.equal(outcome.cast,2);
  assert.deepEqual(outcome.unreadable,['three']);
});

test('a cast never invents a value for an absent one',()=>{
  // Imputation is a modelling decision and belongs to the practitioner, not to a widget's
  // convenience. 117 records why no repair is offered for missing data.
  const {values,outcome}=castColumn([null,'',undefined],'number');
  assert.deepEqual(values,[null,'',undefined]);
  assert.equal(outcome.cast,0);
  assert.deepEqual(outcome.unreadable,[]);
});
