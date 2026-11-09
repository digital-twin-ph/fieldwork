// Exports validation fixtures for the accompanying Validation Lab.
// Data crosses one way only: Fieldwork exports, the lab reads and recomputes from
// declaredParameters alone. See docs/experiments/41-validation-lab.md.
//
// Usage: node scripts/export-validation-fixture.mjs <fixtureId> <outputDir>
//        fixtureId: reproject-utm35s-001 | project-forward-utm30n-001 | clip-all-touched-001
//                   | deduplicate-facilities-001
//                   | measure-area-001 | mean-center-001
//                   | reachability-soho-001 | corridor-soho-001
//                   | relate-snow-001 | relate-spelling-sl-001 | boundary-repair-001 | group-snow-001 | group-shares-snow-001 | area-join-snow-001
//                   | select-range-london-001
//                   | regression-salmonella-001 | regression-nyc-001 (needs NYC_PKG)
//                   | sample-satellite-s5p-001 | lag-response-brazil-001 | regression-strata-brazil-001
//                   | lag-models-brazil-001 | sea-level-heights-manila-001 | chains-hagelloch-001
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {reprojectToCRS84,projectFromCRS84} from '../build/reproject.js';
import {clipRaster,encodeRaster} from '../build/raster.js';
import {calculateArea,AREA_METHOD} from '../build/area-computation.js';
import {computeMeanCenter} from '../build/mean-center.js';
import {snapToNetwork} from '../build/network-snap.js';
import {reachableNodes} from '../build/reachable-nodes.js';
import {johnSnowExample} from '../build/john-snow.js';
import {travelTimeBand} from '../build/travel-time-band.js';
import {reachableCorridor} from '../build/reachable-corridor.js';
import {convexHull} from '../build/convex-hull.js';
import {fillInteriorGaps} from '../build/fill-interior-gaps.js';
import {combinedArea} from '../build/combined-area.js';
import {voronoi,clipPolygons,summarizePolygons} from '../build/catchments.js';
import {stackPolygons} from '../build/stack-polygons.js';
import {bufferPoint,BUFFER_POINT_STEPS} from '../build/buffer-point.js';
import {bufferedBoundary} from '../build/area-buffer.js';
import {aggregateHex} from '../build/geoprivacy.js';
import {caseSeriesFromTable} from '../build/case-series.js';
import {relateTable,relateShape,gapSignature} from '../build/relate-table.js';
import {groupTable} from '../build/group-table.js';
import {selectRange,selectRows} from '../build/select-rows.js';
import {appendTables} from '../build/append-rows.js';
import {tableChart} from '../build/chart-output.js';
import {chartVegaSpec} from '../build/chart-vega.js';
import {fitRegression,specFrom,rowsOf,regressionTable,fitEachExposure,regressionsTable} from '../build/regression.js';
import {relateAtShifts} from '../build/relate-table.js';
import {computeRateTwoByTwo} from '../build/two-by-two-rates.js';
import {tablePoints} from '../build/table-points.js';
import {groupTable as totalWithin} from '../build/group-table.js';
import {rateTwoByTwoSentence} from '../build/two-by-two.js';
import {executeWorkflow} from '../build/core.js';
import {inspectRaster,readRasterWindow,rasterWindow} from '../build/raster.js';
import {sampleRaster} from '../build/sample-raster.js';
import {nearestPlaces,distancesAsTable,pointsAsTable} from '../build/core.js';
import {downloadFacilities} from '../build/health-facilities.js';
import {authoredSubjects} from '../build/authored-application.js';
import {evaluateAuthored,evaluatedTable} from '../build/rule-evaluation.js';
import {repairBoundary,REPAIR_RULE} from '../build/boundary-repair.js';
import {validateDrawnGeometry} from '../build/study-area.js';
import {parseCSV} from '../build/input-data.js';
import {unzipSync} from 'fflate';
import {readStata} from '../build/stata.js';
import {joinTableToAreas} from '../build/area-join.js';
import {computeRate,fromTable,rateTable as rateTableOf} from '../build/rate.js';
import {gunzipSync} from 'node:zlib';
import {deduplicatePoints,jaroWinkler,normaliseName} from '../build/deduplicate-points.js';
import {extentN3,extentProjection} from '../build/rule-application.js';
import {runInThisContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolveRuleset} from '../build/rulesets.js';
import {readAtPoints,OFF_SWATH_FACTOR,OFF_SWATH_FLOOR} from '../build/satellite-read.js';
import {sampleTable,readerFor} from '../build/satellite-sample.js';
import {FILL} from '../build/satellite-pixels.js';
import h5wasm from 'h5wasm/node';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// The reasoner in node, the same engine and version the browser worker runs. `vendor/eye-21.1.24.js`
// is a webpack bundle assigning to `var eyereasoner`, so `runInThisContext` puts it in scope --
// the technique scripts/export-ruleset-fixture.mjs established on 2026-10-12. A fixture that
// recorded a classification without running the reasoner would be recording an assumption.
globalThis.self=globalThis;
runInThisContext(readFileSync(new URL('../vendor/eye-21.1.24.js',import.meta.url),'utf8'),{filename:'eye-21.1.24.js'});
const reasonFixture=async input=>(await eyereasoner.n3reasoner(input,undefined,{outputType:'quads'}))
  .map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}));

