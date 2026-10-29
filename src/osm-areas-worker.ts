/// <reference lib="webworker" />
/** The polygon reader, off the main thread.
 *
 *  Reading South London's water out of Greater London is 17.1 s of synchronous JavaScript,
 *  measured 2026-10-28 on a 129,796,300-byte extract: three passes over every blob in the file,
 *  because a relation names ways, a way names nodes, and a .osm.pbf gives no index to any of
 *  them. On the main thread that is 17 s in which the page answers nothing and Chrome offers to
 *  kill it, which is the finding `street-engine-worker.ts` already records for the 416 MB case.
 *  The work is unchanged; only where it runs is.
 *
 *  The extract crosses as a transferred ArrayBuffer, so the 124 MB is moved and not copied. The
 *  features come back structured-cloned, which is a real cost -- 33,000 vertices as plain
 *  objects -- and still a fraction of the parse that produced them. */
import {areasFromExtract,type AreaRequest,type AreaRetrieval} from './osm-areas.js';
import type {ParsedFeature} from './polygon-layer.js';

export interface AreaRequestMessage {bytes:ArrayBuffer; request:AreaRequest}
export interface AreaReplyMessage {
  phase?:string; error?:string;
  features?:ParsedFeature[]; retrieval?:AreaRetrieval;
}

const say=(phase:string)=>(self as unknown as Worker).postMessage({phase} as AreaReplyMessage);

self.onmessage=async(event:MessageEvent<AreaRequestMessage>)=>{
  const {bytes,request}=event.data;
  try{
    const bundle=await areasFromExtract(new Uint8Array(bytes),request,say);
    (self as unknown as Worker).postMessage(bundle as AreaReplyMessage);
  }catch(error){
    (self as unknown as Worker).postMessage(
      {error:error instanceof Error?error.message:String(error)} as AreaReplyMessage);
  }
};
