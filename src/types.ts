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
/** The frame of a value that has been projected to metres mid-workflow. Deliberately NOT allowed
 *  in a saved node's params: `validateSpatialReference` still accepts the geographic one only, so
 *  a hand-edited workflow cannot declare its points projected and have the application believe it.
 *  A projected frame is produced by `reproject` at run time, on the value, where the coordinates
 *  that match the label were computed in the same step that wrote it. */
export interface ProjectedReference {datum:'WGS84'; geodeticCRS:'EPSG:4326'; geometryCRS:string; axisOrder:'easting-northing'; units:'metre'}
export type AnySpatialReference = SpatialReference | ProjectedReference;
export const isProjectedReference=(reference:AnySpatialReference|undefined):reference is ProjectedReference=>reference?.units==='metre';
export interface PointLayer extends PointCollection {sourceNodeId:string; label?:string; spatialReference?:AnySpatialReference; attributeDefinitions?:AttributeDefinition[]}
export type PointInput = PointLayer | {layers:PointLayer[]};
export interface SourceInfo {format:string; [key:string]:unknown}
export interface PointParams {label:string; data:PointCollection; spatialReference?:SpatialReference}
/** A column read as a different kind than the file held it, because a practitioner asked.
 *
 *  Experiment 117. The repair changes the records this node carries, so it is recorded on the
 *  node and stated in the run evidence. A workflow whose data has been altered and does not say
 *  so is the thing this application exists not to produce -- and the alteration is the same
 *  class of act as a unit conversion, which this project refuses to do silently. */
export interface ColumnRepair {column:string; to:'number'|'boolean'|'term'; cast:number; unreadable:string[]; at:string}
export interface ObservationParams extends PointParams {fields?:FormField[]; attributeRules?:AttributeDefinition[]; sourceInfo?:SourceInfo; pinIdStrategy?:'uuid'|'sequential'; repairs?:ColumnRepair[]}
/** One committed extent of a study area: the shape, how it was drawn, and when it was kept. */
export interface AreaRevision {at:string; geometry:Polygon; selectionMode:'bbox'|'polygon'|'circle'; restoredFrom?:number}

/** `revisions` is every extent this area has had, oldest first, the last being the current one.
 *
 *  A study area is not permanent -- the practitioner, 2026-10-17: *"it can be revisited and
 *  expanded"*, and experiment 01 has a step called "Correct, save, and revisit". But its IRI is
 *  node-scoped, `urn:fieldwork:area:<id>`, unlike every other area in this application, which
 *  mints per run. So a redrawn boundary kept the same identifier with different geometry, and two
 *  runs either side of a revision asserted one entity with two conflicting shapes and nothing
 *  saying it had changed.
 *
 *  One entry means the original. More means the area was revised, and the receipt can then answer
 *  the practitioner's two questions -- did we revise our study area, and when -- in PROV rather
 *  than in new vocabulary.
 *
 *  The GEOMETRY is kept, not only the date, because the practitioner asked for the versions to be
 *  selectable: *"so investigators can go back to previous assumptions"*. Restoring one does not
 *  rewrite the history -- it appends a new entry carrying the old shape and `restoredFrom`, so the
 *  record says "on this date we went back to the extent of that date" rather than quietly
 *  shortening the chain. An investigation that narrowed its area and then widened it again is
 *  exactly the emergent-strategy case this project means to keep. */
