import test from 'node:test';
import assert from 'node:assert/strict';
import {exampleWorkflow,validateWorkflow,nearestPlaces,makeN3} from '../build/core.js';

test('heat sources share Input data and legacy normalization preserves identity, attributes and connections',()=>{
  const current=exampleWorkflow();
  assert.deepEqual(current.nodes.slice(0,2).map(n=>n.type),['observations','observations']);
  const legacy=structuredClone(current);
  legacy.nodes[0].type='places';legacy.nodes[1].type='centers';
  legacy.nodes[0].params.data.features[0].properties.population=123;
  legacy.nodes[1].params.data.features[0].properties.open=true;
  const original=structuredClone(legacy), normalized=validateWorkflow(legacy);
  assert.deepEqual(legacy,original,'validation must not mutate the caller');
  assert.deepEqual(normalized.edges,legacy.edges);
  for(let i=0;i<2;i++){
    assert.equal(normalized.nodes[i].id,legacy.nodes[i].id);
    assert.equal(normalized.nodes[i].params.label,legacy.nodes[i].params.label);
    assert.deepEqual(normalized.nodes[i].params.data,legacy.nodes[i].params.data);
    assert.deepEqual(normalized.nodes[i].sourceMigration,{fromType:legacy.nodes[i].type,version:'1'});
  }
  assert.deepEqual(validateWorkflow(normalized),normalized,'migration must be idempotent');
  const rows=nearestPlaces(normalized.nodes[0].params.data,normalized.nodes[1].params.data);
  const before=nearestPlaces(original.nodes[0].params.data,original.nodes[1].params.data);
  assert.deepEqual(rows,before);
  assert.deepEqual(makeN3(rows,{active:true,date:'2026-07-15'},5),makeN3(before,{active:true,date:'2026-07-15'},5));
  assert.equal(rows.length,8);assert.equal(rows.filter(r=>r.distanceKm>5).length,5);
  assert.equal(rows.at(-1).distanceKm,null);
});

test('legacy sources use shared scalar and coordinate validation without silently losing unsupported data',()=>{
  const legacy=exampleWorkflow();legacy.nodes[0].type='places';
  legacy.nodes[0].params.data.features[0].properties.unsupported={nested:true};
  assert.throws(()=>validateWorkflow(legacy));
  delete legacy.nodes[0].params.data.features[0].properties.unsupported;
  legacy.nodes[0].params.data.features[0].geometry.coordinates=[999,10];
  assert.throws(()=>validateWorkflow(legacy),/coordinates/);
});
