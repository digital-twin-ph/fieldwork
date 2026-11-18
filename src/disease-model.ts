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
  course:{from:string;to:string;duration:string}[];
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
  if(!s.course.length||s.course.length>16)fail(`${s.id}: between 1 and 16 periods follow an infection.`);
  let at=to;
  for(const step of s.course){
    if(step.from!==at)fail(`${s.id}: the period from ${step.from} does not start where the one before it ends (${at}).`);
    if(!states.has(step.to))fail(`${s.id}: the period from ${step.from} ends in an undeclared state, ${step.to}.`);
    if(params.get(step.duration)?.kind!=='duration')fail(`${s.id}: ${step.duration} is not a declared duration.`);
    at=step.to;
  }
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
  return {n:population.n,states:structure.states.length,susceptible:state(structure.infection.from),infected:state(structure.infection.to),
    infectious:structure.infection.infectious.reduce((mask,id)=>mask|(1<<state(id)),0)>>>0,nets,
    steps:structure.course.map(c=>{const v=set.values[c.duration]!;return [state(c.from),state(c.to),v.min!,v.max!];})};
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
  // A u32 comes back signed: read unsigned. 4294967295 is a declaration or parameters the kernel refused.
  const ever=kernel.decl_run(BigInt(seed),index,program.susceptible,program.infected,program.infectious)>>>0;
  if(ever===0xffffffff)fail('The kernel refused this declaration.');
  return {ever,counts:view(Uint32Array,7,days*states).slice(),infectedOn:view(Int32Array,8,n).slice()};
}