export type AreaParams = {source:'drawn'; label:string; selectionMode:'bbox'|'polygon'|'circle'; geometry:Polygon|null; spatialReference?:SpatialReference} & {revisions?:AreaRevision[]} | {source?:undefined; geometry?:never; selectionMode?:never; dataset:string; label?:string; spatialReference?:SpatialReference};
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
  /** `zone`, `hemisphere` and `maxSnapM` are OPTIONAL: they are needed only for origins this
   *  step has to attach to the network itself. Points arriving already snapped are used as
   *  they arrive and nothing is projected, so a run that never attaches anything never needs
   *  a zone. Refused at run time when an unattached origin turns up, not at edit time. */
  reachable_nodes:{label:string;minutes:number;speedMPerMin:number;direction:'outbound'|'inbound';travelMode:'walking'|'cycling'|'driving'|'other';zone?:number;hemisphere?:'north'|'south';maxSnapM?:number};
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
  /** `ruleset` is OPTIONAL because the palette offers one rule-application widget and the
   *  practitioner says what it should apply, from 2026-10-14. A node can therefore exist before
   *  it has been told anything, exactly as a drawn study area exists before its boundary is
   *  drawn; `executionPlan` refuses to run it by name. The alternative was a palette entry per
   *  ruleset, which grew with every ruleset and again with every version of one. */
  apply_ruleset:{label:string;
    ruleset?:{id:string;version:string;title:string;
      inputs:[string,PortType][];output:PortType};
    parameters:Record<string,number>;
    /** Rules the practitioner wrote, rather than a bundled ruleset chosen from a list.
     *
     *  Experiment 106's authored form, carried on the node the way a composition is: the node
     *  holds what it applies, so a saved workflow opens and runs without the rules having to
     *  exist anywhere else. When this is present it is what runs, and `ruleset` is the pin that
     *  gives the node its ports.
     *
     *  `fields` is what makes a generic ruleset possible at all: it says which attribute of a
     *  record means which predicate in the rules. Nothing is guessed from a column name. */
    authored?:{
      title:string;
      /** What the rules must not be read as -- required of a bundled ruleset, required here. */
      mustNotBeReadAs:string;
      /** A numeric field must declare the unit it is measured in, as a QUDT IRI -- the same
       *  vocabulary the published rulesets use. Not optional: a number without a unit is not a
       *  measurement, and a rule comparing one to another is comparing two numbers and hoping. */
      fields:{attribute:string;predicate:string;kind:'number'|'boolean'|'term';label?:string;
        unit?:string;unitLabel?:string}[];
      /** The numbers a practitioner can change without rewriting a rule. Declared by the authored
       *  ruleset itself rather than borrowed from a bundled one: a step whose rules use no
       *  parameter declares none, and binding then has nothing to insist on. */
      parameters?:{name:string;meaning:string;unit?:string;unitLabel?:string;
        min?:number;max?:number;decimals?:number}[];
      /** A value is a literal, or `{setting:'threshold'}` -- a reference to one of the parameters
       *  above. The compiler turns that reference into the `{{threshold}}` placeholder the
       *  compiled rules carry, so the template syntax exists only in rule TEXT and never in the
       *  form a practitioner edits. A `'{{threshold}}'` string is still read, because rules
       *  authored before 2026-10-15 hold one. */
      rules:{any:{all:{field:string;comparator:string;value:string|number|boolean|{setting:string}}[]}[];
        then:{predicate:string;value:string}[]}[];
    }};
  micro_workflow:{label:string;
    composition:{id:string;nodeType:string;version:string;title:string;stage:string;
      inputs:[string,PortType][];output:PortType};
    parameters:Record<string,string|number|boolean>};
  summarize_hull:{label:string;zone:number;hemisphere:'north'|'south'};
  find_health_facilities:{label:string;source:'openstreetmap-live'|'hdx-hot-export'|'overture-places';kinds:string[];requireName:boolean;country:string;minConfidence:number;data:PointCollection|null;retrieved:{source:'openstreetmap-live'|'hdx-hot-export'|'overture-places';sourceLabel:string;licence:string;licenceIRI:string;sourceIRI:string;attribution:string;origin:string;kept:number;dropped:{kind:number;coordinates:number;name:number};at:string;scope:string;filename?:string;sha256?:string;bytes?:number;release?:string;belowConfidence?:number;unmappedCategory?:number;minConfidence?:number}|null};
  buffer_point:{label:string;pointId:string;distanceM:number};
  sample_raster:{label:string;attribute:string;valueUnit:string};
  slr_extract_import:{label:string;datasetIRI:string;datasetVersion:string;baselinePeriod:string;citations:string[];basisKind:''|'workflow'|'confidence-pbox';familyValues:{withVerticalLandMotion:string;withoutVerticalLandMotion:string};sourceNote?:string};
  slr_site_assignment:{label:string};
  slr_threshold_comparison:{label:string;scenario:string;basis:string;family:string;year:string;quantile:string;elevationField:string;verticalDatum:string;elevationReference:''|'baseline-sea-surface'|'other-datum'};
  // From 2026-10-13 a transform, not a source: it takes points and returns points. `data`, `source`
  // and `provenance` remain OPTIONAL so a workflow saved before that date still parses; they are
  // the discriminator the migration reads, and nothing writes them any more.
  reproject:{label:string;zone:number;hemisphere:'north'|'south';data?:PointCollection;spatialReference?:SpatialReference;source?:import('./reproject.js').ReprojectSource;provenance?:import('./reproject.js').ReprojectProvenance};
  /** `maxNodes` is the graph ceiling, a knob rather than a fixed cap: the contract does not move
   *  with it (ports, output port type and behaviour are unchanged, only what is admitted changes) and
   *  the failure it guards is contained, because isochrone runs in a Worker with a timeout. 2,000 is
   *  the measured default; above about 3,000 is untested. */
  /** `pauseSeconds` is the minimum wait this practitioner wants between OSM requests. It can only
   *  raise the pause: the module takes the longest of the 60-second floor, the volume a response
   *  actually cost, and this. Being more respectful of a public service is always permitted;
   *  being less is not. */
  network_input:{label:string;data:import('./catchments.js').Network;inputMethod?:'osm'|'file';marginM?:number;maxNodes?:number;pauseSeconds?:number};
  voronoi:{label:string;zone:number;hemisphere:'north'|'south'};
  isochrone:{label:string;zone:number;hemisphere:'north'|'south';minutes:number;thresholds?:number[];fillHoles?:boolean;speedMPerMin:number;bufferM:number;maxSnapM:number;direction:'inbound'|'outbound'};
  clip_polygons:{label:string};
  summarize_polygons:{label:string;boundary:'include'|'exclude';valueField:string};
  raster_input:{label:string;asset?:import('./raster.js').RasterAsset};
  clip_raster:{label:string;method:'cell-center'|'all-touched';marginPixels?:number;cutline?:{geometry:Polygon;selectionMode:'bbox'|'polygon'|'circle'}};
  places:PointParams; centers:PointParams; point_input:ObservationParams; study_area:AreaParams;
  alert:{active:boolean|null; date:string};
  // The unit is a knob because baking one in is how three widgets came to implement one
  // operation: `nearest` returned kilometres, `slr_site_assignment` metres, `access` minutes.
  // Metres and kilometres are the same measurement stated differently; minutes needs a speed and
  // stays with `access`. The unit travels on the output, because a distance without its unit is
  // not interpretable and `policy` compares it against a threshold.
  /** `candidateFilter` narrows which candidates the search considers, by their own attributes.
   *
   *  A knob rather than a widget, by the test experiment 107 derived: a knob is honest when the
   *  contract does not move with it. This leaves both ports and the output port type untouched and
   *  changes only which candidates are eligible, which is what a threshold does too. It is what
   *  `access` added over this widget, and holding it here means the exclusion and the search land
   *  in one receipt and cannot disagree about what was considered.
   *
   *  The comparators are `in` and `notIn` over a declared set, deliberately, and not an ordinal
   *  `>=`. Old Naledi asks for "evidence at least Contextual", which is an ordinal comparison on a
   *  categorical, and over a finite declared vocabulary that compiles to a set — `{Direct,
   *  Contextual}` — the same move by which OR compiles to one rule per disjunct. The authoring
   *  surface may offer "at least Contextual"; what is stored and executed is the set. */
  measure_distance:{unit:DistanceUnit; candidateFilter?:CandidateCondition[]};
  travel_time:{label:string; speedMPerMin:number};
  policy:{thresholdKm:number};
  measure_area:{unit:AreaUnit}; coverage_check:{exclusions:Exclusion[]; pointInputCount?:number};
  map_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'raster'|'polygons'|'network';presentation?:'plot'|'interactive';contextPoints?:boolean;mapTitle?:string;mapSubtitle?:string;mapSourceNote?:string;showLegend?:boolean;basemap?:'none'|'osm'|'topo'}; table_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'polygons'|'table'};
  chart_output:{label:string;inputMode?:'decisions'|'polygons'|'series';renderer?:'html'|'vega-lite';mark?:'bar'|'point';orientation?:'horizontal'|'vertical';chartTitle?:string;subtitle?:string;xAxisTitle?:string;yAxisTitle?:string;colorByCategory?:boolean;sourceNote?:string;bandMeasure?:'cumulative'|'difference'};
  output:{label?:string; view:'map'|'table'|'bars'};
  facilities:{dataset:string; radiusKm:number; sourceMode?:'connected'}; point_grid:{spacingM:number};
  xpert:Record<string,never>; facility_audit:Record<string,never>;
  access:{minimumEvidence:'direct'|'contextual'|'inferential'; service:'onsite'|'anyKnown'; speedMPerMin:number};
  access_policy:{thresholdMin:number};
}
export type NodeType = keyof ParamsByType;
export type NodeSpec<K extends NodeType = NodeType> = {[T in K]:{type:T; params:ParamsByType[T] & {label?:string}}}[K];
/** The node types a saved workflow may still name and no canvas may still hold. A retired widget
 *  never runs, so loading one is a rewrite that must say so, or a refusal that names it. */
