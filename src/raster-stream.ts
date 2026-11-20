/** A RASTER TOTALLED OVER AREAS WITHOUT HOLDING IT (2026-11-19; the practitioner: "Start streaming").
 *
 *  GHS-POP over DR Congo is a window of about 519 million cells of 8 bytes, past what a tab decodes at once. Here the
 *  window is read in strips of whole rows and each strip is added up in the Rust kernel (kernel/src/zonal.rs) and let
 *  go. The rule is `totalOver`'s (src/raster-areas.ts): a cell counts for an area when its centre is inside or on it; no
 *  data counts apart; a cell of an area beyond the window counts as outside.
 *
 *  The median, which needs every value of an area at once, is found exactly by reading again: a histogram of each
 *  area's values finds the bins holding its middle ranks, and those bins' values are collected and sorted. Where the
 *  middle rank falls on a run of one value, as a population raster's zeros do, nothing need be collected. */
import {kernel} from './kernel.js';
import type {Boundary} from './types.js';

/** One area's sums, as `totalOver` gives them, with the median in place of the values. */
export interface StreamedTotal {total:number; cells:number; noData:number; outside:number; min:number|null; max:number|null;
  squares:number; populated:number; median?:number|null}
/** Reads the cells of a window [x0, y0, x1, y1] of the raster, row by row, as the file holds them. */
export type StripReader=(window:[number,number,number,number])=>Promise<ArrayLike<number>>;
export interface StreamOptions {
  /** Find each area's median too (more passes over the raster). */
  median?:boolean;
  /** How large one strip may be, in bytes of 8-byte values. */
  stripBytes?:number;
  /** Bins of a histogram per area. */
  bins?:number;
  /** Values a collection may hold, all areas together. */
  collect?:number;
  /** Told how far each pass has gone. */
  progress?:(pass:number,rowsDone:number,rows:number)=>void;
}

const SUMS=0,HISTOGRAM=1,COLLECT=2;

export async function streamedTotals(geometries:readonly Boundary[],
  raster:{origin:readonly number[];resolution:readonly number[];noData:number|string|null},
  window:readonly [number,number,number,number],read:StripReader,options:StreamOptions={}):Promise<StreamedTotal[]>{
  const [ox,oy]=raster.origin as [number,number],[rx,ry]=raster.resolution as [number,number];
  const [x0,y0,x1,y1]=window,width=x1-x0,height=y1-y0;
  const edges:number[]=[],owner:number[]=[];
  let top=Infinity,bottom=-Infinity;
  geometries.forEach((geometry,area)=>{
    for(const poly of geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates)
      for(const ring of poly as [number,number][][])
        for(let i=1;i<ring.length;i++){
          const ax=(ring[i-1]![0]-ox)/rx-x0,ay=(ring[i-1]![1]-oy)/ry-y0,bx=(ring[i]![0]-ox)/rx-x0,by=(ring[i]![1]-oy)/ry-y0;
          edges.push(ax,ay,bx,by);owner.push(area);
          top=Math.min(top,ay,by);bottom=Math.max(bottom,ay,by);
        }
  });
  const areas=geometries.length,n=owner.length;
  if(!areas||!n)return geometries.map(()=>({total:0,cells:0,noData:0,outside:0,min:null,max:null,squares:0,populated:0,...(options.median?{median:null}:{})}));
  const strip=Math.max(1,Math.min(height,Math.floor((options.stripBytes??64e6)/(Math.max(1,width)*8))));
  const bins=options.bins??4096,collect=options.collect??2_000_000;
  if(!kernel.zonal_prepare(areas,n,width,strip,bins,collect))throw new Error('There is not enough memory to read this raster in strips.');
  const f64=(which:number,length:number)=>new Float64Array(kernel.memory.buffer,kernel.zonal_ptr(which),length);
  const u32=(which:number,length:number)=>new Uint32Array(kernel.memory.buffer,kernel.zonal_ptr(which),length);
  f64(0,n*4).set(edges);u32(1,n).set(owner);
  const noData=raster.noData===null||raster.noData===''?NaN:Number(raster.noData),hasNoData=Number.isFinite(noData)?1:0;
  const first=Math.floor(top)-1,last=Math.ceil(bottom)+1;
  let pass=0;
  const run=async(mode:number)=>{
    pass++;
    if(!kernel.zonal_begin(mode))throw new Error('The raster could not be read in strips.');
    const rows=(start:number,count:number,values:number)=>{
      if(count>0&&!kernel.zonal_rows(start,count,values,mode,hasNoData?noData:0,hasNoData))throw new Error('The raster’s rows came out of order.');};
    rows(first,Math.max(0,Math.min(0,last+1)-first),0);
    for(let r=Math.max(0,first);r<Math.min(height,last+1);r+=strip){
      const count=Math.min(strip,height-r,last+1-r);
      const cells=await read([x0,y0+r,x1,y0+r+count]);
      // A FRESH VIEW AFTER EVERY READ: another step's use of the kernel may have grown its memory meanwhile.
      f64(6,count*width).set(cells as ArrayLike<number>);
      rows(r,count,1);
      options.progress?.(pass,r+count,height);
    }
    rows(Math.max(height,first),last+1-Math.max(height,first),0);
  };
  await run(SUMS);
  const acc=Float64Array.from(f64(7,areas*8));
  const out:StreamedTotal[]=geometries.map((_,a)=>{const s=acc.subarray(a*8,a*8+8);
    return {total:s[0]!,cells:s[1]!,noData:s[2]!,outside:s[3]!,min:s[1]?s[4]!:null,max:s[1]?s[5]!:null,squares:s[6]!,populated:s[7]!};});
  if(!options.median)return out;
  await medians(out,run,f64,u32,bins,collect);
  return out;
}

