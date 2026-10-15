/** Progressive reveal, played back over a worked example one widget at a time.
 *
 *  The practitioner's proposal of 2026-10-14, in two parts: *once there is a study area, it
 *  reveals the next widgets that will feed from it*, and — after the rule had been measured —
 *  *because we already have the worked examples from end to end, we can simulate widget addition
 *  step by step and see the progressive reveal happen on the canvas.*
 *
 *  This is the stage AGENTS.md says is usually skipped, between proposing a rule and enforcing
 *  it. Nothing here changes what the palette offers in normal use: the playback is a VIEW over an
 *  example that already exists, so the rule can be watched behaving on something real before the
 *  application is committed to it. Experiment 112.
 *
 *  The order and the revealed set are computed here and nowhere else, so the measurement script
 *  and the interface cannot disagree about what the rule says. */
import contracts from '../widgets/port-contracts.json';
import type {NodeType,Workflow,WorkflowNode,PortType} from './types.js';

type Contract={when:string;required:[string,string][];optional:[string,string][]};
type Entry={output?:string;lateBoundTo?:string;contracts:Contract[]};
const WIDGETS=contracts.widgets as unknown as Record<string,Entry>;

/** What a node emits: from the type, or from the artefact it pins. */
export function emitted(node:WorkflowNode):PortType|undefined{
  const entry=WIDGETS[node.type];
  if(entry?.lateBoundTo){
    const params=node.params as {ruleset?:{output?:string};composition?:{output?:string}};
    return (params.ruleset?.output||params.composition?.output) as PortType|undefined;
  }
  return entry?.output as PortType|undefined;
}
/** Each alternative set of port types a node insists on. An empty list means it was never
 *  described, which is not the same as needing nothing. */
function requirements(node:WorkflowNode):string[][]{
  const entry=WIDGETS[node.type];
  if(entry?.lateBoundTo){
    const params=node.params as {ruleset?:{inputs?:[string,string][]};composition?:{inputs?:[string,string][]}};
    const pinned=params.ruleset?.inputs||params.composition?.inputs||[];
    return [pinned.map(([,type])=>type)];
  }
  return (entry?.contracts||[]).map(c=>c.required.map(([,type])=>type));
}
const satisfied=(node:WorkflowNode,available:Set<string>)=>{
  const options=requirements(node);
  return options.length>0&&options.some(required=>required.every(type=>available.has(type)));
};

/** The order a practitioner could have placed these nodes, each one addable when it arrives.
 *  Anything that never becomes addable is returned last, which is a finding rather than an
 *  error: it is a node this rule would not have let them add. */
export function buildOrder(workflow:Pick<Workflow,'nodes'>):{order:WorkflowNode[];unreachable:WorkflowNode[]}{
  const order:WorkflowNode[]=[],waiting=[...workflow.nodes],available=new Set<string>();
  for(let moved=true;moved&&waiting.length;){
    moved=false;
    for(let i=0;i<waiting.length;i++){
      if(!satisfied(waiting[i],available))continue;
      const [node]=waiting.splice(i,1);i--;moved=true;
      order.push(node);
      const out=emitted(node);if(out)available.add(out);
    }
  }
  return {order,unreachable:waiting};
}
/** The widget types the rule would offer once these nodes are on the canvas. */
export function revealedTypes(placed:WorkflowNode[]):Set<NodeType>{
  const available=new Set<string>();
  for(const node of placed){const out=emitted(node);if(out)available.add(out);}
  return new Set(Object.keys(WIDGETS).filter(type=>{
    const entry=WIDGETS[type];
    if(entry.lateBoundTo)return false;   // its ports come from a pin, so the type alone cannot say
    return entry.contracts.some(c=>c.required.every(([,t])=>available.has(t)));
  }) as NodeType[]);
}
/** Why the step revealed what it did: the port type the newest node contributed, and what that
 *  unlocked. A reveal nobody can explain is a palette that moves on its own. */
export function revealReason(placed:WorkflowNode[]):{type?:PortType;unlocked:NodeType[]}{
  if(!placed.length)return {unlocked:[]};
  const latest=placed[placed.length-1];
  const before=revealedTypes(placed.slice(0,-1)),after=revealedTypes(placed);
  return {type:emitted(latest),unlocked:[...after].filter(t=>!before.has(t))};
}
