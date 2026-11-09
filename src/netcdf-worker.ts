/** READS A WINDOW OF A LATITUDE-LONGITUDE NETCDF GRID CHOSEN FROM THIS DEVICE, in parts (experiment 198, step 2). The
 *  file is mounted with WORKERFS, so h5wasm reads it through slices of the File and only the chunks a read touches
 *  are decompressed: DTU25MSS is 2.9 GB, and the window around a city is a few hundred cells. NetCDF-4 is HDF5, which
 *  h5wasm 0.10.3 (NIST; vendor/h5wasm-0.10.3-LICENSE.txt) reads; classic NetCDF-3 is not HDF5 and is refused by name.
 *
 *  What this reads as a grid: one-dimensional coordinate variables named latitude or lat and longitude or lon, evenly
 *  spaced, and a variable whose shape is exactly [latitude, longitude] (or [1, latitude, longitude], a single time).
 *  Coordinates are where the values sit, so the grid is recorded as point-registered, as a node grid read from a
 *  GeoTIFF is. A fill value, missing value, scale factor and offset are applied as CF says. */
interface Dataset {shape:number[]; dtype:string; metadata:{chunks?:number[]|null; size?:number}; attrs:Record<string,{value:unknown}|undefined>; value:unknown;
  slice(ranges:[number,number][]):ArrayLike<number>}
interface H5File {keys():string[]; get(path:string):Dataset|null; close():void}
declare const h5wasm:{ready:Promise<{FS:{mkdir(path:string):void;mount(type:unknown,options:{files:File[]},path:string):void;
  unmount(path:string):void;filesystems:{WORKERFS:unknown}}}>; File:new(path:string,mode:string)=>H5File};

importScripts('../vendor/h5wasm-0.10.3.js');

export interface NetcdfGrid {variable:string; candidates:string[]; latitude:string; longitude:string; rows:number; columns:number;
  /** First and step of each axis, as the file stores it. */
  lat0:number; dlat:number; lon0:number; dlon:number; time:boolean; units:string|null; fill:number|null;
  /** The stored chunk, rows by columns, which is what a read decompresses whole; a contiguous variable is read cell by
   *  cell. And the bytes of one stored value. */
  chunkRows:number; chunkColumns:number; bytesPerValue:number}
export type NetcdfRequest={op:'inspect';file:File;variable?:string}|{op:'read';file:File;grid:NetcdfGrid;rows:[number,number];columns:[number,number]};

const first=(value:unknown)=>Array.isArray(value)||ArrayBuffer.isView(value)?(value as ArrayLike<unknown>)[0]:value;
const numberAttr=(d:Dataset,name:string)=>{const v=Number(first(d.attrs[name]?.value));return Number.isFinite(v)?v:null;};
const textAttr=(d:Dataset,name:string)=>{const v=first(d.attrs[name]?.value);return typeof v==='string'&&v.trim()?v.trim():null;};
const axis=(file:H5File,names:string[])=>{const keys=file.keys();const name=keys.find(k=>names.includes(k.toLowerCase()));return name?{name,data:file.get(name)!}:null;};

function regular(values:ArrayLike<number>,label:string):{first:number;step:number}{
  if(values.length<2)throw new Error(`The ${label} axis has fewer than two values.`);
  const step=(values[values.length-1]!-values[0]!)/(values.length-1);
  // Evenly spaced to a millionth of a step at every node: a grid that is not regular has no single cell size.
  for(let i=1;i<values.length;i++)if(Math.abs(values[i]!-values[0]!-i*step)>Math.abs(step)*1e-6+1e-9)
    throw new Error(`The ${label} axis is not evenly spaced (at index ${i}), so it is not a regular grid. Only regular latitude-longitude grids are read.`);
  return {first:values[0]!,step};
}

