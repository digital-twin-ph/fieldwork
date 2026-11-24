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
  /** Records with no usable location. Counted apart from `outside`, because a record that is not
   *  in the area and a record nobody could place are different failures and call for different
   *  work -- one is a boundary question, the other is a data question. They were folded into
   *  `outside` until 2026-10-21, with a comment claiming the receipt said so separately; it did
   *  not. */
  missing:number;
  /** The features the area set aside, carried so a map can DRAW them while nothing downstream
   *  RECEIVES them. The practitioner, 2026-10-20: *"clip_points_to_area can have a knob that
   *  shows which points are outside but still exclude them in the output."* A count tells you how
   *  many you lost; the points tell you whether losing them was right -- a cluster across one
   *  border reads differently from a scatter in every direction, and that judgement cannot be
   *  made from the number 526. */
  excluded:PointFeature[]}

/** THE SAME CLIP, MASKED BY A POLYGON LAYER instead of one study area (2026-11-24).
 *
 *  The practitioner, with health facilities and a 10-mile buffer of the South Sudan–DR Congo border: *"I can find
 *  the facilities using the study area and extract the facilities within the buffer polygon. That is the intended
 *  workflow."* It could not be built. Every clip in the tree masks by an `area` — `clip_points_to_area`,
 *  `clip_polygons`, `clip_raster` — and a buffer around 656 km of border spans 3.59°, which the one-degree scope
 *  limit rightly refuses to call a study area because a study area windows every raster in the workflow. So the
 *  buffer could only be a polygon layer, and nothing clips by one. Two rules, each correct alone, met in a dead end.
 *
 *  A POLYGON LAYER WINDOWS NO RASTER, so the limit that blocked the scope has nothing to say here, and the
 *  operation is the one that already exists: a point is kept where it falls inside the mask. Only the shape of the
 *  mask differs, which is why this extends the clip rather than adding a widget beside it.
 *
 *  WHICH POLYGON KEPT IT is recorded on the point. A layer is many masks, and "inside the buffer" loses the thing a
 *  border question is actually asking — WHICH stretch of border this facility is near. The study-area clip has one
 *  mask and nothing to name, so it writes nothing and is unchanged. */
export function clipPointsToPolygons(points:PointCollection,polygons:{features:readonly {id?:unknown;name?:unknown;geometry:Boundary}[]},
  keepBoundary:boolean,attribute='inside_polygon'):ClipPointsResult{
  const kept:PointFeature[]=[],excluded:PointFeature[]=[];
  let inside=0,boundary=0,outside=0,missing=0;
  for(const feature of points.features||[]){
    let held:{name:string;relation:'Inside'|'Boundary'}|undefined;
    for(const polygon of polygons.features||[]){
      const relation=pointRelation(feature.geometry?.coordinates,polygon.geometry);
      if(relation==='MissingLocation'){held=undefined;break;}
      if(relation==='Inside'||relation==='Boundary'){
        const name=String(polygon.name??polygon.id??'').trim();
        // INSIDE BEATS BOUNDARY, and the first polygon that holds it outright is the one named: a point on the
        // seam of two buffers is inside one of them, and reporting it as a boundary case of whichever came first
        // would make the answer depend on the layer's order.
        if(!held||relation==='Inside'&&held.relation==='Boundary')held={name,relation};
        if(relation==='Inside')break;
      }
    }
    const where=feature.geometry?.coordinates;
    if(!held){
      if(pointRelation(where,(polygons.features?.[0]?.geometry)??{type:'Polygon',coordinates:[]} as Boundary)==='MissingLocation'||!where)missing++;
      else outside++;
      excluded.push(feature);continue;
    }
    if(held.relation==='Inside'){inside++;kept.push({...feature,properties:{...feature.properties,[attribute]:held.name}});continue;}
    boundary++;
    if(keepBoundary)kept.push({...feature,properties:{...feature.properties,[attribute]:held.name}});
    else excluded.push(feature);
  }
  return {collection:{...points,features:kept},inside,boundary,outside,missing,excluded};
}

export function clipPointsToArea(points:PointCollection,area:Boundary,keepBoundary:boolean):ClipPointsResult{
  const kept:PointFeature[]=[],excluded:PointFeature[]=[];
  let inside=0,boundary=0,outside=0,missing=0;
  for(const feature of points.features||[]){
    const relation=pointRelation(feature.geometry?.coordinates,area);
    if(relation==='Inside'){inside++;kept.push(feature);continue;}
    if(relation==='Boundary'){boundary++;if(keepBoundary)kept.push(feature);else excluded.push(feature);continue;}
    // A record with no coordinates is not outside the area, it is unplaceable: counted on its
    // own and CARRIED, so a map lists it as a record it could not plot. Dropping it here made it
    // disappear from everything downstream except a number -- which is the silent loss a clip is
    // supposed to prevent, not commit.
    // Keyed on the RELATION, not on whether a geometry object exists. A feature carrying
    // `[NaN,NaN]` has a geometry and no location, and counting it outside said something about a
    // place when the finding was about the data.
    if(relation==='MissingLocation')missing++;else outside++;
    excluded.push(feature);
  }
  return {collection:{...points,features:kept},inside,boundary,outside,missing,excluded};
}

export function clipPointsReceipt(node:WorkflowNode<'clip_points_to_area'>,result:ClipPointsResult,
  runId:string,areaNodeId:string,pointsNodeId:string,areaFacts?:string):Receipt{
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`;
  const kept=result.inside+(node.params.keepBoundary?result.boundary:0);
  // THE AREA'S OWN FACTS COME FIRST. The retired coverage check prepended `area.areaFacts`, so a
  // measured study area carried its geo:hasMetricArea into the receipt of the step that used it.
  // This widget did not, and the retirement would have quietly dropped that provenance: a reader
  // of a clip receipt could see which area was used and not what was known about it.
  const facts=(areaFacts||'')+`@prefix fw: <urn:fieldwork:>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n`
    +`@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`<${activity}> a fw:PointInPolygonClip, prov:Activity; `
    +`prov:used <urn:fieldwork:run:${runId}:output:${areaNodeId}>, <urn:fieldwork:run:${runId}:output:${pointsNodeId}>; `
    +`fw:spatialPredicate ${JSON.stringify(GEOSPARQL_PREDICATE.Inside)}; `
    +`fw:boundaryPointsKept ${node.params.keepBoundary}; `
    +`fw:insideCount ${result.inside}; fw:boundaryCount ${result.boundary}; fw:outsideCount ${result.outside}; `
    +`fw:missingLocationCount ${result.missing}.\n`
    +`<${entity}> a fw:PointDataset, prov:Entity; fw:recordCount ${kept}; prov:wasGeneratedBy <${activity}>.\n`;
  return {nodeId:node.id,kind:'presentation',facts,input:facts,rules:'',conclusions:[],
    method:`Point-in-polygon against the study area: ${result.inside} inside, ${result.boundary} on the boundary `
      +`(${node.params.keepBoundary?'kept':'dropped'}), ${result.outside} outside and ${result.missing} without a usable location. `
      +`The test is the same one the map uses, so a point counted inside here is inside there.`};
}

