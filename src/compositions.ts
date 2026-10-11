import type {NodeType,Workflow,WorkflowNode,PortType} from './types.js';
import {TYPES,nodeInputs} from './core.js';
import type {Receipt} from './results.js';

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
  /** The value a new node starts with. Required, because a composition added to a canvas
   *  with no values has no ports it can run and nothing a practitioner can correct. A
   *  default is still an assumption: the walking catchment's speed defaults to the case
   *  study's 1854 figure, which is why every result it produces says so. */
  default:string|number|boolean;
  members:{node:string; param:string}[];
}
export interface Composition {
  /** Schema 2 added a required default to every public parameter. Both are accepted, and
   *  the requirement applies only from 2 — a field added later must not invalidate a file
   *  written earlier, which a drift fixture written the same afternoon proved by failing. */
  schema:'fieldwork/composition/1'|'fieldwork/composition/2';
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
  if(!['fieldwork/composition/1','fieldwork/composition/2'].includes(composition.schema))throw new Error(`Unknown composition schema ${composition.schema}.`);
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
    if(composition.schema==='fieldwork/composition/2'&&!['string','number','boolean'].includes(typeof parameter.default))
      throw new Error(`Public parameter ${parameter.name} states no default, so a new node could not run.`);
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

/** Replaces every micro-workflow node with its members, rewiring the edges that reached its
 *  public ports.
 *
 *  This is how a composition runs: expansion happens after the authored workflow is
 *  validated, so the canvas keeps one node while the executor sees ordinary ones and emits
 *  one receipt each. There is no composition branch in the executor at all, which is the
 *  point — a composition is not a new kind of execution, it is an arrangement of the
 *  existing kind.
 *
 *  An external edge into a public port fans out to every member port that port serves, so
 *  one connection can feed three steps. Edges leaving the node come from the terminal
 *  member. */
export function expandMicroWorkflows(
  workflow:Workflow, resolve:(id:string,version:string)=>Composition, runId='plan',
):{workflow:Workflow;receipts:Receipt[]}{
  const hosts=workflow.nodes.filter(n=>n.type==='micro_workflow');
  if(!hosts.length)return {workflow,receipts:[]};
  const receipts:Receipt[]=[];
  // Annotated, because the predicate narrows the result to exclude micro-workflow nodes
  // and the members being pushed back are ordinary ones of any type.
  const nodes:WorkflowNode[]=workflow.nodes.filter(n=>n.type!=='micro_workflow');
  const edges=workflow.edges.filter(e=>!hosts.some(h=>h.id===e.from||h.id===e.to));
  for(const host of hosts){
    const params=(host as WorkflowNode<'micro_workflow'>).params;
    const composition=resolve(params.composition.id,params.composition.version);
    const expanded=expandComposition(composition,host.id,params.parameters,{x:host.x,y:host.y});
    nodes.push(...expanded.nodes);
    edges.push(...expanded.edges);
    for(const edge of workflow.edges){
      if(edge.to===host.id)
        for(const target of expanded.inputs.filter(i=>i.port===edge.port))
          edges.push({id:`${edge.id}-${target.node}`,from:edge.from,to:target.node,port:target.memberPort});
      if(edge.from===host.id)
        edges.push({...edge,from:expanded.output});
    }
    receipts.push(expansionReceipt(composition,host.id,params.parameters,expanded,runId));
  }
  return {workflow:{...workflow,nodes,edges},receipts};
}

/** One record of the arrangement, beside the members' own receipts.
 *
 *  The members' receipts are untouched: a run of a composition reads exactly as a run of
 *  the primitives, which is what it is. What that alone cannot say is that four activities
 *  came from one composition at one version, so this asserts the association and nothing
 *  else — it claims no computation, which is why it does not contradict
 *  [75](../docs/experiments/75-compositions-as-nodes.md)'s requirement that a composition
 *  must not emit a receipt claiming its members' work.
 *
 *  Modelled as PROV association rather than invented vocabulary: the composition is a
 *  `prov:Plan`, and each member node is associated with it. A reader asking "where did this
 *  step come from" follows `prov:hadPlan` to a pinned version. */
export function expansionReceipt(
  composition:Composition, hostId:string, parameters:Record<string,unknown>,
  expanded:{nodes:WorkflowNode[];output:string}, runId:string,
):Receipt{
  const plan=`<urn:fieldwork:composition:${composition.nodeType}:${composition.version}>`;
  const activity=`<urn:fieldwork:run:${runId}:${hostId}:expansion>`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`${plan} a prov:Plan, fw:MicroWorkflow; `
    +`fw:compositionId ${JSON.stringify(composition.id)}; `
    +`fw:compositionVersion ${JSON.stringify(composition.version)}; `
    +`fw:compositionStage ${JSON.stringify(composition.stage)}; `
    +`fw:governanceStatus ${JSON.stringify(composition.governance.status)}.\n`
    +`${activity} a fw:MicroWorkflowExpansion, prov:Activity; `
    +`prov:qualifiedAssociation [ a prov:Association; prov:hadPlan ${plan} ]; `
    +`fw:memberCount ${composition.members.length}; `
    +`fw:claimsNoComputation true.\n`
    +expanded.nodes.map(node=>
      `<urn:fieldwork:run:${runId}:member:${encodeURIComponent(node.id)}> a prov:Activity; `
      +`prov:qualifiedAssociation [ a prov:Association; prov:hadPlan ${plan} ]; `
      +`fw:memberOf ${plan}; fw:memberNode ${JSON.stringify(node.id)}.\n`).join('')
    +Object.entries(parameters).map(([name,value])=>
      `${activity} fw:compositionParameter [ fw:parameterName ${JSON.stringify(name)}; `
      +`fw:parameterValue ${JSON.stringify(String(value))} ].\n`).join('');
  return {nodeId:hostId,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`Expanded the ${composition.title} micro-workflow, version ${composition.version}, `
      +`into ${composition.members.length} members. This record states the association only; `
      +`each member reports its own work, and the run reads as a run of the primitives.`};
}

/** A composition as the palette offers it, and as a node when one is added.
 *
 *  The governance status travels onto the entry rather than deciding whether there is an
 *  entry. Experiment 76 gates the *palette* on admission, which this read too strictly: a
 *  rule that stops a composition being tried stops the learning it was written to protect.
 *  So every bundled composition is offered, and an unreviewed one says so where a
 *  practitioner sees it. */
export function compositionEntry(composition:Composition){
  return {
    key:`${composition.id}@${composition.version}`,
    nodeType:composition.nodeType,
    title:composition.title,
    stage:composition.stage,
    status:composition.governance.status,
    description:composition.description,
    params:{
      label:composition.title,
      composition:{id:composition.id,nodeType:composition.nodeType,version:composition.version,
        title:composition.title,stage:composition.stage,
        inputs:composition.ports.inputs.map(p=>[p.name,p.type] as [string,PortType]),
        output:composition.ports.output.type},
      // A schema 1 composition states no defaults, so it can be inspected and run from a
      // saved workflow but not added fresh from the palette. Said here rather than producing
      // a node with undefined parameters.
      parameters:Object.fromEntries(composition.parameters.map(p=>{
        if(p.default===undefined)
          throw new Error(`${composition.title} ${composition.version} states no default for ${p.name}, so it cannot be added from the palette. Republish it against composition schema 2.`);
        return [p.name,p.default];
      })),
    },
  };
}