export type RetiredNodeType='places'|'centers'|'output'|'policy'|'access_policy'|'xpert';
/** A node type that still exists but whose contract changed, so a node saved under the old one is
 *  migrated to a different type. `reproject` was a Source holding an imported file; from
 *  2026-10-13 it is a points-to-points transform, and the saved nodes become the `point_input`
 *  they effectively were. Distinct from retirement, where the type is gone, and from a rename,
 *  where the contract is the same under a new name. */
export type RecontractedNodeType='reproject';

/** Node types that were renamed rather than retired: the operation is unchanged and the old
 *  identifier keeps resolving, so a saved workflow opens and runs. Distinct from a retirement,
 *  which refuses. Each entry is a public identifier that can never be removed, only kept
 *  resolving -- which is why the naming convention treats a name as a commitment made at D1 time
 *  and not a label adjusted later. */
export type RenamedNodeType='samples'|'nearest'|'observations'|'area';
export const RENAMED_NODE_TYPES:Record<RenamedNodeType,NodeType>={samples:'point_grid',nearest:'measure_distance',observations:'point_input',area:'study_area'};

export type WorkflowNode<K extends NodeType = NodeType> = NodeSpec<K> & {id:string; x:number; y:number; references?:EvidenceReference[]; sourceMigration?:{fromType:RetiredNodeType|RenamedNodeType|RecontractedNodeType; version:'1'}};
export interface WorkflowEdge {id:string; from:string; to:string; port:string}
export interface Workflow {schema:'fieldwork/workflow/1'; name:string; exampleId?:'blank'|'coverage'|'old-naledi'|'raster'|'snow-voronoi'|'snow-isochrone'|'snow-geoprivacy'|'snow-extent'|'sea-level'|'rulesets'; nodes:WorkflowNode[]; edges:WorkflowEdge[]; outputId?:string; manifest?:import('./project-manifest.js').ProjectManifest}
// 'samples' was removed on 2026-10-12: it sat in this union and nowhere else, produced by
// nothing and consumed by nothing. Found by surveying the inventory sideways
// (docs/experiments/105-five-directions.md), and removed rather than counted, because a closed
// union with a dead member is a contract that claims a port type the application does not have.
export type DistanceUnit = 'metres'|'kilometres';
/** One condition on a candidate's own attributes. The same shape as the rule builder's authored
 *  condition (experiment 106), pointed at selection rather than at classification — a third caller
 *  for that form, after classification and the role binding experiment 61 proposes. */
export interface CandidateCondition {field:string; comparator:'in'|'notIn'; values:Scalar[]}
export type PortType = 'points'|'table'|'alert'|'distances'|'decisions'|'area'|'facilities'|'gradedFacilities'|'access'|'coverage-check'|'raster'|'polygons'|'network'|'mean-center'|'point-comparison';
export interface NodeDefinition {title:string; group:string; icon:string; color:string; description:string; inputs:[string,PortType][]; output:PortType|null}
export type Escape = (value:unknown)=>string;
export type SpatialRelation = 'Inside'|'Boundary'|'Outside'|'MissingLocation';
