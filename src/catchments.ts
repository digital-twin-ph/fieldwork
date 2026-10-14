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
import {prepareEdges} from './network-edges.js';

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
/** `areaSquareMetres` and `spanMetres` are DERIVED quantities, attached to the record rather than
 *  left in the receipt. Until 2026-10-14 a hull computed its area, wrote it to `fw:hullAreaSquareMetres`
 *  and to a note, and dropped it: the feature carried id, name, siteId and geometry. Nothing
 *  downstream could use it, because a port carries a value and not a receipt, and reaching through
 *  to a receipt is how a thin port type becomes a thick one. A rule that asks "is this catchment
 *  larger than 2 km2?" has nothing to bind to until the quantity is a field. Experiment 113.
 *
 *  Metres, always, and only written by a widget that projected to get them -- an area computed in
 *  degrees is not an area. A widget that works in CRS84 leaves these absent, which is the honest
 *  answer rather than a number in the wrong unit. */
/** `offNetworkMetres` is the straight-line leg charged to reach the network, present only when it
 *  exceeded the snap limit. Its presence marks a catchment that rests on an assumed walkable line;
 *  its absence means the whole route was on mapped streets. See `OffNetworkSite`. */
export interface Catchment {id:string;name:string;siteId:string;geometry:Boundary;offNetworkMetres?:number;minutes?:number;count?:number;total?:number;missingValues?:number;areaSquareMetres?:number;spanMetres?:number}
/** `unconnected` lists the sites that got no catchment, and `offNetwork` the sites that got one
 *  across a leg no street covers.
 *
 *  A site further than the snap limit used to end the run: a throw inside the per-site
 *  loop, so ONE distant site took every other site's catchment with it. It is now routed anyway,
 *  with the crow-flies walk charged against the budget, and listed in `offNetwork` so the answer
 *  says which legs it assumed. `unconnected` is what is left when even that is impossible: the
 *  walk alone spends the budget. The practitioner's instruction of 2026-10-14 --
 *  "the route widget should alert the user that there are sites that did not connect, a feedback
 *  loop that can be acted on" -- is what this carries. A site nobody can route to is a finding
 *  about access, and a finding is reported, not raised.
 *
 *  An unconnected site is absent from `features` because `Catchment.geometry` is a real polygon
 *  and there is no honest one to draw. So the absence is stated here instead, where a consumer can
 *  say "7 of 9 sites" rather than quietly summarising 7 and calling it all of them. An off-network
 *  site IS in `features`, carrying `offNetworkMetres`, because it has a real answer -- one that
 *  rests on an assumption the ordinary catchments do not make. Experiment 114. */
/** A site whose route begins with a leg no street covers: it is further from the network than the
 *  snap limit allows, and the walk onto the network is charged as a straight line anyway.
 *
 *  `distanceM` is D1 as the crow flies, which is a LOWER BOUND on the walk, not a measurement of
 *  it: it assumes the line is walkable, and where D1 is large -- a home set back from any mapped
 *  road -- the walked path is routinely longer. It is also charged at the network speed, which is
 *  a second optimistic assumption. The result for this site is therefore too generous in a stated
 *  direction, which is what distinguishes it from the result for a site on the network. */
export interface OffNetworkSite {siteId:string;name:string;distanceM:number;limitM:number}
/** A site that got no result at all: the walk onto the network alone costs the whole budget, so
 *  nothing is reachable within the stated time.
 *
 *  That is a finding, not a failure -- "this site reaches nothing in five minutes" is the answer --
 *  but it cannot be drawn. No polygon is emitted, because the only shape available is a `bufferM`
 *  disc around the junction, which is neither where the site is nor anywhere it can reach. */
export interface UnconnectedSite {siteId:string;name:string;distanceM:number;budgetM:number}
/** Reads the omissions off ANY node value, since several widgets now report them and the caller
 *  (the executor) holds values it cannot narrow. Absent, empty and "not that kind of value" all
 *  read as no omissions, which is the right answer for a widget that has none. */