const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const registry=JSON.parse(await readFile(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const widgetOf=nodeType=>registry.widgets.find(w=>w.nodeType===nodeType);
const sha256=data=>createHash('sha256').update(data).digest('hex');
const MAX_ROWS_SALMONELLA=20000,MAX_ROWS_NYC=20000;

/** JSON with every object's keys sorted and no whitespace.
 *
 *  The fixture's integrity is taken over this rather than over the file's bytes, because
 *  byte identity does not survive the transport the lab actually uses: JupyterLite serves a
 *  `.json` as parsed JSON and the kernel reads a re-serialised form — 2,724 bytes on disk
 *  arrived as 1,926 — so a digest of the file could never match. Measured 2026-10-11, when
 *  six of seven notebooks were found to fail in the browser for this reason and for the
 *  sidecar it depended on.
 *
 *  Python's `json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)`
 *  produces the same string, which is what the lab recomputes. Arrays keep their order:
 *  only object keys are sorted. */
const canonical=value=>JSON.stringify(value,(_key,inner)=>
  inner&&typeof inner==='object'&&!Array.isArray(inner)
    ?Object.fromEntries(Object.keys(inner).sort().map(key=>[key,inner[key]]))
    :inner);
const canonicalDigest=value=>sha256(Buffer.from(canonical(value),'utf8'));
const base=(id,nodeType,label,implementation)=>({
  schema:'fieldwork/validation-fixture/1',fixtureId:id,exportedAt:new Date().toISOString(),
  application:{name:'Fieldwork',version},
  operation:{widget:widgetOf(nodeType).id,release:widgetOf(nodeType).currentVersion,label,implementation}
});


/** The Soho corridors the isochrone chain produces, per band, which is the layer the two
 *  summarising widgets below actually receive in the John Snow example. Corridors retain
 *  their interior holes, so this is the only layer in the project that exercises a hole. */
const sohoCorridors=minutesList=>{
  const example=johnSnowExample('snow-isochrone');
  const network=example.nodes.find(n=>n.type==='network_input').params.data;
  const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
  const zone=30,hemisphere='north',speedMPerMin=75,bufferM=25,direction='outbound';
  const snapped=snapToNetwork(pumps,network,{id:'snap',type:'snap_to_network',x:0,y:0,
    params:{label:'Snap to street network',zone,hemisphere,maxSnapM:100}},'fixture','pumps');
  const reached=reachableNodes(snapped.value,network,{id:'reach',type:'reachable_nodes',x:0,y:0,
    params:{label:'Reachable junctions',minutes:Math.max(...minutesList),speedMPerMin,direction,
      travelMode:'walking'}},'fixture','snap');
  return {zone,hemisphere,bufferM,speedMPerMin,direction,
    layers:minutesList.map(minutes=>{
      const banded=travelTimeBand(reached.value,{id:'band',type:'travel_time_band',x:0,y:0,
        params:{label:`Within ${minutes} minutes`,minutes}},'fixture','reach');
      return reachableCorridor(banded.value,network,{id:'corridor',type:'reachable_corridor',x:0,y:0,
        params:{label:`Reachable corridor ${minutes} min`,bufferM,zone,hemisphere}},'fixture','band').value;
    })};
};

/** The John Snow Voronoi chain as the example runs it: nearest-pump cells, clipped to the
 *  reporting rectangle, then the death locations counted inside them. Two widgets are checked
 *  from this one chain, and both receive exactly what a practitioner opening the example sees. */
const sohoVoronoiChain=()=>{
  const example=johnSnowExample('snow-voronoi');
  const node=id=>example.nodes.find(n=>n.id===id);
  const pumps=node('pumps').params.data,deaths=node('locations').params.data;
  const boundary=node('study').params.geometry;
  const zone=30,hemisphere='north';
  const cells=voronoi(pumps,boundary,zone,hemisphere);
  const clipped=clipPolygons(cells,boundary);
  const summarised=summarizePolygons(clipped,deaths,node('summary').params);
  return {pumps,deaths,boundary,zone,hemisphere,cells,clipped,summarised,
    summaryParams:node('summary').params};
};

/** SNOW'S TWO TABLES, out of the worked example rather than retyped here.
 *
 *  The subject of checks 28 and 29 is the step a reader of the South London example actually
 *  runs, so the input has to be that example's own data: Table VIII (32 sub-districts x two
 *  measures, 64 long rows) as the left table, and Table XII (one row per sub-district, carrying
 *  the company that supplied it) as the right. The alternative -- transcribing the figures into
 *  this script -- would make the fixture a check on this file instead of on the example.
 *
 *  Read from the sibling checkout at the repository boundary, which is a LICENCE boundary: the
 *  example cannot be merged into Fieldwork, so a fixture built from it is built from a clone.
 *  Absent clone, absent fixture, said plainly rather than silently substituted.
 */
const southLondonTables=()=>{
  const path=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
  let bundle;
  try{bundle=JSON.parse(gunzipSync(readFileSync(path)));}
  catch{throw new Error('example-1855-cholera-south-london is not checked out beside this repository, '
    +'and these fixtures are built from its tables rather than from figures retyped here. '
    +'Clone it at ../example-1855-cholera-south-london and run this again.');}
  // FOUND BY NAME, BECAUSE A KEY IS MINTED AND A NAME IS CHOSEN.
  //
  // These three fixtures resolved `south-london/contingency` and `south-london/choropleth` until
  // 2026-10-31, when all three stopped building: the pinned bundle's keys had become
  // `snow-s-south-london-water-supply-study-1854-4/w1` through `/w8`. Nothing was renamed. The
  // eighth workflow was built BY HAND from the palette, per the standing rule that a worked
  // example must be reproducible that way, and the rebuilt bundle therefore carries the keys the
  // APPLICATION mints rather than the ones an earlier scripted bundle carried.
  //
  // `mintWorkflowKey` (app.ts) is the only thing that makes a workflow key and it makes exactly
  // `${projectId}/w${n}`. So a semantic key is not something a practitioner can produce, and a
  // fixture that resolves one is pinned to a bundle no hand-built example can reproduce. Worse,
  // the project id carries a dedupe counter -- the `-4` above -- so the key changes again the next
  // time the project is rebuilt, and a lookup by key would break on a rebuild that renamed
  // nothing.
  //
  // The name is what the practitioner wrote and what the catalog shows. It can be edited, which a
  // key cannot, so this fails loudly and lists what the checkout holds rather than resolving to
  // the wrong workflow.
  const byName=name=>{
    const found=bundle.workflows.filter(w=>w.document?.name===name);
    if(found.length===1)return found[0];
    throw new Error(`That checkout carries ${found.length===0?'no':found.length} workflow`
      +`${found.length===1?'':'s'} named "${name}". It holds: `
      +bundle.workflows.map(w=>`"${w.document?.name}"`).join(', ')
      +'. These fixtures find a workflow by the name a practitioner gave it, because a workflow '
      +'KEY is minted as `${projectId}/w${n}` and carries no meaning across a rebuild.');
  };
  const workflow=byName('Died or survived, by water supply');
  const node=id=>workflow.document.nodes.find(n=>n.id===id).params.data;
  const choropleth=byName('Deaths per 1,000 people, mapped');
  const cnode=id=>choropleth.document.nodes.find(n=>n.id===id);
  return {left:node('table-viii'),right:node('table-xii'),
    // The choropleth chain: Table VIII, the rate declared over it, and the study area's named
    // parts. The join matches on NAMES, so no geometry is needed and none travels -- which also
    // keeps a BSD-2-Clause boundary file out of a fixture that would otherwise redistribute it.
    // The choropleth has its OWN Table VIII node: 224 rows over seven measures, keyed `count`,
    // where the contingency workflow's carries 64 rows over two, keyed `people`. Same label, same
    // published table, different transcription for a different question -- so the rate has to be
    // computed over this one, not over the other.
    rateTable:cnode('table-viii').params.data,
    rateParams:cnode('mortality').params,
    joinParams:cnode('shaded').params,
    units:cnode('sub-districts').params.boundary.units,
    boundaryProvenance:(({boundaryID,source,licence,licenceSource,canonical,yearRepresented})=>
      ({boundaryID,source,licence,licenceSource,canonical,yearRepresented}))(
      cnode('sub-districts').params.boundary),
    commit:bundle.exportedAt,project:bundle.project.id};
};

/** THE SAME 32 SUBJECTS, SPELLED BY A SECOND SOURCE.
 *
 *  Snow's two tables agree with each other letter for letter, because both transcribe one book --
 *  which is why check 28 recorded that it could not reach the case a practitioner actually meets:
 *  *"St. George, Camberwell" against "St George Camberwell" is the case a practitioner will
 *  actually meet, and neither this fixture nor this check reaches it.*
 *
 *  The published sub-district boundaries are that second source, and they spell nine of the 32
 *  without their comma. Names and the supplying company only -- NO geometry, the same restraint
 *  `southLondonTables` states for the units it carries, so a BSD-2-Clause boundary file is not
 *  redistributed through a fixture. The provenance travels with the names. */
const southLondonBoundaryTable=()=>{
  const path=new URL('../../example-1855-cholera-south-london/geo/sub-districts-csds.geojson',import.meta.url);
  let collection;
  try{collection=JSON.parse(readFileSync(path,'utf8'));}
  catch{throw new Error('example-1855-cholera-south-london is not checked out beside this repository, '
    +'and the boundary spellings these cases turn on are read from its published boundary file.');}
  const rows=collection.features
    .filter(feature=>typeof feature.properties?.subdist==='string')
    .map(feature=>({key:{sub_district:feature.properties.subdist,
      supplier:String(feature.properties.supplier)},value:Number(feature.properties.pop1851)}));
  return {kind:'data-table',keys:['sub_district','supplier'],valueField:'people',
    rows,rowCount:rows.length,missingValueCount:0};
};


// GeoTIFF.js reads a Blob through the browser's FileReader; emulate only that, as tests/raster.test.mjs does.
globalThis.FileReader??=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onload({target:this});},error=>{this.error=error;this.onerror(error);});}};
const numberOr=v=>v===undefined||v===null||v===''?null:Number(v);
const encodeGrid=grid=>Buffer.from(encodeRaster(grid));
const builders={
  'hex-soho-001'(){
    // The 250 death locations grouped into H3 cells, which is what the geoprivacy example does.
    // Two things are checked and only one is arithmetic: the cell each point lands in, which is
    // h3's own indexing, and the sparse-cell rule, which is Fieldwork's.
    //
    // Two resolutions, because the example's own setting does not exercise the rule it depends
    // on. At resolution 9 all 250 deaths fall into five cells, every one of them above the
    // minimum, so nothing is dropped and the sparse rule is never reached. Resolution 11 splits
    // them far enough to produce single-point cells, which is the case that makes points vanish
    // from the output -- and the case worth checking.
    const deaths=johnSnowExample('snow-voronoi').nodes.find(n=>n.id==='locations').params.data;
    const minOccupancy=2;
    const cases=[9,11].map(resolution=>{
      const hexed=aggregateHex(deaths,{label:'H3 cell aggregation',resolution,minOccupancy});
      return {options:{resolution,minOccupancy},
        cells:hexed.features.map(f=>({h3:f.id,count:f.count,
          boundary:f.geometry.coordinates[0],centre:hexed.sites.find(s=>s.id===f.id).geometry.coordinates})),
        cellsKept:hexed.features.length,
        summary:hexed.summary,
        note:hexed.notes[0]};
    });
    return {fixture:{
      ...base('hex-soho-001','aggregate_points_to_h3_cell','Aggregate points in hexagons','src/geoprivacy.ts#aggregateHex'),
      declaredParameters:{
        computationCRS:'OGC:CRS84',minOccupancy,resolutions:[9,11],
        indexRule:'Each located point is indexed to the H3 cell containing it at the stated resolution, by latitude and longitude. The cell boundary returned is h3\u2019s own boundary for that cell.',
        sparseRule:`A cell holding fewer than ${minOccupancy} points is omitted from the output entirely rather than returned with a small count, so its points are not represented at all. The number of omitted cells is reported.`,
        orderRule:'Kept cells are ordered by their H3 index as a string.',
        semantics:'Occupancy is not an anonymity guarantee. A minimum of two means no cell in the output holds exactly one point; it does not mean an individual cannot be identified from a cell plus anything else a reader knows.'
      },
      input:{points:deaths.features.map(f=>({id:String(f.id),
        coordinates:f.geometry?f.geometry.coordinates:null}))},
      output:{cases},
      note:'For each case, index every point to its H3 cell with h3-py, count per cell, apply the minimum-occupancy rule, and compare the cells kept, their counts, boundaries and centres, and how many points the rule dropped.'
    },files:{}};
  },
  'case-series-soho-001'(){
    // Snow 1855 Table 1: deaths by date, 43 daily rows, which the epidemic curve in the John
    // Snow example renders. The widget bins a weighted table by period, and the three periods
    // are checked because they are three different calendar rules -- a day key, a month key,
    // and the Monday of the ISO week -- and the week is the one most likely to be wrong.
    const table=johnSnowExample('snow-voronoi').nodes.find(n=>n.id==='dates').params.data;
    const dateField='date',dateKind='death';
    const byPeriod=Object.fromEntries(['day','week','month'].map(period=>{
      const series=caseSeriesFromTable(table,{dateField,dateKind,period});
      return [period,{bins:series.bins.map(b=>({key:b.key,count:b.count})),total:series.total,
        datedRecords:series.datedRecords,undatedRecords:series.undatedRecords}];
    }));
    return {fixture:{
      ...base('case-series-soho-001','case_series','Cases by period','src/case-series.ts#caseSeries'),
      declaredParameters:{
        dateField,dateKind,weightField:table.valueField,
        periods:['day','week','month'],
        dateRule:'A date is read only as ISO yyyy-mm-dd and is checked against the calendar, so 2024-02-30 is undated rather than rolled forward. Anything unparseable is counted as an undated record and reported, never guessed.',
        keyRule:'A day is keyed yyyy-mm-dd, a month yyyy-mm, and a week by the Monday of its ISO week as yyyy-mm-dd, so the key\u2019s order is the period\u2019s order.',
        weightRule:'Each row contributes its value in the weight field, not 1. A weight that is not a number of at least zero is refused rather than treated as zero.',
        fillRule:'Every period between the first and the last is present, including those with no cases. An epidemic curve with gaps omitted misreads as continuous.',
        semantics:`The declared kind of date is part of the result: a curve by date of ${dateKind} is not a curve by date of onset, and the widget carries the kind so a chart cannot relabel it.`
      },
      input:{rows:table.rows.map(r=>({date:r.key[dateField],deaths:r.value}))},
      output:byPeriod,
      note:'Bin the same rows by day, week and month with pandas, weighting by the deaths column, filling empty periods, and compare every bin key and count, the totals, and the dated and undated record counts.'
    },files:{}};
  },
  'deduplicate-facilities-001'(){
    // Cross-source record linkage, which no worked example exercises: this widget is on the
    // weakest evidence rung and has never been recomputed by anything outside this repository.
    //
    // THE RECORDS ARE CONSTRUCTED, not downloaded, and that is the right choice here even though
    // the release says the thresholds want real OSM and Overture data. A parity check asks whether
    // the algorithm computes what it says it computes, and that needs every branch to fire at
    // least once -- a match on both comparisons, a match on each one alone, a pair neither
    // reaches, a pair blocking never offers, a name that is missing, a record with no location,
    // a same-source pair, and the cluster rule refusing a second record from one source. Real
    // downloaded records exercise whichever of those they happen to contain, and the question of
    // what the thresholds SHOULD be is a different question that needs labelled ground truth
    // nobody has. That question is named in the note and left open rather than answered badly.
    //
    // NO PAIR SITS NEAR A DISTANCE THRESHOLD. The widget measures on a sphere (haversine,
    // R=6371.0088 km), an independent implementation will measure a geodesic, and the two
    // disagree by up to about 0.56% (experiment 101). Every distance below is at least 10 m clear
    // of 50 m and of 500 m, so that disagreement cannot flip a classification and the
    // classifications can be compared exactly while the metres are compared within a tolerance.
    const origin=[120.9842,14.5995];
    // Metres east and north of the base, converted at this latitude only. The exporter is not
    // claiming these are exact: it prints the measured distance for every pair it builds.
    const at=(east,north)=>[origin[0]+east/(111320*Math.cos(origin[1]*Math.PI/180)),origin[1]+north/110574];
    const feature=(id,name,coordinates)=>({type:'Feature',id,
      properties:name===null?{kind:'clinic'}:{name,kind:'clinic'},
      geometry:coordinates?{type:'Point',coordinates}:null});
    const layers=[
      {sourceNodeId:'osm',label:'OpenStreetMap',features:[
        feature('osm-1','Ospital ng Maynila Medical Center',at(0,0)),
        // Same source as osm-1 and 20 m from it: a layer's duplicates of itself are never
        // compared, and the counts have to show that rather than leave it assumed.
        feature('osm-2','Ospital ng Maynila Medical Center Annex',at(20,0)),
        feature('osm-3',"St. Mary's Clinic",at(400,0)),
        feature('osm-4','Mercury Drug Clinic',at(0,900)),
        // No name at all: a missing value contributes zero, which is not the same as disagreeing.
        feature('osm-5',null,at(400,900)),
        // Beyond the blocking distance from everything in the other layer.
        feature('osm-6','Barangay Health Station 12',at(2000,2000)),
        // No location: never a candidate, carried through untouched, still counted as input.
        feature('osm-7','Pasay City Clinic',null)]},
      {sourceNodeId:'overture',label:'Overture Places',features:[
        // Name abbreviated, 18 m away: both comparisons agree.
        feature('ovt-1','Ospital ng Maynila Med Ctr',at(18,0)),
        // The same place again from the same source, also within the near distance. One of the
        // two merges and the other is refused: a cluster holds at most one record per source.
        feature('ovt-2','Ospital ng Maynila Medical Center',at(0,30)),
        // Punctuation only: agrees on name after normalisation, and on distance.
        feature('ovt-3','St Marys Clinic',at(400,22)),
        // The same name 300 m away: the name agrees, the distance does not.
        feature('ovt-4',"St. Mary's Clinic",at(400,-300)),
        // A different place 15 m from osm-4: the distance agrees, the name does not.
        feature('ovt-5','Rizal Memorial Coliseum',at(0,915)),
        // Neither comparison agrees, and blocking still offered the pair.
        feature('ovt-6','Manila Doctors Hospital',at(0,1250)),
        // 12 m from the unnamed osm-5: nothing to compare the name against.
        feature('ovt-7','Health Center',at(412,900))]}];
    const params={nameField:'name',nameMatch:'fuzzy',fuzzyThreshold:0.88,
      blockDistanceM:500,nearDistanceM:50,matchThreshold:2,reviewThreshold:1};
    const result=deduplicatePoints(layers,params);
    // Published Jaro-Winkler values, carried so the notebook can check the string comparison
    // directly rather than only through the pipeline. `martha`/`marhta` is 0.961 and
    // `dwayne`/`duane` is 0.840 in the literature; the prefix adjustment has three parameters
    // and any of them can be wrong while the pipeline still looks plausible.
    const namePairs=[['martha','marhta'],['dwayne','duane'],['dixon','dicksonx'],
      ['jones','johnson'],['abcvwxyz','cabvwxyz'],['',''],['a','a']];
    return {fixture:{
      ...base('deduplicate-facilities-001','deduplicate_points','Deduplicate point records',
        'src/deduplicate-points.ts#deduplicatePoints'),
      declaredParameters:{...params,
        distanceRule:'Great-circle (haversine) on a sphere of radius 6371.0088 km, in metres. A geodesic will differ by up to about 0.56%; every pair here is at least 10 m clear of both distance thresholds so no classification turns on that difference.',
        blockingRule:'Only pairs within blockDistanceM are compared. Every other pair is counted as blocked and never compared.',
        sourceRule:'Cross-source only. Two records from the same layer are neither compared nor counted as blocked.',
        normalisationRule:'NFKC, trimmed, lower case. Fuzzy comparison also replaces every run of characters that are neither letters nor numbers with one space, so punctuation and spacing stop being a disagreement.',
        nameRule:'Fuzzy: Jaro similarity with the Winkler prefix adjustment -- prefix at most 4 characters, scaling 0.1, applied only when the Jaro similarity exceeds 0.7 -- and the name agrees when that value is at least fuzzyThreshold. A name missing on either side is not comparable: similarity is absent, and the comparison contributes zero rather than agreeing or disagreeing.',
        scoreRule:'Two binary contributions, not a blended score: the name agreement and the near agreement each contribute 1 or 0. A similarity of 0.87 against a threshold of 0.88 contributes nothing rather than 0.87.',
        classRule:'At or above matchThreshold the pair is a match; at or above reviewThreshold it waits for a person; below that it is not a match. Three classes, not merge-or-not.',
        clusterRule:'Matched pairs are accepted in order of score descending, then distance ascending, then key. A cluster holds at most one record from each source: an edge that would add a second is refused and the pair stays reported as a match that did not merge. A pair in the review band merges only when a person decides, and no decision is supplied here.',
        outputRule:'One record per cluster, the first of the cluster kept, carrying mergedFrom when it stands for more than one. Records with no usable location were never candidates and are carried through untouched.'},
      input:{layers:layers.map(l=>({sourceNodeId:l.sourceNodeId,label:l.label,
        features:l.features.map(f=>({id:f.id,name:f.properties.name??null,
          coordinates:f.geometry?f.geometry.coordinates:null}))})),
        namePairs:namePairs.map(([a,b])=>({a,b}))},
      output:{
        counts:{inputCount:result.inputCount,compared:result.compared,blocked:result.blocked,
          matched:result.matched,awaiting:result.awaiting,merged:result.merged,
          outputRecords:result.collection.features.length},
        candidates:result.candidates.map(c=>({key:c.key,
          a:{sourceNodeId:c.a.sourceNodeId,id:c.a.id,name:c.a.name},
          b:{sourceNodeId:c.b.sourceNodeId,id:c.b.id,name:c.b.name},
          metres:c.metres,nameSimilarity:c.nameSimilarity,nameAgrees:c.nameAgrees,
          nearAgrees:c.nearAgrees,score:c.score,classification:c.classification})),
        records:result.collection.features.map(f=>({id:f.id,
          name:(f.properties).name??null,
          mergedFrom:(f.properties).mergedFrom??null})),
        normalisedNames:layers.flatMap(l=>l.features.filter(f=>f.properties.name!==undefined)
          .map(f=>({id:f.id,exact:normaliseName(f.properties.name,'exact'),
            fuzzy:normaliseName(f.properties.name,'fuzzy')}))),
        nameSimilarities:namePairs.map(([a,b])=>({a,b,similarity:jaroWinkler(a,b)}))},
      note:"Recompute the linkage from the two layers and the declared parameters with an independent Jaro-Winkler (jellyfish) and an independent distance (a WGS84 geodesic), and compare: every published name similarity, the normalised form of every name, the two agreements and the class of every pair, the blocked and compared counts, the refusal by the cluster rule of a second record from one source, and the output record set with its mergedFrom. What this cannot establish is what the thresholds should be: that needs records whose true identity is known, and these are constructed."
    },files:{}};
  },
  'snap-soho-001'(){
    // The pumps snapped to the Soho street network, which is the first step of the isochrone
    // chain. A snap is a nearest-neighbour search and a distance, both exact: there is no
    // tolerance to argue about and a disagreement would be a disagreement about the projection
    // or about which node is nearest.
    //
    // The network travels in full because a nearest node cannot be recomputed from a summary.
    // Node coordinates are what the search uses; edges travel so a reader can see the graph the
    // later steps traverse, and are unused here.
    // Eight pumps rather than the isochrone example's one: a nearest-node search over a single
    // site exercises almost nothing, and the Voronoi example carries the full set from the same
    // source. The network comes from the isochrone example, which is the only one that has one.
    const example=johnSnowExample('snow-isochrone');
    const network=example.nodes.find(n=>n.type==='network_input').params.data;
    const pumps=johnSnowExample('snow-voronoi').nodes.find(n=>n.id==='pumps').params.data;
    const zone=30,hemisphere='north',maxSnapM=150;
    const snapped=snapToNetwork(pumps,network,{id:'snap',type:'snap_to_network',x:0,y:0,
      params:{label:'Snap to street network',zone,hemisphere,maxSnapM}},'fixture','pumps');
    const facts=snapped.receipt.facts,number=name=>Number(new RegExp(`fw:${name} (-?[0-9.]+)`).exec(facts)[1]);
    return {fixture:{
      ...base('snap-soho-001','snap_to_network','Snap sites to the network','src/network-snap.ts#snapToNetwork'),
      declaredParameters:{
        zone,hemisphere,metricCRS:'EPSG:32630',maxSnapM,
        rule:'For each site, the network node at the smallest Euclidean distance in the metric CRS. A site further than maxSnapM from every node is refused rather than snapped.',
        semantics:'Snapping moves the site. Everything downstream starts from the junction, not from where the site actually is, and the distance moved is reported for that reason: a pump 40 m from the nearest junction is being modelled as if it stood at the junction.',
        tieNote:'Two nodes exactly equidistant would make the choice arbitrary. Whether that occurs in this fixture is part of the check.'
      },
      input:{
        sites:pumps.features.map(f=>({id:String(f.id),name:f.properties.name,
          coordinates:f.geometry.coordinates})),
        network:{source:network.source,
          nodes:network.nodes.map(n=>({id:n.id,coordinates:n.coordinates})),
          edges:network.edges.map(e=>({from:e.from,to:e.to,lengthM:e.lengthM}))}},
      output:{
        snapped:snapped.value.features.map(f=>({id:String(f.id),
          networkNodeId:f.properties.networkNodeId,
          snapDistanceM:f.properties.snapDistanceM,
          coordinates:f.geometry.coordinates})),
        siteCount:number('siteCount'),
        snappedNodeCount:number('snappedNodeCount'),
        greatestSnapDistanceMetres:number('greatestSnapDistanceMetres')},
      note:'Project the sites and the network nodes, find each site\u2019s nearest node, and compare the node chosen, the distance moved, and the returned position.'
    },files:{}};
  },
  'band-soho-001'(){
    // The five minute band taken from a fifteen minute traversal. Selecting the junctions whose
    // remaining budget falls in a band is an exact threshold test, so what is really being
    // checked is whether the widget computes the band budget from the speed the junctions
    // carry -- it restates neither the speed nor the direction, which is the design claim.
    const example=johnSnowExample('snow-isochrone');
    const network=example.nodes.find(n=>n.type==='network_input').params.data;
    const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
    const zone=30,hemisphere='north',speedMPerMin=75,minutes=5,traversalMinutes=15;
    const snapped=snapToNetwork(pumps,network,{id:'snap',type:'snap_to_network',x:0,y:0,
      params:{label:'Snap to street network',zone,hemisphere,maxSnapM:100}},'fixture','pumps');
    const reached=reachableNodes(snapped.value,network,{id:'reach',type:'reachable_nodes',x:0,y:0,
      params:{label:'Reachable junctions',minutes:traversalMinutes,speedMPerMin,direction:'outbound',
        travelMode:'walking'}},'fixture','snap');
    const banded=travelTimeBand(reached.value,{id:'band',type:'travel_time_band',x:0,y:0,
      params:{label:`Within ${minutes} minutes`,minutes}},'fixture','reach');
    const facts=banded.receipt.facts,number=name=>Number(new RegExp(`fw:${name} (-?[0-9.]+)`).exec(facts)[1]);
    return {fixture:{
      ...base('band-soho-001','travel_time_band','Travel time band','src/travel-time-band.ts#travelTimeBand'),
      declaredParameters:{
        bandMinutes:minutes,traversalMinutes,speedMPerMin,
        rule:'The band budget is minutes x speed. A junction is in the band when the distance already travelled to it is at most that budget. Its remaining budget is recomputed against the band, not carried over from the traversal.',
        inheritanceRule:'The speed and the direction are read from the junctions, not restated as parameters, so a band cannot disagree with the traversal that produced it.',
        semantics:'A band is nested, not a ring: the five minute band contains everything within five minutes, including everything within two.'
      },
      input:{
        junctions:reached.value.features.map(f=>({networkNodeId:f.properties.networkNodeId,
          travelMetres:f.properties.travelMetres,remainingM:f.properties.remainingM,
          assumedSpeedMetresPerMinute:f.properties.assumedSpeedMetresPerMinute??speedMPerMin,
          travelDirection:f.properties.travelDirection}))},
      output:{
        inBand:banded.value.features.map(f=>({networkNodeId:f.properties.networkNodeId,
          remainingM:f.properties.remainingM,bandMinutes:f.properties.bandMinutes})),
        bandBudgetMetres:number('bandBudgetMetres'),
        traversalBudgetMetres:number('traversalBudgetMetres'),
        junctionsOffered:number('junctionsOffered'),
        junctionsInBand:number('junctionsInBand')},
      note:'Recompute the band budget from the speed the junctions carry, select the junctions within it, and compare the selection, each junction\u2019s recomputed remaining budget, and the counts.'
    },files:{}};
  },
  'buffer-point-soho-001'(){
    // 32 segments per quadrant, because this widget's edge decides membership.
    //
    // The first widget in the lab that CANNOT agree exactly with a reference, and the fixture
    // says so. What can be checked exactly is the approximation: a circle buffered with `steps`
    // segments per quadrant is a polygon of 4 x steps vertices inscribed in it, whose area is
    // (n / 2pi) sin(2pi / n) of the circle's -- theory, not a second implementation.
    const example=johnSnowExample('snow-isochrone');
    const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
    const pointId=String(pumps.features[0].id),radiusM=500;
    const point=bufferPoint(pumps,{id:'scope',type:'buffer_point',x:0,y:0,
      params:{label:'Area around a point',pointId,distanceM:radiusM}},'fixture');
    const fraction=Number(/fw:circleAreaFraction "([0-9.]+)"/.exec(point.receipt.facts)[1]);
    return {fixture:{
      ...base('buffer-point-soho-001','buffer_point','Area around a point','src/buffer-point.ts#bufferPoint'),
      declaredParameters:{
        computationCRS:'OGC:CRS84',
        projection:'Turf/JSTS local azimuthal equidistant, metres',
        stepsPerQuadrant:BUFFER_POINT_STEPS,
        radiusMetres:radiusM,
        circleRule:`A circle is approximated by a polygon of 4 x steps vertices inscribed in it. The area of such a polygon is (n / 2\u03c0) sin(2\u03c0 / n) of the circle\u2019s, which is ${(128/(2*Math.PI)*Math.sin(2*Math.PI/128)).toFixed(5)} at ${BUFFER_POINT_STEPS*4} vertices.`,
        fractionRule:'circleAreaFraction is the polygon\u2019s area divided by \u03c0r\u00b2, so it measures the approximation and not the projection.',
        semantics:'A buffered scope is a decision, not a surveyed boundary: the radius is an assumption of the question and the edge decides membership.'
      },
      input:{point:{id:pointId,name:pumps.features[0].properties.name,
        coordinates:pumps.features[0].geometry.coordinates}},
      output:{boundary:point.value.boundary,
        vertexCount:point.value.boundary.coordinates[0].length-1,
        circleAreaFraction:fraction},
      note:'Check the vertex count against 4 x steps, the reported circle-area fraction against the closed form for an inscribed polygon, and every vertex against the stated radius.'
    },files:{}};
  },
  'buffer-area-soho-001'(){
    // 8 segments per quadrant, because this widget expands a boundary that already exists
    // rather than deciding membership at an edge.
    const example=johnSnowExample('snow-isochrone');
    const boundary=example.nodes.find(n=>n.id==='study').params.geometry;
    const distanceM=500;
    const buffered=bufferedBoundary(boundary,distanceM);
    return {fixture:{
      ...base('buffer-area-soho-001','buffer_area','Buffer study area','src/area-buffer.ts#bufferedBoundary'),
      declaredParameters:{
        computationCRS:'OGC:CRS84',
        projection:'Turf/JSTS local azimuthal equidistant, metres',
        stepsPerQuadrant:8,
        distanceMetres:distanceM,
        semantics:'The buffered boundary is the acquisition extent, not the reporting extent. It exists so that a network or raster fetched for the study area reaches past its edge.',
        toleranceNote:'An exact match is not available. Turf buffers in a local azimuthal equidistant projection and a reference buffering in UTM uses a different one, so areas are compared relatively and the quadrant count is declared.'
      },
      input:{boundary},
      output:{boundary:buffered},
      note:'Buffer the same boundary by the same distance at the same quadrant count in a metric projection and compare the areas relatively, and check that the result contains the original.'
    },files:{}};
  },
  'voronoi-soho-001'(){
    // The eight pumps' nearest-pump cells, which is the first step of the John Snow example
    // and the one step of its chain that had no check. Fieldwork computes them by clipping a
    // rectangle with one half-plane per other site, in projected metres; the reference uses
    // GEOS. Two unrelated algorithms for the same partition.
    //
    // The envelope travels as a rule rather than as coordinates, so the check recomputes it:
    // the projected bounds of the reporting area, expanded by 100 m on each side. Handing over
    // the envelope would have left that derivation untested.
    const {pumps,boundary,zone,hemisphere,cells}=sohoVoronoiChain();
    return {fixture:{
      ...base('voronoi-soho-001','voronoi','Voronoi catchments','src/catchments.ts#voronoi'),
      declaredParameters:{
        zone,hemisphere,metricCRS:'EPSG:32630',
        envelopeRule:'Project the reporting area\u2019s bounding box corners into the metric CRS, then take the minimum and maximum easting and northing of those four points and expand by 100 m on every side.',
        algorithm:'Start from the envelope rectangle and clip it with one half-plane per other site: the set of points at least as close to this site as to that one. Euclidean distance in projected metres.',
        semantics:'A cell is the ground nearer this pump than any other, by straight-line distance in the projection. It is a model of proximity, not of which pump anybody used, and it ignores streets, walls and the river entirely.',
        envelopeNote:'Cells are finite because the envelope is. They extend past the reporting area and are clipped separately by clip_polygons.'
      },
      input:{
        boundary,
        sites:pumps.features.map(f=>({id:String(f.id),name:f.properties.name,
          coordinates:f.geometry.coordinates}))},
      output:{cells:cells.features.map(f=>({id:f.id,siteId:f.siteId,geometry:f.geometry}))},
      note:'Recompute the envelope from the boundary, partition it by nearest site, and compare each cell with the one Fieldwork reports for the same site.'
    },files:{}};
  },
  'stack-polygons-soho-001'(){
    // Three bands' corridors collected into one layer. The widget does one thing -- order the
    // polygons largest extent first, so a smaller band draws on top of a larger one -- and the
    // rule is deliberately crude: the sum of every ring's absolute shoelace area in SQUARE
    // DEGREES, holes added rather than subtracted, with no projection. It decides draw order
    // and nothing else, which is why it takes no zone, and the fixture says so explicitly so
    // that a reader does not mistake the extent for an area.
    const {layers}=sohoCorridors([2,5,10]);
    const node={id:'stack',type:'stack_polygons',x:0,y:0,params:{label:'Collected bands'}};
    const stacked=stackPolygons(layers,node,'fixture',['a','b','c']);
    const facts=stacked.receipt.facts,number=name=>Number(new RegExp(`fw:${name} (-?[0-9.]+)`).exec(facts)[1]);
    return {fixture:{
      ...base('stack-polygons-soho-001','stack_polygons','Collect polygon layers','src/stack-polygons.ts#stackPolygons'),
      declaredParameters:{
        computationCRS:'OGC:CRS84',
        rule:'Concatenate the layers, then sort the polygons by extent, largest first. Nothing is merged, clipped or reprojected, and no polygon is dropped.',
        extentRule:'Extent is the sum over every ring of a polygon -- outer and interior alike -- of the absolute shoelace area of that ring, in square degrees. Holes are added, not subtracted.',
        semantics:'Extent is a sort key, not an area. It is unprojected and it counts holes positively, so it must never be read as a measurement of ground. summarize_combined_area and summarize_hull report areas; this widget does not, which is why it takes no UTM zone.',
        identityRule:'Two polygons sharing an identifier are refused, because once collected they cannot be told apart.'
      },
      input:{layers:layers.map((layer,index)=>({layer:index+1,
        polygons:layer.features.map(f=>({id:f.id,minutes:f.minutes??null,geometry:f.geometry}))}))},
      output:{
        order:stacked.value.features.map(f=>f.id),
        polygons:stacked.value.features.map(f=>({id:f.id,minutes:f.minutes??null})),
        layerCount:number('layerCount'),
        polygonCount:number('polygonCount'),
        bandedPolygonCount:number('bandedPolygonCount')},
      note:'Concatenate the layers, compute each polygon\u2019s extent by the declared rule, sort descending, and compare the resulting order of identifiers exactly.'
    },files:{}};
  },
  'clip-polygons-soho-001'(){
    // The Voronoi cells clipped to the reporting rectangle, which is what the John Snow
    // example does between computing catchments and counting deaths in them. Cells are
    // computed in a finite envelope and extend past the rectangle, so the clip is doing real
    // work: an unclipped cell would claim ground the report does not cover.
    const {pumps,boundary,cells,clipped}=sohoVoronoiChain();
    return {fixture:{
      ...base('clip-polygons-soho-001','clip_polygons','Clip polygons','src/catchments.ts#clipPolygons'),
      declaredParameters:{
        computationCRS:'OGC:CRS84',
        rule:'Intersect every polygon with the boundary in CRS84 coordinate space. A polygon whose intersection is empty is omitted from the output rather than returned empty.',
        semantics:'Clipping changes what a polygon claims. A cell clipped to a reporting rectangle is the part of that catchment the report covers, not the catchment.',
        note:'Intersection is computed on longitude and latitude directly, not in a metric projection. For a 1.4 km rectangle at 51.5 degrees north the difference is not visible; for a continental boundary it would be.'
      },
      input:{
        boundary,
        polygons:cells.features.map(f=>({id:f.id,siteId:f.siteId,geometry:f.geometry}))},
      output:{
        polygons:clipped.features.map(f=>({id:f.id,siteId:f.siteId,geometry:f.geometry})),
        polygonCountIn:cells.features.length,
        polygonCountOut:clipped.features.length},
      note:'Intersect each input polygon with the boundary and compare the resulting geometry, polygon for polygon, and the count that survived.'
    },files:{}};
  },
  'summarize-polygons-soho-001'(){
    // 250 death locations counted into the clipped pump catchments, carrying a DEATHS value
    // per location -- the example's real question, which is how many deaths fall nearest each
    // pump. The boundary policy is "include", so a location exactly on a cell edge counts for
    // both cells it touches, and the fixture reports the multiple-membership count because
    // that is what makes the per-cell totals unsafe to add.
    const {deaths,clipped,summarised,summaryParams}=sohoVoronoiChain();
    return {fixture:{
      ...base('summarize-polygons-soho-001','summarize_points_to_polygon','Summarize points in polygons','src/catchments.ts#summarizePolygons'),
      declaredParameters:{
        computationCRS:'OGC:CRS84',
        boundary:summaryParams.boundary,
        valueField:summaryParams.valueField,
        rule:'A location belongs to a polygon when it is strictly inside it, or on its boundary when the boundary policy is include. Every membership is retained: a location inside two polygons counts for both.',
        semantics:'Per-polygon counts and totals must not be added to a grand total, because overlapping memberships are counted more than once. The number of multiple memberships is reported for that reason.',
        valueRule:'The numeric total per polygon sums the named field over the locations in it. A location whose field is absent or non-numeric is counted in missingValueCount and contributes nothing.'
      },
      input:{
        polygons:clipped.features.map(f=>({id:f.id,siteId:f.siteId,geometry:f.geometry})),
        points:deaths.features.map(f=>({id:String(f.id),coordinates:f.geometry?f.geometry.coordinates:null,
          value:f.properties[summaryParams.valueField]??null}))},
      output:{
        perPolygon:summarised.features.map(f=>({id:f.id,count:f.count,total:f.total,
          missingValues:f.missingValues})),
        summary:summarised.summary},
      note:'Decide each location\u2019s membership of each polygon under the declared boundary policy, then compare the per-polygon counts and totals and the summary of matched, unmatched, unlocated and multiply-assigned locations.'
    },files:{}};
  },
  'fill-gaps-soho-001'(){
    // The five and ten minute corridors, which are the one layer in this project that carries
    // interior holes: ground no street reaches, enclosed by streets that are reachable.
    // Filling them asserts the opposite of what the traversal computed, so the figure that
    // matters is how much area the fill adds.
    //
    // Two bands rather than one, so the fixture exercises the rule that separate parts stay
    // separate. The example has a single pump -- Broad Street -- so one band is one polygon,
    // and a one-part fixture could not tell filling from joining up.
    const {zone,hemisphere,bufferM,layers}=sohoCorridors([5,10]);
    const corridors={...layers[0],features:layers.flatMap(l=>l.features)};
    const filled=fillInteriorGaps(corridors,{id:'fill',type:'fill_interior_gaps',x:0,y:0,
      params:{label:'Filled gaps'}},'fixture','corridor');
    const facts=filled.receipt.facts,number=name=>Number(new RegExp(`fw:${name} (-?[0-9.]+)`).exec(facts)[1]);
    return {fixture:{
      ...base('fill-gaps-soho-001','fill_interior_gaps','Fill interior gaps','src/fill-interior-gaps.ts#fillInteriorGaps'),
      declaredParameters:{
        zone,hemisphere,metricCRS:'EPSG:32630',corridorHalfWidthMetres:bufferM,
        rule:'For every polygon part, keep the outer ring and discard every interior ring. Separate parts stay separate: this fills enclosed space and does not join things up.',
        areaRule:'Shoelace areas of the projected rings. Before is the outer ring less its holes; after is the outer ring alone.',
        semantics:'The added ground was never computed as covered. Whatever the gaps meant upstream, filling asserts the opposite of it.',
        method:filled.receipt.method
      },
      input:{polygons:corridors.features.map(f=>({id:f.id,geometry:f.geometry}))},
      output:{
        polygons:filled.value.features.map(f=>({id:f.id,geometry:f.geometry})),
        polygonCount:number('polygonCount'),
        gapsFilled:number('gapsFilled'),
        areaBeforeSquareMetres:number('areaBeforeSquareMetres'),
        areaAfterSquareMetres:number('areaAfterSquareMetres'),
        areaAddedSquareMetres:number('areaAddedSquareMetres')},
      note:'Project each input polygon to the declared CRS, drop its interior rings, and compare the ring count, the areas before and after, and the area the fill added.'
    },files:{}};
  },
  'combined-area-soho-001'(){
    // Three nested bands' corridors, collected into one layer and then combined. Nested is
    // the point: a shorter band's corridor lies inside a longer one's, so parts overlap
    // heavily and the combined area is far smaller than their sum. The parts area is taken
    // net of holes, because a single hole-bearing corridor otherwise reads as overlapping
    // itself.
    const {zone,hemisphere,bufferM,layers}=sohoCorridors([2,5,10]);
    const stacked={...layers[0],features:layers.flatMap(l=>l.features)};
    const combined=combinedArea(stacked,{id:'combine',type:'summarize_combined_area',x:0,y:0,
      params:{label:'Combined area',zone,hemisphere}},'fixture','stack');
    const facts=combined.receipt.facts,number=name=>Number(new RegExp(`fw:${name} (-?[0-9.]+)`).exec(facts)[1]);
    return {fixture:{
      ...base('combined-area-soho-001','summarize_combined_area','Combined area','src/combined-area.ts#combinedArea'),
      declaredParameters:{
        zone,hemisphere,metricCRS:'EPSG:32630',corridorHalfWidthMetres:bufferM,
        rule:'Union every ring of every part in the declared CRS, then measure the result. Ground covered twice is counted once.',
        partsAreaRule:'Sum of each part net of its holes, so a hole-bearing part does not read as overlapping itself.',
        semantics:'The combined area is how much distinct ground the parts cover. It is not the sum of the parts, and the difference is the overlap.',
        method:combined.receipt.method
      },
      input:{polygons:stacked.features.map(f=>({id:f.id,minutes:f.minutes??null,geometry:f.geometry}))},
      output:{
        geometry:combined.value.features[0].geometry,
        partCount:number('partCount'),
        combinedPieceCount:number('combinedPieceCount'),
        partsAreaSquareMetres:number('partsAreaSquareMetres'),
        combinedAreaSquareMetres:number('combinedAreaSquareMetres')},
      note:'Project every part to the declared CRS, union them, and compare the combined area, the piece count, and the summed area of the parts net of holes.'
    },files:{}};
  },
  'hull-soho-001'(){
    // The 1854 cholera deaths, which is the layer a practitioner would hull: 250 located points
    // in Soho. A hull is exact -- no tolerance, no approximation, no projection of
    // a curve -- so any disagreement with shapely is a real disagreement, which makes this
    // the cheapest honest check of the set.
    //
    // Points travel in full because a hull cannot be recomputed from a summary, and the
    // projected metres do not travel: the reference projects them itself with pyproj, so
    // the check tests the projection and the hull together rather than taking ours on trust.
    const deaths=johnSnowExample('snow-voronoi').nodes.find(n=>n.id==='locations').params.data;
    const zone=30,hemisphere='north';
    const hull=convexHull(deaths,{id:'hull',type:'summarize_hull',x:0,y:0,
      params:{label:'Area the points cover',zone,hemisphere}},'fixture','locations');
    const facts=hull.receipt.facts,number=name=>Number(new RegExp(`fw:${name} ([0-9.]+)`).exec(facts)[1]);
    return {fixture:{
      ...base('hull-soho-001','summarize_hull','Convex hull','src/convex-hull.ts#convexHull'),
      declaredParameters:{
        zone,hemisphere,metricCRS:'EPSG:32630',
        algorithm:'Monotone chain, O(n log n), computed on projected metres and returned as longitude and latitude.',
        collinearRule:'Points lying on a hull edge are dropped, so the ring carries corners only. A ring is closed, counter-clockwise.',
        areaRule:'Shoelace area of the closed projected ring, in square metres. Not a geodesic area: it is the area of the ring in EPSG:32630.',
        spanRule:'The greatest distance between any two hull vertices, in projected metres.',
        method:hull.receipt.method,
        semantics:'A hull is an outline of what was observed, not a service area or a boundary anyone agreed to. It is convex, so a distribution that is not -- cases along a river -- is filled in, and the hull asserts area where nothing was observed.'
      },
      input:{points:deaths.features.map(f=>({id:String(f.id),coordinates:f.geometry?f.geometry.coordinates:null}))},
      output:{
        ring:hull.value.features[0].geometry.coordinates[0],
        recordCount:number('recordCount'),
        hullVertexCount:number('hullVertexCount'),
        hullAreaSquareMetres:number('hullAreaSquareMetres'),
        hullSpanMetres:number('hullSpanMetres')},
      note:'Project the points to the declared CRS, take their convex hull, and compare the ring, its vertex count, its shoelace area and its widest span. The ring is returned in longitude and latitude; compare it in projected metres or allow for the round trip.'
    },files:{}};
  },
  async 'extent-soho-001'(){
    // The whole chain experiment 113 is about, in one fixture: 250 located deaths, their convex
    // hull, the area that hull derived, and the classification a declared ruleset reached from
    // that area. The reference rebuilds all three -- hull, area, threshold -- so the check tests
    // the DERIVATION as well as the rule, which is the thing the experiment doubted.
    //
    // The conclusion travels on the polygon, not beside it. Until 2026-10-14 this fixture could
    // not have existed in this shape: the ruleset returned rows and the geometry it judged was
    // dropped, so there was nothing to compare a status against except a table.
    const deaths=johnSnowExample('snow-voronoi').nodes.find(n=>n.id==='locations').params.data;
    const zone=30,hemisphere='north',threshold=250000;
    const hull=convexHull(deaths,{id:'hull',type:'summarize_hull',x:0,y:0,
      params:{label:'Observed extent of the outbreak',zone,hemisphere}},'fixture','locations');
    const n3=extentN3(hull.value,threshold);
    const conclusions=await reasonFixture(n3.input);
    const judged=extentProjection(hull.value,threshold,conclusions);
    const feature=judged.features[0];
    const ruleset=resolveRuleset('urn:fieldwork:ruleset:extent-review','1.1.0');
    return {fixture:{
      ...base('extent-soho-001','apply_ruleset','Apply ruleset','src/rule-application.ts#extentProjection'),
      declaredParameters:{
        zone,hemisphere,metricCRS:'EPSG:32630',thresholdSquareMetres:threshold,
        ruleset:{id:ruleset.id,version:ruleset.version,title:ruleset.title},
        derivationRule:'The area is NOT recomputed by the rule. The widget that projected to metres attaches areaSquareMetres to the polygon, and the rule reads it from the record. A widget that worked in degrees attaches nothing, and absent becomes fw:areaKnown false rather than a zero.',
        hullRule:'Monotone-chain convex hull of the projected points; shoelace area of the closed ring in EPSG:32630, which is the area of the ring and not a geodesic area.',
        classificationRule:'fw:areaKnown false gives Unknown. Otherwise area > threshold gives Review and area <= threshold gives NoFlag.',
        outputRule:'The classification is attached to the polygon as status and explanation, and the polygons are what the rule hands back. Before extent-review 1.1.0 it returned rows and dropped the geometry.',
        method:`Extent review against ${(threshold/1e6).toFixed(3)} km²`,
        semantics:'A status is a prompt to look, not a finding. Whether extent matters, and above what size, depends on the question being asked, and neither the widget nor the ruleset ships a basis for any threshold.'
      },
      input:{points:deaths.features.map(f=>({id:String(f.id),coordinates:f.geometry?f.geometry.coordinates:null}))},
      output:{
        ring:feature.geometry.coordinates[0],
        areaSquareMetres:feature.areaSquareMetres,
        status:feature.status,
        explanation:feature.explanation,
        statusCounts:judged.rows.reduce((counts,r)=>({...counts,[r.status]:(counts[r.status]||0)+1}),{})},
      note:'Project the points, take their convex hull, measure the ring in square metres, and classify it against the stated threshold. Then check that Fieldwork reached the same status for the same reason, and that the status is on the polygon rather than in a table beside it.'
    },files:{}};
  },
  'corridor-soho-001'(){
    // The five minute band's corridor. Edge geometry travels because the reference has to
    // walk the same streets: a corridor cannot be recomputed from endpoints, since these
    // streets curve and the buffer follows the curve.
    const example=johnSnowExample('snow-isochrone');
    const network=example.nodes.find(n=>n.type==='network_input').params.data;
    const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
    const minutes=5,speedMPerMin=75,bufferM=25,direction='outbound';
    const snapped=snapToNetwork(pumps,network,{id:'snap',type:'snap_to_network',x:0,y:0,
      params:{label:'Snap to street network',zone:30,hemisphere:'north',maxSnapM:100}},'fixture','pumps');
    const reached=reachableNodes(snapped.value,network,{id:'reach',type:'reachable_nodes',x:0,y:0,
      params:{label:'Reachable junctions',minutes:15,speedMPerMin,direction,travelMode:'walking'}},'fixture','snap');
    const banded=travelTimeBand(reached.value,{id:'band',type:'travel_time_band',x:0,y:0,
      params:{label:`Within ${minutes} minutes`,minutes}},'fixture','reach');
    const corridor=reachableCorridor(banded.value,network,{id:'corridor',type:'reachable_corridor',x:0,y:0,
      params:{label:'Reachable corridor',bufferM,zone:30,hemisphere:'north'}},'fixture','band');
    return {fixture:{
      ...base('corridor-soho-001','reachable_corridor','Reachable corridor','src/reachable-corridor.ts#reachableCorridor'),
      declaredParameters:{
        bufferM,quadrantSegments:8,direction,metricCRS:'EPSG:32630',
        truncationRule:'For each directed edge leaving a reached junction, take the first remainingM / lengthM of its length from that junction, dropping edges where nothing is left.',
        bufferRule:'The walk off the street at the end of a route is charged, so the buffer at any point of the route is min(bufferM, the budget left at that point), falling to nothing where the budget runs out. bufferM is the furthest anyone is assumed to walk off a street, not a drawing width.',
        firstLegRule:'The route begins with a straight line from the site to the junction it was snapped to, charged against the budget at the street speed and buffered on the same rule. It is part of the corridor.',
        quantisation:'Fieldwork cuts the route into chunks -- one for the whole stretch with more than bufferM left, then every 12.5 m -- takes the budget left at each chunk\u2019s far end, and rounds the radius down into 6 steps of bufferM/6. That removes ground; buffering each chunk separately adds a little back, since the chunk\u2019s far end gets a round cap at the chunk\u2019s radius where the rule gives a smaller one. Neither is large and they do not cancel exactly.',
        bufferProjection:'Turf/JSTS local azimuthal equidistant, 8 segments per quadrant',
        method:corridor.receipt.method,
        semantics:'A corridor is the ground a traveller can reach within the budget: along the streets, and then off the street by whatever the budget still allows up to bufferM. Interior holes are retained.'
      },
      input:{
        network:{source:network.source,
          nodes:network.nodes.map(n=>({id:n.id,coordinates:n.coordinates})),
          edges:network.edges.map(e=>({from:e.from,to:e.to,lengthM:e.lengthM,
            ...(e.geometry?{geometry:e.geometry}:{})}))},
        reached:banded.value.features.map(f=>({networkNodeId:f.properties.networkNodeId,
          travelMetres:f.properties.travelMetres,remainingM:f.properties.remainingM})),
        // The first leg, so the reference can rebuild the whole route rather than only the
        // streets: where the site stands, and how far it is from the junction it entered at.
        origin:{coordinates:[banded.value.features[0].properties.originLongitude,
          banded.value.features[0].properties.originLatitude],
          snapDistanceM:banded.value.features[0].properties.originSnapDistanceM,
          networkNodeId:snapped.value.features[0].properties.networkNodeId}
      },
      output:{corridor:corridor.value.features[0].geometry,
        enteredSegmentCount:Number(/fw:enteredSegmentCount (\d+)/.exec(corridor.receipt.facts)[1]),
        partialSegmentCount:Number(/fw:partialSegmentCount (\d+)/.exec(corridor.receipt.facts)[1])}
    },files:{}};
  },
  'reachability-soho-001'(){
    // The Soho network the John Snow example ships, at its own parameters. The network
    // travels in the fixture because the reference has to traverse it: a reachable set
    // cannot be recomputed from a summary. Node coordinates are included but unused by
    // the traversal, which runs on the stated edge lengths alone.
    const example=johnSnowExample('snow-isochrone');
    const network=example.nodes.find(n=>n.type==='network_input').params.data;
    const pumps=example.nodes.find(n=>n.id==='pumps').params.data;
    const minutes=5,speedMPerMin=75,direction='outbound',travelMode='walking';
    const snapped=snapToNetwork(pumps,network,{id:'snap',type:'snap_to_network',x:0,y:0,
      params:{label:'Snap to street network',zone:30,hemisphere:'north',maxSnapM:100}},'fixture','pumps');
    const originNodeId=snapped.value.features[0].properties.networkNodeId;
    const reached=reachableNodes(snapped.value,network,{id:'reach',type:'reachable_nodes',x:0,y:0,
      params:{label:'Reachable junctions',minutes,speedMPerMin,direction,travelMode}},'fixture','snap');
    return {fixture:{
      ...base('reachability-soho-001','reachable_nodes','Reachable junctions','src/reachable-nodes.ts#reachableNodes'),
      declaredParameters:{
        originNodeId,minutes,speedMPerMin,travelMode,direction,
        budgetMetres:minutes*speedMPerMin,
        costAttribute:'lengthM',
        edgeLengthSource:network.source,
        method:reached.receipt.method,
        semantics:'Cheapest-path traversal from the origin node over the stated edge lengths, keeping every node whose cost is at most the budget. The budget is the minutes multiplied by the speed. No geometry is measured and no projection is used: the lengths are taken as supplied. Edges are directed, and an inbound traversal would reverse them.'
      },
      input:{
        network:{source:network.source,
          nodes:network.nodes.map(n=>({id:n.id,coordinates:n.coordinates})),
          edges:network.edges.map(e=>({from:e.from,to:e.to,lengthM:e.lengthM}))},
        snappedFrom:{siteId:String(pumps.features[0].id),
          name:pumps.features[0].properties.name,
          coordinates:pumps.features[0].geometry.coordinates,
          snapDistanceM:snapped.value.features[0].properties.snapDistanceM}
      },
      output:{reached:reached.value.features.map(f=>({
        networkNodeId:f.properties.networkNodeId,travelMetres:f.properties.travelMetres,
        remainingM:f.properties.remainingM}))}
    },files:{}};
  },
  'mean-center-001'(){
    // A Gaborone-area cluster with one outlier, so an unweighted mean is visibly pulled:
    // the point of the check is the projection and the average, not a robust statistic.
    const zone=35,hemisphere='south';
    const coordinates=[[25.8700,-24.6600],[25.8900,-24.6700],[25.9100,-24.6400],[25.8800,-24.6300],
                       [25.9000,-24.6500],[26.1500,-24.4000]];
    const points={type:'FeatureCollection',features:coordinates.map(([lon,lat],i)=>({
      type:'Feature',id:`c${i+1}`,properties:{name:`Clinic ${i+1}`},geometry:{type:'Point',coordinates:[lon,lat]}}))};
    const result=computeMeanCenter(points,{label:'Mean center',zone,hemisphere});
    return {fixture:{
      ...base('mean-center-001','mean_center','Mean center','src/mean-center.ts#computeMeanCenter'),
      declaredParameters:{
        zone,hemisphere,computationCRS:result.crs,sourceCRS:'OGC:CRS84',
        method:result.method,
        semantics:'Every point is projected to the stated WGS84 UTM CRS, easting and northing are averaged without weights, and the mean is converted back to CRS84. No point is excluded and no outlier is down-weighted.'
      },
      selfReported:{count:result.count},
      input:{points:coordinates.map(([longitude,latitude],i)=>({id:`c${i+1}`,longitude,latitude}))},
      output:{coordinates:result.coordinates,projected:result.projected,crs:result.crs,count:result.count},
      note:'Project the input points to the declared CRS, average the coordinates without weights, and invert. Compare both the projected mean in metres and the returned CRS84 position as a ground separation.'
    },files:{}};
  },
  'measure-area-001'(){
    // Four boundaries chosen so the sphere-versus-ellipsoid gap can be seen to grow with
    // latitude and size: an equatorial box, a Gaborone-sized box at -24.6, a high-latitude
    // box, and a large mid-latitude box. The last case carries a hole, because a ring
    // subtraction is where a reimplementation is most likely to differ.
    const box=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
    const cases=[
      {id:'equatorial-1deg',unit:'km2',geometry:box(0,0,1,1)},
      {id:'gaborone-box',unit:'km2',geometry:box(25.7829,-24.7082,25.9821,-24.5438)},
      {id:'high-latitude-box',unit:'km2',geometry:box(10,60,11,61)},
      {id:'triangle-mid-latitude',unit:'ha',geometry:{type:'Polygon',coordinates:[[[25,-24],[26,-24],[25.5,-23],[25,-24]]]}},
      {id:'box-with-hole',unit:'km2',geometry:{type:'Polygon',coordinates:[
        [[25,-24],[26,-24],[26,-23],[25,-23],[25,-24]],
        [[25.4,-23.6],[25.6,-23.6],[25.6,-23.4],[25.4,-23.4],[25.4,-23.6]]]}},
    ].map(c=>{const measurement=calculateArea(c.geometry,c.unit);
      return {...c,output:{squareMetres:measurement.squareMetres,value:measurement.value,unit:measurement.unit}};});
    return {fixture:{
      ...base('measure-area-001','measure_area','Calculate area','src/area-computation.ts#calculateArea'),
      declaredParameters:{
        method:AREA_METHOD,
        earthRadiusM:6371008.8,
        model:'sphere',
        geometryCRS:'OGC:CRS84',
        axisOrder:'longitude-latitude',
        ringRule:'Exterior ring area minus the area of each interior ring.',
        semantics:'Area of a polygon on a sphere of the stated mean radius. No ellipsoidal correction is applied, and the widget reports the result as approximate.'
      },
      selfReported:{cases:cases.length},
      input:{cases:cases.map(({id,unit,geometry})=>({id,unit,geometry}))},
      output:cases.map(({id,output})=>({id,...output})),
      note:'Recompute each case from its geometry and the declared method. Two separate claims are available: that this implementation computes the stated spherical formula, and how far that formula sits from an ellipsoidal area, which is the approximation the widget declares.'
    },files:{}};
  },
  'reproject-utm35s-001'(){
    // A spread across zone 35 south: near and far from the central meridian, and from
    // near-equatorial to mid-latitude, all inside the widget's validity guard.
    const zone=35,hemisphere='south';
    const projected=[[200000,9000000],[500000,9000000],[800000,9000000],[260000,7280000],[500000,7280000],[740000,7280000],[300000,6000000],[500000,6000000],[700000,6000000]];
    const collection={type:'FeatureCollection',features:projected.map(([e,n],i)=>({type:'Feature',id:`p${i+1}`,properties:{name:`Point ${i+1}`},geometry:{type:'Point',coordinates:[e,n]}}))};
    const {collection:converted,provenance}=reprojectToCRS84(collection,zone,hemisphere);
    return {fixture:{
      ...base('reproject-utm35s-001','reproject','Reproject input','src/reproject.ts#reprojectToCRS84'),
      declaredParameters:{sourceCRS:provenance.sourceCRS,definition:provenance.definition,axisOrder:provenance.axisOrder,units:provenance.units,
        targetCRS:provenance.targetCRS,targetAxisOrder:provenance.targetAxisOrder,datumShift:provenance.datumShift,zone,hemisphere,
        operation:provenance.operation,library:provenance.library},
      selfReported:{transformed:provenance.transformed,withoutCoordinates:provenance.withoutCoordinates,maxRoundTripM:provenance.maxRoundTripM,coordinateDecimals:9},
      input:collection.features.map(f=>({id:f.id,easting:f.geometry.coordinates[0],northing:f.geometry.coordinates[1]})),
      output:converted.features.map(f=>({id:f.id,longitude:f.geometry.coordinates[0],latitude:f.geometry.coordinates[1]})),
      note:'Recompute the output from declaredParameters and the input only. Fieldwork’s own intermediate values are deliberately absent.'
    },files:{}};
  },
  'project-forward-utm30n-001'(){
    // The FORWARD direction, CRS84 -> UTM, which reproject 0.2.0 performs and which no check
    // covered: the lab's check 01 recomputes the inverse that 0.1.0 did. A round trip through
    // both directions is not parity, because both come from the same proj4 build.
    //
    // Spread deliberately across zone 30 north: on the central meridian (-3), at both edges of
    // the six-degree band where the scale factor is largest, and from near-equatorial to high
    // latitude, where a metre of northing is a very different number of degrees. All inside the
    // widget's validity guard, so what is compared is the projection and not the refusal.
    const zone=30,hemisphere='north';
    const geographic=[[-3,0.5],[-3,51.5],[-3,70],[-5.9,0.5],[-5.9,51.5],[-5.9,70],[-0.1,0.5],[-0.1,51.5],[-0.1,70]];
    const collection={type:'FeatureCollection',features:geographic.map(([lon,lat],i)=>({type:'Feature',id:`p${i+1}`,properties:{name:`Point ${i+1}`},geometry:{type:'Point',coordinates:[lon,lat]}}))};
    const {collection:projected,provenance}=projectFromCRS84(collection,zone,hemisphere);
    return {fixture:{
      ...base('project-forward-utm30n-001','reproject','Reproject points','src/reproject.ts#projectFromCRS84'),
      declaredParameters:{sourceCRS:provenance.sourceCRS,definition:provenance.definition,axisOrder:provenance.axisOrder,units:provenance.units,
        targetCRS:provenance.targetCRS,targetAxisOrder:provenance.targetAxisOrder,targetUnits:provenance.targetUnits,datumShift:provenance.datumShift,zone,hemisphere,
        operation:provenance.operation,library:provenance.library},
      selfReported:{transformed:provenance.transformed,withoutCoordinates:provenance.withoutCoordinates,maxRoundTripM:provenance.maxRoundTripM,coordinateDecimals:3},
      input:collection.features.map(f=>({id:f.id,longitude:f.geometry.coordinates[0],latitude:f.geometry.coordinates[1]})),
      output:projected.features.map(f=>({id:f.id,easting:f.geometry.coordinates[0],northing:f.geometry.coordinates[1]})),
      note:'Recompute the output from declaredParameters and the input only. Fieldwork\u2019s own intermediate values are deliberately absent. Coordinates are stored to three decimals, so agreement is expected at the millimetre rather than exactly.'
    },files:{}};
  },
  'relate-snow-001'(){
    // RELATE brings a CATEGORY across, so there is no arithmetic to check. What is worth an
    // independent eye is the MATCHING -- and from 0.3.0 two things besides: what the practitioner
    // DECLARED about rows that did not match, and what the join did to each numeric variable.
    //
    // Rebuilt 2026-10-28, because 0.3.0 changed the subject in three ways and this export broke
    // outright on the second of them: keys are compared with punctuation folded by default, a gap
    // REFUSES until the practitioner declares what to do with it, and the retained share of each
    // variable is now part of the result. The old fixture declared "no case folding, no
    // punctuation folding", which is no longer true of the widget.
    const {left,right,boundaryProvenance}=southLondonTables();
    const boundaries=southLondonBoundaryTable();
    const on='sub_district';
    const rowsOf=table=>table.rows.map(row=>({key:row.key,value:row.value}));
    const shapeOf=result=>({overlap:result.overlap,shares:result.shares,
      normalisation:result.normalisation});
    const declare=(l,r,request,decision,extra={})=>({...request,unmatched:{decision,...extra,
      signature:gapSignature(relateShape(l,r,request).overlap.gaps,request.normalisation??'fuzzy')}});
    const refusalOf=(l,r,request)=>{try{relateTable(l,r,request);return null;}catch(e){return e.message;}};

    // Snow's own two tables. 32 of 32 under either comparison, because both transcribe one book --
    // which is the control for the pair of cases further down.
    const snow={on,bring:'water_supply'};
    const folded=relateTable(left,right,{...snow,normalisation:'fuzzy'});
    const strict=relateTable(left,right,{...snow,normalisation:'exact'});

    // A key the right table does not carry, three ways: refused, dropped, kept. The three are the
    // whole of what 0.3.0 added, and the point is that the second and third give DIFFERENT totals
    // from the same input -- which is why the first exists.
    const withheld='St. Saviour, Southwark';
    const short={...right,rows:right.rows.filter(r=>r.key.sub_district!==withheld),
      rowCount:right.rows.filter(r=>r.key.sub_district!==withheld).length};
    const undeclared=refusalOf(left,short,snow);
    const dropped=relateTable(left,short,declare(left,short,snow,'drop',
      {reason:'withheld from the right table to make the case'}));
    const keptLabel='Supply not recorded';
    const kept=relateTable(left,short,declare(left,short,snow,'keep',{label:keptLabel,
      reason:'withheld from the right table to make the case'}));

    // An ambiguous key. CONSTRUCTED, and said so: no sub-district in Table XII carries two
    // companies, which is exactly why the case has to be built.
    const first=right.rows[0];
    const ambiguousRows=[...right.rows,{key:{...first.key,water_supply:'Lambeth Company only'},value:1}];
    const ambiguous={...right,rows:ambiguousRows,rowCount:ambiguousRows.length};
    const ambiguousRefusal=refusalOf(left,ambiguous,snow);

    // THE CASE CHECK 28 RECORDED THAT IT COULD NOT REACH, now reachable from published data.
    // The boundary file spells nine of the 32 sub-districts without their comma, so the same two
    // tables match 23 of 32 compared exactly and 32 of 32 compared folded. One knob, nine rows.
    const bring={on,bring:'supplier'};
    const boundaryStrictRequest={...bring,normalisation:'exact'};
    const boundaryStrict=relateTable(left,boundaries,
      declare(left,boundaries,boundaryStrictRequest,'drop',
        {reason:'the boundary file spells these without their comma'}));
    const boundaryFolded=relateTable(left,boundaries,{...bring,normalisation:'fuzzy'});

    return {fixture:{
      ...base('relate-snow-001','relate_table','Relate a table','src/relate-table.ts#relateTable'),
      source:"John Snow, On the Mode of Communication of Cholera, 2nd ed., 1855: Table VIII (population and deaths by sub-district) as the left table and Table XII (the company supplying each sub-district) as the right. The third table is the published sub-district boundary's own spelling of the same 32 names with the company it records, names and category only and no geometry. All read from the example-1855-cholera-south-london checkout, not retyped.",
      declaredParameters:{on,measureKey:'measure',
        semantics:'Each left row takes the single value its key has in the right table\'s bring column, which becomes an additional KEY column. The row count is unchanged -- nothing is added and nothing is multiplied. A right table holding two different bring values for one key is REFUSED outright; it is not resolved to the first, the last, or any of them. From 0.3.0 a left key the right table has no row for is also REFUSED until the practitioner declares what to do with it: `drop` excludes those rows, `keep` retains them under a category the practitioner names, and the two give different totals.',
        matching:'Compared after NFKC normalisation, trimming and lowercasing. `exact` stops there. `fuzzy`, the DEFAULT from 0.3.0, additionally replaces every run of characters that are neither letters nor digits with a single space and trims again. Reimplement this from the rule rather than importing it: the folding is the thing under check.',
        shares:'Each numeric variable\'s total over every offered row and over the rows that matched, and the fraction retained. The variable is the value of the measure key column where the table has one. An inner join multiplies a rate of one variable over another by exactly the ratio of their retained fractions, which is the identity worth recomputing.',
        equivalentTo:'A pandas left merge on `on` after applying the declared folding to both key columns, restricted to one brought column -- then dropping the unmatched rows for `drop`, or filling them with the declared label for `keep`. EXCEPT for the ambiguous case, where a merge multiplies rows and this refuses, and for an undeclared gap, where a merge proceeds and this refuses.'},
      boundaryProvenance,
      input:{left:{keys:left.keys,valueField:left.valueField,rowCount:left.rows.length,rows:rowsOf(left)},
        right:{keys:right.keys,valueField:right.valueField,rowCount:right.rows.length,rows:rowsOf(right)},
        boundaries:{keys:boundaries.keys,valueField:boundaries.valueField,
          rowCount:boundaries.rows.length,rows:rowsOf(boundaries)}},
      output:{cases:[
        {note:'The relate the example runs, folded: Table XII\'s company onto all 64 rows of Table VIII',
          rightTable:'right',rightInput:'right',request:{...snow,normalisation:'fuzzy'},
          table:{keys:folded.table.keys,rowCount:folded.table.rowCount,
            missingValueCount:folded.table.missingValueCount,rows:rowsOf(folded.table)},
          related:folded.related,dropped:folded.dropped,kept:folded.kept,
          gaps:folded.gaps,values:folded.values,...shapeOf(folded),refused:null},
        {note:'The same, compared exactly. The control: Snow\'s two tables agree letter for letter, so folding changes nothing here and the difference further down is not an artefact of the knob',
          rightTable:'right',rightInput:'right',request:{...snow,normalisation:'exact'},
          table:{keys:strict.table.keys,rowCount:strict.table.rowCount,
            missingValueCount:strict.table.missingValueCount,rows:rowsOf(strict.table)},
          related:strict.related,dropped:strict.dropped,kept:strict.kept,
          gaps:strict.gaps,values:strict.values,...shapeOf(strict),refused:null},
        {note:`A key the right table does not carry, UNDECLARED: ${withheld} withheld and nothing said about it. Refused, where a merge would proceed`,
          rightTable:'right, with every row for that sub-district removed',
          rightInput:'right',request:snow,withheldKey:withheld,
          table:null,related:null,dropped:null,kept:null,gaps:null,values:null,
          refused:undeclared},
        {note:`The same gap, declared \u201cdrop\u201d: the rows are excluded and the key named`,
          rightTable:'right, with every row for that sub-district removed',
          rightInput:'right',request:{...snow,unmatched:{decision:'drop'}},withheldKey:withheld,
          table:{keys:dropped.table.keys,rowCount:dropped.table.rowCount,
            missingValueCount:dropped.table.missingValueCount,rows:rowsOf(dropped.table)},
          related:dropped.related,dropped:dropped.dropped,kept:dropped.kept,
          gaps:dropped.gaps,values:dropped.values,...shapeOf(dropped),refused:null},
        {note:`The same gap, declared \u201ckeep\u201d under \u201c${keptLabel}\u201d: every row stays and the totals are the whole left table\u2019s`,
          rightTable:'right, with every row for that sub-district removed',
          rightInput:'right',request:{...snow,unmatched:{decision:'keep',label:keptLabel}},withheldKey:withheld,
          table:{keys:kept.table.keys,rowCount:kept.table.rowCount,
            missingValueCount:kept.table.missingValueCount,rows:rowsOf(kept.table)},
          related:kept.related,dropped:kept.dropped,kept:kept.kept,
          gaps:kept.gaps,values:kept.values,...shapeOf(kept),refused:null},
        {note:'An ambiguous key, constructed: one sub-district given a second, different company',
          rightTable:'right, with one row duplicated under a different company',
          rightInput:'right',request:snow,
          constructed:'No sub-district in Table XII carries two companies. The row is added here because the case cannot be drawn from the data.',
          ambiguousKey:first.key.sub_district,
          ambiguousValues:[first.key.water_supply,'Lambeth Company only'],
          table:null,related:null,dropped:null,kept:null,gaps:null,values:null,
          refused:ambiguousRefusal},
        {note:'The published boundary\'s own spelling, compared EXACTLY: nine of the 32 sub-districts are written without their comma, so nine do not match and their rows are excluded at a declared choice',
          rightTable:'boundaries',rightInput:'boundaries',
          request:{...boundaryStrictRequest,unmatched:{decision:'drop',reason:'the boundary file spells these without their comma'}},
          table:{keys:boundaryStrict.table.keys,rowCount:boundaryStrict.table.rowCount,
            missingValueCount:boundaryStrict.table.missingValueCount,rows:rowsOf(boundaryStrict.table)},
          related:boundaryStrict.related,dropped:boundaryStrict.dropped,kept:boundaryStrict.kept,
          gaps:boundaryStrict.gaps,values:boundaryStrict.values,...shapeOf(boundaryStrict),refused:null},
        {note:'The same two tables, compared FOLDED: every one of the 32 matches, and nothing is excluded. The pair is the finding -- one knob, nine rows, and two different retained shares',
          rightTable:'boundaries',rightInput:'boundaries',request:{...bring,normalisation:'fuzzy'},
          table:{keys:boundaryFolded.table.keys,rowCount:boundaryFolded.table.rowCount,
            missingValueCount:boundaryFolded.table.missingValueCount,rows:rowsOf(boundaryFolded.table)},
          related:boundaryFolded.related,dropped:boundaryFolded.dropped,kept:boundaryFolded.kept,
          gaps:boundaryFolded.gaps,values:boundaryFolded.values,...shapeOf(boundaryFolded),refused:null}]},
      note:'Recompute each case from `input`, `declaredParameters` and the case\'s own `request` with an independent merge, applying the declared folding yourself. Three cases have no table: two expect a refusal, and what a merge does there instead is the finding. The last two cases share their input and differ only in the comparison.'
    },files:{}};
  },

  'group-shares-snow-001'(){
    // SHARES WITHIN GROUPS (experiment 191): each company's share of the population and of the deaths, within each
    // measure; a count's share of the whole table; and one cell emptied, whose stratum's shares are then unknown.
    const {left,right}=southLondonTables();
    const related=relateTable(left,right,{on:'sub_district',bring:'water_supply'}).table;
    const requests=[
      {note:'Each company\'s share of the population and of the deaths: sum by water supply and measure, share within measure',
        request:{by:['water_supply','measure'],share:{within:['measure']}},emptied:null},
      {note:'Rows counted by water supply, each a share of the whole table',
        request:{by:['water_supply'],aggregate:'count',share:{within:[]}},emptied:null},
    ];
    const target=related.rows.find(row=>row.key.water_supply==='Southwark and Vauxhall Company only'&&row.key.measure==='population_1851');
    const holed={...related,rows:related.rows.map(row=>row===target?{...row,value:null}:row),missingValueCount:related.missingValueCount+1};
    const rowsOf=table=>table.rows.map(row=>({key:row.key,value:row.value}));
    const cases=[...requests.map(({note,request,emptied})=>({note,request,emptied,table:groupTable(related,request).table})),
      {note:'One population cell emptied: its group sums to nothing known, so every population share is unknown; the death shares are unchanged',
        request:requests[0].request,emptied:{key:target.key,wasValue:target.value},table:groupTable(holed,requests[0].request).table}];
    return {fixture:{
      ...base('group-shares-snow-001','group_table','Total within groups, with each group\'s share','src/group-table.ts#withShares'),
      source:"John Snow, On the Mode of Communication of Cholera, 2nd ed., 1855: Table VIII related to Table XII's declared water supply, as in group-snow-001.",
      declaredParameters:{statisticKey:'statistic',
        semantics:'Rows agreeing on every column in `by` become one group, totalled (sum) or counted (count). With `share`, each group also gets its share of the total of the groups agreeing on the `within` columns, as a percentage; with no `within` column, of every group. A sum over any empty cell is null; a share whose group or stratum total is null is null; a stratum totalling zero has null shares. The result gains a key column `statistic` naming each number: the value field\'s name for the total, `% within <columns joined by " and ">` or `% of all` for the share. The input\'s own `measure` column (population or deaths) is a kept column like any other.',
        rounding:'The share is value / stratum total * 1000, rounded half up to an integer (JavaScript Math.round: halves go toward positive infinity), then divided by 10: a percentage to one decimal place.'},
      input:{table:{keys:related.keys,valueField:related.valueField,rowCount:related.rows.length,
        missingValueCount:related.missingValueCount,rows:rowsOf(related)}},
      output:{cases:cases.map(c=>({note:c.note,request:c.request,emptied:c.emptied,
        table:{keys:c.table.keys,valueField:c.table.valueField,rowCount:c.table.rowCount,missingValueCount:c.table.missingValueCount,rows:rowsOf(c.table)}}))},
      note:'Recompute each case from `input`, `declaredParameters` and the case\'s `request`. Case 3 empties the row named in `emptied`.'
    },files:{}};
  },

  'relate-spelling-sl-001'(){
    // RELATE ALLOWING FOR SPELLING (experiment 193): Sierra Leone's cases by residential district, as the line list
    // writes them ("Bo District"), related to OCHA COD-AB's districts as the population table writes them ("Bo",
    // "Fabala" for Falaba). The teaching file's district column and the derived population table, both in the example.
    const dir=new URL('../../example-2019-sierra-leone-measles/data/',import.meta.url);
    let casesText,popText;
    try{casesText=readFileSync(new URL('measles-sierra-leone-semisynthetic.csv',dir),'utf8');popText=readFileSync(new URL('district-population.csv',dir),'utf8');}
    catch{throw new Error('example-2019-sierra-leone-measles, with data/district-population.csv, is not on this machine beside this repository.');}
    const cases=parseCSV(casesText,250_000,40_000_000),pop=parseCSV(popText,1000,1_000_000);
    const at=(t,name)=>{const i=t.headers.map(h=>h.trim()).indexOf(name);if(i<0)throw new Error(`No "${name}" column.`);return i;};
    const d=at(cases,'Residential District'),counts=new Map();
    for(const r of cases.rows){const v=(r[d]??'').trim();counts.set(v,(counts.get(v)??0)+1);}
    const left={kind:'data-table',keys:['Residential District'],valueField:'cases',
      rows:[...counts].map(([k,n])=>({key:{'Residential District':k},value:n})),rowCount:counts.size,missingValueCount:0};
    const pd=at(pop,'district'),pc=at(pop,'adm2_pcode'),pw=at(pop,'worldpop_2021');
    const right={kind:'data-table',keys:['district','adm2_pcode'],valueField:'worldpop_2021',
      rows:pop.rows.filter(r=>(r[pd]??'').trim()).map(r=>({key:{district:r[pd].trim(),adm2_pcode:r[pc].trim()},value:Number(r[pw])})),
      rowCount:0,missingValueCount:0};
    right.rowCount=right.rows.length;
    const requests=[
      {note:'District dropped, spelling allowed to 0.88 (the default): the boundary\'s district brought across, the blank kept under a named category',
        request:{on:'Residential District',rightOn:'district',bring:'district',spelling:{dropWords:['District'],threshold:0.88,decisions:{}}}},
      {note:'The same at 0.96: Falaba\'s spelling, 0.956, is below it and not found',
        request:{on:'Residential District',rightOn:'district',bring:'district',spelling:{dropWords:['District'],threshold:0.96,decisions:{}}}},
      {note:'The same at 0.88 without dropping District: names that matched exactly after dropping it are compared with it',
        request:{on:'Residential District',rightOn:'district',bring:'district',spelling:{dropWords:[],threshold:0.88,decisions:{}}}},
    ];
    const rowsOf=table=>table.rows.map(row=>({key:row.key,value:row.value}));
    const out=requests.map(({note,request})=>{
      const shape=relateShape(left,right,request);
      const decided={...request,unmatched:{decision:'keep',label:'Not matched',signature:shape.signature}};
      const table=relateTable(left,right,shape.overlap.gaps.length?decided:request).table;
      return {note,request,unmatchedLabel:shape.overlap.gaps.length?'Not matched':null,
        matches:shape.matches.map(({name,compared,match})=>({name,compared,outcome:match.outcome,value:match.value??null,
          score:match.score??null,candidates:match.candidates})),
        table:{keys:table.keys,valueField:table.valueField,rowCount:table.rowCount,rows:rowsOf(table)}};
    });
    return {fixture:{
      ...base('relate-spelling-sl-001','relate_table','Relate a column from another table, allowing for spelling','src/spelling-match.ts#linkNames'),
      source:'Fieldwork example 2019 Sierra Leone measles: the semisynthetic teaching file\'s Residential District, counted; and data/district-population.csv, OCHA COD-AB admin-2 district names (CC BY-IGO) with WorldPop 2021 totals (CC BY 4.0).',
      declaredParameters:{
        folding:'A name is NFKC-normalised, trimmed and lower-cased; every run of characters that are not a Unicode letter or number becomes one space; the ends are trimmed. Words named in dropWords, folded the same way, are then removed where a whole space-separated word equals one.',
        matching:'Each distinct non-blank name of the first table\'s column is matched once against the distinct non-blank names of the second table\'s column. Equal folded names: exact, unless two or more second-table names fold equal (ambiguous). Otherwise every second-table name is scored by Jaro-Winkler on the folded forms; those at or above the threshold are candidates; candidates within 0.02 of the best are close; one close is a spelling match, two or more ambiguous, none none.',
        jaroWinkler:'Jaro with a match window of floor(max(len)/2)-1, transpositions counted as mismatched matched pairs and halved; the Winkler boost of a common prefix up to 4 characters, scaling 0.1, applied only when Jaro exceeds 0.7.',
        relate:'Each first-table row is related to the second-table row whose district equals its match, bringing that district. A row with no match (blank, none or ambiguous) is unmatched; where any is, the case keeps them under unmatchedLabel. The result gains "Residential District match" saying how each row matched.'},
      input:{left:{keys:left.keys,valueField:left.valueField,rows:rowsOf(left)},right:{keys:right.keys,valueField:right.valueField,rows:rowsOf(right)}},
      output:{cases:out},
      note:'Recompute each case from `input`, `declaredParameters` and the case\'s `request`.'
    },files:{}};
  },

  'boundary-repair-001'(){
    // THE BOUNDARY REPAIR (experiment 194), on every unit of three published levels: OCHA COD-AB's 16 districts of
    // Sierra Leone, where it was found, and a geoBoundaries level that loaded before it existed, Rio de Janeiro's 92
    // municipalities, to see whether it runs on a source that did not need it. Nigeria's 774 LGAs were left out: 29 MB.
    const read=(repo,file)=>{try{return JSON.parse(readFileSync(new URL(`../../${repo}/${file}`,import.meta.url),'utf8'));}
      catch{throw new Error(`${repo}/${file} is not on this machine beside this repository.`);}};
    const sources=[
      {id:'sl-cod-ab',repo:'example-2019-sierra-leone-measles',file:'data/districts-cod-ab.geojson',name:'adm2_name',
        source:'OCHA COD-AB, Sierra Leone admin 2, via the Fieldwork example (CC BY-IGO)'},
      {id:'rj-geoboundaries',repo:'example-2024-brazil-dengue',file:'geo/rj-municipalities.geojson',name:'shapeName',
        source:'geoBoundaries, Brazil admin 2 for Rio de Janeiro state, from IBGE, via the Fieldwork example (CC BY 3.0 IGO)'},
    ];
    const count=g=>(g.type==='Polygon'?g.coordinates:g.coordinates.flat()).reduce((n,r)=>n+r.length,0);
    const levels=sources.map(src=>{
      const fc=read(src.repo,src.file);
      const units=fc.features.map((f,index)=>{
        let before=null,after=null;
        try{validateDrawnGeometry(f.geometry);before='passes';}catch(e){before=String(e.message||e);}
        const {geometry,repairs}=repairBoundary(f.geometry);
        try{validateDrawnGeometry(geometry);after='passes';}catch(e){after=String(e.message||e);}
        return {index,name:String(f.properties?.[src.name]??''),publishedVertices:count(f.geometry),
          repairedVertices:count(geometry),repairs,checkBefore:before,checkAfter:after};
      });
      return {id:src.id,source:src.source,features:fc.features.map(f=>({name:String(f.properties?.[src.name]??''),geometry:f.geometry})),units};
    });
    return {fixture:{
      ...base('boundary-repair-001','study_area','Study area: the boundary repair','src/boundary-repair.ts#repairBoundary'),
      source:sources.map(s=>s.source).join('; '),
      declaredParameters:{
        rule:REPAIR_RULE,
        order:'Ring by ring, in the order published. First every vertex equal in both coordinates to the vertex before it in the published ring is removed. Then, on the ring without its closing vertex, read cyclically: the first i where c lies on segment ab or a lies on segment bc, for a, b, c the vertices at i, i+1, i+2, removes b; repeated from the start until none is found or 3 vertices are left. The ring is closed again with its first vertex.',
        onSegment:'p lies on segment ab where |(b-a) x (p-a)| < 1e-12 and each coordinate of p is within the bounding box of a and b widened by 1e-12, in degrees.',
        recorded:'Each removal as {kind: repeated|spike, at: [x, y]}, in the order made.'},
      input:{levels:levels.map(({id,source,features})=>({id,source,features}))},
      output:{levels:levels.map(({id,units})=>({id,units}))},
      note:'Recompute each unit\'s removals from `input` and `declaredParameters`. checkBefore and checkAfter are Fieldwork\'s own study area check, recorded and not for the lab to reproduce.'
    },files:{}};
  },

  'group-snow-001'(){
    // GROUP sums, and the sum is checkable by anyone. The case worth an independent eye is the
    // one where the two implementations are MEANT to differ: pandas sums over a missing value as
    // though it were zero, and this returns nothing known. A stratum whose population nobody
    // recorded must come out unknown rather than come out smaller.
    const {left,right}=southLondonTables();
    const related=relateTable(left,right,{on:'sub_district',bring:'water_supply'}).table;
    const request={by:['water_supply','measure']};

    // 1. The six totals the contingency table is made of.
    const totalled=groupTable(related,request);

    // 2. One cell emptied, in the largest group, so the difference between nothing-known and a
    //    smaller number is as large as this data can make it. The emptied row is named so the lab
    //    can empty the same one.
    const target=related.rows.find(row=>
      row.key.water_supply==='Southwark and Vauxhall Company only'&&row.key.measure==='population_1851');
    const holed={...related,rows:related.rows.map(row=>row===target?{...row,value:null}:row),
      missingValueCount:related.missingValueCount+1};
    const withHole=groupTable(holed,request);
    // What the other behaviour would have given, recorded so the check can state the size of the
    // disagreement rather than only its existence. Not what Fieldwork returns.
    const summedOver=related.rows.filter(row=>
      row.key.water_supply===target.key.water_supply&&row.key.measure===target.key.measure)
      .reduce((n,row)=>n+(row===target?0:row.value),0);

    const rowsOf=table=>table.rows.map(row=>({key:row.key,value:row.value}));
    return {fixture:{
      ...base('group-snow-001','group_table','Total a table within groups','src/group-table.ts#groupTable'),
      source:"John Snow, On the Mode of Communication of Cholera, 2nd ed., 1855: Table VIII related to Table XII's declared water supply. The input here is the OUTPUT of relate_table over that pair, which is what the example feeds this step.",
      declaredParameters:{by:request.by,operation:'sum',
        semantics:'Rows agreeing on every column in `by` become one row whose value is their total. The columns to KEEP are named; every other key column is dropped. Sum and nothing else -- no mean, no count -- because this step cannot tell a count from a rate and summing rates gives a number with no referent. A group holding ANY empty cell totals to null and is reported by name: not to the sum of the cells that were present.',
        equivalentTo:'A pandas groupby(by).sum() over the value column, EXCEPT for the empty cell: pandas sums over NaN as though it were zero by default, and `min_count=1` is the option that reproduces this behaviour. That difference is case 2.'},
      input:{relatedFrom:'relate-snow-001 case 1',
        table:{keys:related.keys,valueField:related.valueField,rowCount:related.rows.length,
          missingValueCount:related.missingValueCount,rows:rowsOf(related)}},
      output:{cases:[
        {note:'The six totals of the Snow contingency table: three companies against two measures',
          emptied:null,
          table:{keys:totalled.table.keys,rowCount:totalled.table.rowCount,
            missingValueCount:totalled.table.missingValueCount,rows:rowsOf(totalled.table)},
          groups:totalled.groups,collapsedFrom:totalled.collapsedFrom,
          dropped:totalled.dropped,gaps:totalled.gaps},
        {note:'One cell emptied: that group totals to nothing known, and the other five are unchanged',
          emptied:{key:target.key,wasValue:target.value},
          sumIgnoringTheEmptyCell:summedOver,
          whyItIsNotThat:'That number is what a default sum returns and it is wrong here by exactly the population of one sub-district, which nobody recorded in this case. A total too small by an unknown amount reads as a finding.',
          table:{keys:withHole.table.keys,rowCount:withHole.table.rowCount,
            missingValueCount:withHole.table.missingValueCount,rows:rowsOf(withHole.table)},
          groups:withHole.groups,collapsedFrom:withHole.collapsedFrom,
          dropped:withHole.dropped,gaps:withHole.gaps}]},
      note:'Recompute both cases from `input` and `declaredParameters`. Case 2 empties the row named in `emptied` and is the case where the two implementations are meant to disagree under pandas\' default.'
    },files:{}};
  },

  'regression-strata-brazil-001'(){
    // SEVERAL STRATA COLUMNS (experiment 182): weeks compared within a municipality, year and month. Two municipalities
    // of the published 2010-2025 extract, the twelve doubled weeks left out, cases on the dataset's weekly air
    // temperature and rainfall. The lab fits the same model with one indicator per combination, as statsmodels has no
    // absorbed strata, and with an overdispersion scale from the Pearson statistic.
    const csv=new URL('../../example-2024-brazil-dengue/data/dengue-rj-2010-2025.csv',import.meta.url);
    let text;
    try{text=readFileSync(csv,'utf8');}
    catch{throw new Error('example-2024-brazil-dengue is not on this machine beside this repository, so this fixture cannot be rebuilt here.');}
    const t=parseCSV(text,250_000,40_000_000);const h=t.headers.map(x=>x.trim());
    // Two municipalities: one indicator per stratum makes a dense design, and six (1,104 strata) exhausted the browser
    // kernel's memory in statsmodels. Two keep three strata columns over sixteen years.
    const PLACES=['Angra dos Reis','Petrópolis'];
    const EDGES=['2010-12-26','2011-12-25','2012-12-30','2013-12-29','2015-01-04','2016-12-25','2018-12-30','2019-12-29','2020-12-27','2021-12-26','2022-12-25','2024-12-29'];
    const COLUMNS=['municipio','anio','mes','data_iniSE','casos','tempmed','precip_total_semana'];
    const rows=t.rows.map(v=>Object.fromEntries(h.map((x,i)=>[x,v[i]??''])))
      .filter(r=>PLACES.includes(r.municipio)&&!EDGES.includes(r.data_iniSE))
      .map(r=>Object.fromEntries(COLUMNS.map(c=>[c,r[c]])));
    const params={family:'poisson',outcome:'casos',exposure:{column:'tempmed',as:'numeric'},
      adjust:[{column:'precip_total_semana',as:'numeric'}],strata:['municipio','anio','mes'],errors:'overdispersed'};
    const fitted=strata=>{const r=fitRegression(rows,specFrom({...params,strata}));
      return {strata:r.strata,rows:r.rows,dispersion:r.dispersion,residualDf:r.residualDf,adjustedFor:r.adjustedFor,
        estimates:r.estimates.map(e=>({term:e.term,column:e.column,coefficient:e.coefficient,se:e.se,ratio:e.ratio,lower:e.lower,upper:e.upper}))};};
    return {fixture:{
      ...base('regression-strata-brazil-001','regression','Regression','src/regression.ts#fitRegression'),
      source:'Sánchez-Marqués and Sánchez, DATASET_MULTIMODAL_V8, Zenodo doi:10.5281/zenodo.22029053, CC BY 4.0, as extracted to example-2024-brazil-dengue/data/dengue-rj-2010-2025.csv. tempmed is InfoDengue\'s weekly mean air temperature; precip_total_semana is CHIRPS at one grid cell.',
      declaredParameters:{params,places:PLACES,leftOutWeeks:EDGES,
        semantics:'Poisson regression of casos on tempmed, adjusted for precip_total_semana, with one stratum per combination of municipio, anio and mes absorbed by the conditional Poisson likelihood; a stratum with no events is dropped. A row missing a model column is left out. Overdispersed: model-based standard errors multiplied by the square root of the Pearson chi-square over the residual degrees of freedom, those being rows used minus columns minus strata used.',
        equivalentTo:"statsmodels: sm.GLM(casos, [tempmed, precip_total_semana, indicators of municipio x anio x mes], family=Poisson()).fit(scale='X2'), over rows with every column present and strata with at least one case."},
      input:{csvSha256:sha256(readFileSync(csv)),columns:COLUMNS,rowCount:rows.length,rows},
      output:{cases:[{note:'Three strata columns together',strataColumns:['municipio','anio','mes'],...fitted(['municipio','anio','mes'])}]},
      note:'Recompute from input.rows: drop rows missing any model column, drop strata with no cases, fit with one indicator per stratum, scale by the Pearson statistic.'
    },files:{}};
  },
  async 'sea-level-heights-manila-001'(){
    // THE SEA-LEVEL EXAMPLE'S THIRD WORKFLOW (experiment 198), step by step through the functions the canvas runs: Find
    // health facilities on the HOT export, the window Raster input keeps of each grid, Sample raster (bilinear for the
    // two smooth surfaces, the containing cell for the ground), Measure distance to the nearest AR6 site, the workflow's
    // own rules, Relate to the selected projection, and the published ruleset compare-level-to-elevation 1.0.0. The three
    // windows travel as assets, so the lab samples the same bytes the canvas sampled. EGM2008 is a 24 x 24 node cut of
    // PROJ's grid (tests/fixtures/egm08-manila-cut.tif); the canvas reads the same nodes from cdn.proj.org.
    const repo='../example-2026-sea-level-rise-philippines';
    const at=file=>new URL(`../${repo}/${file}`,import.meta.url);
    let project;
    try{project=JSON.parse(gunzipSync(readFileSync(at('fieldwork-project.json.gz'))).toString());}
    catch{throw new Error('example-2026-sea-level-rise-philippines is not on this machine beside this repository.');}
    const flow=project.workflows[2].document.workflow;
    const node=type=>flow.nodes.find(n=>n.type===type);
    const area=node('study_area').params.geometry;
    // FACILITIES, as Find health facilities retrieves them, from the export the browser test answers with (ODbL).
    const zip=readFileSync(new URL('../tests/fixtures/hotosm_phl_health_facilities_points_geojson.zip',import.meta.url));
    const finder=node('find_health_facilities');
    const {parsed}=await downloadFacilities(finder,area,async()=>new Response(zip,{status:200,headers:{'content-length':String(zip.length)}}));
    const facilities=parsed.collection;
    const sites=node('point_input').params.data;
    // WHAT RASTER INPUT KEEPS: the window around the study area, no padding.
    const kept=async bytes=>{const blob=new Blob([bytes]),m=await inspectRaster(blob);return readRasterWindow(blob,m,rasterWindow(m,area,0));};
    const egmBytes=readFileSync(new URL('../tests/fixtures/egm08-manila-cut.tif',import.meta.url));
    const dtuBytes=readFileSync(at('data/dtu25mss-manila.tif')),dtmBytes=readFileSync(at('data/deltadtm-manila.tif'));
    const [egm,dtu,dtm]=[await kept(egmBytes),await kept(dtuBytes),await kept(dtmBytes)];
    const sample=(points,grid,type)=>{const n=flow.nodes.filter(x=>x.type==='sample_raster').find(x=>x.params.attribute===type);
      return sampleRaster(points,{...grid},n.params).value;};
    const sitesSampled=sample(sample(sites,egm,'egm2008_m'),dtu,'mss_m');
    const facilitiesSampled=sample(facilities,dtm,'ground_m');
    const nearest=nearestPlaces(facilitiesSampled,sitesSampled,node('measure_distance').params.unit,node('measure_distance').params.candidateFilter);
    const table=distancesAsTable(nearest);
    // THE WORKFLOW'S OWN RULES: the sea above the geoid at the site, the ground above that sea, less the 1993-2012 to
    // 1995-2014 shift.
    const mine=flow.nodes.find(n=>n.type==='apply_ruleset'&&n.params.authored);
    const heights=evaluatedTable(table,evaluateAuthored(authoredSubjects(table),mine.params.authored.fields,mine.params.authored.rules,{},mine.params.authored.order,mine.params.authored.otherwise??[]));
    // THE PROJECTION SELECTED by the four Select rows steps, from the published CSV: one row per site.
    const [header,...lines]=readFileSync(at('data/ar6-projections-philippine-gauges.csv'),'utf8').trim().split(/\r?\n/).map(l=>l.split(','));
    const col=name=>header.indexOf(name);
    const chosen=Object.fromEntries(flow.nodes.filter(n=>n.type==='select_rows').map(n=>[n.params.keyColumn,n.params.values[0]]));
    const keys=['site_id','scenario','basis','family','year','quantile'];
    const rows=lines.filter(l=>Object.entries(chosen).every(([k,v])=>l[col(k)]===v)).map(l=>({key:Object.fromEntries(keys.map(k=>[k,l[col(k)]])),value:Number(l[col('value_mm')])}));
    const projections={kind:'data-table',keys,valueField:'value_mm',unit:'millimetre',rows,rowCount:rows.length,missingValueCount:0};
    const relate=flow.nodes.find(n=>n.type==='relate_table').params;
    const related=relateTable(heights,projections,relate).table;
    // THE PUBLISHED COMPARISON, evaluated directly as the canvas does it.
    const published=resolveRuleset('urn:fieldwork:ruleset:compare-level-to-elevation','1.0.0');
    const fields=published.inputContract.fieldFrom.map(b=>({...b,unit:published.inputContract.expects.find(e=>e.predicate===b.predicate)?.unit}));
    const compared=evaluatedTable(related,evaluateAuthored(authoredSubjects(related),fields,published.authored.rules,{},undefined,published.authored.otherwise??[]));
    const index=Object.fromEntries(compared.keys.map((k,i)=>[k,i]));
    const pick=(row,k)=>row.key[k];
    const out=compared.rows.map(row=>{
      const f=facilities.features.find(x=>String(x.id??x.properties?.id)===pick(row,'point_id'))??facilitiesSampled.features.find(x=>String(x.id)===pick(row,'point_id'));
      return {id:pick(row,'point_id'),position:f?.geometry?.coordinates??null,nearestSite:pick(row,'nearest_site_id'),
        groundM:numberOr(pick(row,'point_ground_m')),siteEgm2008M:numberOr(pick(row,'nearest_egm2008_m')),siteMssM:numberOr(pick(row,'nearest_mss_m')),
        seaAboveGeoidM:numberOr(pick(row,'sea_above_geoid_m')),elevationM:numberOr(pick(row,'elevation_m')),
        valueMm:numberOr(pick(row,'value_mm')),marginMm:numberOr(pick(row,'margin_mm')),level:pick(row,'level')??null};
    });
    void index;
    const siteRows=sitesSampled.features.map(f=>({id:String(f.id??f.properties?.site_id),site_id:f.properties?.site_id,position:f.geometry.coordinates,
      egm2008M:f.properties?.egm2008_m??null,mssM:f.properties?.mss_m??null}));
    return {fixture:{
      ...base('sea-level-heights-manila-001','sample_raster','Sample raster, rules and the published comparison: Manila facilities against projected sea level','src/sample-raster.ts#sampleRaster; src/rule-evaluation.ts#evaluateAuthored'),
      source:'HOT export of OpenStreetMap health facilities, Philippines (ODbL 1.0); DeltaDTM v1.1 (doi:10.4121/21997565, CC BY 4.0); DTU25MSS (doi:10.11583/DTU.29412275, CC BY 4.0); EGM2008 from PROJ (cdn.proj.org, public domain); IPCC AR6 projections (doi:10.5281/zenodo.5914709, CC BY 4.0); via the example example-2026-sea-level-rise-philippines',
      declaredParameters:{
        studyArea:area,
        windows:'Each grid kept as Raster input keeps it: the cells meeting the study area\'s bounding box, no padding. A grid published at nodes (EGM2008, DTU25MSS) is read as the cells around its nodes, half a cell out.',
        sampling:{egm2008_m:'bilinear between the four nearest node values, at the AR6 sites',mss_m:'bilinear between the four nearest node values, at the AR6 sites',
          ground_m:'the value of the DeltaDTM cell containing the facility; 30 is DeltaDTM\'s ceiling, kept as a value'},
        nearest:'Each facility\'s nearest AR6 site by great-circle distance.',
        heights:{sea_above_geoid_m:'mss_m - egm2008_m at the nearest site',above_1993_2012_m:'ground_m - sea_above_geoid_m',elevation_m:'above_1993_2012_m - 0.037'},
        projection:{select:chosen,column:'value_mm'},
        comparison:{elevation_mm:'elevation_m * 1000',margin_mm:'elevation_mm - value_mm',level:'Reaches where margin_mm <= 0, StaysBelow where margin_mm > 0, Unknown otherwise'}},
      input:{facilityCount:facilities.features.length,sites:siteRows},
      output:{facilities:out,reaches:out.filter(r=>r.level==='Reaches').length},
    },files:{'egm2008-window.tif':encodeGrid(egm),'dtu25mss-window.tif':encodeGrid(dtu),'deltadtm-window.tif':encodeGrid(dtm)}};
  },
  async 'chains-hagelloch-001'(){
    // WHO INFECTED WHOM, HAGELLOCH 1861 (experiment 200, steps 1 to 3), through Fieldwork's own functions as the canvas
    // runs them: the cases related to themselves on infector for the infector's prodrome date, the serial interval as one
    // date minus the other, and the cases counted by infector and related back on case_ID, the unmatched kept as 0.
    const cases=JSON.parse(await readFile(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
    const t=pointsAsTable(cases);
    const selfRequest={on:'infector',rightOn:'case_ID',bring:'date_of_prodrome',bringAs:'infector_prodrome',normalisation:'exact'};
    const rel=relateTable(t,t,{...selfRequest,unmatched:{decision:'keep',label:'no infector recorded',signature:relateShape(t,t,selfRequest).signature}}).table;
    const fields=[{attribute:'date_of_prodrome',predicate:'fwa:prodrome',kind:'date'},{attribute:'infector_prodrome',predicate:'fwa:infectorProdrome',kind:'date'}];
    const rules=[{any:[{all:[]}],then:[{predicate:'fwa:serial',column:'serial_interval_days',
      compute:{left:{field:'fwa:prodrome'},operator:'minus',right:{field:'fwa:infectorProdrome'}}}]}];
    const serial=evaluatedTable(rel,evaluateAuthored(authoredSubjects(rel),fields,rules));
    const counts=groupTable(t,{by:['infector'],aggregate:'count'}).table;
    const countRequest={on:'case_ID',rightOn:'infector',bring:'rows',bringAs:'secondary_cases',normalisation:'exact'};
    const secondary=relateTable(t,counts,{...countRequest,unmatched:{decision:'keep',label:'0',signature:relateShape(t,counts,countRequest).signature}}).table;
    const secondaryOf=new Map(secondary.rows.map(r=>[r.key.case_ID,Number(r.key.secondary_cases)]));
    const out=serial.rows.map(r=>({case_ID:r.key.case_ID,
      serialIntervalDays:r.key.serial_interval_days===''||r.key.serial_interval_days===undefined?null:Number(r.key.serial_interval_days),
      secondaryCases:secondaryOf.get(r.key.case_ID)??null}));
    return {fixture:{
      ...base('chains-hagelloch-001','relate_table','Relate, rules and a count: serial intervals and secondary cases, Hagelloch 1861','src/relate-table.ts#relateTable; src/rule-evaluation.ts#evaluateAuthored; src/group-table.ts#groupTable'),
      source:'Measles in Hagelloch, 1861 (Pfeilsticker 1863; Oesterle 1992), as measles_hagelloch_1861 in the R package outbreaks 1.9.0; the copy built into Fieldwork as examples/hagelloch-1861',
      declaredParameters:{
        serialInterval:'For each case whose infector is a case_ID: date_of_prodrome minus the infector\'s date_of_prodrome, in whole days. A case with no infector recorded has none.',
        secondaryCases:'For each case: the number of cases whose infector is its case_ID. A case nobody names is 0, declared by the practitioner.'},
      input:{cases:t.rows.map(r=>({case_ID:r.key.case_ID,infector:r.key.infector??'',date_of_prodrome:r.key.date_of_prodrome??''}))},
      output:{cases:out},
    },files:{}};
  },
  'lag-models-brazil-001'(){
    // ONE REGRESSION, ONE MODEL PER LAG (experiment 185). check 37's two municipalities and weeks, the temperature and the
    // rain each brought at four shifts by one Relate, and one Regression fitting a model per temperature column, each
    // adjusted for the rain at its own shift and fitted on its own rows. The lab builds the lagged columns itself with a
    // pandas merge on the shifted date, and fits each lag with statsmodels on that lag's complete rows.
    const csv=new URL('../../example-2024-brazil-dengue/data/dengue-rj-2010-2025.csv',import.meta.url);
    let text;
    try{text=readFileSync(csv,'utf8');}
    catch{throw new Error('example-2024-brazil-dengue is not on this machine beside this repository, so this fixture cannot be rebuilt here.');}
    const t=parseCSV(text,250_000,40_000_000);const h=t.headers.map(x=>x.trim());
    const PLACES=['Angra dos Reis','Petrópolis'];
    const EDGES=['2010-12-26','2011-12-25','2012-12-30','2013-12-29','2015-01-04','2016-12-25','2018-12-30','2019-12-29','2020-12-27','2021-12-26','2022-12-25','2024-12-29'];
    const COLUMNS=['municipio','anio','mes','data_iniSE','casos','tempmed','precip_total_semana'];
    const rows=t.rows.map(v=>Object.fromEntries(h.map((x,i)=>[x,v[i]??''])))
      .filter(r=>PLACES.includes(r.municipio)&&!EDGES.includes(r.data_iniSE))
      .map(r=>Object.fromEntries(COLUMNS.map(c=>[c,r[c]])));
    const SHIFTS=[0,-14,-28,14];
    const table=(keys,value)=>({kind:'data-table',keys,valueField:value,rowCount:rows.length,missingValueCount:0,
      rows:rows.map(r=>({key:Object.fromEntries(keys.map(k=>[k,r[k]])),value:r[value]===''?null:Number(r[value])}))});
    const cases=table(['municipio','anio','mes','data_iniSE'],'casos');
    const within={date:'data_iniSE',start:'data_iniSE',end:'data_iniSE'};
    const temps=relateAtShifts(cases,table(['municipio','data_iniSE'],'tempmed'),{on:'municipio',bring:'tempmed',within},SHIFTS);
    const both=relateAtShifts(temps.table,table(['municipio','data_iniSE'],'precip_total_semana'),
      {on:'municipio',bring:'precip_total_semana',within},SHIFTS);
    const exposures=temps.columns.map(c=>c.column),rains=both.columns.map(c=>c.column);
    const params={family:'poisson',outcome:'casos',exposure:{column:exposures[0],as:'numeric'},exposureColumns:exposures,
      adjust:[{column:rains[0],as:'numeric',perModel:rains}],strata:['municipio','anio','mes'],errors:'overdispersed'};
    const models=fitEachExposure(rowsOf(both.table),params,both.table.columnShifts);
    const out=regressionsTable(models);
    return {fixture:{
      ...base('lag-models-brazil-001','regression','Regression','src/regression.ts#fitEachExposure'),
      alsoExercises:[{widget:'urn:fieldwork:widget:relate_table',release:widgetOf('relate_table').currentVersion,
        implementation:'src/relate-table.ts#relateAtShifts'}],
      source:'Sánchez-Marqués and Sánchez, DATASET_MULTIMODAL_V8, Zenodo doi:10.5281/zenodo.22029053, CC BY 4.0, as extracted to example-2024-brazil-dengue/data/dengue-rj-2010-2025.csv. tempmed is InfoDengue\'s weekly mean air temperature; precip_total_semana is CHIRPS at one grid cell.',
      declaredParameters:{shifts:SHIFTS,relate:{on:'municipio',within,bring:['tempmed','precip_total_semana']},params,
        places:PLACES,leftOutWeeks:EDGES,
        semantics:'For each shift d in days, each week takes the tempmed and the precip_total_semana of the same municipality\'s week whose data_iniSE is its own data_iniSE plus d, or nothing when there is none. One Poisson model per shift: casos on tempmed at d, adjusted for precip_total_semana at the same d, one stratum per municipio x anio x mes, a stratum with no events dropped, fitted on the rows with every one of that model\'s columns present. Overdispersed: the Pearson chi-square over the residual degrees of freedom.',
        equivalentTo:"pandas: left.merge(right with data_iniSE moved back by d days, on municipio and data_iniSE, how='left'); statsmodels: sm.GLM(casos, [tempmed_d, precip_d, stratum indicators], family=Poisson()).fit(scale='X2') per d, over that d's complete rows."},
      input:{csvSha256:sha256(readFileSync(csv)),columns:COLUMNS,rowCount:rows.length,rows},
      output:{tableKeys:out.keys,
        models:models.map((m,k)=>({column:m.column,shiftDays:m.shiftDays,rain:rains[k],rows:m.result.rows,strata:m.result.strata,
          dispersion:m.result.dispersion,estimates:m.result.estimates.map(e=>({term:e.term,column:e.column,coefficient:e.coefficient,se:e.se}))}))},
      note:'Recompute from input.rows: the lagged columns by a merge on the shifted date, then each shift\'s model on its own complete rows. A model fitted on the rows complete for every shift would be a different analysis.'
    },files:{}};
  },
  'lag-response-brazil-001'(){
    // FIVE REGRESSIONS STACKED AND DRAWN (experiment 181). The estimates are the five Brazil lag models as played back
    // live in experiment 180, with one month term each so the selection has something to drop. The lab rebuilds the
    // stack with pandas.concat and the points with a pivot, and checks the scale and the line from the declaration.
    const LIVE=[[0,0.993,0.983,1.004],[2,0.979,0.969,0.989],[4,0.963,0.954,0.973],[6,1.007,0.997,1.017],[8,1.063,1.053,1.073]];
    const tables=LIVE.map(([,ratio,lower,upper])=>regressionTable({family:'poisson',measure:'rate ratio',level:95,
      estimates:[{term:'LST_Day_1km',column:'LST_Day_1km',ratio,lower,upper,p:0.01},
        {term:'mes[2]',column:'mes',level:'2',ratio:1.5,lower:1.4,upper:1.6,p:0.001}]}));
    const appendParams={nameSource:true,sourceColumn:'lag',labels:LIVE.map(([lag])=>String(lag)),labelsAreNumbers:{unit:'weeks before'}};
    const stacked=appendTables(tables,appendParams).table;
    const kept=selectRows(stacked,'term',['LST_Day_1km']).table;
    const chartParams={label:'Rate ratio per °C at each lag'};
    const chart=tableChart(kept,'lag');
    const spec=chartVegaSpec(chart,chartParams);
    const point=spec.layer.at(-1),line=spec.layer.length===3?spec.layer[0]:null;
    return {fixture:{
      ...base('lag-response-brazil-001','chart_output','Chart','src/chart-output.ts#tableChart; src/chart-vega.ts#chartVegaSpec'),
      alsoExercises:[{widget:widgetOf('append_rows').id,release:widgetOf('append_rows').currentVersion,implementation:'src/append-rows.ts#appendTables'},
        {widget:widgetOf('select_rows').id,release:widgetOf('select_rows').currentVersion,implementation:'src/derive-value.ts#selectRows'}],
      source:'The five Brazil lag models of Fieldwork experiment 180, as Regression reported them in the live playback of 2026-11-06, each with one month term added.',
      declaredParameters:{append:appendParams,select:{keyColumn:'term',values:['LST_Day_1km']},chart:{keyColumn:'lag',...chartParams},
        semantics:'Stack the tables in port order, each row labelled with its table\'s label in `lag`, declared a number in weeks. Keep the exposure term. At each lag draw the row whose statistic is the interval\'s estimate as a point, from its lower to its upper as a whisker. A ratio is drawn on a log scale whose domain holds every limit and 1, with a line at 1.',
        equivalentTo:"pandas: pd.concat(frames, keys=labels, names=['lag']).reset_index(level='lag'); lag as a number; df[df.term == 'LST_Day_1km'].pivot(index='lag', columns='statistic', values='value')"},
      input:{interval:tables[0].interval,
        tables:tables.map(t=>({keys:t.keys,valueField:t.valueField,rows:t.rows.map(r=>({key:r.key,value:r.value}))}))},
      output:{stacked:{keys:stacked.keys,numericKeys:stacked.numericKeys,rowCount:stacked.rowCount,
          rows:stacked.rows.map(r=>({key:r.key,value:r.value}))},
        points:point.data.values.map(v=>({at:v.at,estimate:v.estimate,lower:v.lower,upper:v.upper})),
        xType:point.encoding.x.type,yScale:point.encoding.y.scale.type,yDomain:point.encoding.y.scale.domain,
        referenceLine:line?line.data.values[0].one:null},
      note:'Rebuild the stack from `input.tables` and the labels, keep the exposure term, pivot the statistics, and compare each point and the scale.'
    },files:{}};
  },
  'select-range-london-001'(){
    // A RANGE IS "BETWEEN", and pandas has one: `Series.between(left, right, inclusive='both')`. The
    // table is London's daily deaths 2002 to 2006 as the Stata reader reads it, so the dates are the
    // dates `%td` declares. Ozone is a key here so a range of NUMBERS is checked too, where 9 must
    // come before 10 -- the case a text comparison gets wrong.
    const dta=new URL('../../example-2002-london-ozone/data/londondataset2002_2006.dta',import.meta.url);
    const read=readStata(readFileSync(dta));
    const at=name=>read.headers.indexOf(name);
    const table={kind:'data-table',keys:['date','ozone'],valueField:'numdeaths',
      rows:read.rows.map(row=>({key:{date:row[at('date')],ozone:row[at('ozone')]},value:Number(row[at('numdeaths')])})),
      rowCount:read.rows.length,missingValueCount:0};
    // 4. One ozone cell emptied, inside the range: a row with no value is outside every range.
    const target=table.rows.find(row=>Number(row.key.ozone)>=60&&Number(row.key.ozone)<=90);
    const holed={...table,rows:table.rows.map(row=>row===target?{...row,key:{...row.key,ozone:''}}:row)};
    const requests=[
      {note:'The August 2003 heatwave: a range of dates, both ends kept',keyColumn:'date',from:'2003-08-01',to:'2003-08-15',emptied:null},
      {note:'Ozone from 60 to 90: a range of numbers, compared as numbers',keyColumn:'ozone',from:'60',to:'90',emptied:null},
      {note:'An open end: every day from Christmas 2006',keyColumn:'date',from:'2006-12-25',to:'',emptied:null},
      {note:'Ozone from 60 to 90 with one in-range cell emptied: that row is dropped',keyColumn:'ozone',from:'60',to:'90',
        emptied:{date:target.key.date,wasOzone:target.key.ozone}}];
    const cases=requests.map(request=>{
      const result=selectRange(request.emptied?holed:table,request.keyColumn,request.from,request.to);
      return {...request,kept:result.kept,dropped:result.dropped,dates:result.table.rows.map(row=>row.key.date)};
    });
    return {fixture:{
      ...base('select-range-london-001','select_rows','Select rows by value','src/derive-value.ts#selectRange'),
      source:'Armstrong, Gasparrini and Tobias, London daily ozone, temperature and deaths 2002 to 2006, as published in londondataset2002_2006.dta; read by src/stata.ts.',
      declaredParameters:{semantics:'Keep the rows whose key column lies from `from` to `to`, both included. An empty end is open. Dates (ISO, year-month-day) compare as dates, numbers as numbers. A row with no value in the column is outside every range. Rows keep the table\'s order.',
        equivalentTo:"pandas: df[df[column].between(from, to, inclusive='both')] with the column parsed as dates or numbers; an open end is a one-sided comparison. NaN is outside, as here."},
      input:{dtaSha256:sha256(readFileSync(dta)),
        table:{keys:table.keys,valueField:table.valueField,rowCount:table.rowCount,
          rows:table.rows.map(row=>({key:row.key,value:row.value}))}},
      output:{cases},
      note:'Recompute each case from `input` and its own from, to and keyColumn. Case 4 empties the ozone of the row named in `emptied` first.'
    },files:{}};
  },

  'points-from-xy-001'(){
    // POINT DATA FROM A TABLE (experiment 178), against geopandas.points_from_xy. Two cases: NYC's ozone monitors, the
    // authors' site-day file totalled by site and position as the worked example does it, holding positions only (the
    // readings stay with their custodian); and a table of the rows a run must diagnose rather than refuse.
    const pkg=process.env.NYC_PKG;
    if(!pkg)throw new Error('Set NYC_PKG to a local copy of the NYC package: the monitors are read from it.');
    const zip=unzipSync(readFileSync(pkg));
    const name=Object.keys(zip).find(n=>n.endsWith('Data/Core/Derived/o3_site_day_raw_rebuild.csv'));
    const csv=parseCSV(new TextDecoder().decode(zip[name]),100_000,50_000_000);
    const at=h=>csv.headers.indexOf(h);
    const daily={kind:'data-table',keys:['date','site','Latitude','Longitude'],valueField:'value',rowCount:csv.rows.length,
      missingValueCount:0,rows:csv.rows.map(r=>({key:{date:r[at('date')],site:r[at('site')],Latitude:r[at('Latitude')],
        Longitude:r[at('Longitude')]},value:Number(r[at('value')])}))};
    const grouped=totalWithin(daily,{by:['site','Latitude','Longitude']}).table;
    const positionsOnly={kind:'data-table',keys:grouped.keys,valueField:'',rowCount:grouped.rowCount,missingValueCount:0,
      rows:grouped.rows.map(r=>({key:r.key,value:null}))};
    const edge={kind:'data-table',keys:['id','lon','lat'],valueField:'',rowCount:9,missingValueCount:0,
      rows:[['ok','-73.902','40.816'],['empty','',' 40.8'],['text','west','40.8'],['lat-high','-73.9','90.0001'],
        ['lon-low','-180.5','40'],['edge','-180','90'],['edge-2','180','-90'],['same','-73.902','40.816'],['spaced',' -73.5 ','40.5']]
        .map(([id,lon,lat])=>({key:{id,lon,lat},value:null}))};
    const run=(note,table,mapping)=>{const r=tablePoints(table,mapping);
      return {note,mapping,input:{keys:table.keys,rows:table.rows.map(row=>row.key)},
        output:{features:r.points.features.map(f=>({id:f.id,coordinates:f.geometry?.coordinates??null})),
          unplaced:r.unplaced,positions:r.positions,sharedPosition:r.sharedPosition}};};
    return {fixture:{
      ...base('points-from-xy-001','point_input','Point data','src/table-points.ts#tablePoints'),
      source:"NYC ozone monitor positions from Lian et al.'s Zenodo package (doi:10.5281/zenodo.22757330), o3_site_day_raw_rebuild.csv, custodian US EPA AQS; positions only. The second case is constructed.",
      declaredParameters:{semantics:'One point per row: x from the column named as x (the longitude), y from the column named as y (the latitude), CRS84. Values are trimmed text read as numbers. A row is not placed, and keeps no geometry, when either is empty, either is not a finite number, |x| > 180 or |y| > 90. Placed rows are counted by distinct position.',
        equivalentTo:"geopandas.points_from_xy(pd.to_numeric(df[x]), pd.to_numeric(df[y]), crs='EPSG:4326'), with the declared rule deciding which rows are placed"},
      output:{cases:[run('NYC ozone monitors, totalled by site and position',positionsOnly,{x:'Longitude',y:'Latitude',id:'site'}),
        run('Rows a run must diagnose rather than refuse',edge,{x:'lon',y:'lat',id:'id'})]},
      note:'Recompute each case from its input and mapping.'
    },files:{}};
  },

  async 'two-by-two-rates-snow-001'(){
    // THE RATE RATIO, NOW THE TWO-BY-TWO'S (experiment 161, step 6). Lab check 27's four comparisons, made by the
    // two-by-two's rate layout from tables the South London workflows themselves produce: Table IX as the bundle
    // carries it, and the supply-group totals the people workflow's `by-supply` step computes from Tables VIII and
    // XII. Nothing is retyped here, so a change to either workflow changes the fixture.
    const path=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
    const bundle=JSON.parse(gunzipSync(readFileSync(path)));
    const named=name=>{const found=bundle.workflows.filter(w=>w.document?.name===name);
      if(found.length!==1)throw new Error(`The South London checkout carries ${found.length} workflows named "${name}".`);
      return found[0].document;};
    const reasoner={reason:async()=>({conclusions:[]})};
    const tableIX=named('Deaths per house, by water company').nodes.find(n=>n.id==='table-ix').params.data;
    const people=(await executeWorkflow(structuredClone(named('Died or survived, by water supply')),reasoner)).tables['by-supply'];
    const SV='Southwark and Vauxhall Company only',LB='Lambeth Company only',BOTH='Lambeth Company and Southwark and Vauxhall Company';
    const houses={exposureColumn:'supplier',outcomeColumn:'measure',caseValue:'deaths',nonCaseValue:'',unitsAtRiskValue:'houses',level:95};
    const persons={exposureColumn:'water_supply',outcomeColumn:'measure',caseValue:'deaths_seven_weeks',nonCaseValue:'',
      unitsAtRiskValue:'population_1851',level:95};
    const compare=(note,table,request,exposed,unexposed,denominatorUnit)=>{
      const r=computeRateTwoByTwo(table,{...request,exposed,unexposed});
      const [rr]=r.estimates;
      const side=(label,events,unitsAtRisk)=>({name:label,label,events,unitsAtRisk,rate:events/unitsAtRisk});
      return {note,level:95,method:rr.method,denominatorUnit,
        request:{...request,exposed,unexposed},
        compared:side(exposed,r.cells.exposedEvents,r.cells.exposedUnitsAtRisk),
        reference:side(unexposed,r.cells.unexposedEvents,r.cells.unexposedUnitsAtRisk),
        ratio:rr.value,lower:rr.lower,upper:rr.upper,strataLeftOut:r.strataLeftOut,sentence:rateTwoByTwoSentence(r)};};
    const comparisons=[
      compare('Snow Table IX, per house',tableIX,houses,'Southwark and Vauxhall Company','Lambeth Company','houses'),
      compare('Table XII supply groups, per person',people,persons,SV,LB,'people'),
      compare('the intermingled area against Lambeth only',people,persons,BOTH,LB,'people'),
      compare('S&V only against the intermingled area',people,persons,SV,BOTH,'people')];
    const plain=t=>({keys:t.keys,valueField:t.valueField,rows:t.rows.map(row=>({key:row.key,value:row.value}))});
    return {fixture:{
      ...base('two-by-two-rates-snow-001','two_by_two','Two-by-two table','src/two-by-two-rates.ts#computeRateTwoByTwo'),
      source:'John Snow, On the Mode of Communication of Cholera, 2nd ed., 1855: Table IX for houses, as the South London example carries it; Tables VIII and XII totalled by declared water supply for people, by that example\'s own workflow.',
      declaredParameters:{semantics:'The two-by-two read as events and units at risk: for each group, the events are the row whose outcome-column value is caseValue and the units at risk the row whose value is unitsAtRiskValue. Rate ratio (a1/n1)/(a0/n0), with a log-normal interval exp(ln RR +/- z sqrt(1/a1 + 1/a0)), z for 95% being 1.959963984540054.',
        equivalentTo:"statsmodels.stats.rates.confint_poisson_2indep(a1, n1, a0, n0, method='wald-log')"},
      input:{tableIX:plain(tableIX),bySupply:plain(people)},
      output:{comparisons},
      note:'Recompute each comparison from its counts. The counts are also recoverable from `input` with the comparison\'s `request`.'
    },files:{}};
  },

  'regression-salmonella-001'(){
    // THE SALMONELLA CASE-CONTROL MODEL, as the worked example declares it: Galia melon in April, adjusted for age group
    // (seven groups) and sex, cases against the classical controls and, as a second case, against the panel controls.
    // CC BY 4.0, Luczynska et al. 2022, so the rows travel in the fixture; only the four columns the model reads.
    const dir=new URL('../../example-2021-salmonella-germany/data/',import.meta.url);
    const read=name=>{const text=readFileSync(new URL(name,dir),'utf8');const t=parseCSV(text,MAX_ROWS_SALMONELLA);
      const h=t.headers.map(x=>x.trim());
      return {sha256:sha256(Buffer.from(text,'utf8')),rows:t.rows.map(v=>Object.fromEntries(h.map((x,i)=>[x,v[i]==='NA'?'':(v[i]??'')])))};};
    const all=read('Complete_dataset_Luczynska_et_al_2022.csv'),panel=read('FM_HuGo_controls_Luczynska_et_al_2022.csv');
    const COLUMNS=['fall','galiamelo_apr2','age_group7','sex'];
    const keep=rows=>rows.map(r=>Object.fromEntries(COLUMNS.map(c=>[c,r[c]??''])));
    const params={family:'logistic',outcome:'fall',cases:['1'],controls:['0'],exposure:{column:'galiamelo_apr2',as:'categorical'},
      adjust:[{column:'age_group7',as:'categorical'},{column:'sex',as:'categorical'}]};
    const fitted=(rows,errors)=>{const r=fitRegression(rows,specFrom({...params,errors}));
      return {columns:r.columns,rows:r.rows,iterations:r.iterations,loglik:r.loglik,errors:r.errors,level:r.level,
        estimates:r.estimates.map(e=>({term:e.term,column:e.column,coefficient:e.coefficient,se:e.se,ratio:e.ratio,lower:e.lower,upper:e.upper}))};};
    const classical=keep(all.rows.filter(r=>r.fall==='1'||r.fall==='0'));
    const matched=keep([...all.rows.filter(r=>r.fall==='1'),...panel.rows]);
    const cases=[
      {note:'Cases against the classical controls, likelihood-ratio intervals: the published 96 (15-2100)',rowsFrom:'classical',errors:'profile',...fitted(classical,'profile')},
      {note:'Cases against the panel controls, likelihood-ratio intervals: the published 18 (4.6-100)',rowsFrom:'panel',errors:'profile',...fitted(matched,'profile')},
      {note:'Cases against the classical controls, Wald intervals from the model',rowsFrom:'classical',errors:'wald',...fitted(classical,'wald')}];
    return {fixture:{
      ...base('regression-salmonella-001','regression','Regression','src/regression.ts#fitRegression'),
      source:'Luczynska et al. 2022, Salmonella Braenderup outbreak, Germany 2021, case-control data. Zenodo doi:10.5281/zenodo.7333295, CC BY 4.0.',
      declaredParameters:{semantics:'Logistic regression of fall (case 1, control 0; other values left out) on galiamelo_apr2, adjusted for age_group7 and sex, each entered as categories against the first value in sorted order. Fitted by maximum likelihood (IRLS). Wald: coefficient plus or minus z times the standard error from the inverse information. Likelihood-ratio (profile): each limit is where the log-likelihood, refitted with that coefficient held fixed, has fallen by z^2/2 from its maximum. z for 95% is 1.959963984540054. A row missing any of the four columns is left out.',
        equivalentTo:"statsmodels: smf.glm('y ~ C(galiamelo_apr2) + C(age_group7) + C(sex)', family=Binomial()).fit(); R: glm(..., family = binomial) with confint() for the profile limits.",
        params},
      input:{columns:COLUMNS,classical:{sha256:all.sha256,rows:classical},panel:{sha256:panel.sha256,rows:matched}},
      output:{cases},
      note:'Recompute each case from its own rows (`rowsFrom`) and `errors`. Only reported terms are listed; the intercept is not.'
    },files:{}};
  },

  'regression-nyc-001'(){
    // THE NYC MODEL, fetched rather than carried. The daily counts are the New York City health department's, whose
    // terms reserve all rights, so neither Fieldwork's example nor this fixture redistributes them: the fixture names
    // the authors' Zenodo package, the member and its digest, and the lab fetches it. Exported from a local copy of
    // the same package, NYC_PKG, checked against that digest.
    const path=process.env.NYC_PKG;
    if(!path)throw new Error('Set NYC_PKG to a local copy of the authors\' Zenodo package to export this fixture.');
    const url='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
    const entry='NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0/Data/Core/Derived/analysis_master_raw_rebuild.csv';
    const archive=readFileSync(path),zip=unzipSync(archive),bytes=zip[entry];
    if(!bytes)throw new Error(`${entry} is not in ${path}.`);
    const t=parseCSV(new TextDecoder().decode(bytes),MAX_ROWS_NYC);const h=t.headers.map(x=>x.trim());
    const rows=t.rows.map(v=>Object.fromEntries(h.map((x,i)=>[x,v[i]==='NA'?'':(v[i]??'')]))).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
    const params={family:'poisson',outcome:'count',exposure:{column:'o3_lag02_10',as:'numeric'},
      adjust:[{column:'pm25_lag02_10',as:'numeric'},{column:'no2_lag02_10',as:'numeric'},{column:'tmean_lag03',as:'spline'},
        {column:'holiday',as:'numeric'}],strata:'stratum',hacLag:14,order:'date'};
    const fitted=errors=>{const r=fitRegression(rows,specFrom({...params,errors}));
      return {columns:r.columns,rows:r.rows,strata:r.strata,iterations:r.iterations,loglik:r.loglik,errors:r.errors,level:r.level,
        estimates:r.estimates.map(e=>({term:e.term,column:e.column,coefficient:e.coefficient,se:e.se,ratio:e.ratio,lower:e.lower,upper:e.upper}))};};
    return {fixture:{
      ...base('regression-nyc-001','regression','Regression','src/regression.ts#fitRegression'),
      source:'Lian D, et al. Data and code for: Ambient ozone and pediatric asthma emergency department visits in New York City. Zenodo doi:10.5281/zenodo.22757330. The authors\' materials CC BY 4.0; the daily counts NYC DOHMH EpiQuery, all rights reserved, so not carried here.',
      declaredParameters:{semantics:'Poisson regression of count on o3_lag02_10, adjusted for pm25_lag02_10, no2_lag02_10, a cubic B-spline of tmean_lag03 with 4 degrees of freedom (R splines::bs, interior knots at the type-7 quantiles, boundary at the range) and holiday, with one stratum per value of `stratum` absorbed by the conditional Poisson likelihood; a stratum with no events is dropped. Rows in date order; a row missing any model column is left out. Model-based errors from the inverse information; HAC errors Newey-West with Bartlett weights and 14 lags over the date-ordered rows, without small-sample correction.',
        equivalentTo:"statsmodels: smf.glm('count ~ o3_lag02_10 + pm25_lag02_10 + no2_lag02_10 + bs(tmean_lag03, df=4) + holiday + C(stratum)', family=Poisson()).fit(cov_type='HAC', cov_kwds={'maxlags': 14}); fixed effects for the strata give the conditional model's slopes. R: gnm(..., eliminate = stratum) with sandwich::NeweyWest(lag = 14, prewhite = FALSE).",
        params,authorsArchivedR:{coefficient:0.059133132965951,se:0.0127276822785079,note:'o3_lag02_10, HAC; from the authors\' archived R output in the package.'}},
      input:{remote:{url,entry,archiveSha256:sha256(archive),sha256:sha256(Buffer.from(bytes))},rowCount:rows.length,
        columns:['date','count','o3_lag02_10','pm25_lag02_10','no2_lag02_10','tmean_lag03','holiday','stratum']},
      output:{cases:[{note:'HAC errors, 14 lags: the published 1.061 (1.035-1.088) per 10 ppb',errors:'hac',...fitted('hac')},
        {note:'Model-based errors: the same coefficients, the information-matrix standard errors',errors:'wald',...fitted('wald')}]},
      note:'Fetch input.remote, check both digests, read the member as CSV with NA empty, sort by date, and recompute each case.'
    },files:{}};
  },

  'area-join-snow-001'(){
    // THE CHOROPLETH'S JOIN, run exactly as the worked example runs it: Table VIII through the
    // declared rate, then onto the study area's 33 named parts.
    //
    // What is independently checkable here is NOT the normalisation. `normaliseName` is this
    // project's own, and a check that re-implemented it would be this author's arithmetic
    // checking this author's arithmetic -- the trap check 27's record names. So the fixture
    // carries three things a separate implementation can recompute without it:
    //
    //   1. The JOIN given keys -- which part takes which value -- which is a merge.
    //   2. The RAW-STRING baseline, which needs no normalisation at all: 23 of 32 on equality.
    //   3. The pairs that only match once folded, so the check can state what the folding did
    //      rather than assume it, and refuse a folding that did something else.
    //
    // And a NEGATIVE CONTROL, constructed, because Snow's data has no near-miss pair that ought
    // to fail. Without one, 32 of 32 is also what a wrong-but-permissive rule scores.
    const {rateParams,joinParams,units,boundaryProvenance,rateTable:source}=southLondonTables();
    const rate=computeRate(fromTable(source,rateParams.measureKey||'measure'),rateParams);
    const table=rateTableOf(rate);
    const joined=joinTableToAreas(units,table,
      {keyField:joinParams.keyField,normalisation:joinParams.normalisation});
    const raw=joinTableToAreas(units,table,{keyField:joinParams.keyField,normalisation:'exact'});

    // A name differing by more than punctuation must NOT match. One boundary part is renamed to a
    // real place that is not in the table; the join has to report it rather than find a home for it.
    const renamed=units.map((unit,index)=>index===16?{id:'Camberwell Green',name:'Camberwell Green'}:unit);
    const control=joinTableToAreas(renamed,table,
      {keyField:joinParams.keyField,normalisation:joinParams.normalisation});

    const shape=result=>({
      counts:result.counts,
      declared:result.declared,
      parts:result.parts.map(p=>({index:p.index,id:p.id,name:p.name,key:p.key,
        value:p.value,matched:p.matched,shared:p.shared})),
      diagnostics:result.diagnostics});

    return {fixture:{
      ...base('area-join-snow-001','join_table_to_area','Join a table to the study area',
        'src/area-join.ts#joinTableToAreas'),
      source:"John Snow, On the Mode of Communication of Cholera, 2nd ed., 1855, Table VIII, through the rate the example declares over it. The part names are the study area's, digitised by Koch and Denike (2006) and modified by the Center for Spatial Data Science; see boundaryProvenance. Read from the example-1855-cholera-south-london checkout, not retyped.",
      boundaryProvenance,
      declaredParameters:{keyField:joinParams.keyField,normalisation:joinParams.normalisation,
        rate:{numeratorField:rateParams.numeratorField,denominatorField:rateParams.denominatorField,
          groupBy:rateParams.groupBy,multiplier:rateParams.multiplier,
          minimumDenominator:rateParams.minimumDenominator,rateKind:rateParams.rateKind,
          measureKey:rateParams.measureKey,denominatorUnit:rateParams.denominatorUnit},
        semantics:'Each part of the study area takes the value of the one table row whose key matches its name, compared for EQUALITY after a declared folding. `fuzzy` folds every run of non-alphanumeric characters to one space and lowercases; `exact` only trims and lowercases. There is no similarity, no threshold and no review band: a name differing by more than the folding is reported unmatched rather than resolved. A part no row names keeps its place with a null value, because a boundary with no data is a fact about the data and not a reason to leave a hole in the map. Two parts sharing one name both take that value and are flagged `shared`.',
        equivalentTo:'A pandas merge of the rate table onto the parts on a folded key, left on the parts so every part survives. The folding itself is NOT independently reimplemented here -- see notEstablished.'},
      input:{
        units:units.map((u,index)=>({index,id:u.id,name:u.name})),
        table:{keys:table.keys,valueField:table.valueField,unit:table.unit,
          rowCount:table.rows.length,
          rows:table.rows.map(r=>({key:r.key,value:r.value}))}},
      output:{cases:[
        {note:'The join the example runs, folding punctuation',normalisation:'fuzzy',
          units:'input.units',...shape(joined)},
        {note:'The same join on the raw strings, which needs no normalisation to recompute',
          normalisation:'exact',units:'input.units',...shape(raw)},
        {note:'A negative control, constructed: one part renamed to a place the table does not carry',
          normalisation:'fuzzy',
          units:'input.units with index 16 renamed from Camberwell to Camberwell Green',
          constructed:'Snow\'s table and these boundaries have no pair that differs by more than punctuation, so nothing in the data tests a name that OUGHT not to match. Without this case, 32 of 32 is also the score of a rule that matched too readily.',
          renamedIndex:16,renamedFrom:units[16].name,renamedTo:'Camberwell Green',
          ...shape(control)}]},
      note:'Recompute each case from `input` and `declaredParameters`. Case 2 is the baseline the folding is measured against; case 1 minus case 2 is what the folding bought, and case 3 is what it must still refuse.'
    },files:{}};
  },

  async 'sample-satellite-s5p-001'(){
    // SAMPLE SATELLITE FILES AT POINTS (experiment 179), against h5py and pyproj. A Sentinel-5P-shaped file made here,
    // with the paths, attributes, dtypes and chunking of the offline NO2 file, read by the same `readAtPoints` the
    // reading worker runs, and tabled by the same `sampleTable`. Synthetic, so it carries no Copernicus data and every
    // pixel's part is known: a swath that shears and widens across track as a real one does, in 3 x 2 chunks, with one
    // pixel per gap kind and qa_value 74, 75 and 76 beside each other, where the two operators differ.
    await h5wasm.ready;
    const rows=12,cols=10,chunks=[1,4,5],n=rows*cols;
    const lat=(r,c)=>40.40+0.045*r+0.004*c, lon=(r,c)=>-74.30+0.06*c*(1+0.03*c)-0.006*r;
    const FILL_VALUE=9.96921e36;
    const special={'5,4':{qa:100},'6,4':{qa:100},'4,6':{no2:FILL_VALUE,qa:255},'7,2':{qa:74},'7,3':{qa:75},'7,7':{qa:76},'3,8':{qa:255}};
    const no2=(r,c)=>special[`${r},${c}`]?.no2??3e-5+r*1e-6+c*1e-7;
    const qa=(r,c)=>special[`${r},${c}`]?.qa??(r<2?50:100);
    const grid=f=>Float32Array.from({length:n},(_,i)=>f(Math.floor(i/cols),i%cols));
    const dir=mkdtempSync(join(tmpdir(),'s5p-lab-')),path=join(dir,'sample-satellite-s5p-001.nc');
    let bytes,read;
    try{
      const out=new h5wasm.File(path,'w');
      const product=out.create_group('PRODUCT'),shape=[1,rows,cols];
      const put=(name,data,dtype,attrs)=>{const d=product.create_dataset({name,data,shape,dtype,chunks,compression:3});
        for(const [k,v] of Object.entries(attrs))d.create_attribute(k,v);};
      put('latitude',grid(lat),'<f',{units:'degrees_north'});
      put('longitude',grid(lon),'<f',{units:'degrees_east'});
      put('nitrogendioxide_tropospheric_column',grid(no2),'<f',{units:'mol m-2'});
      product.create_dataset({name:'qa_value',data:Uint8Array.from({length:n},(_,i)=>qa(Math.floor(i/cols),i%cols)),shape,dtype:'<B',chunks,compression:3})
        .create_attribute('scale_factor',new Float32Array([0.01]));
      product.create_dataset({name:'time_utc',data:Array.from({length:rows},(_,r)=>`2023-06-07T17:24:${String(r).padStart(2,'0')}.000000Z`),shape:[1,rows]});
      out.close();
      bytes=readFileSync(path);
      const centre=(r,c)=>[lon(r,c),lat(r,c)].map(v=>Math.fround(v));
      const between=(a,b,t,dx=0,dy=0)=>{const p=centre(...a),q=centre(...b);return [p[0]+(q[0]-p[0])*t+dx,p[1]+(q[1]-p[1])*t+dy];};
      // Each point says what it is there to test.
      const points=[
        ['on-centre','exactly on the centre of (5,4)',centre(5,4)],
        ['near-tie-along','just past halfway from (5,4) to (6,4), along track',between([5,4],[6,4],0.5,0,2e-5)],
        ['near-tie-across','just short of halfway from (5,4) to (5,5), across track',between([5,4],[5,5],0.4995)],
        ['chunk-edge','between columns 4 and 5, which are in different chunks',between([9,4],[9,5],0.52)],
        ['no-retrieval','on the pixel whose value is the fill',centre(4,6)],
        ['qa-74','on a pixel with qa_value 74',centre(7,2)],
        ['qa-75','on a pixel with qa_value 75: passes at or above, fails above',centre(7,3)],
        ['qa-76','on a pixel with qa_value 76',centre(7,7)],
        ['qa-fill','on a pixel whose qa_value is the fill, 255',centre(3,8)],
        ['row-0','in the first scanline, where qa_value is 50',between([0,1],[1,2],0.3)],
        ['past-edge-in','beyond the last column, within the off-swath margin (the margin is set by the nearer, along-track neighbour)',between([6,8],[6,9],1.4)],
        ['past-edge-out','beyond the last column, past the margin',between([6,8],[6,9],2.4)],
        ['far','far from the swath',[-73.0,41.5]],
      ].map(([id,why,[x,y]])=>({id,name:why,lon:x,lat:y}));
      const file=new h5wasm.File(path,'r');
      try{read=readAtPoints(file,{variable:'PRODUCT/nitrogendioxide_tropospheric_column',latitude:'PRODUCT/latitude',
        longitude:'PRODUCT/longitude',time:'PRODUCT/time_utc',quality:{variable:'PRODUCT/qa_value'}},points);}
      finally{file.close();}
      const reader=readerFor({route:{id:'pc-s5p-no2'}});
      if(!reader)throw new Error('The routes carry no reader for pc-s5p-no2.');
      const reading={itemId:'S5P_OFFL_L2__NO2____FIXTURE',href:'sample-satellite-s5p-001.nc',stream:'OFFL',orbit:29273,
        datetime:'2023-06-07T17:24:00Z',units:read.units,qaScale:read.qaScale,pixels:read.pixels,requests:null,bytes:null};
      // 8 June has no file, so every point has a "no overpass" row for it.
      const cases=['>=','>'].map(operator=>{const {table,counts}=sampleTable(points,[reading],'2023-06-07','2023-06-08',reader,operator);
        return {operator,counts:{rows:counts.rows,passing:counts.passing,belowQuality:counts.belowQuality,noRetrieval:counts.noRetrieval,
          noOverpass:counts.noOverpass},rows:table.rows.map(r=>({...r.key,value:r.value}))};});
      return {fixture:{
        ...base('sample-satellite-s5p-001','sample_satellite_files_at_points','Sample satellite files at points',
          'src/satellite-read.ts#readAtPoints, src/satellite-sample.ts#sampleTable'),
        source:'Synthetic: a Sentinel-5P-shaped NetCDF-4 file written by h5wasm in Node with the PRODUCT paths, attributes, dtypes and chunking of the offline NO2 file read on 2026-11-05. No Copernicus data.',
        declaredParameters:{file:'sample-satellite-s5p-001.nc',
          paths:{value:'PRODUCT/nitrogendioxide_tropospheric_column',latitude:'PRODUCT/latitude',longitude:'PRODUCT/longitude',
            quality:'PRODUCT/qa_value',time:'PRODUCT/time_utc'},
          from:'2023-06-07',until:'2023-06-08',fileDate:'2023-06-07',fileDatetime:reading.datetime,stream:reading.stream,orbit:reading.orbit,
          pixel:{rule:'the pixel whose centre is nearest the point, among centres with |lat| <= 90 and |lon| <= 180',
            distance:'sqrt(((lon - lon_c) * cos(lat of the point))^2 + (lat - lat_c)^2), in degrees',
            offSwath:`no pixel when that distance exceeds max(${OFF_SWATH_FACTOR} x half the distance from the centre to its nearest of the four neighbouring centres, measured the same way with cos(lat of the centre), ${OFF_SWATH_FLOOR} degrees)`},
          fill:{value:`values at or above ${FILL} are no retrieval`,quality:'a qa_value stored as 255 is no retrieval'},
          quality:{threshold:reader.quality.threshold,compare:'the stored integer against round(threshold / scale_factor)',operators:['>=','>']},
          table:'one row per point per file read, and one per point per day with no file, gap "no overpass" and nothing else filled. A point the file does not cover is "no overpass" too, with the file\'s own time, stream and orbit, so the row says which file was looked at. The value is kept only where it passed; qa_value is the stored integer times the scale factor, to 2 decimals, empty where it is the fill'},
        input:{points,file:'sample-satellite-s5p-001.nc',fileSHA256:sha256(bytes)},
        output:{tilesRead:read.tilesRead,pixels:read.pixels,qaScale:read.qaScale,units:read.units,cases},
        note:'Read the file with an independent HDF5 reader, find each point\'s pixel, read value, quality and time there, and rebuild both cases\' rows from `declaredParameters`.'
      },files:{'sample-satellite-s5p-001.nc':bytes}};
    }finally{rmSync(dir,{recursive:true,force:true});}
  },
  'clip-all-touched-001'(){
    // A small north-up CRS84 grid with a deterministic ramp, so a value disagreement is
    // traceable to a cell rather than hidden in noise.
    const width=24,height=18,origin=[25,-24],resolution=[.01,-.01];
    const metadata={width,height,bands:1,origin,resolution,
      bounds:[origin[0],origin[1]+height*resolution[1],origin[0]+width*resolution[0],origin[1]],
      crs:'EPSG:4326',rasterType:'PixelIsArea',noData:'nan',bits:64,sampleFormat:3,compression:1,
      blockWidth:width,blockHeight:1,bytesPerPixel:8,geoKeys:{},gdal:null,band:null,description:'Synthetic validation grid'};
    const values=Array.from({length:width*height},(_,i)=>Math.floor(i/width)*100+(i%width));
    const source={metadata,values};
    const tif=encodeRaster(source);
    // Deliberately awkward: vertices exactly on pixel corners, diagonal edges and a
    // concave notch, because pixel-edge alignment is where rasterization conventions differ.
    const cutline={type:'Polygon',coordinates:[[[25.03,-24.03],[25.17,-24.03],[25.17,-24.09],[25.11,-24.09],[25.11,-24.14],[25.195,-24.155],[25.06,-24.16],[25.045,-24.105],[25.03,-24.03]]]};
    const cases=[{method:'all-touched',marginPixels:0},{method:'all-touched',marginPixels:1},{method:'cell-center',marginPixels:0}].map(options=>{
      const clipped=clipRaster({...source,asset:undefined},cutline,options);
      const m=clipped.metadata,rows=[];
      for(let row=0;row<m.height;row++)rows.push(clipped.values.slice(row*m.width,(row+1)*m.width).map(v=>v===null?'0':'1').join(''));
      return {options,window:{origin:m.origin,width:m.width,height:m.height,bounds:m.bounds},
        counts:{included:clipped.mask.inside,valid:clipped.mask.valid,excluded:clipped.mask.outside},
        includedRows:rows,includedValues:clipped.values.filter(v=>v!==null)};
    });
    return {fixture:{
      ...base('clip-all-touched-001','clip_raster','Clip raster','src/raster-mask.ts#rasterCellPredicate'),
      declaredParameters:{crs:'EPSG:4326',rasterType:'PixelIsArea',sourceRaster:'clip-all-touched-001.tif',
        sourceGrid:{width,height,origin,resolution,bounds:metadata.bounds,noData:'nan',dataType:'float64'},
        cutline,cases:cases.map(c=>c.options),
        semantics:'A cell is included when its centre is inside or on the cutline, or when the cutline comes within marginPixels of the cell rectangle (all-touched) or of its centre (cell-center). The margin is a distance in native pixels, not metres. The operation crops to the included window and writes NoData outside the cutline.'},
      selfReported:{cells:width*height,cases:cases.length},
      input:{raster:'clip-all-touched-001.tif',rasterSHA256:sha256(tif),cutline},
      output:cases,
      note:'Rebuild the clip from the GeoTIFF, the cutline and each case’s options. Row strings are one character per cell, 1 included and 0 excluded, within that case’s cropped window.'
    },files:{'clip-all-touched-001.tif':tif}};
  }
};

// A DRY RUN OVER EVERY BUILDER, which exists because of a failure nothing caught.
//
// relate_table 0.3.0 made an undeclared gap a refusal, and two of the three cases in the relate
// builder withhold or corrupt a key on purpose. So this script threw, the lab's input could not be
// regenerated, and nothing reported it: `check` does not run this file. The breakage was found by
// hand on 2026-10-28 while re-establishing parity, which is the wrong way to find it.
//
// Builds every fixture in memory and writes nothing. A builder that throws is the finding, and the
// message is the widget's own refusal, which is usually enough to say what changed.
//
// SKIPS RATHER THAN FAILS where the worked example is not checked out beside this repository: the
// builders read their tables from it, that is a clone that has not happened rather than a defect,
// and `validate:examples` already treats a missing sibling the same way.
if(process.argv.includes('--dry-run')){
  const missing=/is not checked out beside this repository/;
  // DATA NOBODY MAY REDISTRIBUTE: a builder that needs a local copy of a package whose terms keep it out of every
  // repository (NYC's counts) cannot build where that copy is absent. Named, per builder, rather than counted broken.
  const external=/Set NYC_PKG to a local copy/;
  // AN EXAMPLE THIS MACHINE DOES NOT HOLD: CI checks out some examples and not others. Named, and the rest still built.
  const elsewhere=/is not on this machine beside this repository/;
  const broken=[],notHere=[];
  let skipped=null;
  for(const [fixtureId,build] of Object.entries(builders)){
    try{await build();}
    catch(error){
      const message=error instanceof Error?error.message:String(error);
      if(missing.test(message)){skipped=message;break;}
      if(external.test(message)||elsewhere.test(message)){notHere.push(fixtureId);continue;}
      broken.push({fixtureId,message});
    }
  }
  if(notHere.length)console.log(`Validation fixtures: ${notHere.join(', ')} not built here: needs a local copy of data that is not redistributed, or an example not checked out here.`);
  if(skipped){
    console.log('Validation fixtures: not built. '+skipped);
    process.exit(0);
  }
  const total=Object.keys(builders).length;
  if(broken.length){
    console.error(`Validation fixtures: ${broken.length} of ${total} builder(s) cannot build.`);
    for(const {fixtureId,message} of broken)console.error(`  \u2022 ${fixtureId}: ${message}`);
    console.error('  A builder that throws means the lab cannot regenerate its own input, so a');
    console.error('  parity check is pinned to a release the application no longer behaves like.');
    process.exit(1);
  }
  console.log(`Validation fixtures: ${total-notHere.length} of ${total} builders build, nothing written.`);
  process.exit(0);
}

const [id,outputDir]=process.argv.slice(2);
if(!builders[id]||!outputDir)throw new Error(`Usage: node scripts/export-validation-fixture.mjs <${Object.keys(builders).join('|')}> <outputDir>\n       node scripts/export-validation-fixture.mjs --dry-run`);
const {fixture,files}=await builders[id]();
// Binary assets travel with their digest declared inside the fixture. A sidecar cannot be
// read from the lab's browser kernel at all, which is the other half of the 2026-10-11
// finding, so nothing beside the file is written any more.
fixture.assets=Object.fromEntries(Object.entries(files).map(([name,bytes])=>
  [name,{sha256:sha256(bytes),bytes:bytes.length}]));
for(const [name,bytes] of Object.entries(files))await writeFile(`${outputDir}/${name}`,bytes);
// The integrity covers the fixture with this field absent, so it can state its own digest
// without containing it.
fixture.integrity={algorithm:'sha256-canonical-json',
  note:'SHA-256 of this fixture with the integrity field removed, serialised with object keys sorted, no whitespace and UTF-8. Not the file\'s bytes: the lab reads fixtures through a transport that re-serialises JSON.',
  value:canonicalDigest(fixture)};
// A POSITION ON ONE LINE. Indented, every coordinate of a boundary took four lines, and two published levels came to
// 5.4 MB; a ring of them on one line, 1.1 MB. The integrity is over the canonical form, so the layout is free to change.
const json=JSON.stringify(fixture,null,2).replace(/\[\s+(-?[\d.eE+-]+),\s+(-?[\d.eE+-]+)\s+\]/g,'[$1,$2]')
  // and a ring of them on one line too
  .replace(/\[\s+(\[-?[\d.eE+-]+,-?[\d.eE+-]+\](?:,\s+\[-?[\d.eE+-]+,-?[\d.eE+-]+\])*)\s+\]/g,(_m,ring)=>`[${ring.replace(/,\s+/g,',')}]`)+'\n';
await writeFile(`${outputDir}/${id}.json`,json);
console.log(`Wrote ${id}.json${Object.keys(files).length?' and '+Object.keys(files).join(', '):''} to ${outputDir}`);
console.log(`  integrity ${fixture.integrity.value.slice(0,16)} over canonical JSON; no sidecar`);
