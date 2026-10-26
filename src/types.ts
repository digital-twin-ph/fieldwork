import type {EvidenceReference} from './evidence.js';
import type {Polygon, MultiPolygon, Point, Position} from 'geojson';
export type {Polygon, Position};
export type Boundary = Polygon | MultiPolygon;
export type Bounds = [number, number, number, number];
export type Scalar = string | number | boolean | null;

/** Which basemap an interactive map draws under everything else.
 *
 *  Declared HERE and not in the renderer: a type-only import of `catchment-map.js` pulled that
 *  module into the worker compile, which has no DOM library, and the build refused it. The
 *  renderer imports this instead. The `ofm-` entries are OpenFreeMap vector styles and need
 *  MapLibre; the others are raster XYZ and need nothing beyond Leaflet. */
/** The values, as DATA, because three places had each written their own copy of this list and the
 *  shortest one decided what a practitioner could keep. On 2026-10-20 the validator still allowed
 *  only none, osm and topo, so choosing an OpenFreeMap style was refused and rolled back -- which
 *  is why the practitioner reported not having OpenFreeMap three days after it was built and
 *  drawing. The union is derived from this, the validator reads it, and the renderer owes every
 *  member a label by a Record type that will not compile if one is missing. */
export const BASEMAP_CHOICES=['none','osm','topo','ofm-liberty','ofm-positron','ofm-bright'] as const;
export type BasemapChoice=typeof BASEMAP_CHOICES[number];
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
/** `dataRef` is the digest of this node's payload, present when the payload is held once in the
 *  project's dataset store instead of inline in every workflow that uses it (experiment 122,
 *  phase two). It is written at the moment a practitioner reuses an input from a sibling workflow,
 *  and read only by the storage layer: a workflow in memory ALWAYS carries its `data`, hydrated
 *  before `validateWorkflow` sees it, so no widget, no execution path and no receipt knows the
 *  reference exists. Measured on the four 1854 cholera workflows: 131,552 bytes of the 401,576 in
 *  their input nodes were redundant copies, 263,104 against the double write.
 *
 *  Only the three ACQUIRED inputs carry it. `study_area` does not: a drawn boundary is a decision
 *  made per question, and the four cholera workflows hold three deliberately different Soho
 *  extents. See `SHAREABLE_INPUT_TYPES` in project.ts. */
export interface PointParams {label:string; data:PointCollection; dataRef?:string; spatialReference?:SpatialReference}
/** A column read as a different kind than the file held it, because a practitioner asked.
 *
 *  Experiment 117. The repair changes the records this node carries, so it is recorded on the
 *  node and stated in the run evidence. A workflow whose data has been altered and does not say
 *  so is the thing this application exists not to produce -- and the alteration is the same
 *  class of act as a unit conversion, which this project refuses to do silently. */
export interface ColumnRepair {column:string; to:'number'|'boolean'|'term'; cast:number; unreadable:string[]; at:string}
export interface ObservationParams extends PointParams {fields?:FormField[]; attributeRules?:AttributeDefinition[]; sourceInfo?:SourceInfo; pinIdStrategy?:'uuid'|'sequential'; repairs?:ColumnRepair[]}
/** One committed extent of a study area: the shape, how it was drawn, and when it was kept. */
/** Where an acquired boundary came from, carried so the receipt can say whose line it is.
 *
 *  The practitioner, 2026-10-18: *"The fact that a polygon when we add the provenance is a claim
 *  to authenticity straight from the source we should not even attempt to simplify it."* The
 *  claim runs both ways. Admitting a boundary unmodified is only half of it; a receipt that
 *  cannot name the authority behind the line makes an unattributable claim. geoBoundaries gives
 *  the licence AND `boundarySource` -- the licence states the terms of reuse, the source states
 *  who drew it, and for a contested frontier only the second one answers anything.
 */
