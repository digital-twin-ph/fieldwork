import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {riskRatio,oddsRatio,riskDifference,rateRatio} from '../build/epi-estimate.js';
import {computeTwoByTwo} from '../build/two-by-two.js';

/** THE KERNEL'S ARITHMETIC, reached without a widget. Experiment 161, step 1.
 *
 *  The values are worked from the formulas in this file, on Oswego's vanilla ice cream
 *  (43, 11, 3, 18), so a change in `epi-estimate.ts` cannot pass by agreeing with itself. */
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

/** TWO IMPLEMENTATIONS MUST NOT DRIFT. Until a run can wait for WebAssembly, the same four measures
 *  exist in TypeScript and in the Rust kernel, and this is what holds them together. */
test('the Rust kernel agrees with the arithmetic the widgets use today',async()=>{
  const {instance:{exports:k}}=await WebAssembly.instantiate(
    readFileSync(new URL('../kernel/fieldwork-kernel.wasm',import.meta.url)));
  for(const [p,q,r,s] of [[43,11,3,18],[25,22,20,7],[94,27,7,158],[844,166810,18,19115]]){
    assert.equal(k.risk_ratio(p,q,r,s),riskRatio(p,q,r,s,95).value);
    assert.equal(k.odds_ratio(p,q,r,s),oddsRatio(p,q,r,s,95).value);
    assert.equal(k.risk_difference(p,q,r,s),riskDifference(p,q,r,s,95).value);
    const near=(x,y)=>assert.ok(Math.abs(x-y)<=1e-12*Math.abs(y),`${x} is not ${y}`);
    near(k.risk_ratio_ci_lower(p,q,r,s,Z95),riskRatio(p,q,r,s,95).lower);
    near(k.odds_ratio_ci_upper(p,q,r,s,Z95),oddsRatio(p,q,r,s,95).upper);
  }
});
