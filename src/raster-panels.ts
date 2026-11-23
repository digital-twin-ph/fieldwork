import type {RasterGrid} from './raster.js';
import type {Boundary} from './types.js';
import {centreRuns} from './raster-areas.js';

/** GRID CELLS IN PANELS, ONE SCALE (Map's manual, History: panels, 2026-11-13). The practitioner: *"the maps with the reddish orange
 *  hues actually show the grid cells."* Each raster a Map is given becomes a drawn grid of people per km², at no more
 *  than `MAX_DRAWN_SIDE` cells on a side, and every panel's drawn cells are classed together.
 *
 *  Per km² of each cell's own area on the sphere, because the three grids are 100 m and 3 arc-seconds and a value per
 *  cell compares nothing across them. A drawn cell's density is the people in the source cells it covers over their
 *  area, of the cells with a value: the mean of densities would weight an empty corner as much as a town. */
export const MAX_RASTER_LAYERS=4;
export const MAX_DRAWN_SIDE=1000;
export const rasterPort=(index:number)=>index===0?'raster':`raster_${index+1}`;
export const isRasterPort=(port:string)=>port==='raster'||/^raster_[2-4]$/.test(port);
/** ColorBrewer YlOrRd, six classes: the reddish orange of the viewer the practitioner showed. */
export const DENSITY_RAMP=['#ffffb2','#fed976','#feb24c','#fd8d3c','#f03b20','#bd0026'] as const;
/** THE COLOURS A MAP'S RASTER PANELS MAY TAKE (2026-11-17). YlOrRd for densities, as before; viridis, ordered and
 *  colour-blind safe, for a value that is not a count, such as NDVI or elevation. */
export const RAMPS={YlOrRd:DENSITY_RAMP,viridis:['#440154','#414487','#2a788e','#22a884','#7ad151','#fde725']} as const;
export type RampName=keyof typeof RAMPS;
/** Map's choices for its raster panels, in Configure…; each absent is decided from the rasters' units. */
export interface RasterShading {show?:'per-km2'|'cell-value'; ramp?:RampName; classes?:'quantile'|'equal'}
export const validRasterShading=(v:unknown):v is RasterShading=>{
  if(typeof v!=='object'||v===null||Array.isArray(v))return false;
  const o=v as Record<string,unknown>;
  return Object.keys(o).every(k=>['show','ramp','classes'].includes(k))&&(o.show===undefined||o.show==='per-km2'||o.show==='cell-value')
    &&(o.ramp===undefined||Object.hasOwn(RAMPS,o.ramp as string))&&(o.classes===undefined||o.classes==='quantile'||o.classes==='equal');
};

/** WHAT A RASTER'S CELLS HOLD, from the unit its source record states (2026-11-17). The practitioner could not find how
 *  Map shaded the panels by people per km²: it did so for every raster, a count or not. A unit "per pixel" or "per cell"
 *  is a count, shown per km²; any other stated unit is a value, shown as it is. No unit stated: read as a count, as
 *  before, and the key says the unit was not stated. */
export interface RasterMeasure {kind:'count'|'value'; unit:string; stated:boolean; noun:string}
export function rasterMeasure(units:string|undefined):RasterMeasure{
  const unit=(units??'').trim();
  if(!unit)return {kind:'count',unit,stated:false,noun:''};
  const per=unit.match(/^(.*?)\s*(?:per|\/)\s*(?:pixel|cell|grid cell)$/i);
  if(per)return {kind:'count',unit,stated:true,noun:per[1]!.trim()};
  if(/^(people|persons|population|inhabitants)$/i.test(unit))return {kind:'count',unit,stated:true,noun:unit};
  return {kind:'value',unit,stated:true,noun:unit};
}

/** PANELS THAT SHARE ONE SCALE: every panel showing the same thing in the same unit. One scale is one key. */
export interface PanelScale {
  mode:'density'|'value'; label:string; ramp:RampName; classes:'quantile'|'equal'; breaks:number[]; layers:string[];
  /** For a count: what is counted, "people"; empty when the unit was not stated. */
  noun:string;
}

