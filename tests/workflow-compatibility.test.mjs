import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateWorkflow,executionPlan} from '../build/core.js';

const baseline=JSON.parse(await readFile(new URL('./fixtures/coverage-workflow-2026-10-05.json',import.meta.url),'utf8'));

// The fixture is a workflow saved on 2026-10-05 and never edited since. It holds a
// `coverage_check` with TWO point layers feeding a map's `coverage` port -- a shape that stopped
// existing on 2026-10-21, when the widget was retired. What the fixture is for has therefore
// changed rather than lapsed: it is now the evidence that a v1 file either migrates or is refused
// BY NAME, and that everything else about it survives the rewrite.
const singleLayer=()=>{
  const w=structuredClone(baseline);
  w.edges=w.edges.filter(e=>e.port!=='points_2');
  w.nodes=w.nodes.filter(n=>n.id!=='second');
  delete w.nodes.find(n=>n.id==='coverage').params.pointInputCount;
  return w;
};

test('frozen workflow v1 retains geometry, typed attributes, value sets and connections',()=>{
  const input=singleLayer(),frozen=structuredClone(input),validated=validateWorkflow(input);
  assert.deepEqual(input,frozen,'Validation must not rewrite the imported document');
  // The check becomes the clip that replaced it, and its edge into the map's retired `coverage`
  // port becomes an ordinary points edge. Everything else is untouched.
  const migrated=validated.nodes.find(n=>n.id==='coverage');
  assert.equal(migrated.type,'clip_points_to_area');
  assert.equal(migrated.sourceMigration.fromType,'coverage_check');
  assert.equal(validated.edges.find(e=>e.to==='map').port,'points');
  for(const original of frozen.nodes.filter(n=>n.id!=='coverage')){
    const restored=validated.nodes.find(n=>n.id===original.id);
    for(const [key,value] of Object.entries(original.params))assert.deepEqual(restored.params[key],value);
  }
  assert.equal(validated.nodes.find(n=>n.id==='scope').params.spatialReference.geometryCRS,'OGC:CRS84');
  assert.deepEqual(validateWorkflow(JSON.parse(JSON.stringify(validated))),validated);
  assert.deepEqual(executionPlan(validated).map(n=>n.id),['scope','measure','observations','coverage','map']);
});

test('a frozen coverage check holding several layers is refused by name, not silently thinned',()=>{
  // One clip takes one layer. Rewriting a two-layer check would have to invent a node, so the
  // loader says so and says what to do instead -- the alternative a retirement is allowed.
  assert.throws(()=>validateWorkflow(structuredClone(baseline)),
    /retired Check spatial coverage widget holding 2 point layers/);
  assert.throws(()=>validateWorkflow(structuredClone(baseline)),/Keep points inside the area/);
});

for(const [name,mutate,error] of [
  ['duplicate incoming connectors',w=>{w.edges.push({...w.edges[0],id:'duplicate'});},/one connection/],
  ['a cycle through area operations',w=>{w.nodes.push({id:'cycle',type:'measure_area',x:0,y:0,params:{unit:'km2'}});w.edges.find(e=>e.to==='measure').from='cycle';w.edges.push({id:'cycle-link',from:'measure',to:'cycle',port:'area'});},/cycles/],
  ['an invalid typed attribute in a saved workflow',w=>{w.nodes.find(n=>n.id==='observations').params.data.features[0].properties.household_size='5';},/data type integer/],
])test(`saved workflow rejects ${name}`,()=>{
  const w=singleLayer();mutate(w);assert.throws(()=>validateWorkflow(w),error);
});