/** EACH AREA'S MEDIAN, EXACTLY. Each area keeps a bracket [lo, hi) holding its middle rank or ranks, with the exact count
 *  of its values below lo. A histogram over the bracket finds the bins holding the ranks; a collection over those bins,
 *  one bin wider each side because the two passes may round a value at a bin's edge apart, counts the values below and at
 *  its low end exactly and gathers those inside. A rank on the low end's value, or inside a collection that fitted, is
 *  read; otherwise the bracket is the narrower one and another round reads the raster again. */
async function medians(out:StreamedTotal[],run:(mode:number)=>Promise<void>,
  f64:(which:number,length:number)=>Float64Array,u32:(which:number,length:number)=>Uint32Array,bins:number,collect:number){
  const areas=out.length;
  interface Wanted {ranks:number[]; lo:number; hi:number; below:number; values:Map<number,number>}
  const wanted=new Map<number,Wanted>();
  out.forEach((t,a)=>{
    if(!t.cells){t.median=null;return;}
    if(t.min===t.max){t.median=t.min;return;}
    const n=t.cells;
    wanted.set(a,{ranks:[...new Set([Math.floor((n-1)/2),Math.floor(n/2)])],lo:t.min!,hi:Infinity,below:0,values:new Map()});
  });
  for(let round=0;wanted.size&&round<12;round++){
    const top=(a:number,w:Wanted)=>Number.isFinite(w.hi)?w.hi:out[a]!.max!;
    const range=f64(9,areas*2);range.fill(0);
    for(const [a,w] of wanted){range[a*2]=w.lo;range[a*2+1]=top(a,w);}
    await run(HISTOGRAM);
    const hist=Uint32Array.from(u32(8,areas*bins));
    const brackets=new Map<number,{lo:number;hi:number}>();
    const perArea=Math.max(1,Math.floor(collect/wanted.size));
    const range2=f64(9,areas*2),slots=u32(11,areas*5);
    let at=0;
    for(const [a,w] of wanted){
      const step=(top(a,w)-w.lo)/bins,h=hist.subarray(a*bins,a*bins+bins),need=w.ranks.filter(k=>!w.values.has(k));
      let cum=w.below,b1=-1,b2=-1;
      for(let b=0;b<bins;b++){const next=cum+h[b]!;
        for(const k of need)if(k>=cum&&k<next){if(b1<0||b<b1)b1=b;if(b>b2)b2=b;}
        cum=next;}
      const bracket=b1<0||!(step>0)?{lo:w.lo,hi:w.hi}
        :{lo:b1<=1?w.lo:w.lo+(b1-1)*step,hi:b2+2>=bins?w.hi:w.lo+(b2+2)*step};
      brackets.set(a,bracket);
      range2[a*2]=bracket.lo;range2[a*2+1]=bracket.hi;
      slots[a*5]=at;slots[a*5+1]=perArea;at+=perArea;
    }
    await run(COLLECT);
    const counts=Uint32Array.from(u32(11,areas*5)),collected=f64(10,at);
    for(const [a,w] of [...wanted]){
      const s=counts.subarray(a*5,a*5+5),bracket=brackets.get(a)!;
      const [start,cap,found,below,atLo]=[s[0]!,s[1]!,s[2]!,s[3]!,s[4]!];
      const values=found<=cap?Float64Array.from(collected.subarray(start,start+found)).sort():null;
      for(const k of w.ranks){
        if(w.values.has(k))continue;
        if(k>=below&&k<below+atLo)w.values.set(k,bracket.lo);
        else if(values&&k>=below&&k<below+found)w.values.set(k,values[k-below]!);
      }
      if(w.ranks.every(k=>w.values.has(k))){
        const v=w.ranks.map(k=>w.values.get(k)!);out[a]!.median=v.reduce((x,y)=>x+y,0)/v.length;wanted.delete(a);continue;}
      // Too many values to collect: the narrower bracket, and its exact count below, for another round.
      if(found>cap&&w.ranks.every(k=>w.values.has(k)||(k>=below&&k<below+found))){w.lo=bracket.lo;w.hi=bracket.hi;w.below=below;}
    }
  }
  for(const a of wanted.keys())out[a]!.median=null;
}
