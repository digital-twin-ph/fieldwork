/** THE BOUNDARY REPAIR: one rule, applied to every boundary as it is read, with every vertex it removes listed. */
import type {Polygon,Boundary,Position} from './types.js';

/** ONE VERTEX THE BOUNDARY REPAIR REMOVED: a point repeated straight after itself, or the tip of a zero-width spike. */
export interface VertexRepair {kind:'repeated'|'spike'; at:Position}
export const REPAIR_RULE='A vertex is removed where it is the same point as the vertex before it, or where it is the tip '
  +'of a zero-width spike: the outline goes out along a line and comes straight back along it, so the three vertices are '
  +'collinear and the path reverses. Neither changes the area any outline encloses. Every other vertex is kept as published.';

/** THE BOUNDARY REPAIR (2026-11-09), applied to every boundary as it is read, a downloaded level or a file.
 *
 *  Found on OCHA's COD-AB districts of Sierra Leone: 84 vertices across 14 of 16 districts repeat the one before them,
 *  and Bonthe has one spike about a metre long, and the study area refused all sixteen. Refusing a published boundary
 *  for what changes no outline sends the practitioner to clean it elsewhere, by hand, where nothing records it. Here
 *  the rule is one, stated in `REPAIR_RULE`, and every vertex it removes is listed with its position, so the change is
 *  indicated as CC BY requires and anyone can redo it. A ring that touches itself elsewhere is still refused. */
export function repairBoundary(geometry:Polygon|Boundary):{geometry:Polygon|Boundary;repairs:VertexRepair[]}{
  const repairs:VertexRepair[]=[];
  const ring=(r:Position[])=>{
    const out=r.filter((p,i)=>{const same=i>0&&p[0]===r[i-1]![0]&&p[1]===r[i-1]![1];if(same)repairs.push({kind:'repeated',at:p});return !same;});
    return withoutSpikes(out,at=>repairs.push({kind:'spike',at}));};
  const g=geometry as {type:string;coordinates:unknown};
  const coordinates=g.type==='Polygon'?(g.coordinates as Position[][]).map(ring)
    :(g.coordinates as Position[][][]).map(poly=>poly.map(ring));
  return {geometry:{...geometry,coordinates} as Polygon|Boundary,repairs};
}

/** A ZERO-WIDTH SPIKE, taken out: the tip vertex, where the outline goes out along a line and straight back along it.
 *  The test is the one the study area applies (`checkRing`), so what is left passes it. */
function withoutSpikes(ring:Position[],removed:(at:Position)=>void):Position[]{
  const cross=(a:Position,b:Position,c:Position)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const on=(a:Position,b:Position,p:Position)=>Math.abs(cross(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12
    &&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12;
  let pts=ring.slice(0,-1),changed=true;
  while(changed&&pts.length>3){
    changed=false;
    for(let i=0;i<pts.length;i++){
      const a=pts[i]!,b=pts[(i+1)%pts.length]!,c=pts[(i+2)%pts.length]!;
      if(on(a,b,c)||on(b,c,a)){pts=pts.filter((_,j)=>j!==(i+1)%pts.length);removed(b);changed=true;break;}
    }
  }
  return [...pts,pts[0]!];
}
