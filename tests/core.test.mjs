import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleWorkflow,validateWorkflow,executionPlan,executeWorkflow,NS} from '../build/core.js';

test('all outputs run and share one upstream inference',async()=>{
  const w=exampleWorkflow();let calls=0;
  const r=await executeWorkflow(w,async()=>{
    calls++;
    return w.nodes[0].params.data.features.map(f=>({subject:NS+'place:'+f.id,predicate:NS+'decision',object:NS+'Unknown'}));
  });
  assert.equal(calls,1);
  assert.deepEqual(r.outputs.map(o=>[o.nodeId,o.view]),[['map','map'],['table','table']]);
  assert.equal(r.outputs[0].rows.length,8);
  assert.equal(r.outputs[1].rows.length,8);
  assert.equal(r.trace.length,7);
  assert.equal(r.receipts.length,3);
});

test('legacy output defaults to map and missing outputs are rejected',()=>{
  const w=exampleWorkflow();w.nodes=w.nodes.filter(n=>n.id!=='table');w.edges=w.edges.filter(e=>e.to!=='table');w.outputId='map';w.nodes.at(-1).type='output';w.nodes.at(-1).params={};
  assert.equal(validateWorkflow(w).nodes.at(-1).type,'map_output');
  assert.equal(executionPlan(w).length,6);
  w.nodes=w.nodes.filter(n=>!['output','map_output','table_output'].includes(n.type));w.edges=w.edges.filter(e=>e.to!=='map');delete w.outputId;
  assert.throws(()=>executionPlan(w),/Add a visual output/);
});

test('each output requires connected dependencies and a supported display',()=>{
  const w=exampleWorkflow();w.edges=w.edges.filter(e=>e.to!=='table');
  assert.throws(()=>executionPlan(w),/decisions input connected/);
  w.nodes.at(-1).type='output';w.nodes.at(-1).params.view='chart';
  assert.throws(()=>validateWorkflow(w),/map, table/);
});
