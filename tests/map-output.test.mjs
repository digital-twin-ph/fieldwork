import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageExercise,coverageFacts,checkCoverage,featureSignature} from '../build/spatial-coverage.js';
import {newMapOutput,mapOutput} from '../build/map-output.js';
import {executeWorkflow,executionPlan,validateWorkflow,nodeInputs} from '../build/core.js';
import {pointLayers} from '../build/point-layers.js';
import {defaultSpatialReference} from '../build/spatial-reference.js';
import {newAreaMeasurement} from '../build/area-measurement.js';

test('Map displays enriched study area and every record without inferring acceptance or dropping outside points',async()=>{
  const w=coverageExercise();w.nodes=w.nodes.slice(0,2);w.edges=[];
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
  w.edges.pop();assert.throws(()=>executionPlan(w),/points input connected/);
});

test('geographic sources default to WGS84 with explicit serialization order and reject unsupported relabeling',()=>{
  const w=validateWorkflow(coverageExercise());for(const n of w.nodes.filter(n=>['area','observations'].includes(n.type)))assert.deepEqual(n.params.spatialReference,defaultSpatialReference());
  w.nodes[0].params.spatialReference.geodeticCRS='EPSG:3857';assert.throws(()=>validateWorkflow(w),/changing a CRS label/);
  w.nodes[0].params.spatialReference=defaultSpatialReference();w.nodes[1].params.spatialReference.axisOrder='latitude-longitude';assert.throws(()=>validateWorkflow(w),/longitude\/latitude/);
});

test('expandable point inputs preserve layer identity and exclusions when record IDs overlap',async()=>{
  const w=coverageExercise(),second=structuredClone(w.nodes[1]);second.id='second';second.params.label='Second layer';w.nodes.push(second);w.nodes[2].params.pointInputCount=2;
  assert.throws(()=>executionPlan(w),/points_2 input connected/);w.edges.push({id:'extra',from:'second',to:'coverage',port:'points_2'});
  assert.deepEqual(nodeInputs(w.nodes[2]).map(([port])=>port),['area','points','points_2']);assert.doesNotThrow(()=>executionPlan(w));
  const layers=[w.nodes[1],second].map(n=>({...n.params.data,sourceNodeId:n.id,label:n.params.label})),area={areaId:'urn:fieldwork:area:scope',geometryId:'urn:fieldwork:geometry:scope',boundary:w.nodes[0].params.geometry};
  const outside=layers[0].features.find(f=>f.id==='outside');w.nodes[2].params.exclusions=[{sourceNodeId:'observations',featureId:'outside',signature:featureSignature(outside),reason:'Layer-specific error'}];
  const facts=coverageFacts(w.nodes[2],area,{layers},'test');assert.equal(new Set(facts.rows.map(r=>r.id)).size,8);assert.equal(new Set(facts.rows.map(r=>r.iri)).size,8);
  assert.equal(facts.rows.filter(r=>r.excluded).length,1);assert.equal(facts.rows.find(r=>r.sourceNodeId==='second'&&r.recordId==='outside').excluded,false);
  const computed=await checkCoverage(w.nodes[2],area,{layers},async()=>facts.rows.map(r=>({subject:r.iri,predicate:'urn:fieldwork:coverageDecision',object:'urn:fieldwork:'+(r.excluded?'Excluded':['Outside','MissingLocation'].includes(r.relation)?'Review':'Accept')})),'test');
  assert.equal(computed.value.retainedLayers[0].data.features.length,3);assert.equal(computed.value.retainedLayers[1].data.features.length,4);assert.equal(computed.value.retainedData.features.length,7);assert.equal(computed.value.reviewCount,3);
  assert.equal(computed.value.retainedLayers[1].data.features[2].id,'outside');
  w.edges.at(-1).from='observations';assert.throws(()=>validateWorkflow(w),/once per operation/);
  w.nodes[2].params.pointInputCount=9;assert.throws(()=>validateWorkflow(w),/1–8/);
  assert.throws(()=>pointLayers({layers:[{sourceNodeId:'large',features:Array(2001).fill(outside)}]}),/2,000 records combined/);
});

test('Map accepts a coverage check as the sole input and preserves decisions without recomputation',()=>{
  const w=coverageExercise();w.nodes.push({...newMapOutput(),id:'map',x:700,y:0});w.edges.push({id:'review',from:'coverage',to:'map',port:'coverage'});
  assert.deepEqual(executionPlan(w).map(n=>n.id),['scope','observations','coverage','map']);
  const coverage={kind:'spatial-coverage',rows:[{id:'outside',relation:'Outside',excluded:true,exclusionReason:'Verified error'}],checkNodeId:'coverage',areaNodeId:'scope',measurement:{squareMetres:4}};
  const {value,receipt}=mapOutput(w.nodes.at(-1),{coverage},'test');assert.deepEqual(value,coverage);assert.equal(receipt.kind,'presentation');assert.equal(receipt.rules,'');assert.match(receipt.facts,/fw:MapView/);
  value.rows[0].excluded=false;assert.equal(coverage.rows[0].excluded,true);
  w.edges.push({id:'mixed',from:'scope',to:'map',port:'area'});assert.throws(()=>validateWorkflow(w),/either a coverage check/);
});
