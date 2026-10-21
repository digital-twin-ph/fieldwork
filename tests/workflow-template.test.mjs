import test from 'node:test';
import assert from 'node:assert/strict';
import {templateFrom} from '../build/workflow-template.js';

// The practitioner, 2026-10-21, with North Kivu built and Ituri to build: "can the workflow be
// imported as a template to be filled up?" The method, not the material -- and the sources kept,
// which they asked for by name.
const workflow={schema:'fieldwork/workflow/1',id:'w',name:'Health Facilities North Kivu',
  projectId:'p1',workflowKey:'p1/w1',exampleId:'blank',
  nodes:[
    {id:'scope',type:'study_area',x:0,y:0,params:{label:'My study area',source:'drawn',
      selectionMode:'polygon',geometry:{type:'Polygon',coordinates:[[[0,0],[0,1],[1,1],[0,0]]]},
      boundary:{boundaryID:'COD-ADM1-63176286',unitID:'COD-ADM1-1',unitName:'Nord-Kivu'},
      revisions:[{at:'2026-10-20'}]}},
    {id:'osm',type:'find_health_facilities',x:0,y:0,params:{label:'OSM Health Facilities',
      source:'openstreetmap',radiusKm:5,
      data:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{},geometry:null}]},
      retrieved:{source:'openstreetmap-live',kept:431}}},
    {id:'clip',type:'clip_points_to_area',x:0,y:0,params:{label:'Points inside the area',
      keepBoundary:true,showExcluded:true}},
    {id:'dedup',type:'deduplicate_points',x:0,y:0,params:{label:'Deduplicated records',
      nameField:'name',nameMatch:'fuzzy',fuzzyThreshold:0.88,blockDistanceM:500,nearDistanceM:50,
      matchThreshold:2,reviewThreshold:1,
      decisions:[{key:'osm:a|hdx:b',decision:'match',reason:'Same compound',signature:'sig'}]}},
  ],edges:[{id:'e1',from:'scope',to:'clip',port:'area'},{id:'e2',from:'osm',to:'clip',port:'points'}]};

test('the shape of the investigation survives, with its own identity',()=>{
  const {workflow:t}=templateFrom(workflow,{name:'Health Facilities Ituri',projectId:'p1',workflowKey:'p1/w2'});
  assert.deepEqual(t.nodes.map(n=>n.type),['study_area','find_health_facilities','clip_points_to_area','deduplicate_points']);
  assert.deepEqual(t.edges,workflow.edges,'every wire comes across');
  // Its own identity, so saving it cannot write over the workflow it was taken from.
  assert.equal(t.workflowKey,'p1/w2');
  assert.equal(t.name,'Health Facilities Ituri');
  assert.equal(t.exampleId,undefined);
  assert.equal(workflow.workflowKey,'p1/w1','and the original is untouched');
});

test('settings are kept, including the sources the practitioner asked to keep',()=>{
  const {workflow:t}=templateFrom(workflow,{name:'Ituri',workflowKey:'p1/w2'});
  const node=id=>t.nodes.find(n=>n.id===id).params;
  assert.equal(node('osm').source,'openstreetmap','ask the same source again');
  assert.equal(node('osm').radiusKm,5);
  assert.equal(node('clip').keepBoundary,true);
  assert.equal(node('dedup').fuzzyThreshold,0.88);
  assert.equal(node('dedup').blockDistanceM,500);
  assert.equal(node('dedup').matchThreshold,2);
  assert.equal(node('scope').selectionMode,'polygon','how you draw is a setting');
});

test('material is cleared: a geometry, records, and judgements about those records',()=>{
  const {workflow:t,cleared}=templateFrom(workflow,{name:'Ituri',workflowKey:'p1/w2'});
  const node=id=>t.nodes.find(n=>n.id===id).params;
  assert.equal(node('scope').geometry,undefined,'another province is another outline');
  assert.equal(node('scope').boundary,undefined);
  assert.deepEqual(node('scope').revisions,[]);
  assert.deepEqual(node('osm').data.features,[],'the records are what will be fetched again');
  assert.equal(node('osm').retrieved,undefined);
  assert.deepEqual(node('dedup').decisions,[],'a judgement was about those records, not these');
  // And it says what it cleared rather than leaving it to be noticed.
  assert.deepEqual(cleared.map(c=>c.nodeId).sort(),['dedup','osm','scope']);
  assert.ok(cleared.find(c=>c.nodeId==='scope').keys.includes('geometry'));
});

test('a parameter that was already empty is not reported as cleared',()=>{
  const bare=structuredClone(workflow);
  bare.nodes=[{id:'dedup',type:'deduplicate_points',x:0,y:0,
    params:{label:'Deduplicated records',nameField:'name',decisions:[]}}];
  bare.edges=[];
  const {cleared}=templateFrom(bare,{name:'Ituri',workflowKey:'p1/w2'});
  assert.deepEqual(cleared,[],'saying it cleared something it did not would overstate the template');
});
