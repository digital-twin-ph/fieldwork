import type {Boundary} from './types.js';
import type {Network} from './catchments.js';
import {geometryBounds} from './study-area.js';
import {BYTES_PER_FEATURE,FEATURES_PER_NODE,downloadLimits} from './catchments.js';
import type {NetworkTravelMode} from './catchments.js';
import {countQuery,countWays,requestOSM,OVERPASS_ENDPOINTS} from './street-network.js';
import {chargeNetworkDownload,pacedNetworkDownload} from './network-throttle.js';

/** ONE REQUEST'S WORTH AT A TIME, BECAUSE A PROVINCE IS NOT ONE REQUEST'S WORTH.
 *
 *  The practitioner spent days on a single Overpass request for Ituri. The clock that aborted it
 *  mid-transfer is gone, but the underlying shape is unchanged: a province is more street data
 *  than one query is built to hand over, and asking the same question more loudly does not change
 *  that. This splits the question instead.
 *
 *  The grid comes from the service's OWN count of the area, not from a tile size somebody picked.
 *  That is the difference between this and the caps that cost two days: nothing here decides in
 *  advance how much a practitioner may have. The count says how many elements are in the area, the
 *  per-request budget says how many one response may carry, and the ratio says how many tiles. A
 *  denser area yields more tiles; a sparse one yields one, and then this is an ordinary download. */
export interface TilePlan {
  tiles:Boundary[];
  /** Per side of the grid. 1 means the area was never split. */
  side:number;
  /** What the count implied, kept so the panel and the receipt can say why there are this many. */
  elements:number;
  elementsPerTile:number;
}

/** THE SEAM IS A DISTANCE, NOT A PROPORTION.
 *
 *  A way that crosses a tile edge arrives in each tile missing the nodes on the other side, and
 *  an edge whose endpoints are absent is dropped: without overlap a tiled province is a province
 *  with a grid of cuts drawn through its roads. Overlap heals the seam, and the duplicate
 *  junctions it creates are merged by OSM id, which is the same id in both tiles.
 *
 *  It was a fraction of a tile's span, and that was wrong twice over. A seam has to cover a
 *  street segment, which does not grow because the province does -- and scaling with the tile
 *  made every tile larger in area than the grid was planned for, so a grid sized for exactly
 *  four requests' worth had all four tiles over budget and every one was re-counted and
 *  re-split. Found 2026-10-22 by a test that expected four requests and watched it ask for nine.
 *
 *  So the seam is the download margin the widget already carries -- the same metres a
 *  practitioner can see and set -- converted at the equator, which overstates it away from the
 *  equator and therefore never leaves a seam too narrow. No new number, and no new cap. */
const METRES_PER_DEGREE=111_320;
export const seamDegrees=(marginM:number):number=>Math.max(0,marginM)/METRES_PER_DEGREE;

/** Does a tile's box meet the study area at all?
 *
 *  A province is not its bounding box -- the direction this project settled on 2026-10-22 -- and
 *  a tile covering only the ground outside the outline has nothing in it anyone asked for.
 *  Skipping it is one fewer request against a donated service and one less wait. The test is a
 *  box against the outline's segments and corners: exact enough to never drop a tile that holds
 *  part of the area, which is the only error that would matter here. OSMnx takes the other road
 *  and queries the convex hull, which downloads the gaps instead of skipping them. */
export function tileMeetsArea(tile:Boundary,boundary:Boundary):boolean{
  const ring=tile.coordinates[0] as [number,number][];
  const [w,s]=ring[0],[e,n]=ring[2];
  const rings:[number,number][][]=boundary.type==='MultiPolygon'
    ?(boundary.coordinates as unknown as [number,number][][][]).flat()
    :(boundary.coordinates as unknown as [number,number][][]);
  for(const r of rings)for(const [x,y] of r)if(x>=w&&x<=e&&y>=s&&y<=n)return true;
  // The outline may pass through the tile without a vertex inside it, and the tile may sit
  // wholly inside the outline with no vertex of its own on the boundary. Both are covered by
  // testing the tile's corners against the outline.
  const inside=(px:number,py:number):boolean=>{
    let hit=false;
    for(const r of rings)for(let i=0,j=r.length-1;i<r.length;j=i++){
      const [xi,yi]=r[i],[xj,yj]=r[j];
      if(yi>py!==yj>py&&px<(xj-xi)*(py-yi)/(yj-yi)+xi)hit=!hit;
    }
    return hit;
  };
  for(const [px,py] of [[w,s],[e,s],[e,n],[w,n],[(w+e)/2,(s+n)/2]])if(inside(px,py))return true;
  // A segment crossing the box with neither endpoint in it and no corner inside is only
  // possible for a ring that also encloses a corner, which the test above already caught.
  return false;
}

