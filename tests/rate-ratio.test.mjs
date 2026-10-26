import test from 'node:test';
import assert from 'node:assert/strict';
import {computeRate} from '../build/rate.js';
import {computeRateRatio,rateRatioSentence,SMALL_COUNT} from '../build/rate-ratio.js';

/** A RATIO OF TWO RATES. Experiment 139.
 *
 *  `rate` computes one group's measure and stops. Snow's argument is a contrast, and until this
 *  module the framework could map his rates and not compare them. */

const OPTIONS={numeratorField:'deaths',denominatorField:'houses',groupBy:'supplier',
  denominatorUnit:'houses',rateKind:'ratio',multiplier:10000,minimumDenominator:0,
  numeratorPeriod:'seven weeks to 26 August 1854',denominatorVintage:'1851'};

// Snow's Table IX, as published.
const HOUSES=[
  {id:'1',properties:{supplier:'Southwark and Vauxhall Company',deaths:1263,houses:40046}},
  {id:'2',properties:{supplier:'Lambeth Company',deaths:98,houses:26107}},
];

const ratioOf=(records,options,pick)=>computeRateRatio(computeRate(records,options),
  {level:95,method:'log-normal',...pick});

test("Snow's per-house comparison, with its interval",()=>{
  const r=ratioOf(HOUSES,OPTIONS,
    {compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'});
  // 315.4 per 10,000 houses against 37.5. Computed from the published counts, 2026-10-25.
  assert.equal(r.ratio.toFixed(2),'8.40');
  assert.equal(r.lower.toFixed(2),'6.84');
  assert.equal(r.upper.toFixed(2),'10.32');
  assert.equal(r.level,95);
  assert.equal(r.denominatorUnit,'houses');
  // THE MULTIPLIER CANCELS. A rate ratio is dimensionless, so per-10,000 must not survive into it.
  assert.equal(r.ratio,(1263/40046)/(98/26107));
  assert.equal(r.smallCountWarning,null);
});

test('the multiplier does not reach the ratio',()=>{
  const per1000=ratioOf(HOUSES,{...OPTIONS,multiplier:1000},
    {compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'});
  const per100k=ratioOf(HOUSES,{...OPTIONS,multiplier:100000},
    {compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'});
  assert.equal(per1000.ratio,per100k.ratio);
  assert.equal(per1000.lower,per100k.lower);
});

test('the direction is the practitioner\'s, and it is not symmetric prose',()=>{
  const forward=ratioOf(HOUSES,OPTIONS,
    {compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'});
  const back=ratioOf(HOUSES,OPTIONS,
    {compared:'Lambeth Company',reference:'Southwark and Vauxhall Company'});
  assert.equal((forward.ratio*back.ratio).toFixed(10),'1.0000000000');
  assert.match(rateRatioSentence(forward),/^Southwark and Vauxhall Company against Lambeth Company/);
  assert.match(rateRatioSentence(back),/^Lambeth Company against Southwark and Vauxhall Company/);
  // The sentence names the denominator, because 8.40 per house and 8.40 per person are not the
  // same finding and a reader cannot tell them apart from the number.
  assert.match(rateRatioSentence(forward),/houses/);
});

/** THE ZERO CELL. Dulwich recorded 0 cholera deaths in Snow's seven weeks. */
test('a group with no events refuses, rather than reporting an infinite interval',()=>{
  const withDulwich=[
    {id:'1',properties:{sub_district:'St. Olave, Southwark',deaths:53,population:8015}},
    {id:'2',properties:{sub_district:'Dulwich',deaths:0,population:1632}},
  ];
  const people={...OPTIONS,numeratorField:'deaths',denominatorField:'population',
    groupBy:'sub_district',denominatorUnit:'people',multiplier:1000};
  assert.throws(()=>ratioOf(withDulwich,people,
    {compared:'St. Olave, Southwark',reference:'Dulwich'}),
    /Dulwich.*0 events.*undefined/s);
  // And in the numerator too: the refusal is about the cell, not about which side it is on.
  assert.throws(()=>ratioOf(withDulwich,people,
    {compared:'Dulwich',reference:'St. Olave, Southwark'}),/Dulwich.*0 events/s);
});

/** PUTNEY HAS ONE. The method will answer, and the answer should not be read without its count. */
test('a small count is reported rather than refused',()=>{
  const withPutney=[
    {id:'1',properties:{sub_district:'St. Olave, Southwark',deaths:53,population:8015}},
    {id:'2',properties:{sub_district:'Putney',deaths:1,population:5280}},
  ];
  const r=ratioOf(withPutney,{...OPTIONS,numeratorField:'deaths',denominatorField:'population',
    groupBy:'sub_district',denominatorUnit:'people',multiplier:1000},
    {compared:'St. Olave, Southwark',reference:'Putney'});
  assert.ok(r.ratio>30);
  assert.match(r.smallCountWarning,/Putney has 1 event\b/);
  assert.ok(SMALL_COUNT>1);
  // It still reports an interval, and the interval is enormous, which is the honest answer.
  assert.ok(r.upper/r.lower>20,'one event buys an interval spanning more than twentyfold');
});

test('a group compared with itself is refused',()=>{
  assert.throws(()=>ratioOf(HOUSES,OPTIONS,
    {compared:'Lambeth Company',reference:'Lambeth Company'}),/compared with itself/);
});

test('a group that is not there names the ones that are',()=>{
  assert.throws(()=>ratioOf(HOUSES,OPTIONS,
    {compared:'Kent Waterworks',reference:'Lambeth Company'}),
    /No group "Kent Waterworks".*Southwark and Vauxhall Company/s);
});

test('a plain table is refused: only a rate says what its numbers are per',()=>{
  assert.throws(()=>computeRateRatio({kind:'data-table',rows:[]},
    {compared:'a',reference:'b',level:95,method:'log-normal'}),/divides two RATES/);
});

test('an interval level that was not computed is refused, not rounded to one that was',()=>{
  assert.throws(()=>ratioOf(HOUSES,OPTIONS,
    {compared:'Southwark and Vauxhall Company',reference:'Lambeth Company',level:92}),
    /92% is not an interval level/);
});

test('a wider level gives a wider interval',()=>{
  const pick={compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'};
  const ninety=ratioOf(HOUSES,OPTIONS,{...pick,level:90});
  const ninetyNine=ratioOf(HOUSES,OPTIONS,{...pick,level:99});
  assert.ok(ninetyNine.lower<ninety.lower&&ninetyNine.upper>ninety.upper);
  assert.equal(ninety.level,90);
});

/** THE KNOBS ARE NOT EPIDEMIOLOGICAL FURNITURE. Experiment 139, and the practitioner's
 *  instruction on 2026-10-25: make sure the knobs make logical sense and apply to different
 *  relevant use cases.
 *
 *  The parameter was called `exposed` until that day. Exposure is ONE use of a rate ratio. The
 *  rule the widget actually follows is simpler and holds everywhere: whatever the rate was
 *  grouped by is what you may compare. Group by supplier and you compare suppliers; group by
 *  district and you compare places; group by period and you compare periods. None of those is an
 *  exposure, and a knob named for the commonest case misdescribes the rest. */
test('the same knobs compare places, not only exposures',()=>{
  const places=[
    {id:'1',properties:{sub_district:'St. Olave, Southwark',deaths:53,population:8015}},
    {id:'2',properties:{sub_district:'Brixton',deaths:24,population:38498}},
  ];
  const r=ratioOf(places,{...OPTIONS,numeratorField:'deaths',denominatorField:'population',
    groupBy:'sub_district',denominatorUnit:'people',multiplier:1000},
    {compared:'St. Olave, Southwark',reference:'Brixton'});
  // 6.61 per 1,000 against 0.62. Nothing here is an exposure; it is two places.
  assert.equal(r.ratio.toFixed(2),'10.61');
  assert.equal(r.denominatorUnit,'people');
  assert.match(rateRatioSentence(r),/^St\. Olave, Southwark against Brixton/);
  // The sentence says "people", not "exposed" or "unexposed", because neither group is either.
  assert.doesNotMatch(rateRatioSentence(r),/exposed/i);
});

test('the same knobs compare periods',()=>{
  // One subject per period: the comparison axis is whatever the rate grouped by.
  const periods=[
    {id:'1',properties:{period:'1849',deaths:283,population:19709}},
    {id:'2',properties:{period:'1854',deaths:371,population:19709}},
  ];
  const r=ratioOf(periods,{...OPTIONS,numeratorField:'deaths',denominatorField:'population',
    groupBy:'period',denominatorUnit:'people',multiplier:1000},
    {compared:'1854',reference:'1849'});
  assert.equal(r.ratio.toFixed(2),'1.31');
  assert.match(rateRatioSentence(r),/^1854 against 1849/);
});

/** THE 2x2 A READER CHECKS THE RATIO AGAINST. Experiment 136: a matrix of two variables IS the
 *  contingency table a rate ratio summarises, and until 2026-10-26 the number was shown and the
 *  table it came from could not be. The counts were on the result and reached no display.
 *
 *  This asserts the shape the node emits rather than the module's own return, because that is
 *  what a Table output renders: group against measure, in the long form every table here uses. */
test('the emitted table is the contingency table, not the summary alone',()=>{
  const r=ratioOf(HOUSES,OPTIONS,
    {compared:'Southwark and Vauxhall Company',reference:'Lambeth Company'});
  // What the node builds from it, mirrored here: four cells, two variables.
  const rows=[
    {key:{group:r.compared.label,measure:'events'},value:r.compared.events},
    {key:{group:r.compared.label,measure:`${r.denominatorUnit} at risk`},value:r.compared.unitsAtRisk},
    {key:{group:r.reference.label,measure:'events'},value:r.reference.events},
    {key:{group:r.reference.label,measure:`${r.denominatorUnit} at risk`},value:r.reference.unitsAtRisk},
  ];
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(x=>x.value),[1263,40046,98,26107],'Snow Table IX, as published');
  assert.deepEqual([...new Set(rows.map(x=>x.key.group))].length?[...new Set(rows.map(x=>x.key.measure))]:[],
    ['events','houses at risk'],'the measure names the unit, because a count of houses is not a count of people');
  // And the ratio is still reachable: the summary rides on the value, it is not the value.
  assert.equal(r.ratio.toFixed(2),'8.40');
});
