/** A DISEASE MODEL DECLARED AS DATA (experiment 220's spike, 2026-11-17). Two declarations, kept apart as rulesets keep
 *  their rules apart from the widget that applies them: a **model structure** says what states there are, how an
 *  infection happens and on which contact networks, and the course that follows it; a **parameter set** gives that
 *  structure its values, each with the evidence it rests on. The kernel's `decl_run` steps whatever is declared.
 *
 *  A parameter set may be held with values missing, as a ruleset may be written a rule at a time: `missingValues`
 *  names them, and `compile` refuses to run until there are none. Thin evidence never stops a run; a missing value
 *  does. */

export type Basis='cited'|'derived'|'fitted'|'assumed';
export type Place='direct'|'adjacent'|'national'|'regional'|'global';
export type Directness='direct'|'indirect'|'very_indirect';
export type Credibility='indexed'|'preprint'|'unverified'|'unresolved';
export const BASES:readonly Basis[]=['cited','derived','fitted','assumed'];
export const PLACES:readonly Place[]=['direct','adjacent','national','regional','global'];
const DIRECTNESS:readonly Directness[]=['direct','indirect','very_indirect'];
const CREDIBILITY:readonly Credibility[]=['indexed','preprint','unverified','unresolved'];

export interface Evidence {
  basis:Basis; place?:Place; time?:{same:boolean;note?:string}; directness?:Directness; credibility?:Credibility;
  source?:{citation:string;url?:string;open?:boolean;read?:string}; quote?:string; working?:string; note?:string;
}
export interface ModelStructure {
  schema:'fieldwork/model-structure/1'; id:string; version:string; title:string; step:'day';
  states:{id:string;label:string}[];
  infection:{from:string;to:string;infectious:string[]};
  /** Steps from the same state are branches, each with a share: a probability parameter, or 'rest' for one of them. */
  course:{from:string;to:string;duration:string;share?:string}[];
  networks:({id:string;label:string;probability:string}&({groups:string;none?:number}|{everyone:true}))[];
  parameters:{id:string;label:string;kind:'duration'|'probability';unit:string}[];
}
export interface ParameterValue {value?:number; min?:number; max?:number; evidence?:Evidence|null}
export interface ParameterSet {
  schema:'fieldwork/parameter-set/1'; id:string; version:string; title:string;
  structure:{id:string;version:string}; values:Record<string,ParameterValue>;
}

const fail=(message:string):never=>{throw new Error(message);};
const isRecord=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);

export function validateStructure(s:ModelStructure):ModelStructure{
  if(!isRecord(s)||s.schema!=='fieldwork/model-structure/1')fail('Not a model structure.');
  const states=new Set(s.states.map(x=>x.id));
  if(states.size!==s.states.length||states.size<2||states.size>32)fail(`${s.id}: between 2 and 32 states, each named once.`);
  const params=new Map(s.parameters.map(p=>[p.id,p]));
  if(params.size!==s.parameters.length)fail(`${s.id}: a parameter is named twice.`);
  const {from,to,infectious}=s.infection;
  if(!states.has(from)||!states.has(to)||from===to)fail(`${s.id}: an infection goes from one declared state to another.`);
  if(!infectious.length||infectious.some(x=>!states.has(x))||infectious.includes(from))
    fail(`${s.id}: the infectious states are declared states, and the susceptible one is not among them.`);
  if(!s.course.length||s.course.length>16)fail(`${s.id}: between 1 and 16 steps follow an infection.`);
  for(const step of s.course){
    if(!states.has(step.from)||!states.has(step.to)||step.from===step.to)fail(`${s.id}: a step goes from one declared state to another (${step.from} to ${step.to}).`);
    if(step.to===from)fail(`${s.id}: no step leads back to ${from}; immunity that wanes is not yet declarable.`);
    if(params.get(step.duration)?.kind!=='duration')fail(`${s.id}: ${step.duration} is not a declared duration.`);
  }
  // Branches: every step from a state with more than one way on has a share, at most one of them 'rest'.
  for(const state of new Set(s.course.map(c=>c.from))){
    const ways=s.course.filter(c=>c.from===state);
    if(ways.length===1){if(ways[0]!.share!==undefined)fail(`${s.id}: ${state} has one way on, so it takes no share.`);continue;}
    if(ways.some(w=>w.share===undefined))fail(`${s.id}: each branch from ${state} has a share.`);
    if(ways.filter(w=>w.share==='rest').length>1)fail(`${s.id}: at most one branch from ${state} is the rest.`);
    for(const w of ways)if(w.share!=='rest'&&params.get(w.share!)?.kind!=='probability')fail(`${s.id}: ${w.share} is not a declared probability.`);
  }
  // Every step is reached from where an infection leads, and the course ends: no state is reached twice on a path.
  const reached=new Set([to]);let grew=true;
  while(grew){grew=false;for(const c of s.course)if(reached.has(c.from)&&!reached.has(c.to)){reached.add(c.to);grew=true;}}
  for(const c of s.course)if(!reached.has(c.from))fail(`${s.id}: the step from ${c.from} is never reached from ${to}.`);
  const walk=(state:string,path:Set<string>):void=>{
    if(path.has(state))fail(`${s.id}: the course comes back to ${state}, and would never end.`);
    for(const c of s.course.filter(x=>x.from===state))walk(c.to,new Set([...path,state]));
  };
  walk(to,new Set());
  if(!s.networks.length||s.networks.length>16)fail(`${s.id}: between 1 and 16 contact networks.`);
  for(const n of s.networks)if(params.get(n.probability)?.kind!=='probability')fail(`${s.id}: ${n.probability} is not a declared probability.`);
  return s;
}