export function planTiles(boundary:Boundary,elements:number,elementsPerRequest:number,
  marginM=250):TilePlan{
  const [west,south,east,north]=geometryBounds(boundary) as unknown as [number,number,number,number];
  const padX=seamDegrees(marginM),padY=seamDegrees(marginM);
  const width=Math.max(east-west,1e-9),height=Math.max(north-south,1e-9);
  // SIZED ON THE PADDED TILE, because the padded tile is what gets requested. Sizing on the bare
  // one left every tile a fraction over budget, and a tile over budget is refused, re-counted and
  // re-split -- four requests' worth of area turning into four refusals and sixteen retries.
  // The loop stops when the grid fits, or when making it finer stops helping: past that point the
  // seam is most of the tile and no number of tiles would fit, which is a fact to report rather
  // than a depth to pick.
  const share=(n:number)=>((width/n+2*padX)/width)*((height/n+2*padY)/height);
  let side=1;
  for(let previous=Infinity;;side++){
    const fits=elements*share(side);
    if(fits<=elementsPerRequest||share(side)>=previous)break;
    previous=share(side);
  }
  const spanX=width/side,spanY=height/side;
  const tiles:Boundary[]=[];
  for(let row=0;row<side;row++)for(let column=0;column<side;column++){
    const w=Math.max(west,west+column*spanX-padX),e=Math.min(east,west+(column+1)*spanX+padX);
    const s=Math.max(south,south+row*spanY-padY),n=Math.min(north,south+(row+1)*spanY+padY);
    const tile:Boundary={type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]};
    if(side===1||tileMeetsArea(tile,boundary))tiles.push(tile);
  }
  return {tiles,side,elements,elementsPerTile:Math.ceil(elements/tiles.length)};
}

/** What one response may carry, in elements, at a given graph limit. The same two constants the
 *  predictive refusal uses, so the plan and the refusal cannot disagree about what fits. */
export const elementsPerRequest=(maxBytes:number):number=>
  Math.max(1,Math.floor(maxBytes/BYTES_PER_FEATURE));

/** The junctions a tile's elements imply, for the progress line. */
export const junctionsIn=(elements:number):number=>Math.ceil(elements/FEATURES_PER_NODE);

/** ONE GRAPH OUT OF MANY RESPONSES.
 *
 *  Junctions are merged by OSM id: the same junction in two overlapping tiles is one junction,
 *  and keeping both would double every seam. Segments are merged by the pair of ids they join,
 *  in the direction they were given, because a one-way street is not the same edge as its
 *  reverse. An edge whose endpoints did not both arrive is dropped and counted, so a seam that
 *  failed to heal is reported rather than silently thinning the network. */
export function mergeNetworks(parts:Network[],source:string):Network&{droppedEdges:number}{
  const nodes=new Map<string,Network['nodes'][number]>();
  for(const part of parts)for(const node of part.nodes)if(!nodes.has(node.id))nodes.set(node.id,node);
  const edges=new Map<string,Network['edges'][number]>();
  let droppedEdges=0;
  for(const part of parts)for(const edge of part.edges){
    if(!nodes.has(edge.from)||!nodes.has(edge.to)){droppedEdges++;continue;}
    const key=`${edge.from}\u0000${edge.to}`;
    const held=edges.get(key);
    // The richer of two copies wins: a tile that carried the way's geometry says more about the
    // same segment than one that carried only its endpoints.
    if(!held||(!held.geometry&&edge.geometry))edges.set(key,edge);
  }
  return {nodes:[...nodes.values()],edges:[...edges.values()],source,droppedEdges};
}

