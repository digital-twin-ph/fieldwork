import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {projectFromCRS84,reprojectToCRS84} from '../build/reproject.js';
import {executeWorkflow,validateWorkflow,executionPlan,TYPES} from '../build/core.js';
import {johnSnowExample} from '../build/john-snow.js';
import {blankWorkflow} from '../build/study-area.js';
import {syncProjectManifest} from '../build/project-manifest.js';

const ready=async()=>[{subject:'urn:fieldwork:area:study',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];
const point=(id,lon,lat)=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates:[lon,lat]}});
const collection=(...features)=>({type:'FeatureCollection',features});
// With `reproject` connected to the pumps and nothing consuming it yet.
const withTransform=()=>{
  const w=JSON.parse(JSON.stringify(johnSnowExample('snow-voronoi')));
  w.nodes.push({id:'proj',type:'reproject',x:600,y:700,params:{label:'Pumps in UTM',zone:30,hemisphere:'north'}});
  w.edges.push({id:'pumps-proj',from:'pumps',to:'proj',port:'points'});
  return w;
};

test('the forward projection agrees with the inverse it replaced, and refuses its own output',()=>{
  // Round-tripping through the two directions is the parity available without pyproj in this
  // suite; the figures themselves were checked against proj4 and against PROJ 9.8.1 in the lab.
  const c=collection(point('a',-0.1365,51.5131),point('b',-0.1340,51.5145));
  const forward=projectFromCRS84(c,30,'north');
  assert.deepEqual(forward.collection.features[0].geometry.coordinates,[698687.800,5710773.830]);
  assert.equal(forward.provenance.sourceCRS,'OGC:CRS84');
  assert.equal(forward.provenance.targetCRS,'EPSG:32630');
  assert.equal(forward.provenance.targetAxisOrder,'easting-northing');
  assert.equal(forward.provenance.targetUnits,'metre');
  assert.ok(forward.provenance.maxRoundTripM<0.01,`round trip ${forward.provenance.maxRoundTripM} m`);
  const back=reprojectToCRS84(forward.collection,30,'north');
  for(const [i,f] of back.collection.features.entries()){
    const [lon,lat]=c.features[i].geometry.coordinates;
    assert.ok(Math.abs(f.geometry.coordinates[0]-lon)<1e-7);
    assert.ok(Math.abs(f.geometry.coordinates[1]-lat)<1e-7);
  }
  // Metres handed back in are refused rather than projected a second time, which would return a
  // plausible number for a location on the other side of the world.
  assert.throws(()=>projectFromCRS84(forward.collection,30,'north'),/already in metres|not a longitude and latitude/);
  assert.throws(()=>projectFromCRS84(c,1,'north'),/zone|guard/i);
});

test('projected points are refused by every widget that assumes degrees',async()=>{
  const w=withTransform();
  w.edges=w.edges.filter(e=>!(e.to==='catchments'&&e.port==='sites'));
  w.edges.push({id:'proj-catch',from:'proj',to:'catchments',port:'sites'});
  syncProjectManifest(w);
  assert.throws(()=>executionPlan(validateWorkflow(w)),error=>{
    assert.match(error.message,/needs longitude and latitude/);
    assert.ok(error.message.includes(TYPES.voronoi.title),'names the consumer');
    assert.ok(error.message.includes(TYPES.reproject.title),'names the producer');
    return true;
  });
});

test('a table may show projected points, and its receipt states the frame they are in',async()=>{
  const w=withTransform();
  w.nodes.push({id:'utmtable',type:'table_output',x:900,y:700,params:{label:'Pumps in UTM',inputMode:'spatial'}});
  w.edges.push({id:'proj-table',from:'proj',to:'utmtable',port:'points'});
  syncProjectManifest(w);
  const run=await executeWorkflow(validateWorkflow(w),ready);
  const receipt=run.receipts.find(r=>r.nodeId==='utmtable');
  const wkt=[...new Parser().parse(receipt.facts)]
    .filter(q=>q.predicate.value==='http://www.opengis.net/ont/geosparql#asWKT').map(q=>q.object.value);
  assert.ok(wkt.length>0,'the table receipt carries no geometry');
  for(const literal of wkt){
    assert.match(literal,/^<http:\/\/www\.opengis\.net\/def\/crs\/EPSG\/0\/32630> POINT /,
      `a projected table must not label its metres CRS84: ${literal}`);
    const [easting,northing]=literal.replace(/^[^(]*\(|\)$/g,'').split(' ').map(Number);
    assert.ok(easting>100_000&&easting<900_000,`${easting} is not a UTM easting`);
    assert.ok(northing>5_000_000&&northing<6_000_000,`${northing} is not a northing for London`);
  }
});

test('a workflow saved under the old source contract opens as the input it was',()=>{
  // `reproject` 0.1.0 was a Source holding a file it had ALREADY converted to CRS84 at import.
  // The records, label and provenance survive; the node becomes a point_input.
  const w=blankWorkflow();
  w.nodes=[{id:'old',type:'reproject',x:10,y:10,params:{label:'Imported UTM pumps',zone:30,hemisphere:'north',
    data:collection(point('a',-0.1365,51.5131)),
    source:{filename:'pumps.csv',bytes:120,sha256:'x',format:'csv',records:1},
    provenance:{sourceCRS:'EPSG:32630',transformed:1,withoutCoordinates:0,maxRoundTripM:0}}}];
  w.edges=[];
  syncProjectManifest(w);
  const node=validateWorkflow(JSON.parse(JSON.stringify(w))).nodes[0];
  assert.equal(node.type,'point_input');
  assert.deepEqual(node.sourceMigration,{fromType:'reproject',version:'1'});
  assert.equal(node.params.label,'Imported UTM pumps');
  assert.deepEqual(node.params.data.features[0].geometry.coordinates,[-0.1365,51.5131]);
  assert.equal(node.params.sourceInfo.sourceCRS,'EPSG:32630','the frame the file was in must survive');
});
