import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleWorkflow,validateWorkflow,executionPlan,executeWorkflow,NS,IncompleteWorkflow} from '../build/core.js';

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
  // 6 since 2026-10-25, when the `alert` node left this example: the condition it carried is
  // declared on the node that applies the ruleset, so there is one fewer step and no step lost.
  assert.equal(r.trace.length,6);
  assert.equal(r.receipts.length,3);
});

test('legacy output defaults to map and missing outputs are rejected',()=>{
  const w=exampleWorkflow();w.nodes=w.nodes.filter(n=>n.id!=='table');w.edges=w.edges.filter(e=>e.to!=='table');w.outputId='map';w.nodes.at(-1).type='output';w.nodes.at(-1).params={};
  assert.equal(validateWorkflow(w).nodes.at(-1).type,'map_output');
  // 5 since 2026-10-25: one node fewer in the example, the alert having become a declaration.
  assert.equal(executionPlan(w).length,5);
  w.nodes=w.nodes.filter(n=>!['output','map_output','table_output'].includes(n.type));w.edges=w.edges.filter(e=>e.to!=='map');delete w.outputId;
  // The refusal NAMES what is on the canvas, because the message it replaced told a workflow
  // that already had a study area to start with one.
  assert.throws(()=>executionPlan(w),/Nothing here displays a result/);
  assert.throws(()=>executionPlan(w),/Add a Map, Table or Chart output/);
  // And it is INCOMPLETE, not broken. The practitioner, 2026-10-20: "The lack of an output is not
  // an error, it's an incomplete workflow." The interface reads the type rather than inferring a
  // tone from the fact that something was thrown.
  assert.throws(()=>executionPlan(w),error=>error instanceof IncompleteWorkflow);
  assert.throws(()=>executionPlan({...w,nodes:[],edges:[]}),error=>error instanceof IncompleteWorkflow);
});

test('each output requires connected dependencies and a supported display',()=>{
  const w=exampleWorkflow();w.edges=w.edges.filter(e=>e.to!=='table');
  assert.throws(()=>executionPlan(w),/decisions input connected/);
  w.nodes.at(-1).type='output';w.nodes.at(-1).params.view='chart';
  assert.throws(()=>validateWorkflow(w),/map, table/);
});
