import {sampleRaster,sampleReceipt,validateSampleNode} from './sample-raster.js';
import {bufferPoint,validateBufferPointNode} from './buffer-point.js';
import {facilitiesValue,migrateHealthsitesNodes,validateFindHealthFacilitiesNode} from './health-facilities.js';
import {convexHull,validateHullNode} from './convex-hull.js';
import {combinedArea,combineAreas,validateCombinedAreaNode} from './combined-area.js';
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
import {CATCHMENT_TYPES,validateNetwork,validateCatchmentNode,voronoi,isochrone,clipPolygons,summarizePolygons,catchmentReceipt,unconnectedSites,offNetworkSites} from './catchments.js';
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
import type {Exclusion,Workflow,WorkflowNode,NodeDefinition,NodeType,PortType,PointFeature,PointCollection,Position,ParamsByType,PointInput,Scalar,DistanceUnit,RetiredNodeType,RenamedNodeType,CandidateCondition} from './types.js';
import {RENAMED_NODE_TYPES,isProjectedReference,BASEMAP_CHOICES} from './types.js';
import {deduplicatePoints,deduplicateReceipt} from './deduplicate-points.js';
import type {DeduplicateResult} from './deduplicate-points.js';
import {clipPointsToArea,clipPointsReceipt} from './clip-points.js';
import {workflowMetricCRS,metricCRSFacts} from './metric-crs.js';
// Re-exported so the registry validator can cross-check a declared rename against the one the
// application actually performs, from the same bundle it already reads TYPES out of.
export {RENAMED_NODE_TYPES};
import type {Reasoner} from './worker-types.js';
import type {AreaValue,CoverageValue,DisplayValue,WorkflowRun,Output,Receipt,NearestRow,Status} from './results.js';
import {declarationGaps,dataIssuesOf} from './results.js';
import type {OldInputs} from './old-naledi.js';
import {isRecord,required} from './guards.js';
interface ExecutionInputs extends OldInputs {area2:AreaValue;polygons:Polygons;subjects:PointCollection;network:Network;sites:PointCollection;reached:PointCollection;points:PointCollection&{spatialReference?:import('./types.js').AnySpatialReference};original:PointCollection;moved:PointCollection;pumps:PointCollection;originalCenter:MeanCenter;movedCenter:MeanCenter;comparison:PointComparison;raster:RasterGrid;table:import('./data-table.js').DataTable;projections:import('./sea-level.js').ProjectionTable;series:import('./case-series.js').SeriesTable;records:PointCollection;cases:import('./data-table.js').DataTable;related:import('./data-table.js').DataTable;rates:import('./data-table.js').DataTable&{rate?:import('./rate.js').RateResult};assignments:import('./sea-level.js').AssignmentTable;coverage?:CoverageValue;candidates:PointCollection;distances:{rows:NearestRow[];centers:PointFeature[];method:string};alert:ParamsByType['alert'];decisions:DisplayValue}
import classification from '../widgets/classification.json' with {type:'json'};
import {OLD_TYPES,validateOldNode,executeOldNode,migrateFacilitySources,applyAccessReview,applyFacilityGrading,gradedPointLayer,distancesAsAccess} from './old-naledi.js';
import {resolveRuleset,bindParameters,tableContractFailures,rulesetCitation} from './rulesets.js';
import {deriveValue,selectRows,OPERATORS} from './derive-value.js';
import {relateTable} from './relate-table.js';
import {groupTable} from './group-table.js';
import {computeTwoByTwo,twoByTwoReceipt} from './two-by-two.js';
import {outreachProjection,extentN3,extentProjection,projectionOf,RULESET_FOR_NODE_TYPE,pinnedRuleset,parametersFor} from './rule-application.js';
import {authoredFacts,authoredProjection,authoredReceipt,authoredDataIssues} from './authored-application.js';
import {applyRepairs} from './column-profile.js';
import {compileAuthoredRuleset,authoredUnitProblems} from './authored-rules.js';
import {travelTime,travelTimeReceipt,validateTravelTime,TRAVEL_TIME_METHOD} from './travel-time.js';
import {studyAreaN3,geometryBounds,validateDrawnGeometry} from './study-area.js';
import {measureArea,validateAreaUnit} from './area-measurement.js';
import {mapOutput} from './map-output.js';
import {tableOutput} from './table-output.js';
import {MAX_POINT_LAYERS,pointPort,isPointPort} from './point-layers.js';
import {validateAttributeSchema} from './attribute-schema.js';
import {defaultSpatialReference,validateSpatialReference} from './spatial-reference.js';
import {utmDefinition,projectFromCRS84} from './reproject.js';
import {dataTable,tableReceipt,MAX_TABLE_ROWS} from './data-table.js';
import {computeRate,fromPoints,fromTable,rateTable,rateChart,rateReceipt,validateRateNode} from './rate.js';
import {computeRateRatio,rateRatioReceipt,rateRatioSentence,RATE_RATIO_TABLE_KEYS} from './rate-ratio.js';
import {caseSeries,caseSeriesFromTable,seriesTable,seriesChart,seriesReceipt,validateCaseSeriesNode} from './case-series.js';
import {joinTableToAreas,joinedPolygons,areaJoinReceipt} from './area-join.js';
import {projectionExtract,projectionTable,readExtract,extractFromRuleset,assignSites,assignmentTable,compareToElevation,extractReceipt,assignmentReceipt,comparisonReceipt as thresholdReceipt,validateSeaLevelNode} from './sea-level.js';
import {distanceKm,nearestOf,satisfies} from './nearest-neighbour.js';
export const NS = 'urn:fieldwork:';
export const TYPES:Record<NodeType,NodeDefinition> = {
  mean_center:{title:'Mean center',group:'Spatial operations',icon:'⊙',color:'teal',description:'Compute the center of point locations in a metric CRS, optionally weighted by a record attribute',inputs:[['points','points']],output:'mean-center'},
  compare_point_sets:{title:'Compare point sets',group:'Spatial operations',icon:'⊕',color:'teal',description:'Compare two mean centers and locate them against reference pumps',inputs:[['original','points'],['moved','points'],['pumps','points']],output:'point-comparison'},
  comparison_map:{title:'Comparison map',group:'Outputs',icon:'◈',color:'green',description:'Show original and moved locations side by side with their mean centers and pumps',inputs:[['comparison','point-comparison']],output:null},
  donut_geomask:{title:'Move points in a donut',group:'Spatial operations',icon:'◎',color:'teal',description:'Shift points within a configured distance band; educational preview, not a privacy guarantee',inputs:[['points','points']],output:'points'},
  aggregate_points_to_h3_cell:{title:'Aggregate points to H3 cells',group:'Spatial operations',icon:'⬡',color:'teal',description:'Count points in hexagonal cells and omit sparse cells. Hexbinning, onto the fixed H3 index',inputs:[['points','points']],output:'polygons'},
  buffer_area:{title:'Buffer study area',group:'Spatial operations',icon:'◎',color:'teal',description:'Expand an acquisition boundary without changing the reporting area',inputs:[['area','area']],output:'area'},
  ...CATCHMENT_TYPES,
  table_input:{title:'Tabular data',group:'Sources',icon:'▤',color:'blue',description:'Import a long-format table keyed by declared columns; no geometry',inputs:[],output:'table'},
  join_table_to_area:{title:'Join a table to the study area',group:'Summaries',icon:'⋈',color:'teal',
    description:'Put a value from each row onto the part of the boundary it names',
    inputs:[['records','table'],['area','area']],output:'polygons'},
  rate_ratio:{title:'Rate ratio with an interval',group:'Epidemiology',icon:'⚖',color:'teal',
    description:'Divide one group\'s rate by another\'s, with an interval and the counts behind it',
    inputs:[['rates','table']],output:'table'},
  derive_value:{title:'Derive a value',group:'Summaries',icon:'∓',color:'teal',
    description:'Compute a new value in a key column from two of its existing values, group by group',
    inputs:[['records','table']],output:'table'},
  select_rows:{title:'Select rows by value',group:'Summaries',icon:'⊂',color:'teal',
    description:'Keep only the rows whose key column holds one of the values you name, in that order',
    inputs:[['records','table']],output:'table'},
  relate_table:{title:'Relate a column from another table',group:'Summaries',icon:'⋈',color:'teal',
    description:'Bring a category from a second table onto these rows, matched on a column both carry',
    inputs:[['records','table'],['related','table']],output:'table'},
  group_table:{title:'Total within groups',group:'Summaries',icon:'Σ',color:'teal',
    description:'Add up the values of the rows that agree on the key columns you keep',
    inputs:[['records','table']],output:'table'},
  two_by_two:{title:'Two-by-two table',group:'Epidemiology',icon:'⊞',color:'teal',
    description:'Risk in each group, the risk ratio, the odds ratio and the risk difference, each naming its method',
    inputs:[['records','table']],output:'table'},
  rate:{title:'Rate with a denominator',group:'Epidemiology',icon:'÷',color:'teal',description:'Divide counts by a declared population at risk, stating what the denominator counts',inputs:[['records','points']],output:'table'},
  case_series:{title:'Cases by period',group:'Epidemiology',icon:'▦',color:'teal',description:'Count cases per day, week or month by a declared kind of date',inputs:[['points','points']],output:'table'},
  slr_extract_import:{title:'Sea-level projection extract',group:'Sources',icon:'≈',color:'blue',description:'Declare an imported long-format table as a bounded extract of published AR6 projections',inputs:[['projections','table']],output:'table'},
  slr_site_assignment:{title:'Assign projection site',group:'Spatial operations',icon:'⊕',color:'teal',description:'Assign each point its nearest published projection site and record the distance',inputs:[['points','points'],['sites','points'],['projections','table']],output:'table'},
  slr_threshold_comparison:{title:'Compare level to elevation',group:'Comparisons and checks',icon:'⋚',color:'purple',description:'Compare one projected change against a supplied elevation on a stated datum',inputs:[['assignments','table']],output:'decisions'},
  reproject:{title:'Reproject points',group:'Spatial operations',icon:'⇄',color:'blue',description:'Project longitude/latitude points into a UTM zone, in metres',inputs:[['points','points']],output:'points'},
  deduplicate_points:{title:'Deduplicate point records',group:'Comparisons and checks',icon:'⧉',color:'purple',
    description:'Find records in two sources that are the same place, and merge the ones that agree',
    inputs:[['points','points'],['points_2','points']],output:'points'},
  clip_points_to_area:{title:'Keep points inside the area',group:'Spatial operations',icon:'⊂',color:'teal',description:'Keep the points that fall inside the study area, and count what fell outside',inputs:[['area','area'],['points','points']],output:'points'},
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
  summarize_combined_area:{title:'Combined area',group:'Summaries',icon:'∪',color:'teal',description:'Areas become one area; overlapping and touching polygons become one polygon',inputs:[['polygons','polygons'],['area','area'],['area2','area']],output:'polygons'},
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
  // Retired 2026-10-21 and archived here, not deleted: a registry entry must resolve to a
  // definition, and a saved workflow that still names this type is migrated to
  // `clip_points_to_area` on open. It is in the retired list, so the palette never offers it.
  coverage_check:{title:'Check spatial coverage',group:'Comparisons and checks',icon:'◎',color:'purple',description:'Retired — use Keep points inside the area',inputs:[['area','area'],['points','points']],output:'coverage-check'},
  map_output:{title:'Map',group:'Outputs',icon:'◈',color:'green',description:'Display the study polygon and points, including outside records',inputs:[['area','area'],['points','points'],['polygons','polygons'],['context','points'],['decisions','decisions'],['raster','raster'],['network','network']],output:null},
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
  // A STUDY AREA AND A STUDY AREA ARE A STUDY AREA. The practitioner, 2026-10-22: "But a study
  // area is a polygon", and "two study area polygons combined should still be a study area". The
  // union always returned a `polygons`, which nothing that wants an area will take -- so the
  // widget that does exactly what was asked could not be used for it. Given areas it yields an
  // area, which the street network, the facilities and the clip all accept.
  if(node.type==='summarize_combined_area')return node.params.yields==='area'?'area':'polygons';
  if(node.type==='apply_ruleset')return node.params.ruleset?.output??null;
  if(node.type==='micro_workflow')return node.params.composition?.output??null;
  return TYPES[node.type].output;
}

