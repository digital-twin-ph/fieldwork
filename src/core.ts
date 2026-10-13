import {sampleRaster,sampleReceipt,validateSampleNode} from './sample-raster.js';
import {bufferPoint,validateBufferPointNode} from './buffer-point.js';
import {facilitiesValue,migrateHealthsitesNodes,validateFindHealthFacilitiesNode} from './health-facilities.js';
import {convexHull,validateHullNode} from './convex-hull.js';
import {combinedArea,validateCombinedAreaNode} from './combined-area.js';
import {snapToNetwork,validateSnapNode} from './network-snap.js';
import {reachableNodes,validateReachNode} from './reachable-nodes.js';
import {reachableCorridor,validateCorridorNode} from './reachable-corridor.js';
import {travelTimeBand,validateBandNode} from './travel-time-band.js';
import {stackPolygons,validateStackNode,isPolygonPort,polygonPort,MAX_POLYGON_LAYERS} from './stack-polygons.js';
import {fillInteriorGaps,validateFillNode} from './fill-interior-gaps.js';
import {expandMicroWorkflows} from './compositions.js';
import {resolveComposition} from './composition-registry.js';
/** Resolves a named credential to its secret. No current widget needs one; the credential
 *  manager stands on its own (experiment 30) and executeWorkflow still accepts a resolver so a
 *  future authenticated source does not change this signature. */
