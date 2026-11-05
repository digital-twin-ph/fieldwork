/** READS ONE SATELLITE FILE AT POINTS, in a worker, by HTTP range. h5wasm 0.10.3 (NIST; vendor/h5wasm-0.10.3-LICENSE.txt)
 *  opens the remote file as a lazy file, so only the blocks a read touches are fetched. Loaded from vendor/ when the first
 *  file is read and never precached: reading a remote file needs the network anyway. Experiment 179, S6.
 *
 *  THE COST IS THE CHUNK, NOT THE PIXEL. A Sentinel-5P orbit file stores each variable in compressed chunks (2,086 × 225
 *  pixels in the offline NO₂ file), and reading one pixel fetches its whole chunk. So latitude and longitude are read one
 *  chunk at a time, in `tileRowOrder`, and reading stops once every point has its pixel; the value, the quality and the
 *  scanline time are then read at those pixels alone. */
import {FILL,halfSpacing,inTileExtent,nearestInTile,tileRowOrder,type SwathTile} from './satellite-pixels.js';

interface H5Dataset {shape:number[]; metadata:{chunks?:number[]|null}; attrs:Record<string,{value:unknown}|undefined>;
  slice(ranges:[number,number][]):ArrayLike<unknown>}
interface H5File {get(path:string):H5Dataset|null; close():void}
declare const h5wasm:{ready:Promise<{FS:{createLazyFile(parent:string,name:string,url:string,read:boolean,write:boolean):void;unlink(path:string):void}}>;
  File:new(path:string,mode:string)=>H5File};

importScripts('../vendor/h5wasm-0.10.3.js');

const first=(v:unknown):unknown=>ArrayBuffer.isView(v)||Array.isArray(v)?(v as ArrayLike<unknown>)[0]:v;
let opened=0;

self.onmessage=async(event:MessageEvent)=>{
  const {url,reader,points}=event.data as {url:string;
    reader:{variable:string;latitude:string;longitude:string;time:string;quality:{variable:string}};
    points:{id:string;lon:number;lat:number}[]};
  const name=`f${++opened}.nc`;
  try{
    const {FS}=await h5wasm.ready;
    FS.createLazyFile('/',name,url,true,false);
    const file=new h5wasm.File('/'+name,'r');
    try{
      const need=(path:string)=>{const d=file.get(path);if(!d)throw new Error(`The file has no ${path}.`);return d;};
      const latD=need(reader.latitude),lonD=need(reader.longitude),valueD=need(reader.variable),qaD=need(reader.quality.variable);
      const timeD=file.get(reader.time);
      const [,rows,cols]=latD.shape as [number,number,number];
      const [,chunkRows,chunkCols]=(latD.metadata.chunks??[1,rows,cols]) as [number,number,number];
      const rowTiles=Math.ceil(rows/chunkRows),colTiles=Math.ceil(cols/chunkCols);
      const meanLat=points.reduce((n,p)=>n+p.lat,0)/Math.max(points.length,1);
      const found=new Map<string,{row:number;col:number}>();
      let tilesRead=0;
      search:for(const tr of tileRowOrder(rowTiles,meanLat))for(let tc=0;tc<colTiles;tc++){
        const r0=tr*chunkRows,c0=tc*chunkCols,rr=Math.min(chunkRows,rows-r0),cc=Math.min(chunkCols,cols-c0);
        const range:[number,number][]=[[0,1],[r0,r0+rr],[c0,c0+cc]];
        const tile:SwathTile={r0,c0,rows:rr,cols:cc,lats:latD.slice(range) as ArrayLike<number>,lons:lonD.slice(range) as ArrayLike<number>};
        tilesRead++;
        for(const p of points){
          if(found.has(p.id)||!inTileExtent(p.lon,p.lat,tile))continue;
          const near=nearestInTile(p.lon,p.lat,tile);
          if(near&&near.distance<=Math.max(halfSpacing(tile,near.row,near.col)*1.5,0.01))found.set(p.id,{row:near.row,col:near.col});
        }
        if(found.size===points.length)break search;
      }
      const pixels=points.map(p=>{
        const hit=found.get(p.id);
        if(!hit)return {pointId:p.id,row:null,col:null,value:null,qaRaw:null,time:null};
        const {row:r,col:c}=hit;
        const value=Number(valueD.slice([[0,1],[r,r+1],[c,c+1]])[0]);
        const qaRaw=Number(qaD.slice([[0,1],[r,r+1],[c,c+1]])[0]);
        const time=timeD?String(timeD.slice([[0,1],[r,r+1]])[0]??''):'';
        return {pointId:p.id,row:r,col:c,value:Number.isFinite(value)&&value<FILL?value:null,qaRaw:Number.isFinite(qaRaw)?qaRaw:null,time:time||null};
      });
      const units=first(valueD.attrs['units']?.value);
      const scale=Number(first(qaD.attrs['scale_factor']?.value));
      // WHAT IT COST, where the browser can say: the lazy file's range requests are resource entries for this URL.
      const base=url.split('?')[0]!;
      const entries=performance.getEntriesByType('resource').filter(e=>e.name.split('?')[0]===base) as PerformanceResourceTiming[];
      const bytes=entries.reduce((n,e)=>n+(e.encodedBodySize||e.transferSize||0),0);
      postMessage({ok:true,units:typeof units==='string'?units:null,qaScale:Number.isFinite(scale)&&scale>0?scale:1,pixels,tilesRead,
        requests:entries.length||null,bytes:bytes>0?bytes:null});
    }finally{file.close();try{FS.unlink('/'+name);}catch{/* already gone */}}
  }catch(error){postMessage({ok:false,error:error instanceof Error?error.message:String(error)});}
};
