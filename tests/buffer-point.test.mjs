import test from 'node:test';
import assert from 'node:assert/strict';
import {bufferPoint,bufferFeatures,validateBufferPointNode,requireRunnableBufferPoint,BUFFER_POINT_STEPS} from '../build/buffer-point.js';

const gauges={type:'FeatureCollection',features:[
  {type:'Feature',id:'145',properties:{name:'MANILA'},geometry:{type:'Point',coordinates:[120.97,14.58]}},
  {type:'Feature',id:'260',properties:{name:'JOLO'},geometry:{type:'Point',coordinates:[121.00,6.07]}},
  {type:'Feature',id:'x',properties:{name:'UNLOCATED'},geometry:null},
]};
const node=(params)=>({id:'scope',type:'buffer_point',x:0,y:0,
  params:{label:'Geometry buffer',pointId:'MANILA',distanceM:5000,...params}});

test('the scope is a circle to within a tenth of a percent, and says so',()=>{
  const {value,receipt}=bufferPoint(gauges,node(),'r1');
  assert.equal(value.kind,'study-area');
  assert.equal(value.boundary.type,'Polygon');
  assert.equal(value.boundary.coordinates[0].length-1,BUFFER_POINT_STEPS*4,'four quadrants of steps');
  const fraction=Number(receipt.facts.match(/fw:circleAreaFraction "([0-9.]+)"/)[1]);
  assert.ok(fraction>0.999&&fraction<=1,`area fraction ${fraction} should be within 0.1% of the true circle`);
  assert.match(receipt.method,/A derived scope, not a surveyed boundary/);
});

test('a point can be named by id or by name',()=>{
  const byId=bufferPoint(gauges,node({pointId:'145'}),'r1');
  const byName=bufferPoint(gauges,node({pointId:'MANILA'}),'r1');
  assert.deepEqual(byId.value.bounds,byName.value.bounds);
});

test('the scope records its source point and radius with a unit',()=>{
  const {receipt}=bufferPoint(gauges,node({distanceM:3000}),'r1');
  assert.match(receipt.facts,/fw:sourcePoint "MANILA"/);
  assert.match(receipt.facts,/qudt:numericValue 3000/);
  assert.match(receipt.facts,/qudt:unit <http:\/\/qudt\.org\/vocab\/unit\/M>/);
  assert.match(receipt.facts,/a fw:StudyArea, geo:Feature/,'it is a scope like any other');
  assert.match(receipt.facts,/prov:wasGeneratedBy/,'and its derivation is recorded');
});

test('an unknown name is refused, and nothing named draws around everything connected',()=>{
  // A node with nothing chosen is an unfinished draft, not an invalid one: it must stay addable.
  assert.doesNotThrow(()=>validateBufferPointNode(node({pointId:''})),'an empty draft is valid');
  // NOTHING NAMED NO LONGER REFUSES (2026-11-23). It used to be the only behaviour a single-feature step could
  // have; now it means every feature connected, which is what several points asked for. Nothing CONNECTED still
  // refuses, because then there is nothing to draw around.
  assert.doesNotThrow(()=>requireRunnableBufferPoint(node({pointId:''})),'an unnamed step is runnable');
  assert.throws(()=>bufferPoint({type:'FeatureCollection',features:[]},node({pointId:''}),'r1'),
    /Connect points, lines or a polygon layer/);
  assert.throws(()=>bufferPoint(gauges,node({pointId:'CEBU'}),'r1'),/Nothing called "CEBU"/);
  const one=bufferPoint(gauges,node(),'r1');
  assert.ok(one.value.bounds[3]-one.value.bounds[1]<0.2,'the scope spans one place, not the archipelago');
});

test('the distance bound is enforced',()=>{
  // Raised from 5,000 to 50,000 on 2026-10-12. One knob, shared: validateBufferPointNode delegates
  // to validateBuffer, so buffer_point and buffer_area have always had the same range, and the old
  // ceiling sat below the 50,000 the geometry helpers in the same module already accepted.
  for(const distanceM of [-1,50001,Number.NaN])
    assert.throws(()=>validateBufferPointNode(node({distanceM})),/0–50,000 metres/);
  assert.doesNotThrow(()=>validateBufferPointNode(node({distanceM:0})));
  assert.doesNotThrow(()=>validateBufferPointNode(node({distanceM:6000})),'the 6 km the Old Naledi facility selection needs');
});

import {circleAround} from '../build/area-buffer.js';
import {validateAreaParams,studyAreaN3} from '../build/study-area.js';

// A study area can now be given as a centre and a radius, which is how a practitioner scopes to
// a place without a point layer and without panning the map there. It is the same construction
// buffer_point uses, so the two cannot drift.
test('a study area can be a circle around typed coordinates',()=>{
  const centre=[120.97,14.58],geometry=circleAround(centre,5000);
  assert.equal(geometry.type,'Polygon');
  assert.equal(geometry.coordinates[0].length-1,BUFFER_POINT_STEPS*4,'the same vertex count as buffer_point');
  const params={source:'drawn',label:'Around the Manila gauge',selectionMode:'circle',geometry};
  assert.doesNotThrow(()=>validateAreaParams(params));
  assert.match(studyAreaN3({id:'a',type:'study_area',x:0,y:0,params}).facts,/fw:selectionMode fw:Circle/,
    'and the facts say it was derived from a centre, not drawn by hand');
});

test('a circle refuses a centre or radius it cannot honour',()=>{
  assert.throws(()=>circleAround([120.97,85],5000),/below 80/);
  assert.throws(()=>circleAround([120.97,14.58],0),/1 to 50,000 metres/);
  assert.throws(()=>circleAround([120.97,14.58],50001),/1 to 50,000 metres/);
  assert.throws(()=>circleAround([Number.NaN,14.58],5000),/below 80/);
});

