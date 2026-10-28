import type {NodeEvidence,EvidenceReference} from './evidence.js';
import type {Boundary,Bounds,Exclusion,Measurement,ParamsByType,PointFeature,PointCollection,Position,Scalar,SpatialReference,AnySpatialReference,SpatialRelation,AttributeType,DistanceUnit} from './types.js';
import type {ReasonerQuad} from './worker-types.js';
import type {LayerSymbol,FillEncoding,FillClass} from './presentation.js';
export type Status='Review'|'NoFlag'|'Unknown';
export type Tier='Direct'|'Contextual'|'Inferential'|'None';
export type Service='Onsite'|'OnsiteOrReferral'|'ReferralOnly'|'Unknown';
export type Zone='Within5'|'Within15'|'Within30'|'Over30'|'Unknown';
export interface Facility {id:string; name:string; coordinates:Position; owner:string; serviceType:string; attributes?:Record<string,Scalar>}
export interface GradedFacility extends Facility {tier:Tier; service:Service; reference:string}
/** `attributes` carries the matched candidate's own fields.
 *
 *  Added 2026-10-12, when `access` was decomposed. Knowing WHICH candidate won is rarely enough:
 *  an explanation that says "nearest facility: X" and nothing about X's evidence level tells a
 *  reader less than the widget knew. The old `access` port type solved this by making the matched
 *  candidate a GradedFacility, which is a producer-named type; carrying the candidate's attributes
 *  solves it generally, for any candidate layer. */
export interface Sample {id:string; name:string; coordinates:Position; attributes?:Record<string,Scalar>}
// `distance` with its `unit`, not `distanceKm`: the unit is a parameter of `nearest`, so a row
// that did not carry it would leave every consumer guessing. `policy` refuses a unit its
// threshold is not stated in rather than converting silently.
/** `attributes` carries the SUBJECT's own fields, as `center.attributes` carries the matched
 *  candidate's. `access` carried both because its row type was built for one domain; a general row
 *  about a point should carry that point's own fields, or every consumer has to reach back to the
 *  input layer to find them.
 *
 *  `minutes` is filled only by `travel_time`, never by `nearest`. It is a derived measure under a
 *  stated assumption -- a straight-line distance walked at a constant speed -- and not a unit of
 *  distance, which is why it is a separate step and not a third value of `unit`. */
export interface NearestRow {id:string; name:string; coordinates:Position|null; distance:number|null; unit:DistanceUnit; center:Sample|null; reason?:string; minutes?:number|null; attributes?:Record<string,Scalar>}
export interface HeatRow extends NearestRow {status:Status; explanation:string}
export interface AccessRow extends Omit<Sample,'coordinates'> {coordinates:Position|null; attributes?:Record<string,Scalar>;distanceKm:number|null; minutes:number|null; center:GradedFacility|null; status?:Status; zone?:Zone; explanation?:string}
export interface LayerSummary {sourceNodeId:string; label:string; count:number}
export interface PointRow {id:string; recordId:string; sourceNodeId:string; layerLabel:string; attributeTypes:Record<string,AttributeType>; name:string; attributes:Record<string,Scalar>; coordinates:Position|null}
/** `fill` is the class the map RESOLVED this row to, by its own fillEncoding. The renderer draws
 *  the class; it does not read the variable. */
export interface MapRow extends PointRow {relation:SpatialRelation; status:Status; fill?:FillClass}
export interface CoverageRow extends MapRow {excluded:boolean; exclusionReason:string; signature:string; iri:string; decision:'Accept'|'Review'|'Excluded'}
/** `units` are the NAMED PARTS of an acquired boundary, carried on the value rather than left on
 *  the node that produced it. Without this a downstream widget can see 33 rings and no way to
 *  tell which is Streatham, which is why nothing could join a table to a study area: the names
 *  existed, in `BoundaryProvenance`, and stopped at the node. Index-aligned with the parts of
 *  `boundary` when it is a MultiPolygon. */
export interface AreaValue {boundary:Boundary; units?:{id:string;name:string}[]; areaId:string; geometryId:string; label:string; spatialReference?:SpatialReference; areaFacts?:string; measurement?:Measurement; bounds?:Bounds; ready?:boolean; source?:string; dataset?:string; kind?:'study-area'; rows?:never[]; centers?:never[]}
export interface CoverageValue extends Omit<AreaValue,'kind'|'rows'> {kind:'spatial-coverage'; rows:CoverageRow[]; centers:never[]; checkNodeId:string; areaNodeId:string; sourceNodeId:string|null; pointLayers:LayerSummary[]; reviewCount:number; excludedCount:number; canProceed:boolean; retainedLayers:{sourceNodeId:string; label:string; data:PointCollection}[]; retainedData:PointCollection; pointTable?:boolean}
export interface MapValue extends Omit<AreaValue,'kind'|'rows'> {kind:'spatial-map'; rows:MapRow[]; centers:never[];
  /** How each point layer is drawn, resolved once so the plot, the interactive map, the legend
   *  and the receipt cannot disagree about it. */
  layerSymbols?:Record<string,LayerSymbol>;
  /** What the fill channel stands for on this map, so the renderer draws classes rather than
   *  knowing the variable. */
  fillEncoding?:FillEncoding;
  /** Whether point marks are drawn over a dark halo, so they read on any basemap. */
  markHalo?:boolean;
  layerNames?:Record<string,string>; pointLayers:LayerSummary[]; sourceNodeId:string|null}
