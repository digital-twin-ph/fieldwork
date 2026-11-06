/** READING ONE SENTINEL-5P FILE AT POINTS, from an open HDF5 file: which pixel each point is read from, and the value,
 *  quality and scanline time there. Split from the reading worker on 2026-11-05 so the lab's parity fixture is made by
 *  this code rather than by a copy of it; the worker adds only opening the remote file and measuring what it cost.
 *
 *  THE COST IS THE CHUNK, NOT THE PIXEL. A Sentinel-5P orbit file stores each variable in compressed chunks (2,086 × 225
 *  pixels in the offline NO₂ file), and reading one pixel fetches its whole chunk. So latitude and longitude are read one
 *  chunk at a time, in `tileRowOrder`, and reading stops once every point has its pixel; the value, the quality and the
 *  scanline time are then read at those pixels alone. */
import {FILL,inTileExtent,nearestInTile,tileRowOrder,type SwathTile} from './satellite-pixels.js';

export interface H5Dataset {shape:number[]; metadata:{chunks?:number[]|null}; attrs:Record<string,{value:unknown}|undefined>;
  slice(ranges:[number,number][]):ArrayLike<unknown>}
export interface H5File {get(path:string):H5Dataset|null}
export interface ReaderPaths {variable:string; latitude:string; longitude:string; time:string; quality:{variable:string}}
export interface PointAt {id:string; lon:number; lat:number}
export interface PixelAt {pointId:string; row:number|null; col:number|null; value:number|null; qaRaw:number|null; time:string|null}

const first=(v:unknown):unknown=>ArrayBuffer.isView(v)||Array.isArray(v)?(v as ArrayLike<unknown>)[0]:v;

/** A point is placed on the nearest centre when it is no farther from it than 1.5 times half the spacing to that
 *  centre's nearest neighbour, or 0.01°, whichever is larger; otherwise the swath did not cover it. */
export const OFF_SWATH_FACTOR=1.5, OFF_SWATH_FLOOR=0.01;

/** The mean distance between neighbouring centres in a tile, in degrees, along its rows and columns. */
function meanSpacing(t:SwathTile):number{
  let sum=0,n=0;
  const ok=(i:number)=>Math.abs(t.lats[i]!)<=90&&Math.abs(t.lons[i]!)<=180;
  for(let r=0;r<t.rows;r++)for(let c=0;c<t.cols;c++){const i=r*t.cols+c;if(!ok(i))continue;
    if(c+1<t.cols&&ok(i+1)){sum+=Math.hypot(t.lons[i+1]!-t.lons[i]!,t.lats[i+1]!-t.lats[i]!);n++;}
    if(r+1<t.rows&&ok(i+t.cols)){sum+=Math.hypot(t.lons[i+t.cols]!-t.lons[i]!,t.lats[i+t.cols]!-t.lats[i]!);n++;}}
  return n?sum/n:0;
}

/** Half the distance from a centre to its nearest of the four neighbouring centres, looked up in whichever chunk holds
 *  each one; a neighbour in a chunk not read is left out. Distance as `nearestInTile` measures it, at the centre's
 *  latitude. */
function swathHalfSpacing(row:number,col:number,tileOf:(row:number,col:number)=>SwathTile|undefined):number{
  const at=(r:number,c:number)=>{const t=tileOf(r,c);if(!t)return null;const i=(r-t.r0)*t.cols+(c-t.c0);
    if(r<t.r0||c<t.c0||r>=t.r0+t.rows||c>=t.c0+t.cols)return null;
    const y=t.lats[i]!,x=t.lons[i]!;return Math.abs(y)<=90&&Math.abs(x)<=180?{y,x}:null;};
  const here=at(row,col);if(!here)return 0;
  const k=Math.cos(here.y*Math.PI/180);let near=Infinity;
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const){
    if(row+dr<0||col+dc<0)continue;
    const n=at(row+dr,col+dc);if(n)near=Math.min(near,Math.hypot((n.x-here.x)*k,n.y-here.y));
  }
  return Number.isFinite(near)?near/2:0;
}

