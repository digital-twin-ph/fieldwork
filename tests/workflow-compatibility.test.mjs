import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateWorkflow,executionPlan} from '../build/core.js';

const baseline=JSON.parse(await readFile(new URL('./fixtures/coverage-workflow-2026-10-05.json',import.meta.url),'utf8'));

test('frozen workflow v1 retains geometry, typed attributes, value sets, exclusions and connections',()=>{
  const input=structuredClone(baseline),validated=validateWorkflow(input);
  assert.deepEqual(input,baseline,'Validation must not rewrite the imported document');
  assert.deepEqual(validated.edges,baseline.edges);
  for(const original of baseline.nodes){
    const restored=validated.nodes.find(n=>n.id===original.id);
    for(const [key,value] of Object.entries(original.params))assert.deepEqual(restored.params[key],value);
  }
  assert.equal(validated.nodes.find(n=>n.id==='scope').params.spatialReference.geometryCRS,'OGC:CRS84');
  assert.deepEqual(validateWorkflow(JSON.parse(JSON.stringify(validated))),validated);
  assert.deepEqual(executionPlan(validated).map(n=>n.id),['scope','measure','observations','second','coverage','map']);
});

for(const [name,mutate,error] of [
  ['a coverage result connected to a point socket',w=>{w.edges.find(e=>e.to==='map').port='points';},/Incompatible node connection/],
  ['duplicate incoming connectors',w=>{w.edges.push({...w.edges[0],id:'duplicate'});},/one connection/],
  ['a cycle through area operations',w=>{w.nodes.push({id:'cycle',type:'measure_area',x:0,y:0,params:{unit:'km2'}});w.edges.find(e=>e.to==='measure').from='cycle';w.edges.push({id:'cycle-link',from:'measure',to:'cycle',port:'area'});},/cycles/],
  ['an invalid typed attribute in a saved workflow',w=>{w.nodes.find(n=>n.id==='observations').params.data.features[0].properties.household_size='5';},/data type integer/],
])test(`saved workflow rejects ${name}`,()=>{
  const w=structuredClone(baseline);mutate(w);assert.throws(()=>validateWorkflow(w),error);
});
