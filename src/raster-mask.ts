import type {Boundary,Position} from './types.js';
import {pointRelation} from './spatial-predicates.js';

export type RasterMaskMethod='cell-center'|'all-touched';
export interface RasterClipOptions {method?:RasterMaskMethod;marginPixels?:number}
export function validateClipOptions(options:RasterClipOptions):void{
  if(options.method!==undefined&&!['cell-center','all-touched'].includes(options.method))throw new Error('Choose cell-center or all-touched pixel inclusion.');
  if(options.marginPixels!==undefined&&(!Number.isFinite(options.marginPixels)||options.marginPixels<0||options.marginPixels>1))throw new Error('Outer margin must be between 0 and 1 pixel.');
}
const pointSegment=(p:Position,a:Position,b:Position)=>{const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0;return (p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;};
/** Squared distance between a segment and a closed, axis-aligned cell rectangle. */
function segmentBox(a:Position,b:Position,left:number,top:number,right:number,bottom:number):number{
  let lo=0,hi=1;
  for(const [start,delta,min,max] of [[a[0],b[0]-a[0],left,right],[a[1],b[1]-a[1],top,bottom]]){
    if(delta===0){if(start<min||start>max){lo=2;break;}}
    else{const t0=(min-start)/delta,t1=(max-start)/delta;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
  }
  if(lo<=hi)return 0;
  const endpoint=(p:Position)=>Math.max(left-p[0],0,p[0]-right)**2+Math.max(top-p[1],0,p[1]-bottom)**2;
  return Math.min(endpoint(a),endpoint(b),...[[left,top],[left,bottom],[right,top],[right,bottom]].map(p=>pointSegment(p,a,b)));
}
/** Work in native pixel coordinates: a margin is a grid distance, not metres. */
export function rasterCellPredicate(boundary:Boundary,origin:Position,resolution:Position,options:RasterClipOptions){
  validateClipOptions(options);const method=options.method||'cell-center',margin=options.marginPixels||0;
  const transform=(p:Position)=>[(p[0]-origin[0])/resolution[0],(p[1]-origin[1])/resolution[1]];
  const polygons=(boundary.type==='Polygon'?[boundary.coordinates]:boundary.coordinates).map(poly=>poly.map(ring=>ring.map(transform)));
  const pixelBoundary:Boundary={type:'MultiPolygon',coordinates:polygons};
  const edges=polygons.flatMap(poly=>poly.flatMap(ring=>ring.slice(1).map((b,i)=>({a:ring[i],b,left:Math.min(ring[i][0],b[0]),right:Math.max(ring[i][0],b[0]),top:Math.min(ring[i][1],b[1]),bottom:Math.max(ring[i][1],b[1])}))));
  return (column:number,row:number)=>{
    const p=[column+.5,row+.5];if(pointRelation(p,pixelBoundary)!=='Outside')return true;
    if(method==='cell-center'&&margin===0)return false;
    const left=method==='all-touched'?column:p[0],top=method==='all-touched'?row:p[1],right=method==='all-touched'?column+1:p[0],bottom=method==='all-touched'?row+1:p[1];
    return edges.some(e=>e.right>=left-margin-1e-9&&e.left<=right+margin+1e-9&&e.bottom>=top-margin-1e-9&&e.top<=bottom+margin+1e-9&&segmentBox(e.a,e.b,left,top,right,bottom)<=margin*margin+1e-18);
  };
}
