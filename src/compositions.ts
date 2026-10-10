import type {NodeType,WorkflowNode,PortType} from './types.js';
import {TYPES,nodeInputs} from './core.js';

/** A composition is a saved subgraph that behaves as one step.
 *
 *  Specified in [75](../docs/experiments/75-compositions-as-nodes.md),
 *  [76](../docs/experiments/76-composition-governance.md) and
 *  [77](../docs/experiments/77-composition-drift-detection.md), built here.
 *
 *  Two things the validator enforces, rather than asking an author to remember:
 *
 *  - **Nothing outside the registry.** A composition is governed by closure over its
 *    members, so an unknown member is an ungoverned one. Types are checked against `TYPES`
 *    and every member is pinned to a published version and its digest.
 *  - **No port the graph contradicts.** Public ports map to member inputs no internal edge
 *    fills, each covered exactly once and typed to match, so the surface cannot drift from
 *    the contents.
 *
 *  And one it does **not**, which matters more for being stated. The rule in
 *  [76](../docs/experiments/76-composition-governance.md) is that every member parameter is
 *  either exposed or fixed, with no third state. Only half of that is checkable here: a
 *  parameter cannot be both, and expansion refuses to run without a value for every
 *  parameter the composition declares. A parameter that is *neither* exposed nor fixed
 *  cannot be detected, because `ParamsByType` is a TypeScript type with no runtime form —
 *  there is nothing to enumerate a widget's parameters from. Closing it needs the
 *  parameter list in the registry, which is a change to the release file rather than to
 *  this module.
 */

/** The verb must come from the stage taxonomy, so the name asserts where the step belongs
 *  ([76](../docs/experiments/76-composition-governance.md)). Closed deliberately: the
 *  widget convention leaves the verb free, which is why one of 42 widgets starts with a
 *  stage verb. Compositions are all new, so every one can follow it from birth.
 *
 *  Spelled `summarize`, not `summarise` as experiment 76 wrote it. Node types in this
 *  project take `-ize` — `summarize_polygons` predates all of this and `summarize_hull` was
 *  renamed to match it earlier today — so a composition called `summarise_*` sitting beside
 *  widgets called `summarize_*` would be the defect, not the fix. The stage is still
 *  "summarise" in prose and in the glossary; this is the identifier spelling. */
export const STAGE_VERBS=['discover','acquire','extract','import','check','compute','relate','summarize','classify','view'] as const;
export type StageVerb=typeof STAGE_VERBS[number];

export interface CompositionMember {
  /** Local name inside the composition, used by edges, ports and parameters. */
  node:string;
  type:NodeType;
  /** Pinned at authoring time. Drift is measured against these two. */
  version:string;
  sha256:string;
  /** Parameters fixed by the author: not exposed, not changeable. */
  fixed?:Record<string,unknown>;
}
export interface CompositionEdge {from:string; to:string; port:string}
/** A public port and the member ports it serves. Several members may share one public
 *  port — a network feeding three steps — but that fan-out is declared rather than
 *  inferred from the types, because two ports of one type are not necessarily one input. */
export interface CompositionPort {name:string; type:PortType; members:{node:string; port:string}[]}
export interface CompositionParameter {
  name:string; title:string;
  members:{node:string; param:string}[];
}
export interface Composition {
  schema:'fieldwork/composition/1';
  id:string; nodeType:string; version:string; title:string; author:string; released:string;
  stage:StageVerb;
  description:string;
  /** What the composition must not be read as. Required, because a composition inherits
   *  its members' limitations and nothing surfaces them once it is one node. */
  mustNotBeReadAs:string;
  governance:{status:'private'|'shared'|'admitted'; owner:string; reviews:{at:string; by:string; outcome:string}[]};
  members:CompositionMember[];
  edges:CompositionEdge[];
  ports:{inputs:CompositionPort[]; output:{node:string; type:PortType}};
  parameters:CompositionParameter[];
}

const NAME=/^([a-z]+)_[a-z][a-z_]*[a-z]$/;

/** Every member input port that no internal edge fills. These are the composition's real
 *  inputs, derived from the graph, and the declared ports must match them exactly. */
export function openInputs(composition:Composition):{node:string; port:string; type:PortType}[] {
  const filled=new Set(composition.edges.map(e=>`${e.to}:${e.port}`));
  const open:{node:string; port:string; type:PortType}[]=[];
  for(const member of composition.members)
    for(const [port,type] of nodeInputs({id:member.node,type:member.type,x:0,y:0,
      params:{...(member.fixed||{}),label:member.node}} as WorkflowNode))
      if(!filled.has(`${member.node}:${port}`))open.push({node:member.node,port,type:type as PortType});
  return open;
}

