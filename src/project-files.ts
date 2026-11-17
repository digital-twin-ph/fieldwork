import type {Workflow} from './types.js';
import type {RasterAsset} from './raster.js';
import {rasterFileByteLimit,MAX_DECODE_BYTES} from './raster-limits.js';
import {referencedPDFs,pdfDigest,MAX_PDF_BYTES} from './evidence.js';
export interface ProjectFile {sha256:string;bytes:number;filename:string;mediaType:'application/pdf'|'image/tiff';asset?:RasterAsset}
/** A SHA-256 THAT DOES NOT COPY WHAT IT HASHES (2026-11-17). SubtleCrypto takes its own copy of the buffer, which for a
 *  saved raster window is a second window in memory at the moment saving is already at its peak (Nigeria: 0.67 GB).
 *  Above `inPlaceFrom` bytes the digest is computed over slices of the same buffer, about ten times slower (260 MB/s
 *  against 2,450 MB/s, measured in Node), pausing between slices so the page keeps answering. Same digest either way. */
export async function contentHash(bytes:Uint8Array<ArrayBuffer>,inPlaceFrom=64*1024*1024):Promise<string>{
  if(bytes.length<inPlaceFrom)return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const {Sha256}=await import('./sha256-stream.js'),hash=new Sha256(),slice=32*1024*1024;
  for(let at=0;at<bytes.length;at+=slice){hash.update(bytes.subarray(at,at+slice));await new Promise(r=>setTimeout(r,0));}
  return hash.hex();
}
/** THE LARGEST FILE OF EACH KIND a project carries: a PDF as evidence allows, a raster as the measured cell cap allows
 *  (2026-11-12; rasters were held to a combined 10 MB with PDFs, a number from before the cap was measured). */
export const fileByteLimit=(mediaType:ProjectFile['mediaType']):number=>mediaType==='image/tiff'?rasterFileByteLimit():MAX_PDF_BYTES;
/** `carried`: only the files a workflow file carries, leaving out raster windows that can be read again (experiment 209). */
export function projectFiles(workflow:Workflow,carried=false):Map<string,ProjectFile>{
  const files=new Map<string,ProjectFile>(referencedPDFs(workflow));
  for(const node of workflow.nodes)if(node.type==='raster_input'&&node.params.asset&&!(carried&&rereadableAsset(node.params.asset))){const asset=node.params.asset,previous=files.get(asset.sha256);if(previous&&(previous.bytes!==asset.bytes||previous.mediaType!==asset.mediaType))throw new Error('Conflicting project asset identity.');files.set(asset.sha256,{...asset,asset});}
  return files;
}
const rereadableAsset=(asset:{source:{url?:string;sha256?:string}})=>!!asset.source.url||/^[a-f0-9]{64}$/.test(asset.source.sha256??'');
export async function verifyProjectFile(file:ProjectFile,bytes:Uint8Array<ArrayBuffer>):Promise<void>{
  if(bytes.length!==file.bytes||bytes.length>fileByteLimit(file.mediaType)||await contentHash(bytes)!==file.sha256)throw new Error('Project asset checksum or size mismatch.');
  if(file.mediaType==='application/pdf'){await pdfDigest(bytes);return;}
  const {inspectRaster,MAX_RASTER_CELLS}=await import('./raster.js'),actual=await inspectRaster(bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes.buffer:new Blob([bytes])),expected=file.asset?.metadata;
  if(actual.width*actual.height>MAX_RASTER_CELLS||actual.blockWidth*actual.blockHeight*actual.bytesPerPixel>MAX_DECODE_BYTES)throw new Error('Packaged raster exceeds decoding limits.');
  if(expected&&JSON.stringify([actual.width,actual.height,actual.origin,actual.resolution])!==JSON.stringify([expected.width,expected.height,expected.origin,expected.resolution]))throw new Error('Raster asset metadata does not match its GeoTIFF.');
}
