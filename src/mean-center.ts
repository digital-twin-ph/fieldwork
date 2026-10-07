import {metric} from './catchments.js';
import type {PointCollection,Position,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';

export interface MeanCenter {coordinates:Position;projected:Position;crs:string;count:number;method:string}

export function validateMeanCenterNode(node:WorkflowNode):void{
  if(node.type!=='mean_center')return;
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)throw new Error('Name Mean center using 1–60 characters.');
  const params=node.params;
  if(!Number.isInteger(params.zone)||params.zone<1||params.zone>60||!['north','south'].includes(params.hemisphere))throw new Error('Choose a WGS84 UTM zone 1–60 and hemisphere for Mean center.');
}
export function computeMeanCenter(points:PointCollection,params:WorkflowNode<'mean_center'>['params']):MeanCenter{
  validateMeanCenterNode({id:'check',type:'mean_center',x:0,y:0,params});
  if(!points?.features?.length)throw new Error('Mean center needs at least one point.');
  if(points.features.some(feature=>!feature.geometry))throw new Error('Mean center requires known coordinates for every point.');
  const projection=metric(params.zone,params.hemisphere);
  const sum=points.features.reduce(([x,y],feature)=>{const [e,n]=projection.forward(feature.geometry!.coordinates);return [x+e,y+n] as Position;},[0,0] as Position);
  const projected:[number,number]=[sum[0]/points.features.length,sum[1]/points.features.length];
  return {coordinates:projection.inverse(projected),projected,crs:projection.crs,count:points.features.length,method:'Unweighted arithmetic mean of WGS84 UTM easting and northing; center returned in CRS84.'};
}

export function meanCenterReceipt(node:WorkflowNode<'mean_center'>,value:MeanCenter,runId:string,source:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`;
  const wkt=`<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT (${value.coordinates.join(' ')})`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n<${activity}> a fw:MeanCenterComputation, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>; fw:computationCRS ${JSON.stringify(value.crs)}; fw:inputCount ${value.count}.\n<${entity}> a fw:MeanCenterResult, prov:Entity; prov:wasGeneratedBy <${activity}>; geo:hasGeometry <${entity}:geometry>.\n<${entity}:geometry> a geo:Geometry; geo:asWKT ${JSON.stringify(wkt)}^^geo:wktLiteral.\n`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:value.method};
}
