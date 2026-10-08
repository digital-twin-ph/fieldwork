import test from 'node:test';
import assert from 'node:assert/strict';
import {reprojectToCRS84,projectedGeoJSONPoints,utmDefinition,ROUND_TRIP_TOLERANCE_M} from '../build/reproject.js';
import {metric} from '../build/catchments.js';

const collection=(coordinates)=>({type:'FeatureCollection',features:coordinates.map((c,i)=>({type:'Feature',id:`r${i+1}`,properties:{name:`Record ${i+1}`},geometry:c?{type:'Point',coordinates:c}:null}))});

test('UTM false easting and northing are definitional, not derived from the transform', () => {
  // A point on the central meridian at the equator is the UTM origin: easting 500000,
  // northing 0 in the north and 10,000,000 in the south. Checking the inverse against
  // these published constants is independent of the projection series itself.
  for(const hemisphere of ['north','south']){
    const zone=35,{centralMeridian}=utmDefinition(zone,hemisphere);
    const northing=hemisphere==='south'?10_000_000:0;
    const {collection:out}=reprojectToCRS84(collection([[500_000,northing]]),zone,hemisphere);
    const [lon,lat]=out.features[0].geometry.coordinates;
    assert.ok(Math.abs(lon-centralMeridian)<1e-6,`longitude ${lon} should be the central meridian ${centralMeridian}`);
    assert.ok(Math.abs(lat)<1e-6,`latitude ${lat} should be the equator`);
  }
});

test('eastings equidistant from the central meridian give symmetric longitudes', () => {
  const zone=34,{centralMeridian}=utmDefinition(zone,'south');
  const {collection:out}=reprojectToCRS84(collection([[500_000-120_000,9_000_000],[500_000+120_000,9_000_000]]),zone,'south');
  const [west,east]=out.features.map(f=>f.geometry.coordinates[0]);
  assert.ok(west<centralMeridian&&east>centralMeridian,'offsets should straddle the central meridian');
  assert.ok(Math.abs((centralMeridian-west)-(east-centralMeridian))<1e-6,'offsets should be symmetric');
});

test('round-trip error is recorded and stays within tolerance', () => {
  const zone=35,{provenance}=reprojectToCRS84(collection([[380_000,7_270_000],[420_000,7_300_000]]),zone,'south');
  assert.ok(provenance.maxRoundTripM<=ROUND_TRIP_TOLERANCE_M,`round trip ${provenance.maxRoundTripM} m`);
  assert.equal(provenance.transformed,2);
  assert.equal(provenance.withoutCoordinates,0);
  assert.equal(provenance.datumShift,'none');
  assert.equal(provenance.sourceCRS,'EPSG:32735');
  assert.equal(provenance.targetCRS,'OGC:CRS84');
  assert.match(provenance.library,/^proj4 /);
});

test('the transform agrees with the existing metric helper rather than duplicating it', () => {
  const zone=35,hemisphere='south',projected=[395_000,7_280_000];
  const {collection:out}=reprojectToCRS84(collection([projected]),zone,hemisphere);
  const expected=metric(zone,hemisphere).inverse(projected);
  const actual=out.features[0].geometry.coordinates;
  assert.ok(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<1e-8,'coordinates should match metric().inverse');
});

test('records without coordinates are preserved as unknown locations', () => {
  const {collection:out,provenance}=reprojectToCRS84(collection([[400_000,7_280_000],null]),35,'south');
  assert.equal(out.features[1].geometry,null);
  assert.equal(out.features[1].id,'r2');
  assert.equal(provenance.transformed,1);
  assert.equal(provenance.withoutCoordinates,1);
});

test('degrees supplied as projected coordinates are refused, not silently accepted', () => {
  assert.throws(()=>reprojectToCRS84(collection([[25.92,-24.63]]),35,'south'),/outside the 100,000–900,000 m UTM range/);
});

test('a point outside the declared zone is refused by the validity guard', () => {
  // Zone 35 south covers roughly 24°–30°E; an easting far from its central meridian
  // inverts to a longitude outside the zone and must not be accepted silently.
  assert.throws(()=>reprojectToCRS84(collection([[899_999,1_000]]),35,'south'),/UTM zone\/hemisphere guard|outside/);
});

test('invalid zones, empty files and nonnumeric coordinates are refused', () => {
  assert.throws(()=>reprojectToCRS84(collection([[400_000,7_280_000]]),0,'south'),/UTM zone from 1 to 60/);
  assert.throws(()=>reprojectToCRS84(collection([[400_000,7_280_000]]),35,'middle'),/UTM zone from 1 to 60/);
  assert.throws(()=>reprojectToCRS84({type:'FeatureCollection',features:[]},35,'south'),/no records/);
  assert.throws(()=>reprojectToCRS84(collection([[Number.NaN,7_280_000]]),35,'south'),/nonnumeric projected coordinates/);
});

test('the record limit matches the Input data contract', () => {
  const many=collection(Array.from({length:2001},()=>[400_000,7_280_000]));
  assert.throws(()=>reprojectToCRS84(many,35,'south'),/at most 2,000 records/);
});

test('projected GeoJSON import keeps identifiers and refuses non-point geometry', () => {
  const parsed=projectedGeoJSONPoints({type:'FeatureCollection',features:[
    {id:'site-1',properties:{name:'Clinic',ward:'4'},geometry:{type:'Point',coordinates:[400_000,7_280_000]}},
    {properties:{},geometry:null}
  ]});
  assert.equal(parsed.features[0].id,'site-1');
  assert.equal(parsed.features[0].properties.ward,'4');
  assert.equal(parsed.features[1].properties.name,'Record 2');
  assert.equal(parsed.features[1].geometry,null);
  assert.throws(()=>projectedGeoJSONPoints({type:'FeatureCollection',features:[{geometry:{type:'LineString',coordinates:[[1,2],[3,4]]}}]}),/not a Point/);
  assert.throws(()=>projectedGeoJSONPoints({type:'Feature'}),/FeatureCollection/);
});