export interface DrawnDensity {
  layer:string; width:number; height:number;
  /** west, south, east, north of the drawn grid, which is the source window's. */
  bounds:[number,number,number,number];
  /** Per km² of what the cells count, or the cells' mean value, row by row from the north-west; NaN where no source cell
   *  under it has a value. Named for the first; `mode` says which. */
  density:Float32Array;
  mode:'density'|'value';
  /** Which of the figure's scales this panel is drawn on. */
  scale:number;
  /** About how many metres a drawn cell is across, east-west at the window's middle latitude. */
  drawnCellM:number; sourceCellM:number; factor:number;
  /** The study area's outline, thinned for drawing: rings of [lon, lat]. Absent where the raster carries no area. */
  outline?:number[][][];
}
/** AT MOST SO MANY POINTS OF OUTLINE A PANEL DRAWS: Rwanda's districts are 149,000 vertices, three panels of them a figure
 *  nobody can open.
 *
 *  SIMPLIFIED BY SHAPE, NOT BY COUNT (2026-11-17). Every k-th vertex of every ring, one k for all, drew Botswana's 28
 *  census districts as straight chords across the country, "like broken glass" (the practitioner's screenshot), and
 *  dropped small rings. Now each ring is simplified by Douglas-Peucker to within a tolerance of about half a drawn
 *  pixel of a panel 1,000 pixels across: a border stays within that of where it is, straight runs lose their points
 *  and bends keep theirs. Only if that still leaves more than `max` points is the tolerance doubled, and doubled again,
 *  until it does not. */
export const MAX_OUTLINE_POINTS=20000;
const PANEL_PIXELS=1000;
/** The points of `ring` (closed: its last point repeats its first) kept within `tolerance` of it, as a closed ring. */
export function simplifyRing(ring:readonly number[][],tolerance:number):number[][]{
  const n=ring.length-1;if(n<3)return ring.map(p=>[...p]);
  // Split the closed ring at the point farthest from its first, so each half is an open run with two ends to keep.
  let far=0,best=-1;for(let i=1;i<n;i++){const d=(ring[i]![0]!-ring[0]![0]!)**2+(ring[i]![1]!-ring[0]![1]!)**2;if(d>best){best=d;far=i;}}
  const keep=new Uint8Array(n+1);keep[0]=keep[far]=keep[n]=1;
  const t2=tolerance*tolerance,stack:[number,number][]=[[0,far],[far,n]];
  while(stack.length){const [a,b]=stack.pop()!;if(b-a<2)continue;
    const [ax,ay]=ring[a]!,[bx,by]=ring[b]!,dx=bx!-ax!,dy=by!-ay!,len2=dx*dx+dy*dy;let at=-1,max=-1;
    for(let i=a+1;i<b;i++){const [px,py]=ring[i]!;let d:number;
      if(len2===0)d=(px!-ax!)**2+(py!-ay!)**2;
      else{const t=Math.max(0,Math.min(1,((px!-ax!)*dx+(py!-ay!)*dy)/len2));d=(px!-ax!-t*dx)**2+(py!-ay!-t*dy)**2;}
      if(d>max){max=d;at=i;}}
    if(max>t2){keep[at]=1;stack.push([a,at],[at,b]);}}
  const out:number[][]=[];for(let i=0;i<=n;i++)if(keep[i])out.push([...ring[i]!]);
  return out;
}
export function thinnedOutline(boundary:Boundary,max=MAX_OUTLINE_POINTS):number[][][]{
  const rings=(boundary.type==='Polygon'?[boundary.coordinates]:boundary.coordinates).flat() as unknown as number[][][];
  let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
  for(const r of rings)for(const [x,y] of r){if(x!<west)west=x!;if(x!>east)east=x!;if(y!<south)south=y!;if(y!>north)north=y!;}
  let tolerance=Math.max(east-west,north-south)/PANEL_PIXELS/2;
  if(!(tolerance>0))return rings.map(r=>r.map(p=>[...p]));
  for(;;){const out=rings.map(r=>simplifyRing(r,tolerance)).filter(r=>r.length>=4);
    if(out.reduce((n,r)=>n+r.length,0)<=max)return out;
    tolerance*=2;}
}

