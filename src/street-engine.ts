import type {Boundary} from './types.js';
import type {Network, NetworkTravelMode} from './catchments.js';
import {geometryBounds} from './study-area.js';

/** A STREET NETWORK FROM A FILE THE PRACTITIONER ALREADY HOLDS.
 *
 *  The other path asks overpass-api.de for a study area's streets and pays for
 *  the whole response on every attempt. This one reads a published extract —
 *  Geofabrik's, downloaded once and kept on the computer — and clips it to the
 *  study area while it is decoded. A province no longer costs a request; it
 *  costs a file read.
 *
 *  The work is done by Graphways' Rust core compiled to WebAssembly: see
 *  vendor/street-engine-NOTICE.txt for what it is and what was patched, and
 *  docs/experiments/129-graphways-and-the-pbf-question.md for what it was
 *  measured at. The module holds the graph; this module takes the nodes and
 *  edges out and lets it go.
 *
 *  Nothing here reaches the network: the engine is a file in this build and the
 *  extract is a file on the device. */
export const ENGINE_URL='./vendor/street-engine.wasm';

/** The study area as a flat ring list: [lon,lat,...] with (NaN,NaN) between rings, which is what
 *  the engine indexes. A bounding box is what a service needs; this is what the practitioner drew.
 *  "The clip to the polygon study area is what we need as that has been the intent for the study
 *  area all along" -- 2026-10-22. */
export function ringOf(boundary:Boundary):Float64Array{
  const polygons=boundary.type==='MultiPolygon'?boundary.coordinates:[boundary.coordinates];
  const flat:number[]=[];
  for(const rings of polygons)
    for(const ring of rings){
      if(flat.length){flat.push(Number.NaN,Number.NaN);}
      for(const [lon,lat] of ring as [number,number][])flat.push(lon,lat);
    }
  return new Float64Array(flat);
}

interface Engine {
  memory:WebAssembly.Memory;
  alloc(length:number):number;
  set_bbox(west:number,south:number,east:number,north:number):void;
  set_polygon(pointer:number,values:number):void;
  set_two_pass(on:number):void;
  set_retain_all(on:number):void;
  set_walk_speed_kph(kph:number):void;
  install_panic_hook():void;
  graph_from_pbf(pointer:number,length:number,drive:number):number;
  export_nodes():number;
  node_values():number;
  export_edges():number;
  edge_values():number;
  drop_graph():void;
  drop_buffers():void;
  panic_ptr():number;
  panic_len():number;
}

/** What the engine was asked for, kept beside what it answered. */
export interface ExtractRequest {
  boundary:Boundary;
  mode:NetworkTravelMode;
  /** Metres beyond the study area's bounds, as the OSM download uses. */
  marginM?:number;
  /** Keep every OSM node instead of collapsing chains between junctions. */
  everyNode?:boolean;
  /** The walking speed the workflow uses, so travel times agree with it. */
  walkSpeedMPerMin?:number;
  onPhase?:(message:string)=>void;
}

const text=(engine:Engine,pointer:number,length:number):string=>
  new TextDecoder().decode(new Uint8Array(engine.memory.buffer,pointer>>>0,length>>>0));

/** A pointer past 2 GB arrives as a negative i32 through the C ABI, and this
 *  module routinely holds more than that. */
const address=(value:number):number=>value>>>0;

export async function loadEngine(fetcher:typeof fetch=fetch):Promise<Engine>{
  const response=await fetcher(ENGINE_URL);
  if(!response.ok)throw new Error('The street engine could not be read from this build.');
  const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{});
  const engine=instance.exports as unknown as Engine;
  engine.install_panic_hook();
  return engine;
}

/** Build a network for `request.boundary` from `bytes`, a published .osm.pbf.
 *
 *  The extract is copied into the module's memory, which is the only way in:
 *  wasm32 has no filesystem. It is read twice — the ways first, so only the
 *  nodes a road refers to are kept — and both passes drop anything outside the
 *  study area. */
/** THE SAME WORK, OFF THE MAIN THREAD. Twenty to thirty seconds of synchronous WebAssembly is
 *  twenty to thirty seconds in which the page answers nothing, and Chrome offers to kill it. The
 *  extract is TRANSFERRED to the worker rather than copied, and the graph is transferred back, so
 *  neither crossing duplicates the bytes. */
export async function networkInWorker(bytes:Uint8Array,request:ExtractRequest):Promise<Network>{
  const worker=new Worker('./build/street-engine-worker.js');
  const [west,south,east,north]=geometryBounds(request.boundary);
  const margin=(request.marginM??0)/111195;
  try{
    const {nodes,edges,junctions}=await new Promise<{nodes:Float64Array;edges:Float64Array;junctions:number}>((resolve,reject)=>{
      worker.onmessage=({data})=>{
        if(data.phase){request.onPhase?.(data.phase);return;}
        if(data.error){reject(new Error(data.error));return;}
        resolve(data);
      };
      worker.onerror=event=>reject(new Error(event.message||'The street engine worker did not start.'));
      const ring=ringOf(request.boundary);
      const copy=bytes.slice();   // transferred, so the caller's view is left intact
      worker.postMessage({engineUrl:new URL(ENGINE_URL,location.href).href,bytes:copy.buffer,
        bounds:[west-margin,south-margin,east+margin,north+margin],ring,mode:request.mode,
        everyNode:request.everyNode,
        walkSpeedKph:request.walkSpeedMPerMin?request.walkSpeedMPerMin*60/1000:undefined},
        [copy.buffer]);
    });
    return networkFromBuffers(nodes,edges,request,bytes.length,junctions);
  }finally{worker.terminate();}
}

