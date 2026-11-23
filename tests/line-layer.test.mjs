import test from 'node:test';
import assert from 'node:assert/strict';
import {readLinesGeoJson,sharedBorder,lengthKm,metres,lineSentence} from '../build/line-layer.js';

/** LINES (experiment 229). GPX and KML are read in the browser (DOMParser) and tested there; GeoJSON, lengths and the
 *  shared border here. */
test('a GeoJSON line layer keeps its lines and counts what is not a line',()=>{
  const layer=readLinesGeoJson({type:'FeatureCollection',features:[
    {type:'Feature',id:'road',properties:{name:'Juba road',lanes:2,note:null},geometry:{type:'LineString',coordinates:[[31,4],[31.1,4.1]]}},
    {type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:[[[30,3],[30,3.1]],[[30.5,3],[30.6,3]]]}},
    {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[30,3]]}},
    {type:'Feature',properties:{},geometry:{type:'Point',coordinates:[30,3]}},
    {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}]});
  assert.equal(layer.features.length,2,'a line of one position is not a line');
  assert.deepEqual(layer.features[0].properties,{name:'Juba road',lanes:2});
  assert.equal(layer.features[1].properties.name,'line-2');
  assert.equal(layer.features[1].geometry.type,'MultiLineString');
  assert.deepEqual(layer.notLines,{points:1,areas:1});
  assert.match(lineSentence(layer),/^2 lines, .* km in all, from GeoJSON\. 1 point and 1 area are not lines and were not imported\.$/);
  assert.throws(()=>readLinesGeoJson({type:'Topology'}),/not a GeoJSON Feature or FeatureCollection/);
});

test('a line is as long as the sphere says, summed over its parts',()=>{
  // One degree of latitude is 111.2 km on a sphere of radius 6,371 km.
  assert.ok(Math.abs(metres([0,0],[0,1])/1000-111.195)<0.01);
  const two={type:'Feature',id:'x',properties:{name:'x'},geometry:{type:'MultiLineString',coordinates:[[[0,0],[0,1]],[[1,0],[1,1]]]}};
  assert.ok(Math.abs(lengthKm(two)-222.39)<0.02);
});

test('two areas side by side share the stretch where their outlines meet, within the distance stated',()=>{
  // West square 0–1° and east square 1–2°, the east one's west side drawn with its own vertices and 50 m off.
  const west={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
  const off=0.00045;// about 50 m at the equator
  const east={type:'Polygon',coordinates:[[[1+off,0],[2,0],[2,1],[1+off,1],[1+off,0.5],[1+off,0]]]};
  const border=sharedBorder(west,east,100);
  assert.equal(border.length,1);
  assert.deepEqual(border[0],[[1,0],[1,1]],'the west square\'s east side, in the order it is drawn');
  assert.deepEqual(sharedBorder(west,east,10),[],'50 m apart is not within 10 m');
  // A stretch crossing the start of a ring is one line: the border is the west square's south side and part of its east.
  const south={type:'Polygon',coordinates:[[[-1,-1],[2,-1],[2,0],[-1,0],[-1,-1]]]};
  const ring={type:'Polygon',coordinates:[[[0.5,0],[1,0],[1,1],[0,1],[0,0],[0.5,0]]]};
  assert.deepEqual(sharedBorder(ring,south,100),[[[0,0],[0.5,0],[1,0]]]);
  assert.throws(()=>sharedBorder(west,east,0),/more than 0 m/);
});

test('a country wholly inside another shares all its outline, closed',()=>{
  const inner={type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,1],[0,0]]]};
  const border=sharedBorder(inner,inner,1);
  assert.equal(border.length,1);assert.deepEqual(border[0].at(-1),border[0][0]);
});