export function validateComposition(composition:Composition,registry:{widgets:{nodeType:string; currentVersion:string; releases:{version:string; sha256:string}[]}[]}):void{
  if(composition.schema!=='fieldwork/composition/1')throw new Error(`Unknown composition schema ${composition.schema}.`);
  const name=NAME.exec(composition.nodeType);
  if(!name)throw new Error(`A composition is named verb_object in lower case with underscores; ${composition.nodeType} is not.`);
  if(Object.hasOwn(TYPES,composition.nodeType))
    throw new Error(`${composition.nodeType} is already a widget node type. A composition cannot take a name the palette uses.`);
  if(!(STAGE_VERBS as readonly string[]).includes(name[1]))
    throw new Error(`${composition.nodeType} starts with "${name[1]}", which is not a stage verb. Use one of: ${STAGE_VERBS.join(', ')}.`);
  if(name[1]!==composition.stage)
    throw new Error(`${composition.nodeType} names the stage "${name[1]}" but declares "${composition.stage}". The name is the assertion, so they cannot differ.`);
  for(const field of ['description','mustNotBeReadAs','title','author'] as const)
    if(typeof composition[field]!=='string'||!composition[field].trim())
      throw new Error(`A composition states its ${field}.`);
  if(!composition.members.length)throw new Error('A composition has at least one member.');

  const seen=new Set<string>();
  for(const member of composition.members){
    if(seen.has(member.node))throw new Error(`Two members are both called ${member.node}.`);
    seen.add(member.node);
    if(!Object.hasOwn(TYPES,member.type))
      throw new Error(`${member.node} is a ${member.type}, which is not a registered widget. A composition may contain only widgets the registry governs.`);
    const entry=registry.widgets.find(w=>w.nodeType===member.type);
    if(!entry)throw new Error(`${member.type} has no registry entry, so it cannot be pinned.`);
    const release=entry.releases.find(r=>r.version===member.version);
    if(!release)throw new Error(`${member.node} pins ${member.type} ${member.version}, which the registry does not list.`);
    if(release.sha256!==member.sha256)
      throw new Error(`${member.node} pins a digest that is not ${member.type} ${member.version}'s. Re-pin it rather than editing the digest.`);
  }
  for(const edge of composition.edges){
    const from=composition.members.find(m=>m.node===edge.from),to=composition.members.find(m=>m.node===edge.to);
    if(!from||!to)throw new Error(`An edge names ${!from?edge.from:edge.to}, which is not a member.`);
    const accepted=nodeInputs({id:to.node,type:to.type,x:0,y:0,params:{...(to.fixed||{}),label:to.node}} as WorkflowNode)
      .find(([port])=>port===edge.port);
    if(!accepted)throw new Error(`${to.node} has no ${edge.port} input.`);
    if(TYPES[from.type].output!==accepted[1])
      throw new Error(`${from.node} emits ${TYPES[from.type].output} and ${to.node}'s ${edge.port} takes ${accepted[1]}.`);
  }

  // Ports: declared, and checked against the graph so the surface cannot drift.
  const open=openInputs(composition);
  const claimed=new Map<string,string>();
  for(const port of composition.ports.inputs){
    if(!port.members.length)throw new Error(`Public port ${port.name} serves no member.`);
    for(const target of port.members){
      const key=`${target.node}:${target.port}`;
      const match=open.find(o=>`${o.node}:${o.port}`===key);
      if(!match)throw new Error(`Public port ${port.name} maps to ${key}, which is not an open input. An internal edge already fills it.`);
      if(claimed.has(key))throw new Error(`${key} is served by both ${claimed.get(key)} and ${port.name}.`);
      claimed.set(key,port.name);
      if(match.type!==port.type)throw new Error(`Public port ${port.name} is declared ${port.type} but ${key} takes ${match.type}.`);
    }
  }
  for(const o of open)
    if(!claimed.has(`${o.node}:${o.port}`))
      throw new Error(`${o.node}'s ${o.port} input is open and no public port serves it, so the composition could never run.`);
  const terminal=composition.members.find(m=>m.node===composition.ports.output.node);
  if(!terminal)throw new Error(`The output names ${composition.ports.output.node}, which is not a member.`);
  if(TYPES[terminal.type].output!==composition.ports.output.type)
    throw new Error(`${terminal.node} emits ${TYPES[terminal.type].output}, not ${composition.ports.output.type}.`);
  if(composition.edges.some(e=>e.from===terminal.node))
    throw new Error(`${terminal.node} is the output but feeds ${composition.edges.find(e=>e.from===terminal.node)!.to} inside the composition.`);

  // Parameters: exposed or fixed, never neither.
  const exposed=new Map<string,string>();
  for(const parameter of composition.parameters){
    if(!parameter.members.length)throw new Error(`Public parameter ${parameter.name} sets nothing.`);
    for(const target of parameter.members){
      const member=composition.members.find(m=>m.node===target.node);
      if(!member)throw new Error(`Public parameter ${parameter.name} names ${target.node}, which is not a member.`);
      const key=`${target.node}:${target.param}`;
      if(exposed.has(key))throw new Error(`${key} is set by both ${exposed.get(key)} and ${parameter.name}.`);
      if(member.fixed&&Object.hasOwn(member.fixed,target.param))
        throw new Error(`${key} is both fixed and exposed as ${parameter.name}. Choose one.`);
      exposed.set(key,parameter.name);
    }
  }
  return;
}

