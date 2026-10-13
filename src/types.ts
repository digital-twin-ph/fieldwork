import type {EvidenceReference} from './evidence.js';
import type {Polygon, MultiPolygon, Point, Position} from 'geojson';
export type {Polygon, Position};
export type Boundary = Polygon | MultiPolygon;
export type Bounds = [number, number, number, number];
export type Scalar = string | number | boolean | null;
export type AttributeType = 'text' | 'number' | 'integer' | 'boolean' | 'date';
export interface AttributeDefinition {key:string; type:AttributeType; allowedValues?:Scalar[]; defaultValue?:Scalar; label?:string}
export interface FormField extends AttributeDefinition {label:string}
export interface PointFeature {type:'Feature'; id:string; properties:Record<string,Scalar> & {name:string}; geometry:Point|null}
export interface PointCollection {type:'FeatureCollection'; features:PointFeature[]}
export interface SpatialReference {datum:'WGS84'; geodeticCRS:'EPSG:4326'; geometryCRS:'OGC:CRS84'; axisOrder:'longitude-latitude'; units:'degree'}
export interface PointLayer extends PointCollection {sourceNodeId:string; label?:string; spatialReference?:SpatialReference; attributeDefinitions?:AttributeDefinition[]}
export type PointInput = PointLayer | {layers:PointLayer[]};
export interface SourceInfo {format:string; [key:string]:unknown}
export interface PointParams {label:string; data:PointCollection; spatialReference?:SpatialReference}
export interface ObservationParams extends PointParams {fields?:FormField[]; attributeRules?:AttributeDefinition[]; sourceInfo?:SourceInfo; pinIdStrategy?:'uuid'|'sequential'}
export type AreaParams = {source:'drawn'; label:string; selectionMode:'bbox'|'polygon'|'circle'; geometry:Polygon|null; spatialReference?:SpatialReference} | {source?:undefined; geometry?:never; selectionMode?:never; dataset:string; label?:string; spatialReference?:SpatialReference};
export interface Exclusion {sourceNodeId:string; featureId:string; signature:string; reason:string}
export type AreaUnit = 'm2'|'km2'|'ha'|'ft2'|'acre'|'mi2';
export interface Measurement {squareMetres:number; value:number; unit:AreaUnit; method:string}
export interface ParamsByType {
  mean_center:{label:string;zone:number;hemisphere:'north'|'south'};
  compare_point_sets:{label:string;zone:number;hemisphere:'north'|'south';centers?:boolean};
  comparison_map:{label:string};
  donut_geomask:{label:string;innerM:number;outerM:number;seed:number};
  hex_aggregate:{label:string;resolution:number;minOccupancy:number};
  buffer_area:{label:string;distanceM:number};
  table_input:{label:string;keys:string[];valueField:string;unit?:string;data:import('./data-table.js').DataTable;source?:import('./data-table.js').DataTableSource};
  rate:{label:string;numeratorField:string;denominatorField:string;groupBy?:string;bandWidth?:number;denominatorUnit:import('./rate.js').DenominatorUnit;rateKind:import('./rate.js').RateKind;multiplier:number;minimumDenominator:number;numeratorPeriod:string;denominatorVintage:string};
  case_series:{label:string;source?:'points'|'table';dateField:string;dateKind:import('./case-series.js').DateKind;period:import('./case-series.js').Period;weightField?:string};
  summarize_combined_area:{label:string;zone:number;hemisphere:'north'|'south'};
  snap_to_network:{label:string;zone:number;hemisphere:'north'|'south';maxSnapM:number};
  reachable_nodes:{label:string;minutes:number;speedMPerMin:number;direction:'outbound'|'inbound';travelMode:'walking'|'cycling'|'driving'|'other'};
  reachable_corridor:{label:string;bufferM:number;zone:number;hemisphere:'north'|'south'};
  travel_time_band:{label:string;minutes:number};
  stack_polygons:{label:string};
  fill_interior_gaps:{label:string};
  /** A composition used as one step. The contract is pinned in the node -- ports, output
   *  type, version -- so a saved workflow validates and reports drift without the
   *  composition file being present, and `parameters` holds the public values it was run
   *  with. The first thing in a saved workflow to record a version. */
  /** One widget for every declared ruleset. The ports are the ruleset's, pinned here rather than
   *  looked up, so a saved workflow validates without the ruleset file being present — the same
   *  reason a micro_workflow pins its composition's ports. */
  apply_ruleset:{label:string;
    ruleset:{id:string;version:string;title:string;
      inputs:[string,PortType][];output:PortType};
    parameters:Record<string,number>};
  micro_workflow:{label:string;
    composition:{id:string;nodeType:string;version:string;title:string;stage:string;
      inputs:[string,PortType][];output:PortType};
    parameters:Record<string,string|number|boolean>};
  summarize_hull:{label:string;zone:number;hemisphere:'north'|'south'};
  find_health_facilities:{label:string;source:'openstreetmap-live'|'hdx-hot-export'|'overture-places';kinds:string[];requireName:boolean;country:string;minConfidence:number;data:PointCollection|null;retrieved:{source:'openstreetmap-live'|'hdx-hot-export'|'overture-places';sourceLabel:string;licence:string;licenceIRI:string;sourceIRI:string;attribution:string;origin:string;kept:number;dropped:{kind:number;coordinates:number;name:number};at:string;scope:string;filename?:string;sha256?:string;bytes?:number;release?:string;belowConfidence?:number;unmappedCategory?:number;minConfidence?:number}|null};
  buffer_point:{label:string;pointId:string;distanceM:number};
  sample_raster:{label:string;attribute:string;valueUnit:string};
  slr_extract_import:{label:string;datasetIRI:string;datasetVersion:string;baselinePeriod:string;citations:string[];basisKind:''|'workflow'|'confidence-pbox';familyValues:{withVerticalLandMotion:string;withoutVerticalLandMotion:string}};
  slr_site_assignment:{label:string};
  slr_threshold_comparison:{label:string;scenario:string;basis:string;family:string;year:string;quantile:string;elevationField:string;verticalDatum:string;elevationReference:''|'baseline-sea-surface'|'other-datum'};
  reproject:{label:string;zone:number;hemisphere:'north'|'south';data:PointCollection;spatialReference?:SpatialReference;source?:import('./reproject.js').ReprojectSource;provenance?:import('./reproject.js').ReprojectProvenance};
  network_input:{label:string;data:import('./catchments.js').Network;inputMethod?:'osm'|'file';marginM?:number};
  voronoi:{label:string;zone:number;hemisphere:'north'|'south'};
  isochrone:{label:string;zone:number;hemisphere:'north'|'south';minutes:number;thresholds?:number[];fillHoles?:boolean;speedMPerMin:number;bufferM:number;maxSnapM:number;direction:'inbound'|'outbound'};
  clip_polygons:{label:string};
  summarize_polygons:{label:string;boundary:'include'|'exclude';valueField:string};
  raster_input:{label:string;asset?:import('./raster.js').RasterAsset};
  clip_raster:{label:string;method:'cell-center'|'all-touched';marginPixels?:number;cutline?:{geometry:Polygon;selectionMode:'bbox'|'polygon'|'circle'}};
  places:PointParams; centers:PointParams; observations:ObservationParams; area:AreaParams;
  alert:{active:boolean|null; date:string};
  // The unit is a knob because baking one in is how three widgets came to implement one
  // operation: `nearest` returned kilometres, `slr_site_assignment` metres, `access` minutes.
  // Metres and kilometres are the same measurement stated differently; minutes needs a speed and
  // stays with `access`. The unit travels on the output, because a distance without its unit is
  // not interpretable and `policy` compares it against a threshold.
  /** `candidateFilter` narrows which candidates the search considers, by their own attributes.
   *
   *  A knob rather than a widget, by the test experiment 107 derived: a knob is honest when the
   *  contract does not move with it. This leaves both ports and the output carrier untouched and
   *  changes only which candidates are eligible, which is what a threshold does too. It is what
   *  `access` added over this widget, and holding it here means the exclusion and the search land
   *  in one receipt and cannot disagree about what was considered.
   *
   *  The comparators are `in` and `notIn` over a declared set, deliberately, and not an ordinal
   *  `>=`. Old Naledi asks for "evidence at least Contextual", which is an ordinal comparison on a
   *  categorical, and over a finite declared vocabulary that compiles to a set — `{Direct,
   *  Contextual}` — the same move by which OR compiles to one rule per disjunct. The authoring
   *  surface may offer "at least Contextual"; what is stored and executed is the set. */
  nearest:{unit:DistanceUnit; candidateFilter?:CandidateCondition[]};
  policy:{thresholdKm:number};
  measure_area:{unit:AreaUnit}; coverage_check:{exclusions:Exclusion[]; pointInputCount?:number};
  map_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'raster'|'polygons';presentation?:'plot'|'interactive';contextPoints?:boolean;mapTitle?:string;mapSubtitle?:string;mapSourceNote?:string;showLegend?:boolean;basemap?:'none'|'osm'|'topo'}; table_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'polygons'|'table'};
  chart_output:{label:string;inputMode?:'decisions'|'polygons'|'series';renderer?:'html'|'vega-lite';mark?:'bar'|'point';orientation?:'horizontal'|'vertical';chartTitle?:string;subtitle?:string;xAxisTitle?:string;yAxisTitle?:string;colorByCategory?:boolean;sourceNote?:string;bandMeasure?:'cumulative'|'difference'};
  output:{label?:string; view:'map'|'table'|'bars'};
  facilities:{dataset:string; radiusKm:number; sourceMode?:'connected'}; samples:{spacingM:number};
  xpert:Record<string,never>; facility_audit:Record<string,never>;
  access:{minimumEvidence:'direct'|'contextual'|'inferential'; service:'onsite'|'anyKnown'; speedMPerMin:number};
  access_policy:{thresholdMin:number};
}
export type NodeType = keyof ParamsByType;
export type NodeSpec<K extends NodeType = NodeType> = {[T in K]:{type:T; params:ParamsByType[T] & {label?:string}}}[K];
/** The node types a saved workflow may still name and no canvas may still hold. A retired widget
 *  never runs, so loading one is a rewrite that must say so, or a refusal that names it. */
