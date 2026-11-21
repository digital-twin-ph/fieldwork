import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detect,normalQuantile,detectSettings} from '../build/aberration.js';

/** UNUSUAL COUNTS AGAINST R's surveillance PACKAGE (2026-11-21). A 40-day series with five days of excess (days 25 to 29),
 *  run through earsC and algo.cusum; their thresholds and signals kept in the fixture, so the agreement holds without R. */
const R=JSON.parse(readFileSync(new URL('./fixtures/aberration-r-surveillance.json',import.meta.url),'utf8'));
const x=R.series;
for(const [method,first] of [['C1',7],['C2',9]]){
  test(`EARS ${method}: R's thresholds to 1e-7 and its signals, period by period`,()=>{
    const ours=detect(x,{method:`ears-${method.toLowerCase()}`}).slice(first);
    assert.equal(ours.length,R[method].upper.length);
    ours.forEach((o,i)=>{assert.ok(Math.abs(o.threshold-R[method].upper[i])<1e-7,`day ${o.index}`);assert.equal(o.signal,!!R[method].alarm[i],`day ${o.index}`);});
    assert.ok(detect(x,{method:`ears-${method.toLowerCase()}`}).slice(0,first).every(o=>o.signal===null));
  });
}
test("EARS C3 by Hutwagner's definition: the day itself counts, so it signals on the outbreak's first day where R's bound does not",()=>{
  const ours=detect(x,{method:'ears-c3'}).slice(11);
  const differ=ours.filter((o,i)=>o.signal!==!!R.C3.alarm[i]).map(o=>o.index);
  assert.deepEqual(differ,[25]);
  assert.deepEqual(ours.filter(o=>o.signal).map(o=>o.index),[25,26,27,28,29]);
});
test("CUSUM: R's sums, bounds and signals",()=>{
  const ours=detect(x,{method:'cusum',baselinePeriods:7}).slice(7);
  ours.forEach((o,i)=>{assert.ok(Math.abs(o.statistic-R.cusum.cusum[i])<1e-12);assert.equal(o.threshold,R.cusum.upper[i]);assert.equal(o.signal,!!R.cusum.alarm[i]);});
  // RESET, after each signal, signals again only when the excess continues.
  assert.ok(detect(x,{method:'cusum',baselinePeriods:7,reset:true}).filter(o=>o.signal).length<ours.filter(o=>o.signal).length);
});
test('EWMA by its formula: the smoothed level, the widening limit, and the outbreak signalled',()=>{
  const rows=detect(x,{method:'ewma',baselinePeriods:7,lambda:0.3,L:3});
  const b=x.slice(0,7),m=b.reduce((a,c)=>a+c,0)/7,s=Math.sqrt(b.reduce((a,c)=>a+(c-m)**2,0)/6);
  let Z=m;
  rows.slice(7).forEach((o,j)=>{Z=0.3*x[o.index]+0.7*Z;const lim=m+3*s*Math.sqrt(0.3/1.7*(1-0.7**(2*(j+1))));
    assert.ok(Math.abs(o.statistic-Z)<1e-12&&Math.abs(o.threshold-lim)<1e-12);});
  assert.ok(rows.filter(o=>o.signal).every(o=>o.index>=25));
  assert.ok(rows.some(o=>o.signal&&o.index<=27));
});
test('the normal quantile, and settings refused in words',()=>{
  assert.ok(Math.abs(normalQuantile(0.999)-3.090232306167813)<1e-7);
  assert.ok(Math.abs(normalQuantile(0.975)-1.959963984540054)<1e-7);
  assert.throws(()=>detectSettings({method:'ears-c1',baseline:2}),/3 periods or more/);
  assert.throws(()=>detect([1,2,3],{method:'cusum',baselinePeriods:7}),/leaves none to watch/);
  assert.throws(()=>detect([0,0,0,0,0,0,0,1],{method:'cusum'}),/mean is 0/);
  assert.throws(()=>detect([1,-1,2],{method:'ears-c1'}),/0 or more/);
});
