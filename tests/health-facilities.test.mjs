import test from 'node:test';
import assert from 'node:assert/strict';
import {FACILITY_SOURCES,boundsOf,overpassQuery,normalizeCountryCode,hotExportURL,
        downloadFacilities,facilitiesValue,migrateHealthsitesNodes,
        validateFindHealthFacilitiesNode,requireRunnableFindHealthFacilities} from '../build/health-facilities.js';
import {parseFacilityRecords,facilityRecordsIn} from '../build/facility-records.js';
import {resetNetworkPacing} from '../build/network-throttle.js';
import {executeWorkflow} from '../build/core.js';

const AREA={type:'Polygon',coordinates:[[[120.95,14.55],[121.00,14.55],[121.00,14.60],[120.95,14.60],[120.95,14.55]]]};
const node=params=>({id:'hf',type:'find_health_facilities',x:0,y:0,
  params:{label:'Find health facilities',source:'openstreetmap-live',kinds:['hospital','clinic'],
    requireName:true,country:'PHL',data:null,retrieved:null,...params}});

test('the study area bounds are read from the geometry, for both polygon kinds',()=>{
  assert.deepEqual(boundsOf(AREA),[120.95,14.55,121.00,14.60]);
  assert.deepEqual(boundsOf({type:'MultiPolygon',coordinates:[AREA.coordinates,
    [[[121.5,15.0],[121.6,15.0],[121.6,15.1],[121.5,15.1],[121.5,15.0]]]]}),[120.95,14.55,121.6,15.1]);
});

test('an area with no width bounds nothing, and says so',()=>{
  const line={type:'Polygon',coordinates:[[[120.95,14.55],[120.95,14.60],[120.95,14.55]]]};
  assert.throws(()=>boundsOf(line),/no width or no height/);
  assert.throws(()=>boundsOf({type:'Polygon',coordinates:[[]]}),/no usable extent/);
});

// Overpass takes south,west,north,east. Everything else here uses west,south,east,north. Getting
// it wrong returns facilities from somewhere else entirely and no error at all, so this is the
// assertion that earns its place most.
test('the Overpass bounding box is south,west,north,east, not the order used elsewhere',()=>{
  const query=overpassQuery(boundsOf(AREA),['hospital']);
  assert.match(query,/\(14\.550000,120\.950000,14\.600000,121\.000000\)/,
    'south first, then west, then north, then east');
  assert.ok(!query.includes('(120.950000,14.550000'),'the application order must not leak through');
});

test('the query asks only for the requested kinds, and refuses to interpolate anything else',()=>{
  assert.match(overpassQuery(boundsOf(AREA),['hospital','clinic']),/~"\^\(hospital\|clinic\)\$"/);
  // A kind that is not a plain OSM word is dropped from the filter rather than placed into the
  // query, so nothing a practitioner types can alter the statement being sent.
  const hostile=overpassQuery(boundsOf(AREA),['hospital"];out meta;//']);
  assert.ok(!hostile.includes('out meta'),'no injected statement survives');
  assert.match(overpassQuery(boundsOf(AREA),[]),/\["healthcare"\]/,'no kinds means no filter');
});

test('an ISO country code is checked rather than trusted',()=>{
  assert.equal(normalizeCountryCode('phl'),'PHL');
  for(const bad of ['Philippines','PH','','PHLX','123'])
    assert.throws(()=>normalizeCountryCode(bad),/three-letter ISO code/);
  assert.match(hotExportURL('phl'),/ISO3\/PHL\/health_facilities\/points\/hotosm_phl_/);
});

test('the Overpass element shape and a GeoJSON FeatureCollection parse the same way',()=>{
  const overpass={elements:[
    {type:'node',id:1,lat:14.57,lon:120.98,tags:{name:'Ospital ng Maynila',amenity:'hospital'}},
    {type:'way',id:2,center:{lat:14.58,lon:120.99},tags:{name:'Sampaloc Health Center',healthcare:'clinic'}}]};
  const fromOverpass=parseFacilityRecords(facilityRecordsIn(overpass),{kinds:['hospital','clinic']});
  assert.equal(fromOverpass.kept,2,'a node carries lat/lon and a way carries a center');
  assert.deepEqual(fromOverpass.collection.features[0].geometry.coordinates,[120.98,14.57]);
  assert.equal(fromOverpass.collection.features[1].id,'way/2','OSM identity is kept, not an index');

  // The HOT export's shape, nulls included, exactly as measured on 2026-10-09.
  const hot={type:'FeatureCollection',features:[{type:'Feature',
    properties:{name:'Coleen Pharmacy & Clinic','name:en':null,amenity:'doctors',healthcare:null,
      'healthcare:speciality':null,'addr:city':null,osm_id:3090641351,osm_type:'nodes'},
    geometry:{type:'Point',coordinates:[122.48,11.06]}}]};
  const fromHot=parseFacilityRecords(facilityRecordsIn(hot),{kinds:['doctors']});
  assert.equal(fromHot.kept,1);
  assert.equal(fromHot.collection.features[0].id,'node/3090641351','osm_type is plural in this export');
  assert.equal(fromHot.collection.features[0].properties.kind,'doctors',
    'amenity stands in when healthcare is null');
});

