import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {exampleWorkflow,validateWorkflow,executionPlan,executeWorkflow,nodeInputs,NS} from '../build/core.js';

test('legacy map/table outputs normalize idempotently and retain the reasoning dependency',()=>{
  const legacy=exampleWorkflow();for(const node of legacy.nodes.filter(n=>['map_output','table_output'].includes(n.type))){const view=node.type==='map_output'?'map':'table';node.type='output';node.params={label:node.params.label,view};}
  legacy.outputId='map';const before=structuredClone(legacy),w=validateWorkflow(legacy);
  assert.deepEqual(legacy,before);assert.deepEqual(w.edges,legacy.edges);
  assert.equal(w.nodes.find(n=>n.id==='map').type,'map_output');assert.equal(w.nodes.find(n=>n.id==='table').type,'table_output');
  assert.deepEqual(nodeInputs(w.nodes.find(n=>n.id==='map')),[['decisions','decisions']]);
  assert.deepEqual(validateWorkflow(w),w);
  w.edges.push({id:'mixed',from:'neighborhoods',to:'map',port:'points'});
  assert.throws(()=>validateWorkflow(w),/Incompatible/);
  w.edges=w.edges.filter(e=>e.to!=='map');assert.throws(()=>executionPlan(w),/decisions input connected/);
});

test('shared result views copy decisions without inference or mutation and record source provenance',async()=>{
  let calls=0;const w=exampleWorkflow();const result=await executeWorkflow(w,async()=>{calls++;return w.nodes[0].params.data.features.map(f=>({subject:NS+'place:'+f.id,predicate:NS+'decision',object:NS+'Unknown'}));});
  assert.equal(calls,1);assert.deepEqual(result.outputs[0].rows,result.outputs[1].rows);
  result.outputs[0].rows[0].name='Changed view';assert.notEqual(result.outputs[1].rows[0].name,'Changed view');
  const views=result.receipts.filter(r=>r.kind==='presentation');assert.equal(views.length,2);
  for(const receipt of views){assert.equal(receipt.rules,'');assert.deepEqual(receipt.conclusions,[]);const quads=new Parser().parse(receipt.facts);assert.ok(quads.some(q=>q.predicate.value==='http://www.w3.org/ns/prov#wasDerivedFrom'&&q.object.value.endsWith(':output:criteria')));}
});
