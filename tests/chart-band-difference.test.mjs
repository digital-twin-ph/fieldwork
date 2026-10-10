import test from 'node:test';
import assert from 'node:assert/strict';
import {chartVegaSpec} from '../build/chart-vega.js';

const params=p=>({label:'Chart',renderer:'vega-lite',orientation:'vertical',...p});
// The Soho counts: nested bands, so the raw counts are cumulative.
const bands=[{key:'c15',label:'within 15 min',count:250,order:15},
  {key:'c10',label:'within 10 min',count:250,order:10},
  {key:'c5',label:'within 5 min',count:216,order:5},
  {key:'c1',label:'within 1 min',count:48,order:1}];
const chart=(bins=bands)=>({field:'count',
  caption:'Cumulative thresholds (not time bands). Location memberships by catchment',
  total:250,bins});

/** Compiles the spec and runs it in Vega, returning the transformed rows. The point of a
 *  declarative transform is that Vega-Lite computes it, so the test makes Vega-Lite do so
 *  rather than reading the spec and trusting it. */
async function render(spec){
  const vl=await import('vega-lite'),vega=await import('vega');
  const compiled=vl.compile(spec);
  const view=new vega.View(vega.parse(compiled.spec),{renderer:'none'});
  await view.runAsync();
  const rows=compiled.spec.data.map(d=>view.data(d.name))
    .find(r=>r?.length&&r[0].bandCount!==undefined);
  view.finalize();
  return rows;
}

test('Vega-Lite computes the difference between neighbouring bands',async()=>{
  // NB04 cell 19 walks outward subtracting prev_count. This is that, declared.
  const rows=await render(chartVegaSpec(chart(),params({bandMeasure:'difference'}),{}));
  assert.deepEqual(rows.map(r=>[r.order,r.count,r.bandCount]),
    [[1,48,48],[5,216,168],[10,250,34],[15,250,0]]);
});

test('the innermost band keeps its own count, having nothing inside it',async()=>{
  const rows=await render(chartVegaSpec(chart(bands.filter(b=>b.order<=5)),
    params({bandMeasure:'difference'}),{}));
  assert.equal(rows.find(r=>r.order===1).bandCount,48,'no inner neighbour to subtract');
  assert.equal(rows.find(r=>r.order===5).bandCount,168);
});

test('the transform travels in the specification, not in the application',()=>{
  const spec=chartVegaSpec(chart(),params({bandMeasure:'difference'}),{});
  assert.deepEqual(spec.transform,[
    {window:[{op:'lag',field:'count',as:'innerCount'}],sort:[{field:'order',order:'ascending'}]},
    {calculate:'datum.count - (datum.innerCount == null ? 0 : datum.innerCount)',as:'bandCount'}]);
  assert.equal(spec.data.values.map(v=>v.order).join(','),'1,5,10,15','innermost first');
});

test('the axis, caption and tooltip all say it is a difference',()=>{
  const spec=chartVegaSpec(chart(),params({bandMeasure:'difference'}),{});
  assert.equal(spec.encoding.y.title,'Records in this band alone');
  assert.equal(spec.encoding.y.field,'bandCount');
  assert.match(spec.description,/difference between neighbouring bands, computed in the specification/);
  assert.deepEqual(spec.encoding.tooltip.map(t=>t.title),
    ['Category','Records in this band alone','Cumulative to this band'],
    'the cumulative count stays visible beside the difference');
});

test('cumulative stays the default, and is untouched',()=>{
  const spec=chartVegaSpec(chart(),params(),{});
  assert.equal(spec.transform,undefined,'no transform unless asked for');
  assert.equal(spec.encoding.y.field,'count');
  assert.equal(spec.encoding.y.title,'Recorded count');
  assert.equal(spec.data.values.map(v=>v.order).join(','),'15,10,5,1','the given order is kept');
});

test('bins that are not nested bands are refused',()=>{
  const unordered=[{key:'a',label:'A',count:3},{key:'b',label:'B',count:4}];
  assert.throws(()=>chartVegaSpec(chart(unordered),params({bandMeasure:'difference'}),{}),
    /needs every bin to carry a travel time\. These bins are not nested bands\./);
  const tied=[{key:'a',label:'A',count:3,order:5},{key:'b',label:'B',count:4,order:5}];
  assert.throws(()=>chartVegaSpec(chart(tied),params({bandMeasure:'difference'}),{}),
    /share a travel time, so there is no order to take differences along/);
});

test('a set that is not actually nested is refused, rather than drawn negative',()=>{
  // An outer band holding fewer records than the band inside it cannot be nested, and the
  // difference would be negative. Proved from the counts rather than assumed from the type.
  const notNested=[{key:'in',label:'within 1 min',count:50,order:1},
    {key:'out',label:'within 5 min',count:20,order:5}];
  assert.throws(()=>chartVegaSpec(chart(notNested),params({bandMeasure:'difference'}),{}),
    /These bands are not nested: within 5 min holds fewer records \(20\) than within 1 min \(50\), so differences between them would be negative\./);
});