export interface BoundaryProvenance {
  /** The level's content-keyed identifier, e.g. COD-ADM2-63176286. */
  boundaryID:string;
  /** The unit's own identifier and name within that level. With several units these are joined,
   *  which is how they have always been written and how every reader of them still works. */
  unitID:string;
  unitName:string;
  /** EACH UNIT, STILL ITSELF. A54 asks to "select boundary members without forcing a union", and
   *  acquisition honours it -- `readUnits` keeps every unit whole and named. Application did not:
   *  several units became one MultiPolygon and one comma-joined `unitName`, so which ring was
   *  which stopped being recorded at the moment it entered the workflow. Nothing could then join
   *  a figure to a boundary, which is what a choropleth is.
   *
   *  The parts of `geometry` are in this order, so `units[i]` names part i. Optional because
   *  every study area saved before 2026-10-24 has none, and a boundary with one unit does not
   *  need it. */
  units?:{id:string;name:string}[];
  /** The authority that drew it, e.g. "Referenciel Geographique Commun, OCHA DR Congo". */
  source:string;
  licence:string;
  licenceSource:string;
  /** The year the boundary represents, which is not the year it was published. */
  yearRepresented:string;
  /** What kind of unit the level holds, e.g. "territory, city". */
  canonical:string;
  /** The file the geometry was read from, and when. */
  retrievedFrom:string;
  retrievedAt:string;
  /** Vertices as published. A receipt can be checked against this. */
  vertices:number;
  /** A fingerprint of the geometry AS PUBLISHED.
   *
   *  The practitioner, 2026-10-18: *"When the user chooses to modify a bounding box from a known
   *  source like geoBoundaries, that modification should show up in the N3 receipts."* Dragging a
   *  vertex, or replacing the outline with a box, makes the shape no longer the source's -- and a
   *  receipt still citing that source would be attributing our line to them. CC BY requires
   *  indicating that changes were made, so this is a licence obligation as much as an honesty
   *  one. Comparing the current geometry against this is how the receipt knows which it is. */
  publishedHash:string;
}

export interface AreaRevision {at:string; geometry:Boundary; selectionMode:'bbox'|'polygon'|'circle'; restoredFrom?:number}

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
/** `country` is the ISO3 this area is in, said once here rather than again in every widget that
 *  needs it. An acquired boundary states it in its own identifier and this is left unset; a
 *  polygon somebody drew states nothing, and then this is where they say it. */
