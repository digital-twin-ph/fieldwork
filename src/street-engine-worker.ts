/// <reference lib="webworker" />
/** The street engine, off the main thread.
 *
 *  Reading a province out of a 416 MB extract is twenty to thirty seconds of synchronous
 *  WebAssembly. On the main thread that is twenty to thirty seconds in which the page answers
 *  nothing, and Chrome offers to kill it: *"PBF file upload works, with a transient Wait or Kill
 *  page warning from Chrome"*, 2026-10-22. The work is unchanged; only where it runs is.
 *
 *  The extract crosses as a transferred ArrayBuffer, so the 416 MB is moved and not copied, and
 *  the graph comes back as two flat Float64Arrays, which are transferred the same way. Nothing is
 *  structured-cloned object by object in either direction. */
import type {NetworkTravelMode} from './catchments.js';

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
  export_nodes():number; node_values():number;
  export_edges():number; edge_values():number;
  drop_graph():void; drop_buffers():void;
  panic_ptr():number; panic_len():number;
}

export interface ExtractRequestMessage {
  engineUrl:string;
  bytes:ArrayBuffer;
  bounds:[number,number,number,number];
  /** The study area itself: [lon,lat,...] with (NaN,NaN) between rings. */
  ring?:Float64Array;
  mode:NetworkTravelMode;
  everyNode?:boolean;
  walkSpeedKph?:number;
}
export interface ExtractReplyMessage {
  phase?:string;
  error?:string;
  nodes?:Float64Array;
  edges?:Float64Array;
  junctions?:number;
}

const address=(value:number):number=>value>>>0;
const say=(phase:string)=>(self as unknown as Worker).postMessage({phase} as ExtractReplyMessage);

self.onmessage=async(event:MessageEvent<ExtractRequestMessage>)=>{
  const request=event.data;
  try{
    const response=await fetch(request.engineUrl);
    if(!response.ok)throw new Error('The street engine could not be read from this build.');
    const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{});
    const engine=instance.exports as unknown as Engine;
    engine.install_panic_hook();

    const bytes=new Uint8Array(request.bytes);
    say(`Reading ${(bytes.length/1e6).toFixed(0)} MB of extract…`);
    const pointer=address(engine.alloc(bytes.length));
    new Uint8Array(engine.memory.buffer,pointer,bytes.length).set(bytes);
    const [west,south,east,north]=request.bounds;
    engine.set_bbox(west,south,east,north);
    // THE AREA, not the box around it. The box is kept because it rejects most of a country in two
    // comparisons; the ring decides the rest.
    if(request.ring?.length){
      const ringPointer=address(engine.alloc(request.ring.length*8));
      new Float64Array(engine.memory.buffer,ringPointer,request.ring.length).set(request.ring);
      engine.set_polygon(ringPointer,request.ring.length);
    }else engine.set_polygon(0,0);
    engine.set_two_pass(1);
    engine.set_retain_all(request.everyNode?1:0);
    if(request.walkSpeedKph)engine.set_walk_speed_kph(request.walkSpeedKph);

    say('Building the street network…');
    let junctions=0;
    try{junctions=engine.graph_from_pbf(pointer,bytes.length,request.mode==='driving'?1:0);}
    catch(error){
      const message=(()=>{try{
        return new TextDecoder().decode(new Uint8Array(engine.memory.buffer,
          address(engine.panic_ptr()),address(engine.panic_len())));
      }catch{return '';}})();
      throw new Error(`The street engine stopped while reading this extract${
        message?`: ${message.split('\n').pop()}`:''}. Nothing was changed. A smaller study area, `
        +`or the other travel mode, may get through.`);
    }
    if(junctions<0)throw new Error('That file could not be read as an OpenStreetMap extract (.osm.pbf), so nothing was changed.');
    if(junctions===0)throw new Error('The extract holds no streets of this kind inside the study area. '
      +'Check the area, the travel mode, and that the extract covers this part of the world.');

    say(`Taking ${junctions.toLocaleString('en')} junctions out…`);
    const nodes=new Float64Array(engine.memory.buffer,address(engine.export_nodes()),address(engine.node_values())).slice();
    const edges=new Float64Array(engine.memory.buffer,address(engine.export_edges()),address(engine.edge_values())).slice();
    engine.drop_graph();engine.drop_buffers();
    (self as unknown as Worker).postMessage({nodes,edges,junctions} as ExtractReplyMessage,
      [nodes.buffer,edges.buffer]);
  }catch(error){
    (self as unknown as Worker).postMessage({error:error instanceof Error?error.message:String(error)} as ExtractReplyMessage);
  }
};
