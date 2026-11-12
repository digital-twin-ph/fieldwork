import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkflow,executionPlan,executeWorkflow,NS,IncompleteWorkflow} from '../build/core.js';
// The heat example retired on 2026-11-11; these run on a synthetic fixture of the same shape (tests/fixtures).
import {exampleWorkflow,stubReasoner} from './fixtures/synthetic-workflow.mjs';

test('all outputs run and share one upstream inference',async()=>{
  const w=exampleWorkflow(),reason=stubReasoner('urn:fieldwork:Unknown');
  const r=await executeWorkflow(validateWorkflow(w),reason);
  // Two calls: the study area's own check, and the rules, which the map and the table share rather than each running.
  assert.equal(reason.calls,2);
  assert.deepEqual(r.outputs.map(o=>[o.nodeId,o.view]),[['map','map'],['table','table']]);
  assert.equal(r.outputs[0].rows.length,8);
  assert.equal(r.outputs[1].rows.length,8);
  assert.equal(r.trace.length,5);
  assert.equal(r.receipts.length,4);
});

test('legacy output defaults to map and missing outputs are rejected',()=>{
  const w=exampleWorkflow();w.nodes=w.nodes.filter(n=>n.id!=='table');w.edges=w.edges.filter(e=>e.to!=='table');w.outputId='map';w.nodes.at(-1).type='output';w.nodes.at(-1).params={};
  assert.equal(validateWorkflow(w).nodes.at(-1).type,'map_output');
  assert.equal(executionPlan(w).length,4);
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
  // A table with its input removed is unfinished rather than failed: it shows what it is given,
  // and it is given nothing. It used to throw "needs its decisions input connected", which was
  // the mode talking -- the port existed only because inputMode said decisions.
  assert.doesNotThrow(()=>executionPlan(w));
  w.nodes.at(-1).type='output';w.nodes.at(-1).params.view='chart';
  assert.throws(()=>validateWorkflow(w),/map, table/);
});