/** ASKING FOR A PROVINCE IN AS MANY QUESTIONS AS IT TAKES.
 *
 *  One count for the whole area, a grid derived from it, then one request per tile, merged. This
 *  is the strategy OSMnx uses -- `_consolidate_subdivide_geometry` cuts quadrats and issues a
 *  request each -- with two differences, both of which came out of this project's own two days
 *  of being refused:
 *
 *  - OSMnx splits on PROJECTED AREA against a configured `max_query_area_size`, so a desert and a
 *    city of equal size cost the same number of requests. This splits on the service's own count
 *    of what is actually there, so density decides and a sparse area stays one ordinary download.
 *  - OSMnx replaces an oversized polygon with its CONVEX HULL before cutting, which downloads the
 *    ground between the arms of a shape like Ituri's. Tiles that miss the outline are skipped.
 *
 *  A tile that still refuses is re-counted and re-planned rather than failed: uneven density is
 *  the expected case, not an error, and nothing here decides in advance how much may be had.
 *
 *  The whole sequence is ONE download as far as the practitioner and the service are concerned:
 *  one Stop ends it, and the pause it earns is charged once at the end for the total. Charging
 *  per tile would be both unfair and useless -- `earnedPause` ceilings at 900 s a request, so
 *  nine tiles would be hours of waiting for work the service does either way. */
export interface TiledOptions {
  maxNodes?:number; pauseMs?:number; mode?:NetworkTravelMode; refresh?:boolean;
  onPhase?:(message:string,fraction?:number)=>void; stopSignal?:AbortSignal;
}
export interface TiledNetwork extends Network {tiles:number; droppedEdges:number; countedElements:number}

/** The service's own answer to how much is in an area, or null if no instance would say. */
export async function countElements(boundary:Boundary,marginM:number,fetcher:typeof fetch,
  maxNodes?:number,mode:NetworkTravelMode='walking',signal?:AbortSignal):Promise<number|null>{
  const {query}=countQuery(boundary,marginM,maxNodes,mode);
  for(const endpoint of OVERPASS_ENDPOINTS){
    const outcome=await countWays(endpoint.url,query,fetcher,signal);
    if(outcome.kind==='counted')return outcome.elements;
  }
  return null;
}

export async function requestOSMInTiles(boundary:Boundary,marginM:number,fetcher:typeof fetch=fetch,
  options:TiledOptions={}):Promise<TiledNetwork>{
  const {maxNodes,pauseMs,mode='walking',onPhase,stopSignal,refresh=false}=options;
  const budget=downloadLimits(maxNodes).maxFeatures;
  onPhase?.('Asking how much street data is in this area\u2026');
  const counted=await countElements(boundary,marginM,fetcher,maxNodes,mode,stopSignal);
  // No count is not a refusal: it is one less thing known. The ordinary single request then
  // applies, with its own predictive refusal, exactly as before tiles existed.
  const plan=planTiles(boundary,counted??0,budget,marginM);
  const parts:Network[]=[];
  let done=0;
  const total=()=>plan.tiles.length;

  const collect=async(area:Boundary,label:string,depth:number):Promise<void>=>{
    if(stopSignal?.aborted)throw new Error(`Stopped after ${done} of ${total()} tiles. `
      +`Nothing was changed and what arrived was not kept.`);
    try{
      const part=await requestOSM(area,marginM,fetcher,maxNodes,pauseMs,undefined,undefined,
        undefined,refresh,(message,fraction)=>onPhase?.(`${label} \u00b7 ${message}`,fraction),
        mode,stopSignal);
      parts.push(part);
    }catch(error){
      const text=error instanceof Error?error.message:String(error);
      // UNEVEN DENSITY IS THE EXPECTED CASE. The grid came from one count over the whole area;
      // a city inside it carries more than its share. Re-count that tile and split it on what
      // it actually holds, rather than failing the province for the shape of its data.
      // Terminates on the tile's OWN count, not on a depth somebody picked: a chosen depth
      // would be a new limit on discovery, which is the kind of number this project spent two
      // days removing. Each split quarters the area, so a count that still will not fit keeps
      // splitting until it does. A degenerate tile -- one too small to divide in floating point
      // -- is the only stop, and it reports what it found.
      if(!/street data for this area is|over the/i.test(text))throw error;
      const ring=area.coordinates[0] as [number,number][];
      const span=Math.max(ring[2][0]-ring[0][0],ring[2][1]-ring[0][1]);
      if(span<1e-6)throw new Error(`${label} is ${span.toExponential(1)} degrees across and still `
        +`holds more street data than one response carries. ${text}`);
      const inner=await countElements(area,marginM,fetcher,maxNodes,mode,stopSignal);
      const split=planTiles(area,Math.max(inner??budget*4,budget*4),budget,marginM);
      onPhase?.(`${label} holds more than one request carries \u2014 asking in ${split.tiles.length} parts`);
      for(let i=0;i<split.tiles.length;i++)
        await collect(split.tiles[i],`${label}.${i+1}`,depth+1);
    }
  };

  for(let i=0;i<plan.tiles.length;i++){
    await collect(plan.tiles[i],`Tile ${i+1} of ${plan.tiles.length}`,0);
    done++;
  }

  const boxed=mergeNetworks(parts,
    `OpenStreetMap ${mode} network, downloaded in ${parts.length} request${parts.length===1?'':'s'} `
    +`over the study area and merged by OSM id. \u00a9 OpenStreetMap contributors, ODbL 1.0.`);
  // AND CLIPPED TO THE POLYGON, because the bounding box was only ever how Overpass is asked a
  // question about an area, never the area itself.
  const clipped=clipNetworkToArea(boxed,boundary,marginM);
  const merged={...clipped.network,droppedEdges:boxed.droppedEdges};
  // Charged ONCE, for the whole of what was asked of the service. An estimate from the elements
  // merged rather than the bytes received, because the bytes are counted inside each request and
  // what matters here is that the pause reflects the total and not the largest tile.
  chargeNetworkDownload((merged.nodes.length+merged.edges.length)*BYTES_PER_FEATURE,pauseMs);
  return {...merged,tiles:parts.length,countedElements:counted??0,
    provenance:{tiles:parts.length,plannedTiles:plan.tiles.length,gridSide:plan.side,
      countedElements:counted,droppedEdges:boxed.droppedEdges,mode,
      clippedToPolygon:true,junctionsOutsideArea:clipped.droppedNodes,
      segmentsOutsideArea:clipped.droppedEdges}};
}

