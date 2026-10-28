/** A POLYGON LAYER ACQUIRED FOR A STUDY AREA, and what happens when the area moves.
 *
 *  Acquisition runs at import, so the features in a workflow were read for whatever the study
 *  area was at the time. The optional `area` port exists so that can be checked, and this is the
 *  check: a layer whose box no longer covers the area provably holds no features for part of it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {retrievalProvenance} from '../build/osm-areas.js';

const ready=async()=>[{subject:'urn:fieldwork:area:ground',
  predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];

const square=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
const retrieval=bbox=>({source:'openstreetmap-extract',licence:'ODbL-1.0',
  licenceIRI:'https://opendatacommons.org/licenses/odbl/1-0/',
  attribution:'© OpenStreetMap contributors',sourceIRI:'https://www.openstreetmap.org/copyright',
  kinds:['water'],bbox,at:'2026-10-28T00:00:00.000Z',kept:1,
  dropped:{outsideBox:7,unclosed:0,noGeometry:0,belowMinVertices:3}});

const workflow=(areaGeom,readFor)=>({schema:'fieldwork/workflow/1',id:'w',name:'w',
  nodes:[
    {id:'ground',type:'study_area',x:0,y:0,params:{source:'drawn',label:'Ground',
      selectionMode:'polygon',geometry:areaGeom}},
    {id:'water',type:'polygon_input',x:1,y:1,params:{label:'Water',inputMethod:'extract',
      kinds:['water'],minVertices:45,marginM:5000,
      source:{filename:'greater-london.osm.pbf',bytes:129796300,sha256:'d'.repeat(64),features:1},
      retrieval:retrieval(readFor),
      provenance:retrievalProvenance(retrieval(readFor),{filename:'greater-london.osm.pbf'}),
      data:{features:[{id:'osm-r1',name:'The river',geometry:square(-0.30,51.40,-0.10,51.50),
        properties:{natural:'water'}}]}}},
    {id:'map',type:'map_output',x:2,y:1,params:{label:'Where the water is',inputMode:'spatial'}},
  ],
  edges:[{id:'e1',from:'ground',to:'water',port:'area'},
    {id:'e2',from:'ground',to:'map',port:'area'},
    {id:'e3',from:'water',to:'map',port:'polygons'}]});

test('a layer read for the study area runs, and its receipt carries the obligation',async()=>{
  const run=await executeWorkflow(
    validateWorkflow(workflow(square(-0.26,51.41,-0.03,51.50),[-0.34,51.36,0.05,51.55])),ready);
  const receipt=run.receipts.find(r=>r.nodeId==='water');
  assert.match(receipt.method,/1 water feature read from greater-london\.osm\.pbf within/);
  assert.match(receipt.method,/3 below 45 vertices and 7 outside the box were not read/,
    'what was left out is stated, so an unexpected count has an account');
  assert.match(receipt.method,/OpenStreetMap contributors, ODbL-1\.0/);
  assert.match(receipt.method,/share-alike: a figure built on this carries the same terms/,
    'read off KNOWN_OBLIGATIONS rather than written here');
});

test('a study area the layer was not read for is refused, not quietly drawn',async()=>{
  // The area reaches west to -0.40; the layer was read only from -0.34.
  await assert.rejects(()=>executeWorkflow(
    validateWorkflow(workflow(square(-0.40,51.41,-0.03,51.50),[-0.34,51.36,0.05,51.55])),ready),
    err=>{
      assert.match(err.message,/read for a different study area/);
      assert.match(err.message,/-0\.3400, 51\.3600 to 0\.0500, 51\.5500/,'the box it was read for');
      assert.match(err.message,/-0\.4000, 51\.4100 to -0\.0300, 51\.5000/,'and the one it faces');
      assert.match(err.message,/Read the extract again/);
      return true;
    });
});

test('a layer with no retrieval is unaffected: a read file needs no study area',async()=>{
  const w=workflow(square(-0.40,51.41,-0.03,51.50),[-0.34,51.36,0.05,51.55]);
  const node=w.nodes.find(n=>n.id==='water');
  delete node.params.retrieval;delete node.params.inputMethod;delete node.params.provenance;
  node.params.nameField='name';
  const run=await executeWorkflow(validateWorkflow(w),ready);
  const receipt=run.receipts.find(r=>r.nodeId==='water');
  assert.match(receipt.method,/read from greater-london\.osm\.pbf as published/);
  assert.match(receipt.method,/named by name/);
});
