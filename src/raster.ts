import {fromBlob,fromUrl,fromArrayBuffer} from 'geotiff';
/** A GEOTIFF FROM THIS DEVICE OR AT A URL (experiment 198). A URL is read by HTTP range: only the header and the window's
 *  blocks are fetched, so a published grid of tens of megabytes yields a window of a few kilobytes. */
/** A GeoTIFF read from a file, a URL, or bytes already in memory. Bytes in memory are read in place: a 1 GB window kept on
 *  this device, read back through a Blob, failed in the browser's FileReader (2026-11-13, GHS-POP over Botswana). */
export type RasterSource=Blob|string|ArrayBuffer;
const openTiff=(source:RasterSource)=>typeof source==='string'?fromUrl(source):source instanceof ArrayBuffer?fromArrayBuffer(source):fromBlob(source);
/** THE CELLS OF A WINDOW FIELDWORK WROTE, read in place: uncompressed, little-endian, one band, its strips one after
 *  another from an offset aligned to 8 bytes, no data already NaN (see writeGeoTiff). Undefined for any other layout, which
 *  is then read the ordinary way. */
export async function keptCells(buffer:ArrayBuffer,metadata:RasterMetadata):Promise<RasterValues|undefined>{
  const tiff=await fromArrayBuffer(buffer);
  try{const image=await tiff.getImage(),dir=image.getFileDirectory() as unknown as {loadValue?:(tag:string)=>Promise<unknown>;getValue?:(tag:string)=>unknown;StripOffsets?:unknown;Compression?:unknown};
    const read=async(tag:string)=>dir.loadValue?await dir.loadValue(tag):(dir.getValue?dir.getValue(tag):(dir as Record<string,unknown>)[tag]);
    const offsets=Array.from((await read('StripOffsets')) as ArrayLike<number>??[]),compression=Number((await read('Compression'))??1);
    const bytes=metadata.bytesPerPixel,cells=metadata.width*metadata.height,first=offsets[0];
    if(compression!==1||first===undefined||(bytes!==4&&bytes!==8)||first%bytes!==0||first+cells*bytes>buffer.byteLength)return undefined;
    const rowBytes=metadata.width*bytes,rowsPerStrip=offsets.length>1?(offsets[1]!-first)/rowBytes:metadata.height;
    if(!offsets.every((o,i)=>o===first+i*rowsPerStrip*rowBytes))return undefined;
    return bytes===8?new Float64Array(buffer,first,cells):new Float32Array(buffer,first,cells);
  }finally{await tiff.close();}
}
import type {Boundary,Bounds} from './types.js';
import {geometryBounds} from './study-area.js';
import {rasterCellPredicate,validateClipOptions} from './raster-mask.js';
import type {RasterClipOptions,RasterMaskMethod} from './raster-mask.js';
export {validateClipOptions};

/** THE WINDOW A STUDY AREA MAY TAKE OUT OF A RASTER, in cells.
 *
 *  262,144 -- a 512 by 512 window -- until 2026-10-22, carrying no evidence, no stated basis and
 *  no lift test, because src/raster.ts was not in the caps ledger's watched files. The
 *  practitioner met it the way they met the download clocks: by being refused. *"Is that another
 *  cap?"* It was.
 *
 *  Measured that day in a Chromium tab against WorldPop Botswana 2025 at 100 m, a real
 *  11,248 x 10,953 LZW GeoTIFF: a 512 window read in 77 ms, 14.4M cells in 1,217 ms, 36M in
 *  2,625 ms, and the whole 123.2M-cell raster in 8,382 ms with every value touched and held.
 *  Nothing degraded and nothing failed at any size the file could offer. The old number was
 *  about four hundred and seventy times below what a browser does comfortably.
 *
 *  16,777,216 from then until 2026-11-12, when the costs beyond the read were measured on the same file: kept, stored,
 *  packaged, clipped and drawn whole. Two obstacles fell on the way, the GeoTIFF library's 32-second writer and IndexedDB's
 *  133 MB value, and the cap became the country. See src/raster-limits.ts and widgets/caps.json. */