/** A STUDY AREA CLIPS TO ITS POLYGON, NOT TO ITS BOX.
 *
 *  The direction, 2026-10-22: *"The clip to the polygon study area is what we need as that has
 *  been the intent for the study area all along. I have longer workflows because what was
 *  intended was not what was implemented."* The street engine does this during decode for a
 *  published extract. A downloaded network had no equivalent: Overpass is asked for a bounding
 *  box, so a province arrived with everything in the box around it, and the practitioner saw
 *  *"network outside the study area bounds"* on the map.
 *
 *  Point-in-polygon over a province is the reason this needs an index rather than a loop. Ituri's
 *  outline is 7,759 vertices and a tiled download is hundreds of thousands of junctions; testing
 *  every junction against every segment is billions of operations. Bands over latitude cut that
 *  to the segments that could possibly cross a given junction's row -- the same shape of index
 *  the Rust engine uses for the same job, for the same reason.
 *
 *  A node is kept when it is inside the outline OR within the download margin of it, and an edge
 *  when both its ends are. The margin is not an oversight: the widget deliberately downloads
 *  beyond the study bounds -- "Download margin outside study bounds (metres)", 250 by default --
 *  so that a journey starting near the border can leave and come back, and so a junction just
 *  outside is still there to route through. Clipping to the bare outline threw that away and
 *  made the margin control a lie; it also failed eight tests, which is how it was found.
 *
 *  So this clips to the study area AS DOWNLOADED: the polygon plus the margin the practitioner
 *  set. Set the margin to zero and it is the polygon exactly. Both drop counts are returned,
 *  because a clip that silently removes most of a graph should be visible as that. */
const BANDS=512;

interface BandIndex {minLat:number;maxLat:number;height:number;bands:number[][];segments:number[][]}

function indexRings(rings:[number,number][][]):BandIndex{
  const segments:number[][]=[];
  let minLat=Infinity,maxLat=-Infinity;
  for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if(yi===yj)continue;                     // horizontal segments never change the crossing count
    segments.push([xi,yi,xj,yj]);
    minLat=Math.min(minLat,yi,yj);maxLat=Math.max(maxLat,yi,yj);
  }
  const height=Math.max((maxLat-minLat)/BANDS,Number.MIN_VALUE);
  const bands:number[][]=Array.from({length:BANDS},()=>[]);
  segments.forEach(([,yi,,yj],index)=>{
    const low=Math.min(yi,yj),high=Math.max(yi,yj);
    const first=Math.max(0,Math.min(BANDS-1,Math.floor((low-minLat)/height)));
    const last=Math.max(0,Math.min(BANDS-1,Math.floor((high-minLat)/height)));
    for(let band=first;band<=last;band++)bands[band].push(index);
  });
  return {minLat,maxLat,height,bands,segments};
}

