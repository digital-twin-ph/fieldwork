import {metricCRSAssertion} from './metric-crs.js';
import type {Boundary,Position,WorkflowNode} from './types.js';
import type {Catchment,Polygons} from './catchments.js';
import {metric} from './catchments.js';
import {ringAreaM2} from './convex-hull.js';
import type {Receipt} from './results.js';
import * as polygonClipping from 'polyclip-ts';

type ClipPolygon=[number,number][][];

/** Overlapping and touching areas become one; separate areas stay separate.
 *
 *  GIS calls this dissolve. It answers "is anywhere reached", and deliberately not
 *  "how well is anywhere reached" — two catchments overlapping means two facilities
 *  cover the same ground, and combining them erases that. Both the summed area of
 *  the parts and the combined area are reported, so the overlap is a number rather
 *  than something a reader has to infer. */

const ringsOf=(geometry:Boundary):Position[][][]=>
  geometry.type==='MultiPolygon'?geometry.coordinates as Position[][][]
    :[geometry.coordinates as Position[][]];

export function validateCombinedAreaNode(node:WorkflowNode<'summarize_combined_area'>):void{
  const {zone,hemisphere}=node.params;
  if(!Number.isInteger(zone)||zone<1||zone>60||!['north','south'].includes(hemisphere))
    throw new Error('Choose a UTM zone from 1 to 60 and a hemisphere.');
  if(typeof node.params.label!=='string'||!node.params.label.trim()||node.params.label.length>60)
    throw new Error('Name the combined area using 1–60 characters.');
}

export function combinedArea(
  input:Polygons, node:WorkflowNode<'summarize_combined_area'>, runId:string, sourceNodeId:string,
):{value:Polygons;receipt:Receipt}{
  validateCombinedAreaNode(node);
  const {zone,hemisphere}=node.params;
  const parts=input.features.filter(f=>f.geometry);
  if(!parts.length)throw new Error('There are no areas to combine.');
  const projection=metric(zone,hemisphere);
  const project=(rings:Position[][]):ClipPolygon=>
    rings.map(r=>r.map(p=>projection.forward(p) as [number,number]));
  const projected=parts.flatMap(f=>ringsOf(f.geometry).map(project));
  const combined=(projected.length===1?[projected[0]]
    :polygonClipping.union(projected[0],...projected.slice(1))) as ClipPolygon[];
  // Net of holes, as the combined area is. Summing only outer rings here reported a
  // single hole-bearing area as overlapping itself: a 200 m square with a 50 m hole came
  // out as 40,000 m² of parts against 37,500 m² combined, and 2,500 m² "covered more than
  // once" with nothing to overlap. Reachable corridors keep their holes, so the isochrone
  // chain hit this on its union step.
  const netArea=(rings:Position[][]):number=>
    rings.reduce((net,ring,i)=>net+(i===0?ringAreaM2(ring):-ringAreaM2(ring)),0);
  const partsArea=projected.reduce((total,rings)=>total+netArea(rings),0);
  const combinedAreaM2=combined.reduce((total,rings)=>total+netArea(rings),0);
  const geometry:Boundary={type:'MultiPolygon',
    coordinates:combined.map(rings=>rings.map(r=>r.map(p=>projection.inverse(p))))};
  const overlapM2=partsArea-combinedAreaM2;
  const notes=[
    `${parts.length} area${parts.length===1?'':'s'} combined into ${combined.length} separate piece${combined.length===1?'':'s'}, in ${projection.crs}.`,
    `The parts cover ${partsArea.toFixed(0)} m² between them and ${combinedAreaM2.toFixed(0)} m² once combined.`
      // Said only when there is something to say: "0 m² was covered more than once" is noise
      // on the common case, and both areas are already stated for anyone subtracting.
      +(overlapM2>=1?` ${overlapM2.toFixed(0)} m² was covered more than once.`:''),
    'Combining answers whether anywhere is covered, not how well. Two areas overlapping meant two things reached the same ground, and that is now gone.',
    'What distinguished the parts — which facility, which site — is discarded. That is the operation, not a defect.',
  ];
  const feature:Catchment={id:'combined',name:node.params.label,siteId:'combined',geometry,
    areaSquareMetres:Number(combinedAreaM2.toFixed(2))};
  const value:Polygons={features:[feature],sites:[],
    method:`Union of ${parts.length} areas in ${projection.crs}`,crs:projection.crs,notes,
    siteSourceNodeId:sourceNodeId};
  const activity=`<urn:fieldwork:run:${runId}:${node.id}:combined>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n`
    +`${activity} a fw:CombinedArea, prov:Activity; `
    +`fw:partCount ${parts.length}; `
    +`fw:combinedPieceCount ${combined.length}; `
    +`fw:partsAreaSquareMetres ${partsArea.toFixed(2)}; `
    +`fw:combinedAreaSquareMetres ${combinedAreaM2.toFixed(2)}; `
    +metricCRSAssertion(projection.crs)
    +`prov:used <urn:fieldwork:run:${runId}:${sourceNodeId}>.\n`;
  return {value,receipt:{nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`${value.method}. ${notes.slice(1).join(' ')}`}};
}