export {MAX_RASTER_CELLS,MAX_DECODE_BYTES,rasterFileByteLimit} from './raster-limits.js';
import {MAX_RASTER_CELLS,MAX_DECODE_BYTES} from './raster-limits.js';
export interface RasterMetadata {width:number;height:number;bands:number;bounds:Bounds;origin:[number,number];resolution:[number,number];crs:'EPSG:4326';rasterType:'PixelIsArea';
  /** The source's registration where its values sit at grid nodes, as a geoid grid's do. `origin` and `bounds` are
   *  then the cell corners around those nodes, half a cell out, and the window kept is written as area cells. */
  sourceRegistration?:'PixelIsPoint';noData:number|string|null;bits:number;sampleFormat:number;compression:number;blockWidth:number;blockHeight:number;bytesPerPixel:number;geoKeys:Record<string,unknown>;gdal:Record<string,unknown>|null;band:Record<string,unknown>|null;description:string}
export interface RasterAsset {sha256:string;bytes:number;mediaType:'image/tiff';filename:string;provenance?:import('./raster-provenance.js').RasterProvenance;metadata:RasterMetadata;source:{filename:string;bytes:number;lastModified:number;metadata:RasterMetadata;
  /** Where it was read from, when it was read at a URL rather than chosen from this device. */
  url?:string;
  /** THE SOURCE FILE'S DIGEST, for a GeoTIFF chosen from this device (experiment 209): the file is checked against it
   *  before its window is read again on another device. */
  sha256?:string};window:[number,number,number,number]}
/** A RASTER'S CELLS, compact (2026-11-13): 4 or 8 bytes a cell at the source's own precision, NaN where a cell has no data.
 *  Held as an array of numbers and nulls, three national windows at 100 m (Botswana, 123 million cells each) stalled a run in
 *  the tab; a typed array holds each in a third of the memory. */
export type RasterValues=Float32Array|Float64Array;
/** The cells of a window, no data as NaN, in an array as wide as the source needs: 8 bytes where it holds 8, or integers
 *  of 32 bits that a 4-byte float would round. */
