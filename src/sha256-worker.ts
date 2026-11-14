/** A FILE'S SHA-256 OFF THE PAGE (2026-11-13; the practitioner: "Should a worker handle that so the browser does not
 *  freeze?"). The File arrives as a reference, not a copy; this reads it a slice at a time and posts how far it has got. */
import {blobDigest} from './sha256-stream.js';
self.onmessage=async(event:MessageEvent<{blob:Blob}>)=>{
  try{
    const digest=await blobDigest(event.data.blob,(read,of)=>self.postMessage({progress:[read,of]}));
    self.postMessage({digest});
  }catch(error){self.postMessage({error:error instanceof Error?`${error.name}: ${error.message}`:String(error),name:error instanceof Error?error.name:''});}
};
