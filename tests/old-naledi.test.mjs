import test from 'node:test';
import assert from 'node:assert/strict';
import {inBoundary,sampleLocations,oldNalediWorkflow,DATASET} from '../build/old-naledi.js';
import {boundary,facilities} from '../examples/old-naledi/data.js';
import {validateWorkflow,executionPlan} from '../build/core.js';

test('sample grid is bounded by the real polygon and is reproducible',()=>{
  const points=sampleLocations(boundary,250);
  assert.equal(points.length,21);
  assert.ok(points.every(p=>inBoundary(p.coordinates)));
  assert.deepEqual(points,sampleLocations(boundary,250));
  assert.ok(sampleLocations(boundary,150).length>points.length);
  assert.ok(!inBoundary([0,0]));
  const polygon={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]};
  assert.ok(inBoundary([2,2],polygon));assert.ok(!inBoundary([5,5],polygon));
});

test('dataset retains source attributes without patient data or disease aggregates',()=>{
  assert.equal(facilities.length,214);
  assert.equal(new Set(facilities.map(f=>f.id)).size,214);
  const clinic=facilities.find(f=>f.name==='Old Naledi Clinic');
  assert.equal(clinic.owner,'GOVERNMENT');assert.equal(clinic.serviceType,'Clinic with Maternity');
  assert.deepEqual(Object.keys(clinic).sort(),['coordinates','id','name','owner','serviceType']);
});

test('workflow supports four outputs, shared inference, and pinned dataset validation',()=>{
  const w=oldNalediWorkflow(),plan=executionPlan(w);
  assert.equal(plan.filter(n=>['output','map_output','table_output','chart_output'].includes(n.type)).length,4);
  assert.equal(plan.filter(n=>n.type==='xpert').length,1);
  assert.equal(w.nodes.find(n=>n.type==='area').params.dataset,DATASET);
  w.nodes.find(n=>n.type==='access').params.speedMPerMin=0;
  assert.throws(()=>validateWorkflow(w),/speedMPerMin/);
  w.nodes.find(n=>n.type==='access').params.speedMPerMin=70;
  w.nodes.find(n=>n.type==='area').params.dataset='unknown';assert.throws(()=>validateWorkflow(w),/dataset version/);
});