test('a country export is clipped to the study area, and every drop is counted by reason',()=>{
  const records=[
    {tags:{name:'Inside',amenity:'hospital'},lat:14.57,lon:120.98},
    {tags:{name:'Far away',amenity:'hospital'},lat:7.07,lon:125.61},
    {tags:{name:'Wrong kind',amenity:'pharmacy'},lat:14.57,lon:120.98},
    {tags:{name:'No location',amenity:'hospital'}},
    {tags:{amenity:'hospital'},lat:14.58,lon:120.99}];
  const {kept,dropped,collection}=parseFacilityRecords(records,
    {kinds:['hospital'],within:boundsOf(AREA)});
  assert.equal(kept,1);
  assert.equal(collection.features[0].properties.name,'Inside');
  assert.deepEqual(dropped,{kind:1,coordinates:2,name:1},
    'outside the area and missing coordinates are the same kind of failure: unplaceable');
});

test('unnamed facilities are kept when the practitioner says so',()=>{
  const records=[{tags:{amenity:'hospital'},lat:14.57,lon:120.98}];
  assert.equal(parseFacilityRecords(records,{kinds:['hospital']}).kept,0);
  const kept=parseFacilityRecords(records,{kinds:['hospital'],requireName:false});
  assert.equal(kept.kept,1);
  assert.equal(kept.collection.features[0].properties.name,'(unnamed)',
    'an absent name is labelled as absent, never guessed from another tag');
});

test('a draft is allowed to be incomplete; running is not',()=>{
  assert.doesNotThrow(()=>validateFindHealthFacilitiesNode(node({kinds:[]})));
  assert.throws(()=>requireRunnableFindHealthFacilities(node({kinds:[]})),/at least one facility kind/);
  assert.throws(()=>validateFindHealthFacilitiesNode(node({source:'nowhere'})),/Choose a source/);
  assert.throws(()=>validateFindHealthFacilitiesNode(node({kinds:['Hospital!']})),/not an OpenStreetMap facility kind/);
  assert.throws(()=>requireRunnableFindHealthFacilities(node({source:'hdx-hot-export',country:'Philippines'})),
    /three-letter ISO code/);
  assert.doesNotThrow(()=>requireRunnableFindHealthFacilities(node({source:'hdx-hot-export',country:'PHL'})));
  assert.throws(()=>validateFindHealthFacilitiesNode(node({data:{type:'FeatureCollection',features:[]}})),
    /no record of where they came from/);
});

test('a retrieval goes to Overpass, bounded by the area, through the injected fetcher',async()=>{
  resetNetworkPacing();
  let sent=null;
  const fetcher=async(url,init)=>{
    sent={url,body:String(init.body)};
    return new Response(JSON.stringify({elements:[
      {type:'node',id:7,lat:14.57,lon:120.98,tags:{name:'Ospital ng Maynila',amenity:'hospital'}}]}),
      {status:200,headers:{'Content-Type':'application/json'}});
  };
  const {parsed,retrieval}=await downloadFacilities(node({kinds:['hospital']}),AREA,fetcher);
  assert.match(sent.url,/overpass-api\.de\/api\/interpreter$/);
  assert.match(decodeURIComponent(sent.body),/14\.550000,120\.950000,14\.600000,121\.000000/);
  assert.equal(parsed.kept,1);
  assert.equal(retrieval.licence,'ODbL-1.0');
  assert.equal(retrieval.source,'openstreetmap-live');
  assert.match(retrieval.scope,/study area/);
});

test('a busy Overpass is reported as busy, with the alternative named',async()=>{
  resetNetworkPacing();
  const fetcher=async()=>new Response('',{status:429,headers:{'retry-after':'1'}});
  await assert.rejects(()=>downloadFacilities(node(),AREA,fetcher),/busy \(HTTP 429\).*HDX country export/s);
});

test('a source that returns nothing usable refuses, rather than emitting an empty layer',async()=>{
  resetNetworkPacing();
  const fetcher=async()=>new Response(JSON.stringify({elements:[
    {type:'node',id:1,lat:14.57,lon:120.98,tags:{name:'Pharmacy',amenity:'pharmacy'}}]}),{status:200});
  // An empty layer would read downstream as a true absence of facilities, which it is not.
  await assert.rejects(()=>downloadFacilities(node({kinds:['hospital']}),AREA,fetcher),
    /No facilities of the requested kinds.*1 of another kind/s);
});

test('Overpass is paced, because it is a free shared service',async()=>{
  resetNetworkPacing();
  const fetcher=async()=>new Response(JSON.stringify({elements:[
    {type:'node',id:1,lat:14.57,lon:120.98,tags:{name:'Ospital ng Maynila',amenity:'hospital'}}]}),{status:200});
  await downloadFacilities(node(),AREA,fetcher);
  await assert.rejects(()=>downloadFacilities(node(),AREA,fetcher),/Please wait \d+ seconds/,
    'a second immediate request waits rather than hammering a public endpoint');
});