export type CredentialResolver=(ref:string,provider:string,origin:string)=>string;
import {computeIsochrone} from './catchment-executor.js';
import {moveDonut,aggregateHex,validatePrivacyNode,privacyReceipt} from './geoprivacy.js';
import {comparePointSets,comparisonReceipt,comparisonMap,validatePointComparisonNode} from './point-comparison.js';
import type {PointComparison} from './point-comparison.js';
import {computeMeanCenter,meanCenterReceipt,validateMeanCenterNode} from './mean-center.js';
import type {MeanCenter} from './mean-center.js';
import {bufferArea,validateBuffer} from './area-buffer.js';
import {CATCHMENT_TYPES,validateNetwork,validateCatchmentNode,voronoi,isochrone,clipPolygons,summarizePolygons,catchmentReceipt} from './catchments.js';
import type {Polygons,Network} from './catchments.js';
import {polygonDisplay,polygonPresentationReceipt} from './catchment-output.js';
import {loadRaster,clipRaster,rasterReceipt,validateRasterAsset} from './raster-workflow.js';
import {validateClipOptions} from './raster.js';
import {projectFiles} from './project-files.js';
import type {RasterGrid} from './raster.js';
import {chartOutput} from './chart-output.js';
import {chartSpecificationFacts,chartRenderer} from './chart-vega.js';
import {mapSpecificationFacts} from './map-communication.js';
import {assertProjectManifest,syncProjectManifest} from './project-manifest.js';
import {migrateOutputNodes,decisionPresentation} from './output-contract.js';
import {referencedPDFs,evidenceProvenance} from './evidence.js';
import type {Workflow,WorkflowNode,NodeDefinition,NodeType,PortType,PointFeature,PointCollection,Position,ParamsByType,PointInput,Scalar,DistanceUnit,RetiredNodeType,RenamedNodeType,CandidateCondition} from './types.js';
import {RENAMED_NODE_TYPES} from './types.js';
// Re-exported so the registry validator can cross-check a declared rename against the one the
// application actually performs, from the same bundle it already reads TYPES out of.
export {RENAMED_NODE_TYPES};
import type {Reasoner} from './worker-types.js';
import type {AreaValue,CoverageValue,DisplayValue,WorkflowRun,Output,Receipt,NearestRow,Status} from './results.js';
import type {OldInputs} from './old-naledi.js';
import {isRecord,required} from './guards.js';
interface ExecutionInputs extends OldInputs {polygons:Polygons;network:Network;sites:PointCollection;reached:PointCollection;points:PointCollection;original:PointCollection;moved:PointCollection;pumps:PointCollection;originalCenter:MeanCenter;movedCenter:MeanCenter;comparison:PointComparison;raster:RasterGrid;table:import('./data-table.js').DataTable;projections:import('./sea-level.js').ProjectionTable;series:import('./case-series.js').SeriesTable;records:PointCollection;cases:import('./data-table.js').DataTable;assignments:import('./sea-level.js').AssignmentTable;coverage?:CoverageValue;candidates:PointCollection;distances:{rows:NearestRow[];centers:PointFeature[];method:string};alert:ParamsByType['alert'];decisions:DisplayValue}
import classification from '../widgets/classification.json' with {type:'json'};
import {OLD_TYPES,validateOldNode,executeOldNode,migrateFacilitySources,applyAccessReview,applyFacilityGrading,gradedPointLayer,distancesAsAccess} from './old-naledi.js';
import {resolveRuleset,bindParameters,rulesetCitation} from './rulesets.js';
import {outreachProjection,projectionOf,RULESET_FOR_NODE_TYPE,pinnedRuleset,parametersFor} from './rule-application.js';
import {travelTime,travelTimeReceipt,validateTravelTime,TRAVEL_TIME_METHOD} from './travel-time.js';
import {studyAreaN3,geometryBounds,validateDrawnGeometry} from './study-area.js';
import {measureArea,validateAreaUnit} from './area-measurement.js';
import {checkCoverage,validateCoverageParams} from './spatial-coverage.js';
import {mapOutput} from './map-output.js';
import {tableOutput} from './table-output.js';
import {MAX_POINT_LAYERS,pointPort,isPointPort} from './point-layers.js';
import {validateAttributeSchema} from './attribute-schema.js';
import {defaultSpatialReference,validateSpatialReference} from './spatial-reference.js';
import {utmDefinition} from './reproject.js';
import {dataTable,tableReceipt,MAX_TABLE_ROWS} from './data-table.js';
import {computeRate,fromPoints,rateTable,rateChart,rateReceipt,validateRateNode} from './rate.js';
import {caseSeries,caseSeriesFromTable,seriesTable,seriesChart,seriesReceipt,validateCaseSeriesNode} from './case-series.js';
import {projectionExtract,projectionTable,readExtract,assignSites,assignmentTable,compareToElevation,extractReceipt,assignmentReceipt,comparisonReceipt as thresholdReceipt,validateSeaLevelNode} from './sea-level.js';
import {distanceKm,nearestOf,satisfies} from './nearest-neighbour.js';
export const NS = 'urn:fieldwork:';
export const TYPES:Record<NodeType,NodeDefinition> = {
  mean_center:{title:'Mean center',group:'Spatial operations',icon:'⊙',color:'teal',description:'Compute the unweighted center of point locations in a metric CRS',inputs:[['points','points']],output:'mean-center'},
  compare_point_sets:{title:'Compare point sets',group:'Spatial operations',icon:'⊕',color:'teal',description:'Compare two mean centers and locate them against reference pumps',inputs:[['original','points'],['moved','points'],['pumps','points']],output:'point-comparison'},
  comparison_map:{title:'Comparison map',group:'Outputs',icon:'◈',color:'green',description:'Show original and moved locations side by side with their mean centers and pumps',inputs:[['comparison','point-comparison']],output:null},
  donut_geomask:{title:'Move points in a donut',group:'Spatial operations',icon:'◎',color:'teal',description:'Shift points within a configured distance band; educational preview, not a privacy guarantee',inputs:[['points','points']],output:'points'},
  hex_aggregate:{title:'Aggregate points in hexagons',group:'Spatial operations',icon:'⬡',color:'teal',description:'Count points in hexagonal cells and omit sparse cells',inputs:[['points','points']],output:'polygons'},
  buffer_area:{title:'Buffer study area',group:'Spatial operations',icon:'◎',color:'teal',description:'Expand an acquisition boundary without changing the reporting area',inputs:[['area','area']],output:'area'},
  ...CATCHMENT_TYPES,
  table_input:{title:'Tabular data',group:'Sources',icon:'▤',color:'blue',description:'Import a long-format table keyed by declared columns; no geometry',inputs:[],output:'table'},
  rate:{title:'Rate with a denominator',group:'Summaries',icon:'÷',color:'teal',description:'Divide counts by a declared population at risk, stating what the denominator counts',inputs:[['records','points']],output:'table'},
  case_series:{title:'Cases by period',group:'Summaries',icon:'▦',color:'teal',description:'Count cases per day, week or month by a declared kind of date',inputs:[['points','points']],output:'table'},
  slr_extract_import:{title:'Sea-level projection extract',group:'Sources',icon:'≈',color:'blue',description:'Declare an imported long-format table as a bounded extract of published AR6 projections',inputs:[['projections','table']],output:'table'},
  slr_site_assignment:{title:'Assign projection site',group:'Spatial operations',icon:'⊕',color:'teal',description:'Assign each point its nearest published projection site and record the distance',inputs:[['points','points'],['sites','points'],['projections','table']],output:'table'},
  slr_threshold_comparison:{title:'Compare level to elevation',group:'Comparisons and checks',icon:'⋚',color:'purple',description:'Compare one projected change against a supplied elevation on a stated datum',inputs:[['assignments','table']],output:'decisions'},
  reproject:{title:'Reproject input',group:'Sources',icon:'⇄',color:'blue',description:'Import projected UTM points and convert them to WGS84 longitude/latitude',inputs:[],output:'points'},
  raster_input:{title:'Raster input',group:'Sources',icon:'▦',color:'blue',description:'Import a window from a local GeoTIFF around the study area',inputs:[['area','area']],output:'raster'},
  // Extracted from `access`, which derived proxy minutes inside a nearest-neighbour search. A
  // widget and not a knob: a minutes column changes every row for every consumer of `distances`,
  // so the contract moves, which is what the knob test refuses. And not a third value of the unit
  // knob either -- minutes is a model, not a unit.
  travel_time:{title:'Travel time from distance',group:'Spatial operations',icon:'◷',color:'teal',
    description:'Estimate walking minutes from each distance at a stated speed, as a proxy rather than a routed time',
    inputs:[['distances','distances']],output:'distances'},
  // One entry for every declared ruleset, replacing policy, access_policy and xpert, which
  // differed only in which rules they ran. Ports are the ruleset's and are pinned per node, so
  // inputs is empty and output is null here, exactly as micro_workflow declares them.
  apply_ruleset:{title:'Apply ruleset',group:'Semantic reasoning',icon:'⋈',color:'purple',
    description:'Apply a declared, versioned ruleset to classify an input',
    inputs:[],output:null},
  micro_workflow:{title:'Micro-workflow',group:'Micro-workflows',icon:'⧈',color:'indigo',
    description:'A saved composition used as one step, which can be exploded into its primitives',
    inputs:[],output:null},
  fill_interior_gaps:{title:'Fill interior gaps',group:'Spatial operations',icon:'◍',color:'teal',description:'Make each polygon solid by dropping its interior gaps, which enlarges it',inputs:[['polygons','polygons']],output:'polygons'},
  stack_polygons:{title:'Collect polygon layers',group:'Spatial operations',icon:'▤',color:'teal',description:'Gather several polygon layers into one without merging them, largest first',inputs:[['polygons','polygons'],['polygons_2','polygons'],['polygons_3','polygons'],['polygons_4','polygons'],['polygons_5','polygons'],['polygons_6','polygons']],output:'polygons'},
  travel_time_band:{title:'Travel time band',group:'Spatial operations',icon:'◔',color:'teal',description:'Narrow reachable junctions to a shorter time, recomputing the budget left at each',inputs:[['reached','points']],output:'points'},
  reachable_corridor:{title:'Reachable corridor',group:'Spatial operations',icon:'▦',color:'teal',description:'The strip of ground along the streets a traveller can get down within the budget',inputs:[['reached','points'],['network','network']],output:'polygons'},
  reachable_nodes:{title:'Reachable junctions',group:'Spatial operations',icon:'◴',color:'teal',description:'Street junctions within a travel time, each carrying the budget left on arrival',inputs:[['sites','points'],['network','network']],output:'points'},
  snap_to_network:{title:'Snap to street network',group:'Spatial operations',icon:'⇥',color:'teal',description:'Attach each site to its nearest network node, carrying how far it moved',inputs:[['sites','points'],['network','network']],output:'points'},
  summarize_combined_area:{title:'Combined area',group:'Summaries',icon:'∪',color:'teal',description:'Overlapping and touching areas become one; separate areas stay separate',inputs:[['polygons','polygons']],output:'polygons'},
  summarize_hull:{title:'Convex hull',group:'Summaries',icon:'⬟',color:'teal',description:'The smallest convex outline containing a set of points, computed in metres',inputs:[['points','points']],output:'polygons'},
  find_health_facilities:{title:'Find health facilities',group:'Sources',icon:'⌖',color:'blue',description:'Retrieve health facilities inside the study area from OpenStreetMap, an HDX country export, or a healthsites.io download',inputs:[['area','area']],output:'points'},
  buffer_point:{title:'Area around a point',group:'Spatial operations',icon:'◍',color:'teal',description:'Define a study area as everything within a stated distance of one named point',inputs:[['points','points']],output:'area'},
  sample_raster:{title:'Sample raster at points',group:'Spatial operations',icon:'◴',color:'teal',description:'Write the value of the raster cell containing each point onto that point',inputs:[['points','points'],['raster','raster']],output:'points'},
  clip_raster:{title:'Clip raster',group:'Spatial operations',icon:'✂',color:'teal',description:'Mask raster cells with a clipping boundary',inputs:[['area','area'],['raster','raster']],output:'raster'},
  places: {title:'Neighborhoods', group:'Sources', icon:'▦', color:'blue', description:'Local neighborhood locations', inputs:[], output:'points'},
  centers: {title:'Cooling centers', group:'Sources', icon:'⌂', color:'blue', description:'Local facility locations', inputs:[], output:'points'},
  alert: {title:'Heat alert', group:'Sources', icon:'☀', color:'amber', description:'Assessment context', inputs:[], output:'alert'},
  // Ports renamed 2026-10-12. They were `places` and `centers`, which is the heat demo's
  // vocabulary on a general operation: given a point and a set of points, report the distance to
  // the nearest member of the set. D7 names this failure -- a port name that encodes a use rather
  // than what the port carries -- and it is why this widget read as example-specific while its
  // computation never was. The unit knob landed earlier the same day.
  measure_distance: {title:'Measure distance', group:'Spatial operations', icon:'⌁', color:'teal', description:'For each point, the straight-line distance to the nearest of a set of candidate points', inputs:[['points','points'],['candidates','points']], output:'distances'},
  policy: {title:'Outreach criteria', group:'Semantic reasoning', icon:'⋈', color:'purple', description:'Apply N3 rules with EYE-JS', inputs:[['distances','distances'],['alert','alert']], output:'decisions'},
  ...OLD_TYPES,
  // Generalised in place on 2026-10-12, out of OLD_TYPES and into the shared palette. The grid
  // was always a general operation; its title said "Sample locations", its description promised
  // "demonstration points", and it lived in one example's module. src/point-grid.ts holds it now.
  point_grid:{title:'Point grid',group:'Spatial operations',icon:'▦',color:'teal',description:'Generate a regular grid of points inside a boundary at a stated spacing',inputs:[['area','area']],output:'points'},
  measure_area:{title:'Calculate area',group:'Spatial operations',icon:'▱',color:'teal',description:'Attach an area measurement to the study area',inputs:[['area','area']],output:'area'},
  point_input:{title:'Point data',group:'Sources',icon:'▦',color:'blue',description:'Import point observations or generate synthetic records',inputs:[],output:'points'},
  coverage_check:{title:'Check spatial coverage',group:'Comparisons and checks',icon:'◎',color:'purple',description:'Identify observations outside the study boundary',inputs:[['area','area'],['points','points']],output:'coverage-check'},
  map_output:{title:'Map',group:'Outputs',icon:'◈',color:'green',description:'Display the study polygon and points, including outside records',inputs:[['area','area'],['points','points'],['coverage','coverage-check'],['raster','raster']],output:null},
  table_output:{title:'Table',group:'Outputs',icon:'☷',color:'green',description:'Display point coordinates, attributes and available review decisions',inputs:[['points','points'],['coverage','coverage-check']],output:null},
  chart_output:{title:'Chart',group:'Outputs',icon:'▥',color:'green',description:'Count reasoning results by decision, access zone or evidence tier',inputs:[['decisions','decisions']],output:null},
  output: {title:'Visual output', group:'Outputs', icon:'◈', color:'green', description:'Display results as a map, table, or bar chart', inputs:[['decisions','decisions']], output:null}
};
const point = (id:string,name:string,coordinates:Position|null|undefined):PointFeature => ({type:'Feature',id,properties:{name},geometry: coordinates ? {type:'Point',coordinates} : null});
/** The port type a node emits.
 *
 *  For a widget this is decided by its type, and this function is that lookup. It exists as
 *  a function because a micro-workflow node's output is decided by the composition it
 *  carries rather than by its node type, and edge validation has to ask the node.
 *
 *  The counterpart of `nodeInputs`, which has been node-dependent since `map_output` gained
 *  input modes. Inside a composition the static lookup is still correct: members are
 *  registry widgets, never compositions, so nothing nests. */
export function outputOf(node:WorkflowNode):PortType|null{
  if(node.type==='apply_ruleset')return node.params.ruleset?.output??null;
  if(node.type==='micro_workflow')return node.params.composition?.output??null;
  return TYPES[node.type].output;
}