function insideIndexed(index:BandIndex,x:number,y:number):boolean{
  if(y<index.minLat||y>index.maxLat)return false;
  const band=Math.max(0,Math.min(BANDS-1,Math.floor((y-index.minLat)/index.height)));
  let hit=false;
  for(const i of index.bands[band]){
    const [xi,yi,xj,yj]=index.segments[i];
    if(yi>y!==yj>y&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;
  }
  return hit;
}

/** Within `margin` degrees of the outline, for the band the point sits in and its neighbours.
 *  A point beyond the outline but inside the margin was downloaded on purpose. */
function nearRing(index:BandIndex,x:number,y:number,margin:number):boolean{
  const first=Math.max(0,Math.min(BANDS-1,Math.floor((y-margin-index.minLat)/index.height)));
  const last=Math.max(0,Math.min(BANDS-1,Math.floor((y+margin-index.minLat)/index.height)));
  const squared=margin*margin;
  for(let band=first;band<=last;band++)for(const i of index.bands[band]){
    const [xi,yi,xj,yj]=index.segments[i];
    const dx=xj-xi,dy=yj-yi,length=dx*dx+dy*dy;
    const t=length>0?Math.max(0,Math.min(1,((x-xi)*dx+(y-yi)*dy)/length)):0;
    const ox=x-(xi+t*dx),oy=y-(yi+t*dy);
    if(ox*ox+oy*oy<=squared)return true;
  }
  return false;
}

export interface ClipResult {network:Network;keptNodes:number;droppedNodes:number;droppedEdges:number}

export function clipNetworkToArea(network:Network,boundary:Boundary,marginM=0):ClipResult{
  const rings:[number,number][][]=boundary.type==='MultiPolygon'
    ?(boundary.coordinates as unknown as [number,number][][][]).flat()
    :(boundary.coordinates as unknown as [number,number][][]);
  const index=indexRings(rings);
  const margin=seamDegrees(marginM);
  const kept=new Set<string>();
  const nodes=network.nodes.filter(node=>{
    const [x,y]=node.coordinates;
    const held=insideIndexed(index,x,y)||(margin>0&&nearRing(index,x,y,margin));
    if(held)kept.add(node.id);
    return held;
  });
  const edges=network.edges.filter(edge=>kept.has(edge.from)&&kept.has(edge.to));
  return {
    network:{...network,nodes,edges,
      source:`${network.source} Clipped to the study area polygon: `
        +`${nodes.length.toLocaleString('en')} of ${network.nodes.length.toLocaleString('en')} junctions kept.`},
    keptNodes:nodes.length,
    droppedNodes:network.nodes.length-nodes.length,
    droppedEdges:network.edges.length-edges.length,
  };
}

/** THE DOWNLOAD A WIDGET CALLS, which is one request when one will do.
 *
 *  Automatic rather than a mode to choose. The practitioner, on being offered the choice:
 *  *"Let's try the first approach -- this is about discovery."* A control would mean knowing in
 *  advance that an area is too big for one request, which is the thing nobody knows until the
 *  service is asked -- and today's other lesson is that a capability nobody can find is a
 *  capability that does not work.
 *
 *  The single request goes first, so a town costs exactly what it costs today and no extra count
 *  is spent on an area that never needed one. Only its SIZE refusal -- the predictive one, raised
 *  from the service's own count before any bytes are sent -- turns into a plan. Every other
 *  failure is still a failure: a service that is down is not an area that is large.
 *
 *  What a practitioner sees is the panel saying what it is doing: "Too much for one request --
 *  asking in 9 parts", then "Tile 3 of 9 - Receiving ...". Stop ends the whole sequence. */
const IS_TOO_LARGE=/street data for this area is|which is what this download accepts/i;

export function downloadOSMInTiles(boundary:Boundary,marginM:number,maxNodes?:number,
  pauseMs?:number,refresh=false,onPhase?:(message:string,fraction?:number)=>void,
  mode:NetworkTravelMode='walking',stopSignal?:AbortSignal):Promise<Network>{
  return pacedNetworkDownload(async()=>{
    try{
      const whole=await requestOSM(boundary,marginM,fetch,maxNodes,pauseMs,undefined,undefined,
        undefined,refresh,onPhase,mode,stopSignal);
      // One request still answers an area-shaped question with a box-shaped answer.
      return clipNetworkToArea(whole,boundary,marginM).network;
    }catch(error){
      const text=error instanceof Error?error.message:String(error);
      if(!IS_TOO_LARGE.test(text)||stopSignal?.aborted)throw error;
      onPhase?.('Too much for one request \u2014 working out how many parts it takes\u2026');
      return requestOSMInTiles(boundary,marginM,fetch,{maxNodes,pauseMs,mode,onPhase,stopSignal,refresh});
    }
  });
}
