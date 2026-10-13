import test from 'node:test';
import {travelTime} from '../build/travel-time.js';
import {nearestPlaces} from '../build/core.js';
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

/** What `access` guaranteed, now guaranteed by the decomposition that replaced it.
 *
 *  `access` was retired on 2026-10-12 into a candidate filter (a knob on nearest), the
 *  nearest-neighbour search (already shared code), and the proxy-minutes derivation (the
 *  travel_time primitive). This test was written for the widget and is kept for the behaviour: a
 *  located point gets minutes, an unlocated one gets none rather than zero, and the input's own
 *  attributes survive. Converting it rather than deleting it is what makes the merge checkable.
 */
test('the decomposition preserves what access guaranteed: minutes, unknowns and input attributes',()=>{
  const samples={type:'FeatureCollection',features:[
    {type:'Feature',id:'located',properties:{name:'Located',visits:2},geometry:{type:'Point',coordinates:[25.9,-24.6]}},
    {type:'Feature',id:'unlocated',properties:{name:'Unlocated'},geometry:null}]};
  const candidates={type:'FeatureCollection',features:[
    {type:'Feature',id:'clinic',properties:{name:'Clinic',tier:'Direct',service:'Onsite'},
      geometry:{type:'Point',coordinates:[25.9,-24.6]}},
    {type:'Feature',id:'ineligible',properties:{name:'Ineligible',tier:'None',service:'Unknown'},
      geometry:{type:'Point',coordinates:[25.9,-24.6]}}]};

  const searched=nearestPlaces(samples,candidates,'kilometres',
    [{field:'tier',comparator:'in',values:['Direct','Contextual']},
     {field:'service',comparator:'in',values:['Onsite']}]);
  assert.equal(searched.eligibleCount,1,'the filter excludes the ineligible candidate');
  assert.equal(searched.rows[0].center.id,'clinic');

  const timed=travelTime(searched.rows,70);
  assert.equal(timed[0].minutes,0,'a coincident point is zero minutes away');
  assert.equal(timed[1].coordinates,null);
  assert.equal(timed[1].minutes,null,'an unlocated point has no travel time, which is not zero');
  assert.ok(timed[1].reason,'and it says why, which access did not');

  // The unit is read, not assumed: the same distance in metres must give the same minutes.
  const inMetres=travelTime(nearestPlaces(samples,candidates,'metres',
    [{field:'tier',comparator:'in',values:['Direct']}]).rows,70);
  assert.equal(inMetres[0].minutes,timed[0].minutes);
});
