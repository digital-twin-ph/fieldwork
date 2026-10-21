import type {Boundary,PointCollection,PointFeature,Position,Workflow,WorkflowNode} from './types.js';
import {pointRelation,GEOSPARQL_PREDICATE} from './spatial-predicates.js';
import type {Receipt} from './results.js';
import {bboxPolygon} from './study-area.js';

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
    if(feature.geometry)outside++;else missing++;
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

/** The worked example this widget inherited when `coverage_check` was retired on 2026-10-21.
 *
 *  Four records, one of each kind the spatial relation can take -- inside, exactly on the
 *  boundary, outside, and one with no location at all -- so the exercise shows what a clip keeps,
 *  what it sets aside and what it cannot judge. It kept the same four records and the same box the
 *  coverage exercise used, because the point of the exercise is the four cases and not the widget
 *  that reported them. The map draws what was excluded, which is what made the check redundant. */
export function clipExercise():Workflow{
  const feature=(id:string,name:string,coordinates:Position|null):PointFeature=>
    ({type:'Feature',id,properties:{name},geometry:coordinates?{type:'Point',coordinates}:null});
  return {schema:'fieldwork/workflow/1',exampleId:'coverage',name:'Points inside an area · synthetic exercise',nodes:[
    {id:'scope',type:'study_area',x:40,y:40,params:{source:'drawn',label:'Illustrative Old Naledi study box',selectionMode:'bbox',geometry:bboxPolygon(25.89,-24.7,25.91,-24.68)}},
    {id:'observations',type:'point_input',x:40,y:230,params:{label:'Synthetic coverage records',data:{type:'FeatureCollection' as const,features:[
      feature('inside','Inside example',[25.9,-24.69]),feature('edge','Boundary example',[25.91,-24.69]),
      feature('outside','Outside example',[25.92,-24.69]),feature('missing','Missing-location example',null)]}}},
    {id:'clip',type:'clip_points_to_area',x:380,y:120,params:{label:'Keep points inside the area',keepBoundary:true,showExcluded:true}},
    {id:'map',type:'map_output',x:720,y:120,params:{label:'Map of the points kept'}},
  ],edges:[
    {id:'scope-link',from:'scope',to:'clip',port:'area'},
    {id:'points-link',from:'observations',to:'clip',port:'points'},
    {id:'map-area',from:'scope',to:'map',port:'area'},
    {id:'map-points',from:'clip',to:'map',port:'points'},
  ]};
}
