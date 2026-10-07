import {metric} from './catchments.js';
import type {PointCollection,Position,WorkflowNode} from './types.js';
import type {DisplayValue,Receipt} from './results.js';
import {computeMeanCenter} from './mean-center.js';
import type {MeanCenter} from './mean-center.js';

export interface PointComparison {
  original:PointCollection;
  moved:PointCollection;
  pumps:PointCollection;
  originalMean:Position;
  movedMean:Position;
  centerShiftM:number;
  originalNearestPump:{id:string;name:string;distanceM:number};
  movedNearestPump:{id:string;name:string;distanceM:number};
  crs:string;
  method:string;
}

export function validatePointComparisonNode(node:WorkflowNode):void{
  if(node.type!=='compare_point_sets'&&node.type!=='comparison_map')return;
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)throw new Error('Name the point comparison using 1–60 characters.');
  if(node.type==='compare_point_sets'&&(!Number.isInteger(node.params.zone)||node.params.zone<1||node.params.zone>60||!['north','south'].includes(node.params.hemisphere)))throw new Error('Choose a WGS84 UTM zone 1–60 and hemisphere for mean-center comparison.');
}

export function comparePointSets(original:PointCollection,moved:PointCollection,pumps:PointCollection,params:WorkflowNode<'compare_point_sets'>['params'],originalCenter?:MeanCenter,movedCenter?:MeanCenter):PointComparison{
  validatePointComparisonNode({id:'check',x:0,y:0,type:'compare_point_sets',params});
  if(!original?.features?.length||!moved?.features?.length||original.features.length!==moved.features.length||!pumps?.features?.length)throw new Error('Compare equally sized, nonempty original and moved point sets with at least one pump.');
  if([...original.features,...moved.features,...pumps.features].some(f=>!f.geometry))throw new Error('Mean-center comparison requires known coordinates for every original, moved, and pump point.');
  const projection=metric(params.zone,params.hemisphere);
  if(params.centers&&(!originalCenter||!movedCenter))throw new Error('Connect both Mean center results to Compare point sets.');
  const first=originalCenter||computeMeanCenter(original,params),second=movedCenter||computeMeanCenter(moved,params);
  if(first.crs!==projection.crs||second.crs!==projection.crs||first.count!==original.features.length||second.count!==moved.features.length)throw new Error('Mean center CRS and source counts must match the compared point sets.');
  const a=first.projected,b=second.projected,pumpXY=pumps.features.map(f=>({feature:f,coordinates:projection.forward(f.geometry!.coordinates)}));
  const nearest=(center:Position)=>pumpXY.map(({feature,coordinates})=>({id:feature.id,name:feature.properties.name,distanceM:Math.hypot(center[0]-coordinates[0],center[1]-coordinates[1])})).sort((x,y)=>x.distanceM-y.distanceM||x.id.localeCompare(y.id))[0];
  return {original:structuredClone(original),moved:structuredClone(moved),pumps:structuredClone(pumps),originalMean:first.coordinates,movedMean:second.coordinates,centerShiftM:Math.hypot(a[0]-b[0],a[1]-b[1]),originalNearestPump:nearest(a),movedNearestPump:nearest(b),crs:projection.crs,method:(params.centers?'Compare supplied':'Compute and compare legacy')+' unweighted mean centers with Euclidean distances in metres. Pump layer is contextual, not evidence of historical pump use.'};
}

const quantity=(metres:number)=>`[ a qudt:QuantityValue; qudt:numericValue ${metres.toFixed(9)}; qudt:unit <http://qudt.org/vocab/unit/M> ]`;
export function comparisonReceipt(node:WorkflowNode<'compare_point_sets'>,value:PointComparison,runId:string,sources:{original:string;moved:string;pumps:string;originalCenter?:string;movedCenter?:string}):Receipt{
  const activity=`urn:fieldwork:run:${runId}:output:${node.id}:activity`,entity=`urn:fieldwork:run:${runId}:output:${node.id}`;
  const center=(which:'original'|'moved',coords:Position)=>`<${entity}:${which}-mean> a geo:Geometry; geo:asWKT ${JSON.stringify('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT ('+coords.join(' ')+')')}^^geo:wktLiteral.\n`;
  const used=[sources.original,sources.moved,sources.pumps,sources.originalCenter,sources.movedCenter].filter(Boolean).map(id=>`<urn:fieldwork:run:${runId}:output:${id}>`).join(', ');
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n<${activity}> a fw:PointSetComparison, prov:Activity; prov:used ${used}; fw:computationCRS ${JSON.stringify(value.crs)}; fw:inputCount ${value.original.features.length}; fw:referenceCount ${value.pumps.features.length}; fw:centerShift ${quantity(value.centerShiftM)}; fw:originalNearestPumpDistance ${quantity(value.originalNearestPump.distanceM)}; fw:movedNearestPumpDistance ${quantity(value.movedNearestPump.distanceM)}.\n<${entity}> a fw:PointComparisonResult, prov:Entity; prov:wasGeneratedBy <${activity}>; fw:originalMeanCenter <${entity}:original-mean>; fw:movedMeanCenter <${entity}:moved-mean>; fw:originalNearestPumpId ${JSON.stringify(value.originalNearestPump.id)}; fw:movedNearestPumpId ${JSON.stringify(value.movedNearestPump.id)}.\n${center('original',value.originalMean)}${center('moved',value.movedMean)}`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:value.method};
}

export function comparisonMap(node:WorkflowNode<'comparison_map'>,value:PointComparison,runId:string,source:string):{value:DisplayValue;receipt:Receipt}{
  const activity=`urn:fieldwork:run:${runId}:output:${node.id}:view`,entity=`urn:fieldwork:run:${runId}:output:${node.id}`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n<${activity}> a fw:MapView, prov:Activity; prov:used <urn:fieldwork:run:${runId}:output:${source}>.\n<${entity}> a prov:Entity; prov:wasGeneratedBy <${activity}>.\n`;
  return {value:{comparison:value,rows:[],centers:[],method:'Side-by-side presentation of computed point comparison; shared extent and scale.'},receipt:{nodeId:node.id,kind:'presentation',facts,input:facts,rules:'',conclusions:[],method:'Display existing comparison and source/context points without recomputing centers or distances.'}};
}
