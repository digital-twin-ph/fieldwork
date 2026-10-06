import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {summarizeChart,chartOutput,chartMarkup} from '../build/chart-output.js';
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
});