const validEvidence=(e:Evidence,where:string)=>{
  if(!BASES.includes(e.basis))fail(`${where}: the basis is one of ${BASES.join(', ')}.`);
  if(e.place!==undefined&&!PLACES.includes(e.place))fail(`${where}: the place is one of ${PLACES.join(', ')}.`);
  if(e.directness!==undefined&&!DIRECTNESS.includes(e.directness))fail(`${where}: the directness is one of ${DIRECTNESS.join(', ')}.`);
  if(e.credibility!==undefined&&!CREDIBILITY.includes(e.credibility))fail(`${where}: the credibility is one of ${CREDIBILITY.join(', ')}.`);
  if((e.basis==='cited'||e.basis==='derived')&&!e.source?.citation)fail(`${where}: a ${e.basis} value names its source.`);
  if(e.basis==='derived'&&!e.working)fail(`${where}: a derived value shows its working.`);
};

/** Valid to hold: every value belongs to the structure, is in range, and its evidence uses the closed vocabularies. A
 *  value may be absent; `missingValues` says which. */
export function validateParameterSet(set:ParameterSet,structure:ModelStructure):ParameterSet{
  if(!isRecord(set)||set.schema!=='fieldwork/parameter-set/1')fail('Not a parameter set.');
  if(set.structure.id!==structure.id||set.structure.version!==structure.version)
    fail(`${set.id} is for ${set.structure.id} ${set.structure.version}, not ${structure.id} ${structure.version}.`);
  const params=new Map(structure.parameters.map(p=>[p.id,p]));
  for(const [id,v] of Object.entries(set.values)){
    const p=params.get(id)??fail(`${set.id}: ${id} is not a parameter of ${structure.id}.`);
    if(v.evidence)validEvidence(v.evidence,`${set.id}, ${id}`);
    if(p.kind==='probability'&&v.value!==undefined&&!(Number.isFinite(v.value)&&v.value>=0&&v.value<=1))
      fail(`${set.id}, ${id}: a probability between 0 and 1.`);
    if(p.kind==='duration'&&(v.min!==undefined||v.max!==undefined)
      &&!(Number.isInteger(v.min)&&Number.isInteger(v.max)&&v.min!>=1&&v.max!>=v.min!))
      fail(`${set.id}, ${id}: a duration is whole days, at least 1, the longest no shorter than the shortest.`);
  }
  return set;
}

/** The parameters that have no value, or no evidence record at all, in the structure's order. */
export function missingValues(set:ParameterSet,structure:ModelStructure):string[]{
  return structure.parameters.filter(p=>{const v=set.values[p.id];
    if(!v?.evidence)return true;
    return p.kind==='probability'?v.value===undefined:v.min===undefined||v.max===undefined;}).map(p=>p.id);
}

/** How many values rest on each basis, and how many are missing: what the dialog opens on. */
export function evidenceSummary(set:ParameterSet,structure:ModelStructure):Record<Basis|'missing',number>{
  const counts:Record<Basis|'missing',number>={cited:0,derived:0,fitted:0,assumed:0,missing:0};
  const missing=new Set(missingValues(set,structure));
  for(const p of structure.parameters)counts[missing.has(p.id)?'missing':set.values[p.id]!.evidence!.basis]++;
  return counts;
}

