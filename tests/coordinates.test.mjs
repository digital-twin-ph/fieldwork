import test from 'node:test';
import assert from 'node:assert/strict';
import {readCoordinate,coordinateReport,coordinateSentence} from '../build/coordinates.js';
import {tablePoints} from '../build/table-points.js';
import {parseCSV,csvPoints} from '../build/input-data.js';

/** DEGREES, MINUTES AND SECONDS READ AS DECIMAL DEGREES (the practitioner, 2026-11-18, of a USGS table of Africa's mineral
 *  facilities). The cases are the table's own, its hemisphere after a non-breaking space. */
const near=(a,b)=>Math.abs(a-b)<1e-9;
const NBSP=' ';

test('a DMS value with its hemisphere is converted, south and west negative',()=>{
  assert.ok(near(readCoordinate(`35° 51' 06"${NBSP}N`,'y').value,35+51/60+6/3600));
  assert.ok(near(readCoordinate(`000° 19' 17"${NBSP}W`,'x').value,-(19/60+17/3600)));
  assert.ok(near(readCoordinate(`05° 56' 00" S`,'y').value,-(5+56/60)));
  assert.ok(near(readCoordinate(`10°43.5'S`,'y').value,-(10+43.5/60)));
  assert.ok(near(readCoordinate('−5°56′00″','y').value,-(5+56/60)));
  for(const t of [`35° 51' 06"${NBSP}N`,'5 56 00 S','5:56:00'])assert.equal(readCoordinate(t,'y').dms,true);
});

test('a decimal number is read as it is, and its sign states its hemisphere',()=>{
  const r=readCoordinate('-0.321388888888889','x');
  assert.ok(near(r.value,-0.321388888888889));assert.equal(r.dms,false);assert.equal(r.hemisphereStated,true);
  assert.equal(readCoordinate('5.9333 S','y').value,-5.9333);
});

test('what the table gets wrong is not read, with why: 90 seconds, 88 minutes, two hemispheres, a latitude letter on a longitude',()=>{
  assert.match(readCoordinate(`008° 41' 90" E`,'x').reason,/60 or more/);
  assert.match(readCoordinate(`011° 88' 00" E`,'x').reason,/60 or more/);
  assert.equal(readCoordinate(`05° 05' 00" NS`,'y').value,null);
  assert.match(readCoordinate(`05°56'00"N`,'x').reason,/latitude hemisphere/);
  assert.match(readCoordinate('-','y').reason,/not a number/);
});

test('no hemisphere is converted as positive, counted, and said',()=>{
  const senegal=readCoordinate(`016° 44' 00"`,'x');
  assert.ok(senegal.value>0);assert.equal(senegal.hemisphereStated,false);
  const report={x:coordinateReport([senegal,readCoordinate(`012° 21' 00" E`,'x')]),y:coordinateReport([readCoordinate(`14° 56' 00" N`,'y')])};
  assert.deepEqual(report.x,{dms:2,noHemisphere:1});
  assert.match(coordinateSentence(report,'Longitude','Latitude'),/1 in "Longitude" state no hemisphere and are read as east/);
});

test('a table of DMS is placed as points, its text kept in its columns',()=>{
  const table={keys:['Location','Latitude','Longitude'],valueField:'',rows:[
    {key:{Location:'Muanda',Latitude:`05° 56' 00"${NBSP}S`,Longitude:`012° 21' 00"${NBSP}E`},value:null},
    {key:{Location:'Unknown',Latitude:'-',Longitude:'-'},value:null}]};
  const r=tablePoints(table,{x:'Longitude',y:'Latitude',name:'Location'});
  const [x,y]=r.points.features[0].geometry.coordinates;
  assert.ok(near(x,12.35)&&near(y,-(5+56/60)));
  assert.equal(r.points.features[0].properties.Latitude,`05° 56' 00"${NBSP}S`);
  assert.equal(r.unplaced.length,1);
  assert.deepEqual(r.coordinates.y,{dms:1,noHemisphere:0});
});

test('a CSV upload in degrees reads DMS, and leaves an unreadable record unplaced rather than refusing the file',()=>{
  const csv=parseCSV(['name,lat,lon',`Muanda,"05° 56' 00"" S","012° 21' 00"" E"`,`Bad,"03° 30' 20"" N","008° 41' 90"" E"`,''].join('\n'));
  const report={x:{dms:0,noHemisphere:0},y:{dms:0,noHemisphere:0},unread:[]};
  const points=csvPoints(csv,{x:2,y:1,id:-1,name:0,units:'degree'},report);
  assert.ok(near(points.features[0].geometry.coordinates[1],-(5+56/60)));
  assert.equal(points.features[1].geometry,null);
  assert.equal(report.unread.length,1);assert.equal(report.unread[0].record,2);
  assert.equal(report.y.dms,2);
});
