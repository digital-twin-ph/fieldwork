/** A SENTINEL-5P-SHAPED FILE, MADE ON THE SPOT, for the offline browser test of Sample satellite files at points.
 *
 *  Not real data and never committed: written by h5wasm in Node with the paths, shapes, attributes and chunking of the
 *  offline NO₂ file read on 2026-11-05 (experiment 179), small enough to serve from a test. A 4 × 6 swath over New York
 *  City in two column chunks, so the reader has to find the right chunk; one pixel per gap kind. */
import h5wasm from 'h5wasm/node';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const FIXTURE={rows:4,cols:6,chunk:[1,4,3],
  // Centres on a 0.05° grid from 40.60 N, 74.10 W. Columns 0-2 and 3-5 are separate chunks.
  lat:(r)=>40.60+0.05*r, lon:(c)=>-74.10+0.05*c,
  // Per pixel: NO2 and qa_value as stored. Row 1 is below the threshold (74); pixel (2,5) passes (100); pixel (3,4) has
  // no retrieval (fill); everything else carries the qa fill, 255.
  no2:(r,c)=>r===3&&c===4?9.96921e36:4e-5+r*1e-6+c*1e-7,
  qa:(r,c)=>r===2&&c===5?100:r===1?74:255};

export async function makeFixture(){
  await h5wasm.ready;
  const dir=mkdtempSync(join(tmpdir(),'s5p-fixture-')),path=join(dir,'S5P_OFFL_FIXTURE.nc');
  const {rows,cols,chunk}=FIXTURE,n=rows*cols,shape=[1,rows,cols];
  const grid=f=>Float32Array.from({length:n},(_,i)=>f(Math.floor(i/cols),i%cols));
  const file=new h5wasm.File(path,'w');
  const product=file.create_group('PRODUCT');
  const put=(name,data,dtype,attrs={},dims=shape,chunks=chunk)=>{
    const d=product.create_dataset({name,data,shape:dims,dtype,chunks,compression:3});
    for(const [k,v] of Object.entries(attrs))d.create_attribute(k,v);};
  put('latitude',grid(FIXTURE.lat),'<f',{units:'degrees_north'});
  put('longitude',grid((r,c)=>FIXTURE.lon(c)),'<f',{units:'degrees_east'});
  put('nitrogendioxide_tropospheric_column',grid(FIXTURE.no2),'<f',{units:'mol m-2'});
  product.create_dataset({name:'qa_value',data:Uint8Array.from({length:n},(_,i)=>FIXTURE.qa(Math.floor(i/cols),i%cols)),shape,dtype:'<B'})
    .create_attribute('scale_factor',new Float32Array([0.01]));
  product.create_dataset({name:'time_utc',data:Array.from({length:rows},(_,r)=>`2023-06-07T17:24:0${r}.000000Z`),shape:[1,rows]});
  file.close();
  const bytes=readFileSync(path);rmSync(dir,{recursive:true,force:true});
  return bytes;
}

/** Answer a range request as blob storage does: 206 with Content-Range, CORS open, Accept-Ranges. */
export function serveRange(route,bytes){
  const request=route.request(),cors={'access-control-allow-origin':'*','access-control-expose-headers':'content-range, content-length, accept-ranges','accept-ranges':'bytes'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{...cors,'access-control-allow-headers':'range','access-control-allow-methods':'GET, HEAD'}});
  if(request.method()==='HEAD')return route.fulfill({status:200,headers:{...cors,'content-length':String(bytes.length)},body:''});
  const m=/bytes=(\d+)-(\d+)?/.exec(request.headers()['range']??'');
  if(!m)return route.fulfill({status:200,headers:{...cors,'content-type':'application/x-netcdf'},body:bytes});
  const a=Number(m[1]),b=Math.min(m[2]?Number(m[2]):bytes.length-1,bytes.length-1);
  return route.fulfill({status:206,headers:{...cors,'content-type':'application/x-netcdf','content-range':`bytes ${a}-${b}/${bytes.length}`},body:bytes.subarray(a,b+1)});
}
