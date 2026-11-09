import test from 'node:test';
import assert from 'node:assert/strict';
import {distancesAsTable,portAccepts,nearestPlaces,validateWorkflow} from '../build/core.js';

/** A DISTANCES RESULT IS A TABLE (experiment 197): one row per point, its nearest candidate by the candidate's own
 *  attributes, and the distance. What lets Measure distance stand where Assign projection site stood. */
const point=(id,lon,lat,properties={})=>({type:'Feature',id,properties,geometry:{type:'Point',coordinates:[lon,lat]}});
const gauges={type:'FeatureCollection',features:[point('site-145',120.97,14.58,{name:'Manila',site_id:'145'}),point('site-394',123.92,10.30,{name:'Cebu',site_id:'394'})]};
const facilities={type:'FeatureCollection',features:[point('a',121.03,14.60,{name:'A clinic'}),point('b',123.9,10.31,{name:'A hospital'}),{type:'Feature',id:'c',properties:{name:'Unplaced'},geometry:null}]};

test('each point keeps its row, keyed by its nearest candidate\'s own attributes, the distance as the value',()=>{
  const table=distancesAsTable(nearestPlaces(facilities,gauges,'metres'));
  assert.deepEqual(table.keys,['point_id','nearest_id','nearest_name','nearest_site_id']);
  assert.equal(table.valueField,'distance');assert.equal(table.unit,'metres');
  assert.equal(table.rowCount,3);
  assert.deepEqual(table.rows[0].key,{point_id:'a',nearest_id:'site-145',nearest_name:'Manila',nearest_site_id:'145'});
  assert.equal(table.rows[1].key.nearest_site_id,'394');
  assert.ok(table.rows[0].value>6000&&table.rows[0].value<8000);
  // A point with no location is counted, not lost.
  assert.deepEqual(table.rows[2].key,{point_id:'c',nearest_id:'',nearest_name:'',nearest_site_id:''});
  assert.equal(table.rows[2].value,null);assert.equal(table.missingValueCount,1);
});

test('a table port takes a distances result; nothing else changes',()=>{
  assert.ok(portAccepts('table','distances'));
  assert.ok(portAccepts('table','table'));
  assert.ok(!portAccepts('distances','table'));
  assert.ok(!portAccepts('points','distances'));
  // And a workflow wiring Measure distance into Relate validates.
  const w={schema:'fieldwork/workflow/1',name:'t',nodes:[
    {id:'f',type:'point_input',x:0,y:0,params:{label:'f',data:facilities}},
    {id:'g',type:'point_input',x:0,y:0,params:{label:'g',data:gauges}},
    {id:'d',type:'measure_distance',x:0,y:0,params:{unit:'metres'}},
    {id:'t',type:'table_output',x:0,y:0,params:{label:'t',inputMode:'table'}}],
    edges:[{id:'e1',from:'f',to:'d',port:'points'},{id:'e2',from:'g',to:'d',port:'candidates'},{id:'e3',from:'d',to:'t',port:'table'}]};
  assert.doesNotThrow(()=>validateWorkflow(w));
});