export function unconnectedSites(value:unknown):UnconnectedSite[]{
  const list=(value as {unconnected?:unknown})?.unconnected;
  return Array.isArray(list)?list as UnconnectedSite[]:[];
}
export function offNetworkSites(value:unknown):OffNetworkSite[]{
  const list=(value as {offNetwork?:unknown})?.offNetwork;
  return Array.isArray(list)?list as OffNetworkSite[]:[];
}
export interface Polygons {kind?:'hexbin';siteSourceNodeId?:string;features:Catchment[];sites:PointFeature[];method:string;crs:string;boundary?:Boundary;notes:string[];observations?:PointCollection;summary?:{records:number;matched:number;unmatched:number;missingLocation:number;multiple:number;valueField:string};snaps?:{siteId:string;nodeId:string;distanceM:number}[];unconnected?:UnconnectedSite[];offNetwork?:OffNetworkSite[]}
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
/** D3 -- the walk off the last junction to a door -- modelled rather than drawn.
 *
 *  Until 2026-10-14 the corridor was a constant `bufferM` strip around every reached street,
 *  including the streets at the very edge of the budget. Someone standing there has nothing left
 *  to walk, so the catchment claimed 25 m of ground beyond the time it was drawn for, all the way
 *  round its own boundary. The strip was described in the widget's note as a cartographic halo
 *  standing in for D3, which is a way of saying the third segment was not modelled at all.
 *
 *  It is now a LEG WITH A BUDGET. At any point on the route the walk off the network is
 *  `min(bufferM, what is left)`, so the corridor is full width while there is time to spare and
 *  tapers to nothing where the time runs out. `bufferM` stops being a drawing width and becomes
 *  the furthest anyone is assumed to walk off a street at the end of the route -- a cap, because
 *  without one the model lets you leave the network at the origin and walk the whole budget in a
 *  straight line, which is the crow-flies proxy the network routing exists to avoid.
 *
 *  The route is buffered whole: D1 (the straight walk onto the network), D2 (the streets) and D3
 *  (this). The practitioner's instruction of 2026-10-14 -- "connect D1, D2 and D3 and that's what
 *  you buffer". Experiment 114.
 *
 *  Chunking, and what it costs: a chunk takes the budget left at the END it is furthest along,
 *  so the near end of a chunk is buffered by less than it has earned, and the radius is rounded
 *  down into buckets as well. Both remove ground. Against that, each chunk is buffered on its
 *  own, so its far end gets a round cap at the chunk's radius where the rule gives a smaller one,
 *  which adds a little back. They do not cancel exactly: the Validation Lab's check 08 rebuilds
 *  the rule independently at 1 m steps and measures this corridor 0.16% LARGER than the rule
 *  (161,044 m² against 160,785 m², symmetric difference 0.16%, 2026-10-14). So the approximation
 *  is not purely conservative, and that is stated rather than assumed.
 */
export const D3_BUCKETS=6;
export interface ReachChunk {line:Position[];remainingM:number}
/** Split a reached stretch of street into chunks, each carrying the budget left where it ends.
 *  `line` is in projected metres; walking stops when the budget does.
 *
 *  Only the frontier is subdivided. While more than `taperFromM` is left the leg is the full
 *  allowance everywhere, so that stretch is ONE chunk however long it runs; within the last
 *  `taperFromM` metres the radius is falling and the line is cut every `chunkM`. The corridor is
 *  then a handful of buffer calls rather than one per 12 metres of street: measured on the shipped
 *  Snow isochrone, 15.0 s subdividing everything against 2.3 s subdividing the frontier, for the
 *  same polygons. Experiment 114. */
