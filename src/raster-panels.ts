import type {RasterGrid} from './raster.js';

/** GRID CELLS IN PANELS, ONE SCALE (experiment 212, 2026-11-13). The practitioner: *"the maps with the reddish orange
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

export interface DrawnDensity {
  layer:string; width:number; height:number;
  /** west, south, east, north of the drawn grid, which is the source window's. */
  bounds:[number,number,number,number];
  /** People per km², row by row from the north-west; NaN where no source cell under it has a value. */
  density:Float32Array;
  /** About how many metres a drawn cell is across, east-west at the window's middle latitude. */
  drawnCellM:number; sourceCellM:number; factor:number;
}

const R_KM=6371.0088;
/** The area of a latitude-longitude cell in km², between two latitudes and over a span of longitude, on the sphere. */
const cellAreaKm2=(latNorth:number,latSouth:number,lonSpan:number)=>
  R_KM*R_KM*Math.abs(lonSpan*Math.PI/180)*Math.abs(Math.sin(latNorth*Math.PI/180)-Math.sin(latSouth*Math.PI/180));

export function drawnDensity(grid:Pick<RasterGrid,'metadata'|'values'>,layer:string,maxSide=MAX_DRAWN_SIDE):DrawnDensity{
  const m=grid.metadata;
  if(m.crs!=='EPSG:4326')throw new Error(`${layer}: a raster is drawn in panels in EPSG:4326 only; this one is ${m.crs}.`);
  const [ox,oy]=m.origin as [number,number],[rx,ry]=m.resolution as [number,number];
  const factor=Math.max(1,Math.ceil(Math.max(m.width,m.height)/maxSide));
  const width=Math.ceil(m.width/factor),height=Math.ceil(m.height/factor);
  const people=new Float64Array(width*height),area=new Float64Array(width*height);
  const noData=typeof m.noData==='number'?m.noData:undefined;
  for(let r=0;r<m.height;r++){
    const north=oy+r*ry,south=north+ry,a=cellAreaKm2(north,south,rx),row=Math.floor(r/factor)*width;
    for(let c=0;c<m.width;c++){
      const v=grid.values[r*m.width+c] as number|null|undefined;
      if(v===null||v===undefined||!Number.isFinite(v)||v===noData||v<0)continue;
      const at=row+Math.floor(c/factor);people[at]+=v;area[at]+=a;
    }
  }
  const density=new Float32Array(width*height);
  for(let i=0;i<density.length;i++)density[i]=area[i]>0?people[i]/area[i]:NaN;
  const mid=oy+(m.height*ry)/2,metresPerDegree=111_320*Math.cos(mid*Math.PI/180);
  const west=ox,east=ox+m.width*rx,north=oy,south=oy+m.height*ry;
  return {layer,width,height,bounds:[Math.min(west,east),Math.min(south,north),Math.max(west,east),Math.max(south,north)],
    density,drawnCellM:Math.abs(rx)*factor*metresPerDegree,sourceCellM:Math.abs(rx)*metresPerDegree,factor};
}

/** ONE SET OF CLASSES OVER EVERY PANEL'S DRAWN CELLS ABOVE ZERO: quantiles, six of them. Returns the five inner breaks;
 *  a value at or below a break is in the class below it. */
export function pooledBreaks(panels:readonly DrawnDensity[],classes=DENSITY_RAMP.length):number[]{
  let n=0;for(const p of panels)for(const v of p.density)if(v>0)n++;
  if(!n)return [];
  const all=new Float64Array(n);let i=0;
  for(const p of panels)for(const v of p.density)if(v>0)all[i++]=v;
  all.sort();
  const breaks:number[]=[];
  for(let k=1;k<classes;k++){const b=all[Math.min(n-1,Math.floor(k*n/classes))]!;if(!breaks.length||b>breaks.at(-1)!)breaks.push(b);}
  return breaks;
}
export const classOfDensity=(v:number,breaks:readonly number[])=>{
  if(!(v>0))return -1;
  let k=0;while(k<breaks.length&&v>breaks[k]!)k++;
  return k;
};
