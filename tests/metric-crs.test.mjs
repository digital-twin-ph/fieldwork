import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {CRS84_IRI,crsIRIFromName,epsgName,crsIRI,metricChoices,workflowMetricCRS,METRIC_NODE_TYPES} from '../build/metric-crs.js';
import {learnBlock,ZONE_PAGE} from '../build/dive-deeper.js';
import {MANUAL_PAGES} from '../build/manual.js';
import {TYPES} from '../build/core.js';
import {executeWorkflow,validateWorkflow} from '../build/core.js';
import {readFileSync} from 'node:fs';
import {johnSnowExample} from '../build/john-snow.js';
import {geoprivacyExample} from '../build/geoprivacy-example.js';
import {syncProjectManifest} from '../build/project-manifest.js';

const ready=async()=>[{subject:'urn:fieldwork:area:study',predicate:'urn:fieldwork:readyForSpatialAnalysis',object:'true'}];
const run=async workflow=>{const w=JSON.parse(JSON.stringify(workflow));syncProjectManifest(w);
  return executeWorkflow(validateWorkflow(w),ready);};
// The examples that execute on a stub reasoner. The heat, old-naledi and coverage examples each
// need a real reasoner to clear their input contract, so no unit test runs them end to end; they
// are covered by their own tests and by the browser suite.
const EXAMPLES=[['snow-voronoi',johnSnowExample('snow-voronoi')],
  ['snow-isochrone',johnSnowExample('snow-isochrone')],['snow-geoprivacy',geoprivacyExample()]];
// A receipt's own class says it computed in degrees, which survives renaming a node.
const GEOGRAPHIC_CLASSES=['urn:fieldwork:PolygonClipping','urn:fieldwork:PolygonPointSummary'];

// Every projected CRS a receipt may claim. A metric CRS is a UTM zone; nothing else measures in
// metres here, so this set is the whole legitimate vocabulary for fw:metricCRS.
const PROJECTED=new Set([...Array(60).keys()].flatMap(i=>
  [epsgName({zone:i+1,hemisphere:'north'}),epsgName({zone:i+1,hemisphere:'south'})]));

test('a CRS short name maps to one IRI however it is spelled',()=>{
  // Three spellings of the same frame. Before crsIRIFromName they reached the receipts verbatim,
  // so a query joining on the CRS saw three projections where there is one.
  for(const name of ['CRS84','OGC:CRS84','crs84','EPSG:4326'])
    assert.equal(crsIRIFromName(name),CRS84_IRI,name);
  assert.equal(crsIRIFromName('EPSG:32630'),crsIRI({zone:30,hemisphere:'north'}));
  assert.equal(crsIRIFromName('EPSG:32734'),'http://www.opengis.net/def/crs/EPSG/0/32734');
  for(const bad of ['','  ','WGS84','EPSG:','EPSG:abc','urn:ogc:def:crs:EPSG::32630'])
    assert.equal(crsIRIFromName(bad),null,JSON.stringify(bad));
});

test('a workflow that measures in two projections is refused by name',()=>{
  const w=JSON.parse(JSON.stringify(geoprivacyExample()));
  const metric=metricChoices(w);
  assert.ok(metric.length>=2,`expected at least two metric widgets, found ${metric.length}`);
  assert.deepEqual(workflowMetricCRS(w),metric[0].choice);
  // Disagree with the first one and the refusal must name both widgets and both projections.
  const other=metric[0].choice.hemisphere==='north'?'south':'north';
  metric[1].node.params.hemisphere=other;
  assert.throws(()=>workflowMetricCRS(w),error=>{
    assert.match(error.message,/2 different projections/);
    for(const {node,choice} of metric.slice(0,2)){
      assert.ok(error.message.includes(node.id),`names ${node.id}`);
      assert.ok(error.message.includes(node.type),`names ${node.type}`);
    }
    assert.ok(error.message.includes(epsgName(metric[0].choice)));
    return true;
  });
});

test('no receipt claims a geographic frame as its metric CRS',async()=>{
  // The defect this test exists for: clip_polygons and summarize_polygons compute in degrees and
  // were writing fw:metricCRS "OGC:CRS84" -- a geographic CRS under a predicate meaning projected.
  // A reader asking "what did this run measure in?" was answered "degrees", which is not a measure.
  let checked=0,conformsSeen=0;
  for(const [key,workflow] of EXAMPLES){
    const {receipts}=await run(workflow);
    for(const receipt of receipts||[]){
      if(!receipt?.facts)continue;
      let quads;try{quads=new Parser().parse(receipt.facts);}catch(error){
        assert.fail(`${key}/${receipt.nodeId}: receipt is not parseable N3: ${error.message}`);}
      for(const q of quads){
        if(q.predicate.value==='urn:fieldwork:metricCRS'){
          checked++;
          assert.ok(PROJECTED.has(q.object.value),
            `${key}/${receipt.nodeId} claims fw:metricCRS ${JSON.stringify(q.object.value)}, which measures no distance`);
        }
        if(q.predicate.value==='http://purl.org/dc/terms/conformsTo'&&q.object.value.includes('/def/crs/')){
          conformsSeen++;
          assert.match(q.object.value,/^http:\/\/www\.opengis\.net\/def\/crs\/(OGC\/1\.3\/CRS84|EPSG\/0\/\d{4,5})$/,
            `${key}/${receipt.nodeId} states a CRS IRI no registry resolves`);
        }
      }
    }
  }
  assert.ok(checked>0,'no receipt asserted fw:metricCRS; the check proved nothing');
  assert.ok(conformsSeen>0,'no receipt stated a CRS IRI; the frame is unqueryable');
});