/** The ports a node must have connected before it will run, as distinct from the ports it MAY
 *  take, which is what `nodeInputs` returns.
 *
 *  Extracted from `executionPlan` on 2026-10-14. It had been a ternary inside the traversal, and
 *  scripts/port-contracts.mjs had to restate it to publish the same answer -- one contract written
 *  twice, in two files, with nothing holding the copies together. Now the generator imports this,
 *  so the published declaration cannot disagree with the behaviour it describes. Experiment 112. */
export function requiredInputs(node:WorkflowNode,options?:{coverageConnected?:boolean}):[string,PortType][]{
  const all=nodeInputs(node);
  // A country can name the scope instead, so the area is optional rather than absent.
  if(node.type==='network_input')return all.filter(([port])=>port!=='area');
  if(!['map_output','table_output'].includes(node.type))return all;
  // A view fed by a coverage check takes THAT and nothing else: the check already carries the
  // points and the area it was run over, so insisting on them again would ask for the same data
  // twice. Graph-dependent rather than node-dependent, which is why it is a parameter -- a node
  // alone cannot say whether anything is connected to it.
  if(options?.coverageConnected)return all.filter(([port])=>port==='coverage');
  // A map insists on nothing: it draws the layers it is given, and which ones those are is the
  // practitioner's business. It used to insist on an area and a points layer, which is why a map
  // of a raster had to be told it was a raster map before it would accept one.
  if(node.type==='map_output')return [];
  return all.filter(([port])=>port!=='coverage');
}

/** Which renderer a map uses, read from WHAT IS WIRED rather than from a mode it was told.
 *
 *  "There is no such thing as mode, only layers" -- the practitioner, 2026-10-14, repeated on
 *  2026-10-15 after finding the selector still there: "I thought we got rid of mode!" It had not
 *  been; the direction was written into docs/widget-specs/map_output.md and the code was left alone.
 *
 *  A map now declares every layer port and the practitioner wires what they have. This function
 *  is what replaces the question: the drawing path follows the connections. The precedence is the
 *  order of specificity -- a raster or a network is a whole picture, polygons and decisions each
 *  have their own renderer, and the point/area/coverage path is the general one that already
 *  draws several layers together.
 *
 *  The stored `inputMode` is still read, LAST, so a workflow saved before this opens and draws
 *  what it drew. Nothing writes it any more.
 *
 *  What this does not do is unify the renderers: a map with polygons AND a raster wired draws the
 *  raster, because no renderer draws both. That limit is the next piece of the same work, and it
 *  is now a limit of the drawing code rather than a question put to the practitioner. */
