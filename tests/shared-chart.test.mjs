import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store,DataFactory} from 'n3';
import {summarizeChart,chartOutput,chartMarkup} from '../build/chart-output.js';
import {chartVegaSpec} from '../build/chart-vega.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {exampleWorkflow,validateWorkflow,executionPlan,executeWorkflow,NS} from '../build/core.js';

test('legacy bars migrate idempotently with stable connections, settings and references',()=>{
  const w=exampleWorkflow();w.nodes.push({id:'chart',type:'output',x:100,y:200,params:{label:'Decisions',view:'bars'}});
  w.nodes.at(-1).references=[{id:'method',kind:'url',url:'https://example.org/method',title:'Count method',role:'method',authors:'',published:'',locator:'',notes:'',addedAt:'2026-10-06T00:00:00.000Z',modifiedAt:'2026-10-06T00:00:00.000Z'}];
  w.edges.push({id:'chart-edge',from:'criteria',to:'chart',port:'decisions'});w.outputId='chart';
  const before=structuredClone(w),normalized=validateWorkflow(w);
  assert.deepEqual(w,before);assert.deepEqual(normalized.edges,w.edges);assert.deepEqual(normalized.nodes.at(-1).references,w.nodes.at(-1).references);assert.equal(normalized.nodes.at(-1).type,'chart_output');
  assert.deepEqual(normalized.nodes.at(-1).params,{label:'Decisions'});assert.deepEqual(validateWorkflow(normalized),normalized);
  normalized.nodes.at(-1).params.label='';assert.throws(()=>validateWorkflow(normalized),/names must/);
  normalized.nodes.at(-1).params.label='Chart';normalized.edges.pop();assert.throws(()=>executionPlan(normalized),/Chart needs its decisions/);
});

test('categorical counts conserve rows, expose missing categories, preserve inputs and parse as RDF',()=>{
  for(const [kind,field,category] of [[undefined,'status','Review'],['access','zone','Over30'],['facility-evidence','tier','None']]){
    const input={kind,rows:[{id:'a',[field]:category},{id:'b',[field]:'unexpected'},{id:'c'}],centers:[],locationSource:{kind:'input-points'}};
    const before=structuredClone(input),result=chartOutput({id:'chart',type:'chart_output',params:{label:'Chart'}},input,'source','run');
    assert.deepEqual(input,before);assert.deepEqual(result.value.rows,input.rows);assert.notEqual(result.value.rows,input.rows);
    const chart=result.value.chart;assert.equal(chart.field,field);assert.equal(chart.total,3);assert.equal(chart.bins.reduce((n,b)=>n+b.count,0),3);
    assert.equal(chart.bins.find(b=>b.key==='Unclassified').count,2);assert.ok(chart.bins.some(b=>b.count===0));
    const quads=new Parser().parse(result.receipt.facts);
    assert.ok(quads.some(q=>q.predicate.value.endsWith('wasDerivedFrom')&&q.object.value==='urn:fieldwork:run:run:output:source'));
    assert.equal(quads.filter(q=>q.predicate.value==='urn:fieldwork:recordCount').reduce((n,q)=>n+Number(q.object.value),0),3);
    if(kind==='access')assert.match(chart.caption,/Input locations.*not population counts/);
  }
  const empty=summarizeChart({rows:[],centers:[]});assert.equal(empty.total,0);assert.ok(empty.bins.every(b=>b.count===0));
  assert.doesNotMatch(chartMarkup(empty,s=>s),/NaN|Infinity/);
  assert.throws(()=>summarizeChart({kind:'point-table',rows:[],centers:[]}),/supported reasoning/);
});

test('shared charts execute alongside maps with one inference and auditable counts',async()=>{
  const w=exampleWorkflow();w.nodes.push({id:'chart',type:'chart_output',x:100,y:200,params:{label:'Decisions'}});
  w.nodes.at(-1).references=[{id:'method',kind:'url',url:'https://example.org/method',title:'Count method',role:'method',authors:'',published:'',locator:'',notes:'',addedAt:'2026-10-06T00:00:00.000Z',modifiedAt:'2026-10-06T00:00:00.000Z'}];
  w.edges.push({id:'chart-edge',from:'criteria',to:'chart',port:'decisions'});let calls=0;
  const result=await executeWorkflow(w,async()=>{calls++;return w.nodes[0].params.data.features.map(f=>({subject:NS+'place:'+f.id,predicate:NS+'decision',object:NS+'Unknown'}));});
  assert.equal(calls,1);assert.deepEqual(result.evidence.find(e=>e.nodeId==='chart').references,w.nodes.at(-1).references);const chart=result.outputs.find(o=>o.nodeId==='chart');assert.equal(chart.view,'bars');
  assert.deepEqual(chart.rows,result.outputs[0].rows);assert.equal(chart.chart.total,chart.rows.length);
  assert.equal(chart.chart.bins.find(b=>b.key==='Unknown').count,chart.rows.length);
  assert.equal(result.receipts.find(r=>r.nodeId==='chart').kind,'computation');
  assert.match(result.receipts.find(r=>r.nodeId==='chart').facts,/chart-spec:chart> dcterms:references <urn:fieldwork:run:.*:reference:chart:method>/);
});

