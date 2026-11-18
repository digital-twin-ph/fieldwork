/** TERRIO, FIELDWORK'S RASTER ENGINE (experiment 221): terrio-js 0.9.0's core build decodes every GeoTIFF's cells.
 *
 *  Loaded the first time a raster is read, not with the application. Its 16 MB of WebAssembly (6.1 MB as Pages sends it)
 *  is kept in a cache of its own, `terrio-0.9.0`, which the service worker serves offline and does not clear when
 *  Fieldwork updates. In Node.js (the unit tests) it is read from the installed package. */
import type {ByteSource} from './tiff-header.js';

export const TERRIO_VERSION='0.9.0';
const WASM=`vendor/terrio-core-${TERRIO_VERSION}.wasm`,CACHE=`terrio-${TERRIO_VERSION}`;
type Terrio=typeof import('terrio-js/core');
export type TerrioDataset=Awaited<ReturnType<Terrio['openUrl']>>;
let loading:Promise<Terrio>|undefined;

/** Where the application's files are: the page's folder, or for a worker (whose script is in build/) the folder above. */
function appRoot():string{
  const g=globalThis as unknown as {document?:{baseURI:string};location?:{href:string}};
  if(g.document)return g.document.baseURI;
  return new URL('../',g.location!.href).href;
}
async function wasmBytes():Promise<Response|BufferSource>{
  const g=globalThis as unknown as {process?:{versions?:{node?:string}};caches?:CacheStorage;location?:unknown};
  if(g.process?.versions?.node&&!g.location){
    const fs='node:fs/promises',{readFile}=await import(/* @vite-ignore */ fs) as {readFile:(path:URL)=>Promise<Uint8Array<ArrayBuffer>>};
    return readFile(new URL(import.meta.resolve('terrio-js/core/terrio_bg.wasm')));
  }
  const url=new URL(WASM,appRoot()).href;
  if(!g.caches)return fetch(url);
  // KEPT ONCE FETCHED: a cache of its own, so offline after the first read, and not cleared when Fieldwork updates.
  try{
    const cache=await g.caches.open(CACHE),kept=await cache.match(url);
    if(kept)return kept;
    const response=await fetch(url);
    if(!response.ok)throw new Error(`The raster engine could not be fetched: ${response.status}.`);
    await cache.put(url,response.clone());
    return response;
  }catch(error){
    if(error instanceof Error&&error.message.startsWith('The raster engine'))throw error;
    return fetch(url);
  }
}
/** The engine, loaded once. */
export function terrio():Promise<Terrio>{
  loading??=(async()=>{
    const t=await import('terrio-js/core');
    await t.default({module_or_path:await wasmBytes()});
    return t;
  })();
  loading.catch(()=>{loading=undefined;});
  return loading;
}

/** A fetch over a file on this device or bytes in memory, answering terrio's range requests from them: only the ranges
 *  asked for are read, so a 12 GB file costs what its header and window cost. */
export function localFetch(source:Blob|ArrayBuffer):typeof fetch{
  const size=source instanceof ArrayBuffer?source.byteLength:source.size;
  return (async(_url:unknown,init:RequestInit={})=>{
    const h=init.headers instanceof Headers?init.headers.get('range'):(init.headers as Record<string,string>|undefined)?.Range??(init.headers as Record<string,string>|undefined)?.range;
    const m=/bytes=(\d+)-(\d*)/.exec(h??'');
    const start=m?Number(m[1]):0,end=m&&m[2]?Math.min(Number(m[2]),size-1):size-1;
    const bytes=source instanceof ArrayBuffer?source.slice(start,end+1):await source.slice(start,end+1).arrayBuffer();
    return new Response(bytes,{status:m?206:200,headers:{'content-range':`bytes ${start}-${end}/${size}`,'content-length':String(bytes.byteLength),'accept-ranges':'bytes'}});
  }) as typeof fetch;
}

/** A GeoTIFF opened for reading cells, from this device, from memory, or at a URL by range. */
export async function openRaster(source:ByteSource):Promise<TerrioDataset>{
  const t=await terrio();
  if(typeof source==='string')return t.openUrl(source,{format:'GTiff'});
  return t.openUrl('http://local/raster.tif',{fetch:localFetch(source),format:'GTiff'});
}
/** Band `band` (from 1) of a window [x0, y0, x1, y1] of cells, as the file holds them: no data is not converted. */
export async function readCells(dataset:TerrioDataset,window:readonly [number,number,number,number],band=1):Promise<ArrayLike<number>>{
  return dataset.readBand(band,new Uint32Array([window[0],window[1],window[2]-window[0],window[3]-window[1]]));
}

/** A remote GeoTIFF in the shape the satellite grid reader takes (src/satellite-grid-sample.ts): placed and described by
 *  Fieldwork's header reader, its cells read by terrio. Its first band only. */
export async function openImage(url:string):Promise<{getOrigin():number[];getResolution():number[];getWidth():number;getHeight():number;
  readRasters(o:{window:number[]}):Promise<ArrayLike<number>[]>;getGDALMetadata(sample?:number):Promise<Record<string,string>|null>}>{
  const {TiffHeader}=await import('./tiff-header.js');
  const [h,dataset]=await Promise.all([TiffHeader.open(url),openRaster(url)]);
  return {getOrigin:()=>h.origin,getResolution:()=>h.resolution,getWidth:()=>h.width,getHeight:()=>h.height,
    getGDALMetadata:async(sample?:number)=>h.gdalMetadata(sample??null),
    readRasters:async({window})=>{try{return [await readCells(dataset,window as [number,number,number,number])];}finally{try{dataset.free();}catch{/* already gone */}}}};
}
