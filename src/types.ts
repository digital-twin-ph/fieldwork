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
export type AreaParams = {source:'drawn'; label:string; selectionMode:'bbox'|'polygon'; geometry:Polygon|null; spatialReference?:SpatialReference} | {source?:undefined; geometry?:never; selectionMode?:never; dataset:string; label?:string; spatialReference?:SpatialReference};
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
  reproject:{label:string;zone:number;hemisphere:'north'|'south';data:PointCollection;spatialReference?:SpatialReference;source?:import('./reproject.js').ReprojectSource;provenance?:import('./reproject.js').ReprojectProvenance};
  network_input:{label:string;data:import('./catchments.js').Network;inputMethod?:'osm'|'file';marginM?:number};
  voronoi:{label:string;zone:number;hemisphere:'north'|'south'};
  isochrone:{label:string;zone:number;hemisphere:'north'|'south';minutes:number;thresholds?:number[];fillHoles?:boolean;speedMPerMin:number;bufferM:number;maxSnapM:number;direction:'inbound'|'outbound'};
  clip_polygons:{label:string};
  summarize_polygons:{label:string;boundary:'include'|'exclude';valueField:string};
  raster_input:{label:string;asset?:import('./raster.js').RasterAsset};
  clip_raster:{label:string;method:'cell-center'|'all-touched';marginPixels?:number;cutline?:{geometry:Polygon;selectionMode:'bbox'|'polygon'}};
  places:PointParams; centers:PointParams; observations:ObservationParams; area:AreaParams;
  alert:{active:boolean|null; date:string}; nearest:Record<string,never>; policy:{thresholdKm:number};
  measure_area:{unit:AreaUnit}; coverage_check:{exclusions:Exclusion[]; pointInputCount?:number};
  map_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'raster'|'polygons';presentation?:'plot'|'interactive';contextPoints?:boolean;mapTitle?:string;mapSubtitle?:string;mapSourceNote?:string;showLegend?:boolean;basemap?:'none'|'osm'|'topo'}; table_output:{label:string; pointInputCount?:number; inputMode?:'spatial'|'decisions'|'polygons'};
  chart_output:{label:string;inputMode?:'decisions'|'polygons';renderer?:'html'|'vega-lite';mark?:'bar'|'point';orientation?:'horizontal'|'vertical';chartTitle?:string;subtitle?:string;xAxisTitle?:string;yAxisTitle?:string;colorByCategory?:boolean;sourceNote?:string};
  output:{label?:string; view:'map'|'table'|'bars'};
  facilities:{dataset:string; radiusKm:number; sourceMode?:'connected'}; samples:{spacingM:number};
  xpert:Record<string,never>; facility_audit:Record<string,never>;
  access:{minimumEvidence:'direct'|'contextual'|'inferential'; service:'onsite'|'anyKnown'; speedMPerMin:number};
  access_policy:{thresholdMin:number};
}
export type NodeType = keyof ParamsByType;
export type NodeSpec<K extends NodeType = NodeType> = {[T in K]:{type:T; params:ParamsByType[T] & {label?:string}}}[K];
export type WorkflowNode<K extends NodeType = NodeType> = NodeSpec<K> & {id:string; x:number; y:number; references?:EvidenceReference[]; sourceMigration?:{fromType:'places'|'centers'; version:'1'}};
export interface WorkflowEdge {id:string; from:string; to:string; port:string}
export interface Workflow {schema:'fieldwork/workflow/1'; name:string; exampleId?:'blank'|'coverage'|'old-naledi'|'raster'|'snow-voronoi'|'snow-isochrone'|'snow-geoprivacy'; nodes:WorkflowNode[]; edges:WorkflowEdge[]; outputId?:string; manifest?:import('./project-manifest.js').ProjectManifest}
export type PortType = 'points'|'alert'|'distances'|'decisions'|'area'|'facilities'|'samples'|'gradedFacilities'|'access'|'coverage-check'|'raster'|'polygons'|'network'|'mean-center'|'point-comparison';
export interface NodeDefinition {title:string; group:string; icon:string; color:string; description:string; inputs:[string,PortType][]; output:PortType|null}
export type Escape = (value:unknown)=>string;
export type SpatialRelation = 'Inside'|'Boundary'|'Outside'|'MissingLocation';