export function nodeInputs(node:WorkflowNode):[string,PortType][]{
  // One node type serves every composition, so the ports are the composition's, pinned in
  // the node rather than looked up: a saved workflow validates without the file present.
  // An unconfigured one has no ports, which is the honest answer for a node on a canvas
  // whose composition has not been chosen yet.
  if(node.type==='apply_ruleset')return structuredClone(node.params.ruleset?.inputs??[]);
  if(node.type==='micro_workflow')return structuredClone(node.params.composition?.inputs??[]);
  if(node.type==='compare_point_sets'&&node.params.centers)return [...TYPES.compare_point_sets.inputs,['originalCenter','mean-center'],['movedCenter','mean-center']];
  if(node.type==='chart_output'&&node.params.inputMode==='series')return [['series','table']];
  if(node.type==='case_series')return node.params.source==='table'?[['cases','table']]:[['points','points']];
  if(['map_output','table_output','chart_output'].includes(node.type)&&'inputMode' in node.params&&node.params.inputMode==='polygons')return node.type==='map_output'&&node.params.contextPoints?[['polygons','polygons'],['context','points']]:[['polygons','polygons']];
  if(node.type==='table_output'&&node.params.inputMode==='table')return [['table','table']];
  if(node.type==='map_output'&&node.params.inputMode==='raster')return [['raster','raster']];
  // A street network is a thing to look at, not only a thing to route over. Four widgets consume a
  // `network` and none of them was an output, so a downloaded network could not be seen.
  if(node.type==='map_output'&&node.params.inputMode==='network')return [['network','network']];
  if((node.type==='map_output'||node.type==='table_output')&&node.params.inputMode==='decisions')return [['decisions','decisions']];
  if(node.type!=='map_output'&&node.type!=='table_output'&&node.type!=='coverage_check')return TYPES[node.type].inputs;
  return [...(node.type==='table_output'?[]:[['area','area']]),...Array.from({length:node.params.pointInputCount??1},(_,i)=>[pointPort(i),'points']),...(['map_output','table_output'].includes(node.type)?[['coverage','coverage-check']]:[]),...(node.type==='map_output'?[['raster','raster']]:[])] as [string,PortType][];
}
export function exampleWorkflow():Workflow {
  return {schema:'fieldwork/workflow/1',name:'Heat outreach screening',nodes:[
    {id:'neighborhoods',type:'point_input',x:35,y:52,params:{label:'Neighborhoods',data:{type:'FeatureCollection',features:[point('oakwood','Oakwood',[-84.455,33.873]),point('northgate','Northgate',[-84.337,33.875]),point('riverside','Riverside',[-84.438,33.812]),point('midtown','Midtown',[-84.37,33.79]),point('eastfield','Eastfield',[-84.277,33.795]),point('brookside','Brookside',[-84.421,33.734]),point('southpark','South Park',[-84.34,33.72]),point('cedar','Cedar Heights',null)]}}},
    {id:'centers',type:'point_input',x:35,y:229,params:{label:'Cooling centers',data:{type:'FeatureCollection',features:[point('library','Central Library',[-84.367,33.79]),point('community','West Community Hall',[-84.426,33.823])]}}},
    {id:'nearest',type:'measure_distance',x:323,y:90,params:{unit:'kilometres'}},
    {id:'alert',type:'alert',x:323,y:284,params:{active:true,date:'2026-07-15'}},
    // The template names the ruleset rather than the retired `policy` type, so the shipped example
    // does not depend on a migration running. The threshold is the ruleset's declared parameter now,
    // with its unit on the declaration instead of buried in a field name.
    {id:'criteria',type:'apply_ruleset',x:605,y:151,params:{label:'Outreach criteria',
      ruleset:pinnedRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0'),parameters:{threshold:5}}},
    {id:'map',type:'map_output',x:879,y:70,params:{label:'Outreach map',inputMode:'decisions'}},
    {id:'table',type:'table_output',x:879,y:249,params:{label:'Decision table',inputMode:'decisions'}}
  ],edges:[
    {id:'e1',from:'neighborhoods',to:'nearest',port:'points'}, {id:'e2',from:'centers',to:'nearest',port:'candidates'},
    {id:'e3',from:'nearest',to:'criteria',port:'distances'}, {id:'e4',from:'alert',to:'criteria',port:'alert'},
    {id:'e5',from:'criteria',to:'map',port:'decisions'},
    {id:'e6',from:'criteria',to:'table',port:'decisions'}]};
}
export function validateGeoJSON(data:unknown,{attributes=false}={}):PointCollection {
  if (!isRecord(data) || data.type !== 'FeatureCollection' || !Array.isArray(data.features) || data.features.length > 2000) throw new Error('Use a GeoJSON FeatureCollection with at most 2,000 point features.');
  const ids = new Set();
  return {type:'FeatureCollection',features:data.features.map((feature,i)=>{
    if (!isRecord(feature)||feature.type !== 'Feature') throw new Error(`Record ${i+1} is not a Feature.`);
    const id = String(feature.id ?? `point-${i+1}`);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new Error('Feature IDs must be unique letters, numbers, hyphens, or underscores (max 80).');
    ids.add(id);
    const g = feature.geometry;
    if(feature.properties!==undefined&&feature.properties!==null&&!isRecord(feature.properties))throw new Error('Invalid point properties.');
    if (g !== null && (!isRecord(g) || g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2 || !g.coordinates.slice(0,2).every(Number.isFinite) || Math.abs(g.coordinates[0]) > 180 || Math.abs(g.coordinates[1]) > 90)) throw new Error(`Invalid point coordinates for ${id}. Use longitude, latitude in CRS84, or null for a missing location.`);
    const normalized=point(id,String(feature.properties?.name ?? id).slice(0,100),g===null?null:(g as {coordinates:number[]}).coordinates.slice(0,2));
    if(attributes){const entries=Object.entries(feature.properties||{});if(entries.length>50||entries.some(([key,value])=>!key||key.length>100||['__proto__','constructor','prototype'].includes(key)||!(value===null||typeof value==='boolean'||typeof value==='string'&&value.length<=1000||typeof value==='number'&&Number.isFinite(value))))throw new Error('Use at most 50 scalar attributes per record, with text up to 1,000 characters.');normalized.properties={...Object.fromEntries(entries) as Record<string,Scalar>,name:normalized.properties.name};}
    return normalized;
  })};
}
export function validateWorkflow(raw:unknown):Workflow {
  if (!isRecord(raw) || raw.schema !== 'fieldwork/workflow/1' || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges) || raw.nodes.length > 50 || raw.edges.length > 100) throw new Error('Invalid Fieldwork workflow. Maximum 50 nodes and 100 connections.');
  // Individual node/edge fields are checked below before this value leaves the boundary.
  const w = structuredClone(raw) as unknown as Workflow, ids = new Set<string>();
  referencedPDFs(w);
  assertProjectManifest(w);
  // Normalize historical heat sources before validation to preserve scalar attributes.
  w.nodes=w.nodes.map(n=>n && (n.type==='places'||n.type==='centers')
    ? {...n,type:'point_input',sourceMigration:{fromType:n.type,version:'1'}} : n);
  // `nearest`'s input ports were renamed from the heat demo's `places`/`centers` to the general
  // `points`/`candidates`. A saved workflow still names the old ones, and an edge whose port no
  // longer exists is refused, so it is rewritten here rather than failing to open.
  const nearestNodes=new Set(w.nodes.filter(n=>n&&n.type==='measure_distance').map(n=>n.id));
  for(const edge of w.edges)
    if(edge&&nearestNodes.has(edge.to)&&(edge.port==='places'||edge.port==='centers'))
      edge.port=edge.port==='places'?'points':'candidates';
  // policy, access_policy and xpert differed only in which rules they ran, and the rules are
  // declared data now, so all three become one apply_ruleset node with their ruleset pinned at the
  // version that produced their results. Stamped, because a retirement that silently rewrites a
  // practitioner's saved work is the thing retirement was supposed to make visible.
  w.nodes=w.nodes.map(n=>{
    const pin=n&&RULESET_FOR_NODE_TYPE[n.type as string];
    if(!pin)return n;
    return {...n,type:'apply_ruleset',sourceMigration:{fromType:n.type as RetiredNodeType,version:'1'},
      params:{label:(n.params as {label?:string}).label||TYPES[n.type].title,
        ruleset:pinnedRuleset(pin.id,pin.version),
        parameters:parametersFor(pin.id,pin.version,n.params as Record<string,unknown>)}};
  }) as typeof w.nodes;
  // A rename is not a retirement: the operation is unchanged, so the old identifier keeps
  // resolving and a saved workflow opens and runs rather than being refused. Stamped like every
  // other migration, so a practitioner can see that the file was rewritten on open.
  w.nodes=w.nodes.map(n=>{
    const renamed=n&&RENAMED_NODE_TYPES[n.type as RenamedNodeType];
    return renamed?{...n,type:renamed,sourceMigration:{fromType:n.type as RenamedNodeType,version:'1' as const}}:n;
  }) as typeof w.nodes;
  migrateHealthsitesNodes(w);
  migrateFacilitySources(w);
  migrateOutputNodes(w);
  // Every migration above has run, so a node still naming a retired widget is one that cannot be
  // migrated — and the practitioner's rule is that such a workflow ceases to work, naming the
  // widget. It used to fail further down as "Incompatible node connection", which told a reader
  // nothing about why a file that opened last week does not open today.
  for(const node of w.nodes){
    const retired=(classification.widgets as {nodeType:string; retired?:boolean}[])
      .find(entry=>entry.nodeType===node?.type&&entry.retired);
    if(retired)throw new Error(`This workflow uses ${TYPES[node.type]?.title||node.type}, which was retired `
      +`and cannot be replaced automatically. Rebuild that step and save the workflow again; `
      +`docs/usage.md lists what replaced each retired widget.`);
  }
  for (const n of w.nodes) {
    validatePrivacyNode(n);
    validatePointComparisonNode(n);
    validateMeanCenterNode(n);
    validateCatchmentNode(n);
    if(n.type==='buffer_area'){validateBuffer(n.params.distanceM);if(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>100)throw new Error('Name the buffered area using 1–100 characters.');}
    if (!Object.hasOwn(TYPES,n.type) || !/^[a-zA-Z0-9_-]{1,80}$/.test(n.id) || ids.has(n.id)) throw new Error('Invalid or duplicate node.');
    ids.add(n.id);
    if (![n.x,n.y].every(Number.isFinite) || Math.abs(n.x)>10000 || Math.abs(n.y)>10000 || !n.params) throw new Error('Invalid node position or parameters.');
    if((n.type==='study_area'||n.type==='point_input'||n.type==='places'||n.type==='centers')){n.params.spatialReference??=defaultSpatialReference();validateSpatialReference(n.params.spatialReference);}
    if ((n.type==='places'||n.type==='centers'||n.type==='point_input')) n.params.data=validateGeoJSON(n.params.data,{attributes:n.type==='point_input'});
    if(n.type==='summarize_hull')validateHullNode(n);
    if(n.type==='summarize_combined_area')validateCombinedAreaNode(n);
    if(n.type==='snap_to_network')validateSnapNode(n);
    if(n.type==='reachable_nodes')validateReachNode(n);
    if(n.type==='reachable_corridor')validateCorridorNode(n);
    if(n.type==='travel_time_band')validateBandNode(n);
    if(n.type==='stack_polygons')validateStackNode(n);
    if(n.type==='fill_interior_gaps')validateFillNode(n);
    if(n.type==='apply_ruleset'){
      const r=n.params.ruleset;
      if(!r||!/^urn:fieldwork:ruleset:[a-z0-9-]+$/.test(r.id||'')||!/^\d+\.\d+\.\d+$/.test(r.version||''))
        throw new Error('A rule application names a ruleset by id and version. A rule change changes results, so the version is pinned.');
      if(!Array.isArray(r.inputs)||!r.inputs.length||!r.output)
        throw new Error(`${r.title||r.id} pins no ports, so nothing could connect to it.`);
      // Resolving it here is what makes a workflow naming a ruleset this build does not carry
      // refuse to open, by name, rather than failing somewhere inside the executor.
      const ruleset=resolveRuleset(r.id,r.version);
      for(const parameter of ruleset.parameters){
        const value=n.params.parameters?.[parameter.name];
        if(!Number.isFinite(value))throw new Error(`${ruleset.title} needs a value for ${parameter.name}: ${parameter.meaning}`);
        if((parameter.min!==undefined&&value<parameter.min)||(parameter.max!==undefined&&value>parameter.max))
          throw new Error(`${parameter.name} must be between ${parameter.min} and ${parameter.max}.`);
      }
    }
    if(n.type==='micro_workflow'){
      const c=n.params.composition;
      if(!c||typeof c.id!=='string'||!/^urn:fieldwork:composition:[a-z][a-z_]*$/.test(c.id)
        ||!/^\d+\.\d+\.\d+$/.test(c.version||'')||typeof c.nodeType!=='string'||typeof c.title!=='string')
        throw new Error('A micro-workflow names a composition by id and version.');
      if(!Array.isArray(c.inputs)||!c.inputs.length||!c.output)
        throw new Error(`${c.title||c.nodeType} pins no ports, so nothing could connect to it.`);
      if(new Set(c.inputs.map(([port])=>port)).size!==c.inputs.length)
        throw new Error(`${c.title} pins the same port twice.`);
      if(!n.params.parameters||typeof n.params.parameters!=='object')
        throw new Error(`${c.title} needs its parameter values.`);
      for(const [key,value] of Object.entries(n.params.parameters))
        if(!['string','number','boolean'].includes(typeof value))
          throw new Error(`${c.title}: ${key} must be a single value.`);
    }
    if(n.type==='find_health_facilities')validateFindHealthFacilitiesNode(n);
    if(n.type==='buffer_point')validateBufferPointNode(n);
    if(n.type==='sample_raster')validateSampleNode(n);
    validateSeaLevelNode(n);
    validateCaseSeriesNode(n);
    validateRateNode(n);
    if(n.type==='table_input'){
      const t=n.params.data;
      if(!t||t.kind!=='data-table'||!Array.isArray(t.rows))throw new Error('Tabular input holds no table. Import a long-format CSV.');
      // An unconfigured node is a valid draft, as a Reproject node without a file is; the
      // contract is checked once a table exists, and execution refuses to run without one.
      if(t.rows.length){
        if(!Array.isArray(n.params.keys)||!n.params.keys.length)throw new Error('Tabular input needs at least one key column.');
        if(typeof n.params.valueField!=='string'||!n.params.valueField)throw new Error('Tabular input needs a value column.');
        if(t.keys.join('\u0000')!==n.params.keys.join('\u0000')||t.valueField!==n.params.valueField)throw new Error('The saved table does not match its declared key and value columns.');
      }
      if(t.rows.length>MAX_TABLE_ROWS)throw new Error(`Tabular input supports at most ${MAX_TABLE_ROWS.toLocaleString()} rows.`);
    }
    // Reproject stores the already-converted CRS84 collection, so it is validated as geographic here.
    if(n.type==='reproject'){utmDefinition(n.params.zone,n.params.hemisphere);n.params.spatialReference??=defaultSpatialReference();validateSpatialReference(n.params.spatialReference);n.params.data=validateGeoJSON(n.params.data,{attributes:true});}
    if(n.type==='point_input'){validateAttributeSchema(n.params.data,n.params.fields,n.params.attributeRules);if(n.params.pinIdStrategy!==undefined&&!['sequential','uuid'].includes(n.params.pinIdStrategy))throw new Error('Choose sequential or UUID identifiers for new pins.');}
    if((n.type==='map_output'||n.type==='table_output')&&n.params.inputMode!==undefined&&!(n.type==='map_output'?['spatial','decisions','raster','polygons','network']:['spatial','decisions','polygons','table']).includes(n.params.inputMode))throw new Error('Choose spatial inputs or reasoning results.');
    if(n.type==='map_output'&&((n.params.presentation!==undefined&&!['plot','interactive'].includes(n.params.presentation))||(n.params.contextPoints!==undefined&&typeof n.params.contextPoints!=='boolean')))throw new Error('Invalid polygon map presentation.');
    // The subtitle and source-note limits were raised on 2026-10-13, measured against the first
    // figures configured for an outside reader: the Snow subtitles need 176 and 200 characters to
    // say what the figure shows AND what it does not claim, and a full citation with its licence
    // runs to 253. The title stays at 120, because something longer than that is not a title.
    if(n.type==='map_output'&&((n.params.showLegend!==undefined&&typeof n.params.showLegend!=='boolean')||(n.params.basemap!==undefined&&!['none','osm','topo'].includes(n.params.basemap))||(['mapTitle','mapSubtitle','mapSourceNote'] as const).some(key=>n.params[key]!==undefined&&(typeof n.params[key]!=='string'||n.params[key]!.length>({mapTitle:120,mapSubtitle:280,mapSourceNote:500}[key])))))throw new Error('Invalid map presentation settings.');
    if(n.type==='chart_output'&&n.params.inputMode!==undefined&&!['decisions','polygons','series'].includes(n.params.inputMode))throw new Error('Invalid chart input mode.');
    if(n.type==='chart_output'&&n.params.bandMeasure!==undefined&&!['cumulative','difference'].includes(n.params.bandMeasure))throw new Error('Choose cumulative band counts or the difference between neighbouring bands.');
    // A difference is computed by the Vega-Lite specification, so it needs that renderer.
    if(n.type==='chart_output'&&n.params.bandMeasure==='difference'&&chartRenderer(n.params)!=='vega-lite')throw new Error('Band differences are computed in the Vega-Lite specification, so select the Vega-Lite renderer.');
    if(n.type==='chart_output'&&((n.params.renderer!==undefined&&!['html','vega-lite'].includes(n.params.renderer))||(n.params.mark!==undefined&&!['bar','point'].includes(n.params.mark))||(n.params.orientation!==undefined&&!['horizontal','vertical'].includes(n.params.orientation))))throw new Error('Choose a supported chart renderer, mark and orientation.');
    // Vertical is no longer gated on the renderer. The classic bars have always had a column branch
    // and the series default has always reached it, so refusing a practitioner who states the same
    // value explicitly was incoherent -- and from 2026-10-13 vertical is the default for every bar
    // chart, which would have made the default unstatable. The point mark stays gated: the HTML
    // renderer draws bars and has nothing to draw a dot with.
    if(n.type==='chart_output'&&chartRenderer(n.params)!=='vega-lite'&&n.params.mark==='point')throw new Error('A dot chart requires the enhanced renderer; the classic bars draw bars.');
    if(n.type==='chart_output'){
      // Raised to match the map's on 2026-10-13, and for the same reason: a chart subtitle does the
      // same job as a map's -- state what the figure shows and what it does not claim -- and the
      // epidemic curve needs 187 characters to say that date of death is not date of onset. The
      // axis titles stay at 80, which is already generous for an axis.
      for(const [key,limit] of Object.entries({chartTitle:120,subtitle:280,xAxisTitle:80,yAxisTitle:80,sourceNote:500})){const value=n.params[key as keyof typeof n.params];if(value!==undefined&&(typeof value!=='string'||value.length>limit))throw new Error(`Chart ${key} must be text of at most ${limit} characters.`);}
      if(n.params.colorByCategory!==undefined&&typeof n.params.colorByCategory!=='boolean')throw new Error('Chart legend setting must be true or false.');
    }
    if(n.type==='clip_raster'&&n.params.cutline!==undefined){if(!n.params.cutline||!['bbox','polygon'].includes(n.params.cutline.selectionMode))throw new Error('Invalid clip boundary settings.');validateDrawnGeometry(n.params.cutline.geometry);}
    if(n.type==='raster_input'||n.type==='clip_raster'){if(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>60)throw new Error('Raster node names require 1-60 characters.');if(n.type==='raster_input'&&n.params.asset)validateRasterAsset(n.params.asset);if(n.type==='clip_raster'){if(!n.params.method)throw new Error('Choose a raster mask method.');validateClipOptions(n.params);}}
    if (n.type==='output') {
      n.params.view ??= 'map';
      if (!['map','table','bars'].includes(n.params.view)) throw new Error('Visual outputs must use a map, table, or bar chart.');
      if (n.params.label !== undefined && (typeof n.params.label!=='string' || n.params.label.length>60)) throw new Error('Output names must be text of at most 60 characters.');
    }
    if (n.type==='travel_time') validateTravelTime(n.params.speedMPerMin);
    if (n.type==='point_grid' && (!Number.isFinite(n.params.spacingM) || n.params.spacingM<150 || n.params.spacingM>1000)) throw new Error('spacingM must be between 150 and 1000.');
    if (n.type==='policy' && (!Number.isFinite(n.params.thresholdKm) || n.params.thresholdKm<0 || n.params.thresholdKm>1000)) throw new Error('Distance threshold must be between 0 and 1,000 km.');
    if (n.type==='alert' && (![true,false,null].includes(n.params.active) || !/^\d{4}-\d{2}-\d{2}$/.test(n.params.date) || !Number.isFinite(Date.parse(n.params.date)) || new Date(n.params.date).toISOString().slice(0,10)!==n.params.date)) throw new Error('Invalid heat alert or assessment date.');
    if(Object.hasOwn(OLD_TYPES,n.type))validateOldNode(n);
    if(n.type==='measure_area')validateAreaUnit(n.params.unit);
    if(n.type==='coverage_check')validateCoverageParams(n.params);
    if((n.type==='map_output'||n.type==='table_output'||n.type==='coverage_check')&&n.params.pointInputCount!==undefined&&(!Number.isInteger(n.params.pointInputCount)||n.params.pointInputCount<1||n.params.pointInputCount>MAX_POINT_LAYERS))throw new Error('Use 1–8 point input ports.');
    if((n.type==='map_output'||n.type==='table_output'||n.type==='chart_output')&&(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>60))throw new Error(`${TYPES[n.type].title} names must be text of 1–60 characters.`);
  }
  const edgeIds=new Set(), ports=new Set();
  for (const e of w.edges) {
    if (typeof e.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(e.id) || edgeIds.has(e.id)) throw new Error('Invalid or duplicate connector ID.');
    edgeIds.add(e.id);
    const a=w.nodes.find(n=>n.id===e.from),b=w.nodes.find(n=>n.id===e.to);
    if (!a || !b || a.id===b.id || !outputOf(a) || nodeInputs(b).find(([p])=>p===e.port)?.[1] !== outputOf(a)) throw new Error('Incompatible node connection.');
    const key=`${e.to}:${e.port}`;
    if (ports.has(key)) throw new Error('Each input port accepts one connection.');
    ports.add(key);
  }
  for(const n of w.nodes.filter(n=>n.type==='compare_point_sets')){const sources=w.edges.filter(e=>e.to===n.id).map(e=>e.from);if(new Set(sources).size!==sources.length)throw new Error('Compare point sets needs distinct original, moved, and pump sources.');}
  for(const n of w.nodes.filter(n=>n.type==='compare_point_sets'&&n.params.centers))for(const [pointPort,centerPort] of [['original','originalCenter'],['moved','movedCenter']]){
    const point=w.edges.find(e=>e.to===n.id&&e.port===pointPort)?.from,center=w.edges.find(e=>e.to===n.id&&e.port===centerPort)?.from;
    if(!point||!center)continue;
    if(w.nodes.find(x=>x.id===center)?.type!=='mean_center'||!w.edges.some(e=>e.to===center&&e.port==='points'&&e.from===point))throw new Error('Each Mean center must use the same point source as its comparison branch.');
  }
  const visited=new Set(), stack=new Set();
  for(const n of w.nodes.filter(n=>(n.type==='map_output'||n.type==='table_output'||n.type==='coverage_check'))){const sources=w.edges.filter(e=>e.to===n.id&&isPointPort(e.port)).map(e=>e.from);if(new Set(sources).size!==sources.length)throw new Error('Connect each point source once per operation.');}
  for(const n of w.nodes.filter(n=>(n.type==='map_output'||n.type==='table_output'))){const inputs=w.edges.filter(e=>e.to===n.id);if(inputs.some(e=>e.port==='raster')&&n.params.inputMode!=='raster')throw new Error('Choose Raster mode for a connected raster.');if(inputs.some(e=>e.port==='coverage')&&inputs.length>1)throw new Error(`${TYPES[n.type].title} accepts either a coverage check or separate ${n.type==='map_output'?'area and ':''}points. Disconnect the other inputs first.`);}
  function visit(id:string) {if(stack.has(id)) throw new Error('Workflow cycles are not supported. Keep inference inside the rule node.');if(visited.has(id))return;stack.add(id);w.edges.filter(e=>e.to===id).forEach(e=>visit(e.from));stack.delete(id);visited.add(id);}
  w.nodes.forEach(n=>visit(n.id));
  if(w.outputId && !w.nodes.some(n=>n.id===w.outputId && ['output','map_output','table_output','chart_output','comparison_map'].includes(n.type))) throw new Error('Selected output does not exist.');
  projectFiles(w);
  if(w.manifest)syncProjectManifest(w);
  return w;
}
/** Nodes the plan is built backwards from. A node with no output that nothing consumes is
 *  invisible to the walk, so a terminal node must be named here or it never runs. */
function resultNodes(w:Pick<Workflow,'nodes'>){return w.nodes.filter(n=>['output','measure_area','coverage_check','map_output','table_output','chart_output','comparison_map'].includes(n.type));}
export function executionPlan(workflow:Workflow) {
  const w=validateWorkflow(workflow), outputs=resultNodes(w);
  if(!outputs.length){
    if(!w.nodes.length||!w.nodes.every(n=>n.type==='study_area'))throw new Error('Add a visual output before running, or start with a Study area node.');
    outputs.push(...w.nodes);
  }
  for(const n of w.nodes)if(n.type==='study_area'&&n.params.source==='drawn'&&!n.params.geometry)throw new Error('Select a study area on the map before running.');
  const result:WorkflowNode[]=[], done=new Set<string>();
  function visit(node:WorkflowNode) {if(done.has(node.id))return;const inputs=['map_output','table_output'].includes(node.type)?(w.edges.some(e=>e.to===node.id&&e.port==='coverage')?[['coverage']]:nodeInputs(node).filter(([port])=>port!=='coverage'&&(port!=='raster'||node.type==='map_output'&&node.params.inputMode==='raster'))):nodeInputs(node);for(const [port] of inputs){if(node.type==='network_input'&&port==='area'&&!w.edges.some(e=>e.to===node.id&&e.port==='area'))continue;
      // The area is optional here: a country names the scope instead. Required only when the
      // practitioner has asked for the study area to bound the request.
      const e=w.edges.find(e=>e.to===node.id && e.port===port);if(!e)throw new Error(`${TYPES[node.type].title} needs its ${port} input connected.`);visit(required(w.nodes.find(n=>n.id===e.from)));} done.add(node.id);result.push(node);}
  outputs.forEach(visit);return result;
}
// Moved to src/nearest-neighbour.ts, beside the search that uses it, and re-exported so every
// existing caller is unaffected. See that file for what a sphere costs against an ellipsoid.
export {distanceKm};
/** The distance from each point to the nearest of a set of candidates, in the stated unit.
 *
 *  Given a point and a set of points, the distance to the nearest candidate: that is the whole
 *  operation, and the unit is a parameter because baking one in is how three widgets came to
 *  implement it separately. A point with no coordinates, or an empty candidate set, returns a
 *  null distance **and a reason** -- which is what lets `policy` answer Unknown rather than
 *  defaulting, so it is part of the contract and not an error path. */
export function nearestPlaces(places:PointCollection,centers:PointCollection,unit:DistanceUnit='kilometres',
  candidateFilter?:CandidateCondition[]):{rows:NearestRow[];candidateCount:number;eligibleCount:number} {
  // The filter runs before the search, on the candidates' own attributes. Its two counts are the
  // filter's provenance and belong in this receipt, where the exclusion and the search cannot
  // disagree about what was considered -- which is what holding it as a knob buys over a
  // separate node.
  const located=centers.features.filter(f=>f.geometry);
  const valid=located.filter(f=>satisfies(f.properties,candidateFilter));
  const inUnit=(kilometres:number)=>unit==='metres'?kilometres*1000:kilometres;
  const rows=places.features.map(place=>{
    if (!place.geometry || !valid.length) return {id:place.id,name:place.properties.name,attributes:{...place.properties},coordinates:place.geometry?.coordinates ?? null,distance:null,unit,center:null,reason:!place.geometry?'This point has no coordinates.':'No candidate point with valid coordinates is available.'};
    // One shared search, three callers: see src/nearest-neighbour.ts.
    const match=nearestOf(place.geometry.coordinates,valid,center=>center.geometry?.coordinates);
    const best=match!.candidate,distance=match!.kilometres;
    return {id:place.id,name:place.properties.name,coordinates:place.geometry.coordinates,attributes:{...place.properties},distance:inUnit(distance),unit,center:{id:best!.id,name:best!.properties.name,coordinates:best!.geometry!.coordinates,attributes:{...best!.properties}}};
  });
  return {rows,candidateCount:located.length,eligibleCount:valid.length};
}
export function makeN3(rows:NearestRow[],alert:ParamsByType['alert'],threshold:number) {
  // `nearest` states its unit, and this threshold is in kilometres, so a metres input would be
  // compared against a kilometre number and every decision would be wrong by a factor of a
  // thousand with nothing raised. Refused rather than converted: the threshold is a practitioner's
  // judgement in a stated unit, and silently reinterpreting it would change what they decided.
  const units=new Set(rows.map(row=>row.unit));
  if(units.size>1)throw new Error('These distances carry more than one unit, so one threshold cannot apply to them.');
  const unit=[...units][0]??'kilometres';
  if(unit!=='kilometres')
    throw new Error(`Outreach criteria compares a threshold in kilometres, and these distances are in ${unit}. `
      +`Set Nearest point to kilometres, or state the threshold in ${unit}.`);
  const prefix='@prefix fw: <urn:fieldwork:>.\n@prefix math: <http://www.w3.org/2000/10/swap/math#>.\n';
  const facts=rows.map(r=>`<urn:fieldwork:place:${r.id}> fw:distanceKnown ${r.distance!==null}; fw:alertKnown ${alert.active!==null}.${r.distance!==null?`\n<urn:fieldwork:place:${r.id}> fw:distanceKm ${r.distance!.toFixed(9)}.`:''}${alert.active!==null?`\n<urn:fieldwork:place:${r.id}> fw:heatAlert ${alert.active}.`:''}`).join('\n');
  const t=Number(threshold).toFixed(9);
  // The rules are declared data now: rulesets/outreach-criteria/1.0.0.json. `t` is retained
  // because the threshold's nine decimals are what the shipped text used, and the byte-identity
  // test in tests/rulesets.test.mjs depends on reproducing exactly that.
  const ruleset=resolveRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0');
  const rules=bindParameters(ruleset,{threshold:Number(t)});
  return {facts:prefix+facts+'\n',rules:prefix+rules,input:prefix+facts+'\n\n'+rules,ruleset:rulesetCitation(ruleset)};
}
export async function executeWorkflow(workflow:Workflow,reasoner:Reasoner,onProgress:(id:string,status:'running'|'done')=>void=()=>{},resolveCredential?:CredentialResolver):Promise<WorkflowRun> {
  workflow=validateWorkflow(workflow);
  // A composition runs by becoming its members, after the authored graph has been validated
  // as authored. The executor below has no composition branch: one receipt per member falls
  // out of running ordinary nodes, which is what experiment 75 requires of it.
  const runId=crypto.randomUUID(), receipts:Receipt[]=[];
  const expansion=expandMicroWorkflows(workflow,resolveComposition,runId);
  workflow=expansion.workflow;receipts.push(...expansion.receipts);
  const plan=executionPlan(workflow), values=new Map<string,unknown>(), trace:WorkflowRun['trace']=[];
  for(const node of plan){
    onProgress(node.id,'running');const begin=performance.now();
    const inputs=Object.fromEntries(workflow.edges.filter(e=>e.to===node.id).map(e=>[e.port,values.get(e.from)])) as unknown as ExecutionInputs;
    const pointInputs=():{layers:import('./types.js').PointLayer[]}=>({layers:nodeInputs(node).filter(([port])=>isPointPort(port)).map(([port])=>{const edge=workflow.edges.find(e=>e.to===node.id&&e.port===port),source=workflow.nodes.find(n=>n.id===edge!.from);return {...(inputs[port as keyof ExecutionInputs] as unknown as PointCollection),sourceNodeId:edge!.from,label:source!.params.label||TYPES[source!.type].title,attributeDefinitions:[...('fields' in source!.params?source!.params.fields||[]:[]),...('attributeRules' in source!.params?source!.params.attributeRules||[]:[])]};})});
    let value:unknown;
    switch(node.type){
      case 'mean_center':{value=computeMeanCenter(inputs.points,node.params);receipts.push(meanCenterReceipt(node,value as MeanCenter,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from));break;}
      case 'compare_point_sets':{value=comparePointSets(inputs.original,inputs.moved,inputs.pumps,node.params,node.params.centers?inputs.originalCenter:undefined,node.params.centers?inputs.movedCenter:undefined);const sources=Object.fromEntries(workflow.edges.filter(e=>e.to===node.id).map(e=>[e.port,e.from])) as {original:string;moved:string;pumps:string;originalCenter?:string;movedCenter?:string};receipts.push(comparisonReceipt(node,value as PointComparison,runId,sources));break;}
      case 'comparison_map':{const shown=comparisonMap(node,inputs.comparison,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='comparison')!.from);value=shown.value;receipts.push(shown.receipt);break;}
      case 'donut_geomask':case 'hex_aggregate':{
        value=node.type==='donut_geomask'?moveDonut(inputs.points,node.params):aggregateHex(inputs.points,node.params);
        receipts.push(privacyReceipt(node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from,inputs.points.features.length,value as PointCollection|Polygons));break;
      }
      case 'fill_interior_gaps':{
        const made=fillInteriorGaps(inputs.polygons,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'stack_polygons':{
        const connected=workflow.edges.filter(e=>e.to===node.id&&isPolygonPort(e.port))
          .sort((a,b)=>a.port.localeCompare(b.port));
        const made=stackPolygons(connected.map(e=>values.get(e.from) as Polygons),node,runId,
          connected.map(e=>e.from));
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'travel_time_band':{
        const made=travelTimeBand(inputs.reached,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='reached')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'reachable_corridor':{
        const made=reachableCorridor(inputs.reached,inputs.network,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='reached')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'reachable_nodes':{
        const made=reachableNodes(inputs.sites,inputs.network,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='sites')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'snap_to_network':{
        const made=snapToNetwork(inputs.sites,inputs.network,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='sites')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'summarize_combined_area':{
        const made=combinedArea(inputs.polygons,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'summarize_hull':{
        const made=convexHull(inputs.points,node,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from);
        value=made.value;receipts.push(made.receipt);break;
      }
      case 'find_health_facilities':{
        const got=facilitiesValue(node,runId);value=got.value;receipts.push(got.receipt);break;
      }
      case 'buffer_point':{const made=bufferPoint(inputs.points,node,runId);value=made.value;receipts.push(made.receipt);break;}
      case 'sample_raster':{
        if(!inputs.raster)throw new Error('Connect a prepared Raster input or Clip raster to Sample raster.');
        const sampled=sampleRaster(inputs.points,inputs.raster,node.params);value=sampled.value;
        receipts.push(sampleReceipt(node,inputs.raster,sampled.counts,runId,{
          points:workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from,
          raster:workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from}));break;
      }
      case 'buffer_area':{const buffered=bufferArea(node,inputs.area,runId);value=buffered.value;receipts.push(buffered.receipt);break;}
      case 'network_input':case 'voronoi':case 'isochrone':case 'clip_polygons':case 'summarize_polygons':{
        if(node.type==='network_input')validateNetwork(node.params.data);
        value=node.type==='network_input'?structuredClone(node.params.data):node.type==='voronoi'?voronoi(inputs.sites,inputs.area.boundary,node.params.zone,node.params.hemisphere):node.type==='isochrone'?await computeIsochrone(inputs.sites,inputs.network,node.params):node.type==='clip_polygons'?clipPolygons(inputs.polygons,inputs.area.boundary):summarizePolygons(inputs.polygons,inputs.points,node.params);
        if(node.type==='voronoi'||node.type==='isochrone')(value as Polygons).siteSourceNodeId=workflow.edges.find(e=>e.to===node.id&&e.port==='sites')!.from;
        receipts.push(catchmentReceipt(node,value as Polygons|Network,runId,workflow.edges.filter(e=>e.to===node.id).map(e=>e.from)));break;
      }

      case 'raster_input':{if(!node.params.asset)throw new Error('Prepare the raster window before running.');const grid=await loadRaster(node.params.asset,inputs.area);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId));break;}
      case 'clip_raster':{const grid=clipRaster(inputs.raster,node.params.cutline?.geometry||inputs.area.boundary,node.params);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from));break;}
      case 'places':case 'centers':value={...node.params.data,spatialReference:structuredClone(node.params.spatialReference)};break;
      case 'point_input':value={...node.params.data,sourceNodeId:node.id,sourceKind:'input-points',sourceInfo:structuredClone(node.params.sourceInfo),spatialReference:structuredClone(node.params.spatialReference)};break;
      case 'rate':{const result=computeRate(fromPoints(inputs.records),node.params);value={...rateTable(result),chart:rateChart(result)} as unknown as DisplayValue;receipts.push(rateReceipt(node,result,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from));break;}
      case 'case_series':{const series=node.params.source==='table'?caseSeriesFromTable(inputs.cases,{dateField:node.params.dateField,dateKind:node.params.dateKind,period:node.params.period}):caseSeries(inputs.points,{dateField:node.params.dateField,dateKind:node.params.dateKind,period:node.params.period,weightField:node.params.weightField});value={...seriesTable(series),chart:seriesChart(series)} as unknown as DisplayValue;receipts.push(seriesReceipt(node,series,runId,workflow.edges.find(e=>e.to===node.id&&(e.port==='points'||e.port==='cases'))!.from));break;}
      case 'slr_extract_import':{const extract=projectionExtract(inputs.projections,{datasetIRI:node.params.datasetIRI,datasetVersion:node.params.datasetVersion,baselinePeriod:node.params.baselinePeriod,citations:node.params.citations,basisKind:node.params.basisKind,familyValues:node.params.familyValues});value=projectionTable(extract) as unknown as DisplayValue;receipts.push(extractReceipt(node,extract,runId));break;}
      case 'slr_site_assignment':{const extract=readExtract(inputs.projections);const assignments=assignSites(inputs.points,inputs.sites,extract);value=assignmentTable(assignments) as unknown as DisplayValue;const edge=(port:string)=>workflow.edges.find(e=>e.to===node.id&&e.port===port)!.from;receipts.push(assignmentReceipt(node,assignments,runId,{points:edge('points'),sites:edge('sites'),projections:edge('projections')}));break;}
      case 'slr_threshold_comparison':{const table=inputs.assignments;if(!table?.assignments)throw new Error('Connect Assign projection site: a comparison needs the assignments, not a plain table.');const comparison=compareToElevation(table.assignments,{selection:{scenario:node.params.scenario,basis:node.params.basis,family:node.params.family,year:node.params.year,quantile:node.params.quantile},elevationField:node.params.elevationField,verticalDatum:node.params.verticalDatum,elevationReference:node.params.elevationReference});value=comparison as unknown as DisplayValue;receipts.push(thresholdReceipt(node,comparison,table.assignments,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='assignments')!.from));break;}
      case 'table_input':{if(!node.params.data.rows.length)throw new Error('Import a long-format table before running.');const imported=tableReceipt(node,node.params.data,runId);value=imported.value;receipts.push(imported.receipt);break;}
      // The conversion ran when the file was saved; execution replays it offline without reprojecting again.
      case 'reproject':{if(!node.params.data.features.length)throw new Error('Import a projected point file before running.');value={...node.params.data,sourceNodeId:node.id,sourceKind:'input-points',sourceInfo:{format:'reprojected-points',...structuredClone(node.params.provenance||{}),...structuredClone(node.params.source||{})},spatialReference:structuredClone(node.params.spatialReference)};break;}
      case 'alert':value=node.params;break;
      case 'measure_distance':{
        const searched=nearestPlaces(inputs.points,inputs.candidates,node.params.unit,node.params.candidateFilter);
        const narrowed=node.params.candidateFilter?.length
          ? ` Candidates narrowed by ${node.params.candidateFilter.map(c=>`${c.field} ${c.comparator==='in'?'in':'not in'} {${c.values.join(', ')}}`).join('; ')}: ${searched.eligibleCount} of ${searched.candidateCount} eligible.`
          : '';
        // `locationSource` says where the subjects came from, which `access` carried and a general
        // search should too: a reader of a distance wants to know what was measured, not only from
        // what. Carried here so the carrier stays thin -- it is the points input's own provenance.
        const from=inputs.points as unknown as {sourceNodeId?:string; sourceKind?:string};
        value={rows:searched.rows,centers:inputs.candidates.features,
          method:`Haversine; sphere radius 6371.0088 km; CRS84 longitude/latitude; distances in ${node.params.unit}.${narrowed}`,
          candidateCount:searched.candidateCount,eligibleCount:searched.eligibleCount,
          locationSource:{nodeId:from.sourceNodeId,kind:from.sourceKind==='generated-grid'?'generated-grid':'input-points'}} as unknown as DisplayValue;
        break;
      }
      case 'apply_ruleset':{
        // The merge: three widgets differed only in which rules they ran. The projection is the
        // ruleset's own declaration, and each still assembles a different carrier for whatever
        // consumes it -- so this collapses the palette and the contract, not the three projections.
        const pinned=node.params.ruleset,bound=node.params.parameters;
        switch(projectionOf(pinned.id,pinned.version)){
          case 'outreach':{
            const n3=makeN3(inputs.distances.rows,inputs.alert,bound.threshold);
            const conclusions=await reasoner(n3.input);
            value=outreachProjection(inputs.distances,inputs.alert,bound.threshold,conclusions);
            receipts.push({nodeId:node.id,...n3,conclusions});break;
          }
          case 'access-review':{
            const applied=await applyAccessReview(inputs.access,bound.threshold,reasoner);
            value=applied.value;receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          case 'access-review-distances':{
            // Same rules, same facts, read off the general carrier that nearest and travel_time
            // produce instead of the one `access` emitted.
            const applied=await applyAccessReview(distancesAsAccess(inputs.distances),bound.threshold,reasoner);
            value=applied.value;receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          case 'facility-grading-points':{
            const applied=await applyFacilityGrading(inputs.facilities,reasoner);
            value=gradedPointLayer(applied.value) as unknown as DisplayValue;
            receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          case 'facility-grading':{
            const applied=await applyFacilityGrading(inputs.facilities,reasoner);
            value=applied.value as unknown as DisplayValue;
            receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          default:throw new Error(`This build carries no projection for ${pinned.title}.`);
        }
        break;
      }
      case 'travel_time':{
        const source=workflow.edges.find(e=>e.to===node.id&&e.port==='distances')!.from;
        const timed=travelTime(inputs.distances.rows,node.params.speedMPerMin);
        value={...inputs.distances,rows:timed,
          method:`${inputs.distances.method} ${TRAVEL_TIME_METHOD}`} as unknown as DisplayValue;
        receipts.push(travelTimeReceipt(node,timed,runId,source));
        break;
      }
      case 'policy':{
        const {rows,centers,method}=inputs.distances,alert=inputs.alert,threshold=node.params.thresholdKm;
        const n3=makeN3(rows,alert,threshold);const conclusions=await reasoner(n3.input);
        const decisions=new Map<string,Status>();
        for(const q of conclusions){if(q.predicate===NS+'decision'){const id=q.subject.slice((NS+'place:').length);const decision=q.object.slice(NS.length);if(!['Review','NoFlag','Unknown'].includes(decision))throw new Error('Reasoner returned an unknown decision.');if(decisions.has(id)&&decisions.get(id)!==decision)throw new Error('Reasoner returned conflicting decisions.');decisions.set(id,decision as Status);}}
        value={rows:rows.map(r=>{const status=decisions.get(r.id);if(!status)throw new Error(`Reasoner did not classify ${r.name}.`);return {...r,status,explanation: status==='Unknown' ? (r.reason || 'Heat alert status is missing.') : `Nearest center: ${r.center!.name}. Distance ${r.distance!.toFixed(2)} km ${r.distance!>threshold?'>':'≤'} ${threshold} km. Heat alert ${alert.active?'active':'inactive'} on ${alert.date}.`};}),centers,method,threshold,alert};
        receipts.push({nodeId:node.id,...n3,conclusions});break;
      }
      case 'chart_output':{if(node.params.inputMode==='series'){const table=inputs.series;if(!table?.series)throw new Error('Connect Cases by period: a series chart needs the series, not a plain table.');const chart=seriesChart(table.series);const source=workflow.edges.find(e=>e.to===node.id&&e.port==='series')!.from;const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n<urn:fieldwork:run:${runId}:view:${node.id}> a fw:ChartView, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>; fw:groupingField "period"; fw:eventDateKind ${JSON.stringify(table.series.dateKind)}.\n`+chartSpecificationFacts(node,runId,source,chart,table.series.weightField?'numeric-total':'record-count');value={...structuredClone(table) as unknown as DisplayValue,chart,rows:[],centers:[]};receipts.push({nodeId:node.id,kind:'presentation',facts,rules:'',input:facts,conclusions:[],method:chart.caption});break;}
      if(node.params.inputMode==='polygons'){const shown=polygonDisplay(inputs.polygons,'chart');value=shown;const sourceId=workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from;const receipt=polygonPresentationReceipt(node,sourceId,runId);receipt.facts+=chartSpecificationFacts(node,runId,sourceId,shown.chart!,shown.chart!.field==='total'?'numeric-total':'location-membership-count');receipt.input=receipt.facts;receipts.push(receipt);break;}const shown=chartOutput(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}
      case 'output':value=inputs.decisions;break;
      case 'map_output':{if(node.params.inputMode==='network'){
        const network=inputs.network as import('./catchments.js').Network;
        if(!network?.nodes?.length)throw new Error('Connect a Street network: this Map is set to show a network and none is connected.');
        const source=workflow.edges.find(e=>e.to===node.id&&e.port==='network')!.from;
        value={kind:'network-map',network:structuredClone(network),rows:[],centers:[]} as unknown as DisplayValue;
        const activity=`<urn:fieldwork:run:${runId}:map:${node.id}>`;
        const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'
          +`${activity} a fw:MapView, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>; `
          +`fw:networkJunctionCount ${network.nodes.length}; fw:networkSegmentCount ${network.edges.length}.\n`
          +`<urn:fieldwork:run:${runId}:output:${node.id}> a prov:Entity; prov:wasGeneratedBy ${activity}.\n`;
        receipts.push({nodeId:node.id,kind:'presentation',facts,input:facts,rules:'',conclusions:[],
          method:'Draw the downloaded street graph as itself; no routing, no simplification and no new inference.'});
        break;}
      if(node.params.inputMode==='polygons'){value=polygonDisplay(inputs.polygons,'map');(value as DisplayValue).polygonPresentation=node.params.presentation||'plot';if(node.params.contextPoints)(value as DisplayValue).contextPoints=(inputs as unknown as {context:PointCollection}).context;receipts.push(polygonPresentationReceipt(node,workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='context')?.from));break;}if(node.params.inputMode==='raster'){const source=workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from;const shown=decisionPresentation(node,{kind:'raster-map',raster:inputs.raster,boundary:inputs.raster.boundary,rows:[],centers:[]},source,runId);value=shown.value;receipts.push(shown.receipt);break;}if(node.params.inputMode==='decisions'){const shown=decisionPresentation(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}const mapped=mapOutput(node,inputs.coverage?{coverage:inputs.coverage}:{area:inputs.area,points:pointInputs()},runId);value=mapped.value;if(mapped.receipt)receipts.push(mapped.receipt);break;}
      case 'table_output':{if(node.params.inputMode==='table'){value={...structuredClone(inputs.table),centers:[],pointTable:true} as unknown as DisplayValue;const viewFacts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n<urn:fieldwork:run:${runId}:view:${node.id}> a fw:TableView, prov:Activity; prov:used <urn:fieldwork:run:${runId}:table:${workflow.edges.find(e=>e.to===node.id&&e.port==='table')!.from}>.\n`;receipts.push({nodeId:node.id,kind:'presentation',facts:viewFacts,rules:'',input:viewFacts,conclusions:[]});break;}if(node.params.inputMode==='polygons'){value=polygonDisplay(inputs.polygons,'table');receipts.push(polygonPresentationReceipt(node,workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='context')?.from));break;}if(node.params.inputMode==='decisions'){const shown=decisionPresentation(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}const table=tableOutput(node,inputs.coverage?{coverage:inputs.coverage}:{points:pointInputs()},runId);value=table.value;receipts.push(table.receipt);break;}
      case 'measure_area':{const computed=measureArea(node,inputs.area,runId);value=computed.value;receipts.push(computed.receipt);break;}
      case 'coverage_check':{const checked=await checkCoverage(node,inputs.area,pointInputs(),reasoner,runId);value=checked.value;receipts.push(checked.receipt);break;}
      case 'study_area':{
        if(node.params.source!=='drawn'){value={...await executeOldNode(node,inputs,reasoner,receipts,distanceKm,runId),areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,label:node.params.label||'Old Naledi',rows:[],centers:[]};break;}
        const n3=studyAreaN3(node),conclusions=await reasoner(n3.input);
        const ready=conclusions.some(q=>q.subject===`urn:fieldwork:area:${node.id}`&&q.predicate===NS+'readyForSpatialAnalysis'&&q.object==='true');
        if(!ready)throw new Error('The reasoner did not confirm the study-area input contract.');
        receipts.push({nodeId:node.id,...n3,conclusions});
        value={kind:'study-area',areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,boundary:structuredClone(node.params.geometry),bounds:geometryBounds(node.params.geometry!),label:node.params.label,selectionMode:node.params.selectionMode,ready,rows:[],centers:[],source:'User-drawn geometry in CRS84'};break;
      }
      default:value=await executeOldNode(node,inputs,reasoner,receipts,distanceKm,runId);
    }
    if(node.type==='study_area'&&isRecord(value))value.spatialReference=structuredClone(node.params.spatialReference);
    values.set(node.id,value);trace.push({nodeId:node.id,type:node.type,milliseconds:performance.now()-begin});onProgress(node.id,'done');
  }
  const outputNodes=resultNodes({nodes:plan});
  const display=(id:string)=>required(values.get(id)) as DisplayValue;
  const outputs:Output[]=outputNodes.length?outputNodes.flatMap((n):Output[]=>{
    if(n.type==='coverage_check')return (['table','map'] as const).map(view=>({...display(n.id),nodeId:n.id+'-'+view,label:view==='table'?'Coverage review':'Coverage map',view}));
    const view=n.type==='output'?n.params.view:n.type==='table_output'?'table':n.type==='chart_output'?'bars':'map';
    return [{...display(n.id),nodeId:n.id,label:n.params.label||(n.type==='measure_area'?'Area · '+display(n.id).label:(view==='table'?'Table':'Map')+' · '+n.id),view}];
  }):plan.filter(n=>n.type==='study_area').map(n=>({...display(n.id),kind:'study-area',rows:[],centers:[],nodeId:n.id,label:n.params.label||'Study area preview',view:'map'}));
  for(const node of plan.filter((n):n is WorkflowNode<'map_output'>=>n.type==='map_output')){
    const output=outputs.find(o=>o.nodeId===node.id),receipt=receipts.find(r=>r.nodeId===node.id);
    if(output&&receipt)mapSpecificationFacts(node,output,workflow,runId,receipt);
  }
  // Each node's declared output port type, so the provenance says what every value travelled as.
  const portTypes=Object.fromEntries(plan.map(node=>[node.id,outputOf(node)]));
  const provenance=evidenceProvenance(plan,workflow.edges,runId,receipts,portTypes);
  for(const receipt of receipts){const cited=provenance.evidence.find(e=>e.nodeId===receipt.nodeId);if(cited)receipt.references=structuredClone(cited.references);}
  return {...provenance,outputs,trace,receipts,runId,engine:'EYE-JS 21.1.24 (WASM)',runAt:new Date().toISOString()};
}