/** The flat buffers, as the `Network` the widgets read. */
export function networkFromBuffers(flatNodes:Float64Array,flatEdges:Float64Array,
  request:ExtractRequest,bytes:number,junctions:number):Network{
  const nodes=new Array(flatNodes.length/3);
  for(let i=0,j=0;i<flatNodes.length;i+=3,j++)
    nodes[j]={id:'osm-'+flatNodes[i],coordinates:[flatNodes[i+1],flatNodes[i+2]] as [number,number]};
  const edges=new Array(flatEdges.length/3);
  for(let i=0,j=0;i<flatEdges.length;i+=3,j++)
    edges[j]={from:'osm-'+flatNodes[flatEdges[i]*3],to:'osm-'+flatNodes[flatEdges[i+1]*3],lengthM:flatEdges[i+2]};
  return {nodes,edges,source:extractSource(request,bytes,junctions)} as Network;
}

export async function networkFromExtract(bytes:Uint8Array,request:ExtractRequest,
  engine?:Engine):Promise<Network>{
  const module=engine??await loadEngine();
  const {onPhase}=request;
  onPhase?.(`Reading ${(bytes.length/1e6).toFixed(0)} MB of extract…`);
  const pointer=address(module.alloc(bytes.length));
  new Uint8Array(module.memory.buffer,pointer,bytes.length).set(bytes);

  const [west,south,east,north]=geometryBounds(request.boundary);
  const margin=(request.marginM??0)/111195;
  module.set_bbox(west-margin,south-margin,east+margin,north+margin);
  module.set_two_pass(1);
  module.set_retain_all(request.everyNode?1:0);
  if(request.walkSpeedMPerMin)module.set_walk_speed_kph(request.walkSpeedMPerMin*60/1000);

  onPhase?.('Building the street network…');
  let junctions=0;
  try{junctions=module.graph_from_pbf(pointer,bytes.length,request.mode==='driving'?1:0);}
  catch(error){
    // A panic traps the module and its memory stays readable, so the reason is
    // recoverable rather than arriving as "RuntimeError: unreachable".
    const message=(()=>{try{return text(module,module.panic_ptr(),module.panic_len());}catch{return '';}})();
    throw new Error(`The street engine stopped while reading this extract${message?`: ${message.split('\n').pop()}`:''}. `
      +`Nothing was changed. A smaller study area, or the other travel mode, may get through.`);
  }
  if(junctions<0)throw new Error('That file could not be read as an OpenStreetMap extract (.osm.pbf), so nothing was changed.');
  if(junctions===0)throw new Error('The extract holds no streets of this kind inside the study area. '
    +'Check the area, the travel mode, and that the extract covers this part of the world.');

  onPhase?.(`Taking ${junctions.toLocaleString('en')} junctions out…`);
  const nodePointer=address(module.export_nodes()),nodeValues=address(module.node_values());
  const edgePointer=address(module.export_edges()),edgeValues=address(module.edge_values());
  // Copied, because the module is about to be let go and a view into its memory
  // would dangle.
  const flatNodes=new Float64Array(module.memory.buffer,nodePointer,nodeValues).slice();
  const flatEdges=new Float64Array(module.memory.buffer,edgePointer,edgeValues).slice();
  module.drop_graph();module.drop_buffers();

  const nodes=new Array(flatNodes.length/3);
  for(let i=0,j=0;i<flatNodes.length;i+=3,j++)
    nodes[j]={id:'osm-'+flatNodes[i],coordinates:[flatNodes[i+1],flatNodes[i+2]] as [number,number]};
  const edges=new Array(flatEdges.length/3);
  for(let i=0,j=0;i<flatEdges.length;i+=3,j++)
    edges[j]={from:'osm-'+flatNodes[flatEdges[i]*3],to:'osm-'+flatNodes[flatEdges[i+1]*3],lengthM:flatEdges[i+2]};

  return {nodes,edges,source:extractSource(request,bytes.length,junctions)} as Network;
}

/** What this network is, in the sentence a reader of the workflow will see.
 *  The licence travels with it: ODbL requires attribution and this is where a
 *  practitioner meets it. */
export function extractSource(request:ExtractRequest,bytes:number,junctions:number):string{
  return `OpenStreetMap ${request.mode} network, read from a ${(bytes/1e6).toFixed(0)} MB published `
    +`.osm.pbf extract on this device and clipped to the study area; ${junctions.toLocaleString('en')} `
    +`junctions${request.everyNode?' with every node kept':' with chains between junctions collapsed'}. `
    +`© OpenStreetMap contributors, ODbL 1.0. Built by the street engine in this build `
    +`(see vendor/street-engine-NOTICE.txt). Verify the extract's date; it is whatever was downloaded.`;
}
