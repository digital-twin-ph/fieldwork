import test from 'node:test';
import assert from 'node:assert/strict';
import {polygonSvg} from '../build/catchment-output.js';

/** A CLUSTER AT ONE HOUSE IS A RING (2026-11-15): outline only, so the house under it shows and its 15 m is not read as an
 *  area; a cluster over several places stays a filled circle. */
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const disc=(x,y,d)=>({type:'Polygon',coordinates:[[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]]]});
const layer={sites:[],method:'',crs:'OGC:CRS84',notes:[],layerName:'clusters',features:[
  {id:'cluster-1',name:'Cluster 1',category:'Most likely cluster',ring:true,geometry:disc(9.010,48.540,.0002)},
  {id:'cluster-4',name:'Cluster 4',category:'Secondary cluster',geometry:disc(9.012,48.541,.001)}]};

test('a one-place cluster is drawn as a ring; a cluster of places stays filled',()=>{
  const svg=polygonSvg(layer,esc);
  const ring=svg.match(/<path data-catchment="cluster-1"[^>]*>/)[0],disc4=svg.match(/<path data-catchment="cluster-4"[^>]*>/)[0];
  assert.match(ring,/data-ring=""/);assert.match(ring,/fill-opacity="0"/);assert.match(ring,/stroke-width="3.5"/);
  assert.match(ring,/stroke="#d7191c"/,'red against the black-and-white sheet');
  assert.doesNotMatch(disc4,/data-ring/);assert.doesNotMatch(disc4,/fill-opacity="0"/);
});
test('a secondary cluster at one house is a blue ring',()=>{
  const svg=polygonSvg({...layer,features:[{...layer.features[0],id:'cluster-2',category:'Secondary cluster',ring:'secondary'},layer.features[1]]},esc);
  assert.match(svg.match(/<path data-catchment="cluster-2"[^>]*>/)[0],/stroke="#2166ac"/);
});
