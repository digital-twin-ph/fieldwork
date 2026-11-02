import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {riskRatio,oddsRatio,riskDifference,rateRatio} from '../build/epi-estimate.js';
import {groupTable} from '../build/group-table.js';
import {computeExposures} from '../build/exposure-table.js';
import {computeTwoByTwo} from '../build/two-by-two.js';

/** THE KERNEL'S ARITHMETIC, reached without a widget. Experiment 161, step 1.
 *
 *  The values are worked from the formulas in this file, on Oswego's vanilla ice cream
 *  (43, 11, 3, 18), so a change in the Rust kernel cannot pass by agreeing with itself. */
const [a,b,c,d]=[43,11,3,18];
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} is not ${expected}`);
const Z95=1.959963984540054;

test('the risk ratio is Katz log, by hand',()=>{
  const value=(43/54)/(3/21),se=Math.sqrt(1/43-1/54+1/3-1/21);
  const r=riskRatio(a,b,c,d,95);
  close(r.value,value);
  close(r.lower,Math.exp(Math.log(value)-Z95*se));
  close(r.upper,Math.exp(Math.log(value)+Z95*se));
});
test('the odds ratio is ad/bc, Wald log, by hand',()=>{
  const value=(43*18)/(11*3),se=Math.sqrt(1/43+1/11+1/3+1/18);
  const r=oddsRatio(a,b,c,d,95);
  close(r.value,value);
  close(r.upper,Math.exp(Math.log(value)+Z95*se));
});
test('the risk difference is symmetric about its value',()=>{
  const r=riskDifference(a,b,c,d,95);
  close(r.value,43/54-3/21);
  close(r.value-r.lower,r.upper-r.value);
});
test('a rate ratio over units equals the risk ratio and has the narrower form of interval',()=>{
  // The same division when a unit can hold one event, as check 30 found on Snow's houses. Only
  // the standard error differs, because a risk's numerator is inside its denominator.
  const rate=rateRatio(a,54,c,21,95),risk=riskRatio(a,b,c,d,95);
  close(rate.value,risk.value);
  assert.notEqual(rate.lower,risk.lower);
});
test('the widget reports what the kernel computes, unchanged',()=>{
  const row=(e,o,value)=>({key:{e,o},value});
  const table={kind:'data-table',keys:['e','o'],valueField:'rows',rowCount:4,missingValueCount:0,
    rows:[row('Y','Y',a),row('Y','N',b),row('N','Y',c),row('N','N',d)]};
  const out=computeTwoByTwo(table,{exposureColumn:'e',outcomeColumn:'o',exposed:'Y',unexposed:'N',
    caseValue:'Y',nonCaseValue:'N',level:95});
  const of=name=>out.estimates.find(e=>e.name===name);
  assert.equal(of('risk ratio').value,riskRatio(a,b,c,d,95).value);
  assert.equal(of('odds ratio').upper,oddsRatio(a,b,c,d,95).upper);
  assert.equal(of('risk difference').lower,riskDifference(a,b,c,d,95).lower);
});

/** STEP 2: A LINE LIST IS READ DIRECTLY, AND THE CHAIN IT REPLACES MUST AGREE.
 *
 *  Every food in Oswego, both ways: counted by `group_table` and read as totals, then read straight
 *  from the rows. Experiment 161 holds this as the condition for the step. */
const OSWEGO=new URL('../../example-1940-oswego-church-supper/data/oswego-line-list.csv',import.meta.url);
const list=()=>{
  const [head,...rows]=readFileSync(OSWEGO,'utf8').trim().split(/\r?\n/).map(line=>line.split(','));
  const keys=['ID','Ill',...head.slice(7)];
  return {keys,table:{kind:'data-table',keys,valueField:'Age',missingValueCount:0,rowCount:rows.length,
    rows:rows.map(row=>({key:Object.fromEntries(keys.map(k=>[k,row[head.indexOf(k)]])),
      value:Number(row[head.indexOf('Age')])}))}};
};
const asked=food=>({exposureColumn:food,exposed:'Y',unexposed:'N',outcomeColumn:'Ill',caseValue:'Y',
  nonCaseValue:'N',level:95});
test('every Oswego food gives the same result from the rows as from the counted chain',
  {skip:existsSync(OSWEGO)?false:'the Oswego example is not checked out beside this repository'},()=>{
    const {keys,table}=list();
    assert.equal(keys.length-2,14);
    for(const food of keys.slice(2)){
      const counted=groupTable(table,{by:['Ill',food],aggregate:'count'}).table;
      const chain=computeTwoByTwo(counted,asked(food));
      const direct=computeTwoByTwo(table,{...asked(food),rowsAreSubjects:true});
      assert.deepEqual(direct.cells,chain.cells,food);
      assert.deepEqual(direct.estimates,chain.estimates,food);
      assert.deepEqual(direct.strataLeftOut,chain.strataLeftOut,food);
    }
  });
test('in a line list an empty combination is a true zero, and in totals it stays a refusal',()=>{
  const row=(id,e,o)=>({key:{id,e,o},value:1});
  const table={kind:'data-table',keys:['id','e','o'],valueField:'v',missingValueCount:0,rowCount:3,
    rows:[row('1','Y','I'),row('2','Y','W'),row('3','N','W')]};
  const request={exposureColumn:'e',exposed:'Y',unexposed:'N',outcomeColumn:'o',caseValue:'I',
    nonCaseValue:'W',level:95};
  const out=computeTwoByTwo(table,{...request,rowsAreSubjects:true});
  assert.equal(out.cells.unexposedCases,0);
  assert.ok(out.estimates.find(e=>e.name==='risk ratio').unavailable);
  assert.throws(()=>computeTwoByTwo(table,request),/no row for/);
});
test('an outcome nobody recorded is named, not dropped',()=>{
  const row=(id,e,o)=>({key:{id,e,o},value:1});
  const table={kind:'data-table',keys:['id','e','o'],valueField:'v',missingValueCount:0,rowCount:5,
    rows:[row('1','Y','I'),row('2','Y','W'),row('3','N','W'),row('4','N','I'),row('5','N','?')]};
  const out=computeTwoByTwo(table,{exposureColumn:'e',exposed:'Y',unexposed:'N',outcomeColumn:'o',
    caseValue:'I',nonCaseValue:'W',level:95,rowsAreSubjects:true});
  assert.deepEqual(out.outcomesLeftOut,['?']);
  assert.equal(out.total,4);
  assert.ok(out.warnings.some(w=>w.includes('"?"')));
});

/** STEP 3: SEVERAL EXPOSURES, ONE TABLE. Oswego's foods, against the one-exposure reading. */
const keep=result=>result;
test('every food in one table matches its own two-by-two',
  {skip:existsSync(OSWEGO)?false:'the Oswego example is not checked out beside this repository'},()=>{
    const {keys,table}=list();
    const foods=keys.slice(2);
    const out=computeExposures(table,{...asked(foods[0]),rowsAreSubjects:true},foods,keep);
    assert.deepEqual(out.rows.map(row=>row.column),foods,'rows stay in the order chosen');
    const cell=(food,measure)=>out.table.rows.find(r=>r.key.exposure===food&&r.key.measure===measure).value;
    for(const food of foods){
      const one=computeTwoByTwo(table,{...asked(food),rowsAreSubjects:true});
      assert.equal(cell(food,'a'),one.cells.exposedCases,food);
      assert.equal(cell(food,'c+d'),one.unexposedTotal,food);
      assert.equal(cell(food,'risk ratio'),Math.round(100*one.estimates[0].value)/100,food);
      assert.equal(cell(food,'upper'),Math.round(100*one.estimates[0].upper)/100,food);
      assert.deepEqual(out.rows.find(row=>row.column===food).result.estimates[0],one.estimates[0],food);
    }
    assert.equal(cell('Mashed potato','not recorded'),1);
    assert.equal(cell('Spinach','not recorded'),0);
    assert.match(out.sentence,/14 exposures compared.*none adjusted for the number of comparisons/);
  });
test('one unusable exposure is a row saying so, not a failed run',()=>{
  const row=(id,e,f,o)=>({key:{id,e,f,o},value:1});
  const table={kind:'data-table',keys:['id','e','f','o'],valueField:'v',missingValueCount:0,rowCount:3,
    rows:[row('1','Y','x','I'),row('2','N','x','W'),row('3','9','x','W')]};
  const request={exposureColumn:'e',exposed:'Y',unexposed:'N',outcomeColumn:'o',caseValue:'I',
    nonCaseValue:'W',level:95,rowsAreSubjects:true};
  const out=computeExposures(table,request,['e','f'],keep);
  assert.ok(out.rows[0].result);
  assert.equal(out.rows[0].notRecorded,1,'the 9 is not recorded, and is counted as such');
  assert.equal(out.rows[1].result,null);
  assert.match(out.sentence,/Not read: f /);
});
test('several exposures need a line list',()=>{
  const table={kind:'data-table',keys:['e','o'],valueField:'v',missingValueCount:0,rowCount:0,rows:[]};
  assert.throws(()=>computeExposures(table,{exposureColumn:'e',exposed:'Y',unexposed:'N',outcomeColumn:'o',
    caseValue:'I',nonCaseValue:'W',level:95},['e'],keep),/one subject/);
});
