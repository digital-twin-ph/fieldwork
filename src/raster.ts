import {fromBlob,fromUrl,writeArrayBuffer} from 'geotiff';
/** A GEOTIFF FROM THIS DEVICE OR AT A URL (experiment 198). A URL is read by HTTP range: only the header and the window's
 *  blocks are fetched, so a published grid of tens of megabytes yields a window of a few kilobytes. */
export type RasterSource=Blob|string;
const openTiff=(source:RasterSource)=>typeof source==='string'?fromUrl(source):fromBlob(source);
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
 *  16,777,216 is 4,096 by 4,096 and 67 MB of float32. It is set here rather than higher because
 *  what was measured is the READ: Ituri at 100 m is about 3,700 by 3,900 = 14.4M cells, so this
 *  covers a province with room, and the costs beyond the read -- keeping a grid in the payload
 *  store, carrying it through an export, drawing it -- are not yet measured. That measurement is
 *  this cap's lift test, not a reason to leave a province refused in the meantime. */
export const MAX_RASTER_CELLS=16_777_216;
export interface RasterMetadata {width:number;height:number;bands:number;bounds:Bounds;origin:[number,number];resolution:[number,number];crs:'EPSG:4326';rasterType:'PixelIsArea';
  /** The source's registration where its values sit at grid nodes, as a geoid grid's do. `origin` and `bounds` are
   *  then the cell corners around those nodes, half a cell out, and the window kept is written as area cells. */
  sourceRegistration?:'PixelIsPoint';noData:number|string|null;bits:number;sampleFormat:number;compression:number;blockWidth:number;blockHeight:number;bytesPerPixel:number;geoKeys:Record<string,unknown>;gdal:Record<string,unknown>|null;band:Record<string,unknown>|null;description:string}
export interface RasterAsset {sha256:string;bytes:number;mediaType:'image/tiff';filename:string;provenance?:import('./raster-provenance.js').RasterProvenance;metadata:RasterMetadata;source:{filename:string;bytes:number;lastModified:number;metadata:RasterMetadata;
  /** Where it was read from, when it was read at a URL rather than chosen from this device. */
  url?:string};window:[number,number,number,number]}
