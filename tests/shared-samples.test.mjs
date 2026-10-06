import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {oldNalediWorkflow,executeOldNode,sampleLocations} from '../build/old-naledi.js';
import {validateWorkflow,executionPlan,distanceKm} from '../build/core.js';
import {boundary} from '../examples/old-naledi/data.js';

test('sample generation supplies standard point features and GeoSPARQL computation evidence',async()=>{
  const w=validateWorkflow(oldNalediWorkflow()),node=w.nodes.find(n=>n.type==='samples'),receipts=[];
  const generated=await executeOldNode(node,{area:{boundary,areaId:'urn:test:area'}},()=>{},receipts,distanceKm);
  assert.equal(generated.type,'FeatureCollection');assert.equal(generated.features.length,21);
  assert.deepEqual(generated.features.map(f=>({id:f.id,name:f.properties.name,coordinates:f.geometry.coordinates})),sampleLocations(boundary,250));
  const facts=new Parser().parse(receipts[0].facts);
  assert.equal(facts.filter(q=>q.predicate.value==='http://www.opengis.net/ont/geosparql#asWKT').length,21);
  assert.equal(facts.find(q=>q.predicate.value==='urn:fieldwork:generatedRecordCount').object.value,'21');
  w.nodes.push({id:'sample-table',type:'table_output',x:0,y:0,params:{label:'Generated points'}});
  w.edges.push({id:'sample-table-edge',from:node.id,to:'sample-table',port:'points'});
  assert.ok(executionPlan(w).some(n=>n.id==='sample-table'));
});

test('access accepts shared points and preserves unknown coordinates and input attributes',async()=>{
  const node=oldNalediWorkflow().nodes.find(n=>n.type==='access');
  const facilities={boundary,facilities:[{id:'clinic',name:'Clinic',owner:'GOVERNMENT',serviceType:'Clinic',coordinates:[25.9,-24.6],tier:'Direct',service:'Onsite',reference:'Test'}],radiusKm:6};
  const samples={type:'FeatureCollection',sourceNodeId:'custom',sourceKind:'input-points',features:[{type:'Feature',id:'located',properties:{name:'Observed location',visits:2},geometry:{type:'Point',coordinates:[25.9,-24.6]}},{type:'Feature',id:'missing',properties:{name:'Unlocated'},geometry:null}]};
  const result=await executeOldNode(node,{samples,facilities},()=>{},[],distanceKm);
  assert.equal(result.rows[0].minutes,0);assert.equal(result.rows[0].attributes.visits,2);
  assert.equal(result.rows[1].coordinates,null);assert.equal(result.rows[1].minutes,null);
  assert.deepEqual(result.locationSource,{nodeId:'custom',kind:'input-points'});
  assert.deepEqual(result.boundary,boundary);
});
