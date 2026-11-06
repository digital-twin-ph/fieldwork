/** SATELLITE FILES OVER AREAS, for Sample satellite files at points or over areas (experiment 180).
 *
 *  A gridded file (MODIS land surface temperature, a Cloud-Optimized GeoTIFF in the MODIS sinusoidal projection, M1) is
 *  read over each area: the area is projected into the file's grid, and a cell counts when its centre is inside or on
 *  the area, by `rasterCellPredicate`, the rule Clip raster uses and lab check 02 holds against rasterio. The grid is
 *  never warped. No imports beyond the predicate, so the reading worker can bundle it.
 *
 *  What comes back is SUMS, not a mean: an area that straddles two tiles is read from both files, and the two are added
 *  before anything is divided. */
import {rasterCellPredicate} from './raster-mask.js';
import type {Boundary} from './types.js';

type Position=[number,number];

/** The MODIS sinusoidal projection: a sphere of radius 6,371,007.181 m, as the files state it (M1). */
export const MODIS_SPHERE=6371007.181;
export const sinusoidal=(lon:number,lat:number,R=MODIS_SPHERE):Position=>{
  const phi=lat*Math.PI/180;return [R*lon*Math.PI/180*Math.cos(phi),R*phi];};

/** An area's outline in the file's grid coordinates. Densified first: a straight edge in degrees is not straight in
 *  the sinusoidal projection, and a municipality's edge of a few hundred metres bends by far less than a cell, but an
 *  area drawn as a few long edges would not. */
export function projectBoundary(boundary:Boundary,project:(lon:number,lat:number)=>Position,maxStepDeg=0.01):Boundary{
  const ring=(r:Position[])=>{const out:Position[]=[];
    for(let i=0;i<r.length-1;i++){const [a,b]=[r[i]!,r[i+1]!],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/maxStepDeg));
      for(let k=0;k<n;k++)out.push(project(a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n));}
    out.push(project(...r.at(-1)!));return out;};
  return boundary.type==='Polygon'
    ?{type:'Polygon',coordinates:boundary.coordinates.map(r=>ring(r as Position[]))} as Boundary
    :{type:'MultiPolygon',coordinates:boundary.coordinates.map(p=>p.map(r=>ring(r as Position[])))} as Boundary;
}

const bounds=(b:Boundary)=>{let W=Infinity,S=Infinity,E=-Infinity,N=-Infinity;
  for(const poly of b.type==='Polygon'?[b.coordinates]:b.coordinates)for(const r of poly)for(const [x,y] of r as Position[]){
    if(x<W)W=x;if(x>E)E=x;if(y<S)S=y;if(y>N)N=y;}
  return {W,S,E,N};};

/** A file's grid: the top-left corner and the cell size, y negative going down, as GeoTIFF states them. */
export interface Grid {origin:Position; resolution:Position; width:number; height:number}

/** The cells of the grid whose centres are inside or on the area, as a window and a mask over it; null when the area's
 *  box misses the grid. */
export function cellsIn(projected:Boundary,grid:Grid):{window:[number,number,number,number];mask:Uint8Array}|null{
  const {W,S,E,N}=bounds(projected),[ox,oy]=grid.origin,[rx,ry]=grid.resolution;
  const c0=Math.max(0,Math.floor((W-ox)/rx)),c1=Math.min(grid.width,Math.ceil((E-ox)/rx));
  const r0=Math.max(0,Math.floor((N-oy)/ry)),r1=Math.min(grid.height,Math.ceil((S-oy)/ry));
  if(c0>=c1||r0>=r1)return null;
  const inside=rasterCellPredicate(projected,grid.origin,grid.resolution,{method:'cell-center',marginPixels:0});
  const w=c1-c0,mask=new Uint8Array(w*(r1-r0));
  for(let r=r0;r<r1;r++)for(let c=c0;c<c1;c++)if(inside(c,r))mask[(r-r0)*w+(c-c0)]=1;
  return {window:[c0,r0,c1,r1],mask};
}

/** WHICH CELLS COUNT, for MODIS land surface temperature. Its documents give the QC bits and no rule (M1), so each rule
 *  says which bits it reads. The practitioner, 2026-11-06, chose the default: produced, with an average LST error of
 *  2 K or less. */
export type ModisQualityRule='produced-2k'|'good'|'produced';
export const MODIS_RULES:Record<ModisQualityRule,string>={
  'produced-2k':'LST produced (QC bits 0-1 = 00 or 01) with an average LST error of 2 K or less (bits 6-7 = 00 or 01)',
  good:'LST produced, good quality (QC bits 0-1 = 00)',
  produced:'LST produced (QC bits 0-1 = 00 or 01), whatever its error',
};
export function modisPasses(qc:number,rule:ModisQualityRule):boolean{
  const mandatory=qc&0b11,error=(qc>>6)&0b11;
  if(rule==='good')return mandatory===0;
  if(rule==='produced')return mandatory<=1;
  return mandatory<=1&&error<=1;
}

/** What one file holds over one area, as sums so files can be added. Values are as stored, before the scale factor. */
export interface AreaSums {cells:number; withValue:number; passing:number; sum:number; min:number|null; max:number|null;
  clearSum:number; clearCells:number}
export const emptySums=():AreaSums=>({cells:0,withValue:0,passing:0,sum:0,min:null,max:null,clearSum:0,clearCells:0});
export function addSums(a:AreaSums,b:AreaSums):AreaSums{
  return {cells:a.cells+b.cells,withValue:a.withValue+b.withValue,passing:a.passing+b.passing,sum:a.sum+b.sum,
    min:a.min===null?b.min:b.min===null?a.min:Math.min(a.min,b.min),max:a.max===null?b.max:b.max===null?a.max:Math.max(a.max,b.max),
    clearSum:a.clearSum+b.clearSum,clearCells:a.clearCells+b.clearCells};
}

/** CLEAR DAYS ARE BITS, NOT A COUNT. MODIS's `Clear_sky_days` is described as *"the days in clear-sky conditions and
 *  with validate LSTs"*, but its values over Rio de Janeiro in February 2024 averaged 100 to 137 for an 8-day period:
 *  one bit per day, so 121 (01111001) is five clear days (experiment 180, M2). */
export const bitsSet=(v:number)=>{let n=0;for(let x=v&0xff;x;x&=x-1)n++;return n;};

/** Sums the cells of one window. `value`, `qc` and `clear` are the window's cells, row by row; `fill` is the value
 *  that means nothing was retrieved. A cell counts as passing when it has a value and the rule passes its QC. */
export function sumWindow(mask:Uint8Array,value:ArrayLike<number>,qc:ArrayLike<number>|null,clear:ArrayLike<number>|null,
  fill:number,passes:(qc:number)=>boolean):AreaSums{
  const s=emptySums();
  for(let i=0;i<mask.length;i++){
    if(!mask[i])continue;s.cells++;
    const v=value[i]!;if(v===fill||!Number.isFinite(v))continue;s.withValue++;
    if(qc&&!passes(qc[i]!))continue;
    s.passing++;s.sum+=v;s.min=s.min===null?v:Math.min(s.min,v);s.max=s.max===null?v:Math.max(s.max,v);
    if(clear){s.clearSum+=bitsSet(clear[i]!);s.clearCells++;}
  }
  return s;
}