function inspect(file:H5File,wanted?:string):NetcdfGrid{
  const lat=axis(file,['latitude','lat']),lon=axis(file,['longitude','lon']);
  if(!lat||!lon)throw new Error('No latitude and longitude coordinate variables were found (named latitude or lat, longitude or lon). Only latitude-longitude grids are read.');
  if(lat.data.shape.length!==1||lon.data.shape.length!==1)throw new Error('Latitude and longitude are not one-dimensional, so this is not a regular grid (a satellite swath, perhaps). Only regular latitude-longitude grids are read.');
  const [rows,columns]=[lat.data.shape[0]!,lon.data.shape[0]!];
  const fits=(d:Dataset)=>(d.shape.length===2&&d.shape[0]===rows&&d.shape[1]===columns)||(d.shape.length===3&&d.shape[0]===1&&d.shape[1]===rows&&d.shape[2]===columns);
  const candidates=file.keys().filter(k=>k!==lat.name&&k!==lon.name).filter(k=>{const d=file.get(k);return !!d&&Array.isArray(d.shape)&&fits(d);});
  if(!candidates.length)throw new Error(`No variable here has the shape latitude × longitude (${rows} × ${columns}).`);
  const variable=wanted&&candidates.includes(wanted)?wanted:candidates[0]!;
  const data=file.get(variable)!,a=regular(lat.data.value as ArrayLike<number>,'latitude'),b=regular(lon.data.value as ArrayLike<number>,'longitude');
  return {variable,candidates,latitude:lat.name,longitude:lon.name,rows,columns,lat0:a.first,dlat:a.step,lon0:b.first,dlon:b.step,
    time:data.shape.length===3,units:textAttr(data,'units'),fill:numberAttr(data,'_FillValue')??numberAttr(data,'missing_value'),
    chunkRows:data.metadata.chunks?.at(-2)??1,chunkColumns:data.metadata.chunks?.at(-1)??1,bytesPerValue:data.metadata.size??8};
}

function read(file:H5File,grid:NetcdfGrid,rows:[number,number],columns:[number,number]):(number|null)[]{
  const d=file.get(grid.variable);if(!d)throw new Error(`${grid.variable} is not in this file.`);
  const ranges:[number,number][]=grid.time?[[0,1],rows,columns]:[rows,columns];
  const raw=d.slice(ranges),scale=numberAttr(d,'scale_factor')??1,offset=numberAttr(d,'add_offset')??0;
  const fill=numberAttr(d,'_FillValue'),missing=numberAttr(d,'missing_value');
  return Array.from(raw,v=>{const n=Number(v);return !Number.isFinite(n)||n===fill||n===missing?null:n*scale+offset;});
}

let mounted=0;
self.onmessage=async(event:MessageEvent<NetcdfRequest>)=>{
  const request=event.data,dir=`/nc${++mounted}`;
  try{
    const {FS}=await h5wasm.ready;
    // HDF5's signature, not the extension: a classic NetCDF-3 file starts with CDF and h5wasm cannot open it.
    const head=new Uint8Array(await request.file.slice(0,8).arrayBuffer());
    if(head[0]===0x43&&head[1]===0x44&&head[2]===0x46)throw new Error('This is a classic NetCDF-3 file. Only NetCDF-4 (HDF5) files are read; convert it with nccopy -k nc4.');
    if(!(head[1]===0x48&&head[2]===0x44&&head[3]===0x46))throw new Error('This is not a NetCDF-4 (HDF5) file.');
    FS.mkdir(dir);FS.mount(FS.filesystems.WORKERFS,{files:[request.file]},dir);
    const file=new h5wasm.File(`${dir}/${request.file.name}`,'r');
    try{
      if(request.op==='inspect')postMessage({ok:true,grid:inspect(file,request.variable)});
      else postMessage({ok:true,values:read(file,request.grid,request.rows,request.columns)});
    }finally{file.close();try{FS.unmount(dir);}catch{/* already gone */}}
  }catch(error){postMessage({ok:false,error:error instanceof Error?error.message:String(error)});}
};