export function reachChunks(line:Position[],startRemainingM:number,taperFromM:number,chunkM:number):ReachChunk[]{
  const out:ReachChunk[]=[];
  let remaining=startRemainingM,current:Position[]=[line[0]],run=0;
  for(let i=1;i<line.length&&remaining>1e-9;i++){
    let [ax,ay]=line[i-1];const [bx,by]=line[i];
    let left=Math.hypot(bx-ax,by-ay);
    while(left>1e-9&&remaining>1e-9){
      // Walk to whichever comes first: the end of this segment, the end of the chunk, the point
      // where the taper begins, or the end of the budget.
      const toTaper=remaining>taperFromM?remaining-taperFromM:Infinity;
      const step=Math.min(left,remaining>taperFromM?toTaper:chunkM-run,remaining);
      const t=step/left,nx=ax+(bx-ax)*t,ny=ay+(by-ay)*t;
      current.push([nx,ny]);
      run+=step;remaining-=step;left-=step;ax=nx;ay=ny;
      if(remaining<=taperFromM+1e-9&&(run>=chunkM-1e-9||remaining<=1e-9||step===toTaper)){
        if(current.length>1)out.push({line:current,remainingM:Math.max(0,remaining)});
        current=[[ax,ay]];run=0;
      }
    }
  }
  if(current.length>1)out.push({line:current,remainingM:Math.max(0,remaining)});
  return out;
}
/** Buffer each chunk by the leg its own budget allows, and union the result.
 *
 *  Radii are quantised DOWN into `D3_BUCKETS` steps so the whole corridor costs a handful of
 *  buffer calls rather than one per chunk, and so that quantising can only make it smaller.
 *  `inverse` returns each chunk to CRS84, where the buffer is measured in metres. */
