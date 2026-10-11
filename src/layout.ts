import type {Workflow} from './types.js';

/** Positions for every node, laid out left to right in the order the work happens.
 *
 *  Written because exploding a micro-workflow drops its members in a row from the host's
 *  position, on top of whatever was to the right. That was left visible rather than guessed
 *  at ([92](../docs/experiments/92-micro-workflow-on-the-canvas.md)); this is the guess
 *  being made deliberately, as something a practitioner asks for rather than something that
 *  happens to their canvas without being asked.
 *
 *  A column is a depth: the longest path from any source. Longest rather than shortest, so
 *  a node never sits to the left of something feeding it — which is the one property a
 *  reader relies on when following a graph left to right.
 *
 *  Rows within a column keep their existing top-to-bottom order, so a tidy does not
 *  reshuffle a canvas somebody has already arranged. It is deliberately not a graph-drawing
 *  algorithm: no edge-crossing minimisation, no barycentre passes. It makes a canvas
 *  readable again after an explode, and says so. */

export const COLUMN_WIDTH=300;
export const ROW_HEIGHT=150;
export const ORIGIN={x:40,y:40};

/** Longest-path depth per node. Cycles cannot occur — `validateWorkflow` rejects them — but
 *  a guard is kept so a malformed graph laid out by hand cannot loop forever here. */
export function depths(workflow:Workflow):Map<string,number>{
  const incoming=new Map<string,string[]>();
  for(const node of workflow.nodes)incoming.set(node.id,[]);
  for(const edge of workflow.edges)incoming.get(edge.to)?.push(edge.from);
  const depth=new Map<string,number>();
  const visiting=new Set<string>();
  const of=(id:string):number=>{
    const known=depth.get(id);
    if(known!==undefined)return known;
    if(visiting.has(id))return 0;
    visiting.add(id);
    const sources=incoming.get(id)??[];
    const value=sources.length?Math.max(...sources.map(of))+1:0;
    visiting.delete(id);
    depth.set(id,value);
    return value;
  };
  for(const node of workflow.nodes)of(node.id);
  return depth;
}

export function tidyLayout(workflow:Workflow):Map<string,{x:number;y:number}>{
  const depth=depths(workflow);
  const columns=new Map<number,string[]>();
  for(const node of [...workflow.nodes].sort((a,b)=>a.y-b.y||a.x-b.x)){
    const column=depth.get(node.id)??0;
    columns.set(column,[...(columns.get(column)??[]),node.id]);
  }
  const positions=new Map<string,{x:number;y:number}>();
  for(const [column,ids] of columns)
    ids.forEach((id,row)=>positions.set(id,
      {x:ORIGIN.x+column*COLUMN_WIDTH,y:ORIGIN.y+row*ROW_HEIGHT}));
  return positions;
}

/** True when every node already sits where a tidy would put it, so the button can say
 *  nothing happened instead of appearing to do nothing. */
export const alreadyTidy=(workflow:Workflow):boolean=>{
  const positions=tidyLayout(workflow);
  return workflow.nodes.every(node=>{
    const at=positions.get(node.id);
    return !!at&&at.x===node.x&&at.y===node.y;
  });
};
