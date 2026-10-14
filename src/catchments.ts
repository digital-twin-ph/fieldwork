import {CRS84_IRI,crsIRIFromName} from './metric-crs.js';
import {catchmentSemantics} from './catchment-semantics.js';
import {buffer as turfBuffer} from '@turf/buffer';
import proj4 from 'proj4';
import * as polygonClipping from 'polyclip-ts';
type ClipPolygon=[number,number][][];
type ClipMultiPolygon=ClipPolygon[];
import type {Boundary,PointCollection,PointFeature,Position,WorkflowNode,NodeDefinition} from './types.js';
import type {Receipt} from './results.js';
import {geometryBounds} from './study-area.js';
import {pointRelation} from './spatial-predicates.js';
import {partial,prepareEdges,reachedStreets} from './network-edges.js';

/** `limits` records the graph ceiling this network was accepted under, so a practitioner who
 *  raised the knob is not refused later by a step that re-validates against the default. The
 *  limit travels on the value for the same reason the distance unit travels on `nearest`'s
 *  output: a graph of 4,000 junctions is not interpretable without knowing it was allowed. */
export interface Network {nodes:{id:string;coordinates:Position}[];edges:{from:string;to:string;lengthM:number;geometry?:Position[]}[];source:string;provenance?:Record<string,unknown>;limits?:{maxNodes:number;maxEdges:number}}

/** The default graph ceiling, and the only value measured. Raising it is a knob rather than a
 *  widget by the test experiment 107 derived -- the contract does not move with it: ports, output
 *  carrier and behaviour are unchanged and only what is admitted changes, which is what a
 *  threshold does. It is a knob rather than a fixed cap because the failure it guards is now
 *  contained: isochrone runs in a Worker with a 45-second timeout, so exceeding it fails one step
 *  rather than the tab.
 *
 *  Measured 2026-10-13: 2,000 junctions is the tested ceiling, and a 1 km square of central London
 *  normalizes to 5,249 junctions, which exhausted a 4 GB heap during isochrone construction. So
 *  anything above about 3,000 is untested ground and the interface says so rather than pretending
 *  the range is uniform. */
export const NETWORK_NODE_LIMIT=2000;
/** Directed segments per junction, from the shipped 2,000/5,000 pair. Measured on real street
 *  data the ratio is 2.19 (11,497 segments over 5,249 junctions), so 2.5 leaves headroom and one
 *  knob governs both rather than asking a practitioner to calibrate two numbers that move
 *  together. */
export const SEGMENTS_PER_NODE=2.5;
export const NETWORK_NODE_LIMIT_MAX=50000;
/** What a response costs per junction it finally yields, measured 2026-10-13 on two real extents
 *  with the tightened query:
 *
 *  | Snow rectangle   | 1.42 MB | 9,458 features  | 5,249 junctions  | 270 B, 1.80 features each |
 *  | Isochrone extent | 7.39 MB | 50,791 features | 27,181 junctions | 272 B, 1.87 features each |
 *
 *  Close enough on two very different areas to derive the download caps from the graph knob rather
 *  than leave three independent numbers that were never measured against each other -- which is how
 *  a 6 km envelope came to sit beside a 2,000-junction cap that no dense urban kilometre could meet.
 *  The multipliers carry roughly double the measured cost as headroom, because a sparse area yields
 *  fewer junctions per byte and must not be refused for it. */
export const BYTES_PER_NODE=600;
export const FEATURES_PER_NODE=4;
/** Never tighter than the limits that shipped, so raising the knob can only widen what is accepted
 *  and a practitioner who never touches it sees exactly the previous behaviour. */
export const downloadLimits=(maxNodes=NETWORK_NODE_LIMIT)=>({
  maxBytes:Math.max(2_000_000,maxNodes*BYTES_PER_NODE),
  maxFeatures:Math.max(15_000,maxNodes*FEATURES_PER_NODE),
});
export const graphLimits=(maxNodes=NETWORK_NODE_LIMIT)=>
  ({maxNodes,maxEdges:Math.round(maxNodes*SEGMENTS_PER_NODE)});