export function rasterValues(raw:ArrayLike<number>,metadata:Pick<RasterMetadata,'noData'|'bytesPerPixel'|'sampleFormat'|'bits'>):RasterValues{
  const wide=metadata.bytesPerPixel>4||(metadata.sampleFormat!==3&&metadata.bits>=32);
  const out=wide?new Float64Array(raw.length):new Float32Array(raw.length),noData=typeof metadata.noData==='number'?metadata.noData:undefined;
  for(let i=0;i<raw.length;i++){const v=raw[i]!;out[i]=Number.isFinite(v)&&v!==noData?v:NaN;}
  return out;
}
export interface RasterGrid {metadata:RasterMetadata;values:RasterValues;asset:RasterAsset;boundary?:Boundary;mask?:{method:RasterMaskMethod;marginPixels?:number;inside:number;valid:number;outside:number}}
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
export async function inspectRaster(blob:RasterSource):Promise<RasterMetadata>{
  const tiff=await openTiff(blob);try{const image=await tiff.getImage(),keys=image.getGeoKeys()||{},dir=image.getFileDirectory();
    check(image.getSamplesPerPixel()===1,'Choose a single-band GeoTIFF. Multi-band selection is not implemented yet.');
    check(keys.GeographicTypeGeoKey===4326&&keys.GTModelTypeGeoKey===2,'This raster needs reprojection: the prototype requires explicit WGS84 / EPSG:4326.');
    check((keys.GTRasterTypeGeoKey===1||keys.GTRasterTypeGeoKey===2)&&!dir.hasTag('ModelTransformation'),'Use a north-up GeoTIFF without a rotated transform.');
    // A POINT-REGISTERED GRID's tie point is its first node; the cell around that node starts half a cell out. Read as
    // cells, its corners are shifted by half a cell, and that is recorded, not hidden (experiment 198).
    const point=keys.GTRasterTypeGeoKey===2;
    const tie=await image.getOrigin(),resolution=await image.getResolution(),nodata=await image.getGDALNoData();
    const origin=point?[tie[0]-resolution[0]/2,tie[1]-resolution[1]/2]:tie;
    const bounds=[origin[0],origin[1]+image.getHeight()*resolution[1],origin[0]+image.getWidth()*resolution[0],origin[1]];
    // Half a cell beyond the world's edge is a point grid's outer cells, not an error; and a global grid may carry a cell
    // more at the edges, as GHS-POP R2023A's does: 432,002 columns of 3 arc-seconds, from 180.0004° W to 180.0012° E
    // (2026-11-13: refused, reading Rwanda's window from JRC's copy). Two cells beyond the edge are allowed; more is refused.
    const slack=Math.max(resolution[0],-resolution[1])*2+1e-9;
    check(origin.slice(0,2).every(Number.isFinite)&&resolution[0]>0&&resolution[1]<0&&bounds.every(Number.isFinite)&&bounds[0]>=-180-slack&&bounds[2]<=180+slack&&bounds[1]>=-90-slack&&bounds[3]<=90+slack,'Unsupported raster coordinates or resolution.');
    check([1,2,3].includes(image.getSampleFormat())&&[8,16,32,64].includes(image.getBitsPerSample())&&(image.getBitsPerSample()!==64||image.getSampleFormat()===3),'Unsupported raster sample type.');
    const result:RasterMetadata={width:image.getWidth(),height:image.getHeight(),bands:1,bounds:bounds as Bounds,origin:[origin[0],origin[1]],resolution:[resolution[0],resolution[1]],crs:'EPSG:4326',rasterType:'PixelIsArea',...(point?{sourceRegistration:'PixelIsPoint' as const}:{}),noData:nodata===null?null:Number.isFinite(nodata)?nodata:'NaN',bits:image.getBitsPerSample(),sampleFormat:image.getSampleFormat(),compression:Number(dir.getValue('Compression')||1),blockWidth:image.getTileWidth(),blockHeight:image.getTileHeight(),bytesPerPixel:image.getBytesPerPixel(),geoKeys:JSON.parse(JSON.stringify(keys)),gdal:await image.getGDALMetadata(),band:await image.getGDALMetadata(0),description:String(await dir.loadValue('ImageDescription')||'')};
    check(JSON.stringify(result).length<=65536,'Raster metadata exceeds the 64 KB prototype limit.');return result;
  }finally{await tiff.close();}
}
export function rasterWindow(metadata:RasterMetadata,boundary:Boundary,paddingPixels=0):[number,number,number,number]{
  check(Number.isFinite(paddingPixels)&&paddingPixels>=0&&paddingPixels<=1.000000002,'Raster padding must be between 0 and 1 pixel.');
  const b=geometryBounds(boundary),px=paddingPixels*metadata.resolution[0],py=paddingPixels*-metadata.resolution[1];
  const [west,south,east,north]=[b[0]-px,b[1]-py,b[2]+px,b[3]+py],[left,bottom,right,top]=metadata.bounds,tolerance=1e-9;
  // A STUDY AREA REACHING PAST THE RASTER IS SAID, NOT REFUSED (the practitioner, 2026-11-12: Botswana's provinces from
  // geoBoundaries against WorldPop's file for Botswana, two outlines of one country that differ at the border). The
  // window is the part the raster covers; `rasterOverhang` says how far past which edge. No overlap at all still stops.
  void tolerance;
  check(east>left&&west<right&&north>bottom&&south<top,'The study area and this raster do not overlap: check that the file covers the area.');
  const [x,y]=metadata.origin,[dx,dy]=metadata.resolution;
  const window:[number,number,number,number]=[Math.max(0,Math.floor((west-x)/dx)),Math.max(0,Math.floor((north-y)/dy)),Math.min(metadata.width,Math.ceil((east-x)/dx)),Math.min(metadata.height,Math.ceil((south-y)/dy))];
  const width=window[2]-window[0],height=window[3]-window[1];check(width>0&&height>0,'Study area does not intersect any raster cells.');check(width*height<=MAX_RASTER_CELLS,`This window is ${(width*height).toLocaleString('en')} cells, past the ${MAX_RASTER_CELLS.toLocaleString('en')} a step keeps. Use a smaller study area.`);
  const blocksX=Math.floor((window[2]-1)/metadata.blockWidth)-Math.floor(window[0]/metadata.blockWidth)+1,blocksY=Math.floor((window[3]-1)/metadata.blockHeight)-Math.floor(window[1]/metadata.blockHeight)+1;
  check(blocksX*blocksY*metadata.blockWidth*metadata.blockHeight*metadata.bytesPerPixel<=MAX_DECODE_BYTES,'Intersecting TIFF blocks exceed the 512 MB decoding budget. Retile this raster before importing.');return window;
}
/** HOW FAR A STUDY AREA REACHES PAST THE RASTER, per edge, in degrees and roughly in kilometres; empty where it does not. */
export function rasterOverhang(metadata:RasterMetadata,boundary:Boundary):{edge:'west'|'east'|'south'|'north';degrees:number;km:number}[]{
  const [west,south,east,north]=geometryBounds(boundary),[left,bottom,right,top]=metadata.bounds,tolerance=1e-9;
  const kmPerDegree=111.32,cos=Math.cos((south+north)/2*Math.PI/180);
  const out:{edge:'west'|'east'|'south'|'north';degrees:number;km:number}[]=[];
  if(west<left-tolerance)out.push({edge:'west',degrees:left-west,km:(left-west)*kmPerDegree*cos});
  if(east>right+tolerance)out.push({edge:'east',degrees:east-right,km:(east-right)*kmPerDegree*cos});
  if(south<bottom-tolerance)out.push({edge:'south',degrees:bottom-south,km:(bottom-south)*kmPerDegree});
  if(north>top+tolerance)out.push({edge:'north',degrees:north-top,km:(north-top)*kmPerDegree});
  return out;
}
export const overhangSentence=(o:ReturnType<typeof rasterOverhang>):string=>!o.length?''
  :`The study area reaches past this raster's ${o.map(e=>`${e.edge} edge by about ${e.km<1?`${Math.round(e.km*1000)} m`:`${e.km.toFixed(1)} km`}`).join(', ')}. `
    +`Those parts have no values here.`;
