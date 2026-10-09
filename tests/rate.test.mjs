import test from 'node:test';
import assert from 'node:assert/strict';
import {Store,Parser} from 'n3';
import {computeRate,rateTable,rateChart,rateReceipt} from '../build/rate.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';

const record=(id,properties)=>({id,properties});
const houses=[
  record('h1',{deaths:3,any_death:1,houses:1,distance:10}),
  record('h2',{deaths:1,any_death:1,houses:1,distance:40}),
  record('h3',{deaths:0,any_death:0,houses:1,distance:45}),
  record('h4',{deaths:2,any_death:1,houses:1,distance:120}),
  record('h5',{deaths:0,any_death:0,houses:1,distance:130}),
];
const base={numeratorField:'deaths',denominatorField:'houses',denominatorUnit:'houses',rateKind:'ratio',
  multiplier:100,minimumDenominator:1,numeratorPeriod:'1854 outbreak',denominatorVintage:'1855 map'};

test('a rate states what its denominator counts, and refuses without it', () => {
  assert.throws(()=>computeRate(houses,{...base,denominatorUnit:'units'}),/deaths per house is not a mortality rate/);
  assert.throws(()=>computeRate(houses,{...base,numeratorField:''}),/what is being counted/);
  assert.throws(()=>computeRate(houses,{...base,denominatorField:''}),/population at risk/);
  assert.throws(()=>computeRate(houses,{...base,numeratorPeriod:' '}),/period the numerator covers/);
  assert.throws(()=>computeRate(houses,{...base,denominatorVintage:''}),/vintage of the denominator/);
  assert.throws(()=>computeRate(houses,{...base,rateKind:'percentage'}),/proportion.*or a ratio/s);
});

test('a proportion may not exceed one; the same data as a ratio may', () => {
  // Three deaths in one house is more than one death per house, which is a ratio, not a proportion.
  assert.throws(()=>computeRate(houses,{...base,rateKind:'proportion'}),
    /A proportion cannot exceed one|do not describe the same thing/);
  const ratio=computeRate(houses,base);
  assert.equal(ratio.overall,120);   // 6 deaths in 5 houses, per 100 houses
  const share=computeRate(houses,{...base,numeratorField:'any_death',rateKind:'proportion'});
  assert.equal(share.overall,60);    // 3 of 5 houses had a death
});

test('banding groups a numeric attribute and keeps the order of the bands', () => {
  const banded=computeRate(houses,{...base,groupBy:'distance',bandWidth:50});
  assert.deepEqual(banded.rows.map(r=>[r.label,r.numerator,r.denominator]),
    [['0–50',4,3],['100–150',2,2]]);
  assert.ok(Math.abs(banded.rows[0].rate-400/3)<1e-9,String(banded.rows[0].rate));
});

test('a denominator of zero or below the stated minimum yields counts and no rate', () => {
  const sparse=[...houses,record('h6',{deaths:1,houses:0,distance:300})];
  const result=computeRate(sparse,{...base,groupBy:'distance',bandWidth:50});
  const empty=result.rows.find(r=>r.denominator===0);
  assert.equal(empty.rate,null);
  assert.match(empty.reason,/not a rate/);
  const guarded=computeRate(houses,{...base,groupBy:'distance',bandWidth:50,minimumDenominator:3});
  const suppressed=guarded.rows.find(r=>r.denominator<3);
  assert.equal(suppressed.rate,null);
  assert.match(suppressed.reason,/below the stated minimum/);
  assert.equal(suppressed.numerator,2);   // the counts are still reported
  assert.equal(guarded.suppressed,1);
});

test('a value that is not a number is refused rather than treated as zero', () => {
  assert.throws(()=>computeRate([record('x',{deaths:'',houses:1})],base),/no numeric "deaths"/);
  assert.throws(()=>computeRate([record('x',{deaths:1,houses:'many'})],base),/no numeric "houses"/);
  assert.throws(()=>computeRate([record('x',{deaths:-1,houses:1})],base),/negative count/);
});

test('numerator and denominator vintages are compared, not assumed to match', () => {
  assert.equal(computeRate(houses,base).vintagesAgree,false);
  assert.equal(computeRate(houses,{...base,denominatorVintage:'1854 outbreak'}).vintagesAgree,true);
  assert.match(rateChart(computeRate(houses,base)).caption,/different vintages/);
});

test('the result is a table and a chart, and its receipt conforms', async () => {
  const result=computeRate(houses,{...base,groupBy:'distance',bandWidth:50});
  const table=rateTable(result);
  assert.deepEqual(table.keys,['group']);
  assert.equal(table.valueField,'per 100 houses');
  assert.equal(rateChart(result).bins.length,2);
  const facts=rateReceipt({id:'rate'},result,'r1','source').facts;
  const report=await validateGraph(new Store(new Parser().parse(facts)));
  assert.equal(report.conforms,true,report.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));
  assert.match(facts,/fw:denominatorUnit "houses"/);
  assert.match(facts,/fw:rateKind "ratio"/);
  assert.match(facts,/fw:vintagesAgree false/);
  assert.match(facts,/fw:numeratorPeriod "1854 outbreak"/);
  // A receipt that does not say what the denominator counts must not conform.
  assert.equal((await validateGraph(new Store(new Parser().parse(facts.replace(/fw:denominatorUnit "houses"; /g,''))))).conforms,false);
});