export type RetiredNodeType='places'|'centers'|'output'|'policy'|'access_policy'|'xpert';

export type WorkflowNode<K extends NodeType = NodeType> = NodeSpec<K> & {id:string; x:number; y:number; references?:EvidenceReference[]; sourceMigration?:{fromType:RetiredNodeType; version:'1'}};
export interface WorkflowEdge {id:string; from:string; to:string; port:string}
export interface Workflow {schema:'fieldwork/workflow/1'; name:string; exampleId?:'blank'|'coverage'|'old-naledi'|'raster'|'snow-voronoi'|'snow-isochrone'|'snow-geoprivacy'|'sea-level'; nodes:WorkflowNode[]; edges:WorkflowEdge[]; outputId?:string; manifest?:import('./project-manifest.js').ProjectManifest}
// 'samples' was removed on 2026-10-12: it sat in this union and nowhere else, produced by
// nothing and consumed by nothing. Found by surveying the inventory sideways
// (docs/experiments/105-five-directions.md), and removed rather than counted, because a closed
// union with a dead member is a contract that claims a carrier the application does not have.
export type DistanceUnit = 'metres'|'kilometres';
/** One condition on a candidate's own attributes. The same shape as the rule builder's authored
 *  condition (experiment 106), pointed at selection rather than at classification — a third caller
 *  for that form, after classification and the role binding experiment 61 proposes. */
export interface CandidateCondition {field:string; comparator:'in'|'notIn'; values:Scalar[]}
export type PortType = 'points'|'table'|'alert'|'distances'|'decisions'|'area'|'facilities'|'gradedFacilities'|'access'|'coverage-check'|'raster'|'polygons'|'network'|'mean-center'|'point-comparison';
export interface NodeDefinition {title:string; group:string; icon:string; color:string; description:string; inputs:[string,PortType][]; output:PortType|null}
export type Escape = (value:unknown)=>string;
export type SpatialRelation = 'Inside'|'Boundary'|'Outside'|'MissingLocation';
