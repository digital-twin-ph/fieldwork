import test from 'node:test';
import assert from 'node:assert/strict';
import {travelToPlaces,travelMinutes,cellAt,MAX_FRICTION_CELLS} from '../build/friction-travel.js';

// WALKING TIME OVER A FRICTION SURFACE. Fieldwork routes over street networks, which is the wrong model for a
// campaign microplan where most of the walk is not on a mapped road -- and in Nigeria the expensive one, since
// GRID3's roads are CC BY-SA while the Malaria Atlas Project's walking friction is CC BY 4.0.
//
// A 3x3 grid of 0.01-degree cells near the equator. Friction is minutes per metre; 1/60 is a metre a second.
const grid=(values,width=3,height=3)=>({
  metadata:{width,height,origin:[0,0],resolution:[0.01,-0.01],crs:'EPSG:4326'},
  values:Float64Array.from(values),asset:{sha256:'x',bytes:1,mediaType:'image/tiff',filename:'friction.tif'}});
const point=(id,x,y)=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates:[x,y]}});
const points=(...f)=>({type:'FeatureCollection',features:f});
const slow=1/60; // one metre a second

test('a place on the origin costs nothing, and one a cell away costs the ground between',()=>{
  const g=grid(Array(9).fill(slow));
  const out=travelToPlaces(g,points(point('post',0.005,-0.005)),
    points(point('here',0.005,-0.005),point('next',0.015,-0.005)));
  const [here,next]=out.places.features;
  assert.equal(here.properties.minutes,0,'standing on the post is no walk at all');
  // One cell east is 0.01 degrees, about 1,113 m, at a minute per 60 m: about 18.6 minutes.
  assert.ok(next.properties.minutes>18&&next.properties.minutes<19,
    `a cell away is about 18.6 minutes, got ${next.properties.minutes}`);
  assert.equal(out.reached,2);
  assert.deepEqual(out.unreached,[]);
});

test('the nearest of several origins is the one answered, in one pass',()=>{
  const g=grid(Array(9).fill(slow));
  const far=travelToPlaces(g,points(point('a',0.005,-0.005)),points(point('p',0.025,-0.005)));
  const near=travelToPlaces(g,points(point('a',0.005,-0.005),point('b',0.025,-0.005)),
    points(point('p',0.025,-0.005)));
  assert.ok(far.places.features[0].properties.minutes>30);
  assert.equal(near.places.features[0].properties.minutes,0,'the second origin is on the place');
  assert.equal(near.originsUsed,2);
});

test('cheap ground is quicker than dear ground, which is the whole point of a friction surface',()=>{
  const cheap=travelToPlaces(grid(Array(9).fill(slow/10)),points(point('a',0.005,-0.005)),
    points(point('p',0.015,-0.005))).places.features[0].properties.minutes;
  const dear=travelToPlaces(grid(Array(9).fill(slow)),points(point('a',0.005,-0.005)),
    points(point('p',0.015,-0.005))).places.features[0].properties.minutes;
  assert.ok(cheap<dear/5,`cheap ${cheap} against dear ${dear}`);
});

test('a place the walk cannot reach is carried with the reason, not dropped',()=>{
  // A wall of no-data down the middle column.
  const g=grid([slow,NaN,slow, slow,NaN,slow, slow,NaN,slow]);
  const out=travelToPlaces(g,points(point('a',0.005,-0.005)),
    points(point('across',0.025,-0.005),point('outside',5,-5)));
  assert.equal(out.reached,0);
  assert.equal(out.places.features.length,2,'both places are still in the layer');
  assert.equal(out.places.features[0].properties.minutes,null);
  assert.equal(out.places.features[0].properties.minutes_why,'no path within the surface');
  assert.equal(out.unreached.find(u=>u.id==='outside').why,'outside the raster');
});

test('an origin that cannot start a walk is named, not silently ignored',()=>{
  const g=grid([NaN,slow,slow, slow,slow,slow, slow,slow,slow]);
  const out=travelToPlaces(g,points(point('nowhere',0.005,-0.005),point('ok',0.015,-0.015)),
    points(point('p',0.025,-0.025)));
  assert.equal(out.originsUsed,1);
  assert.deepEqual(out.originsSkipped,[{id:'nowhere',name:'nowhere',why:'no usable friction where it stands'}]);
  assert.ok(out.places.features[0].properties.minutes>0);
});

test('a walk is held to the minutes asked for',()=>{
  const g=grid(Array(9).fill(slow));
  const out=travelToPlaces(g,points(point('a',0.005,-0.005)),points(point('p',0.025,-0.005)),{maxMinutes:5});
  assert.equal(out.places.features[0].properties.minutes,null,'past the ceiling is unreached, not a big number');
  assert.equal(out.unreached[0].why,'no path within the surface');
});

test('a surface larger than one pass crosses is refused, saying so',()=>{
  const big={metadata:{width:4500,height:4500,origin:[0,0],resolution:[0.01,-0.01],crs:'EPSG:4326'},
    values:new Float64Array(1),asset:{}};
  assert.throws(()=>travelMinutes(big,points(point('a',0.005,-0.005))),
    new RegExp(`${MAX_FRICTION_CELLS.toLocaleString('en')}`));
});

test('a position outside the grid has no cell',()=>{
  const g=grid(Array(9).fill(slow));
  assert.equal(cellAt(g,[5,-5]),null);
  assert.deepEqual(cellAt(g,[0.005,-0.005]),{column:0,row:0,index:0});
});
