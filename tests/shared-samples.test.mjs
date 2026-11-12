import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {validateWorkflow,executionPlan,executeWorkflow} from '../build/core.js';
import {gridPoints} from '../build/point-grid.js';

/** POINT GRID, run by the general executor. It ran through Old Naledi's module, on Old Naledi's boundary, until both
 *  retired on 2026-11-11 (docs/audits/old-naledi-audit.md); a drawn area of about 1 km by 1 km near Gaborone stands in.
 *  The test of what `access` guaranteed through Travel time retired with Travel time the same day. */
const AREA={type:'Polygon',coordinates:[[[25.900,-24.690],[25.910,-24.690],[25.910,-24.681],[25.900,-24.681],[25.900,-24.690]]]};
const reason=async()=>[{subject:'urn:fieldwork:area:area',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];

test('sample generation supplies standard point features and GeoSPARQL computation evidence',async()=>{
  const w=validateWorkflow({schema:'fieldwork/workflow/1',name:'Grid',nodes:[
    {id:'area',type:'study_area',x:0,y:0,params:{label:'Area',source:'drawn',selectionMode:'bbox',geometry:AREA}},
    {id:'grid',type:'point_grid',x:0,y:0,params:{label:'Point grid',spacingM:250}},
    {id:'sample-table',type:'table_output',x:0,y:0,params:{label:'Generated points'}}],
    edges:[{id:'e1',from:'area',to:'grid',port:'area'},{id:'e2',from:'grid',to:'sample-table',port:'points'}]});
  const expected=gridPoints(AREA,250);
  assert.ok(expected.length>4,'the area holds several grid points, so the comparison means something');
  const result=await executeWorkflow(w,reason);
  const table=result.outputs.find(o=>o.nodeId==='sample-table');
  assert.equal(table.rows.length,expected.length);
  assert.deepEqual(table.rows.map(r=>r.coordinates),expected.map(p=>p.coordinates));
  const receipt=result.receipts.find(r=>r.nodeId==='grid');
  const facts=new Parser().parse(receipt.facts);
  assert.equal(facts.filter(q=>q.predicate.value==='http://www.opengis.net/ont/geosparql#asWKT').length,expected.length);
  assert.equal(facts.find(q=>q.predicate.value==='urn:fieldwork:generatedRecordCount').object.value,String(expected.length));
  assert.ok(executionPlan(w).some(n=>n.id==='sample-table'));
});