export interface TableValue {kind:'point-table'; rows:PointRow[]; centers:never[]; spatialReference:AnySpatialReference; pointLayers:LayerSummary[]; pointTable?:boolean}
export interface Receipt {nodeId:string; references?:EvidenceReference[]; ruleset?:import('./rulesets.js').RulesetCitation; kind?:'computation'|'presentation'; facts:string; rules:string; input:string; conclusions:ReasonerQuad[]; source?:string; method?:string; measurement?:Measurement; areaId?:string; geometryId?:string; exclusions?:Exclusion[]}
export interface RegistryValue {boundary:Boundary; facilities:Facility[]; radiusKm:number; facilitySource?:{nodeId?:string; sourceInfo?:import('./types.js').SourceInfo; inputCount:number; missingLocationCount:number}}
export interface GradedRegistryValue extends Omit<RegistryValue,'facilities'> {facilities:GradedFacility[]}
export interface SamplesValue extends PointCollection {boundary:Boundary; rows:Sample[]; spacingM:number}
export interface AccessValue {kind:'access'; locationSource?:{nodeId?:string; kind:string}; provenance?:unknown; boundary:Boundary; rows:AccessRow[]; filters:ParamsByType['access']; centers:PointFeature[]; eligibleCount:number; candidateCount:number; thresholdMin?:number; method:string; source:string; dataset:string}
/** Presentation fields shared by heterogeneous result tabs. Calculations use the narrower contracts above. */
export interface DisplayRow {
  id:string; name:string; coordinates:Position|null; status?:Status; explanation?:string;
  /** Enclosed area in square metres, for a decision about extent. Null when no widget measured
   *  one -- a polygon computed in degrees has no area, which is not an area of zero. */
  areaSquareMetres?:number|null;
  // `distanceKm` was removed on 2026-10-12. It sat here beside `distance` and `unit` after the
  // rename, so three display readers kept reading a field nothing wrote any more, typechecked
  // against this declaration, and got undefined — which threw on `.toFixed` and emptied the
  // decision table. A unit welded into a field name has to leave the type when it leaves the data.
  distance?:number|null; unit?:DistanceUnit; minutes?:number|null; center?:Sample & Partial<GradedFacility>|null;
  owner?:string; serviceType?:string; service?:Service; tier?:Tier; reference?:string; zone?:Zone;
  recordId?:string; sourceNodeId?:string; layerLabel?:string; fill?:FillClass; attributeTypes?:Record<string,AttributeType>; attributes?:Record<string,Scalar>;
  relation?:SpatialRelation; decision?:CoverageRow['decision']; excluded?:boolean; exclusionReason?:string; signature?:string;
}
/** `order` places a bin on a scale its label does not carry — a band's travel time, so
 *  far. Present on every bin or none: a partial order is refused rather than guessed. */
/** `categoryTitle` is the axis title the PRODUCER declares, because only the producer knows what
 *  its categories are. Without it a chart falls back to "Category", which is true of every chart
 *  and says nothing: an epidemic curve published with "Category" under its dates has not told the
 *  reader what it binned. Optional, so a producer that has nothing better to say omits it. */
export interface ChartSummary {field:'status'|'zone'|'tier'|'count'|'total'|'period'; caption:string; categoryTitle?:string; total:number; bins:{key:string; label:string; count:number; order?:number}[]}
export interface DisplayValue {
  comparison?:import('./point-comparison.js').PointComparison;
  polygonPresentation?:'plot'|'interactive';
  contextPoints?:PointCollection;
  polygons?:import('./catchments.js').Polygons;
  raster?:import('./raster.js').RasterGrid;
  /** A street network shown as itself. Carried here rather than converted to polygons, because
   *  the thing a practitioner is checking is the graph that was downloaded. */
  network?:import('./catchments.js').Network;
  chart?:ChartSummary;
  locationSource?:{nodeId?:string; kind:string};
  facilitySource?:RegistryValue['facilitySource'];
  kind?:'study-area'|'spatial-coverage'|'spatial-map'|'point-table'|'data-table'|'access'|'facility-evidence'|'raster-map'|'network-map'|'extent';
  rows:DisplayRow[]; centers:PointFeature[]; boundary?:Boundary; label?:string; areaId?:string; geometryId?:string;
  measurement?:Measurement; ready?:boolean; pointTable?:boolean; pointLayers?:LayerSummary[];
  checkNodeId?:string; areaNodeId?:string; reviewCount?:number; excludedCount?:number; canProceed?:boolean;
  eligibleCount?:number; candidateCount?:number; thresholdMin?:number; threshold?:number; alert?:ParamsByType['alert'];
  spatialReference?:SpatialReference; method?:string;
}
export interface Output extends DisplayValue {nodeId:string; label:string; view:'map'|'table'|'bars'}
/** Something a run FOUND that the practitioner has to act on, carried per node so the widget that
 *  found it can say so. Not an error: the run completed and the outputs are real.
 *
 *  Two findings so far, and the difference between them is what the practitioner does about it.
 *  `unconnected` sites got no answer -- the leg to the network spends the whole budget -- so the
 *  counts are over fewer sites than were offered. `offNetwork` sites got an answer that assumes a
 *  straight line nobody has checked is walkable, so their results are optimistic rather than
 *  missing. Experiment 114. */