export type DriftState='unchanged'|'moved'|'gone';
export interface MemberDrift {
  node:string; type:string; pinnedVersion:string; state:DriftState;
  currentVersion?:string; detail:string;
}

/** What has changed under a composition since it was pinned
 *  ([77](../docs/experiments/77-composition-drift-detection.md)). Reports; it does not
 *  decide. Whether a drifted composition opens, annotates or refuses to run is a product
 *  question, and answering it here would hide the choice in a utility. */
export function detectDrift(composition:Composition,registry:{widgets:{nodeType:string; currentVersion:string; releases:{version:string; sha256:string}[]}[]}):MemberDrift[]{
  return composition.members.map(member=>{
    const entry=registry.widgets.find(w=>w.nodeType===member.type);
    if(!entry)return {node:member.node,type:member.type,pinnedVersion:member.version,state:'gone' as const,
      detail:`${member.type} is no longer in the registry. Anything this composition did with it cannot be reproduced.`};
    const pinned=entry.releases.find(r=>r.version===member.version);
    if(!pinned)return {node:member.node,type:member.type,pinnedVersion:member.version,state:'gone' as const,
      currentVersion:entry.currentVersion,
      detail:`${member.type} ${member.version} is no longer published; the registry lists ${entry.releases.map(r=>r.version).join(', ')}.`};
    if(pinned.sha256!==member.sha256)return {node:member.node,type:member.type,pinnedVersion:member.version,
      state:'moved' as const,currentVersion:entry.currentVersion,
      detail:`${member.type} ${member.version} no longer has the digest this composition pinned, so that release changed after it was published.`};
    if(entry.currentVersion!==member.version)return {node:member.node,type:member.type,pinnedVersion:member.version,
      state:'moved' as const,currentVersion:entry.currentVersion,
      detail:`${member.type} has moved from ${member.version} to ${entry.currentVersion} since this composition pinned it. Read that release's changes before trusting the result.`};
    return {node:member.node,type:member.type,pinnedVersion:member.version,state:'unchanged' as const,
      currentVersion:entry.currentVersion,detail:`${member.type} ${member.version} is unchanged.`};
  });
}

/** The composition as workflow nodes and edges, prefixed so two uses do not collide.
 *
 *  Expansion is how a composition runs today: its members become ordinary nodes and the
 *  existing executor produces one receipt each, which is what
 *  [75](../docs/experiments/75-compositions-as-nodes.md) requires of it — a composition
 *  must not emit a single receipt claiming work its members did. */
export function expandComposition(
  composition:Composition, instanceId:string, publicParams:Record<string,unknown>,
  position={x:0,y:0},
):{nodes:WorkflowNode[]; edges:{id:string; from:string; to:string; port:string}[];
   inputs:{port:string; node:string; memberPort:string}[]; output:string}{
  const local=(node:string)=>`${instanceId}-${node}`;
  const nodes=composition.members.map((member,index)=>{
    const params:Record<string,unknown>={label:`${composition.title}: ${member.node}`,...(member.fixed||{})};
    for(const parameter of composition.parameters)
      for(const target of parameter.members)
        if(target.node===member.node){
          if(!Object.hasOwn(publicParams,parameter.name))
            throw new Error(`${composition.nodeType} needs a value for ${parameter.name}.`);
          params[target.param]=publicParams[parameter.name];
        }
    return {id:local(member.node),type:member.type as NodeType,
      x:position.x+index*180,y:position.y,params} as WorkflowNode;
  });
  const edges=composition.edges.map(e=>({id:`${instanceId}-${e.from}-${e.to}-${e.port}`,
    from:local(e.from),to:local(e.to),port:e.port}));
  const inputs=composition.ports.inputs.flatMap(port=>
    port.members.map(target=>({port:port.name,node:local(target.node),memberPort:target.port})));
  return {nodes,edges,inputs,output:local(composition.ports.output.node)};
}
