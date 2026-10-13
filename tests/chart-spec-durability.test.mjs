import test from 'node:test';
import assert from 'node:assert/strict';
import {compile} from 'vega-lite';
import {chartVegaSpec} from '../build/chart-vega.js';
import appPackage from '../package.json' with {type:'json'};

// What a receipt promises when it carries fw:rendererSpecification: that the chart can be drawn
// again from the receipt alone. Nothing read a stored specification back until this file, so the
// promise was untested.
//
// A correction to the concern that prompted it: the specification does NOT reference ontology terms
// or node types, so renaming a widget cannot rot it. It carries its own data inline and encodes its
// own field names. What CAN rot is the renderer version it was written for, and whether it stayed
// self-contained -- so those are what is checked.

const series={bins:[{key:'d1',label:'31 Aug',count:3,order:1},{key:'d2',label:'1 Sep',count:70,order:2},
  {key:'d3',label:'2 Sep',count:127,order:3}],caption:'Cases by day of date of death',field:'count',total:200};
const bands={bins:[{key:'b1',label:'1 min',count:5,order:1},{key:'b2',label:'5 min',count:40,order:5},
  {key:'b3',label:'10 min',count:90,order:10}],caption:'Deaths within each band',field:'count',total:135};

const configurations=[
  ['a case series',series,{renderer:'vega-lite',inputMode:'series'}],
  ['a series read sideways',series,{renderer:'vega-lite',inputMode:'series',orientation:'horizontal'}],
  ['categories with a legend',series,{renderer:'vega-lite',inputMode:'decisions',colorByCategory:true}],
  ['dots instead of bars',series,{renderer:'vega-lite',inputMode:'decisions',mark:'point'}],
  ['nested bands, differenced',bands,{renderer:'vega-lite',inputMode:'polygons',bandMeasure:'difference'}],
  ['a fully titled figure',series,{renderer:'vega-lite',inputMode:'series',chartTitle:'T',subtitle:'S',
    xAxisTitle:'X',yAxisTitle:'Y',sourceNote:'N'}],
];

const fieldsOf=spec=>{
  const found=new Set();
  const walk=node=>{
    if(Array.isArray(node))return node.forEach(walk);
    if(!node||typeof node!=='object')return;
    if(typeof node.field==='string')found.add(node.field);
    Object.values(node).forEach(walk);
  };
  walk(spec.encoding);
  return [...found];
};

for(const [name,chart,params] of configurations){
  test(`${name}: the stored specification carries its own data`, ()=>{
    const spec=chartVegaSpec(chart,params,{sourceId:'s',runId:'r'});
    // A receipt that points at a URL cannot be redrawn from the receipt, and cannot be redrawn at
    // all offline, which is the condition this application is built for.
    assert.ok(Array.isArray(spec.data?.values),'data must be inline values');
    assert.ok(!JSON.stringify(spec).includes('"url"'),'no external reference may appear anywhere in it');
    assert.ok(spec.data.values.length>0);
  });

  test(`${name}: every encoded field exists in the data it ships`, ()=>{
    const spec=chartVegaSpec(chart,params,{sourceId:'s',runId:'r'});
    // Fields a transform computes are produced by the specification itself, so they count as
    // present: `bandCount` is calculated in the spec and is not expected in the rows.
    const computed=new Set((spec.transform??[]).flatMap(step=>
      [...(step.calculate?[step.as]:[]),...(step.window?step.window.map(w=>w.as):[])]));
    const available=new Set([...Object.keys(spec.data.values[0]),...computed]);
    for(const field of fieldsOf(spec))
      assert.ok(available.has(field),`${field} is encoded but is neither in the data nor computed`);
  });

  test(`${name}: it still compiles with the bundled Vega-Lite`, ()=>{
    const spec=chartVegaSpec(chart,params,{sourceId:'s',runId:'r'});
    // The real durability risk. A stored specification was written against one compiler version and
    // is read back against whatever is installed, which is why the receipt records
    // fw:chartRendererVersion beside it.
    const {spec:vega}=compile(spec);
    assert.ok(vega.marks?.length,'it must compile to at least one Vega mark');
    assert.equal(vega.$schema?.includes('vega/v')||vega.$schema===undefined,true);
  });
}

test('the receipt records which renderer version wrote the specification', ()=>{
  // Without this, a specification that no longer compiles cannot be told from one that never did.
  assert.ok(appPackage.dependencies['vega-lite'],'vega-lite must be a pinned dependency');
  const spec=chartVegaSpec(series,{renderer:'vega-lite',inputMode:'series'},{sourceId:'s',runId:'r'});
  assert.equal(spec.$schema,'https://vega.github.io/schema/vega-lite/v6.json');
  assert.ok(appPackage.dependencies['vega-lite'].includes('6.'),
    'the pinned version and the schema the specification claims must be the same major');
});

test('a specification is refused rather than stored broken', ()=>{
  // The durability promise only holds for specifications that were valid when written.
  assert.throws(()=>chartVegaSpec(series,{renderer:'html',inputMode:'series'},{}),/not selected/);
  assert.throws(()=>chartVegaSpec({bins:[{key:'a',label:'A',count:-1}],caption:'c',field:'count'},
    {renderer:'vega-lite'},{}),/nonnegative/);
  assert.throws(()=>chartVegaSpec({bins:[{key:'a',label:'A',count:1},{key:'a',label:'B',count:2}],caption:'c',field:'count'},
    {renderer:'vega-lite'},{}),/unique stable keys/);
});
