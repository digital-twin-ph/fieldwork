import type {Position} from './types.js';
import type {Network} from './catchments.js';

/** Edge geometry prepared for traversal: shared by `isochrone` and the primitives
 *  extracted from it, so the orientation check and the direction reversal cannot
 *  drift apart between them.
 *
 *  Extracted 2026-10-10 while building `reachable_corridor`, which needs exactly the
 *  edges `isochrone` builds. Copying five lines would have been quicker and would have
 *  left two tolerances to keep in step. */

export interface PreparedEdge {from:string; to:string; lengthM:number; line:Position[]}

/** How far an edge's stated geometry may miss its endpoints before it is refused.
 *  A looser tolerance would let a line belonging to another street pass. */
export const ENDPOINT_TOLERANCE_M=2;

const dist=(a:Position,b:Position)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

/** The first `fraction` of a line by length, as a new line.
 *
 *  Used to stop part-way along a street when the travel budget runs out mid-block.
 *  Returns a single point when the fraction is zero, which callers drop: a traveller
 *  with nothing left has not entered the street. */
export function partial(line:Position[],fraction:number):Position[]{
  const lengths=line.slice(1).map((p,i)=>dist(p,line[i]));
  const total=lengths.reduce((a,b)=>a+b,0),out=[line[0]];
  let remaining=total*fraction;
  for(let i=0;i<lengths.length;i++){
    if(remaining>=lengths[i]){out.push(line[i+1]);remaining-=lengths[i];}
    else{
      if(lengths[i]>0){const t=remaining/lengths[i];
        out.push([line[i][0]+t*(line[i+1][0]-line[i][0]),line[i][1]+t*(line[i+1][1]-line[i][1])]);}
      break;
    }
  }
  return out;
}

/** Every edge projected into metres, oriented to start at its `from` node, and
 *  reversed wholesale when travel is inbound.
 *
 *  Inbound answers "who can reach me" rather than "where can I get to". Reversing
 *  both the endpoints and the line keeps the convention that traversal starts at
 *  `line[0]`, so a caller truncating an edge never has to ask which way it runs. */
export function prepareEdges(
  network:Network, direction:'outbound'|'inbound', forward:(c:Position)=>Position,
):PreparedEdge[]{
  const coords=new Map(network.nodes.map(n=>[n.id,forward(n.coordinates)]));
  return network.edges.map(e=>{
    const start=coords.get(e.from)!,end=coords.get(e.to)!;
    let line=e.geometry?e.geometry.map(forward):[start,end];
    if(dist(line[0],start)>dist(line.at(-1)!,start))line=line.toReversed();
    if(dist(line[0],start)>ENDPOINT_TOLERANCE_M||dist(line.at(-1)!,end)>ENDPOINT_TOLERANCE_M)
      throw new Error('Network edge geometry does not match its endpoints within 2 metres.');
    return direction==='inbound'
      ?{from:e.to,to:e.from,lengthM:e.lengthM,line:line.toReversed()}
      :{from:e.from,to:e.to,lengthM:e.lengthM,line};
  });
}


