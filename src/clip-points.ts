import type {Boundary,PointCollection,PointFeature,WorkflowNode} from './types.js';
import {pointRelation,GEOSPARQL_PREDICATE} from './spatial-predicates.js';
import type {Receipt} from './results.js';

/** Keeping the points that are in the area, as a step you can see.
 *
 *  The practitioner, 2026-10-20, on finding 526 of 961 retrieved health facilities standing
 *  outside North Kivu: *"We do not have a point in polygon process."* -- and then, on being shown
 *  `pointRelation`: *"I mean widget."*
 *
 *  Both halves are right. The PREDICATE has existed since the coverage check: `pointRelation` in
 *  spatial-predicates.ts, used by catchments, the map, input data, the raster mask and the
 *  coverage check, with the OGC names GeoSPARQL exposes beside this project's own. What did not
 *  exist is an OPERATION. Eleven widgets output a point layer and none of them answered "keep the
 *  ones inside this area": `coverage_check` REPORTS membership and outputs a review,
 *  `summarize_points_to_polygon` COUNTS it, and a map draws the split. So the decision could be
 *  read and could not be made -- except inside whatever widget happened to make it privately,
 *  which is how it came to be buried in a source widget with no node on the canvas and no receipt
 *  of its own.
 *
 *  A point ON the border is kept by default. `pointRelation` names three relations and the middle
 *  one is the reason it exists: a facility on a provincial boundary is in that jurisdiction's
 *  edge, not outside it, and a filter that silently folded `Boundary` into one side or the other
 *  would be answering a question nobody asked. It is a parameter because the opposite choice is
 *  defensible -- a strict `within` is what GeoSPARQL's `sfWithin` means -- and because the two
 *  give different counts on exactly the data where it matters. */
export interface ClipPointsResult {collection:PointCollection; inside:number; boundary:number; outside:number;
  /** The features the area set aside, carried so a map can DRAW them while nothing downstream
   *  RECEIVES them. The practitioner, 2026-10-20: *"clip_points_to_area can have a knob that
   *  shows which points are outside but still exclude them in the output."* A count tells you how
   *  many you lost; the points tell you whether losing them was right -- a cluster across one
   *  border reads differently from a scatter in every direction, and that judgement cannot be
   *  made from the number 526. */
  excluded:PointFeature[]}

export function clipPointsToArea(points:PointCollection,area:Boundary,keepBoundary:boolean):ClipPointsResult{
  const kept:PointFeature[]=[],excluded:PointFeature[]=[];
  let inside=0,boundary=0,outside=0;
  for(const feature of points.features||[]){
    const relation=pointRelation(feature.geometry?.coordinates,area);
    if(relation==='Inside'){inside++;kept.push(feature);continue;}
    if(relation==='Boundary'){boundary++;if(keepBoundary)kept.push(feature);else excluded.push(feature);continue;}
    // MissingLocation is counted with Outside and said separately in the receipt: a record with
    // no coordinates is not outside the area, it is unplaceable, and the two are different
    // failures. It cannot be kept by a spatial test either way.
    outside++;
    if(feature.geometry)excluded.push(feature);
  }
  return {collection:{...points,features:kept},inside,boundary,outside,excluded};
}

export function clipPointsReceipt(node:WorkflowNode<'clip_points_to_area'>,result:ClipPointsResult,
  runId:string,areaNodeId:string,pointsNodeId:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`;
  const kept=result.inside+(node.params.keepBoundary?result.boundary:0);
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n`
    +`@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`<${activity}> a fw:PointInPolygonClip, prov:Activity; `
    +`prov:used <urn:fieldwork:run:${runId}:output:${areaNodeId}>, <urn:fieldwork:run:${runId}:output:${pointsNodeId}>; `
    +`fw:spatialPredicate ${JSON.stringify(GEOSPARQL_PREDICATE.Inside)}; `
    +`fw:boundaryPointsKept ${node.params.keepBoundary}; `
    +`fw:insideCount ${result.inside}; fw:boundaryCount ${result.boundary}; fw:outsideCount ${result.outside}.\n`
    +`<${entity}> a fw:PointDataset, prov:Entity; fw:recordCount ${kept}; prov:wasGeneratedBy <${activity}>.\n`;
  return {nodeId:node.id,kind:'presentation',facts,input:facts,rules:'',conclusions:[],
    method:`Point-in-polygon against the study area: ${result.inside} inside, ${result.boundary} on the boundary `
      +`(${node.params.keepBoundary?'kept':'dropped'}), ${result.outside} outside or without coordinates. `
      +`The test is the same one the coverage check and the map use, so a point counted inside here is inside there.`};
}