/** WHERE THE AREA IS DRAWN, AND HOW BIG (2026-11-24). Reported from a buffer around the Kibali mine: the circle on
 *  the map looked off-centre and several times too wide. The geometry was not at fault, and these are the checks
 *  that say so the next time -- the centre and the radius, measured off the ring rather than taken from the
 *  receipt's own arithmetic, because a receipt computed from a wrong ring would agree with it. */
const mines={type:'FeatureCollection',features:[
  {type:'Feature',id:'m1',properties:{name:'Kibali Mining Site'},geometry:{type:'Point',coordinates:[29.6833,3.1167]}},
  {type:'Feature',id:'m2',properties:{name:'Second mine'},geometry:{type:'Point',coordinates:[30.9,2.2]}},
]};
const ringBounds=g=>{let b=[Infinity,Infinity,-Infinity,-Infinity];
  const walk=c=>{if(typeof c[0]==='number'){b[0]=Math.min(b[0],c[0]);b[1]=Math.min(b[1],c[1]);b[2]=Math.max(b[2],c[0]);b[3]=Math.max(b[3],c[1]);}else c.forEach(walk);};
  walk(g.coordinates);return b;};

test('the area is centred on the feature named, at the radius given',()=>{
  for(const named of ['Kibali Mining Site','m1']){
    const {value}=bufferPoint(mines,{id:'b',type:'buffer_point',x:0,y:0,
      params:{label:'Geometry buffer',pointId:named,distanceM:50000,yields:'area'}},'r');
    const [west,south,east,north]=ringBounds(value.boundary);
    const cx=(west+east)/2,cy=(south+north)/2;
    assert.ok(Math.abs(cx-29.6833)<1e-6&&Math.abs(cy-3.1167)<1e-6,
      `${named}: centred on the mine, not at ${cx.toFixed(4)}, ${cy.toFixed(4)}`);
    // Half-height in metres: a degree of latitude is 111.32 km wherever you stand.
    const halfHeightM=(north-south)/2*111320;
    assert.ok(Math.abs(halfHeightM-50000)<600,`${named}: 50 km across the radius, not ${(halfHeightM/1000).toFixed(1)} km`);
    // And the second mine is NOT in it: naming one feature draws around that one only.
    assert.ok(east<30.9,`${named}: the area stops short of the mine that was not named`);
  }
});

test('the radius sets the size, in proportion',()=>{
  const radiusM=distanceM=>{
    const {value}=bufferPoint(mines,{id:'b',type:'buffer_point',x:0,y:0,
      params:{label:'Geometry buffer',pointId:'m1',distanceM,yields:'area'}},'r');
    const [,south,,north]=ringBounds(value.boundary);
    return (north-south)/2*111320;
  };
  const small=radiusM(5000),large=radiusM(50000);
  assert.ok(Math.abs(small-5000)<60,`5 km asked, ${(small/1000).toFixed(2)} km drawn`);
  assert.ok(Math.abs(large/small-10)<0.01,'ten times the radius is ten times the distance across');
});

/** THE ONE-DEGREE LIMIT GUARDS A RASTER, AND ONLY A RASTER (2026-11-24). It was unconditional, so a workflow with
 *  no grid in it at all was refused by a rule whose own sentence is about grids. Reported with two study areas, a
 *  border, a buffer and a Map — told that "a study area windows every raster this workflow reads" when it read
 *  none. The same error the polygon-layer fix of the day before was written about, made one level up: a guard
 *  applied past what it guards. */
const borderStretches=Array.from({length:32},(_,i)=>{
  const x=27.5+i*(3.5/32);
  return {type:'Feature',id:`s${i}`,properties:{name:`Stretch ${i+1}`},
    geometry:{type:'LineString',coordinates:[[x,4.4],[x+3.5/32,4.45]]}};
});
const border={kind:'lines',source:'border',features:borderStretches};
const scope=(params)=>({id:'b',type:'buffer_point',x:0,y:0,
  params:{label:'Geometry buffer',pointId:'',distanceM:5000,yields:'area',...params}});

test('a scope spanning degrees is allowed where no raster would be windowed through it',()=>{
  const {value}=bufferFeatures({lines:border},scope(),'r',{rasterSteps:[]});
  assert.equal(value.kind,'study-area');
  const span=value.bounds[2]-value.bounds[0];
  assert.ok(span>3,`the border buffer spans ${span.toFixed(2)}°, well past the old limit`);
});

test('and refused where one would be, naming the step it protects',()=>{
  assert.throws(()=>bufferFeatures({lines:border},scope(),'r',{rasterSteps:['Population (WorldPop)']}),
    err=>{
      assert.match(err.message,/Population \(WorldPop\)/,'the refusal names the step, not just the rule');
      assert.match(err.message,/cells too coarse to mean anything/);
      // The three ways out, including the one that was always true and never said.
      assert.match(err.message,/polygon layer/);
      assert.match(err.message,/fewer features/);
      assert.match(err.message,/take the raster out of this workflow/);
      return true;
    });
});

test('a polygon layer is never held to the limit, raster or not',()=>{
  for(const rasterSteps of [[],['Population (WorldPop)']]){
    const {value}=bufferFeatures({lines:border},scope({yields:'polygons'}),'r',{rasterSteps});
    assert.equal(value.features.length,32,'every stretch kept, whatever else the workflow reads');
  }
});

test('a scope under a degree is unaffected by either',()=>{
  const one={kind:'lines',source:'border',features:[borderStretches[0]]};
  for(const rasterSteps of [[],['Population (WorldPop)']]){
    const {value}=bufferFeatures({lines:one},scope(),'r',{rasterSteps});
    assert.equal(value.kind,'study-area');
  }
});
