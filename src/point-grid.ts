/** A regular grid of points inside a boundary, at a stated spacing.
 *
 *  Lifted out of `old-naledi.ts` on 2026-10-12. The computation was always general — a bounding
 *  extent, a metre spacing converted to degrees at the extent's mid-latitude, and a containment
 *  test — but it lived in a worked example's module, was titled "Sample locations", described
 *  itself as generating "demonstration points", and stamped `samplingBasis: 'demonstration-grid'`
 *  onto every point it produced. None of that follows from making a grid.
 *
 *  So this is a generalisation in place rather than a new widget: the node type does not change,
 *  no saved workflow migrates, and no example's node count moves. What changes is that the widget
 *  stops declaring itself example-specific, which is what the practitioner's rule asks of it.
 *
 *  The spacing is converted with a fixed 111,195 m per degree of latitude and a cosine correction
 *  at the mid-latitude. That is a local approximation, not a projection, and it is why the receipt
 *  says so rather than claiming a metric grid.
 */
import type {Boundary,Position} from './types.js';

/** Even-odd containment, holes excluded. No default geometry: a containment test that falls back
 *  to one example's boundary is how a general function stays example-bound. */
export function containsPoint(point:Position,geometry:Boundary):boolean{
  const ringContains=(ring:Position[])=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;};
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.some(rings=>ringContains(rings[0])&&!rings.slice(1).some(ringContains));
}

export function boundaryExtent(g:Boundary){
  const pts=g.type==='MultiPolygon'?g.coordinates.flat(2):g.coordinates.flat();
  return [Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))];
}

export interface GridPoint {id:string; name:string; coordinates:Position}

/** Both ceilings are refusals rather than truncations: a grid silently cut at 2,000 points would
 *  under-cover the boundary and nothing downstream could tell. */
export function gridPoints(geometry:Boundary,spacingM:number):GridPoint[]{
  const [x0,y0,x1,y1]=boundaryExtent(geometry),dy=spacingM/111195,dx=dy/Math.cos((y0+y1)/2*Math.PI/180);
  const points:GridPoint[]=[];
  if(Math.ceil((x1-x0)/dx)*Math.ceil((y1-y0)/dy)>10000)
    throw new Error('This study area needs too many grid cells. Reduce its extent or increase sample spacing.');
  for(let y=y0+dy/2;y<y1;y+=dy)for(let x=x0+dx/2;x<x1;x+=dx){
    if(!containsPoint([x,y],geometry))continue;
    if(points.length>=2000)throw new Error('At most 2,000 sample locations are supported. Increase sample spacing.');
    points.push({id:`sample-${points.length+1}`,name:`Sample ${points.length+1}`,coordinates:[x,y]});
  }
  return points;
}

export const GRID_METHOD='Regular point grid using a local geographic spacing approximation and boundary containment. '
  +'The points are generated positions, not households, population or observations.';
