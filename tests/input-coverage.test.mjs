import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,csvPoints,syntheticPoints,geoPackageLayers,geoPackagePoints,decodeGeoPackagePoint,geoJSONDeclaredCRS} from '../build/input-data.js';
import {pointRelation} from '../build/spatial-coverage.js';
import {clipExercise} from '../build/clip-points.js';
import {bboxPolygon} from '../build/study-area.js';
import {validateGeoJSON,validateWorkflow} from '../build/core.js';
import {pointGeoPackage} from './input-fixtures.mjs';
import {parseAttributeValue,parseValueSet,validateAttributeSchema,attributeLiteral} from '../build/attribute-schema.js';
test('point relations distinguish the polygon interior, boundary, holes, and absent locations',()=>{
  const box=bboxPolygon(0,0,2,2);
  assert.equal(pointRelation([1,1],box),'Inside');assert.equal(pointRelation([2,1],box),'Boundary');assert.equal(pointRelation([2,2],box),'Boundary');assert.equal(pointRelation([3,1],box),'Outside');assert.equal(pointRelation(null,box),'MissingLocation');
  assert.equal(pointRelation([1.8,1.8],{type:'Polygon',coordinates:[[[0,0],[2,0],[0,2],[0,0]]]}),'Outside');
  assert.equal(pointRelation([1,1],{type:'Polygon',coordinates:[box.coordinates[0],bboxPolygon(.5,.5,1.5,1.5).coordinates[0]]}),'Outside');
});
test('CSV parses quoted attributes and missing coordinates, and preserves scalar fields',()=>{
  const csv=parseCSV('\uFEFFid,name,longitude,latitude,notes\r\na,"Clinic, A",25.9,-24.69,"line 1\nline ""2"""\r\nb,Missing,,,unknown\r\n');
  const data=validateGeoJSON(csvPoints(csv,{id:0,name:1,x:2,y:3,units:'degree'}),{attributes:true});
  assert.equal(data.features[0].properties.name,'Clinic, A');assert.equal(data.features[0].properties.notes,'line 1\nline "2"');assert.equal(data.features[1].geometry,null);
  assert.throws(()=>parseCSV('a,a\n1,2'),/unique/);assert.throws(()=>parseCSV('a,b\n1,"broken'),/unclosed/);
  // Two guards, both kept. The gate refuses first now, with a message naming Reproject; the
  // workflow boundary in core.ts still refuses a collection that reaches it some other way, which
  // is the guard this line originally tested.
  assert.throws(()=>csvPoints(parseCSV('lon,lat\n500,0'),{x:0,y:1,id:-1,name:-1,units:'degree'}),/import it with Reproject/);
  assert.throws(()=>validateGeoJSON({type:'FeatureCollection',features:[{type:'Feature',id:'a',
    properties:{name:'A'},geometry:{type:'Point',coordinates:[500,0]}}]},{attributes:true}),/Invalid point/);
});
test('synthetic generation is reproducible and has the requested outside-point count',()=>{
  const area=bboxPolygon(25.89,-24.7,25.91,-24.68),options={inside:8,outside:3,seed:17};
  const data=syntheticPoints(area,options);assert.deepEqual(data,syntheticPoints(area,options));assert.equal(data.features.filter(f=>pointRelation(f.geometry.coordinates,area)==='Outside').length,3);
  assert.throws(()=>syntheticPoints(area,{inside:2000,outside:1,seed:1}),/2,000/);
});
test('GeoPackage parser reads point geometry and attributes, rejects unsupported CRS and malformed blobs',async()=>{
  const {SQL,bytes}=await pointGeoPackage(),db=new SQL.Database(bytes);
  assert.equal(geoPackageLayers(db)[0].table_name,'observations');const data=validateGeoJSON(geoPackagePoints(db,'observations'),{attributes:true});assert.deepEqual(data.features[0].geometry.coordinates,[25.9,-24.69]);assert.equal(data.features[0].properties.case_count,3);db.close();
  // A GeoPackage declares its own CRS. Until 2026-10-13 that declaration was read only to refuse
  // anything but 4326, which sent the practitioner away to reproject a file that had already said
  // what it was. A WGS84 UTM layer is now honoured and converted; the degrees come back to the
  // ninth decimal, which is where stored coordinates are rounded.
  const projectedGpkg=await pointGeoPackage({utm:true}),utmDb=new projectedGpkg.SQL.Database(projectedGpkg.bytes);
  assert.equal(geoPackageLayers(utmDb)[0].epsg,32735);
  const converted=geoPackagePoints(utmDb,'observations').features.map(f=>f.geometry.coordinates);
  for(const [i,[lon,lat]] of [[25.9,-24.69],[25.94,-24.69]].entries()){
    assert.ok(Math.abs(converted[i][0]-lon)<1e-8,`longitude ${converted[i][0]} is not ${lon}`);
    assert.ok(Math.abs(converted[i][1]-lat)<1e-8,`latitude ${converted[i][1]} is not ${lat}`);
  }
  utmDb.close();
  // And one it cannot honour is refused BY ITS CODE, which is the part a practitioner can act on.
  const bad=await pointGeoPackage({projected:true}),other=new bad.SQL.Database(bad.bytes);
  assert.throws(()=>geoPackageLayers(other),/EPSG:3857/);
  assert.throws(()=>geoPackageLayers(other),/WGS84 UTM zones/);
  other.close();
  assert.throws(()=>decodeGeoPackagePoint(new Uint8Array(10),4326),/header/);
});
// A test stood here until 2026-10-21: `coverage_check` let a reviewer exclude a record by
// judgement with a written reason, pinned to a SIGNATURE of the record's whole content, so that
// editing the record lapsed the exclusion rather than letting a stale judgement ride on changed
// data. The widget was retired that day and nothing replaces that mechanism, so the test went
// with it rather than being weakened into something the code still does. What remains is the
// spatial half, covered by tests/clip-points.test.mjs. See docs/todo.md, which records the
// capability as missing rather than as replaced.