export type AreaParams = {source:'drawn'; label:string; selectionMode:'bbox'|'polygon'|'circle'; geometry:Boundary|null; spatialReference?:SpatialReference; country?:string} & {revisions?:AreaRevision[]; boundary?:BoundaryProvenance} | {source?:undefined; geometry?:never; selectionMode?:never; dataset:string; label?:string; spatialReference?:SpatialReference; country?:string};
export interface Exclusion {sourceNodeId:string; featureId:string; signature:string; reason:string}
export type AreaUnit = 'm2'|'km2'|'ha'|'ft2'|'acre'|'mi2';
export interface Measurement {squareMetres:number; value:number; unit:AreaUnit; method:string}
export interface ParamsByType {
  mean_center:{label:string;zone:number;hemisphere:'north'|'south';weightField?:string};
  compare_point_sets:{label:string;zone:number;hemisphere:'north'|'south';centers?:boolean};
  comparison_map:{label:string};
  donut_geomask:{label:string;innerM:number;outerM:number;seed:number};
  aggregate_points_to_h3_cell:{label:string;resolution:number;minOccupancy:number};
  buffer_area:{label:string;distanceM:number};
  table_input:{label:string;keys:string[];valueField:string;unit?:string;data:import('./data-table.js').DataTable;dataRef?:string;source?:import('./data-table.js').DataTableSource;
    /** Key columns whose DISTINCT values this input derives and carries.
     *
     *  P3 of experiment 115: the distinct values are a knob on the input widget, not a
     *  derivation in the middle of the graph. The constraint then lives where the data
     *  enters, which is where it can be acted on -- a practitioner who meets it at import
     *  can fix the file, one who meets it three steps downstream cannot. */
    distinctValuesFor?:string[]};
  rate_ratio:{label:string;compared:string;reference:string;level:90|95|99;method:import('./rate-ratio.js').IntervalMethod};
  rate:{label:string;source?:'points'|'table';measureKey?:string;numeratorField:string;denominatorField:string;groupBy?:string;bandWidth?:number;denominatorUnit:import('./rate.js').DenominatorUnit;rateKind:import('./rate.js').RateKind;multiplier:number;minimumDenominator:number;numeratorPeriod:string;denominatorVintage:string};
  derive_value:{label:string;keyColumn:string;left:string;operator:import('./derive-value.js').Operator;right:string;name:string};
  select_rows:{label:string;keyColumn:string;values:string[]};
  case_series:{label:string;source?:'points'|'table';dateField:string;dateKind:import('./case-series.js').DateKind;period:import('./case-series.js').Period;weightField?:string};
  summarize_combined_area:{label:string;zone:number;hemisphere:'north'|'south';yields?:'area'};
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
    /** Facts the ruleset's `inputContract.expects` names that no connected port supplies.
     *
     *  Keyed by the PREDICATE the ruleset declares, never by a name this widget invents, so the
     *  widget stays domain-agnostic while the ruleset carries the domain. `fw:heatAlert` is the
     *  ruleset's word; "Heat alert" was a whole widget until 2026-10-25.
     *
     *  Values are strings because a declared fact is tri-state: "true", "false", or absent for
     *  not stated, which is what drives the companion `…Known` predicate. A boolean could not
     *  express the third case, and the third case is the one that matters -- an unstated
     *  condition is not a false one. */
    declaredFacts?:Record<string,string>;
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
  find_health_facilities:{label:string;source:'openstreetmap-live'|'hdx-hot-export'|'overture-places';kinds:string[];requireName:boolean;country:string;minConfidence:number;data:PointCollection|null;retrieved:{source:'openstreetmap-live'|'hdx-hot-export'|'overture-places';sourceLabel:string;licence:string;licenceIRI:string;sourceIRI:string;attribution:string;origin:string;kept:number;dropped:{kind:number;coordinates:number;name:number;outside?:number};at:string;scope:string;filename?:string;sha256?:string;bytes?:number;release?:string;belowConfidence?:number;unmappedCategory?:number;minConfidence?:number}|null};
  buffer_point:{label:string;pointId:string;distanceM:number};
  sample_raster:{label:string;attribute:string;valueUnit:string};
  slr_extract_import:{label:string;datasetIRI:string;datasetVersion:string;baselinePeriod:string;citations:string[];basisKind:''|'workflow'|'confidence-pbox';familyValues:{withVerticalLandMotion:string;withoutVerticalLandMotion:string};sourceNote?:string};
  slr_site_assignment:{label:string};
  slr_threshold_comparison:{label:string;scenario:string;basis:string;family:string;year:string;quantile:string;elevationField:string;verticalDatum:string;elevationReference:''|'baseline-sea-surface'|'other-datum'};
  // From 2026-10-13 a transform, not a source: it takes points and returns points. `data`, `source`
  // and `provenance` remain OPTIONAL so a workflow saved before that date still parses; they are
  // the discriminator the migration reads, and nothing writes them any more.
  /** Keep the points that are in the area. `keepBoundary` decides the one case the predicate
   *  exists to name: a point exactly ON the outline is in that jurisdiction's edge, and folding
   *  it silently into either side would answer a question nobody asked. */
  clip_points_to_area:{label:string;keepBoundary:boolean;showExcluded:boolean};
  /** Record linkage across point layers. Every threshold is a knob and every knob reaches the
   *  receipt: the practitioner, 2026-10-21, *"Thresholds are knobs and settings should show up in
   *  N3 receipts."* `decisions` holds the review band's human answers, each pinned to a signature
   *  of the pair it was made about, so editing either record lapses the judgement. */
  deduplicate_points:{label:string; pointInputCount?:number; nameField:string;
    nameMatch:import('./deduplicate-points.js').NameMatch; fuzzyThreshold:number;
    blockDistanceM:number; nearDistanceM:number; matchThreshold:number; reviewThreshold:number;
    decisions:import('./deduplicate-points.js').PairDecision[]};
  reproject:{label:string;zone:number;hemisphere:'north'|'south';data?:PointCollection;spatialReference?:SpatialReference;source?:import('./reproject.js').ReprojectSource;provenance?:import('./reproject.js').ReprojectProvenance};
  /** `maxNodes` is the graph ceiling, a knob rather than a fixed cap: the contract does not move
   *  with it (ports, output port type and behaviour are unchanged, only what is admitted changes) and
   *  the failure it guards is contained, because isochrone runs in a Worker with a timeout. 2,000 is
   *  the measured default; above about 3,000 is untested. */
  /** `pauseSeconds` is the minimum wait this practitioner wants between OSM requests. It can only
   *  raise the pause: the module takes the longest of the 60-second floor, the volume a response
   *  actually cost, and this. Being more respectful of a public service is always permitted;
   *  being less is not. */
  network_input:{label:string;data:import('./catchments.js').Network;dataRef?:string;inputMethod?:'osm'|'file'|'extract';marginM?:number;maxNodes?:number;pauseSeconds?:number;travelMode?:import('./catchments.js').NetworkTravelMode};
  voronoi:{label:string;zone:number;hemisphere:'north'|'south'};
  isochrone:{label:string;zone:number;hemisphere:'north'|'south';minutes:number;thresholds?:number[];fillHoles?:boolean;speedMPerMin:number;bufferM:number;maxSnapM:number;direction:'inbound'|'outbound'};
  clip_polygons:{label:string};
  summarize_points_to_polygon:{label:string;boundary:'include'|'exclude';valueField:string};
  /** `keyField` is the table column holding the name of a part. `normalisation` is declared
   *  rather than assumed, because folding punctuation is what takes South London from 23 of 32
   *  matches to 32 of 32 and a reader is owed the chance to disagree with it. */
  join_table_to_area:{label:string;keyField:string;normalisation:'exact'|'fuzzy'};
  /** `populationYear` is which published WorldPop year the download button offers; it chooses a
   *  link, never the data, which arrives only when a file is prepared. */
  raster_input:{label:string;asset?:import('./raster.js').RasterAsset;populationYear?:string;
    /** Which country's population surface the download button offers, when the study area does
     *  not state one. It chooses a link, never the data. */
    populationCountry?:string};
  clip_raster:{label:string;method:'cell-center'|'all-touched';marginPixels?:number;cutline?:{geometry:Boundary;selectionMode:'bbox'|'polygon'|'circle'}};
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
  measure_area:{unit:AreaUnit};
  /** RETIRED 2026-10-21, kept the way every other retired widget is kept: the definition and its
   *  parameters stay so the registry entry resolves and a saved workflow that still names the type
   *  can be migrated rather than refused. Nothing adds one, nothing runs one. */
  coverage_check:{exclusions:Exclusion[]; pointInputCount?:number};
  map_output:{label:string; pointInputCount?:number;
    /** How each point layer is drawn, keyed by the node that produced it -- a source keeps its
     *  symbol when layers are rewired or reordered. Absent means derived from the layer's
     *  position, which is what every map did before a practitioner could choose. */
    layerSymbols?:Record<string,{mark?:import('./presentation.js').LayerShape;colour?:string;size?:number}>;
    /** Whether every point mark is drawn over a dark halo. On by default, because the reason it
     *  exists is a terrain basemap: a mark in the palette's own values over OpenTopoMap was hard
     *  to pick out. It is a checkbox rather than a rule because a map on a pale ground, or one
     *  going into a printed figure, may not want it. */
    markHalo?:boolean; inputMode?:'spatial'|'decisions'|'raster'|'polygons'|'network';presentation?:'plot'|'interactive';contextPoints?:boolean;mapTitle?:string;mapSubtitle?:string;mapSourceNote?:string;showLegend?:boolean;basemap?:BasemapChoice}; table_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'polygons'|'table'};
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
export type RetiredNodeType='places'|'centers'|'output'|'policy'|'access_policy'|'xpert'|'coverage_check';
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
export type RenamedNodeType='samples'|'nearest'|'observations'|'area'|'summarize_polygons'|'hex_aggregate';
export const RENAMED_NODE_TYPES:Record<RenamedNodeType,NodeType>={samples:'point_grid',nearest:'measure_distance',observations:'point_input',area:'study_area',summarize_polygons:'summarize_points_to_polygon',hex_aggregate:'aggregate_points_to_h3_cell'};