const R_KM=6371.0088;
/** The area of a latitude-longitude cell in km², between two latitudes and over a span of longitude, on the sphere. */
const cellAreaKm2=(latNorth:number,latSouth:number,lonSpan:number)=>
  R_KM*R_KM*Math.abs(lonSpan*Math.PI/180)*Math.abs(Math.sin(latNorth*Math.PI/180)-Math.sin(latSouth*Math.PI/180));

export function drawnDensity(grid:Pick<RasterGrid,'metadata'|'values'>&{boundary?:Boundary|null},layer:string,maxSide=MAX_DRAWN_SIDE,
    mode:'density'|'value'='density',scale=0):DrawnDensity{
  const m=grid.metadata;
  if(m.crs!=='EPSG:4326')throw new Error(`${layer}: a raster is drawn in panels in EPSG:4326 only; this one is ${m.crs}.`);
  const [ox,oy]=m.origin as [number,number],[rx,ry]=m.resolution as [number,number];
  const factor=Math.max(1,Math.ceil(Math.max(m.width,m.height)/maxSide));
  const width=Math.ceil(m.width/factor),height=Math.ceil(m.height/factor);
  const people=new Float64Array(width*height),area=new Float64Array(width*height);
  const noData=typeof m.noData==='number'?m.noData:undefined;
  // ONLY THE STUDY AREA'S CELLS (the practitioner, 2026-11-13: "How come the static maps did not have a study area?"): a
  // window cut from a global grid, as GHS-POP's is, holds the neighbours' cells too, and they would enter the shared
  // classes. A cell counts when its centre is inside or on the area, Sample a raster's rule.
  const runs=grid.boundary?centreRuns(grid.boundary,m.origin,m.resolution,0,m.height):undefined;
  const inside=(r:number,c:number)=>!runs||runs[r]!.some(([a,b])=>c>=a&&c<=b);
  for(let r=0;r<m.height;r++){
    const north=oy+r*ry,south=north+ry,a=cellAreaKm2(north,south,rx),row=Math.floor(r/factor)*width;
    if(runs&&!runs[r]!.length)continue;
    for(let c=0;c<m.width;c++){
      if(!inside(r,c))continue;
      const v=grid.values[r*m.width+c] as number|null|undefined;
      if(v===null||v===undefined||!Number.isFinite(v)||v===noData||(mode==='density'&&v<0))continue;
      // A count is summed over the cells' area; a value is averaged over the cells, each counted once.
      const at=row+Math.floor(c/factor);people[at]+=v;area[at]+=mode==='density'?a:1;
    }
  }
  const density=new Float32Array(width*height);
  for(let i=0;i<density.length;i++)density[i]=area[i]>0?people[i]/area[i]:NaN;
  const mid=oy+(m.height*ry)/2,metresPerDegree=111_320*Math.cos(mid*Math.PI/180);
  const west=ox,east=ox+m.width*rx,north=oy,south=oy+m.height*ry;
  return {layer,width,height,bounds:[Math.min(west,east),Math.min(south,north),Math.max(west,east),Math.max(south,north)],
    density,mode,scale,drawnCellM:Math.abs(rx)*factor*metresPerDegree,sourceCellM:Math.abs(rx)*metresPerDegree,factor,
    ...(grid.boundary?{outline:thinnedOutline(grid.boundary)}:{})};
}

/** ONE SET OF CLASSES OVER EVERY PANEL'S DRAWN CELLS ABOVE ZERO: quantiles, six of them. Returns the five inner breaks;
 *  a value at or below a break is in the class below it. */
export function pooledBreaks(panels:readonly DrawnDensity[],classes=DENSITY_RAMP.length,by:'quantile'|'equal'='quantile',
    mode:'density'|'value'='density'):number[]{
  const counted=(v:number)=>mode==='density'?v>0:Number.isFinite(v);
  let n=0;for(const p of panels)for(const v of p.density)if(counted(v))n++;
  if(!n)return [];
  const all=new Float64Array(n);let i=0;
  for(const p of panels)for(const v of p.density)if(counted(v))all[i++]=v;
  all.sort();
  const breaks:number[]=[];
  for(let k=1;k<classes;k++){
    const b=by==='equal'?all[0]!+(all[n-1]!-all[0]!)*k/classes:all[Math.min(n-1,Math.floor(k*n/classes))]!;
    if(!breaks.length||b>breaks.at(-1)!)breaks.push(b);}
  return breaks;
}
export const classOfDensity=(v:number,breaks:readonly number[],mode:'density'|'value'='density')=>{
  if(mode==='density'?!(v>0):!Number.isFinite(v))return -1;
  let k=0;while(k<breaks.length&&v>breaks[k]!)k++;
  return k;
};