test('attribute data types and value sets validate values, defaults and imported records without coercion',()=>{
  assert.equal(parseAttributeValue('5','integer'),5);assert.equal(parseAttributeValue('yes','boolean'),true);assert.equal(parseAttributeValue('2024-02-29','date'),'2024-02-29');
  assert.throws(()=>parseAttributeValue('2023-02-29','date'),/calendar/);assert.throws(()=>parseAttributeValue('2.5','integer'),/whole number/);assert.throws(()=>parseAttributeValue('Infinity','number'),/finite/);
  assert.deepEqual(parseValueSet('1\n2\n3','integer'),[1,2,3]);assert.throws(()=>parseValueSet('1\n1.0','number'),/unique/);
  const data={type:'FeatureCollection',features:[{properties:{visit_status:'Planned',household_size:5,visit_date:'2026-10-05'}}]};
  const fields=[{key:'visit_status',label:'Status',type:'text',allowedValues:['Planned','Completed'],defaultValue:'Planned'}],rules=[{key:'household_size',type:'integer'},{key:'visit_date',type:'date'}];
  assert.doesNotThrow(()=>validateAttributeSchema(data,fields,rules));data.features[0].properties.visit_status='Unknown';assert.throws(()=>validateAttributeSchema(data,fields,rules),/allowed set/);
  data.features[0].properties.visit_status=null;data.features[0].properties.household_size='5';assert.throws(()=>validateAttributeSchema(data,fields,rules),/integer/);data.features[0].properties.household_size=5;
  assert.throws(()=>validateAttributeSchema(data,[{...fields[0],defaultValue:'Unknown'}],rules),/allowed set/);
  assert.match(attributeLiteral('2026-10-05','date'),/XMLSchema#date/);assert.match(attributeLiteral(5,'integer'),/XMLSchema#integer/);
});
test('pin ID strategy is optional for older workflows and rejects unsupported generation modes',()=>{
  const w=clipExercise();assert.doesNotThrow(()=>validateWorkflow(w));
  for(const strategy of ['uuid','sequential']){w.nodes[1].params.pinIdStrategy=strategy;assert.equal(validateWorkflow(w).nodes[1].params.pinIdStrategy,strategy);}
  w.nodes[1].params.pinIdStrategy='replace-existing';assert.throws(()=>validateWorkflow(w),/identifiers for new pins/);
});

/** The gate by which table values become GIS coordinates, and exactly what it can and cannot see.
 *
 *  The practitioner's framing: `points_from_xy` is the gate, the explicit mapping is longitude to x
 *  and latitude to y, and when those get swapped the points become incorrect. geopandas will not
 *  build a GeoDataFrame without a CRS and complains loudly when one is missing; this gate took no
 *  unit at all, and was called from two places with the same two slots meaning different things --
 *  degrees from the ordinary import, UTM easting and northing in metres from Reproject.
 *
 *  This test exists for the second half, which is the uncomfortable half: a swap is undetectable by
 *  range whenever |longitude| <= 90, and that includes **both worked examples this project ships**.
 */
test('the x,y gate declares its unit, and cannot see an in-range axis swap',()=>{
  const row=(x,y)=>parseCSV(`a,b,name\n${x},${y},P`);
  const read=(x,y,units)=>csvPoints(row(x,y),{x:0,y:1,id:-1,name:2,units}).features[0].geometry.coordinates;

  // Caught: projected metres read as degrees. The message names Reproject, which is the widget
  // that reads projected files, because "out of range" alone is a dead end for a practitioner.
  assert.throws(()=>read(500000,7800000,'degree'),/import it with Reproject/);
  assert.deepEqual(read(500000,7800000,'metre'),[500000,7800000],'the same values are valid metres');

  // Caught: a swap where the longitude exceeds 90, because the latitude slot then goes out of range.
  assert.deepEqual(read(120.97,14.58,'degree'),[120.97,14.58],'Manila, correct');
  assert.throws(()=>read(14.58,120.97,'degree'),/outside the longitude and latitude range/,'Manila, swapped');

  // NOT caught, and this is the limit worth stating: both shipped examples sit below 90° longitude,
  // so a swap produces a perfectly valid coordinate pair in the wrong part of the world. The Soho
  // pump at (-0.1366, 51.5135) swaps to (51.5135, -0.1366), which is off the Somali coast.
  assert.deepEqual(read(-0.1366,51.5135,'degree'),[-0.1366,51.5135],'Soho, correct');
  assert.deepEqual(read(51.5135,-0.1366,'degree'),[51.5135,-0.1366],'Soho, swapped — accepted');
  assert.deepEqual(read(-24.65,25.91,'degree'),[-24.65,25.91],'Gaborone, swapped — accepted');

  // What does catch it is the study area, downstream: every record reads Outside and
  // coverage_check's canProceed goes false. The gate cannot, and should not pretend to.
  assert.ok(true,'recorded: the swap guard is the study area, not this gate');
});

test('GeoJSON states the frame RFC 7946 fixes it at, and refuses a legacy member that disagrees',()=>{
  // RFC 7946 removed the `crs` member and fixes GeoJSON at CRS84, but files written to the
  // superseded 2008 draft still carry one. A member naming a projected system is the one case
  // where the file says plainly it is not what the importer assumes; reading it as degrees anyway
  // is the same silent failure a UTM CSV used to produce.
  const doc=crs=>crs===undefined?{type:'FeatureCollection',features:[]}:{type:'FeatureCollection',crs,features:[]};
  const named=name=>doc({type:'name',properties:{name}});
  assert.equal(geoJSONDeclaredCRS(doc()),'CRS84','a file with no member is CRS84 by the standard');
  for(const name of ['urn:ogc:def:crs:OGC:1.3:CRS84','CRS84','EPSG:4326','urn:ogc:def:crs:EPSG::4326'])
    assert.equal(geoJSONDeclaredCRS(named(name)),'CRS84',name);
  assert.throws(()=>geoJSONDeclaredCRS(named('urn:ogc:def:crs:EPSG::32735')),/32735/);
  assert.throws(()=>geoJSONDeclaredCRS(named('EPSG:27700')),/27700/);
  assert.throws(()=>geoJSONDeclaredCRS(doc({type:'link',href:'http://example.org/crs'})),/cannot read/);
});
