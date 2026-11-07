import test from 'node:test';
import assert from 'node:assert/strict';
import {tableChart,chartMarkup} from '../build/chart-output.js';
import {chartVegaSpec,chartSpecificationFacts,ratioScaleNote} from '../build/chart-vega.js';
import {appendTables} from '../build/append-rows.js';
import {regressionTable} from '../build/regression.js';

/** A LAG-RESPONSE PLOT from five regressions stacked (experiment 181). The estimates are 180's live results, written
 *  here by hand rather than taken from the code: lags 0, 2, 4, 6 and 8 weeks, rate ratio per 1 °C. */
const LIVE=[[0,0.993,0.983,1.004],[2,0.979,0.969,0.989],[4,0.963,0.954,0.973],[6,1.007,0.997,1.017],[8,1.063,1.053,1.073]];
const model=(ratio,lower,upper)=>regressionTable({family:'poisson',measure:'rate ratio',level:95,
  estimates:[{term:'LST_Day_1km',column:'LST_Day_1km',ratio,lower,upper,p:0.01},{term:'mes[2]',column:'mes',level:'2',ratio:1.5,lower:1.4,upper:1.6,p:0.001}]});
const stacked=(params={})=>appendTables(LIVE.map(([,r,l,u])=>model(r,l,u)),
  {nameSource:true,sourceColumn:'lag',labels:LIVE.map(([lag])=>String(lag)),labelsAreNumbers:{unit:'weeks before'},...params}).table;
const exposure=table=>({...table,rows:table.rows.filter(r=>r.key.term==='LST_Day_1km')});

test('Regression declares its interval, so nothing is read off the statistic names',()=>{
  assert.deepEqual(model(1,1,1).interval,{column:'statistic',estimate:'rate ratio',lower:'lower 95%',upper:'upper 95%',level:95,ratio:true});
});

test('each lag is one point with its whisker, placed as a number in weeks, equal to the regression to every digit',()=>{
  const chart=tableChart(exposure(stacked()),'lag');
  assert.deepEqual(chart.bins.map(b=>[b.order,b.count,b.lower,b.upper]),LIVE);
  assert.deepEqual(chart.numericCategory,{unit:'weeks before'});
  assert.equal(chart.categoryTitle,'lag (weeks before)');
  assert.equal(chart.caption,'rate ratio with its 95% interval by lag');
});

test('a ratio is drawn on a log scale with a dashed line at 1 by default, and the figure says why',()=>{
  const chart=tableChart(exposure(stacked()),'lag');
  const spec=chartVegaSpec(chart,{label:'Lag'});
  const [line,whisker,point]=spec.layer;
  assert.equal(line.encoding.y.datum??line.data.values[0].one,1);
  assert.deepEqual(line.mark.strokeDash,[5,4]);
  assert.equal(point.encoding.y.scale.type,'log');
  assert.equal(whisker.encoding.y.field,'lower');assert.equal(whisker.encoding.y2.field,'upper');
  assert.equal(point.encoding.x.type,'quantitative');
  assert.deepEqual(point.encoding.x.axis.values,[0,2,4,6,8]);
  const [low,high]=point.encoding.y.scale.domain;
  assert.ok(low<0.954&&high>1.073,'the domain holds every limit');
  assert.match(spec.title.subtitle.join(' '),/Log scale, so a ratio and its inverse sit equally far from 1; the dashed line at 1 marks no association\. Whiskers are 95% intervals\./);
});

test('the practitioner can turn both off, and the receipt says which was drawn',()=>{
  const chart=tableChart(exposure(stacked()),'lag');
  const spec=chartVegaSpec(chart,{label:'Lag',ratioScale:'linear',referenceLine:false});
  assert.equal(spec.layer.length,2);
  assert.equal(spec.layer[1].encoding.y.scale.type,'linear');
  assert.equal(ratioScaleNote(chart,{ratioScale:'linear',referenceLine:false}),undefined);
  const facts=chartSpecificationFacts({id:'c',type:'chart_output',params:{label:'Lag'}},'r','s',chart,'value');
  assert.match(facts,/fw:chartIntervalLevel 95; fw:chartScale "log"; fw:chartReferenceLine true\./);
});

test('without the declaration the lags are categories, evenly spaced in order; the month terms are told apart',()=>{
  const plain=stacked({labelsAreNumbers:undefined});
  const chart=tableChart(exposure(plain),'lag');
  assert.equal(chart.numericCategory,undefined);
  assert.equal(chartVegaSpec(chart,{label:'Lag'}).layer[2].encoding.x.type,'nominal');
  const both=tableChart(plain,'lag');
  assert.equal(both.bins.length,10,'two terms per lag, not merged');
  assert.match(both.bins[1].label,/^0 \(mes\[2\]\)$/);
});

test('a missing limit draws the point alone and says so; a ratio at or below zero stops',()=>{
  const table=exposure(stacked());
  const gap={...table,rows:table.rows.filter(r=>!(r.key.lag==='4'&&r.key.statistic==='upper 95%'))};
  const chart=tableChart(gap,'lag');
  assert.equal(chart.bins[2].upper,undefined);
  assert.match(chart.caption,/1 without an interval/);
  const bad={...table,rows:table.rows.map(r=>r.key.lag==='2'&&r.key.statistic==='lower 95%'?{...r,value:0}:r)};
  assert.throws(()=>tableChart(bad,'lag'),/rate ratio at lag = 2 has a value at or below zero/);
});

test('the classic bars decline to draw an interval as a bar from zero',()=>{
  const chart=tableChart(exposure(stacked()),'lag');
  assert.match(chartMarkup(chart,s=>s),/drawn by the Vega-Lite renderer/);
});