export function readAtPoints(file:H5File,reader:ReaderPaths,points:readonly PointAt[]):
  {units:string|null;qaScale:number;pixels:PixelAt[];tilesRead:number}{
  const need=(path:string)=>{const d=file.get(path);if(!d)throw new Error(`The file has no ${path}.`);return d;};
  const latD=need(reader.latitude),lonD=need(reader.longitude),valueD=need(reader.variable),qaD=need(reader.quality.variable);
  const timeD=file.get(reader.time);
  const [,rows,cols]=latD.shape as [number,number,number];
  const [,chunkRows,chunkCols]=(latD.metadata.chunks??[1,rows,cols]) as [number,number,number];
  const rowTiles=Math.ceil(rows/chunkRows),colTiles=Math.ceil(cols/chunkCols);
  const meanLat=points.reduce((n,p)=>n+p.lat,0)/Math.max(points.length,1);
  // THE NEAREST CENTRE OVER THE WHOLE SWATH, not the nearest in the first chunk that covers the point. A point near a
  // chunk's edge can be nearer a centre in the next chunk: the lab's check 35 found one placed a pixel to the wrong
  // side on 2026-11-05. So a pixel on an edge the chunk shares with one not yet read is provisional, and reading goes on
  // until that chunk has been looked at. A pixel inside a chunk is final: every centre around it is in that chunk.
  const best=new Map<string,{row:number;col:number;distance:number;final:boolean}>();
  const tiles=new Map<string,SwathTile>();
  const tileOf=(row:number,col:number)=>tiles.get(`${Math.floor(row/chunkRows)},${Math.floor(col/chunkCols)}`);
  let tilesRead=0;
  for(const tr of tileRowOrder(rowTiles,meanLat)){
    for(let tc=0;tc<colTiles;tc++){
      const r0=tr*chunkRows,c0=tc*chunkCols,rr=Math.min(chunkRows,rows-r0),cc=Math.min(chunkCols,cols-c0);
      const range:[number,number][]=[[0,1],[r0,r0+rr],[c0,c0+cc]];
      const tile:SwathTile={r0,c0,rows:rr,cols:cc,lats:latD.slice(range) as ArrayLike<number>,lons:lonD.slice(range) as ArrayLike<number>};
      tiles.set(`${tr},${tc}`,tile);tilesRead++;
      // THE MARGIN IS A PIXEL OR MORE, not a fixed tenth of a degree: a swath's pixels widen towards its edges, and a
      // point between two chunks of wide pixels lay in neither one's extent (found 2026-11-05).
      const margin=Math.max(0.1,1.5*meanSpacing(tile));
      for(const p of points){
        if(best.get(p.id)?.final||!inTileExtent(p.lon,p.lat,tile,margin))continue;
        const near=nearestInTile(p.lon,p.lat,tile);
        if(!near||near.distance>=(best.get(p.id)?.distance??Infinity))continue;
        best.set(p.id,{...near,final:false});
      }
      // Final where no edge of the pixel's chunk that it sits on faces a chunk not yet read.
      for(const [id,b] of best){
        if(b.final)continue;
        const rt=Math.floor(b.row/chunkRows),ct=Math.floor(b.col/chunkCols);
        const open=(dr:number,dc:number)=>{const t=`${rt+dr},${ct+dc}`;
          return rt+dr>=0&&rt+dr<rowTiles&&ct+dc>=0&&ct+dc<colTiles&&!tiles.has(t);};
        const edgeOpen=(b.row===rt*chunkRows&&open(-1,0))||(b.row===Math.min((rt+1)*chunkRows,rows)-1&&open(1,0))
          ||(b.col===ct*chunkCols&&open(0,-1))||(b.col===Math.min((ct+1)*chunkCols,cols)-1&&open(0,1));
        if(!edgeOpen)best.set(id,{...b,final:true});
      }
      if(points.every(p=>best.get(p.id)?.final))break;
    }
    if(points.every(p=>best.get(p.id)?.final))break;
  }
  // ON THE SWATH OR NOT, by the spacing to the pixel's nearest neighbour, read across chunks where the neighbour is in
  // another chunk that was read.
  const found=new Map<string,{row:number;col:number}>();
  for(const p of points){
    const b=best.get(p.id);if(!b)continue;
    if(b.distance<=Math.max(swathHalfSpacing(b.row,b.col,tileOf)*OFF_SWATH_FACTOR,OFF_SWATH_FLOOR))found.set(p.id,{row:b.row,col:b.col});
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
  return {units:typeof units==='string'?units:null,qaScale:Number.isFinite(scale)&&scale>0?scale:1,pixels,tilesRead};
}