/** Something a node was supposed to declare and has not.
 *
 *  Reported, never fatal, on the practitioner's decision of 2026-10-15: provenance "can be flagged
 *  as an alert, not a blocker." General rather than sea-level-specific because the shape is: a
 *  named field, and what its absence costs a reader. Nothing about it is about projections. */
export interface DeclarationGap {field:string; says:string}
export interface RunAlert {nodeId:string;
  unconnected:import('./catchments.js').UnconnectedSite[];
  offNetwork:import('./catchments.js').OffNetworkSite[];
  gaps?:DeclarationGap[];
  /** What the records could not tell a step that applied rules to them. Distinct from `gaps`:
   *  a gap is something nobody DECLARED, an issue is something the data itself could not say. */
  dataIssues?:import('./authored-application.js').DataIssue[]}
/** Declaration gaps a value carries, read without knowing what the value is -- the same way
 *  `unconnectedSites` reads any value, so the run does not need to know which widgets declare. */
export function declarationGaps(value:unknown):DeclarationGap[]{
  const carried=(value as {projection?:{gaps?:unknown}}|null|undefined)?.projection?.gaps;
  return Array.isArray(carried)
    ?carried.filter((gap):gap is DeclarationGap=>
      typeof (gap as DeclarationGap)?.field==='string'&&typeof (gap as DeclarationGap)?.says==='string')
    :[];
}
/** Data issues a value carries, read the same way `declarationGaps` reads a value: without the
 *  run needing to know which widget produced it.
 *
 *  Attributed to the step that FOUND them, by name. A value travels on -- a classified table is
 *  read by the table output next to it -- and without this the same finding was raised on every
 *  node downstream of the one that could act on it. The reader stays generic; the value says
 *  whose finding it is. */
export function dataIssuesOf(value:unknown,nodeId:string):import('./authored-application.js').DataIssue[]{
  const entity=value as {dataIssues?:unknown;issuedBy?:unknown}|null|undefined;
  if(entity?.issuedBy!==nodeId)return [];
  return Array.isArray(entity.dataIssues)?entity.dataIssues as import('./authored-application.js').DataIssue[]:[];
}
/** `linkages` is what a deduplication found, keyed by the node that found it. A display node's
 *  result is in `outputs`; this is the first INTERMEDIATE result the interface has to show,
 *  because the review band is a question the widget asks and the answer belongs on the node
 *  rather than in whichever result tab happens to be open. */
export interface WorkflowRun {alerts:RunAlert[]; evidence:NodeEvidence[]; provenanceN3:string; outputs:Output[]; trace:{nodeId:string; type:string; milliseconds:number}[]; receipts:Receipt[]; runId:string; engine:string; runAt:string;
  linkages?:Record<string,import('./deduplicate-points.js').DeduplicateResult>;
  /** What each relate step did, keyed by the node that did it. The second intermediate result the
   *  interface has to show, and for a sharper reason than the first: the rows a relate drops are
   *  absent from the table it hands on, so the outcome cannot be read off the data. */
  relations?:Record<string,import('./relate-table.js').RelateOutcome>;
  /** NOTES THE WIDGETS MACHINED, by the node that machined them: the application's own account of
   *  what it did, written for a part of a write-up rather than for a panel. IMRAD is the body;
   *  a title and an abstract are front matter and are assembled from the whole workflow rather
   *  than owned by a node, so they are not values of a note's `section`.
   *
   *  The practitioner, 2026-10-28, on why transparency about a join is not a panel feature: *"this
   *  should be in fact a machined note from the widget."* Sibling of the quoted notes the South
   *  London repository carries -- Snow's own sentences are quoted, this is machined. */
  machined?:Record<string,import('./relate-table.js').MachinedNote[]>;
  /** The table each step produced, by node id, for the steps that produced one.
   *
   *  Only an output widget makes a result tab, so without this a table computed in the middle of
   *  a chain has nowhere to be seen. Tables only -- they are bounded at MAX_TABLE_ROWS, and the
   *  other intermediate values are not. In memory for the open run; stripped from an exported
   *  receipt, which carries the facts rather than the data. */
  tables?:Record<string,import('./data-table.js').DataTable>}
