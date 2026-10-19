import {metricCRSAssertion} from './metric-crs.js';
import {metric} from './catchments.js';
import type {PointCollection,Position,WorkflowNode} from './types.js';
import type {Receipt} from './results.js';

/** `count` is always the number of POINTS averaged. `weight` is present only when a field was
 *  named, and carries that field and the total it summed, because a weighted centre of 250
 *  addresses holding 489 deaths is a summary of 489 things and a receipt saying 250 would be
 *  wrong. Both are asserted. */
export interface MeanCenter {coordinates:Position;projected:Position;crs:string;count:number;weight?:{field:string;total:number};method:string}

export function validateMeanCenterNode(node:WorkflowNode):void{
  if(node.type!=='mean_center')return;
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)throw new Error('Name Mean center using 1–60 characters.');
  const params=node.params;
  if(!Number.isInteger(params.zone)||params.zone<1||params.zone>60||!['north','south'].includes(params.hemisphere))throw new Error('Choose a WGS84 UTM zone 1–60 and hemisphere for Mean center.');
  // An EMPTY field is unweighted, not an unfinished name. The Inspector's generic parameter
  // handler writes a trimmed string and never `undefined`, so emptying the box to turn weighting
  // off produces `''` -- and refusing that made the box one-way: it could be set and not unset.
  // Found by the browser test for the control, 2026-10-19.
  if(params.weightField!==undefined&&(typeof params.weightField!=='string'||params.weightField.length>60))throw new Error('Name the attribute to weight Mean center by, using at most 60 characters, or leave it empty to weight nothing.');
}
export function computeMeanCenter(points:PointCollection,params:WorkflowNode<'mean_center'>['params']):MeanCenter{
  validateMeanCenterNode({id:'check',type:'mean_center',x:0,y:0,params});
  if(!points?.features?.length)throw new Error('Mean center needs at least one point.');
  if(points.features.some(feature=>!feature.geometry))throw new Error('Mean center requires known coordinates for every point.');
  const projection=metric(params.zone,params.hemisphere);
  const field=params.weightField?.trim();
  if(!field){
    const sum=points.features.reduce(([x,y],feature)=>{const [e,n]=projection.forward(feature.geometry!.coordinates);return [x+e,y+n] as Position;},[0,0] as Position);
    const projected:[number,number]=[sum[0]/points.features.length,sum[1]/points.features.length];
    return {coordinates:projection.inverse(projected),projected,crs:projection.crs,count:points.features.length,
      method:'Unweighted arithmetic mean of WGS84 UTM easting and northing; center returned in CRS84.'};
  }
  // A weight that is absent, non-numeric or negative is REFUSED with the number of records it
  // applies to, rather than read as zero. Treating a missing weight as zero silently drops that
  // record from the average and moves the centre, which is the failure a practitioner cannot see.
  // Zero itself is admitted: on the 1854 cholera data a house where nobody died contributes no
  // deaths to a death-weighted centre, and that is the correct contribution, not a missing one.
  const weights=points.features.map(feature=>{
    const value=(feature.properties as Record<string,unknown>|undefined)?.[field];
    const weight=typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;
    return Number.isFinite(weight)&&weight>=0?weight:null;
  });
  const unusable=weights.filter(weight=>weight===null).length;
  if(unusable)throw new Error(`Mean center cannot weight by "${field}": ${unusable} of ${points.features.length} records hold no usable number. A weight must be present and not negative.`);
  const total=weights.reduce((sum,weight)=>sum!+weight!,0)!;
  if(!(total>0))throw new Error(`Mean center cannot weight by "${field}": the weights sum to zero, so there is nothing to average.`);
  const sum=points.features.reduce(([x,y],feature,index)=>{
    const [e,n]=projection.forward(feature.geometry!.coordinates),weight=weights[index]!;
    return [x+e*weight,y+n*weight] as Position;},[0,0] as Position);
  const projected:[number,number]=[sum[0]/total,sum[1]/total];
  return {coordinates:projection.inverse(projected),projected,crs:projection.crs,count:points.features.length,
    weight:{field,total},
    method:`Arithmetic mean of WGS84 UTM easting and northing weighted by "${field}" (${total} over ${points.features.length} points); center returned in CRS84.`};
}

export function meanCenterReceipt(node:WorkflowNode<'mean_center'>,value:MeanCenter,runId:string,source:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`;
  const wkt=`<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT (${value.coordinates.join(' ')})`;
  // `fw:inputCount` stays the POINT count whether or not a weight was used, and the weight total
  // is asserted beside it rather than in place of it. A weighted run over the 1854 cholera data
  // averages 250 addresses holding 489 deaths, and a receipt claiming either number alone says
  // something false about what was summarised.
  const weighting=value.weight?`; fw:weightField ${JSON.stringify(value.weight.field)}; fw:weightTotal ${value.weight.total}`:'';
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n<${activity}> a fw:MeanCenterComputation, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>; ${metricCRSAssertion(value.crs)}fw:inputCount ${value.count}${weighting}.\n<${entity}> a fw:MeanCenterResult, prov:Entity; prov:wasGeneratedBy <${activity}>; geo:hasGeometry <${entity}:geometry>.\n<${entity}:geometry> a geo:Geometry; geo:asWKT ${JSON.stringify(wkt)}^^geo:wktLiteral.\n`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:value.method};
}
