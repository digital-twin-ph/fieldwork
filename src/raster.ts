import {fromBlob,writeArrayBuffer} from 'geotiff';
import type {Boundary,Bounds} from './types.js';
import {geometryBounds} from './study-area.js';
import {pointRelation} from './spatial-coverage.js';

export const MAX_RASTER_CELLS=262144;
export interface RasterMetadata {width:number;height:number;bands:number;bounds:Bounds;origin:[number,number];resolution:[number,number];crs:'EPSG:4326';rasterType:'PixelIsArea';noData:number|string|null;bits:number;sampleFormat:number;compression:number;blockWidth:number;blockHeight:number;bytesPerPixel:number;geoKeys:Record<string,unknown>;gdal:Record<string,unknown>|null;band:Record<string,unknown>|null;description:string}
export interface RasterAsset {sha256:string;bytes:number;mediaType:'image/tiff';filename:string;provenance?:import('./raster-provenance.js').RasterProvenance;metadata:RasterMetadata;source:{filename:string;bytes:number;lastModified:number;metadata:RasterMetadata};window:[number,number,number,number]}
export interface RasterGrid {metadata:RasterMetadata;values:(number|null)[];asset:RasterAsset;boundary?:Boundary;mask?:{method:'cell-center';inside:number;valid:number;outside:number}}
function check(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
export async function inspectRaster(blob:Blob):Promise<RasterMetadata>{
  const tiff=await fromBlob(blob);try{const image=await tiff.getImage(),keys=image.getGeoKeys()||{},dir=image.getFileDirectory();
    check(image.getSamplesPerPixel()===1,'Choose a single-band GeoTIFF. Multi-band selection is not implemented yet.');
    check(keys.GeographicTypeGeoKey===4326&&keys.GTModelTypeGeoKey===2,'This raster needs reprojection: the prototype requires explicit WGS84 / EPSG:4326.');
    check(keys.GTRasterTypeGeoKey===1&&!dir.hasTag('ModelTransformation'),'Use a north-up PixelIsArea GeoTIFF without a rotated transform.');
    const origin=await image.getOrigin(),resolution=await image.getResolution(),bounds=await image.getBoundingBox(),nodata=await image.getGDALNoData();
    check(origin.slice(0,2).every(Number.isFinite)&&resolution[0]>0&&resolution[1]<0&&bounds.every(Number.isFinite)&&bounds[0]>=-180&&bounds[2]<=180&&bounds[1]>=-90&&bounds[3]<=90,'Unsupported raster coordinates or resolution.');
    check([1,2,3].includes(image.getSampleFormat())&&[8,16,32,64].includes(image.getBitsPerSample())&&(image.getBitsPerSample()!==64||image.getSampleFormat()===3),'Unsupported raster sample type.');
    const result:RasterMetadata={width:image.getWidth(),height:image.getHeight(),bands:1,bounds:bounds as Bounds,origin:[origin[0],origin[1]],resolution:[resolution[0],resolution[1]],crs:'EPSG:4326',rasterType:'PixelIsArea',noData:nodata===null?null:Number.isFinite(nodata)?nodata:'NaN',bits:image.getBitsPerSample(),sampleFormat:image.getSampleFormat(),compression:Number(dir.getValue('Compression')||1),blockWidth:image.getTileWidth(),blockHeight:image.getTileHeight(),bytesPerPixel:image.getBytesPerPixel(),geoKeys:JSON.parse(JSON.stringify(keys)),gdal:await image.getGDALMetadata(),band:await image.getGDALMetadata(0),description:String(await dir.loadValue('ImageDescription')||'')};
    check(JSON.stringify(result).length<=65536,'Raster metadata exceeds the 64 KB prototype limit.');return result;
  }finally{await tiff.close();}
}
export function rasterWindow(metadata:RasterMetadata,boundary:Boundary):[number,number,number,number]{
  const [west,south,east,north]=geometryBounds(boundary),[left,bottom,right,top]=metadata.bounds,tolerance=1e-9;
  check(west>=left-tolerance&&east<=right+tolerance&&south>=bottom-tolerance&&north<=top+tolerance,'Study area extends beyond available raster coverage. Reacquire a larger window from the original file.');
  const [x,y]=metadata.origin,[dx,dy]=metadata.resolution;
  const window:[number,number,number,number]=[Math.max(0,Math.floor((west-x)/dx)),Math.max(0,Math.floor((north-y)/dy)),Math.min(metadata.width,Math.ceil((east-x)/dx)),Math.min(metadata.height,Math.ceil((south-y)/dy))];
  const width=window[2]-window[0],height=window[3]-window[1];check(width>0&&height>0,'Study area does not intersect any raster cells.');check(width*height<=MAX_RASTER_CELLS,'Raster window exceeds 262,144 cells. Use a smaller study area.');
  const blocksX=Math.floor((window[2]-1)/metadata.blockWidth)-Math.floor(window[0]/metadata.blockWidth)+1,blocksY=Math.floor((window[3]-1)/metadata.blockHeight)-Math.floor(window[1]/metadata.blockHeight)+1;
  check(blocksX*blocksY*metadata.blockWidth*metadata.blockHeight*metadata.bytesPerPixel<=64_000_000,'Intersecting TIFF blocks exceed the 64 MB decoding budget. Retile this raster before importing.');return window;
}
export async function readRasterWindow(blob:Blob,metadata:RasterMetadata,window:[number,number,number,number]):Promise<{metadata:RasterMetadata;values:(number|null)[]}>{
  const tiff=await fromBlob(blob);try{const image=await tiff.getImage(),raw=await image.readRasters({window,samples:[0],interleave:true}),width=window[2]-window[0],height=window[3]-window[1],origin:[number,number]=[metadata.origin[0]+window[0]*metadata.resolution[0],metadata.origin[1]+window[1]*metadata.resolution[1]];
    const values=Array.from(raw as ArrayLike<number>,v=>Number.isFinite(v)&&v!==metadata.noData?v:null);
    check(values.length===width*height,'Raster window size mismatch.');return {metadata:{...metadata,width,height,origin,bounds:[origin[0],origin[1]+height*metadata.resolution[1],origin[0]+width*metadata.resolution[0],origin[1]]},values};
  }finally{await tiff.close();}
}
export function encodeRaster(grid:Pick<RasterGrid,'metadata'|'values'> & Partial<Pick<RasterGrid,'asset'|'boundary'|'mask'>>):Uint8Array<ArrayBuffer>{
  const m=grid.metadata;check(grid.values.length===m.width*m.height&&grid.values.length<=MAX_RASTER_CELLS,'Invalid retained raster dimensions.');
  const bytes=new Uint8Array(writeArrayBuffer(new Float64Array(grid.values.map(v=>v===null?NaN:v)),{width:m.width,height:m.height,BitsPerSample:[64],SampleFormat:[3],SamplesPerPixel:[1],PhotometricInterpretation:1,ModelPixelScale:[m.resolution[0],-m.resolution[1],0],ModelTiepoint:[0,0,0,...m.origin,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1,GDAL_NODATA:'nan',...{ImageDescription:'Fieldwork derived raster; source metadata and provenance are retained in the project.'}}));
  if(!grid.asset)return bytes;
  return appendRasterDescription(bytes,JSON.stringify({schema:'fieldwork/raster-provenance/1',embeddedBy:'Fieldwork',sourceMetadataOrigin:'Workflow-author entry, separate from original TIFF tags',originalRasterMetadata:grid.asset.source.metadata,source:grid.asset.provenance||{},originalFile:grid.asset.source.filename,retainedInputSHA256:grid.asset.sha256,operation:grid.mask?'cell-center polygon clip':'native window',boundary:grid.boundary,mask:grid.mask}));
}
export function clipRaster(grid:RasterGrid,boundary:Boundary):RasterGrid{
  const [x0,y0,x1,y1]=rasterWindow(grid.metadata,boundary),source=grid.metadata,width=x1-x0,height=y1-y0,origin:[number,number]=[source.origin[0]+x0*source.resolution[0],source.origin[1]+y0*source.resolution[1]];
  const m:RasterMetadata={...source,width,height,origin,bounds:[origin[0],origin[1]+height*source.resolution[1],origin[0]+width*source.resolution[0],origin[1]]};let inside=0,valid=0,outside=0;
  const values=Array.from({length:width*height},(_,i)=>{const column=i%width,row=Math.floor(i/width),value=grid.values[(row+y0)*source.width+column+x0],x=m.origin[0]+(column+0.5)*m.resolution[0],y=m.origin[1]+(row+0.5)*m.resolution[1];if(pointRelation([x,y],boundary)==='Outside'){outside++;return null;}inside++;if(value!==null)valid++;return value;});
  return {...structuredClone(grid),metadata:m,values,boundary:structuredClone(boundary),mask:{method:'cell-center',inside,valid,outside}};
}

/** GeoTIFF.js 3.0.5 reserves a fixed IFD buffer. Append large ASCII metadata without moving pixels or other tags. */
function appendRasterDescription(bytes:Uint8Array<ArrayBuffer>,text:string):Uint8Array<ArrayBuffer>{
 const ascii=text.replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\0';check(ascii.length<=60000,'Raster export metadata exceeds 60 KB. Shorten the source notes or export the project package.');
 const offset=bytes.length+(bytes.length%2),result=new Uint8Array(offset+ascii.length);result.set(bytes);result.set(new TextEncoder().encode(ascii),offset);
 const view=new DataView(result.buffer),little=view.getUint16(0,false)===0x4949;check(view.getUint16(2,little)===42,'Expected classic TIFF writer output.');const ifd=view.getUint32(4,little),count=view.getUint16(ifd,little);
 for(let i=0;i<count;i++){const entry=ifd+2+i*12;if(view.getUint16(entry,little)===270){check(view.getUint16(entry+2,little)===2,'Expected ASCII TIFF description.');view.setUint32(entry+4,ascii.length,little);view.setUint32(entry+8,offset,little);return result;}}
 throw new Error('TIFF description tag is missing.');
}