/** The people a run is over: how many, and for each network declared by groups, each person's group number. */
export interface Population {n:number; groups:Record<string,ArrayLike<number>>}
export interface Program {
  n:number; states:number; susceptible:number; infected:number; infectious:number;
  nets:{kind:0|1;none:number;probability:number;groups?:ArrayLike<number>}[];
  steps:[number,number,number,number][];
  /** For each step, its share of those leaving its state; 1 where there is no alternative. */
  shares:number[];
}

export function compile(structure:ModelStructure,set:ParameterSet,population:Population):Program{
  validateStructure(structure);validateParameterSet(set,structure);
  const missing=missingValues(set,structure);
  if(missing.length)fail(`${set.id} cannot run yet: no value for ${missing.join(', ')}.`);
  const index=new Map(structure.states.map((s,i)=>[s.id,i]));
  const state=(id:string)=>index.get(id)!;
  const nets=structure.networks.map(net=>{
    const probability=set.values[net.probability]!.value!;
    if('everyone' in net)return {kind:1 as const,none:-1,probability};
    const groups=population.groups[net.groups]??fail(`The population has no ${net.groups} for the ${net.label.toLowerCase()} network.`);
    if(groups.length!==population.n)fail(`The population's ${net.groups} has ${groups.length} entries for ${population.n} people.`);
    return {kind:0 as const,none:net.none??-1,probability,groups};
  });
  const program:Program={n:population.n,states:structure.states.length,susceptible:state(structure.infection.from),infected:state(structure.infection.to),
    infectious:structure.infection.infectious.reduce((mask,id)=>mask|(1<<state(id)),0)>>>0,nets,
    steps:structure.course.map(c=>{const v=set.values[c.duration]!;return [state(c.from),state(c.to),v.min!,v.max!];}),
    shares:structure.course.map(c=>{
      if(c.share===undefined)return 1;
      if(c.share!=='rest')return set.values[c.share]!.value!;
      const rest=1-structure.course.filter(x=>x.from===c.from&&x.share!=='rest').reduce((t,x)=>t+set.values[x.share!]!.value!,0);
      if(rest<-1e-9)fail(`${set.id}: the shares of the branches from ${c.from} come to more than 1.`);
      return Math.max(0,rest);
    })};
  for(const state of new Set(structure.course.map(c=>c.from))){
    const total=program.steps.reduce((t,step,k)=>step[0]===index.get(state)?t+program.shares[k]!:t,0);
    if(structure.course.filter(c=>c.from===state).length>1&&Math.abs(total-1)>1e-9)
      fail(`${set.id}: the shares of the branches from ${state} come to ${total.toFixed(3)}, not 1.`);
  }
  return program;
}

/** What `decl_run` needs of the kernel, so a test can pass the WebAssembly module's exports directly. */
export interface DeclaredKernel {
  memory:WebAssembly.Memory;
  decl_prepare(n:number,days:number,nets:number,steps:number,states:number):number;
  decl_ptr(which:number):number;
  decl_run(seed:bigint,index:number,susceptible:number,infected:number,infectious:number):number;
}
export interface Run {ever:number; counts:Uint32Array; infectedOn:Int32Array}

export function runDeclared(kernel:DeclaredKernel,program:Program,{seed,index,days}:{seed:number|bigint;index:number;days:number}):Run{
  const {n,nets,steps,states}=program;
  if(kernel.decl_prepare(n,days,nets.length,steps.length,states)!==1)fail('The kernel could not lay out this run.');
  const view=<T>(Kind:new(b:ArrayBuffer,o:number,l:number)=>T,which:number,length:number)=>new Kind(kernel.memory.buffer as ArrayBuffer,kernel.decl_ptr(which),length);
  const groups=view(Int32Array,0,nets.length*n);
  nets.forEach((net,j)=>{if(net.groups)groups.set(Array.from(net.groups),j*n);});
  view(Float64Array,1,nets.length).set(nets.map(x=>x.probability));
  view(Int32Array,2,nets.length).set(nets.map(x=>x.none));
  view(Int32Array,3,nets.length).set(nets.map(x=>x.kind));
  view(Int32Array,4,steps.length*4).set(steps.flat());
  view(Float64Array,10,steps.length).set(program.shares);
  // A u32 comes back signed: read unsigned. 4294967295 is a declaration or parameters the kernel refused.
  const ever=kernel.decl_run(BigInt(seed),index,program.susceptible,program.infected,program.infectious)>>>0;
  if(ever===0xffffffff)fail('The kernel refused this declaration.');
  return {ever,counts:view(Uint32Array,7,days*states).slice(),infectedOn:view(Int32Array,8,n).slice()};
}
