import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {unzipSync} from 'fflate';
import {Parser,Store} from 'n3';
import {parseCSV} from '../build/input-data.js';
import {tablePoints,tablePointsSentence} from '../build/table-points.js';
import {groupTable} from '../build/group-table.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {validateGraph} from '../scripts/validate-ontology.mjs';

/** POINT DATA FROM A TABLE (experiment 178): geopandas' points_from_xy, x the longitude and y the latitude, CRS84.
 *  The practitioner, 2026-11-05: *"Point data widget has input options that include CSV"*, so this is a source of that
 *  widget and not a new one. */

const row=(key,value=1)=>({key,value});
const table=rows=>({kind:'data-table',keys:['site','Latitude','Longitude'],valueField:'value',rowCount:rows.length,
  missingValueCount:0,rows});
const mapping={x:'Longitude',y:'Latitude',id:'site',name:'site'};

test('one point per row, x the longitude and y the latitude, every column kept',()=>{
  const r=tablePoints(table([row({site:'5-110',Latitude:'40.816',Longitude:'-73.902'},3653),
    row({site:'81-124',Latitude:'40.73614',Longitude:'-73.82153'},3633)]),mapping);
  assert.deepEqual(r.points.features.map(f=>f.geometry.coordinates),[[-73.902,40.816],[-73.82153,40.73614]]);
  assert.equal(r.points.features[0].id,'5-110');
  assert.deepEqual(r.points.features[0].properties,{site:'5-110',Latitude:'40.816',Longitude:'-73.902',value:'3653',name:'5-110'});
  assert.deepEqual(r.unplaced,[]);
  assert.equal(r.positions,2);
});

test('a row it cannot place is kept with no position and counted, and the table is not refused',()=>{
  const r=tablePoints(table([row({site:'a',Latitude:'',Longitude:'-73.9'}),row({site:'b',Latitude:'north',Longitude:'-73.9'}),
    row({site:'c',Latitude:'-95',Longitude:'140.8'}),row({site:'d',Latitude:'40.8',Longitude:'-73.9'})]),mapping);
  assert.equal(r.points.features.length,4);
  assert.deepEqual(r.unplaced.map(u=>[u.row,u.reason]),[[1,'a coordinate is empty'],
    [2,'(-73.9, north) is not a pair of numbers'],[3,'(140.8, -95) is outside the longitude and latitude range']]);
  assert.equal(r.points.features.filter(f=>f.geometry).length,1);
  assert.match(tablePointsSentence(r,mapping),/^1 of 4 rows placed as points, x \(longitude\) from "Longitude" and y \(latitude\) from "Latitude", read as CRS84\. 3 not placed: row 1, a coordinate is empty, and others\.$/);
});

test('rows at one position are separate points, and the result says how many share one',()=>{
  const r=tablePoints(table([1,2,3].map(()=>row({site:'5-110',Latitude:'40.816',Longitude:'-73.902'}))),mapping);
  assert.equal(r.points.features.length,3);
  assert.equal(r.positions,1);
  assert.equal(r.sharedPosition,2);
  assert.match(tablePointsSentence(r,mapping),/2 rows share a position with an earlier row, at 1 positions in all; total the table/);
});

test('x and y are named, distinct and present; nothing is guessed',()=>{
  const t=table([row({site:'a',Latitude:'40.8',Longitude:'-73.9'})]);
  assert.throws(()=>tablePoints(t,{x:'',y:'Latitude'}),/Choose the column holding x \(longitude\)/);
  assert.throws(()=>tablePoints(t,{x:'lon',y:'Latitude'}),/This table's columns are site, Latitude, Longitude, value/);
  assert.throws(()=>tablePoints(t,{x:'Latitude',y:'Latitude'}),/must be different columns/);
});

test('in a run: a table connected to Point data becomes points, stated in a receipt that conforms',async()=>{
  const data=table([row({site:'5-110',Latitude:'40.816',Longitude:'-73.902'}),row({site:'x',Latitude:'',Longitude:''})]);
  const w=validateWorkflow({schema:'fieldwork/workflow/1',name:'monitors',nodes:[
    {id:'t',type:'table_input',x:0,y:0,params:{label:'Sites',keys:data.keys,valueField:'value',data}},
    {id:'p',type:'point_input',x:0,y:0,params:{label:'Monitors',data:{type:'FeatureCollection',features:[]},fromTable:mapping}},
    {id:'o',type:'table_output',x:0,y:0,params:{label:'Monitors as a table',inputMode:'spatial'}}],
    edges:[{id:'e1',from:'t',to:'p',port:'records'},{id:'e2',from:'p',to:'o',port:'points'}]});
  const run=await executeWorkflow(w,{reason:async()=>({conclusions:[]})});
  const receipt=run.receipts.find(r=>r.nodeId==='p'&&/PointsFromTable/.test(r.facts));
  assert.ok(receipt,'Point data states what it read');
  assert.match(receipt.facts,/fw:placedRecordCount "1"/);
  assert.match(receipt.facts,/fw:unplacedRecordCount "1"/);
  const report=await validateGraph(new Store(new Parser().parse(receipt.facts)));
  assert.equal(report.conforms,true,report.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));
  // Unconnected it is the source it always was; connected and unmapped it says what to do.
  const unmapped=structuredClone(w);delete unmapped.nodes[1].params.fromTable;
  await assert.rejects(executeWorkflow(unmapped,{reason:async()=>({conclusions:[]})}),/Choose its x \(longitude\) and y \(latitude\) columns/);
});

// NYC's ozone monitors, from the authors' package where a local copy is named. The positions are EPA AQS sites.
const pkg=process.env.NYC_PKG;
test('NYC: the ozone site-day table, totalled by site and position, gives the 6 monitors',{skip:!(pkg&&existsSync(pkg))&&'Set NYC_PKG to a local copy of the Zenodo package.'},()=>{
  const zip=unzipSync(readFileSync(pkg));
  const name=Object.keys(zip).find(n=>n.endsWith('Reference_Locks/source_v1/o3_site_day_v1.csv'));
  const csv=parseCSV(new TextDecoder().decode(zip[name]),100_000,50_000_000);
  const at=h=>csv.headers.indexOf(h);
  const daily={kind:'data-table',keys:['date','site','Latitude','Longitude'],valueField:'value',rowCount:csv.rows.length,missingValueCount:0,
    rows:csv.rows.map(r=>({key:{date:r[at('date')],site:r[at('site')],Latitude:r[at('Latitude')],Longitude:r[at('Longitude')]},value:Number(r[at('value')])}))};
  const sites=groupTable(daily,{by:['site','Latitude','Longitude']}).table;
  const r=tablePoints(sites,mapping);
  assert.equal(r.points.features.length,6);
  assert.equal(r.unplaced.length,0);
  assert.equal(r.positions,6);
  const expected=new Map(csv.rows.map(x=>[x[at('site')],[Number(x[at('Longitude')]),Number(x[at('Latitude')])]]));
  for(const f of r.points.features)assert.deepEqual(f.geometry.coordinates,expected.get(f.id));
});