test('a geographic operation states CRS84 and claims no metric CRS',async()=>{
  const {receipts}=await run(johnSnowExample('snow-voronoi'));
  let geographic=0;
  for(const receipt of receipts||[]){
    if(!receipt?.facts)continue;
    const quads=new Parser().parse(receipt.facts);
    if(!quads.some(q=>GEOGRAPHIC_CLASSES.includes(q.object.value)))continue;
    geographic++;
    assert.equal(quads.filter(q=>q.predicate.value==='urn:fieldwork:metricCRS').length,0,
      `${receipt.nodeId} works in degrees and may not claim a metric CRS`);
    assert.deepEqual(quads.filter(q=>q.predicate.value==='http://purl.org/dc/terms/conformsTo')
      .map(q=>q.object.value),[CRS84_IRI],`${receipt.nodeId} must state the frame it did work in`);
  }
  assert.equal(geographic,2,'expected the clip and the summary to be the geographic operations');
});

test('every widget with a zone knob is a metric widget, and every metric widget explains it',()=>{
  // The authoritative list of widgets that take a projection is the params type in src/types.ts,
  // not a list anyone maintains by hand. Read it, because METRIC_NODE_TYPES is maintained by hand
  // and the two had no mechanical reason to agree: a tenth zone-taking widget added to types.ts
  // and forgotten here would escape the one-projection refusal entirely.
  const types=readFileSync(new URL('../src/types.ts',import.meta.url),'utf8');
  const zoned=[...types.matchAll(/^  ([a-z_]+):\{[^\n]*\bzone:number\b/gm)].map(m=>m[1]);
  // A RETIRED widget keeps its params type so a saved workflow naming it can be read and rewritten; it never runs, so it
  // projects nothing (reproject, 2026-11-22).
  const retired=new Set(JSON.parse(readFileSync(new URL('../widgets/classification.json',import.meta.url),'utf8')).widgets
    .filter(w=>w.retired).map(w=>w.nodeType));
  zoned.splice(0,zoned.length,...zoned.filter(t=>!retired.has(t)));
  assert.ok(zoned.length>0,'found no widget with a zone knob; the check proved nothing');
  assert.deepEqual([...zoned].sort(),[...METRIC_NODE_TYPES].sort(),
    'src/types.ts and METRIC_NODE_TYPES disagree about which widgets take a projection');
  // And the explanation reaches every one of them: the manual's page on the zone, from the learn block (the practitioner's
  // rule of 2026-10-13; a manual page from 2026-11-26, when Dive Deeper was deferred and the lab's section taken out).
  const esc=v=>String(v);
  for(const type of METRIC_NODE_TYPES)
    assert.match(learnBlock(type,esc,''),/id="open-zone-manual"/,`${type} projects but offers no explanation of the zone`);
  assert.doesNotMatch(learnBlock('table_input',esc,''),/open-zone-manual/,'a widget that projects nothing must not claim to');
});

test('the UTM zone page exists, names every widget that projects, and says what the choice costs',()=>{
  const page=MANUAL_PAGES[ZONE_PAGE];
  assert.ok(page,`${ZONE_PAGE} is not compiled into the manual`);
  for(const type of METRIC_NODE_TYPES)
    assert.ok(page.includes(TYPES[type].title),`the zone page does not name ${TYPES[type].title}`);
  for(const required of ['60 zones','0.6%','same zone in every step','cannot be mixed'])
    assert.ok(page.includes(required),`the zone page never says "${required}"`);
});

test('a run is refused when the widgets that will execute disagree, and a stray draft is not a run',async()=>{
  // The refusal moved from validateWorkflow to executionPlan on 2026-10-13 because on every edit
  // it made all eight metric widgets unaddable. These two checks are what keeps that move from
  // having quietly disabled it.
  const w=JSON.parse(JSON.stringify(geoprivacyExample()));
  const metric=metricChoices(w);
  metric[1].node.params.hemisphere=metric[0].choice.hemisphere==='north'?'south':'north';
  syncProjectManifest(w);   // after the edit: the manifest is over the nodes as they now stand
  await assert.rejects(()=>executeWorkflow(validateWorkflow(w),ready),/2 different projections/,
    'a run whose metric widgets disagree must be refused');

  // But a disagreeing draft that nothing connects is not part of the run and may not refuse it.
  const clean=JSON.parse(JSON.stringify(geoprivacyExample()));
  const first=metricChoices(clean)[0];
  clean.nodes.push({...JSON.parse(JSON.stringify(first.node)),id:'stray-draft',x:9000,y:9000,
    params:{...JSON.parse(JSON.stringify(first.node.params)),label:'Stray draft',
      hemisphere:first.choice.hemisphere==='north'?'south':'north'}});
  syncProjectManifest(clean);
  const run=await executeWorkflow(validateWorkflow(clean),ready);
  assert.ok(run.receipts.length>0,'the run must still complete with an unconnected disagreeing draft on the canvas');
});
