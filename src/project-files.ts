import type {Workflow} from './types.js';
import type {RasterAsset} from './raster.js';
import {referencedPDFs,pdfDigest} from './evidence.js';
export interface ProjectFile {sha256:string;bytes:number;filename:string;mediaType:'application/pdf'|'image/tiff';asset?:RasterAsset}
export async function contentHash(bytes:Uint8Array<ArrayBuffer>):Promise<string>{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function projectFiles(workflow:Workflow):Map<string,ProjectFile>{
  const files=new Map<string,ProjectFile>(referencedPDFs(workflow));
  for(const node of workflow.nodes)if(node.type==='raster_input'&&node.params.asset){const asset=node.params.asset,previous=files.get(asset.sha256);if(previous&&(previous.bytes!==asset.bytes||previous.mediaType!==asset.mediaType))throw new Error('Conflicting project asset identity.');files.set(asset.sha256,{...asset,asset});}
  if([...files.values()].reduce((sum,file)=>sum+file.bytes,0)>10_000_000)throw new Error('Combined PDF and raster assets exceed the 10 MB package limit.');return files;
}
export async function verifyProjectFile(file:ProjectFile,bytes:Uint8Array<ArrayBuffer>):Promise<void>{
  if(bytes.length!==file.bytes||bytes.length>5_000_000||await contentHash(bytes)!==file.sha256)throw new Error('Project asset checksum or size mismatch.');
  if(file.mediaType==='application/pdf'){await pdfDigest(bytes);return;}
  const {inspectRaster,MAX_RASTER_CELLS}=await import('./raster.js'),actual=await inspectRaster(new Blob([bytes])),expected=file.asset?.metadata;
  if(actual.width*actual.height>MAX_RASTER_CELLS||actual.blockWidth*actual.blockHeight*actual.bytesPerPixel>64_000_000)throw new Error('Packaged raster exceeds decoding limits.');
  if(expected&&JSON.stringify([actual.width,actual.height,actual.origin,actual.resolution])!==JSON.stringify([expected.width,expected.height,expected.origin,expected.resolution]))throw new Error('Raster asset metadata does not match its GeoTIFF.');
}