export interface RasterGrid {metadata:RasterMetadata;values:(number|null)[];asset:RasterAsset;boundary?:Boundary;mask?:{method:RasterMaskMethod;marginPixels?:number;inside:number;valid:number;outside:number}}
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
    // Half a cell beyond the world's edge is a point grid's outer cells, not an error.
    const slack=point?Math.max(resolution[0],-resolution[1])/2+1e-9:0;
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
  const width=window[2]-window[0],height=window[3]-window[1];check(width>0&&height>0,'Study area does not intersect any raster cells.');check(width*height<=MAX_RASTER_CELLS,'Raster window exceeds 262,144 cells. Use a smaller study area.');
  const blocksX=Math.floor((window[2]-1)/metadata.blockWidth)-Math.floor(window[0]/metadata.blockWidth)+1,blocksY=Math.floor((window[3]-1)/metadata.blockHeight)-Math.floor(window[1]/metadata.blockHeight)+1;
  check(blocksX*blocksY*metadata.blockWidth*metadata.blockHeight*metadata.bytesPerPixel<=64_000_000,'Intersecting TIFF blocks exceed the 64 MB decoding budget. Retile this raster before importing.');return window;
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
export async function readRasterWindow(blob:RasterSource,metadata:RasterMetadata,window:[number,number,number,number]):Promise<{metadata:RasterMetadata;values:(number|null)[]}>{
  const tiff=await openTiff(blob);try{const image=await tiff.getImage(),raw=await image.readRasters({window,samples:[0],interleave:true}),width=window[2]-window[0],height=window[3]-window[1],origin:[number,number]=[metadata.origin[0]+window[0]*metadata.resolution[0],metadata.origin[1]+window[1]*metadata.resolution[1]];
    const values=Array.from(raw as ArrayLike<number>,v=>Number.isFinite(v)&&v!==metadata.noData?v:null);
    check(values.length===width*height,'Raster window size mismatch.');return {metadata:{...metadata,width,height,origin,bounds:[origin[0],origin[1]+height*metadata.resolution[1],origin[0]+width*metadata.resolution[0],origin[1]]},values};
  }finally{await tiff.close();}
}
export function encodeRaster(grid:Pick<RasterGrid,'metadata'|'values'> & Partial<Pick<RasterGrid,'asset'|'boundary'|'mask'>>):Uint8Array<ArrayBuffer>{
  const m=grid.metadata;check(grid.values.length===m.width*m.height&&grid.values.length<=MAX_RASTER_CELLS,'Invalid retained raster dimensions.');
  const bytes=new Uint8Array(writeArrayBuffer(new Float64Array(grid.values.map(v=>v===null?NaN:v)),{width:m.width,height:m.height,BitsPerSample:[64],SampleFormat:[3],SamplesPerPixel:[1],PhotometricInterpretation:1,ModelPixelScale:[m.resolution[0],-m.resolution[1],0],ModelTiepoint:[0,0,0,...m.origin,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1,GDAL_NODATA:'nan',...{ImageDescription:'Fieldwork derived raster; source metadata and provenance are retained in the project.'}}));
  if(!grid.asset)return bytes;
  return appendRasterDescription(bytes,JSON.stringify({schema:'fieldwork/raster-provenance/1',embeddedBy:'Fieldwork',sourceMetadataOrigin:'Workflow-author entry, separate from original TIFF tags',originalRasterMetadata:grid.asset.source.metadata,source:grid.asset.provenance||{},originalFile:grid.asset.source.filename,retainedInputSHA256:grid.asset.sha256,operation:grid.mask?grid.mask.method+' polygon clip':'native window',boundary:grid.boundary,mask:grid.mask}));
}
export function clipRaster(grid:RasterGrid,boundary:Boundary,options:RasterClipOptions={}):RasterGrid{
  validateClipOptions(options);const method=options.method||'cell-center',marginPixels=options.marginPixels||0;
  const [x0,y0,x1,y1]=rasterWindow(grid.metadata,boundary,marginPixels),source=grid.metadata,width=x1-x0,height=y1-y0,origin:[number,number]=[source.origin[0]+x0*source.resolution[0],source.origin[1]+y0*source.resolution[1]];
  const m:RasterMetadata={...source,width,height,origin,bounds:[origin[0],origin[1]+height*source.resolution[1],origin[0]+width*source.resolution[0],origin[1]]};let inside=0,valid=0,outside=0;
  const included=rasterCellPredicate(boundary,source.origin,source.resolution,{method,marginPixels});
  const values=Array.from({length:width*height},(_,i)=>{const column=i%width,row=Math.floor(i/width),value=grid.values[(row+y0)*source.width+column+x0];if(!included(column+x0,row+y0)){outside++;return null;}inside++;if(value!==null)valid++;return value;});
  return {...structuredClone(grid),metadata:m,values,boundary:structuredClone(boundary),mask:{method,marginPixels,inside,valid,outside}};
}

/** GeoTIFF.js 3.0.5 reserves a fixed IFD buffer. Append large ASCII metadata without moving pixels or other tags. */
function appendRasterDescription(bytes:Uint8Array<ArrayBuffer>,text:string):Uint8Array<ArrayBuffer>{
 const ascii=text.replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\0';check(ascii.length<=60000,'Raster export metadata exceeds 60 KB. Shorten the source notes or export the project package.');
 const offset=bytes.length+(bytes.length%2),result=new Uint8Array(offset+ascii.length);result.set(bytes);result.set(new TextEncoder().encode(ascii),offset);
 const view=new DataView(result.buffer),little=view.getUint16(0,false)===0x4949;check(view.getUint16(2,little)===42,'Expected classic TIFF writer output.');const ifd=view.getUint32(4,little),count=view.getUint16(ifd,little);
 for(let i=0;i<count;i++){const entry=ifd+2+i*12;if(view.getUint16(entry,little)===270){check(view.getUint16(entry+2,little)===2,'Expected ASCII TIFF description.');view.setUint32(entry+4,ascii.length,little);view.setUint32(entry+8,offset,little);return result;}}
 throw new Error('TIFF description tag is missing.');
}