test('bounded Vega-Lite enhancement preserves source counts and validates its semantic contract',async()=>{
  const node={id:'chart',type:'chart_output',params:{label:'Decision counts',renderer:'vega-lite',mark:'point',orientation:'vertical',chartTitle:'Screening decisions',subtitle:'Demonstration records',xAxisTitle:'Decision class',yAxisTitle:'Records',sourceNote:'Synthetic fixture',colorByCategory:true}};
  const input={rows:[{id:'a',status:'Review'},{id:'b',status:'Unknown'}],centers:[]};
  const shown=chartOutput(node,input,'criteria','run');
  const spec=chartVegaSpec(shown.value.chart,node.params);
  assert.equal(spec.mark.type,'point');assert.equal(spec.encoding.x.field,'displayLabel');assert.equal(spec.encoding.y.field,'count');
  assert.equal(spec.title.text,'Screening decisions');assert.deepEqual(spec.title.subtitle,['Demonstration records','Synthetic fixture']);
  assert.equal(spec.encoding.x.title,'Decision class');assert.equal(spec.encoding.y.title,'Records');
  assert.equal(spec.encoding.color.legend.title,'Category');
  assert.equal(spec.data.values.reduce((sum,row)=>sum+row.count,0),2);
  assert.ok(!('transform' in spec));assert.ok(!('url' in spec.data));
  const duplicateLabels=chartVegaSpec({...shown.value.chart,bins:[{key:'a',label:'Site',count:1},{key:'b',label:'Site',count:1}]},node.params);
  assert.deepEqual(duplicateLabels.data.values.map(b=>b.displayLabel),['Site (a)','Site (b)']);
  const graph=new Store(new Parser().parse(shown.receipt.facts));
  assert.equal((await validateGraph(graph)).conforms,true);
  assert.equal([...graph.match(null,DataFactory.namedNode('urn:fieldwork:chartUnitStatus'),null)][0].object.value,'records');
  assert.equal([...graph.match(null,DataFactory.namedNode('urn:fieldwork:chartLegend'),null)][0].object.value,'true');
  assert.deepEqual(JSON.parse([...graph.match(null,DataFactory.namedNode('urn:fieldwork:rendererSpecification'),null)][0].object.value),chartVegaSpec(shown.value.chart,node.params,{sourceId:'criteria',runId:'run'}));
  assert.match([...graph.match(null,DataFactory.namedNode('urn:fieldwork:chartRendererVersion'),null)][0].object.value,/vega-lite@6[.]/);
  const activity=DataFactory.namedNode('urn:fieldwork:run:run:view:chart'),binding=DataFactory.namedNode('urn:fieldwork:chartSpecification'),specIri=DataFactory.namedNode('urn:fieldwork:run:run:chart-spec:chart');
  graph.removeQuad(activity,binding,specIri);assert.equal((await validateGraph(graph)).conforms,false);
  graph.addQuad(activity,binding,specIri);
  const n=DataFactory.namedNode,l=DataFactory.literal,subject=n('urn:fieldwork:run:run:chart-spec:chart'),predicate=n('urn:fieldwork:chartRenderer');
  graph.removeQuad(subject,predicate,l('vega-lite'));graph.addQuad(subject,predicate,l('arbitrary'));
  assert.equal((await validateGraph(graph)).conforms,false);
  assert.throws(()=>chartVegaSpec({...shown.value.chart,bins:[{key:'bad',label:'Bad',count:-1}]},node.params),/nonnegative/);
  const invalid=structuredClone(node);invalid.params.mark='arc';assert.throws(()=>validateWorkflow({schema:'fieldwork/workflow/1',name:'Invalid',nodes:[{...invalid,x:0,y:0}],edges:[]}),/supported chart/);
});
