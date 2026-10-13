import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {johnSnowExample} from '../build/john-snow.js';
import {chartOutput} from '../build/chart-output.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {syncProjectManifest} from '../build/project-manifest.js';

const ready=async()=>[{subject:'urn:fieldwork:area:study',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];
const run=async workflow=>{syncProjectManifest(workflow);
  return executeWorkflow(validateWorkflow(JSON.parse(JSON.stringify(workflow))),ready);};
const literal=(facts,predicate)=>{
  const quads=new Parser().parse(facts);
  return quads.filter(q=>q.predicate.value===`urn:fieldwork:${predicate}`).map(q=>q.object.value);
};

// What a chart's receipt has to carry for the figure to be reproducible from it. Until Vega-Lite
// became the default on 2026-10-13, a chart drawn on the default renderer recorded that a chart
// existed without recording what it drew: fw:rendererSpecification is written only for a Vega-Lite
// chart, and the default was the classic bars. These checks are the reason that default changed.

const cases=[
  ['a case series',()=>johnSnowExample('snow-epidemic-curve'),'epidemic'],
  ['polygon summaries',()=>johnSnowExample('snow-voronoi'),'chart'],
  // The reasoning-decisions path is exercised directly below instead of through a full run: Old
  // Naledi needs the real EYE reasoner, and a stub cannot produce the evidence assertions it
  // classifies on.
];

for(const [name,build,nodeId] of cases){
  test(`${name}: the receipt records what was drawn, not only that something was`, async()=>{
    const result=await run(build());
    const receipt=result.receipts.find(r=>r.nodeId===nodeId);
    assert.ok(receipt,`${nodeId} produced no receipt at all`);
    const specs=literal(receipt.facts,'rendererSpecification');
    assert.equal(specs.length,1,'exactly one renderer specification');
    const spec=JSON.parse(specs[0]);
    // It must be the figure, not a stub: its own data, its own encoding, and the design it used.
    assert.ok(Array.isArray(spec.data?.values)&&spec.data.values.length>0);
    assert.ok(spec.encoding?.x&&spec.encoding?.y);
    assert.ok(spec.config?.font,'the typography travels with it, or the figure is not reproducible');
    assert.equal(spec.config.axis.domain,false,'and so does the design decision');
    assert.deepEqual(literal(receipt.facts,'chartRenderer'),['vega-lite'],'the default renderer is recorded as such');
  });

  test(`${name}: the receipt carries the words a reader sees`, async()=>{
    const result=await run(build());
    const receipt=result.receipts.find(r=>r.nodeId===nodeId);
    const quads=new Parser().parse(receipt.facts);
    const title=quads.find(q=>q.predicate.value==='http://purl.org/dc/terms/title');
    assert.ok(title?.object.value.trim(),'a title');
    assert.equal(literal(receipt.facts,'chartSourceNote').length,1,'a source note');
    // The measure and its unit status, so a count cannot be read as a rate.
    assert.equal(literal(receipt.facts,'chartMeasureKind').length,1);
    assert.equal(literal(receipt.facts,'chartUnitStatus').length,1);
    assert.equal(literal(receipt.facts,'chartOrientation')[0],'vertical','the resolved orientation, not the unset parameter');
  });
}

test('a chart on the classic bars still produces a receipt, and says the specification is absent', async()=>{
  // The classic renderer remains selectable, and its receipt must not pretend to carry a figure.
  const workflow=johnSnowExample('snow-epidemic-curve');
  workflow.nodes.find(n=>n.id==='epidemic').params.renderer='html';
  const result=await run(workflow);
  const receipt=result.receipts.find(r=>r.nodeId==='epidemic');
  assert.ok(receipt.facts.includes('fw:ChartSpecification'),'the specification node is still recorded');
  assert.equal(literal(receipt.facts,'rendererSpecification').length,0,
    'and carries no rendering, because the classic bars have none to give');
  assert.deepEqual(literal(receipt.facts,'chartRenderer'),['html']);
});

test('a decisions chart records its figure too, by the same path', ()=>{
  // `kind: undefined` is the decision-table shape; the status values are the vocabulary
  // summarizeChart bins on.
  const input={centers:[],rows:[
    {id:'a',name:'A',status:'Review'},{id:'b',name:'B',status:'NoFlag'},{id:'c',name:'C',status:'Review'}]};
  const node={id:'decision-chart',type:'chart_output',x:0,y:0,params:{label:'Decision counts'}};
  const {receipt}=chartOutput(node,input,'criteria','run-1');
  const specs=literal(receipt.facts,'rendererSpecification');
  assert.equal(specs.length,1,'the default renderer records what it drew');
  const spec=JSON.parse(specs[0]);
  assert.ok(spec.config?.font);
  assert.deepEqual(literal(receipt.facts,'chartRenderer'),['vega-lite']);
  assert.equal(literal(receipt.facts,'chartOrientation')[0],'vertical');
  assert.ok(receipt.facts.includes('fw:CategoricalCount'),'and still records the count itself');
});
