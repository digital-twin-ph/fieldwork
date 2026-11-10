/** PLACING A MAP IMAGE FROM MATCHED POINTS (experiment 201).
 *
 *  The practitioner, 2026-11-10: *"We can have an interface that pairs control points between the image and a map of
 *  the place"*, and *"we can then exercise the same step for South London if it works."* A control point is a feature
 *  found twice: on the image, as a position in its pixels, and on a map of today, as a longitude and latitude. From
 *  enough of them a placement is fitted by least squares, and each point's residual says how far the fit puts it from
 *  where it is.
 *
 *  TWO MODELS, chosen, never guessed:
 *
 *  - **north-up**: a scale and an offset for each axis, no rotation. Four numbers, two points at least. South London's
 *    Map 2 was placed this way by hand, from four points (`map2-georeference.json`), because its compass rose is
 *    vertical.
 *  - **affine**: rotation and shear as well. Six numbers, three points at least. An old plan is rarely drawn north-up.
 *
 *  Either way the fit is a world file: the six numbers QGIS and GDAL read, here in CRS84 degrees, with the origin at the
 *  CENTRE of the top-left pixel, as the format defines it. A control point's pixel position is continuous: (0, 0) is the
 *  image's top-left corner and pixel centres sit at half-integers, so the origin is the fit evaluated at (0.5, 0.5).
 *
 *  RESIDUALS ON THE GROUND, in metres east and north: where the fit puts the point minus where it is. The fit
 *  straightens a plan; it does not correct a surveyor's error in one corner, and the residuals are how that shows.
 *  Fitted in degrees, which over a village or a city is the same as fitting in metres to well under a metre. */
import type {WorldFile} from './map-image.js';

export type PlacementModel='north-up'|'affine';
export interface ControlPoint {id:string; pixel:[number,number]; lonlat:[number,number]; feature?:string}
export interface Residual {id:string; eastM:number; northM:number; metres:number}
export interface Placement {
  model:PlacementModel; points:number;
  /** lon = a·x + b·y + c, lat = d·x + e·y + f, with (x, y) the continuous pixel position. */
  coefficients:{a:number;b:number;c:number;d:number;e:number;f:number};
  world:WorldFile; residuals:Residual[]; rmsM:number; maxM:number;
}

export const MIN_POINTS:Record<PlacementModel,number>={'north-up':2,'affine':3};
const M_PER_DEG_LAT=110_570,M_PER_DEG_LON_EQ=111_320;

/** Least squares for v ≈ X·beta, by the normal equations, solved by Gaussian elimination with pivoting. */
function leastSquares(rows:number[][],values:number[]):number[]{
  const k=rows[0]!.length;
  const ata=Array.from({length:k},()=>new Array<number>(k+1).fill(0));
  rows.forEach((row,i)=>{for(let p=0;p<k;p++){for(let q=0;q<k;q++)ata[p]![q]!+=row[p]!*row[q]!;ata[p]![k]!+=row[p]!*values[i]!;}});
  for(let col=0;col<k;col++){
    let pivot=col;for(let r=col+1;r<k;r++)if(Math.abs(ata[r]![col]!)>Math.abs(ata[pivot]![col]!))pivot=r;
    if(Math.abs(ata[pivot]![col]!)<1e-12)throw new Error('These points cannot fix a placement: they lie on one line, or two are the same point.');
    [ata[col],ata[pivot]]=[ata[pivot]!,ata[col]!];
    for(let r=0;r<k;r++){if(r===col)continue;const factor=ata[r]![col]!/ata[col]![col]!;for(let c=col;c<=k;c++)ata[r]![c]!-=factor*ata[col]![c]!;}
  }
  return ata.map((row,i)=>row[k]!/row[i]!);
}

export function fitPlacement(points:readonly ControlPoint[],model:PlacementModel):Placement{
  const need=MIN_POINTS[model];
  if(points.length<need)throw new Error(`A ${model} placement needs at least ${need} points; there ${points.length===1?'is':'are'} ${points.length}.`);
  let a=0,b=0,c=0,d=0,e=0,f=0;
  if(model==='north-up'){
    [a,c]=leastSquares(points.map(p=>[p.pixel[0],1]),points.map(p=>p.lonlat[0])) as [number,number];
    [e,f]=leastSquares(points.map(p=>[p.pixel[1],1]),points.map(p=>p.lonlat[1])) as [number,number];
  }else{
    [a,b,c]=leastSquares(points.map(p=>[p.pixel[0],p.pixel[1],1]),points.map(p=>p.lonlat[0])) as [number,number,number];
    [d,e,f]=leastSquares(points.map(p=>[p.pixel[0],p.pixel[1],1]),points.map(p=>p.lonlat[1])) as [number,number,number];
  }
  const at=(x:number,y:number):[number,number]=>[a*x+b*y+c,d*x+e*y+f];
  const residuals=points.map(p=>{
    const [lon,lat]=at(p.pixel[0],p.pixel[1]);
    const eastM=(lon-p.lonlat[0])*M_PER_DEG_LON_EQ*Math.cos(p.lonlat[1]*Math.PI/180),northM=(lat-p.lonlat[1])*M_PER_DEG_LAT;
    return {id:p.id,eastM,northM,metres:Math.hypot(eastM,northM)};
  });
  const [xOrigin,yOrigin]=at(0.5,0.5);
  return {model,points:points.length,coefficients:{a,b,c,d,e,f},
    world:{xScale:a,ySkew:d,xSkew:b,yScale:e,xOrigin,yOrigin},residuals,
    rmsM:Math.sqrt(residuals.reduce((s,r)=>s+r.metres**2,0)/residuals.length),maxM:Math.max(...residuals.map(r=>r.metres))};
}

/** Where a pixel position lands, by a world file (its origin at the top-left pixel's centre). */
export function lonLatOf(world:WorldFile,x:number,y:number):[number,number]{
  const px=x-0.5,py=y-0.5;
  return [world.xScale*px+world.xSkew*py+world.xOrigin,world.ySkew*px+world.yScale*py+world.yOrigin];
}

/** The image's four corners on the ground, top-left first, clockwise. */
export function cornersOf(world:WorldFile,width:number,height:number):[number,number][]{
  return [lonLatOf(world,0,0),lonLatOf(world,width,0),lonLatOf(world,width,height),lonLatOf(world,0,height)];
}

/** One sentence of what the fit says, for the dialog and the receipt. */
export function placementSentence(p:Placement):string{
  const worst=p.residuals.reduce((w,r)=>r.metres>w.metres?r:w,p.residuals[0]!);
  return `Placed ${p.model==='north-up'?'north-up (a scale and an offset per axis, no rotation)':'by an affine fit (rotation and shear allowed)'} `
    +`from ${p.points} matched points: residuals ${Math.round(p.rmsM)} m root mean square, largest ${Math.round(p.maxM)} m`
    +`${worst.id?` at ${worst.id}`:''}. `
    +(p.points===MIN_POINTS[p.model]?'With no more points than the fit needs, every residual is zero and says nothing: add a point to measure the fit.':'');
}