/** ONE RASTER'S SCALE, by the rule the panels follow (2026-11-17): a Map given a single raster shades it as a panel would be
 *  shaded, a count per km² in YlOrRd or a value as it is in viridis, and keys it in those words. The breaks are taken
 *  over the drawn cells, as a panel's are; the raster itself is drawn at its own resolution. */
export function singleRasterScale(grid:Pick<RasterGrid,'metadata'|'values'>&{boundary?:Boundary|null},layer:string,
    units:string|undefined,shading:RasterShading={}):PanelScale{
  const measure=rasterMeasure(units);
  const mode=shading.show==='cell-value'?'value':shading.show==='per-km2'?'density':measure.kind==='count'?'density':'value';
  const ramp=shading.ramp??(mode==='density'?'YlOrRd':'viridis'),classes=shading.classes??'quantile';
  const panel=drawnDensity(grid,layer,MAX_DRAWN_SIDE,mode,0);
  const label=mode==='density'?`${measure.stated?measure.noun:'count'} per km²${measure.stated?'':' (unit not stated; read as a count per cell)'}`
    :measure.unit||'value, unit not stated';
  return {mode,label,ramp,classes,breaks:pooledBreaks([panel],RAMPS[ramp].length,classes,mode),layers:[layer],noun:mode==='density'&&measure.stated?measure.noun:''};
}

/** WHERE RASTERS ON ONE MAP OVERLAP (Map's manual, History: rasters on one map, 2026-11-22): how many of each later raster's drawn
 *  cells with a value sit, by their centre, on a cell with a value of an earlier one. On one map the later input is drawn
 *  over the earlier, so these are the cells whose earlier value the map does not show. */
export function overlappingCells(panels:readonly Pick<DrawnDensity,'layer'|'width'|'height'|'bounds'|'density'>[]):{layer:string;under:string;cells:number}[]{
  const found:{layer:string;under:string;cells:number}[]=[];
  for(let j=1;j<panels.length;j++){const b=panels[j]!,[bw,,be,bn]=b.bounds,bdx=(be-bw)/b.width,bdy=(bn-b.bounds[1])/b.height;
    for(let i=0;i<j;i++){const a=panels[i]!,[aw,as,ae,an]=a.bounds;
      if(be<=aw||bw>=ae||b.bounds[1]>=an||bn<=as)continue;
      const adx=(ae-aw)/a.width,ady=(an-as)/a.height;let cells=0;
      for(let r=0;r<b.height;r++){const lat=bn-(r+.5)*bdy;if(lat<=as||lat>=an)continue;const ar=Math.floor((an-lat)/ady);
        for(let c=0;c<b.width;c++){if(!Number.isFinite(b.density[r*b.width+c]!))continue;const lon=bw+(c+.5)*bdx;if(lon<=aw||lon>=ae)continue;
          if(Number.isFinite(a.density[ar*a.width+Math.floor((lon-aw)/adx)]!))cells++;}}
      if(cells)found.push({layer:b.layer,under:a.layer,cells});}}
  return found;
}

/** POINT LAYERS DRAWN OVER RASTERS (2026-11-22): each by its step's name, every point with its name. */
export interface RasterPoints {layer:string; points:{lon:number;lat:number;name:string}[]}
/** The colour of the k-th point layer over cells: dark, so it reads on yellow and on red. */
export const RASTER_POINT_COLOURS=['#1f2a24','#2b5cab','#6a3d9a','#0b6e4f'] as const;

/** A LAYER OF A MAP OF RASTERS, as Manage layers sets it (2026-11-22): bottom to top, each shown or not, in a group or not.
 *  A raster carries its cells and its area's outline; points their marks; the Map's study area its outline. */
export type RasterMapLayer={label:string;group?:string;drawn:boolean}&(
  {kind:'raster';panel:DrawnDensity}|{kind:'points';points:RasterPoints;colour:string}|{kind:'area';outline:number[][][]});
