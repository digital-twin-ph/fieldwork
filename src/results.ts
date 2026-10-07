import type {NodeEvidence,EvidenceReference} from './evidence.js';
import type {Boundary,Bounds,Exclusion,Measurement,ParamsByType,PointFeature,PointCollection,Position,Scalar,SpatialReference,SpatialRelation,AttributeType} from './types.js';
import type {ReasonerQuad} from './worker-types.js';
export type Status='Review'|'NoFlag'|'Unknown';
export type Tier='Direct'|'Contextual'|'Inferential'|'None';
export type Service='Onsite'|'OnsiteOrReferral'|'ReferralOnly'|'Unknown';
export type Zone='Within5'|'Within15'|'Within30'|'Over30'|'Unknown';
export interface Facility {id:string; name:string; coordinates:Position; owner:string; serviceType:string; attributes?:Record<string,Scalar>}
export interface GradedFacility extends Facility {tier:Tier; service:Service; reference:string}
export interface Sample {id:string; name:string; coordinates:Position}
export interface NearestRow {id:string; name:string; coordinates:Position|null; distanceKm:number|null; center:Sample|null; reason?:string}
export interface HeatRow extends NearestRow {status:Status; explanation:string}
export interface AccessRow extends Omit<Sample,'coordinates'> {coordinates:Position|null; attributes?:Record<string,Scalar>;distanceKm:number|null; minutes:number|null; center:GradedFacility|null; status?:Status; zone?:Zone; explanation?:string}
export interface LayerSummary {sourceNodeId:string; label:string; count:number}
export interface PointRow {id:string; recordId:string; sourceNodeId:string; layerLabel:string; attributeTypes:Record<string,AttributeType>; name:string; attributes:Record<string,Scalar>; coordinates:Position|null}
export interface MapRow extends PointRow {relation:SpatialRelation; status:Status}
export interface CoverageRow extends MapRow {excluded:boolean; exclusionReason:string; signature:string; iri:string; decision:'Accept'|'Review'|'Excluded'}
export interface AreaValue {boundary:Boundary; areaId:string; geometryId:string; label:string; spatialReference?:SpatialReference; areaFacts?:string; measurement?:Measurement; bounds?:Bounds; ready?:boolean; source?:string; dataset?:string; kind?:'study-area'; rows?:never[]; centers?:never[]}
export interface CoverageValue extends Omit<AreaValue,'kind'|'rows'> {kind:'spatial-coverage'; rows:CoverageRow[]; centers:never[]; checkNodeId:string; areaNodeId:string; sourceNodeId:string|null; pointLayers:LayerSummary[]; reviewCount:number; excludedCount:number; canProceed:boolean; retainedLayers:{sourceNodeId:string; label:string; data:PointCollection}[]; retainedData:PointCollection; pointTable?:boolean}
export interface MapValue extends Omit<AreaValue,'kind'|'rows'> {kind:'spatial-map'; rows:MapRow[]; centers:never[]; pointLayers:LayerSummary[]; sourceNodeId:string|null}
export interface TableValue {kind:'point-table'; rows:PointRow[]; centers:never[]; spatialReference:SpatialReference; pointLayers:LayerSummary[]; pointTable?:boolean}
export interface Receipt {nodeId:string; references?:EvidenceReference[]; kind?:'computation'|'presentation'; facts:string; rules:string; input:string; conclusions:ReasonerQuad[]; source?:string; method?:string; measurement?:Measurement; areaId?:string; geometryId?:string; exclusions?:Exclusion[]}
export interface RegistryValue {boundary:Boundary; facilities:Facility[]; radiusKm:number; facilitySource?:{nodeId?:string; sourceInfo?:import('./types.js').SourceInfo; inputCount:number; missingLocationCount:number}}
export interface GradedRegistryValue extends Omit<RegistryValue,'facilities'> {facilities:GradedFacility[]}
export interface SamplesValue extends PointCollection {boundary:Boundary; rows:Sample[]; spacingM:number}
export interface AccessValue {kind:'access'; boundary:Boundary; rows:AccessRow[]; filters:ParamsByType['access']; centers:PointFeature[]; eligibleCount:number; candidateCount:number; thresholdMin?:number; method:string; source:string; dataset:string}
/** Presentation fields shared by heterogeneous result tabs. Calculations use the narrower contracts above. */
export interface DisplayRow {
  id:string; name:string; coordinates:Position|null; status?:Status; explanation?:string;
  distanceKm?:number|null; minutes?:number|null; center?:Sample & Partial<GradedFacility>|null;
  owner?:string; serviceType?:string; service?:Service; tier?:Tier; reference?:string; zone?:Zone;
  recordId?:string; sourceNodeId?:string; layerLabel?:string; attributeTypes?:Record<string,AttributeType>; attributes?:Record<string,Scalar>;
  relation?:SpatialRelation; decision?:CoverageRow['decision']; excluded?:boolean; exclusionReason?:string; signature?:string;
}
export interface ChartSummary {field:'status'|'zone'|'tier'|'count'|'total'; caption:string; total:number; bins:{key:string; label:string; count:number}[]}
export interface DisplayValue {
  comparison?:import('./point-comparison.js').PointComparison;
  polygonPresentation?:'plot'|'interactive';
  contextPoints?:PointCollection;
  polygons?:import('./catchments.js').Polygons;
  raster?:import('./raster.js').RasterGrid;
  chart?:ChartSummary;
  locationSource?:{nodeId?:string; kind:string};
  facilitySource?:RegistryValue['facilitySource'];
  kind?:'study-area'|'spatial-coverage'|'spatial-map'|'point-table'|'access'|'facility-evidence'|'raster-map';
  rows:DisplayRow[]; centers:PointFeature[]; boundary?:Boundary; label?:string; areaId?:string; geometryId?:string;
  measurement?:Measurement; ready?:boolean; pointTable?:boolean; pointLayers?:LayerSummary[];
  checkNodeId?:string; areaNodeId?:string; reviewCount?:number; excludedCount?:number; canProceed?:boolean;
  eligibleCount?:number; candidateCount?:number; thresholdMin?:number; threshold?:number; alert?:ParamsByType['alert'];
  spatialReference?:SpatialReference; method?:string;
}
export interface Output extends DisplayValue {nodeId:string; label:string; view:'map'|'table'|'bars'}
export interface WorkflowRun {evidence:NodeEvidence[]; provenanceN3:string; outputs:Output[]; trace:{nodeId:string; type:string; milliseconds:number}[]; receipts:Receipt[]; runId:string; engine:string; runAt:string}