/** `carriedExclusions` is what a retirement could not translate. `coverage_check` let a reviewer
 *  exclude a record BY JUDGEMENT with a written reason; `clip_points_to_area`, which replaces its
 *  spatial half, has no such thing. The judgements ride along in the file and the Inspector says
 *  they are inert, because dropping them on open would be the silent rewrite retirement exists
 *  to prevent. */
export type WorkflowNode<K extends NodeType = NodeType> = NodeSpec<K> & {id:string; x:number; y:number; references?:EvidenceReference[]; sourceMigration?:{fromType:RetiredNodeType|RenamedNodeType|RecontractedNodeType; version:'1'; carriedExclusions?:Exclusion[]}};
export interface WorkflowEdge {id:string; from:string; to:string; port:string}
/** `projectId` and `workflowKey` were added 2026-10-19, when a project stopped being a word in
 *  the title bar and became an investigation that holds several workflows (experiment 122). A
 *  built-in worked example needs neither: its `exampleId` names it and `BUILT_IN_PROJECTS` in
 *  project.ts says which investigation it belongs to. A workflow a practitioner creates has no
 *  `exampleId`, so it carries the project it belongs to and the key it is stored under -- because
 *  the workspace map was keyed by a closed vocabulary of example ids, and a practitioner cannot
 *  mint one of those. `outputId` stays SINGULAR and per-workflow: one question, one answer. */
export interface Workflow {schema:'fieldwork/workflow/1'; name:string; exampleId?:'blank'|'coverage'|'old-naledi'|'raster'|'snow-voronoi'|'snow-isochrone'|'snow-geoprivacy'|'snow-extent'|'sea-level'|'rulesets'; nodes:WorkflowNode[]; edges:WorkflowEdge[]; projectId?:string; workflowKey?:string; outputId?:string; manifest?:import('./project-manifest.js').ProjectManifest}
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