export interface Catchment {id:string;name:string;siteId:string;geometry:Boundary;minutes?:number;count?:number;total?:number;missingValues?:number}
export interface Polygons {kind?:'hexbin';siteSourceNodeId?:string;features:Catchment[];sites:PointFeature[];method:string;crs:string;boundary?:Boundary;notes:string[];observations?:PointCollection;summary?:{records:number;matched:number;unmatched:number;missingLocation:number;multiple:number;valueField:string};snaps?:{siteId:string;nodeId:string;distanceM:number}[]}
export const CATCHMENT_TYPES:Record<'voronoi'|'network_input'|'isochrone'|'clip_polygons'|'summarize_polygons',NodeDefinition>={
  voronoi:{title:'Voronoi catchments',group:'Spatial operations',icon:'◇',color:'teal',description:'Allocate an extent to the nearest site in a metric CRS',inputs:[['area','area'],['sites','points']],output:'polygons'},
  network_input:{title:'Street network',group:'Sources',icon:'⌁',color:'blue',description:'Download OSM by study area or upload a directed graph',inputs:[['area','area']],output:'network'},
  isochrone:{title:'Network isochrone',group:'Spatial operations',icon:'◷',color:'teal',description:'Buffer reachable network segments for a time budget',inputs:[['sites','points'],['network','network']],output:'polygons'},
  clip_polygons:{title:'Clip polygons',group:'Spatial operations',icon:'✂',color:'teal',description:'Intersect each polygon with the study area',inputs:[['area','area'],['polygons','polygons']],output:'polygons'},
  summarize_polygons:{title:'Summarize points in polygons',group:'Summaries',icon:'∑',color:'teal',description:'Count locations and optionally sum a numeric attribute',inputs:[['polygons','polygons'],['points','points']],output:'polygons'}
};
const validId=(s:unknown)=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s);
const coordinate=(p:unknown):p is Position=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=80;
export function validateNetwork(n:Network,maxNodes?:number){
  // Precedence: an explicit argument, then the ceiling the network itself was accepted under, then
  // the default. The middle term is what stops a step downstream of a raised knob from refusing a
  // graph the practitioner deliberately allowed.
  const limits=graphLimits(maxNodes??n?.limits?.maxNodes??NETWORK_NODE_LIMIT);
  if(!n||!Array.isArray(n.nodes)||!Array.isArray(n.edges)||!n.nodes.length||typeof n.source!=='string'||!n.source.trim()||n.source.length>2000)
    throw new Error('A street network needs at least one junction, an array of segments and a source description.');
  if(n.nodes.length>limits.maxNodes||n.edges.length>limits.maxEdges)
    throw new Error(`This street network has ${n.nodes.length} junctions and ${n.edges.length} `
      +`directed segments; the limit is ${limits.maxNodes} and ${limits.maxEdges}. The limit is a `
      +`knob on the Street network widget, so it can be raised to calibrate against your own `
      +`machine. Measured 2026-10-13, a 1 km square of central London normalizes to 5,249 `
      +`junctions and exhausted a 4 GB heap during isochrone construction, so raising it far is `
      +`untested rather than merely slow. Alternatively use a smaller study area, or simplify the `
      +`graph before uploading.`);
  const ids=new Set<string>();for(const p of n.nodes){if(!p||!validId(p.id)||ids.has(p.id)||!coordinate(p.coordinates))throw new Error('Network node IDs and CRS84 coordinates must be valid and unique.');ids.add(p.id);}
  let vertices=0;for(const e of n.edges){if(!e||!ids.has(e.from)||!ids.has(e.to)||!Number.isFinite(e.lengthM)||e.lengthM<=0||e.lengthM>100000)throw new Error('Network edges need known endpoints and positive metre lengths.');if(e.geometry){vertices+=e.geometry.length;if(!Array.isArray(e.geometry)||e.geometry.length<2||!e.geometry.every(coordinate))throw new Error('Invalid edge geometry.');}}
  if(vertices>30000)throw new Error('Network geometry exceeds 30,000 vertices.');
  if(n.provenance!==undefined&&(!n.provenance||typeof n.provenance!=='object'||Array.isArray(n.provenance)||JSON.stringify(n.provenance).length>100000))throw new Error('Invalid or oversized network provenance.');
}
export function validateCatchmentNode(n:WorkflowNode){
  if(Object.hasOwn(CATCHMENT_TYPES,n.type)&&(typeof n.params.label!=='string'||!n.params.label.trim()||n.params.label.length>100))throw new Error('Name the operation using 1–100 characters.');
  if(n.type==='network_input'){
    if(!n.params.data||!Array.isArray(n.params.data.nodes)||!Array.isArray(n.params.data.edges))throw new Error('Invalid network input.');
    if(n.params.maxNodes!==undefined&&(!Number.isInteger(n.params.maxNodes)||n.params.maxNodes<500||n.params.maxNodes>NETWORK_NODE_LIMIT_MAX))throw new Error(`Use a graph limit between 500 and ${NETWORK_NODE_LIMIT_MAX} junctions.`);
    if(n.params.pauseSeconds!==undefined&&(!Number.isFinite(n.params.pauseSeconds)||n.params.pauseSeconds<60||n.params.pauseSeconds>900))throw new Error('Use a 60–900 second pause between OSM requests. 60 is the minimum; it can only be raised.');
    if(n.params.data.nodes.length||n.params.data.edges.length)validateNetwork(n.params.data,n.params.maxNodes);
    if(n.params.marginM!==undefined&&(!Number.isFinite(n.params.marginM)||n.params.marginM<0||n.params.marginM>2000))throw new Error('Use a 0–2,000 metre download margin.');
    if(n.params.inputMethod!==undefined&&!['osm','file'].includes(n.params.inputMethod))throw new Error('Choose OSM download or file upload.');
  }
  if(n.type==='voronoi'||n.type==='isochrone'){if(!Number.isInteger(n.params.zone)||n.params.zone<1||n.params.zone>60||!['north','south'].includes(n.params.hemisphere))throw new Error('Choose a UTM zone 1–60 and hemisphere.');}
  if(n.type==='isochrone'){const p=n.params;if(![p.minutes,p.speedMPerMin,p.bufferM,p.maxSnapM].every(Number.isFinite)||p.minutes<.1||p.minutes>60||p.speedMPerMin<1||p.speedMPerMin>200||p.bufferM<1||p.bufferM>100||p.maxSnapM<0||p.maxSnapM>1000||!['outbound','inbound'].includes(p.direction))throw new Error('Use 0.1–60 minutes, 1–200 m/min, 1–100 m buffer and 0–1,000 m snap limit.');}
  if(n.type==='isochrone'){const p=n.params;if(p.thresholds!==undefined&&(!Array.isArray(p.thresholds)||p.thresholds.length>6||p.thresholds.some((t,i,a)=>!Number.isFinite(t)||t<.1||t>60||(i>0&&t<=a[i-1]))))throw new Error('Use up to six increasing, unique time thresholds between 0.1 and 60 minutes.');if(p.fillHoles!==undefined&&typeof p.fillHoles!=='boolean')throw new Error('Invalid infill option.');}
  if(n.type==='summarize_polygons'&&(!['include','exclude'].includes(n.params.boundary)||typeof n.params.valueField!=='string'||n.params.valueField.length>100))throw new Error('Choose boundary inclusion and a numeric field name (or leave empty).');
}
export function metric(zone:number,hemisphere:string){
  const definition=`+proj=utm +zone=${zone} ${hemisphere==='south'?'+south ':''}+datum=WGS84 +units=m +no_defs`,p=proj4('EPSG:4326',definition),central=zone*6-183;
  return {crs:`EPSG:${hemisphere==='south'?32700+zone:32600+zone}`,forward:(c:Position):Position=>{if(!coordinate(c)||Math.abs(c[0]-central)>6||(hemisphere==='north'?c[1]<0:c[1]>0))throw new Error('Coordinates fall outside this prototype’s UTM zone/hemisphere guard. Choose the appropriate metric CRS.');return p.forward(c);},inverse:(c:Position):Position=>p.inverse(c)};
}
type Metric=ReturnType<typeof metric>;
const dist=(a:Position,b:Position)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function sites(input:PointCollection,max=100){if(!input?.features.length||input.features.length>max||input.features.some(f=>!f.geometry))throw new Error(`Use 1–${max} sites with known locations.`);return input.features;}
function halfPlane(ring:Position[],a:Position,b:Position){
  const normal=[b[0]-a[0],b[1]-a[1]],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],signed=(p:Position)=>(p[0]-mid[0])*normal[0]+(p[1]-mid[1])*normal[1];
  const out:Position[]=[];for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],dp=signed(p),dq=signed(q);if(dp<=0)out.push(p);if((dp<0&&dq>0)||(dp>0&&dq<0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}return out;
}
export function voronoi(input:PointCollection,area:Boundary,zone:number,hemisphere:string):Polygons{
  const fs=sites(input),m=metric(zone,hemisphere),xy=fs.map(f=>m.forward(f.geometry!.coordinates));
  for(let i=0;i<xy.length;i++)for(let j=0;j<i;j++)if(dist(xy[i],xy[j])<.001)throw new Error('Coincident sites need an explicit merge or tie policy before Voronoi.');
  const bounds=geometryBounds(area),corners=[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]]].map(m.forward);
  if(dist(corners[0],corners[2])>50000)throw new Error('Voronoi prototype reporting extent must be under 50 km across.');
  const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]),left=Math.min(...xs)-100,right=Math.max(...xs)+100,bottom=Math.min(...ys)-100,top=Math.max(...ys)+100;
  const features:Catchment[]=fs.flatMap((f,i)=>{let ring:Position[]=[[left,bottom],[right,bottom],[right,top],[left,top]];for(let j=0;j<xy.length&&ring.length;j++)if(i!==j)ring=halfPlane(ring,xy[i],xy[j]);return ring.length<3?[]:[{id:f.id,siteId:f.id,name:f.properties.name,geometry:{type:'Polygon' as const,coordinates:[[...ring,ring[0]].map(m.inverse)]}}];});
  return {features,sites:structuredClone(fs),crs:m.crs,method:'Euclidean half-plane Voronoi in WGS84 UTM; finite reporting envelope',notes:['Finite envelope only; connect Clip polygons for the exact study boundary. Cells model proximity, not actual pump use.']};
}
const multi=(b:Boundary)=>b.type==='Polygon'?[b.coordinates]:b.coordinates;
export function clipPolygons(input:Polygons,boundary:Boundary):Polygons{
  return {...structuredClone(input),boundary:structuredClone(boundary),features:input.features.flatMap(f=>{const coordinates=polygonClipping.intersection(multi(f.geometry) as ClipMultiPolygon,multi(boundary) as ClipMultiPolygon);return coordinates.length?[{...f,geometry:{type:'MultiPolygon' as const,coordinates}}]:[];}),notes:[...input.notes,'Clipped in CRS84 coordinate space; empty intersections omitted.']};
}
/** `onProgress` is called once per site, before that site's search. It exists so a worker can
 *  prove it is still alive: the work is synchronous, so a timer inside the worker cannot fire
 *  during it and only a call from within the computation can. It cannot prove liveness within a
 *  single site, which is the case that exhausts memory -- that needs the search broken into steps,
 *  recorded as the blocker `isochrone-does-not-scale`. */
