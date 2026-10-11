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

/** A line turned to face a fixed way, so the same street arrives at the same key from
 *  either end. A tie on the first vertex falls through to the last, and a closed line --
 *  both ends identical -- is left alone, since neither way is canonical. */
const orient=(line:Position[]):Position[]=>{
  const a=line[0],b=line.at(-1)!;
  return a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1])?line.toReversed():line;
};
const lineKey=(line:Position[]):string=>line.map(p=>`${p[0]},${p[1]}`).join(' ');

/** The streets a traveller got into, each one once, truncated where the budget ran out.
 *
 *  A street network is directed, so a street between two reached junctions is normally
 *  offered twice -- once from each end -- and every caller here hands the result to a
 *  buffer. Buffering coincident geometry is the slowest thing an overlay can be asked
 *  to do and the least well defined, and the answer does not need it: a buffer
 *  distributes over a union, so the strip around a street entered from both ends is the
 *  strip around the street. Where the two reaches meet, the whole street is returned
 *  once; where they do not, the piece entered from each end is returned.
 *
 *  Pooling is keyed by the line, not by its two junctions. Soho has six reverse pairs
 *  whose two directions carry different geometry and three junction pairs with more
 *  than one street between them, and pooling those by junction would discard ground a
 *  traveller can reach.
 *
 *  `fraction` is how far along `line`, from `line[0]`, the budget reached. */
export function reachedStreets(entered:{line:Position[];fraction:number}[]):Position[][]{
  const pooled=new Map<string,{line:Position[];fromHead:number;fromTail:number}>();
  for(const {line,fraction} of entered){
    const canonical=orient(line),head=canonical===line,key=lineKey(canonical);
    const entry=pooled.get(key)||{line:canonical,fromHead:0,fromTail:0};
    if(head)entry.fromHead=Math.max(entry.fromHead,fraction);
    else entry.fromTail=Math.max(entry.fromTail,fraction);
    pooled.set(key,entry);
  }
  const streets:Position[][]=[];
  for(const entry of pooled.values()){
    if(entry.fromHead+entry.fromTail>=1){streets.push(entry.line);continue;}
    for(const [fraction,line] of [[entry.fromHead,entry.line],[entry.fromTail,entry.line.toReversed()]] as [number,Position[]][]){
      if(fraction<=0)continue;
      const piece=partial(line,fraction);
      if(piece.length>1)streets.push(piece);
    }
  }
  return streets;
}
