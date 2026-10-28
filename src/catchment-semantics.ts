import type {Network,Polygons} from './catchments.js';
import type {WorkflowNode} from './types.js';
import {geometryWKT,CRS84} from './study-area.js';
const lit=JSON.stringify;
const quantity=(value:number,unit:string)=>`[ a qudt:QuantityValue; qudt:numericValue "${value}"^^xsd:double; qudt:unit <http://qudt.org/vocab/unit/${unit}> ]`;

export function catchmentSemantics(node:WorkflowNode,value:Network|Polygons,entity:string,activity:string,runId:string):string{
  let facts='@prefix qudt: <http://qudt.org/schema/qudt/>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n';
  if('nodes' in value){
    /* THE GRAPH IS IDENTIFIED, NOT TRANSCRIBED.
     *
     * This emitted one statement per junction and one per segment: a NetworkVertex with a WKT
     * POINT for every node, a NetworkEdge with its ends and length for every edge. Measured
     * 2026-10-23 against the province the practitioner downloaded -- 984,906 junctions and
     * 2,022,803 segments -- that is 291 characters a junction and 210 a segment, so 711 MB of
     * Turtle built as ONE JavaScript string. V8 refuses past about 512 MB with "Invalid string
     * length", which is why the same province ran in Safari and killed Chrome: JavaScriptCore
     * allows the larger string.
     *
     * The practitioner, on being shown the cost: *"If street network graphs can be validated,
     * perhaps we can avoid storing the network data in N3?"* They can and it does. A receipt
     * exists so a reader can check a claim, and the claim about a street network is that THIS
     * graph, acquired this way, passed these checks. The digest identifies it, the counts and
     * the source describe it, and validateNetwork is what checked it -- all asserted already,
     * a few lines earlier in catchments.ts. Three million triples restating coordinates support
     * none of that; they are the data wearing the costume of evidence.
     *
     * The terms they were written in -- fw:StreetNetwork, fw:directed, fw:NetworkVertex,
     * fw:NetworkEdge -- appear nowhere in ontology/fieldwork.ttl. The most expensive thing this
     * application produced was also undeclared vocabulary.
     *
     * What is lost: an N3 question about one named junction. What is kept: every question about
     * the network as a thing -- which graph, how large, from where, in what travel mode, and
     * whether it passed. The graph itself is in the payload store, addressed by this digest. */
    facts+=`<${entity}> a fw:StreetNetwork; fw:directed true.\n`;
    // WHICH GRAPH HOLDS THE DATA, which is the question a receipt is asked about a network.
    // The digest answers it where the acquisition recorded one; the counts and the source
    // description, asserted beside this, say how large it is and where it came from.
    const provenance=(value as {provenance?:Record<string,unknown>}).provenance;
    const digest=provenance?.sha256;
    if(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest))
      facts+=`<${entity}> fw:sha256 ${lit(digest)}.\n`;
    return facts;
  }
  facts+=`<${entity}> a fw:CatchmentDataset, geo:FeatureCollection; fw:countSemantics ${lit(value.features.some(f=>f.minutes!==undefined)?'cumulative-threshold-memberships':'all-polygon-memberships')}.\n`;
  for(const f of value.features){const id=`${entity}:cell:${encodeURIComponent(f.id)}`;facts+=`<${id}> a fw:Catchment; dcterms:title ${lit(f.name)}.\n`;
    // BOTH CONDITIONS, from 2026-10-28. A layer can name a site source and still hold a feature
    // that came from no site -- a stacked layer mixes producers -- and `siteId` is optional now,
    // so asserting fw:sourceSite from an absent one would have written the string "undefined"
    // into the evidence as a record id.
    if(value.siteSourceNodeId&&f.siteId!==undefined)facts+=`<${id}> fw:sourceSite <urn:fieldwork:run:${runId}:output:${value.siteSourceNodeId}:record:${encodeURIComponent(f.siteId)}>.\n`;
    if(f.minutes!==undefined)facts+=`<${id}> fw:travelTime ${quantity(f.minutes,'MIN')}.\n`;
  }
  if(node.type==='isochrone'){
    const p=node.params;facts+=`<${activity}> fw:travelDirection ${lit(p.direction)}; fw:fillInteriorHoles ${p.fillHoles??false}; fw:corridorWidth ${quantity(p.bufferM,'M')}; fw:snapLimit ${quantity(p.maxSnapM,'M')}; fw:walkingSpeed ${quantity(p.speedMPerMin/60,'M-PER-SEC')}.\n`;
    for(const minutes of p.thresholds?.length?p.thresholds:[p.minutes])facts+=`<${activity}> fw:timeBudget ${quantity(minutes,'MIN')}.\n`;
    for(const snap of value.snaps||[])facts+=`<${activity}> fw:snap [ a fw:NetworkSnap; fw:siteId ${lit(snap.siteId)}; fw:networkVertexId ${lit(snap.nodeId)}; fw:snapDistance ${quantity(snap.distanceM,'M')} ].\n`;
  }
  if(node.type==='clip_polygons'&&value.boundary)facts+=`<${activity}> fw:clipGeometry [ a geo:Geometry; geo:asWKT ${lit('<'+CRS84+'> '+geometryWKT(value.boundary))}^^geo:wktLiteral ].\n`;
  if(node.type==='summarize_points_to_polygon'&&value.summary){const s=value.summary;
    facts+=`<${activity}> fw:boundaryPolicy ${lit(node.params.boundary)}; fw:valueField ${lit(s.valueField)}.\n<${entity}> fw:inputRecordCount ${s.records}; fw:matchedRecordCount ${s.matched}; fw:outsideRecordCount ${s.unmatched}; fw:missingLocationCount ${s.missingLocation}; fw:multipleMembershipCount ${s.multiple}.\n`;
  }
  return facts;
}
