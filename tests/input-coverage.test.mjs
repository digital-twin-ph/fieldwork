import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,csvPoints,syntheticPoints,geoPackageLayers,geoPackagePoints,decodeGeoPackagePoint} from '../build/input-data.js';
import {pointRelation,coverageFacts,coverageExercise,featureSignature} from '../build/spatial-coverage.js';
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
  const data=validateGeoJSON(csvPoints(csv,{id:0,name:1,longitude:2,latitude:3}),{attributes:true});
  assert.equal(data.features[0].properties.name,'Clinic, A');assert.equal(data.features[0].properties.notes,'line 1\nline "2"');assert.equal(data.features[1].geometry,null);
  assert.throws(()=>parseCSV('a,a\n1,2'),/unique/);assert.throws(()=>parseCSV('a,b\n1,"broken'),/unclosed/);
  assert.throws(()=>validateGeoJSON(csvPoints(parseCSV('lon,lat\n500,0'),{longitude:0,latitude:1,id:-1,name:-1}),{attributes:true}),/Invalid point/);
});
test('synthetic generation is reproducible and has the requested outside-point count',()=>{
  const area=bboxPolygon(25.89,-24.7,25.91,-24.68),options={inside:8,outside:3,seed:17};
  const data=syntheticPoints(area,options);assert.deepEqual(data,syntheticPoints(area,options));assert.equal(data.features.filter(f=>pointRelation(f.geometry.coordinates,area)==='Outside').length,3);
  assert.throws(()=>syntheticPoints(area,{inside:2000,outside:1,seed:1}),/2,000/);
});
test('GeoPackage parser reads point geometry and attributes, rejects unsupported CRS and malformed blobs',async()=>{
  const {SQL,bytes}=await pointGeoPackage(),db=new SQL.Database(bytes);
  assert.equal(geoPackageLayers(db)[0].table_name,'observations');const data=validateGeoJSON(geoPackagePoints(db,'observations'),{attributes:true});assert.deepEqual(data.features[0].geometry.coordinates,[25.9,-24.69]);assert.equal(data.features[0].properties.case_count,3);db.close();
  const bad=await pointGeoPackage({projected:true}),other=new bad.SQL.Database(bad.bytes);assert.throws(()=>geoPackageLayers(other),/EPSG:4326/);other.close();
  assert.throws(()=>decodeGeoPackagePoint(new Uint8Array(10),4326),/header/);
});
test('coverage exclusions match the source and complete record snapshot, without altering input',()=>{
  const w=coverageExercise(),node=w.nodes[2],points={...w.nodes[1].params.data,sourceNodeId:'observations'},area={boundary:w.nodes[0].params.geometry,areaId:'urn:fieldwork:area:scope',geometryId:'urn:fieldwork:geometry:scope'};
  const f=points.features.find(f=>f.id==='outside');node.params.exclusions=[{sourceNodeId:'observations',featureId:f.id,signature:featureSignature(f),reason:'Verified coordinate entry error'}];validateWorkflow(w);
  assert.equal(coverageFacts(node,area,points,'test').rows.find(r=>r.id===f.id).excluded,true);
  const changed=structuredClone(points);changed.features.find(r=>r.id===f.id).properties.verified=true;
  assert.equal(coverageFacts(node,area,changed,'test').rows.find(r=>r.id===f.id).excluded,false);assert.equal(points.features.length,4);
});

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
  const w=coverageExercise();assert.doesNotThrow(()=>validateWorkflow(w));
  for(const strategy of ['uuid','sequential']){w.nodes[1].params.pinIdStrategy=strategy;assert.equal(validateWorkflow(w).nodes[1].params.pinIdStrategy,strategy);}
  w.nodes[1].params.pinIdStrategy='replace-existing';assert.throws(()=>validateWorkflow(w),/identifiers for new pins/);
});
