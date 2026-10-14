// Exports validation fixtures for the accompanying Validation Lab.
// Data crosses one way only: Fieldwork exports, the lab reads and recomputes from
// declaredParameters alone. See docs/experiments/41-validation-lab.md.
//
// Usage: node scripts/export-validation-fixture.mjs <fixtureId> <outputDir>
//        fixtureId: reproject-utm35s-001 | project-forward-utm30n-001 | clip-all-touched-001
//                   | measure-area-001 | mean-center-001
//                   | reachability-soho-001 | corridor-soho-001
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
import {extentN3,extentProjection} from '../build/rule-application.js';
import {runInThisContext} from 'node:vm';
import {readFileSync} from 'node:fs';
import {resolveRuleset} from '../build/rulesets.js';

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
      ...base('hex-soho-001','hex_aggregate','Aggregate points in hexagons','src/geoprivacy.ts#aggregateHex'),
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
      ...base('summarize-polygons-soho-001','summarize_polygons','Summarize points in polygons','src/catchments.ts#summarizePolygons'),
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

const [id,outputDir]=process.argv.slice(2);
if(!builders[id]||!outputDir)throw new Error(`Usage: node scripts/export-validation-fixture.mjs <${Object.keys(builders).join('|')}> <outputDir>`);
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
const json=JSON.stringify(fixture,null,2)+'\n';
await writeFile(`${outputDir}/${id}.json`,json);
console.log(`Wrote ${id}.json${Object.keys(files).length?' and '+Object.keys(files).join(', '):''} to ${outputDir}`);
console.log(`  integrity ${fixture.integrity.value.slice(0,16)} over canonical JSON; no sidecar`);