test('the receipt carries the licence as a resolvable IRI and states what is not established',()=>{
  const {value,receipt}=facilitiesValue(node({
    data:{type:'FeatureCollection',features:[{type:'Feature',id:'node/1',
      properties:{name:'Ospital ng Maynila',kind:'hospital'},geometry:{type:'Point',coordinates:[120.98,14.57]}}]},
    retrieved:{source:'openstreetmap-live',sourceLabel:'OpenStreetMap, live query',licence:'ODbL-1.0',
      licenceIRI:'https://opendatacommons.org/licenses/odbl/1-0/',
      sourceIRI:'https://www.openstreetmap.org/copyright',
      attribution:FACILITY_SOURCES['openstreetmap-live'].attribution,
      origin:'https://overpass-api.de',kept:1,dropped:{kind:3,coordinates:1,name:2},
      at:'2026-10-09T00:00:00.000Z',scope:'study area'}}),'run-1');
  assert.equal(value.sourceNodeId,'hf');
  assert.match(receipt.facts,/dcterms:license <https:\/\/opendatacommons\.org\/licenses\/odbl\/1-0\/>/);
  assert.match(receipt.facts,/fw:recordCount 1/);
  assert.match(receipt.method,/Dropped 6 records/);
  assert.match(receipt.method,/not the facilities that exist/,
    'uneven coverage is stated in the receipt, not left for the reader to remember');
  assert.match(receipt.method,/share-alike/);
});

test('a node with no retrieval refuses to produce a layer',()=>{
  assert.throws(()=>facilitiesValue(node(),'run-1'),/no facilities yet/);
});

// The online-to-offline contract: a network-dependent widget retrieves once, while there is a
// network, and the workflow then runs from what was stored. If the executor could fetch, a saved
// workflow would behave differently offline, and the offline claim would be false.
test('running a workflow issues no network request, however the data arrived',async()=>{
  const original=globalThis.fetch;
  let attempts=0;
  globalThis.fetch=async(...args)=>{attempts++;throw new Error('the executor must not reach the network');};
  try{
    // The area is a required input, not a filter: the node answers "which facilities are in my
    // study area", so there is no form of it that runs without one.
    const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Facilities',
      nodes:[{id:'area',type:'area',x:0,y:0,
        params:{label:'Study area',source:'drawn',selectionMode:'polygon',geometry:AREA}},
        node({data:{type:'FeatureCollection',features:[{type:'Feature',id:'node/1',
          properties:{name:'Ospital ng Maynila',kind:'hospital'},
          geometry:{type:'Point',coordinates:[120.98,14.57]}}]},
        retrieved:{source:'openstreetmap-live',sourceLabel:'OpenStreetMap, live query',
          licence:'ODbL-1.0',licenceIRI:'https://opendatacommons.org/licenses/odbl/1-0/',
          sourceIRI:'https://www.openstreetmap.org/copyright',
          attribution:'© OpenStreetMap contributors',origin:'https://overpass-api.de',
          kept:1,dropped:{kind:0,coordinates:0,name:0},at:'2026-10-09T00:00:00.000Z',scope:'study area'}}),
        {id:'map',type:'map_output',x:300,y:0,params:{label:'Facilities',inputMode:'spatial'}}],
      edges:[{id:'e1',from:'area',to:'hf',port:'area'},
        {id:'e2',from:'area',to:'map',port:'area'},
        {id:'e3',from:'hf',to:'map',port:'points'}]};
    const run=await executeWorkflow(workflow,async()=>[
      {subject:'urn:fieldwork:area:area',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}]);
    assert.ok(run.receipts.length,'the run completed from stored facilities');
    assert.equal(attempts,0,'no request was attempted');
  }finally{globalThis.fetch=original;}
});

test('a workflow saved with the excluded healthsites node still opens',()=>{
  const workflow={nodes:[{id:'hs',type:'healthsites_discovery',x:0,y:0,
    params:{label:'Find healthsites facilities',credentialRef:'healthsites-personal',
      country:'Philippines',useArea:true,kinds:['hospital','clinic'],
      data:{type:'FeatureCollection',features:[]},retrieved:{filename:'f.geojson'}}}]};
  migrateHealthsitesNodes(workflow);
  const migrated=workflow.nodes[0];
  assert.equal(migrated.type,'find_health_facilities');
  assert.equal(migrated.params.source,'openstreetmap-live','a source a browser can actually reach');
  assert.deepEqual(migrated.params.kinds,['hospital','clinic'],'the configuration worth keeping is kept');
  assert.equal(migrated.params.country,'PHL','a free-text country name is not guessed into a code');
  // Relabelling a hand-back of an unseen file as an OpenStreetMap retrieval would be a false
  // provenance record, so the facilities are not carried over.
  assert.equal(migrated.params.data,null);
  assert.equal(migrated.params.retrieved,null);
  assert.doesNotThrow(()=>validateFindHealthFacilitiesNode(migrated));
});
