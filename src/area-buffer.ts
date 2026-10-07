import {buffer} from '@turf/buffer';
import type {AreaValue,Receipt} from './results.js';
import type {Boundary,WorkflowNode,Position} from './types.js';
import {geometryWKT,CRS84,bboxPolygon,geometryBounds} from './study-area.js';
export function validateBuffer(distanceM:number){if(!Number.isFinite(distanceM)||distanceM<0||distanceM>5000)throw new Error('Study-area buffer must be 0–5,000 metres.');}
export function bufferedBoundary(boundary:Boundary,distanceM:number):Boundary{
  validateBuffer(distanceM);if(!distanceM)return structuredClone(boundary);
  const bounds=geometryBounds(boundary);if(bounds[2]-bounds[0]>1||bounds[3]-bounds[1]>1||Math.abs(bounds[1])>80||Math.abs(bounds[3])>80)throw new Error('Buffer prototype supports local study areas spanning at most one degree, below 80 degrees latitude.');
  const result=buffer(boundary,distanceM,{units:'meters',steps:8});if(!result||result.type!=='Feature')throw new Error('Study-area buffer did not produce a valid boundary.');return result.geometry;
}
export function bufferArea(node:WorkflowNode<'buffer_area'>,source:AreaValue,runId:string):{value:AreaValue;receipt:Receipt}{
  const boundary=bufferedBoundary(source.boundary,node.params.distanceM),areaId=`urn:fieldwork:run:${runId}:output:${node.id}`,geometryId=areaId+':geometry',activity=areaId+':buffer';
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n<${activity}> a fw:AreaBuffer, prov:Activity; fw:method "Turf/JSTS local azimuthal equidistant metre buffer; 8 quadrant segments"; prov:used <${source.areaId}>; fw:bufferDistance [ a qudt:QuantityValue; qudt:numericValue ${node.params.distanceM}; qudt:unit <http://qudt.org/vocab/unit/M> ].\n<${areaId}> a fw:StudyArea, geo:Feature; prov:wasGeneratedBy <${activity}>; prov:wasDerivedFrom <${source.areaId}>; geo:hasGeometry <${geometryId}>.\n<${geometryId}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(boundary))}^^geo:wktLiteral.\n`;
  return {value:{kind:'study-area',boundary,areaId,geometryId,label:node.params.label,bounds:geometryBounds(boundary),rows:[],centers:[],spatialReference:structuredClone(source.spatialReference)},receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:'Turf/JSTS metre buffer using a local azimuthal equidistant projection, 8 quadrant segments; source reporting boundary unchanged.'}};
}
/** Axis-aligned CRS84 box; dimensions approximate ground distances at its centre. */
export function dimensionedBox(center:Position,widthM:number,heightM:number){
  if(center.length!==2||!center.every(Number.isFinite)||Math.abs(center[1])>80||![widthM,heightM].every(v=>Number.isFinite(v)&&v>=1&&v<=50000))throw new Error('Use a centre below 80° latitude and dimensions from 1 to 50,000 metres.');
  const dy=heightM/111195/2,dx=widthM/(111195*Math.cos(center[1]*Math.PI/180))/2;return bboxPolygon(center[0]-dx,center[1]-dy,center[0]+dx,center[1]+dy);
}
