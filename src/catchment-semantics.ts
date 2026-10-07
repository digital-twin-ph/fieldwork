import type {Network,Polygons} from './catchments.js';
import type {WorkflowNode} from './types.js';
import {geometryWKT,CRS84} from './study-area.js';
const lit=JSON.stringify;
const quantity=(value:number,unit:string)=>`[ a qudt:QuantityValue; qudt:numericValue "${value}"^^xsd:double; qudt:unit <http://qudt.org/vocab/unit/${unit}> ]`;

export function catchmentSemantics(node:WorkflowNode,value:Network|Polygons,entity:string,activity:string,runId:string):string{
  let facts='@prefix qudt: <http://qudt.org/schema/qudt/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n';
  if('nodes' in value){
    facts+=`<${entity}> a fw:StreetNetwork; fw:directed true.\n`;
    for(const n of value.nodes){const id=`${entity}:node:${encodeURIComponent(n.id)}`;
      facts+=`<${entity}> fw:networkNode <${id}>.\n<${id}> a fw:NetworkVertex, geo:Feature; dcterms:identifier ${lit(n.id)}; geo:hasGeometry [ a geo:Geometry; geo:asWKT ${lit('<'+CRS84+'> POINT ('+n.coordinates.join(' ')+')')}^^geo:wktLiteral ].\n`;
    }
    value.edges.forEach((e,i)=>{const id=`${entity}:edge:${i}`;facts+=`<${entity}> fw:networkEdge <${id}>.\n<${id}> a fw:NetworkEdge; fw:fromVertex <${entity}:node:${encodeURIComponent(e.from)}>; fw:toVertex <${entity}:node:${encodeURIComponent(e.to)}>; fw:edgeLength ${quantity(e.lengthM,'M')}.\n`;
      if(e.geometry)facts+=`<${id}> geo:hasGeometry [ a geo:Geometry; geo:asWKT ${lit('<'+CRS84+'> LINESTRING ('+e.geometry.map(c=>c.join(' ')).join(', ')+')')}^^geo:wktLiteral ].\n`;
    });
    return facts;
  }
  facts+=`<${entity}> a fw:CatchmentDataset, geo:FeatureCollection; fw:countSemantics ${lit(value.features.some(f=>f.minutes!==undefined)?'cumulative-threshold-memberships':'all-polygon-memberships')}.\n`;
  for(const f of value.features){const id=`${entity}:cell:${encodeURIComponent(f.id)}`;facts+=`<${id}> a fw:Catchment; dcterms:title ${lit(f.name)}.\n`;
    if(value.siteSourceNodeId)facts+=`<${id}> fw:sourceSite <urn:fieldwork:run:${runId}:output:${value.siteSourceNodeId}:record:${encodeURIComponent(f.siteId)}>.\n`;
    if(f.minutes!==undefined)facts+=`<${id}> fw:travelTime ${quantity(f.minutes,'MIN')}.\n`;
  }
  if(node.type==='isochrone'){
    const p=node.params;facts+=`<${activity}> fw:travelDirection ${lit(p.direction)}; fw:fillInteriorHoles ${p.fillHoles??false}; fw:corridorWidth ${quantity(p.bufferM,'M')}; fw:snapLimit ${quantity(p.maxSnapM,'M')}; fw:walkingSpeed ${quantity(p.speedMPerMin/60,'M-PER-SEC')}.\n`;
    for(const minutes of p.thresholds?.length?p.thresholds:[p.minutes])facts+=`<${activity}> fw:timeBudget ${quantity(minutes,'MIN')}.\n`;
    for(const snap of value.snaps||[])facts+=`<${activity}> fw:snap [ a fw:NetworkSnap; fw:siteId ${lit(snap.siteId)}; fw:networkVertexId ${lit(snap.nodeId)}; fw:snapDistance ${quantity(snap.distanceM,'M')} ].\n`;
  }
  if(node.type==='clip_polygons'&&value.boundary)facts+=`<${activity}> fw:clipGeometry [ a geo:Geometry; geo:asWKT ${lit('<'+CRS84+'> '+geometryWKT(value.boundary))}^^geo:wktLiteral ].\n`;
  if(node.type==='summarize_polygons'&&value.summary){const s=value.summary;
    facts+=`<${activity}> fw:boundaryPolicy ${lit(node.params.boundary)}; fw:valueField ${lit(s.valueField)}.\n<${entity}> fw:inputRecordCount ${s.records}; fw:matchedRecordCount ${s.matched}; fw:outsideRecordCount ${s.unmatched}; fw:missingLocationCount ${s.missingLocation}; fw:multipleMembershipCount ${s.multiple}.\n`;
  }
  return facts;
}
