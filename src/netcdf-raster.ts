/** A NETCDF GRID AS A RASTER SOURCE (experiment 198, step 2). The worker in netcdf-worker.ts opens the file in parts;
 *  this turns what it finds into the RasterMetadata a GeoTIFF gives, north first, so Raster input keeps the window
 *  around the study area exactly as it does from a GeoTIFF, and every widget downstream reads a GeoTIFF window.
 *
 *  A NetCDF coordinate is where a value sits, so the grid is point-registered: the cell around each node is half a step
 *  out on every side, and `sourceRegistration: 'PixelIsPoint'` records it. A file stored south first, as DTU25MSS
 *  is, is read with its rows turned over. */
import type {RasterMetadata} from './raster.js';
import type {NetcdfGrid,NetcdfRequest} from './netcdf-worker.js';

export type {NetcdfGrid};
export const isNetcdf=(file:File)=>/\.(nc|nc4|netcdf)$/i.test(file.name);

function ask<T>(request:NetcdfRequest):Promise<T>{
  return new Promise((resolve,reject)=>{
    const worker=new Worker('./build/netcdf-worker.js');
    worker.onmessage=event=>{worker.terminate();const d=event.data as {ok:boolean;error?:string}&T;
      if(d.ok)resolve(d);else reject(new Error(d.error??'The NetCDF file could not be read.'));};
    worker.onerror=event=>{worker.terminate();reject(new Error(event.message||'The NetCDF reader failed to start. It is saved for offline use after the first visit online.'));};
    worker.postMessage(request);
  });
}

/** The grid as a raster, north first, with the cells around its nodes. */
export function netcdfMetadata(grid:NetcdfGrid):RasterMetadata{
  if(!(grid.dlon>0))throw new Error('Longitude decreases along this file, which is not read yet: only grids stored west to east are.');
  const dy=Math.abs(grid.dlat),northNode=grid.dlat>0?grid.lat0+(grid.rows-1)*grid.dlat:grid.lat0;
  const origin:[number,number]=[grid.lon0-grid.dlon/2,northNode+dy/2],resolution:[number,number]=[grid.dlon,-dy];
  return {width:grid.columns,height:grid.rows,bands:1,origin,resolution,
    bounds:[origin[0],origin[1]-grid.rows*dy,origin[0]+grid.columns*grid.dlon,origin[1]],
    crs:'EPSG:4326',rasterType:'PixelIsArea',sourceRegistration:'PixelIsPoint',noData:grid.fill,bits:64,sampleFormat:3,
    compression:0,
    // THE FILE'S CHUNKS ARE ITS BLOCKS: what a read decompresses whole, so the same 64 MB budget a GeoTIFF's tiles meet
    // applies. Counted on north-first rows; a file stored south first aligns its chunks from the other edge, so the count
    // can be one chunk row out.
    blockWidth:grid.chunkColumns,blockHeight:grid.chunkRows,bytesPerPixel:grid.bytesPerValue,geoKeys:{},gdal:null,
    band:{netcdfVariable:grid.variable,units:grid.units,latitude:grid.latitude,longitude:grid.longitude,storedSouthFirst:grid.dlat>0},
    description:`NetCDF variable ${grid.variable}${grid.units?` (${grid.units})`:''}, values at grid nodes`};
}

export async function inspectNetcdf(file:File,variable?:string):Promise<{grid:NetcdfGrid;metadata:RasterMetadata}>{
  const {grid}=await ask<{grid:NetcdfGrid}>({op:'inspect',file,variable});
  return {grid,metadata:netcdfMetadata(grid)};
}

/** The window [column0, row0, column1, row1], north-first as rasterWindow gives it, read in parts. */
export async function readNetcdfWindow(file:File,grid:NetcdfGrid,metadata:RasterMetadata,window:[number,number,number,number])
  :Promise<{metadata:RasterMetadata;values:Float64Array}>{
  const [c0,r0,c1,r1]=window,width=c1-c0,height=r1-r0,southFirst=grid.dlat>0;
  const rows:[number,number]=southFirst?[grid.rows-r1,grid.rows-r0]:[r0,r1];
  const {values:stored}=await ask<{values:(number|null)[]}>({op:'read',file,grid,rows,columns:[c0,c1]});
  if(stored.length!==width*height)throw new Error('The NetCDF window read has the wrong size.');
  // North first, no data as NaN, compact (2026-11-13).
  const values=new Float64Array(width*height);
  for(let r=0;r<height;r++){const from=(southFirst?height-1-r:r)*width;
    for(let c=0;c<width;c++){const v=stored[from+c];values[r*width+c]=v===null||v===undefined||!Number.isFinite(v)?NaN:v;}}
  const origin:[number,number]=[metadata.origin[0]+c0*metadata.resolution[0],metadata.origin[1]+r0*metadata.resolution[1]];
  return {values,metadata:{...metadata,width,height,origin,
    bounds:[origin[0],origin[1]+height*metadata.resolution[1],origin[0]+width*metadata.resolution[0],origin[1]]}};
}