/** `onProgress`, when given, is told the rows read so far and of how many: the window is then read in bands of whole
 *  tiles, about twenty of them, so a person reading a country from a remote copy sees how far it has got (the
 *  practitioner, 2026-11-14: "Can we add a progress bar to this?"). The cells are the same either way. */
export async function readRasterWindow(blob:RasterSource,metadata:RasterMetadata,window:[number,number,number,number],
  onProgress?:(rows:number,of:number)=>void):Promise<{metadata:RasterMetadata;values:RasterValues}>{
  const tiff=await openTiff(blob);try{const image=await tiff.getImage(),width=window[2]-window[0],height=window[3]-window[1],origin:[number,number]=[metadata.origin[0]+window[0]*metadata.resolution[0],metadata.origin[1]+window[1]*metadata.resolution[1]];
    let raw:ArrayLike<number>;
    if(!onProgress)raw=await image.readRasters({window,samples:[0],interleave:true}) as unknown as ArrayLike<number>;
    else{
      const tile=Math.max(1,image.getTileHeight?.()||1),band=Math.max(tile,Math.ceil(height/20/tile)*tile);
      const parts:ArrayLike<number>[]=[];onProgress(0,height);
      for(let top=window[1];top<window[3];top+=band){
        const part=await image.readRasters({window:[window[0],top,window[2],Math.min(window[3],top+band)],samples:[0],interleave:true}) as unknown as ArrayLike<number>;
        parts.push(part);onProgress(Math.min(height,top+band-window[1]),height);
      }
      const Kind=(parts[0] as unknown as {constructor:new(n:number)=>{set(a:ArrayLike<number>,at:number):void}&ArrayLike<number>}).constructor;
      const joined=new Kind(width*height);let at=0;for(const part of parts){joined.set(part,at);at+=part.length;}
      raw=joined;
    }
    const values=rasterValues(raw as ArrayLike<number>,metadata);
    check(values.length===width*height,'Raster window size mismatch.');return {metadata:{...metadata,width,height,origin,bounds:[origin[0],origin[1]+height*metadata.resolution[1],origin[0]+width*metadata.resolution[0],origin[1]]},values};
  }finally{await tiff.close();}
}
export function encodeRaster(grid:Pick<RasterGrid,'metadata'|'values'> & Partial<Pick<RasterGrid,'asset'|'boundary'|'mask'>>):Uint8Array<ArrayBuffer>{
  const m=grid.metadata;check(grid.values.length===m.width*m.height&&grid.values.length<=MAX_RASTER_CELLS,'Invalid retained raster dimensions.');
  // AT THE SOURCE'S OWN PRECISION: 4 bytes a cell for a 4-byte source such as WorldPop, 8 where the source holds 8. Writing
  // every grid as 8 bytes doubled what a window cost and claimed a precision the source does not have (2026-11-12).
  const wide=!(m.bytesPerPixel>0&&m.bytesPerPixel<=4),cells=wide?new Float64Array(grid.values.length):new Float32Array(grid.values.length);
  // A plain list of numbers and nulls is still accepted, its nulls as no data, never as 0.
  if(grid.values instanceof Float32Array||grid.values instanceof Float64Array)cells.set(grid.values);
  else for(let i=0;i<cells.length;i++){const v=(grid.values as ArrayLike<number|null>)[i];cells[i]=v===null||v===undefined?NaN:v;}
  const description=!grid.asset?'Fieldwork derived raster; source metadata and provenance are retained in the project.'
    :JSON.stringify({schema:'fieldwork/raster-provenance/1',embeddedBy:'Fieldwork',sourceMetadataOrigin:'Workflow-author entry, separate from original TIFF tags',originalRasterMetadata:grid.asset.source.metadata,source:grid.asset.provenance||{},originalFile:grid.asset.source.filename,retainedInputSHA256:grid.asset.sha256,operation:grid.mask?grid.mask.method+' polygon clip':'native window',boundary:grid.boundary,mask:grid.mask});
  return writeGeoTiff(cells,m.width,m.height,m.origin,m.resolution,description);
}

