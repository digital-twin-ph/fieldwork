/** A TABLE IS A CHART, whatever role the table was given.
 *
 *  The practitioner, 2026-10-28: *"If the table's role is to represent decisions, it's still a
 *  table and if it has categories with numeric values, it can be presented as a chart."* These
 *  tests hold the two halves of that: any table with a category column and a number can be
 *  drawn, and the number drawn is the number in the table. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {tableChart,barNumber} from '../build/chart-output.js';
import {computeRate,rateTable,rateChart} from '../build/rate.js';
import {TYPES,nodeInputs,requiredInputs} from '../build/core.js';

const table=(rows,extra={})=>({kind:'data-table',keys:['group'],valueField:'per 1,000 people',
  rows:rows.map(([group,value])=>({key:{group},value})),rowCount:rows.length,
  missingValueCount:rows.filter(([,v])=>v===null).length,...extra});

test('a table draws itself: the category column against the number',()=>{
  const chart=tableChart(table([['Battersea',5.11],['Brixton',0.62],['Dulwich',0]]),undefined);
  assert.equal(chart.bins.length,3);
  assert.deepEqual(chart.bins.map(b=>b.label),['Battersea','Brixton','Dulwich']);
  assert.deepEqual(chart.bins.map(b=>b.count),[5.11,0.62,0]);
  // WHAT THE NUMBER IS, stated rather than assumed to be a frequency.
  assert.equal(chart.measure,'value');
  assert.equal(chart.categoryTitle,'group');
  assert.match(chart.caption,/per 1,000 people by group/);
});

test('the unit travels, so an axis can be titled with it',()=>{
  const chart=tableChart(table([['A',1]],{unit:'per 1,000 people'}));
  assert.equal(chart.unit,'per 1,000 people');
  assert.equal(tableChart(table([['A',1]])).unit,undefined,
    'a table that stated no unit does not acquire one');
});

test('a row with no value is drawn at zero and said so, not dropped',()=>{
  const chart=tableChart(table([['A',2],['Suppressed',null]]));
  assert.equal(chart.bins.length,2,'a suppressed group is not a group that vanished');
  assert.equal(chart.bins[1].count,0);
  assert.match(chart.caption,/1 row with no value, drawn at zero/);
});

test('two rows sharing a category keep separate bars rather than being added',()=>{
  // A rate is not addable, and a total nobody asked for is worse than two bars.
  const two={...table([['Lambeth',1],['Lambeth',2]]),keys:['group','year']};
  two.rows[0].key.year='1849';two.rows[1].key.year='1854';
  const chart=tableChart(two,'group');
  assert.deepEqual(chart.bins.map(b=>b.count),[1,2]);
  assert.equal(new Set(chart.bins.map(b=>b.key)).size,2,'the renderer needs unique keys');
  assert.match(chart.caption,/keyed also by year/);
});

test('the refusals name what is wrong',()=>{
  assert.throws(()=>tableChart(table([])),/holds no rows/);
  assert.throws(()=>tableChart(table([['A',1]]),'district'),/no "district" column/);
});

/** THE ROUNDING THAT WAS THERE. `Math.round(row.rate)` turned 16 distinct rates into 6 bars on
 *  South London's own table, which is the variation the chart exists to show. */
test('a rate charts as a rate, not as a rounded count',()=>{
  const records=[
    {id:'1',properties:{group:'Battersea',deaths:45,people:8800}},
    {id:'2',properties:{group:'Camberwell',deaths:52,people:9610}},
    {id:'3',properties:{group:'Leather Market',deaths:51,people:9630}},
  ];
  const result=computeRate(records,{numeratorField:'deaths',denominatorField:'people',
    denominatorUnit:'people',rateKind:'proportion',multiplier:1000,minimumDenominator:20,
    groupBy:'group',numeratorPeriod:'1854',denominatorVintage:'1851'});
  const chart=rateChart(result);
  assert.equal(new Set(chart.bins.map(b=>b.count)).size,chart.bins.length,
    'three rates near 5 per 1,000 stay three distinct bars');
  assert.ok(chart.bins.every(b=>!Number.isInteger(b.count)),'none of these is a whole number');
  assert.equal(chart.measure,'value');
  assert.equal(chart.categoryTitle,'group');
  // AND THE TABLE CARRIES ITS UNIT, which it never did: the column read "per 1,000 people"
  // above the line "value in an unstated unit".
  assert.equal(rateTable(result).unit,'per 1,000 people');
});

test('a bar prints as a figure, not as the division’s tail',()=>{
  assert.equal(barNumber(5.113636363636363,'value'),'5.114');
  assert.equal(barNumber(0,'value'),'0');
  assert.equal(barNumber(32,'record-count'),'32');
  assert.equal(barNumber(1234,'value'),'1,234');
});

/** The ports, which is what made this unreachable rather than merely unbuilt. */
test('a chart declares every port it can draw, and requires none',()=>{
  const types=inputMode=>nodeInputs({type:'chart_output',params:{label:'c',inputMode}})
    .map(([,type])=>type);
  for(const mode of [undefined,'decisions','polygons','series'])
    for(const needed of ['table','decisions','polygons'])
      assert.ok(types(mode).includes(needed),
        `a chart must offer a ${needed} port whatever inputMode says (${mode})`);
  assert.deepEqual(requiredInputs({type:'chart_output',params:{label:'c'}}),[],
    'a chart draws what it is given and insists on nothing');
  assert.ok(TYPES.chart_output.inputs.some(([name])=>name==='records'));
});
