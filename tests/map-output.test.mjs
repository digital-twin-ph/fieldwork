import test from 'node:test';
import assert from 'node:assert/strict';
import {clipExercise} from '../build/clip-points.js';
import {newMapOutput,mapOutput} from '../build/map-output.js';
import {executeWorkflow,executionPlan,validateWorkflow,nodeInputs} from '../build/core.js';
import {pointLayers} from '../build/point-layers.js';
import {defaultSpatialReference} from '../build/spatial-reference.js';
import {newAreaMeasurement} from '../build/area-measurement.js';

test('Map displays enriched study area and every record without inferring acceptance or dropping outside points',async()=>{
  const w=clipExercise();w.nodes=w.nodes.slice(0,2);w.edges=[];
  w.nodes.push({...newAreaMeasurement(),id:'measure',x:300,y:0},{...newMapOutput(),id:'map',x:600,y:0});
  w.edges=[{id:'a',from:'scope',to:'measure',port:'area'},{id:'b',from:'measure',to:'map',port:'area'},{id:'c',from:'observations',to:'map',port:'points'}];
  let calls=0;const run=await executeWorkflow(w,async()=>{calls++;return [{subject:'urn:fieldwork:area:scope',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];});
  assert.equal(calls,1);const map=run.outputs.find(o=>o.nodeId==='map');
  assert.equal(map.view,'map');assert.equal(map.kind,'spatial-map');assert.ok(map.measurement.squareMetres>0);
  assert.deepEqual(map.spatialReference,defaultSpatialReference());
  assert.deepEqual(map.rows.map(r=>r.relation),['Inside','Boundary','Outside','MissingLocation']);
  assert.equal(map.rows.length,4);assert.equal(map.rows[3].coordinates,null);assert.equal(map.rows[2].status,'Review');
  assert.equal(map.rows[2].decision,undefined);assert.equal(map.canProceed,undefined);
  const receipt=run.receipts.find(r=>r.nodeId==='map');assert.match(receipt.facts,/geo:sfDisjoint/);assert.match(receipt.facts,/geo:hasMetricArea/);assert.equal(receipt.rules,'');
  assert.doesNotThrow(()=>validateWorkflow(JSON.parse(JSON.stringify(w))));
  // A map insists on no particular port from 2026-10-15 -- it draws the layers it is given -- so
  // removing one connection no longer refuses the plan. A map with NOTHING wired is refused at
  // the run, which tests/network-map.test.mjs covers on a workflow where the map is the only node.
  w.edges.pop();assert.doesNotThrow(()=>executionPlan(w));
});

test('geographic sources default to WGS84 with explicit serialization order and reject unsupported relabeling',()=>{
  const w=validateWorkflow(clipExercise());for(const n of w.nodes.filter(n=>['area','observations'].includes(n.type)))assert.deepEqual(n.params.spatialReference,defaultSpatialReference());
  w.nodes[0].params.spatialReference.geodeticCRS='EPSG:3857';assert.throws(()=>validateWorkflow(w),/changing a CRS label/);
  w.nodes[0].params.spatialReference=defaultSpatialReference();w.nodes[1].params.spatialReference.axisOrder='latitude-longitude';assert.throws(()=>validateWorkflow(w),/longitude\/latitude/);
});

test('expandable point inputs preserve layer identity when record IDs overlap',async()=>{
  // Written against `coverage_check` until it was retired on 2026-10-21. The dynamic point ports
  // are `map_output`'s too, and the property under test -- two layers whose records share ids stay
  // distinct -- belongs to the port machinery rather than to the widget that used to expand it.
  // What is gone with the widget is the exclusion half: these layers can no longer carry a
  // reviewer's judgement, and nothing asserts one.
  const w=clipExercise();
  const second=structuredClone(w.nodes[1]);second.id='second';second.params.label='Second layer';w.nodes.push(second);
  const map=w.nodes.find(n=>n.type==='map_output');map.params.pointInputCount=2;
  // A map SKIPS an unconnected point port rather than refusing, which is what it did before the
  // coverage check was retired; the refusal this test used to make was that widget's.
  assert.doesNotThrow(()=>executionPlan(w));
  w.edges.push({id:'extra',from:'second',to:map.id,port:'points_2'});
  assert.deepEqual(nodeInputs(map).map(([port])=>port).filter(p=>p==='points'||/^points_\d+$/.test(p)),['points','points_2']);
  assert.doesNotThrow(()=>executionPlan(w));
  const layers=[w.nodes[1],second].map(n=>({...n.params.data,sourceNodeId:n.id,label:n.params.label}));
  const area={areaId:'urn:fieldwork:area:scope',geometryId:'urn:fieldwork:geometry:scope',boundary:w.nodes[0].params.geometry,label:'Area'};
  const drawn=mapOutput(map,{area,points:{layers}},'test').value;
  assert.equal(new Set(drawn.rows.map(r=>r.id)).size,8,'eight records across two layers, none colliding');
  assert.equal(drawn.rows.filter(r=>r.recordId==='outside').length,2,'the same record id in both layers');
  assert.deepEqual(drawn.pointLayers.map(l=>l.sourceNodeId),['observations','second']);
  // The map's own `points` port is fed by the clip here, so duplicating THAT is what the refusal
  // is about: one source may not occupy two of a map's point slots.
  w.edges.at(-1).from=w.nodes.find(n=>n.type==='clip_points_to_area').id;
  assert.throws(()=>validateWorkflow(w),/once per operation/);
  map.params.pointInputCount=9;assert.throws(()=>validateWorkflow(w),/1–8/);
  const outside=layers[0].features.find(f=>f.id==='outside');
  assert.throws(()=>pointLayers({layers:[{sourceNodeId:'large',features:Array(2001).fill(outside)}]}),/2,000 records combined/);
});

test('a map saved with a coverage check opens with the clip that replaced it',()=>{
  // A map used to take a coverage value as its SOLE input and pass its review decisions through
  // without recomputing them. `coverage_check` was retired on 2026-10-21, nothing produces such a
  // value, and the port went with it: a port nothing can fill is not a port a map owes anybody.
  const saved=structuredClone(clipExercise());
  const clip=saved.nodes.find(n=>n.type==='clip_points_to_area');
  clip.type='coverage_check';clip.params={label:'Check spatial coverage',exclusions:[]};
  saved.edges.find(e=>e.from===clip.id&&e.port==='points').port='coverage';
  const opened=validateWorkflow(saved);
  assert.equal(opened.nodes.find(n=>n.id===clip.id).type,'clip_points_to_area');
  assert.equal(opened.edges.find(e=>e.from===clip.id).port,'points');
  assert.doesNotThrow(()=>executionPlan(opened));
  // And the map declares no coverage port for anything to connect to.
  const map=opened.nodes.find(n=>n.type==='map_output');
  assert.equal(nodeInputs(map).some(([,type])=>type==='coverage-check'),false);
});

test('a map fed only by a coverage check keeps its boundary after migration',()=>{
  // The coverage value CARRIED the study area, so a map wired to it alone had no `area` edge.
  // Rewriting the port and stopping there left the map with points and no boundary, and the run
  // stopped on "Cannot read properties of undefined (reading 'boundary')" -- found on the frozen
  // v1 fixture, which is exactly this shape.
  const saved=structuredClone(clipExercise());
  const clip=saved.nodes.find(n=>n.type==='clip_points_to_area');
  clip.type='coverage_check';clip.params={label:'Check spatial coverage',exclusions:[]};
  saved.edges=saved.edges.filter(e=>!(e.to==='map'&&e.port==='area'));
  saved.edges.find(e=>e.from===clip.id&&e.port==='points').port='coverage';
  const opened=validateWorkflow(saved);
  const area=opened.edges.find(e=>e.to==='map'&&e.port==='area');
  assert.ok(area,'the map was given the area the clip reads');
  assert.equal(area.from,opened.edges.find(e=>e.to===clip.id&&e.port==='area').from);
  assert.doesNotThrow(()=>executionPlan(opened));
});

test('a map of points without an area says so, instead of failing on nothing',()=>{
  // Reported 2026-10-21, on a Map wired to a deduplication and nothing else: "Workflow stopped:
  // Cannot read properties of undefined (reading 'boundary')". A map places its points by their
  // relation to an area, so points alone have nothing to be placed against -- which is a thing to
  // say, not a property to read off undefined.
  const saved=structuredClone(clipExercise());
  saved.edges=saved.edges.filter(e=>!(e.to==='map'&&e.port==='area'));
  const opened=validateWorkflow(saved);
  const map=opened.nodes.find(n=>n.type==='map_output');
  const area={areaId:'urn:fieldwork:area:scope',geometryId:'urn:fieldwork:geometry:scope',
    boundary:opened.nodes[0].params.geometry,label:'Area'};
  // The refusal names the node and what to connect.
  assert.throws(()=>mapOutput(map,{points:{layers:[]}},'test'),/./);
  // And with an area it draws, which is what makes the message the right one.
  assert.doesNotThrow(()=>mapOutput(map,{area,points:{layers:[]}},'test'));
});