export function taperedCorridor(chunks:ReachChunk[],maxRadiusM:number,
  inverse:(p:Position)=>Position,fallback:{point:Position;radiusM:number}):Boundary{
  // One street reached from both ends arrives twice, and a street buffered twice costs twice and
  // unions to the same polygon. Pooling by the line itself, keeping whichever reach had more
  // budget left, is what `reachedStreets` did before the taper replaced it -- the same idea,
  // carrying the budget it needs now.
  //
  // What the taper costs, measured on the shipped Snow isochrone (four bands, 2026-10-14):
  //
  // | subdivide every chunk, unpooled             | 15.0 s |
  // | subdivide the frontier only, unpooled       |  6.1 s |
  // | **subdivide the frontier only, pooled**     |  **4.7 s** |
  // | the same streets at a constant radius -- the shape before the taper | 4.1 s |
  //
  // So the modelled D3 costs about 15% over the halo it replaced, and the two optimisations
  // together are the difference between that and three times the work. All four produce the
  // same polygons to within union ordering.
  const pooled=new Map<string,ReachChunk>();
  for(const chunk of chunks){
    const a=chunk.line[0],b=chunk.line.at(-1)!;
    const forward=a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1])?chunk.line.toReversed():chunk.line;
    const key=forward.map(p=>`${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' ');
    const seen=pooled.get(key);
    if(!seen||chunk.remainingM>seen.remainingM)pooled.set(key,{line:forward,remainingM:chunk.remainingM});
  }
  const step=maxRadiusM/D3_BUCKETS,buckets=new Map<number,Position[][]>();
  for(const chunk of pooled.values()){
    const radius=Math.floor(Math.min(maxRadiusM,chunk.remainingM)/step)*step;
    if(radius<=0)continue;
    const list=buckets.get(radius)||[];list.push(chunk.line.map(inverse));buckets.set(radius,list);
  }
  const parts:ClipPolygon[]=[];
  for(const [radius,lines] of buckets)
    for(let i=0;i<lines.length;i+=BUFFER_BATCH){
      const batch=turfBuffer({type:'MultiLineString',coordinates:lines.slice(i,i+BUFFER_BATCH)},
        radius,{units:'meters',steps:8});
      if(!batch||batch.type!=='Feature')throw new Error('Network buffer did not produce a polygon.');
      parts.push(...(multi(batch.geometry) as ClipPolygon[]));
    }
  if(!parts.length){
    // Nothing had any budget left to step off a street with. The site itself is what is reached,
    // and the leg it can still walk from its own door is what is drawn.
    const point=turfBuffer({type:'Point',coordinates:fallback.point},Math.max(fallback.radiusM,1),
      {units:'meters',steps:8});
    if(!point||point.type!=='Feature')throw new Error('Network buffer did not produce a polygon.');
    return point.geometry as Boundary;
  }
  let level:ClipMultiPolygon[]=parts.map(p=>[p]);
  while(level.length>1){
    const next:ClipMultiPolygon[]=[];
    for(let i=0;i<level.length;i+=2)
      next.push(i+1<level.length?polygonClipping.union(level[i],level[i+1]):level[i]);
    level=next;
  }
  const polygons=level[0];
  return polygons.length===1
    ?{type:'Polygon',coordinates:polygons[0] as Position[][]}
    :{type:'MultiPolygon',coordinates:polygons as Position[][][]};
}
export function isochrone(input:PointCollection,network:Network,params:WorkflowNode<'isochrone'>['params'],onProgress?:(done:number,total:number)=>void):Polygons{
  if(params.thresholds?.length){validateCatchmentNode({id:'check',type:'isochrone',params,x:0,y:0});const results=params.thresholds.map((minutes,i)=>{onProgress?.(i,params.thresholds!.length);return isochrone(input,network,{...params,minutes,thresholds:undefined},onProgress);});// The omissions come from the LARGEST band, not the first. A site that reaches nothing in one
    // minute but something in fifteen is not a site with no result; it is a site whose smallest
    // band is empty, which is what bands are for. The largest budget is the only one that can say
    // "nothing at all", and because the budget only grows, its list is the intersection of them.
    const widest=results[results.length-1];
    return {...results[0],features:results.flatMap(p=>p.features.map(f=>({...f,id:f.siteId+'-t'+f.minutes}))),method:'Cumulative network isochrones: '+params.thresholds.join(', ')+' minutes; '+params.speedMPerMin+' m/min; '+params.bufferM+' m corridor; '+params.direction,notes:[...widest.notes,'Nested thresholds are cumulative, not disjoint time bands.'],unconnected:widest.unconnected,offNetwork:widest.offNetwork};}
  validateNetwork(network);validateCatchmentNode({id:'check',type:'isochrone',params,x:0,y:0});const fs=sites(input,10),m=metric(params.zone,params.hemisphere),coords=new Map(network.nodes.map(n=>[n.id,m.forward(n.coordinates)]));
  const edges=prepareEdges(network,params.direction,m.forward);
  const adjacency=new Map<string,typeof edges>();for(const e of edges){const list=adjacency.get(e.from)||[];list.push(e);adjacency.set(e.from,list);}
  const snaps:NonNullable<Polygons['snaps']>=[],unconnected:NonNullable<Polygons['unconnected']>=[],offNetwork:NonNullable<Polygons['offNetwork']>=[],notes=['Turf/JSTS corridor buffer in a local azimuthal equidistant projection, 8 quadrant segments. Approximate corridor polygons, not exact travel-time surfaces. Edge time uses supplied length / constant speed. All three segments of the walk are charged: the straight line onto the network (D1), the streets (D2), and the walk off the street at the end (D3), which is the leg the budget still allows up to the stated limit. The region is the whole route buffered, so it narrows to nothing where the time runs out. Both straight legs assume ground that can be walked, at street speed. Graph extent can truncate reachability. OSM snapshot is not an 1854 street reconstruction.'];
  const features=fs.map((f,index)=>{onProgress?.(index,fs.length);const origin=m.forward(f.geometry!.coordinates),snap=network.nodes.reduce((a,b)=>dist(coords.get(a.id)!,origin)<=dist(coords.get(b.id)!,origin)?a:b),snapDistance=dist(coords.get(snap.id)!,origin);
    /* ASSUMPTION, DEGRADING: a site further from the network than `maxSnapM` is NOT excluded. The
       crow-flies walk onto the network is charged anyway and the site is recorded in `offNetwork`,
       so a place with no mapped street nearby gets an answer that says what it assumed rather than
       no answer at all. Until 2026-10-14 it threw and ended the run; between then and now it was
       reported and dropped. Both put the places with the sparsest road data -- which OSM
       under-maps in a known direction -- outside the analysis that exists to make them visible.
       The straight line is a LOWER BOUND on that walk, charged at the network speed, so the
       degraded answer is optimistic in a stated direction. `maxSnapM` no longer decides whether
       the site is answered; it decides whether the answer is marked. Experiment 114. */
    const budget=params.minutes*params.speedMPerMin;
    if(snapDistance>=budget){
      /* ASSUMPTION, EXCLUDING: the walk onto the network alone spends the whole budget, so nothing
         is reachable and there is no polygon to draw. Emitting one would mean a `bufferM` disc
         around the JUNCTION -- not where the site is, and not anywhere it can reach -- which is
         what this widget drew before 2026-10-14 whenever `maxSnapM` was set wider than the budget.
         The site is reported instead. "Reaches nothing in five minutes" is the finding. */
      unconnected.push({siteId:String(f.id),name:String(f.properties.name),
        distanceM:Number(snapDistance.toFixed(2)),budgetM:Number(budget.toFixed(2))});
      return null;
    }
    const offNetworkMetres=snapDistance>params.maxSnapM?Number(snapDistance.toFixed(2)):undefined;
    if(offNetworkMetres!==undefined)offNetwork.push({siteId:String(f.id),name:String(f.properties.name),
      distanceM:offNetworkMetres,limitM:params.maxSnapM});
    snaps.push({siteId:f.id,nodeId:snap.id,distanceM:snapDistance});
    // D1 IS CHARGED. The walk from the site onto the network comes out of the budget.
    //
    // A route has three segments -- D1 site to nearest node, D2 network distance, D3 last node to
    // destination. `snapDistance` above IS D1, and from 2026-10-14 the snap node starts at that
    // cost rather than at zero, so the stated minutes pay for the walk onto the network.
    //
    // Until then it was measured, published as fw:networkSnaps, and not charged, so every
    // isochrone reached further than its time allowed -- by 10.9 m of a 375 m budget on this
    // example, 2.9%. That figure was never the point. D1 is largest where a home sits back from
    // any mapped road, which is where an access analysis is used to argue for investment, so
    // ignoring it flattered the places worst served.
    //
    // A straight line to the nearest junction is still a LOWER BOUND on that first walk: it
    // assumes you can cross whatever lies between, and where D1 is large the walked path is
    // routinely longer. Charging it makes the isochrone smaller and still optimistic.
    //
    // D3 remains unmodelled; `bufferM` below is a cartographic halo standing in for it.
    // Experiment 114 and the Dive Deeper section of the lab's 19-snap notebook.
    const distances=new Map<string,number>([[snap.id,snapDistance]]),settled=new Set<string>();
    for(;;){let current:string|undefined,best=Infinity;for(const [id,d] of distances)if(!settled.has(id)&&d<best){current=id;best=d;}if(!current||best>budget)break;settled.add(current);for(const e of adjacency.get(current)||[]){const cost=best+e.lengthM;if(cost<(distances.get(e.to)??Infinity))distances.set(e.to,cost);}}
    // The whole route, chunked with the budget left at every point along it: the straight walk
    // onto the network, then every street reached. D3 is then the leg each chunk can still
    // afford. See `taperedCorridor`.
    const chunkM=Math.max(5,params.bufferM/2);
    const chunks:ReachChunk[]=reachChunks([origin,coords.get(snap.id)!],budget,params.bufferM,chunkM);
    for(const e of edges){const d=distances.get(e.from)??Infinity;if(d<budget)chunks.push(...reachChunks(e.line,budget-d,params.bufferM,chunkM));}
    const corridor=taperedCorridor(chunks,params.bufferM,m.inverse,{point:f.geometry!.coordinates,radiusM:params.bufferM});
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
    return {id:f.id,siteId:f.id,minutes:params.minutes,name:`${f.properties.name} - ${params.minutes} min`,geometry,...(offNetworkMetres!==undefined?{offNetworkMetres}:{})};
  }).filter(c=>c!==null);notes.push(params.fillHoles?'Infill enabled: interior holes are filled for illustrative regions; this can include unreachable off-network locations.':'Infill disabled: corridor holes are retained.');  if(offNetwork.length)notes.unshift(
    `${offNetwork.length} of ${fs.length} site${fs.length===1?'':'s'} started further than the ${params.maxSnapM} m snap limit from any street, and ${offNetwork.length===1?'its route was':'their routes were'} charged a straight line to reach one: `
    +offNetwork.map(u=>`${u.name} (${Math.round(u.distanceM)} m off-network)`).join(', ')
    +'. A straight line assumes it can be walked, so those catchments are a lower bound on the walk and reach too far rather than too little.');
  if(unconnected.length)notes.unshift(
    `${unconnected.length} of ${fs.length} site${fs.length===1?'':'s'} ${unconnected.length===1?'has':'have'} no catchment: the walk to the nearest street alone spends the whole ${Math.round(params.minutes*params.speedMPerMin)} m budget. `
    +unconnected.map(u=>`${u.name} (${Math.round(u.distanceM)} m)`).join(', ')
    +'. Any count over these catchments is over the sites that reached something, not over all of them.');
  return {features,sites:structuredClone(fs),crs:m.crs,method:`Dijkstra ${params.direction}; ${params.minutes} min; ${params.speedMPerMin} m/min; partial edges; D1+D2+D3 buffered, final leg up to ${params.bufferM} m`,notes,snaps,unconnected,offNetwork};
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
  if('features' in value){facts+=`<${activity}> ${operationCRS?`fw:metricCRS ${JSON.stringify(operationCRS)}; `:''}${conformsTo?`dcterms:conformsTo <${conformsTo}>; `:''}fw:method ${JSON.stringify(operationMethod)}; fw:caveats ${JSON.stringify(value.notes.join(' '))}.\n`;for(const f of value.features){const id=`${entity}:cell:${encodeURIComponent(f.id)}`,wkt='MULTIPOLYGON ('+multi(f.geometry).map(p=>'('+p.map(r=>'('+r.map(c=>c.join(' ')).join(', ')+')').join(', ')+')').join(', ')+')';facts+=`<${entity}> fw:member <${id}>.\n<${id}> a geo:Feature; fw:siteId ${JSON.stringify(f.siteId)}; geo:hasGeometry [ a geo:Geometry; geo:asWKT ${JSON.stringify('<http://www.opengis.net/def/crs/OGC/1.3/CRS84> '+wkt)}^^geo:wktLiteral ].\n`;if(f.minutes!==undefined)facts+=`<${id}> fw:travelTimeMinutes ${f.minutes}.\n`;if(f.count!==undefined)facts+=`<${id}> fw:recordCount ${f.count}; fw:missingValueCount ${f.missingValues}.\n`;}if(value.summary?.valueField)for(const f of value.features)facts+=`<${entity}:cell:${encodeURIComponent(f.id)}> fw:numericTotal ${f.total}.\n`;if(value.summary)facts+=`<${entity}> fw:summary ${JSON.stringify(JSON.stringify(value.summary))}.\n`;if(value.snaps)facts+=`<${activity}> fw:networkSnaps ${JSON.stringify(JSON.stringify(value.snaps))}.\n`;if(value.unconnected?.length)facts+=`<${activity}> fw:unconnectedSiteCount ${value.unconnected.length}; fw:unconnectedSites ${JSON.stringify(JSON.stringify(value.unconnected))}.\n`;if(value.offNetwork?.length)facts+=`<${activity}> fw:offNetworkSiteCount ${value.offNetwork.length}; fw:offNetworkSites ${JSON.stringify(JSON.stringify(value.offNetwork))}.\n`;for(const f of value.features)if(f.offNetworkMetres!==undefined)facts+=`<${entity}:cell:${encodeURIComponent(f.id)}> fw:offNetworkMetres ${f.offNetworkMetres}.\n`;}
  facts+=catchmentSemantics(node,value,entity,activity,runId);
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:operationMethod};
}