/** Lines buffered in small batches and unioned in a balanced tree, rather than handed to the
 *  buffer engine all at once.
 *
 *  A buffer distributes over a union, so the strip around a set of streets is the union of the
 *  strips around each -- which means the batch size is free to choose and the answer does not
 *  change with it. Measured 2026-10-13 on a real 10-minute walk over central London (3,925
 *  streets):
 *
 *  | all at once (shipped) | 17,175 ms | +4,599 MB |
 *  | batches of 400        |  3,083 ms |   +195 MB |
 *  | batches of 100        |  2,635 ms |    +82 MB |
 *  | **batches of 25**     |  **2,532 ms** | **+21 MB** |
 *  | batches of 1          |  6,416 ms |    +36 MB |
 *
 *  So 25 is the floor on both axes: below it the per-call overhead of the buffer engine dominates,
 *  above it the engine's own cost grows faster than the saving. The resulting area differs from the
 *  shipped geometry by 0.000006% -- 1 m² in 987,859 -- which is union ordering in floating point.
 *
 *  This is what made a 1 km square of central London exhaust a 4 GB heap: not the search, which
 *  takes 82 ms, but one buffer call over every reached street at once.
 *
 *  The union is a balanced pairwise reduction, not a left fold: folding re-walks the whole
 *  accumulated polygon on every step, which is the same quadratic shape in a different place. */
