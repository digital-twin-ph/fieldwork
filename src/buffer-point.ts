/** A study area defined as everything within a stated distance of one named point.
 *
 *  The output is a scope like any other, so it is `fw:StudyArea`. But its edge is a decision and
 *  its radius an assumption of the question, where an imported administrative boundary has a
 *  survey behind it — so the receipt carries the source point and the distance, letting a reader
 *  tell a construct from a jurisdiction. See docs/experiments/68-area-around-a-point.md. */
import {buffer} from '@turf/buffer';
import {area as turfArea} from '@turf/area';
import type {AreaValue,Receipt} from './results.js';
import type {Boundary,PointCollection,WorkflowNode} from './types.js';
import {geometryWKT,CRS84,geometryBounds} from './study-area.js';
import {validateBuffer} from './area-buffer.js';

/** Turf's `steps` is per quadrant. Measured 2026-10-09 at a 5 km radius: 8 steps gives 32
 *  vertices and 99.36% of the true circle area, 32 gives 128 vertices and 99.96%. `buffer_area`
 *  uses 8, which is ample when expanding an existing boundary; here the edge decides membership,
 *  so the finer setting is used and the figure is recorded rather than implied. */
export const BUFFER_POINT_STEPS=32;

const text=(value:unknown)=>typeof value==='string'?value.trim():'';

/** Draft validation. A node just added has no point chosen yet and must remain addable. */
export function validateBufferPointNode(node:WorkflowNode<'buffer_point'>):void{
  validateBuffer(node.params.distanceM);
}

/** What must hold to run. */
export function requireRunnableBufferPoint(node:WorkflowNode<'buffer_point'>):void{
  validateBufferPointNode(node);
  if(!text(node.params.pointId))throw new Error('Choose which point defines the area for Area around a point.');
}

export function bufferPoint(points:PointCollection,node:WorkflowNode<'buffer_point'>,runId:string):{value:AreaValue;receipt:Receipt}{
  requireRunnableBufferPoint(node);
  const wanted=text(node.params.pointId);
  // One point, never a union: the bounding box of several distant points makes the raster window
  // useless. Measured — three Philippine gauges span 5.1 x 9.0 degrees, which the 262,144-cell
  // cap serves at a 1,469 m cell, against 19 m for a single 5 km scope.
  const feature=points.features.find(f=>String(f.id)===wanted||text(f.properties?.name)===wanted);
  if(!feature)throw new Error(`The connected layer has no point called "${wanted}". Area around a point uses one named point and never combines several.`);
  const coordinates=feature.geometry?.coordinates;
  if(!coordinates)throw new Error(`"${wanted}" has no coordinates, so it cannot define an area.`);
  const distanceM=node.params.distanceM;
  const result=buffer({type:'Feature',properties:{},geometry:{type:'Point',coordinates}},distanceM,
    {units:'meters',steps:BUFFER_POINT_STEPS});
  if(!result||result.type!=='Feature')throw new Error('The buffer did not produce a valid boundary.');
  const boundary=result.geometry as Boundary;
  const bounds=geometryBounds(boundary);
  if(bounds[2]-bounds[0]>1||bounds[3]-bounds[1]>1||Math.abs(bounds[1])>80||Math.abs(bounds[3])>80)
    throw new Error('This prototype supports local study areas spanning at most one degree, below 80° latitude.');
  const ideal=Math.PI*distanceM*distanceM;
  const fraction=ideal?turfArea(result)/ideal:1;
  const areaId=`urn:fieldwork:run:${runId}:output:${node.id}`,geometryId=areaId+':geometry',activity=areaId+':pointbuffer';
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix qudt: <http://qudt.org/schema/qudt/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`<${activity}> a fw:PointBuffer, prov:Activity; `
    +`fw:method "Turf local buffer of one point, ${BUFFER_POINT_STEPS} steps per quadrant"; `
    +`fw:sourcePoint ${JSON.stringify(wanted)}; `
    +`fw:circleAreaFraction "${fraction.toFixed(4)}"^^xsd:decimal; `
    +`fw:bufferDistance [ a qudt:QuantityValue; qudt:numericValue ${distanceM}; qudt:unit <http://qudt.org/vocab/unit/M> ].\n`
    +`<${areaId}> a fw:StudyArea, geo:Feature; prov:wasGeneratedBy <${activity}>; geo:hasGeometry <${geometryId}>.\n`
    +`<${geometryId}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(boundary))}^^geo:wktLiteral.\n`;
  return {
    value:{kind:'study-area',boundary,areaId,geometryId,label:node.params.label,bounds,rows:[],centers:[],
      spatialReference:undefined},
    receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
      method:`Everything within ${distanceM} m of "${wanted}". A derived scope, not a surveyed boundary: its edge is a decision and its radius an assumption of the question. The polygon approximates the circle with ${BUFFER_POINT_STEPS} steps per quadrant, covering ${(fraction*100).toFixed(2)}% of its area.`},
  };
}