/** A SINGLE-BAND FLOAT GEOTIFF, WRITTEN DIRECTLY: classic little-endian TIFF, uncompressed strips of about 1 MiB, WGS84
 *  (EPSG:4326) and PixelIsArea, NoData NaN, the description in place. GeoTIFF.js's writer did the same through per-value
 *  arrays and took 2.7 s for 16.8 million cells and 32 s for Botswana's 123 million, all of it blocking the page
 *  (measured 2026-11-12); this copies the cells once. Read back by the same reader as every other raster. */
export function writeGeoTiff(cells:Float32Array|Float64Array,width:number,height:number,origin:readonly [number,number],resolution:readonly [number,number],description:string):Uint8Array<ArrayBuffer>{
  check(new Uint8Array(new Uint16Array([1]).buffer)[0]===1,'Raster encoding expects a little-endian platform.');
  check(cells.length===width*height,'Invalid retained raster dimensions.');
  const ascii=description.replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\0';
  check(ascii.length<=60000,'Raster export metadata exceeds 60 KB. Shorten the source notes or export the project package.');
  const bytesPerCell=cells.BYTES_PER_ELEMENT,rowBytes=width*bytesPerCell,rowsPerStrip=Math.max(1,Math.min(height,Math.floor((1<<20)/rowBytes))),strips=Math.ceil(height/rowsPerStrip);
  const geoKeys=[1,1,0,3, 1024,0,1,2, 1025,0,1,1, 2048,0,1,4326],nodata='nan\0';
  // [tag, type, count, inline value or the bytes to place after the directory]. Types: 2 ASCII, 3 SHORT, 4 LONG, 12 DOUBLE.
  type Entry=[number,number,number,number|Uint8Array];
  const doubles=(values:number[])=>new Uint8Array(new Float64Array(values).buffer),shorts=(values:number[])=>new Uint8Array(new Uint16Array(values).buffer);
  const longs=(values:number[])=>new Uint8Array(new Uint32Array(values).buffer);
  const stripCounts=Array.from({length:strips},(_,i)=>Math.min(rowsPerStrip,height-i*rowsPerStrip)*rowBytes);
  const entries:Entry[]=[[256,4,1,width],[257,4,1,height],[258,3,1,bytesPerCell*8],[259,3,1,1],[262,3,1,1],
    [270,2,ascii.length,new TextEncoder().encode(ascii)],[273,4,strips,0],[277,3,1,1],[278,4,1,rowsPerStrip],
    [279,4,strips,strips===1?stripCounts[0]!:longs(stripCounts)],[284,3,1,1],[339,3,1,3],
    [33550,12,3,doubles([resolution[0],-resolution[1],0])],[33922,12,6,doubles([0,0,0,origin[0],origin[1],0])],
    [34735,3,geoKeys.length,shorts(geoKeys)],[42113,2,nodata.length,new TextEncoder().encode(nodata)]];
  const directory=8,afterDirectory=directory+2+entries.length*12+4;
  // Out-of-line values after the directory, each on an even offset; the strip offsets last, once the cells' place is known.
  let at=afterDirectory;const placed=new Map<number,number>();
  for(const [tag,,,value] of entries)if(value instanceof Uint8Array&&value.length>4){placed.set(tag,at);at+=value.length+(value.length%2);}
  const offsetsAt=strips>1?at:0;if(strips>1)at+=strips*4;
  const cellsAt=at+((8-at%8)%8),total=cellsAt+cells.byteLength,out=new Uint8Array(total),view=new DataView(out.buffer);
  view.setUint16(0,0x4949,false);view.setUint16(2,42,true);view.setUint32(4,directory,true);view.setUint16(directory,entries.length,true);
  const stripOffsets=Array.from({length:strips},(_,i)=>cellsAt+i*rowsPerStrip*rowBytes);
  entries.forEach(([tag,type,count,value],i)=>{
    const entry=directory+2+i*12;view.setUint16(entry,tag,true);view.setUint16(entry+2,type,true);view.setUint32(entry+4,count,true);
    if(tag===273){if(strips===1)view.setUint32(entry+8,stripOffsets[0]!,true);else{view.setUint32(entry+8,offsetsAt,true);out.set(longs(stripOffsets),offsetsAt);}return;}
    if(typeof value==='number'){if(type===3)view.setUint16(entry+8,value,true);else view.setUint32(entry+8,value,true);return;}
    if(value.length<=4){out.set(value,entry+8);return;}
    view.setUint32(entry+8,placed.get(tag)!,true);out.set(value,placed.get(tag)!);
  });
  view.setUint32(directory+2+entries.length*12,0,true);
  out.set(new Uint8Array(cells.buffer,cells.byteOffset,cells.byteLength),cellsAt);
  return out;
}
export function clipRaster(grid:RasterGrid,boundary:Boundary,options:RasterClipOptions={}):RasterGrid{
  validateClipOptions(options);const method=options.method||'cell-center',marginPixels=options.marginPixels||0;
  const [x0,y0,x1,y1]=rasterWindow(grid.metadata,boundary,marginPixels),source=grid.metadata,width=x1-x0,height=y1-y0,origin:[number,number]=[source.origin[0]+x0*source.resolution[0],source.origin[1]+y0*source.resolution[1]];
  const m:RasterMetadata={...source,width,height,origin,bounds:[origin[0],origin[1]+height*source.resolution[1],origin[0]+width*source.resolution[0],origin[1]]};let inside=0,valid=0,outside=0;
  const included=rasterCellPredicate(boundary,source.origin,source.resolution,{method,marginPixels});
  const values=grid.values instanceof Float64Array?new Float64Array(width*height):new Float32Array(width*height);
  for(let i=0;i<values.length;i++){const column=i%width,row=Math.floor(i/width),value=grid.values[(row+y0)*source.width+column+x0]!;
    if(!included(column+x0,row+y0)){outside++;values[i]=NaN;continue;}inside++;
    const v=value as number|null;if(v!==null&&Number.isFinite(v)){valid++;values[i]=v;}else values[i]=NaN;}
  // The source's cells are not cloned on the way: only what describes them is.
  const {values:_source,...rest}=grid;
  return {...structuredClone(rest),metadata:m,values,boundary:structuredClone(boundary),mask:{method,marginPixels,inside,valid,outside}};
}