export function drawnMode(node:WorkflowNode<'map_output'>,edges:{to:string;port:string}[]):
  'network'|'raster'|'polygons'|'decisions'|'spatial'{
  const wired=new Set(edges.filter(e=>e.to===node.id).map(e=>e.port));
  if(wired.has('network'))return 'network';
  if(wired.has('raster'))return 'raster';
  if(wired.has('polygons'))return 'polygons';
  if(wired.has('decisions'))return 'decisions';
  if(wired.size)return 'spatial';
  const stored=node.params.inputMode;
  return stored==='network'||stored==='raster'||stored==='polygons'||stored==='decisions'?stored:'spatial';
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
  // The same shape, for the same reason: a rate's denominator usually arrives as a table.
  // The port keeps its name either way, because what it carries is the records to divide.
  if(node.type==='rate')return node.params.source==='table'?[['records','table']]:[['records','points']];
  // A map takes every layer it can draw, always. Its ports used to change with its mode, so the
  // port a connection needed might not exist on the node -- the blocker
  // `output-mode-set-before-the-shape-arrives`, and the reason a practitioner had to answer a
  // question about shape before having the shape.
  if(node.type==='map_output')return [['area','area'],
    ...Array.from({length:node.params.pointInputCount??1},(_,i)=>[pointPort(i),'points'] as [string,PortType]),
    ['polygons','polygons'],['context','points'],['decisions','decisions'],
    ['raster','raster'],['network','network']];
  if(['table_output','chart_output'].includes(node.type)&&'inputMode' in node.params&&node.params.inputMode==='polygons')return [['polygons','polygons']];
  if(node.type==='table_output'&&node.params.inputMode==='table')return [['table','table']];
  // A street network is a thing to look at, not only a thing to route over. Four widgets consume a
  // `network` and none of them was an output, so a downloaded network could not be seen.
  if(node.type==='table_output'&&node.params.inputMode==='decisions')return [['decisions','decisions']];
  // Deduplication compares ACROSS sources, so two layers is its floor rather than its shape: a
  // practitioner with OSM, Overture and HDX over one area has three.
  if(node.type==='deduplicate_points')
    return Array.from({length:Math.max(2,Math.min(MAX_POINT_LAYERS,node.params.pointInputCount??2))},
      (_,i)=>[pointPort(i),'points']) as [string,PortType][];
  // map_output returned above with every layer port it can draw, so only these two reach here.
  if(node.type!=='table_output')return TYPES[node.type].inputs;
  return [...(node.type==='table_output'?[]:[['area','area']]),...Array.from({length:node.params.pointInputCount??1},(_,i)=>[pointPort(i),'points']),...(node.type==='table_output'?[['coverage','coverage-check']]:[])] as [string,PortType][];
}
export function exampleWorkflow():Workflow {
  return {schema:'fieldwork/workflow/1',name:'Heat outreach screening',nodes:[
    {id:'neighborhoods',type:'point_input',x:35,y:52,params:{label:'Neighborhoods',data:{type:'FeatureCollection',features:[point('oakwood','Oakwood',[-84.455,33.873]),point('northgate','Northgate',[-84.337,33.875]),point('riverside','Riverside',[-84.438,33.812]),point('midtown','Midtown',[-84.37,33.79]),point('eastfield','Eastfield',[-84.277,33.795]),point('brookside','Brookside',[-84.421,33.734]),point('southpark','South Park',[-84.34,33.72]),point('cedar','Cedar Heights',null)]}}},
    {id:'centers',type:'point_input',x:35,y:229,params:{label:'Cooling centers',data:{type:'FeatureCollection',features:[point('library','Central Library',[-84.367,33.79]),point('community','West Community Hall',[-84.426,33.823])]}}},
    {id:'nearest',type:'measure_distance',x:323,y:90,params:{unit:'kilometres'}},
    // The template names the ruleset rather than the retired `policy` type, so the shipped example
    // does not depend on a migration running. The threshold is the ruleset's declared parameter now,
    // with its unit on the declaration instead of buried in a field name.
    {id:'criteria',type:'apply_ruleset',x:605,y:151,params:{label:'Outreach criteria',
      ruleset:pinnedRuleset('urn:fieldwork:ruleset:outreach-criteria','1.1.0'),parameters:{threshold:5},
      // The condition the ruleset asks for, declared on the node that applies it. It was a
      // separate `alert` widget until 2026-10-25 -- a parameter wearing a node type, titled for
      // a domain, emitting a port type only a retired widget consumed.
      declaredFacts:{'fw:heatAlert':'true','fw:assessmentDate':'2026-07-15'}}},
    {id:'map',type:'map_output',x:879,y:70,params:{label:'Outreach map',inputMode:'decisions'}},
    {id:'table',type:'table_output',x:879,y:249,params:{label:'Decision table',inputMode:'decisions'}}
  ],edges:[
    {id:'e1',from:'neighborhoods',to:'nearest',port:'points'}, {id:'e2',from:'centers',to:'nearest',port:'candidates'},
    {id:'e3',from:'nearest',to:'criteria',port:'distances'},
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
  // `reproject` was a Source that imported a UTM file and stored the CONVERTED CRS84 points
  // (experiment 111). From 2026-10-13 it is a transform that takes points and returns points, so a
  // node saved under the old contract carries data no transform should own. The stored points are
  // already CRS84 -- the conversion ran at import -- so the node becomes the input it effectively
  // was, and its records, label and connections are kept. The discriminator is `params.data`,
  // which the new contract never writes.
  w.nodes=w.nodes.map(n=>n && n.type==='reproject' && isRecord(n.params) && isRecord((n.params as Record<string,unknown>).data)
    ? {...n,type:'point_input' as const,
       params:{label:(n.params as {label?:string}).label||'Reprojected points',
         data:(n.params as {data:PointCollection}).data,
         sourceInfo:{format:'reprojected-points',...(n.params as {source?:object}).source,...(n.params as {provenance?:object}).provenance}} as ParamsByType['point_input'],
       sourceMigration:{fromType:'reproject' as const,version:'1' as const}} : n);
  // `coverage_check` asked where points stood in relation to the study area and passed every one
  // of them on, labelled. `clip_points_to_area` asks the same question and acts on the answer, and
  // a map draws inside and outside without being asked, so the check was answering a question two
  // other widgets had started answering for it. Retired 2026-10-21 on the practitioner's decision.
  //
  // The spatial half migrates exactly. What does NOT migrate is the review: a coverage check let
  // someone exclude a record by JUDGEMENT, with a written reason pinned to a content signature.
  // Those are findings, not geometry, and the clip has nowhere to put them -- so they travel in
  // the migration stamp and the Inspector says they are inert. Dropping them here would be the
  // silent rewrite that retirement exists to prevent.
  // A check could hold up to eight point layers; a clip holds one. Where it held more, the
  // rewrite would have to invent nodes, so it refuses and names the node instead -- which is the
  // other thing the retirement contract allows, and better than opening a workflow that quietly
  // lost layers.
  for(const n of w.nodes){
    if(!n||(n.type as string)!=='coverage_check')continue;
    const fed=w.edges.filter(e=>e&&e.to===n.id&&isPointPort(e.port));
    if(fed.length>1)throw new Error(`"${(n.params as {label?:string}).label||'Check spatial coverage'}" is a retired `
      +`Check spatial coverage widget holding ${fed.length} point layers. It is replaced by `
      +`"Keep points inside the area", which takes one layer, so this one cannot be rewritten `
      +`automatically. Add one Keep points inside the area per layer, connect each to the study `
      +`area, and send them to the map's point inputs.`);
  }
  w.nodes=w.nodes.map(n=>{
    if(!n||(n.type as string)!=='coverage_check')return n;
    const params=(n as {params?:unknown}).params as {label?:string;exclusions?:Exclusion[]}|undefined||{};
    const carried=Array.isArray(params.exclusions)?params.exclusions:[];
    return {...(n as object),type:'clip_points_to_area' as const,
      params:{label:params.label||'Keep points inside the area',keepBoundary:true,showExcluded:true},
      sourceMigration:{fromType:'coverage_check' as const,version:'1' as const,
        ...(carried.length?{carriedExclusions:structuredClone(carried)}:{})}};
  }) as typeof w.nodes;
  // A coverage check fed its own result to a map through the `coverage` port, which a clip does
  // not have: its points go out the way every other point source's do.
  //
  // AND THE MAP NEEDS ITS AREA. A coverage value carried the study area with it, so a map fed only
  // by a check had no `area` edge of its own; rewriting the port alone left it with points and no
  // boundary, and the run stopped on "Cannot read properties of undefined". The area comes from
  // the same place the clip gets it, which is the only answer that cannot be wrong.
  for(const edge of w.edges){
    if(!edge||edge.port!=='coverage')continue;
    const clip=w.nodes.find(n=>n&&n.id===edge.from&&(n.type as string)==='clip_points_to_area');
    if(!clip)continue;
    edge.port='points';
    const target=w.nodes.find(n=>n&&n.id===edge.to);
    if(target?.type!=='map_output'||w.edges.some(e=>e&&e.to===target.id&&e.port==='area'))continue;
    const area=w.edges.find(e=>e&&e.to===clip.id&&e.port==='area');
    if(area)w.edges.push({id:`${edge.id}-area`,from:area.from,to:target.id,port:'area'});
  }

  // `coverage_check` asked where points stood in relation to the study area and passed every one
  // of them on, labelled. `clip_points_to_area` asks the same question and acts on the answer, and
  // a map draws inside and outside without being asked, so the check was answering a question two
  // other widgets had started answering for it. Retired 2026-10-21 on the practitioner's decision.
  //
  // The spatial half migrates exactly. What does NOT migrate is the review: a coverage check let
  // someone exclude a record by JUDGEMENT, with a written reason pinned to a content signature.
  // Those are findings, not geometry, and the clip has nowhere to put them -- so they travel in
  // the migration stamp and the Inspector says they are inert. Dropping them here would be the
  // silent rewrite that retirement exists to prevent.
  // A check could hold up to eight point layers; a clip holds one. Where it held more, the
  // rewrite would have to invent nodes, so it refuses and names the node instead -- which is the
  // other thing the retirement contract allows, and better than opening a workflow that quietly
  // lost layers.
  for(const n of w.nodes){
    if(!n||(n.type as string)!=='coverage_check')continue;
    const fed=w.edges.filter(e=>e&&e.to===n.id&&isPointPort(e.port));
    if(fed.length>1)throw new Error(`"${(n.params as {label?:string}).label||'Check spatial coverage'}" is a retired `
      +`Check spatial coverage widget holding ${fed.length} point layers. It is replaced by `
      +`"Keep points inside the area", which takes one layer, so this one cannot be rewritten `
      +`automatically. Add one Keep points inside the area per layer, connect each to the study `
      +`area, and send them to the map's point inputs.`);
  }
  w.nodes=w.nodes.map(n=>{
    if(!n||(n.type as string)!=='coverage_check')return n;
    const params=(n as {params?:unknown}).params as {label?:string;exclusions?:Exclusion[]}|undefined||{};
    const carried=Array.isArray(params.exclusions)?params.exclusions:[];
    return {...(n as object),type:'clip_points_to_area' as const,
      params:{label:params.label||'Keep points inside the area',keepBoundary:true,showExcluded:true},
      sourceMigration:{fromType:'coverage_check' as const,version:'1' as const,
        ...(carried.length?{carriedExclusions:structuredClone(carried)}:{})}};
  }) as typeof w.nodes;
  // A coverage check fed its own result to a map through the `coverage` port, which a clip does
  // not have: its points go out the way every other point source's do.
  //
  // AND THE MAP NEEDS ITS AREA. A coverage value carried the study area with it, so a map fed only
  // by a check had no `area` edge of its own; rewriting the port alone left it with points and no
  // boundary, and the run stopped on "Cannot read properties of undefined". The area comes from
  // the same place the clip gets it, which is the only answer that cannot be wrong.
  for(const edge of w.edges){
    if(!edge||edge.port!=='coverage')continue;
    const clip=w.nodes.find(n=>n&&n.id===edge.from&&(n.type as string)==='clip_points_to_area');
    if(!clip)continue;
    edge.port='points';
    const target=w.nodes.find(n=>n&&n.id===edge.to);
    if(target?.type!=='map_output'||w.edges.some(e=>e&&e.to===target.id&&e.port==='area'))continue;
    const area=w.edges.find(e=>e&&e.to===clip.id&&e.port==='area');
    if(area)w.edges.push({id:`${edge.id}-area`,from:area.from,to:target.id,port:'area'});
  }


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
      // An UNCHOSEN ruleset is allowed to exist and refused at run time, which is how a drawn
      // study area with no boundary already behaves. The practitioner adds one widget and says
      // what it should do; offering a palette entry per ruleset instead made the palette grow
      // with every ruleset AND every version of one, since old versions stay bundled so saved
      // pins resolve -- four rulesets were showing as seven entries. Their decision, 2026-10-14.
      if(r===undefined)continue;
      if(!r||!/^urn:fieldwork:ruleset:[a-z0-9-]+$/.test(r.id||'')||!/^\d+\.\d+\.\d+$/.test(r.version||''))
        throw new Error('A rule application names a ruleset by id and version. A rule change changes results, so the version is pinned.');
      if(!Array.isArray(r.inputs)||!r.inputs.length||!r.output)
        throw new Error(`${r.title||r.id} pins no ports, so nothing could connect to it.`);
      // Resolving it here is what makes a workflow naming a ruleset this build does not carry
      // refuse to open, by name, rather than failing somewhere inside the executor.
      const ruleset=resolveRuleset(r.id,r.version);
      // A node carrying authored rules is held to ITS OWN declaration. The pin gives such a node
      // its ports and says nothing about rules the practitioner wrote, so checking their values
      // against the pinned artefact's parameters refused a step whose rules use none.
      const declared=n.params.authored
        ?(n.params.authored.parameters??[]).map(p=>({name:p.name,meaning:p.meaning,min:p.min,max:p.max}))
        :ruleset.parameters;
      const title=n.params.authored?n.params.authored.title:ruleset.title;
      for(const parameter of declared){
        const value=n.params.parameters?.[parameter.name];
        if(!Number.isFinite(value))throw new Error(`${title} needs a value for ${parameter.name}: ${parameter.meaning}`);
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
    if(n.type==='reproject'){utmDefinition(n.params.zone,n.params.hemisphere);n.params.spatialReference??=defaultSpatialReference();validateSpatialReference(n.params.spatialReference);}
    if(n.type==='point_input'){validateAttributeSchema(n.params.data,n.params.fields,n.params.attributeRules);if(n.params.pinIdStrategy!==undefined&&!['sequential','uuid'].includes(n.params.pinIdStrategy))throw new Error('Choose sequential or UUID identifiers for new pins.');}
    if((n.type==='map_output'||n.type==='table_output')&&n.params.inputMode!==undefined&&!(n.type==='map_output'?['spatial','decisions','raster','polygons','network']:['spatial','decisions','polygons','table']).includes(n.params.inputMode))throw new Error('Choose spatial inputs or reasoning results.');
    if(n.type==='map_output'&&((n.params.presentation!==undefined&&!['plot','interactive'].includes(n.params.presentation))||(n.params.contextPoints!==undefined&&typeof n.params.contextPoints!=='boolean')))throw new Error('Invalid polygon map presentation.');
    // The subtitle and source-note limits were raised on 2026-10-13, measured against the first
    // figures configured for an outside reader: the Snow subtitles need 176 and 200 characters to
    // say what the figure shows AND what it does not claim, and a full citation with its licence
    // runs to 253. The title stays at 120, because something longer than that is not a title.
    if(n.type==='map_output'&&((n.params.showLegend!==undefined&&typeof n.params.showLegend!=='boolean')||(n.params.basemap!==undefined&&!(BASEMAP_CHOICES as readonly string[]).includes(n.params.basemap))||(['mapTitle','mapSubtitle','mapSourceNote'] as const).some(key=>n.params[key]!==undefined&&(typeof n.params[key]!=='string'||n.params[key]!.length>({mapTitle:120,mapSubtitle:280,mapSourceNote:500}[key])))))throw new Error('Invalid map presentation settings.');
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
    if((n.type==='map_output'||n.type==='table_output'||n.type==='deduplicate_points')&&n.params.pointInputCount!==undefined&&(!Number.isInteger(n.params.pointInputCount)||n.params.pointInputCount<1||n.params.pointInputCount>MAX_POINT_LAYERS))throw new Error('Use 1–8 point input ports.');
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
  for(const n of w.nodes.filter(n=>(n.type==='map_output'||n.type==='table_output'||n.type==='deduplicate_points'))){const sources=w.edges.filter(e=>e.to===n.id&&isPointPort(e.port)).map(e=>e.from);if(new Set(sources).size!==sources.length)throw new Error('Connect each point source once per operation.');}
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
/** A workflow that is NOT FINISHED, which is not a workflow that went wrong.
 *
 *  The practitioner, 2026-10-20, on a red failure toast over a canvas holding a study area and a
 *  street network: *"There is an error toast which does not seem to be an error. The lack of an
 *  output is not an error, it's an incomplete workflow."* Right, and the difference is not
 *  cosmetic: a failure says something broke and invites a bug report, while an unfinished workflow
 *  is the ordinary state of a canvas halfway through being built. The refusals that mean "add the
 *  next thing" carry this type, and the interface reads it rather than inferring tone from the
 *  fact that something was thrown. */
export class IncompleteWorkflow extends Error {}

export function executionPlan(workflow:Workflow) {
  const w=validateWorkflow(workflow), outputs=resultNodes(w);
  if(!outputs.length){
    // Two different situations shared one sentence, so the one that fires most said the wrong
    // thing. A canvas holding a Study area and a Street network was told to "start with a Study
    // area node" -- advice it had already taken. The practitioner, 2026-10-19: *"note error
    // message, there is already a study area."* The study-area clause describes an EXEMPTION, not
    // a step: a canvas of nothing but study areas runs without an output so its N3 can be read.
    if(!w.nodes.length)
      throw new IncompleteWorkflow('This canvas is empty. Add an input to start \u2014 a Study area, Point data, '
        +'Tabular data or a Street network.');
    if(!w.nodes.every(n=>n.type==='study_area'))
      throw new IncompleteWorkflow(`Nothing here displays a result, so there is nothing for a run to produce. `
        +`This workflow holds ${[...new Set(w.nodes.map(n=>TYPES[n.type]?.title??n.type))].join(', ')}. `
        +`Add a Map, Table or Chart output and connect it to the step whose result you want to see. `
        +`(A canvas holding only Study area nodes is the exception: it runs without an output, so its `
        +`N3 facts can be inspected.)`);
    outputs.push(...w.nodes);
  }
  for(const n of w.nodes)if(n.type==='study_area'&&n.params.source==='drawn'&&!n.params.geometry)throw new IncompleteWorkflow('Select a study area on the map before running.');
  // Same shape as the line above: a node may be on the canvas before it has been told what to do,
  // and the refusal names the node rather than the type, because a workflow can hold several.
  for(const n of w.nodes)if(n.type==='apply_ruleset'&&!n.params.ruleset)
    throw new IncompleteWorkflow(`Choose a ruleset for "${n.params.label||n.id}" before running. It decides what the step classifies and which inputs it takes.`);
  const result:WorkflowNode[]=[], done=new Set<string>();
  function visit(node:WorkflowNode) {if(done.has(node.id))return;const inputs=requiredInputs(node,{coverageConnected:w.edges.some(e=>e.to===node.id&&e.port==='coverage')});for(const [port] of inputs){if(node.type==='network_input'&&port==='area'&&!w.edges.some(e=>e.to===node.id&&e.port==='area'))continue;
      // The area is optional here: a country names the scope instead. Required only when the
      // practitioner has asked for the study area to bound the request.
      const e=w.edges.find(e=>e.to===node.id && e.port===port);if(!e)throw new IncompleteWorkflow(`${TYPES[node.type].title} needs its ${port} input connected.`);visit(required(w.nodes.find(n=>n.id===e.from)));}
      // Everything else actually wired, so the plan follows the EDGES and not only the ports a
      // node insists on. A map insists on nothing from 2026-10-15 -- it draws the layers it is
      // given -- and ordering by required ports alone put it in the plan BEFORE its own sources,
      // so it read an undefined value and failed on a shape it had not been handed yet. Required
      // ports still decide what is REFUSED; they were never the right thing to order by.
      for(const e of w.edges.filter(e=>e.to===node.id))visit(required(w.nodes.find(n=>n.id===e.from)));
      done.add(node.id);result.push(node);}
  outputs.forEach(visit);
  // Projected points are not geographic points. `reproject` emits easting and northing in metres,
  // and 23 of the 24 widgets that accept a `points` port assume degrees: a buffer would read metres
  // as degrees, a haversine distance would return a finite nonsense number, and a map would plot
  // the Atlantic. That is the silent failure src/input-data.ts documents for a UTM CSV, moved
  // mid-workflow where there is no file to re-read.
  //
  // Enforced here as a HARD STOP at plan time rather than discovered at run time, because the
  // practitioner can still change the connection. The allowed consumers are the ones that show
  // coordinates as values rather than computing with them.
  const PROJECTED_CONSUMERS=new Set(['table_output']);
  for(const edge of w.edges){
    const from=w.nodes.find(n=>n.id===edge.from);
    if(from?.type!=='reproject')continue;
    const to=w.nodes.find(n=>n.id===edge.to);
    if(!to||!result.some(n=>n.id===to.id))continue;
    if(!PROJECTED_CONSUMERS.has(to.type))throw new Error(
      `${TYPES[to.type]?.title||to.type} needs longitude and latitude, and ${TYPES[from.type].title} gives it easting and northing in metres. `
      +`Connect it to the source points instead; ${[...PROJECTED_CONSUMERS].map(t=>TYPES[t as NodeType]?.title||t).join(' and ')} can show projected coordinates. `
      +`Every widget that measures projects for itself and states the zone it used.`);
  }
  // One RUN, one projection. Nine widgets project to metres and each carries its own zone, with
  // nothing requiring them to agree -- and two plausible zones differ by 0.58% on the same points.
  //
  // This belongs here and not in validateWorkflow, which runs on every edit. Put there on
  // 2026-10-13 it made all eight metric widgets unaddable: unconfigured drafts carry whatever
  // default zone their branch supplies, so the second one added to a canvas disagreed with the
  // first, validation threw, change() rolled the workflow back and the canvas appeared to ignore
  // the click. That is the failure experiment 48 recorded and tests/palette-add.browser.mjs
  // exists to catch; it caught it. Measured against the nodes in the PLAN rather than the whole
  // workflow, because a draft sitting unconnected on the canvas is not part of this run and has
  // no business refusing it.
  workflowMetricCRS({...w,nodes:result});
  return result;
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
export function makeN3(rows:NearestRow[],alert:ParamsByType['alert'],threshold:number,version='1.0.0') {
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
  const ruleset=resolveRuleset('urn:fieldwork:ruleset:outreach-criteria',version);
  const rules=bindParameters(ruleset,{threshold:Number(t)});
  return {facts:prefix+facts+'\n',rules:prefix+rules,input:prefix+facts+'\n\n'+rules,ruleset:rulesetCitation(ruleset)};
}
export async function executeWorkflow(workflow:Workflow,reasoner:Reasoner,onProgress:(id:string,status:'running'|'done'|'failed')=>void=()=>{},resolveCredential?:CredentialResolver):Promise<WorkflowRun> {
  workflow=validateWorkflow(workflow);
  // A composition runs by becoming its members, after the authored graph has been validated
  // as authored. The executor below has no composition branch: one receipt per member falls
  // out of running ordinary nodes, which is what experiment 75 requires of it.
  const runId=crypto.randomUUID(), receipts:Receipt[]=[];
  // What each deduplication found, so the node can show the band it is waiting on.
  const linkages:Record<string,DeduplicateResult>={};
  const expansion=expandMicroWorkflows(workflow,resolveComposition,runId);
  workflow=expansion.workflow;receipts.push(...expansion.receipts);
  const plan=executionPlan(workflow), values=new Map<string,unknown>(), trace:WorkflowRun['trace']=[];
  for(const node of plan){
    // Which node failed, reported before the error leaves this function.
    //
    // A refused step used to stay 'running' for ever: `onProgress(node.id,'done')` is the last
    // line of the loop body and a throw skips it, so nothing ever retracted the running state.
    // The canvas then showed the one widget that had stopped as the one still working, which is
    // the exact opposite of what happened. Found 2026-10-16 by measuring the classes on a
    // failing node: `node purple selected running`.
    try{
      await runNode(node);
    }catch(error){
      onProgress(node.id,'failed');
      throw error;
    }
  }
  async function runNode(node:typeof plan[number]){
    onProgress(node.id,'running');const begin=performance.now();const beganAt=new Date().toISOString();
    const inputs=Object.fromEntries(workflow.edges.filter(e=>e.to===node.id).map(e=>[e.port,values.get(e.from)])) as unknown as ExecutionInputs;
    // A DECLARED PORT IS NOT A CONNECTED ONE. map_output declares `points` and `context` beside
    // `area`, so a study area shown on its own -- the whole of experiment 01, and every area a
    // practitioner inspects before adding data -- has point ports with no edge behind them. This
    // asserted one anyway and threw "undefined is not an object (evaluating 'c.from')" at the
    // practitioner, naming a minified variable in a workflow that was perfectly valid.
    //
    // Unconnected ports are skipped rather than defaulted: a layer standing for an input nobody
    // supplied would be worse than its absence.
    // WHOSE points these are, read from the data rather than from the wire. A layer used to be
    // named after the node PLUGGED INTO the map, so a `clip_points_to_area` in between made two
    // searches of two different registries both announce themselves as "Points inside the area" --
    // the clip's own label -- and the receipt attributed every record to the clip. Reported
    // 2026-10-20: *"Map still does not distinguish the two facility sources as layers."*
    //
    // The identity was already travelling correctly and was being ignored: a facility search
    // stamps its collection with its own `sourceNodeId`, and the clip carries it forward. Two
    // notions of identity existed -- the edge's `from` and the one the data holds -- and they
    // disagree exactly when a widget sits in between. The data's wins; `from` is the fallback for
    // a collection that carries none.
    const layerIdentity=(w:Workflow,from:string,collection:PointCollection,connected:WorkflowNode):{sourceNodeId:string;label:string}=>{
      const carried=(collection as unknown as {sourceNodeId?:string}).sourceNodeId;
      const origin=typeof carried==='string'?w.nodes.find(n=>n.id===carried):undefined;
      return origin
        ?{sourceNodeId:origin.id,label:origin.params.label||TYPES[origin.type].title}
        :{sourceNodeId:from,label:connected.params.label||TYPES[connected.type].title};
    };
    const pointInputs=():{layers:import('./types.js').PointLayer[]}=>({layers:nodeInputs(node).filter(([port])=>isPointPort(port)).flatMap(([port])=>{const edge=workflow.edges.find(e=>e.to===node.id&&e.port===port);if(!edge)return [];const source=workflow.nodes.find(n=>n.id===edge.from);if(!source)return [];return [{...(inputs[port as keyof ExecutionInputs] as unknown as PointCollection),
      ...layerIdentity(workflow,edge.from,inputs[port as keyof ExecutionInputs] as unknown as PointCollection,source),attributeDefinitions:[...('fields' in source.params?source.params.fields||[]:[]),...('attributeRules' in source.params?source.params.attributeRules||[]:[])]}];})});
    let value:unknown;
    switch(node.type){
      case 'mean_center':{value=computeMeanCenter(inputs.points,node.params);receipts.push(meanCenterReceipt(node,value as MeanCenter,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='points')!.from));break;}
      case 'compare_point_sets':{value=comparePointSets(inputs.original,inputs.moved,inputs.pumps,node.params,node.params.centers?inputs.originalCenter:undefined,node.params.centers?inputs.movedCenter:undefined);const sources=Object.fromEntries(workflow.edges.filter(e=>e.to===node.id).map(e=>[e.port,e.from])) as {original:string;moved:string;pumps:string;originalCenter?:string;movedCenter?:string};receipts.push(comparisonReceipt(node,value as PointComparison,runId,sources));break;}
      case 'comparison_map':{const shown=comparisonMap(node,inputs.comparison,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='comparison')!.from);value=shown.value;receipts.push(shown.receipt);break;}
      case 'donut_geomask':case 'aggregate_points_to_h3_cell':{
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
        // Given areas it combines areas; given polygons it combines polygons. Same widget, same
        // sentence -- "overlapping and touching areas become one" -- and the output is whatever
        // kind went in, so a merged study area can be given to everything a study area feeds.
        if(node.params.yields==='area'){
          const merged=combineAreas(node,[inputs.area,inputs.area2],runId);
          value=merged.value;receipts.push(merged.receipt);break;
        }
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

      case 'network_input':case 'voronoi':case 'isochrone':case 'clip_polygons':case 'summarize_points_to_polygon':{
        if(node.type==='network_input'){
          // An EMPTY network is almost always one that has not been downloaded, and acquiring it
          // is a separate, explicit action -- a button in the Inspector, not part of Run. Saying
          // only what the value lacks sent the practitioner round three times on 2026-10-19,
          // redownloading an area the span cap had refused and reading "needs at least one
          // junction" each time. The refusal now names the action.
          const network=node.params.data;
          if(!network?.nodes?.length&&!network?.edges?.length)
            throw new Error(node.params.inputMethod==='file'
              ?`"${node.params.label}" has no street network yet. Select it and upload a GraphML or JSON file; running does not import one.`
              :node.params.inputMethod==='extract'
              ?`"${node.params.label}" has no street network yet. Select it and choose a published .osm.pbf extract; running the workflow does not read one.`
              :`"${node.params.label}" has no street network yet. Select it and press "Download and save OSM network" \u2014 running the workflow does not start the download.`);
          validateNetwork(network);
        }
        value=node.type==='network_input'?structuredClone(node.params.data):node.type==='voronoi'?voronoi(inputs.sites,inputs.area.boundary,node.params.zone,node.params.hemisphere):node.type==='isochrone'?await computeIsochrone(inputs.sites,inputs.network,node.params):node.type==='clip_polygons'?clipPolygons(inputs.polygons,inputs.area.boundary):summarizePolygons(inputs.polygons,inputs.points,node.params);
        if(node.type==='voronoi'||node.type==='isochrone')(value as Polygons).siteSourceNodeId=workflow.edges.find(e=>e.to===node.id&&e.port==='sites')!.from;
        receipts.push(catchmentReceipt(node,value as Polygons|Network,runId,workflow.edges.filter(e=>e.to===node.id).map(e=>e.from)));break;
      }

      case 'join_table_to_area':{
        // THE NAMES HAVE TO BE THERE. An area drawn by hand has no named parts, so there is
        // nothing to key on and saying so is better than matching nothing and drawing an empty
        // choropleth that looks like a finding.
        const units=(inputs.area as {units?:{id:string;name:string}[]}).units;
        if(!units?.length)throw new Error('This study area has no named parts to join to. Acquire a boundary whose features carry names, or import one from a file and choose the name column.');
        // `records`, not `table`: `inputs` is keyed by PORT name, and the port is called records
        // to match every other widget that takes rows. Reading `inputs.table` here cost a run
        // that failed with "Cannot read properties of undefined" and named neither port.
        const joined=joinTableToAreas(units,
          inputs.records as unknown as import('./data-table.js').DataTable,
          {keyField:node.params.keyField,normalisation:node.params.normalisation});
        value=joinedPolygons(inputs.area.boundary,joined,node.params.label);
        receipts.push(areaJoinReceipt(node,joined,runId,
          workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from,
          workflow.edges.find(e=>e.to===node.id&&e.port==='area')!.from));
        break;}
      case 'raster_input':{if(!node.params.asset)throw new Error('Prepare the raster window before running.');const grid=await loadRaster(node.params.asset,inputs.area);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId));break;}
      case 'clip_raster':{const grid=clipRaster(inputs.raster,node.params.cutline?.geometry||inputs.area.boundary,node.params);value=grid;receipts.push(rasterReceipt(node,grid,inputs.area,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from));break;}
      case 'places':case 'centers':value={...node.params.data,spatialReference:structuredClone(node.params.spatialReference)};break;
      case 'point_input':{
        // Repairs are applied to a COPY, here, on the way out. What this node holds is what the
        // file held; what it hands on is what the practitioner declared it should be read as.
        // 2026-10-16: "there is always an option to use a copy, not the original."
        const emitted=applyRepairs(node.params.data.features??[],node.params.repairs??[]);
        value={...node.params.data,features:emitted,sourceNodeId:node.id,sourceKind:'input-points',sourceInfo:structuredClone(node.params.sourceInfo),spatialReference:structuredClone(node.params.spatialReference)};
        // A repaired column is stated in the evidence. The records this node emits are no longer
        // the records the file held, and a reader has to be able to learn that from the run
        // rather than from having been present when somebody pressed the button. Experiment 117.
        const repairs=node.params.repairs??[];
        if(repairs.length){
          const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
          const quote=(v:string)=>JSON.stringify(v);
          const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
            +`@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
            // prov:qualifiedRevision, because a repair IS a revision: the records handed on are
            // a revision of the records held. DQV has no term for repair, so this is PROV's.
            +repairs.map(r=>`${entity} prov:qualifiedRevision [ a fw:ColumnRepair; `
              +`fw:boundAttribute ${quote(r.column)}; fw:repairedAs ${quote(r.to)}; `
              +`fw:repairedRecordCount "${r.cast}"^^xsd:integer; `
              +`fw:unrepairedRecordCount "${r.unreadable.length}"^^xsd:integer`
              +(r.unreadable.length?`; fw:unrepairedExample ${r.unreadable.slice(0,3).map(quote).join(', ')}`:'')
              +`; fw:repairedAt ${quote(r.at)} ].`).join('\n')+'\n';
          receipts.push({nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],
            method:repairs.map(r=>`${r.column}: ${r.cast} value${r.cast===1?'':'s'} read as ${r.to}s at a practitioner's request`
              +(r.unreadable.length?`, ${r.unreadable.length} left unreadable`:'')+'.').join(' ')
              +' The source file is unchanged; these records are not the records it held.'});
        }
        break;}
      case 'derive_value':{
        // ASSIGN, over the long table this application holds. Epi Info separates DEFINE and
        // ASSIGN from IF, and only the IF was here: rules conclude a TERM about a record and
        // never a number computed from other numbers. A DataTable is long, so there are never
        // two numeric columns to combine -- there are two ROWS agreeing on every key but one,
        // which is the same pivot `rate` already names with `measureKey`.
        const table=inputs.records as unknown as import('./data-table.js').DataTable;
        if(table?.kind!=='data-table')throw new Error('Connect a table: this step derives a value from one.');
        const result=deriveValue(table,node.params);
        value=result.table as unknown as DisplayValue;
        receipts.push({nodeId:node.id,kind:'computation',
          method:`${node.params.left} ${OPERATORS[node.params.operator].label} ${node.params.right}`,
          derived:result.derived,gaps:result.gaps} as unknown as Receipt);
        break;}
      case 'relate_table':{
        // RELATE, not MERGE. Epi Info has three join commands and this project had none, which
        // the 0.12.0 release notes recorded as the reason South London's contingency table is
        // "prepared outside the application". The one that table needs is the narrowest: a long
        // table's value column can only hold numbers, so a CATEGORY brought across is a key
        // column and the row count does not change. Bringing MEASURES across adds rows and is a
        // different operation with a different failure mode -- see src/relate-table.ts.
        const table=inputs.records as unknown as import('./data-table.js').DataTable;
        const other=inputs.related as unknown as import('./data-table.js').DataTable;
        if(table?.kind!=='data-table')throw new Error('Connect a table: this step adds a column to one.');
        if(other?.kind!=='data-table')throw new Error('Connect a second table on the "related" port: '
          +'this step brings a column across from it.');
        const result=relateTable(table,other,node.params);
        value=result.table as unknown as DisplayValue;
        receipts.push({nodeId:node.id,kind:'computation',
          method:`${node.params.bring} brought across on ${node.params.on}`
            +`, ${result.related} row${result.related===1?'':'s'} related`
            +(result.dropped?`, ${result.dropped} dropped for keys the second table does not carry`:''),
          related:result.related,dropped:result.dropped,gaps:result.gaps,
          values:result.values} as unknown as Receipt);
        break;}
      case 'group_table':{
        const table=inputs.records as unknown as import('./data-table.js').DataTable;
        if(table?.kind!=='data-table')throw new Error('Connect a table: this step totals the rows of one.');
        const result=groupTable(table,node.params);
        value=result.table as unknown as DisplayValue;
        receipts.push({nodeId:node.id,kind:'computation',
          method:`${result.collapsedFrom} rows totalled into ${result.groups} within `
            +`${node.params.by.join(' and ')}, dropping ${result.dropped.join(' and ')}`
            +(result.gaps.length?`; ${result.gaps.length} group`
              +`${result.gaps.length===1?'' :'s'} held an empty cell and total to nothing known`:''),
          groups:result.groups,collapsedFrom:result.collapsedFrom,
          dropped:result.dropped,gaps:result.gaps} as unknown as Receipt);
        break;}
      case 'two_by_two':{
        const table=inputs.records as unknown as import('./data-table.js').DataTable;
        if(table?.kind!=='data-table')throw new Error('Connect a table: this step reads four cells of one.');
        const result=computeTwoByTwo(table,node.params);
        // THE COUNTS ARE THE VALUE AND THE ESTIMATES RIDE ON IT, the arrangement `rate_ratio`
        // settled on 2026-10-26 after one row holding 8.40 showed the summary and hid the thing
        // a reader checks it against. An epidemiologist reads the cells first.
        const cell=(exposure:string,outcome:string,count:number)=>
          ({key:{[node.params.exposureColumn]:exposure,[node.params.outcomeColumn]:outcome},value:count});
        const {exposed,unexposed,caseValue,nonCaseValue}=node.params;
        value={kind:'data-table',keys:[node.params.exposureColumn,node.params.outcomeColumn],
          valueField:table.valueField,...(table.unit?{unit:table.unit}:{}),
          rows:[cell(exposed,caseValue,result.cells.exposedCases),
            cell(exposed,nonCaseValue,result.cells.exposedNonCases),
            cell(unexposed,caseValue,result.cells.unexposedCases),
            cell(unexposed,nonCaseValue,result.cells.unexposedNonCases)],
          rowCount:4,missingValueCount:0,twoByTwo:result} as unknown as DisplayValue;
        receipts.push(twoByTwoReceipt(node,result,runId,
          workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from));
        break;}
      case 'select_rows':{
        const table=inputs.records as unknown as import('./data-table.js').DataTable;
        if(table?.kind!=='data-table')throw new Error('Connect a table: this step keeps rows of one.');
        const result=selectRows(table,node.params.keyColumn,node.params.values);
        value=result.table as unknown as DisplayValue;
        receipts.push({nodeId:node.id,kind:'computation',
          method:`kept ${node.params.values.join(', ')} of ${node.params.keyColumn}`,
          kept:result.kept,dropped:result.dropped,absent:result.absent} as unknown as Receipt);
        break;}
      case 'rate':{const records=node.params.source==='table'
        ?fromTable(inputs.records as unknown as import('./data-table.js').DataTable,node.params.measureKey||'measure')
        :fromPoints(inputs.records);
        const result=computeRate(records,node.params);value={...rateTable(result),chart:rateChart(result)} as unknown as DisplayValue;receipts.push(rateReceipt(node,result,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='records')!.from));break;}
      case 'rate_ratio':{
        // THE INPUT IS A RATE, NOT A TABLE OF NUMBERS. Only a rate declares what its numbers are
        // per, and dividing a per-house rate by a per-person one is arithmetic on two different
        // quantities. `rateTable` carries the RateResult on the value it emits, which is the only
        // place that declaration survives a port.
        const comparison=computeRateRatio(inputs.rates?.rate!,node.params);
        const sentence=rateRatioSentence(comparison);
        // THE TABLE IS THE 2x2 THE RATIO WAS COMPUTED FROM, not the ratio on its own. One row
        // holding 8.40 showed the summary and hid the thing a reader checks it against: an
        // epidemiologist reads the counts first and the ratio second, and until 2026-10-26 the
        // counts existed on the result and reached no display at all. Two variables matrixed --
        // group against measure -- which is the shape experiment 136 records as the other mode
        // of displaying layers, in the long form every table here uses.
        // The rate each group carries, at the multiplier the Rate step declared, because that is
        // what makes the ratio checkable BY HAND: 315.4 over 37.5 is 8.40, and a reader who sees
        // only the counts has to do the division themselves. The multiplier belongs to the rates
        // and never to the ratio, which stays dimensionless.
        const per=inputs.rates?.rate?.options.multiplier??1;
        const unit=comparison.denominatorUnit;
        // WHAT THE EVENTS ARE, from the Rate step's own declaration. "events" is the widget's
        // word and is true of every rate ratio; `deaths` is the practitioner's, and it is what
        // they will look for. The practitioner, 2026-10-26, reading the table: "events =
        // deaths?" -- a question nobody should have to ask of their own data. Reading the
        // declared numerator is not guessing: it is the column they named.
        const events=inputs.rates?.rate?.options.numeratorField?.trim()||'events';
        const cell=(side:typeof comparison.compared,measure:string,value:number)=>
          ({key:{group:side.label,measure},value});
        value={kind:'data-table',keys:[...RATE_RATIO_TABLE_KEYS],valueField:'count',
          rows:[comparison.compared,comparison.reference].flatMap(side=>[
            cell(side,events,side.events),
            cell(side,`${unit} at risk`,side.unitsAtRisk),
            cell(side,`per ${per.toLocaleString()} ${unit}`,side.rate*per),
          ]),
          rowCount:6,missingValueCount:0,rateRatio:comparison,sentence} as unknown as DisplayValue;
        receipts.push(rateRatioReceipt(node,comparison,runId,
          workflow.edges.find(e=>e.to===node.id&&e.port==='rates')!.from));
        break;}
      case 'case_series':{const series=node.params.source==='table'?caseSeriesFromTable(inputs.cases,{dateField:node.params.dateField,dateKind:node.params.dateKind,period:node.params.period}):caseSeries(inputs.points,{dateField:node.params.dateField,dateKind:node.params.dateKind,period:node.params.period,weightField:node.params.weightField});value={...seriesTable(series),chart:seriesChart(series)} as unknown as DisplayValue;receipts.push(seriesReceipt(node,series,runId,workflow.edges.find(e=>e.to===node.id&&(e.port==='points'||e.port==='cases'))!.from));break;}
      case 'slr_extract_import':{const extract=projectionExtract(inputs.projections,{datasetIRI:node.params.datasetIRI,datasetVersion:node.params.datasetVersion,baselinePeriod:node.params.baselinePeriod,citations:node.params.citations,basisKind:node.params.basisKind,familyValues:node.params.familyValues,sourceNote:node.params.sourceNote});value=projectionTable(extract) as unknown as DisplayValue;receipts.push(extractReceipt(node,extract,runId));break;}
      case 'slr_site_assignment':{
        // A PLAIN TABLE AND THE RULESET THAT CONTRACTED FOR IT, or -- for a workflow saved before
        // 2026-10-26 -- the annotated value the retired extract widget produced. `readExtract`
        // refused a plain table because the dataset, baseline and citations "must be declared
        // first"; they are, in rulesets/extract-contract, pinned by version on the node that
        // applied it. Experiment 115's P1.
        const annotated=(inputs.projections as unknown as {projection?:unknown}).projection;
        let extract;
        if(annotated)extract=readExtract(inputs.projections);
        else{
          const edge=workflow.edges.find(e=>e.to===node.id&&e.port==='projections');
          const upstream=edge?workflow.nodes.find(n=>n.id===edge.from):undefined;
          const pin=upstream?.type==='apply_ruleset'?upstream.params.ruleset:undefined;
          if(!pin)throw new Error('These projections were not read through a contract. Apply the '
            +'published projection extract ruleset to them first: it declares the key columns, the '
            +'units and the citations this step relies on, and it is what carries the dataset\'s '
            +'provenance to this step.');
          extract=extractFromRuleset(
            inputs.projections as unknown as import('./data-table.js').DataTable&{distinct?:Record<string,string[]>},
            resolveRuleset(pin.id,pin.version));
        }const assignments=assignSites(inputs.points,inputs.sites,extract);value=assignmentTable(assignments) as unknown as DisplayValue;const edge=(port:string)=>workflow.edges.find(e=>e.to===node.id&&e.port===port)!.from;receipts.push(assignmentReceipt(node,assignments,runId,{points:edge('points'),sites:edge('sites'),projections:edge('projections')}));break;}
      case 'slr_threshold_comparison':{const table=inputs.assignments;if(!table?.assignments)throw new Error('Connect Assign projection site: a comparison needs the assignments, not a plain table.');const comparison=compareToElevation(table.assignments,{selection:{scenario:node.params.scenario,basis:node.params.basis,family:node.params.family,year:node.params.year,quantile:node.params.quantile},elevationField:node.params.elevationField,verticalDatum:node.params.verticalDatum,elevationReference:node.params.elevationReference});value=comparison as unknown as DisplayValue;receipts.push(thresholdReceipt(node,comparison,table.assignments,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='assignments')!.from));break;}
      case 'table_input':{if(!node.params.data.rows.length)throw new Error('Import a long-format table before running.');const imported=tableReceipt(node,node.params.data,runId);value=imported.value;receipts.push(imported.receipt);break;}
      // The conversion ran when the file was saved; execution replays it offline without reprojecting again.
      case 'deduplicate_points':{
        const layers=pointInputs().layers;
        if(layers.length<2)throw new Error('Deduplication compares records ACROSS sources, so it needs at least two point layers.');
        const linked=deduplicatePoints(layers,node.params,node.params.decisions);
        linkages[node.id]=linked;
        value={...linked.collection,sourceNodeId:node.id,sourceKind:'input-points',
          sourceInfo:{format:'deduplicated-points',
            notes:[`${linked.merged} records merged from ${linked.inputCount}`,
              `${linked.awaiting} pairs awaiting a decision`]},
          linkage:{candidates:linked.candidates,compared:linked.compared,blocked:linked.blocked,
            matched:linked.matched,awaiting:linked.awaiting,merged:linked.merged}} as unknown as DisplayValue;
        receipts.push(deduplicateReceipt(node,linked,runId,layers.map(l=>l.sourceNodeId)));
        break;
      }
      case 'clip_points_to_area':{
        const clipped=clipPointsToArea(inputs.points,inputs.area.boundary,node.params.keepBoundary!==false);
        if(!clipped.collection.features.length)throw new Error(
          `No points fall inside "${inputs.area.label||'the study area'}". `
          +`${clipped.outside} of ${clipped.inside+clipped.boundary+clipped.outside+clipped.missing} are outside it`
          +(clipped.missing?` and ${clipped.missing} carry no usable location`:'')+`. `
          +`Check that the area is the one you meant.`);
        const areaEdge=workflow.edges.find(e=>e.to===node.id&&e.port==='area');
        const pointsEdge=workflow.edges.find(e=>e.to===node.id&&e.port==='points');
        receipts.push(clipPointsReceipt(node,clipped,runId,areaEdge?.from??node.id,pointsEdge?.from??node.id,inputs.area.areaFacts));
        const from=inputs.points as unknown as {sourceNodeId?:string;sourceKind?:string};
        value={...clipped.collection,sourceNodeId:from.sourceNodeId??node.id,
          sourceKind:from.sourceKind??'input-points',
          // SHOWN, NOT PASSED ON. The excluded points ride on the value so a map can draw them in
          // the Outside colour it already has, while every widget downstream receives only the
          // features that are in the area. A count says how many were lost; the points say
          // whether losing them was right, and a cluster over one border reads differently from
          // a scatter in all directions.
          ...(node.params.showExcluded!==false&&clipped.excluded.length?{excludedPoints:clipped.excluded}:{}),
        } as unknown as DisplayValue;
        break;}
      case 'reproject':{
        const source=inputs.points;
        if(isProjectedReference(source.spatialReference))throw new Error(`${TYPES[node.type].title} projects longitude and latitude into a UTM zone. Its input is already projected into ${source.spatialReference.geometryCRS}; projecting twice is not a conversion between zones.`);
        const projected=projectFromCRS84(source,node.params.zone,node.params.hemisphere);
        const {crs}=utmDefinition(node.params.zone,node.params.hemisphere);
        value={...projected.collection,sourceNodeId:node.id,sourceKind:'input-points',sourceInfo:{format:'projected-points',...structuredClone(projected.provenance)},
          spatialReference:{datum:'WGS84',geodeticCRS:'EPSG:4326',geometryCRS:crs,axisOrder:'easting-northing',units:'metre'}};break;}
      case 'alert':value=node.params;break;
      case 'measure_distance':{
        const searched=nearestPlaces(inputs.points,inputs.candidates,node.params.unit,node.params.candidateFilter);
        const narrowed=node.params.candidateFilter?.length
          ? ` Candidates narrowed by ${node.params.candidateFilter.map(c=>`${c.field} ${c.comparator==='in'?'in':'not in'} {${c.values.join(', ')}}`).join('; ')}: ${searched.eligibleCount} of ${searched.candidateCount} eligible.`
          : '';
        // `locationSource` says where the subjects came from, which `access` carried and a general
        // search should too: a reader of a distance wants to know what was measured, not only from
        // what. Carried here so the value stays thin -- it is the points input's own provenance.
        const from=inputs.points as unknown as {sourceNodeId?:string; sourceKind?:string};
        value={rows:searched.rows,centers:inputs.candidates.features,
          method:`Haversine; sphere radius 6371.0088 km; CRS84 longitude/latitude; distances in ${node.params.unit}.${narrowed}`,
          candidateCount:searched.candidateCount,eligibleCount:searched.eligibleCount,
          locationSource:{nodeId:from.sourceNodeId,kind:from.sourceKind==='generated-grid'?'generated-grid':'input-points'}} as unknown as DisplayValue;
        break;
      }
      case 'apply_ruleset':{
        // The merge: three widgets differed only in which rules they ran. The projection is the
        // ruleset's own declaration, and each still assembles a different value for whatever
        // consumes it -- so this collapses the palette and the contract, not the three projections.
        const pinned=node.params.ruleset,bound=node.params.parameters;
        // executionPlan refuses an unconfigured node before anything runs, so reaching here
        // without a pin would be a defect in the plan rather than in the workflow.
        if(!pinned)throw new Error(`${node.params.label||node.id} has no ruleset to apply.`);
        // Rules the practitioner wrote. One generic path -- facts from the declared field
        // bindings, the authored form compiled to N3, conclusions carried back onto the records
        // that were judged -- where a bundled ruleset has a generator and a projection written
        // for the shape it expects. Experiment 106.
        const authored=node.params.authored;
        if(authored){
          // Points or a table. The rules do not know the difference: a rule reads a predicate,
          // and a predicate is bound to an attribute of a record. 2026-10-16.
          //
          // READ THE PORT THE NODE DECLARES, not a port named here. Writing rules on a step keeps
          // the ports of whatever pin the node was holding (`app.ts`, `held?.inputs`), so a node
          // that came from the extract contract carries `projections` and never had a `subjects`
          // port at all. This line named one, got undefined, and reported "Connect records to
          // classify" about an input that was connected -- found 2026-10-26 by writing rules on
          // the Manila extract step. `subjects` remains the fallback: it is the port the authored
          // default declares for a node that was holding no pin.
          const port=node.params.ruleset?.inputs[0]?.[0]??'subjects';
          const subjects=(inputs as unknown as Record<string,unknown>)[port] as PointCollection;
          // Units first. A rule comparing minutes to hours is wrong by a factor of sixty and
          // every other check in this application passes it: the parameter is in range, the
          // rules compile, the run succeeds. Refused rather than converted, which is the
          // precedent makeN3 set for distances -- reinterpreting a practitioner's number
          // silently would change what they decided.
          const unitProblems=authoredUnitProblems(authored);
          if(unitProblems.length)
            throw new Error(`${node.params.label||node.id} cannot run: ${unitProblems[0].says}`
              +(unitProblems.length>1?` (${unitProblems.length-1} more like it.)`:''));
          const facts=authoredFacts(subjects,authored.fields);
          const compiled=compileAuthoredRuleset({subject:'?s',comment:authored.title,
            rules:authored.rules as never});
          // The authored ruleset's OWN parameters, not the pinned artefact's. The pin gives this
          // node its ports; it does not describe rules the practitioner wrote, and binding
          // against its declaration refused a step whose rules simply use no parameter.
          const declared=(authored.parameters??[]).map(p=>({name:p.name,role:'authored',type:'number',
            min:p.min,max:p.max,default:undefined,decimals:p.decimals??9,
            placeholder:`{{${p.name}}}`,meaning:p.meaning,unitLabel:p.unitLabel}));
          const rules=bindParameters({...resolveRuleset(pinned.id,pinned.version),
            title:authored.title,parameters:declared as never,rules:compiled},bound);
          const conclusions=await reasoner(facts+'\n'+rules);
          // What the records could not say, counted before anything is concluded from them.
          const dataIssues=authoredDataIssues(subjects,authored.fields);
          const judged=authoredProjection(subjects,authored.fields,conclusions);
          // A table in, a table out -- carrying what the rules concluded as further key columns,
          // so a Table output renders the judgement beside the number it was made about. A point
          // layer in, the records back whole, as extent-review 1.1.0 returns its polygons.
          value=({...(judged.table??{type:'FeatureCollection',features:judged.features,rows:judged.rows,
            kind:'authored-ruleset',centers:[],method:authored.title}),
            ...(dataIssues.length?{dataIssues,issuedBy:node.id}:{})}) as unknown as DisplayValue;
          receipts.push(authoredReceipt(node,authored,facts,rules,conclusions,judged.unmatched,runId,workflow.edges,dataIssues));
          break;
        }
        // A RULESET THAT DECLARES ITS COLUMNS NEEDS NO BRANCH HERE.
        //
        // The widget is an interpreter and the ruleset is the program (experiment 65), and an
        // interpreter that must be edited to run a new program is not one. The four cases below
        // are exactly that edit, each projecting one ruleset's conclusions in its own way, while
        // `authoredProjection` -- which rules a practitioner writes have always gone through --
        // is the general answer: conclusions become key columns on a table or properties on a
        // point layer, and the value field is left alone.
        //
        // Declaring `inputContract.fieldFrom` is what lets a bundled ruleset use it. The four
        // below have bespoke fact generators and keep their branches until each is converted;
        // nothing new needs one.
        const bindings=resolveRuleset(pinned.id,pinned.version).inputContract.fieldFrom;
        if(bindings?.length){
          const port=node.params.ruleset?.inputs[0]?.[0];
          const subjects=port?(inputs as unknown as Record<string,unknown>)[port]:undefined;
          if(!subjects)throw new Error(`${pinned.title} reads its facts from the `
            +`"${port??'first'}" input, and nothing is connected to it.`);
          const typed=subjects as PointCollection|import('./data-table.js').DataTable;
          // THE CONTRACT IS CHECKED BEFORE THE RULES SEE ANYTHING. Every failure at once, and
          // fatal: these say how to read the numbers, so a run that proceeded without them would
          // compute something nobody could interpret. Provenance is the other kind and is a gap.
          const failures=tableContractFailures(
            resolveRuleset(pinned.id,pinned.version).inputContract.tableContract,
            typed as {keys?:string[];unit?:string;rows?:{key:Record<string,unknown>}[]});
          if(failures.length)
            throw new Error(`${pinned.title} cannot read this table.\n\n`+failures.join('\n\n'));
          const facts=authoredFacts(typed,bindings);
          const rules=bindParameters(resolveRuleset(pinned.id,pinned.version),bound);
          const conclusions=await reasoner(facts+'\n'+rules);
          const dataIssues=authoredDataIssues(typed,bindings);
          const judged=authoredProjection(typed,bindings,conclusions);
          value=({...(judged.table??{type:'FeatureCollection',features:judged.features,
            rows:judged.rows,kind:'ruleset-applied',centers:[],method:pinned.title}),
            ...(dataIssues.length?{dataIssues,issuedBy:node.id}:{})}) as unknown as DisplayValue;
          receipts.push({nodeId:node.id,kind:'computation',facts,rules,input:facts+'\n'+rules,
            conclusions,ruleset:rulesetCitation(resolveRuleset(pinned.id,pinned.version))});
          break;
        }
        switch(projectionOf(pinned.id,pinned.version)){
          case 'outreach':{
            // THE CONDITION IS DECLARED HERE, not wired in from a widget of its own. `fw:heatAlert`
            // is named by the ruleset's inputContract, so this node holds a value for it exactly
            // as it holds one for the threshold. A saved workflow may still carry an `alert` node
            // on the `alert` port; it is read when no declaration is present, which is the
            // adapter rather than a second way of saying the same thing.
            const stated=node.params.declaredFacts?.['fw:heatAlert'];
            const condition=stated!==undefined||!inputs.alert
              ?{active:stated==='true'?true:stated==='false'?false:null,
                date:node.params.declaredFacts?.['fw:assessmentDate']??''}
              :inputs.alert;
            const n3=makeN3(inputs.distances.rows,condition,bound.threshold,pinned.version);
            const conclusions=await reasoner(n3.input);
            value=outreachProjection(inputs.distances,condition,bound.threshold,conclusions);
            receipts.push({nodeId:node.id,...n3,conclusions});break;
          }
          case 'polygon-extent':{
            // Experiment 113: a rule over a quantity DERIVED from geometry rather than over an
            // imported column. The area is read from the record, where the widget that projected
            // to get it now attaches it; this step neither projects nor measures.
            //
            // That this case had to be written is the experiment's own finding. A ruleset declares
            // its `projection` as data, but the handler for a new one is a branch here, so adding
            // a ruleset over a shape nothing had classified before is not a data change.
            const n3=extentN3(inputs.polygons,bound.threshold,pinned.version);
            const conclusions=await reasoner(n3.input);
            value=extentProjection(inputs.polygons,bound.threshold,conclusions);
            receipts.push({nodeId:node.id,...n3,conclusions});break;
          }
          case 'access-review':{
            const applied=await applyAccessReview(inputs.access,bound.threshold,reasoner,pinned.version);
            value=applied.value;receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          case 'access-review-distances':{
            // Same rules, same facts, read off the general value that nearest and travel_time
            // produce instead of the one `access` emitted.
            const applied=await applyAccessReview(distancesAsAccess(inputs.distances),bound.threshold,reasoner,pinned.version);
            value=applied.value;receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          case 'facility-grading-points':{
            const applied=await applyFacilityGrading(inputs.facilities,reasoner,pinned.version);
            value=gradedPointLayer(applied.value) as unknown as DisplayValue;
            receipts.push({nodeId:node.id,...applied.receipt});break;
          }
          case 'facility-grading':{
            const applied=await applyFacilityGrading(inputs.facilities,reasoner,pinned.version);
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
      case 'map_output':{const mode=drawnMode(node,workflow.edges);
        // A map insists on no particular port and still insists on something: it draws what it is
        // given, so given nothing it has nothing to draw. The refusal used to name the port the
        // mode had chosen -- "needs its network input connected" -- which told a practitioner
        // about a setting rather than about their canvas.
        if(!workflow.edges.some(e=>e.to===node.id))
          throw new Error(`Connect a layer to "${node.params.label||node.id}". A Map draws the layers it is given — an area, points, polygons, a raster or a street network — and nothing is connected to it.`);
        if(mode==='network'){
        const network=inputs.network as import('./catchments.js').Network;
        if(!network?.nodes?.length)throw new Error('Connect a Street network: this Map is set to show a network and none is connected.');
        const source=workflow.edges.find(e=>e.to===node.id&&e.port==='network')!.from;
        // The study area is drawn WITH the streets when both are connected. The practitioner,
        // 2026-10-20: *"When I add both the study area and street network to the Map, the study
        // area polygon does not show up."* It did not, because this value carried the network
        // alone: a map is single-MODE, and the mode that wins drops every other layer from the
        // value before any renderer sees it. The Inspector's own network preview has drawn the
        // area behind the streets since it existed, which is what made the omission visible.
        const drawnArea=inputs.area as {boundary?:unknown;bounds?:unknown}|undefined;

        // AND THE POINTS ARE DRAWN WITH THEM. The practitioner, 2026-10-22: *"The map output does
        // not show health facilities layer despite the widget being connected to map input. Only
        // the street network layer shows up on the map."* This is the same defect as the study
        // area's, reported 2026-10-20 and fixed by adding `boundary` to the object below and
        // nothing else: `rows:[]` went on throwing away every point layer before a renderer saw
        // one, so the Leaflet layer control offered two layers for three wired ports and the
        // review counts above the map all read zero.
        //
        // The note at `drawnMode` excuses a lost layer on the grounds that no renderer draws
        // both. That is true of polygons and a raster. It is NOT true here: mountCatchmentMap
        // draws the street network and the point layers into one map, and has since it existed.
        // So when points are wired the map is built as the spatial map it is, and the network
        // joins it as a layer rather than replacing it.
        const wiredLayers=pointInputs().layers;
        if(wiredLayers.length&&inputs.area){
          const mapped=mapOutput(node,{area:inputs.area,points:pointInputs()},runId);
          value={...mapped.value,network:structuredClone(network),
            // AND THE RASTER IS DRAWN WITH THEM. Third instance of one defect: the study area was
            // dropped here on 2026-10-20, the facilities on 2026-10-22, and the raster until
            // 2026-10-23, each because the winning mode threw away every other wired layer.
            ...(inputs.raster?{raster:inputs.raster}:{})} as unknown as DisplayValue;
          if(mapped.receipt){
            // One receipt for one node: the network's own counts are asserted onto the map view
            // the points receipt already describes, rather than a second receipt the reader of
            // `receipts.find(nodeId)` would never reach.
            mapped.receipt.facts+=`<urn:fieldwork:run:${runId}:map:${node.id}> `
              +`prov:used <urn:fieldwork:run:${runId}:output:${source}>; `
              +`fw:networkJunctionCount ${network.nodes.length}; `
              +`fw:networkSegmentCount ${network.edges.length}.\n`;
            mapped.receipt.input=mapped.receipt.facts;
            mapped.receipt.method=`${mapped.receipt.method} The street network is drawn as itself; `
              +'no routing, no simplification and no new inference.';
            receipts.push(mapped.receipt);
          }
          break;
        }
        value={kind:'network-map',network:structuredClone(network),
          ...(drawnArea?.boundary?{boundary:structuredClone(drawnArea.boundary),bounds:drawnArea.bounds}:{}),
          // The raster is ground, and ground survives whichever mode won. Patching only the
          // branch above left this one still dropping it, which is the same mistake in miniature:
          // a layer is carried where somebody remembered to carry it.
          ...(inputs.raster?{raster:inputs.raster}:{}),
          rows:[],centers:[]} as unknown as DisplayValue;
        const activity=`<urn:fieldwork:run:${runId}:map:${node.id}>`;
        const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'
          +`${activity} a fw:MapView, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>; `
          +(workflow.edges.find(e=>e.to===node.id&&e.port==='area')
            ?`prov:used <urn:fieldwork:run:${runId}:output:${workflow.edges.find(e=>e.to===node.id&&e.port==='area')!.from}>; `:'')
          +`fw:networkJunctionCount ${network.nodes.length}; fw:networkSegmentCount ${network.edges.length}.\n`
          +`<urn:fieldwork:run:${runId}:output:${node.id}> a prov:Entity; prov:wasGeneratedBy ${activity}.\n`;
        receipts.push({nodeId:node.id,kind:'presentation',facts,input:facts,rules:'',conclusions:[],
          method:'Draw the downloaded street graph as itself; no routing, no simplification and no new inference.'});
        break;}
      if(mode==='polygons'){value=polygonDisplay(inputs.polygons,'map');(value as DisplayValue).polygonPresentation=node.params.presentation||'plot';if(node.params.contextPoints)(value as DisplayValue).contextPoints=(inputs as unknown as {context:PointCollection}).context;receipts.push(polygonPresentationReceipt(node,workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='context')?.from));break;}if(mode==='raster'){const source=workflow.edges.find(e=>e.to===node.id&&e.port==='raster')!.from;
        // THE SAME FIX THE NETWORK BRANCH ABOVE ALREADY HAS. `rows:[]` threw away every point
        // layer wired beside the raster before a renderer could see one, so the map drew cells
        // alone and the layer list under it had nothing to list. The network branch learned this
        // on 2026-10-22 and this one was left; a layer is carried where somebody remembered to
        // carry it. When points are wired the map is built as the spatial map it is, and the
        // raster joins it as ground.
        const rasterLayers=pointInputs().layers;
        if(rasterLayers.length&&inputs.area){
          const mapped=mapOutput(node,{area:inputs.area,points:pointInputs()},runId);
          value={...mapped.value,raster:inputs.raster} as unknown as DisplayValue;
          if(mapped.receipt){
            mapped.receipt.facts+=`<urn:fieldwork:run:${runId}:map:${node.id}> `
              +`prov:used <urn:fieldwork:run:${runId}:output:${source}>.\n`;
            mapped.receipt.input=mapped.receipt.facts;
            mapped.receipt.method=`${mapped.receipt.method} The raster is drawn as ground beneath `
              +'the layers wired beside it; no resampling and no new inference.';
            receipts.push(mapped.receipt);
          }
          break;
        }
        const shown=decisionPresentation(node,{kind:'raster-map',raster:inputs.raster,boundary:inputs.raster.boundary,rows:[],centers:[]},source,runId);value=shown.value;receipts.push(shown.receipt);break;}if(mode==='decisions'){const shown=decisionPresentation(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}// A MAP OF POINTS NEEDS SOMETHING TO PUT THEM ON. The relation every row carries -- inside,
        // on the boundary, outside -- is a relation TO the study area, so without one there is no
        // map to draw and `mapOutput` read `boundary` off nothing: "Cannot read properties of
        // undefined (reading 'boundary')", reported 2026-10-21 on a Map wired to a deduplication
        // and nothing else. A refusal that names the node and the port is the least this owes.
        if(!inputs.area)throw new Error(`Connect a study area to "${node.params.label||node.id}". `
          +`A Map places its points by their relation to an area -- inside it, on its boundary, or `
          +`outside -- so points alone have nothing to be placed against. The same Study area the `
          +`rest of this workflow uses will do.`);
        const mapped=mapOutput(node,{area:inputs.area,points:pointInputs()},runId);value=mapped.value;if(mapped.receipt)receipts.push(mapped.receipt);break;}
      case 'table_output':{if(node.params.inputMode==='table'){value={...structuredClone(inputs.table),centers:[],pointTable:true} as unknown as DisplayValue;const viewFacts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n<urn:fieldwork:run:${runId}:view:${node.id}> a fw:TableView, prov:Activity; prov:used <urn:fieldwork:run:${runId}:table:${workflow.edges.find(e=>e.to===node.id&&e.port==='table')!.from}>.\n`;receipts.push({nodeId:node.id,kind:'presentation',facts:viewFacts,rules:'',input:viewFacts,conclusions:[]});break;}if(node.params.inputMode==='polygons'){value=polygonDisplay(inputs.polygons,'table');receipts.push(polygonPresentationReceipt(node,workflow.edges.find(e=>e.to===node.id&&e.port==='polygons')!.from,runId,workflow.edges.find(e=>e.to===node.id&&e.port==='context')?.from));break;}if(node.params.inputMode==='decisions'){const shown=decisionPresentation(node,inputs.decisions,workflow.edges.find(e=>e.to===node.id&&e.port==='decisions')!.from,runId);value=shown.value;receipts.push(shown.receipt);break;}const table=tableOutput(node,{points:pointInputs()},runId);value=table.value;receipts.push(table.receipt);break;}
      case 'measure_area':{const computed=measureArea(node,inputs.area,runId);value=computed.value;receipts.push(computed.receipt);break;}
      case 'study_area':{
        if(node.params.source!=='drawn'){value={...await executeOldNode(node,inputs,reasoner,receipts,distanceKm,runId),areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,label:node.params.label||'Old Naledi',rows:[],centers:[]};break;}
        const n3=studyAreaN3(node),conclusions=await reasoner(n3.input);
        const ready=conclusions.some(q=>q.subject===`urn:fieldwork:area:${node.id}`&&q.predicate===NS+'readyForSpatialAnalysis'&&q.object==='true');
        if(!ready)throw new Error('The reasoner did not confirm the study-area input contract.');
        receipts.push({nodeId:node.id,...n3,conclusions});
        value={kind:'study-area',areaId:`urn:fieldwork:area:${node.id}`,geometryId:`urn:fieldwork:geometry:${node.id}`,boundary:structuredClone(node.params.geometry),...(node.params.boundary?.units?.length?{units:structuredClone(node.params.boundary.units)}:{}),bounds:geometryBounds(node.params.geometry!),label:node.params.label,selectionMode:node.params.selectionMode,ready,rows:[],centers:[],source:'User-drawn geometry in CRS84'};break;
      }
      default:value=await executeOldNode(node,inputs,reasoner,receipts,distanceKm,runId);
    }
    if(node.type==='study_area'&&isRecord(value))value.spatialReference=structuredClone(node.params.spatialReference);
    values.set(node.id,value);trace.push({nodeId:node.id,type:node.type,milliseconds:performance.now()-begin});
    // WHEN THIS STEP RAN, in the receipt, in PROV's own terms.
    //
    // The practitioner, 2026-10-23, on measuring the work a project holds: *"compute time in the
    // measure queryable from receipts"*, and then *"perhaps timestamp is better?"* It is. A
    // duration is a number a reader has to trust; two timestamps let the question be asked --
    // what ran since my last export, and how long did it take -- and the duration is still there
    // by subtraction. prov:startedAtTime and prov:endedAtTime are the terms PROV already has, so
    // nothing new is coined for a thing the standard names.
    //
    // Until now the cost of a run lived only in `trace`, in memory, and was lost on reload.
    const timed=receipts.find(r=>r.nodeId===node.id);
    if(timed)timed.facts+=`<urn:fieldwork:run:${runId}:step:${node.id}> `
      +`prov:startedAtTime "${beganAt}"^^<http://www.w3.org/2001/XMLSchema#dateTime>; `
      +`prov:endedAtTime "${new Date().toISOString()}"^^<http://www.w3.org/2001/XMLSchema#dateTime>.\n`;
    onProgress(node.id,'done');
  }
  const outputNodes=resultNodes({nodes:plan});
  const display=(id:string)=>required(values.get(id)) as DisplayValue;
  const outputs:Output[]=outputNodes.length?outputNodes.flatMap((n):Output[]=>{
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
  // Findings the run made that no output tab states, carried per node. `unconnectedSites` reads
  // any value, so this does not need to know which widgets report omissions.
  const alerts:WorkflowRun['alerts']=plan.flatMap(node=>{
    const value=values.get(node.id),unconnected=unconnectedSites(value),offNetwork=offNetworkSites(value);
    const gaps=declarationGaps(value),dataIssues=dataIssuesOf(value,node.id);
    return unconnected.length||offNetwork.length||gaps.length||dataIssues.length
      ?[{nodeId:node.id,unconnected,offNetwork,...(gaps.length?{gaps}:{}),
         ...(dataIssues.length?{dataIssues}:{})}]:[];
  });
  return {...provenance,alerts,outputs,trace,receipts,runId,engine:'EYE-JS 21.1.24 (WASM)',runAt:new Date().toISOString(),
    ...(Object.keys(linkages).length?{linkages}:{})};
}