export const BUFFER_BATCH=25;
export function bufferedCorridor(lines:Position[][],bufferM:number,fallback:Position):Boundary{
  if(!lines.length){
    const point=turfBuffer({type:'Point',coordinates:fallback},bufferM,{units:'meters',steps:8});
    if(!point||point.type!=='Feature')throw new Error('Network buffer did not produce a polygon.');
    return point.geometry as Boundary;
  }
  const parts:ClipPolygon[]=[];
  for(let i=0;i<lines.length;i+=BUFFER_BATCH){
    const batch=turfBuffer({type:'MultiLineString',coordinates:lines.slice(i,i+BUFFER_BATCH)},
      bufferM,{units:'meters',steps:8});
    if(!batch||batch.type!=='Feature')throw new Error('Network buffer did not produce a polygon.');
    parts.push(...(multi(batch.geometry) as ClipPolygon[]));
  }
  let level:ClipMultiPolygon[]=parts.map(p=>[p]);
  while(level.length>1){
    const next:ClipMultiPolygon[]=[];
    for(let i=0;i<level.length;i+=2)
      next.push(i+1<level.length?polygonClipping.union(level[i],level[i+1]):level[i]);
    level=next;
  }
  const polygons=level[0];
  // One polygon is returned as a Polygon, as the single buffer call did, so receipts and
  // downstream readers see the same geometry type for the same shape.
  return polygons.length===1
    ?{type:'Polygon',coordinates:polygons[0] as Position[][]}
    :{type:'MultiPolygon',coordinates:polygons as Position[][][]};
}
export function isochrone(input:PointCollection,network:Network,params:WorkflowNode<'isochrone'>['params'],onProgress?:(done:number,total:number)=>void):Polygons{
  if(params.thresholds?.length){validateCatchmentNode({id:'check',type:'isochrone',params,x:0,y:0});const results=params.thresholds.map((minutes,i)=>{onProgress?.(i,params.thresholds!.length);return isochrone(input,network,{...params,minutes,thresholds:undefined},onProgress);});return {...results[0],features:results.flatMap(p=>p.features.map(f=>({...f,id:f.siteId+'-t'+f.minutes}))),method:'Cumulative network isochrones: '+params.thresholds.join(', ')+' minutes; '+params.speedMPerMin+' m/min; '+params.bufferM+' m corridor; '+params.direction,notes:[...results[0].notes,'Nested thresholds are cumulative, not disjoint time bands.']};}
  validateNetwork(network);validateCatchmentNode({id:'check',type:'isochrone',params,x:0,y:0});const fs=sites(input,10),m=metric(params.zone,params.hemisphere),coords=new Map(network.nodes.map(n=>[n.id,m.forward(n.coordinates)]));
  const edges=prepareEdges(network,params.direction,m.forward);
  const adjacency=new Map<string,typeof edges>();for(const e of edges){const list=adjacency.get(e.from)||[];list.push(e);adjacency.set(e.from,list);}
  const snaps:NonNullable<Polygons['snaps']>=[],notes=['Turf/JSTS corridor buffer in a local azimuthal equidistant projection, 8 quadrant segments. Approximate corridor polygons, not exact travel-time surfaces. Edge time uses supplied length / constant speed. No off-network connectors; snap distance is reported but not charged. Graph extent can truncate reachability. OSM snapshot is not an 1854 street reconstruction.'];
  const features=fs.map((f,index)=>{onProgress?.(index,fs.length);const origin=m.forward(f.geometry!.coordinates),snap=network.nodes.reduce((a,b)=>dist(coords.get(a.id)!,origin)<=dist(coords.get(b.id)!,origin)?a:b),snapDistance=dist(coords.get(snap.id)!,origin);if(snapDistance>params.maxSnapM)throw new Error(`${f.properties.name}: nearest network node is ${Math.round(snapDistance)} m away, beyond the snap limit.`);snaps.push({siteId:f.id,nodeId:snap.id,distanceM:snapDistance});
    const budget=params.minutes*params.speedMPerMin,distances=new Map<string,number>([[snap.id,0]]),settled=new Set<string>();
    for(;;){let current:string|undefined,best=Infinity;for(const [id,d] of distances)if(!settled.has(id)&&d<best){current=id;best=d;}if(!current||best>budget)break;settled.add(current);for(const e of adjacency.get(current)||[]){const cost=best+e.lengthM;if(cost<(distances.get(e.to)??Infinity))distances.set(e.to,cost);}}
    const reached:{line:Position[];fraction:number}[]=[];for(const e of edges){const d=distances.get(e.from)??Infinity;if(d<budget)reached.push({line:e.line,fraction:Math.min(1,(budget-d)/e.lengthM)});}
    const lines=reachedStreets(reached).map(line=>line.map(m.inverse));
    const corridor=bufferedCorridor(lines,params.bufferM,snap.coordinates);
    // Infill keeps each polygon's outer ring and drops its holes. The union was a spread of every
    // ring into one call, which on a large corridor passes thousands of arguments; a balanced
    // reduction does the same work without that.
    let geometry:Boundary=corridor;
    if(params.fillHoles){
      let level:ClipMultiPolygon[]=(multi(corridor) as ClipPolygon[]).map(p=>[[p[0]]] as unknown as ClipMultiPolygon);
      while(level.length>1){
        const next:ClipMultiPolygon[]=[];
        for(let i=0;i<level.length;i+=2)
          next.push(i+1<level.length?polygonClipping.union(level[i],level[i+1]):level[i]);
        level=next;
      }
      geometry={type:'MultiPolygon',coordinates:level[0] as Position[][][]};
    }
    return {id:f.id,siteId:f.id,minutes:params.minutes,name:`${f.properties.name} - ${params.minutes} min`,geometry};
  });notes.push(params.fillHoles?'Infill enabled: interior holes are filled for illustrative regions; this can include unreachable off-network locations.':'Infill disabled: corridor holes are retained.');return {features,sites:structuredClone(fs),crs:m.crs,method:`Dijkstra ${params.direction}; ${params.minutes} min; ${params.speedMPerMin} m/min; partial edges; ${params.bufferM} m corridor`,notes,snaps};
}
export function summarizePolygons(input:Polygons,points:PointCollection,params:WorkflowNode<'summarize_polygons'>['params']):Polygons{
  const features=input.features.map(f=>({...structuredClone(f),count:0,total:0,missingValues:0}));let matched=0,unmatched=0,missingLocation=0,multiple=0;
  for(const p of points.features){if(!p.geometry){missingLocation++;continue;}const hits=features.filter(f=>{const r=pointRelation(p.geometry!.coordinates,f.geometry);return r==='Inside'||params.boundary==='include'&&r==='Boundary';});if(!hits.length){unmatched++;continue;}matched++;if(hits.length>1)multiple++;for(const f of hits){f.count++;if(params.valueField){const value=p.properties[params.valueField];if(typeof value==='number'&&Number.isFinite(value))f.total+=value;else f.missingValues++;}}}
  if(features.some(f=>!Number.isFinite(f.total)))throw new Error('Numeric total overflow; review the input values.');
  return {...structuredClone(input),features,observations:structuredClone(points),summary:{records:points.features.length,matched,unmatched,missingLocation,multiple,valueField:params.valueField},notes:[...input.notes,`Boundary: ${params.boundary}. All memberships retained; ${multiple} locations have multiple memberships. Do not add overlapping catchment counts as a unique total.`]};
}
export function catchmentReceipt(node:WorkflowNode,value:Polygons|Network,runId:string,sources:string[]):Receipt{
  // `fw:metricCRS` means a PROJECTED CRS a computation used; clip and summarize project nothing,
  // so claiming it for them would have said they worked in metres when they work in degrees.
  // Both state the CRS they computed in with the OGC identifier instead, and the absence of
  // fw:metricCRS is itself the fact: nothing was projected. Found 2026-10-13 by querying the
  // receipts for the run's projection and getting "OGC:CRS84" back as a metric answer.
  const geographic=node.type==='clip_polygons'||node.type==='summarize_polygons';
  const operationCRS=geographic?'':'features' in value?value.crs:'';
  const conformsTo=geographic?CRS84_IRI:crsIRIFromName(operationCRS);
  const operationMethod=node.type==='clip_polygons'?'Polygon intersection in CRS84; empty intersections omitted':node.type==='summarize_polygons'?'Point membership in CRS84 with explicit boundary policy; all memberships retained':'features' in value?value.method:'Validated directed network input; supplied metre lengths';
  const entity=`urn:fieldwork:run:${runId}:output:${node.id}`,activity=`${entity}:activity`,classes:Record<string,string>={voronoi:'VoronoiComputation',isochrone:'NetworkIsochrone',clip_polygons:'PolygonClipping',summarize_polygons:'PolygonPointSummary',network_input:'NetworkInput'};
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n'+`<${activity}> a prov:Activity, fw:${classes[node.type]}; fw:parameters ${JSON.stringify(JSON.stringify(node.type==='network_input'?{source:(value as Network).source,inputMethod:node.params.inputMethod,marginM:node.params.marginM}:node.params))}.\n<${entity}> a prov:Entity; prov:wasGeneratedBy <${activity}>.\n`;
  for(const source of sources)facts+=`<${activity}> prov:used <urn:fieldwork:run:${runId}:output:${source}>.\n`;
  if('nodes' in value)facts+=`<${entity}> fw:sourceDescription ${JSON.stringify(value.source)}; fw:networkMetadata ${JSON.stringify(JSON.stringify(value.provenance||{}))}; fw:networkNodeCount ${value.nodes.length}; fw:networkEdgeCount ${value.edges.length}.\n`;
  if('features' in value){facts+=`<${activity}> ${operationCRS?`fw:metricCRS ${JSON.stringify(operationCRS)}; `:''}${conformsTo?`dcterms:conformsTo <${conformsTo}>; `:''}fw:method ${JSON.stringify(operationMethod)}; fw:caveats ${JSON.stringify(value.notes.join(' '))}.\n`;for(const f of value.features){const id=`${entity}:cell:${encodeURIComponent(f.id)}`,wkt='MULTIPOLYGON ('+multi(f.geometry).map(p=>'('+p.map(r=>'('+r.map(c=>c.join(' ')).join(', ')+')').join(', ')+')').join(', ')+')';facts+=`<${entity}> fw:member <${id}>.\n<${id}> a geo:Feature; fw:siteId ${JSON.stringify(f.siteId)}; geo:hasGeometry [ a geo:Geometry; geo:asWKT ${JSON.stringify('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> '+wkt)}^^geo:wktLiteral ].\n`;if(f.minutes!==undefined)facts+=`<${id}> fw:travelTimeMinutes ${f.minutes}.\n`;if(f.count!==undefined)facts+=`<${id}> fw:recordCount ${f.count}; fw:missingValueCount ${f.missingValues}.\n`;}if(value.summary?.valueField)for(const f of value.features)facts+=`<${entity}:cell:${encodeURIComponent(f.id)}> fw:numericTotal ${f.total}.\n`;if(value.summary)facts+=`<${entity}> fw:summary ${JSON.stringify(JSON.stringify(value.summary))}.\n`;if(value.snaps)facts+=`<${activity}> fw:networkSnaps ${JSON.stringify(JSON.stringify(value.snaps))}.\n`;}
  facts+=catchmentSemantics(node,value,entity,activity,runId);
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:operationMethod};
}
