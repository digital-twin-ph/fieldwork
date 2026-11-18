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
  /** `states`: the infectious states that transmit on this network, where not all of them do (a child with the rash is
   *  kept home from school). Absent, every infectious state does. */
  networks:({id:string;label:string;probability:string;states?:string[]}&({groups:string;none?:number}|{everyone:true}))[];
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
  for(const n of s.networks){
    if(params.get(n.probability)?.kind!=='probability')fail(`${s.id}: ${n.probability} is not a declared probability.`);
    if(n.states&&(!n.states.length||n.states.some(x=>!infectious.includes(x))))
      fail(`${s.id}: the states that transmit on the ${n.label.toLowerCase()} network are infectious states.`);
  }
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
  nets:{kind:0|1;none:number;probability:number;groups?:ArrayLike<number>;states:number}[];
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
    const states=net.states?net.states.reduce((mask,id)=>mask|(1<<state(id)),0)>>>0:0xffffffff;
    if('everyone' in net)return {kind:1 as const,none:-1,probability,states};
    const groups=population.groups[net.groups]??fail(`The population has no ${net.groups} for the ${net.label.toLowerCase()} network.`);
    if(groups.length!==population.n)fail(`The population's ${net.groups} has ${groups.length} entries for ${population.n} people.`);
    return {kind:0 as const,none:net.none??-1,probability,groups,states};
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

/** WHAT IS DONE DURING A RUN, AND WHEN (the practitioner, 2026-11-18, naming it a **response scenario**): how cases are
 *  detected, how soon detection is notified, and each response action with its start and its effect on a contact
 *  network. Kept apart from the parameter set, so one disease runs under several responses; its values carry their
 *  evidence as a parameter set's do. */
export interface ResponseScenario {
  schema:'fieldwork/response-scenario/1'; id:string; version:string; title:string;
  structure:{id:string;version:string};
  /** Day 0 of a run, and the days of the week each network does not meet (a school's Sunday). */
  calendar?:{start:string;closed:Record<string,string[]>;note?:string};
  /** Each a daily chance of a case being noticed: in a state (care sought), or on a network while it meets (a teacher). */
  detection:({id:string;label:string;chance:string}&({state:string}|{network:string}))[];
  /** Days from detection to notification; absent, nothing is notified and no action starts. */
  notification?:{after:string};
  actions:{id:string;label:string;network:string;factor:string;after:string}[];
  values:Record<string,{value:number;evidence:Evidence}>;
}
const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function validateResponseScenario(r:ResponseScenario,structure:ModelStructure):ResponseScenario{
  if(!isRecord(r)||r.schema!=='fieldwork/response-scenario/1')fail('Not a response scenario.');
  if(r.structure.id!==structure.id||r.structure.version!==structure.version)
    fail(`${r.id} is for ${r.structure.id} ${r.structure.version}, not ${structure.id} ${structure.version}.`);
  const states=new Set(structure.states.map(x=>x.id)),nets=new Set(structure.networks.map(x=>x.id));
  const value=(id:string,what:'chance'|'days'|'factor')=>{
    const v=r.values[id]??fail(`${r.id}: no value for ${id}.`);
    validEvidence(v.evidence,`${r.id}, ${id}`);
    const ok=what==='chance'?v.value>=0&&v.value<=1:what==='days'?Number.isInteger(v.value)&&v.value>=0:Number.isFinite(v.value)&&v.value>=0;
    if(!ok)fail(`${r.id}, ${id}: ${what==='chance'?'a chance between 0 and 1':what==='days'?'whole days, 0 or more':'a factor of 0 or more'}.`);
  };
  for(const d of r.detection){
    if('state' in d&&!states.has(d.state))fail(`${r.id}: ${d.label} notices a state ${structure.id} does not declare.`);
    if('network' in d&&!nets.has(d.network))fail(`${r.id}: ${d.label} notices on a network ${structure.id} does not declare.`);
    value(d.chance,'chance');
  }
  if(r.notification)value(r.notification.after,'days');
  if(r.actions.length>16)fail(`${r.id}: at most 16 actions.`);
  if(r.actions.length&&!r.notification)fail(`${r.id}: an action starts after notification, so a scenario with actions notifies.`);
  for(const a of r.actions){
    if(!nets.has(a.network))fail(`${r.id}: ${a.label} acts on a network ${structure.id} does not declare.`);
    value(a.factor,'factor');value(a.after,'days');
  }
  if(r.calendar){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(r.calendar.start)||Number.isNaN(Date.parse(r.calendar.start)))fail(`${r.id}: the calendar starts on a date, YYYY-MM-DD.`);
    for(const [net,days] of Object.entries(r.calendar.closed)){
      if(!nets.has(net))fail(`${r.id}: the calendar closes a network ${structure.id} does not declare.`);
      for(const d of days)if(!WEEKDAYS.includes(d))fail(`${r.id}: ${d} is not a day of the week.`);
    }
  }
  return r;
}

/** A response scenario as the kernel takes it: which days each network meets, the chances of notice, and the actions. */
export interface Response {
  open:Uint8Array; noticeNet:number[]; noticeState:number[]; delay:number; actions:[number,number,number][];
}
export function compileResponse(structure:ModelStructure,r:ResponseScenario,days:number):Response{
  validateStructure(structure);validateResponseScenario(r,structure);
  const nets=structure.networks.map(x=>x.id),states=structure.states.map(x=>x.id);
  const v=(id:string)=>r.values[id]!.value;
  const open=new Uint8Array(days*nets.length).fill(1);
  if(r.calendar){
    const first=new Date(`${r.calendar.start}T00:00:00Z`).getUTCDay();
    for(const [net,closed] of Object.entries(r.calendar.closed)){
      const j=nets.indexOf(net);
      for(let day=0;day<days;day++)if(closed.includes(WEEKDAYS[(first+day)%7]!))open[day*nets.length+j]=0;
    }
  }
  const noticeNet=nets.map(()=>0),noticeState=states.map(()=>0);
  // Two pathways on the same network or state combine as independent chances.
  for(const d of r.detection){
    const c=v(d.chance);
    if('state' in d){const s=states.indexOf(d.state);noticeState[s]=1-(1-noticeState[s]!)*(1-c);}
    else{const j=nets.indexOf(d.network);noticeNet[j]=1-(1-noticeNet[j]!)*(1-c);}
  }
  return {open,noticeNet,noticeState,delay:r.notification?v(r.notification.after):-1,
    actions:r.actions.map(a=>[nets.indexOf(a.network),v(a.factor),v(a.after)])};
}

/** A run under a response: its days of detection, notification and each action's start (-1 never), the day the index
 *  case first transmits (emergence), and the day most were infectious (the peak). */
export interface RespondedRun extends Run {
  detectedOn:number; notifiedOn:number; actionsOn:number[]; emergedOn:number; peakOn:number; peak:number;
}

export function runDeclared(kernel:DeclaredKernel,program:Program,options:{seed:number|bigint;index:number;days:number;response:Response}):RespondedRun;
export function runDeclared(kernel:DeclaredKernel,program:Program,options:{seed:number|bigint;index:number;days:number}):Run;
export function runDeclared(kernel:DeclaredKernel,program:Program,{seed,index,days,response}:{seed:number|bigint;index:number;days:number;response?:Response}):Run|RespondedRun{
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
  view(Uint32Array,12,nets.length).set(nets.map(x=>x.states));
  if(response){
    if(response.open.length!==days*nets.length)fail('The response was laid out for another number of days.');
    view(Uint8Array,13,days*nets.length).set(response.open);
    view(Float64Array,14,nets.length).set(response.noticeNet);
    view(Float64Array,15,states).set(response.noticeState);
    view(Float64Array,16,response.actions.length*3).set(response.actions.flat());
    view(Int32Array,18,2).set([response.delay,response.actions.length]);
  }
  // A u32 comes back signed: read unsigned. 4294967295 is a declaration or parameters the kernel refused.
  const ever=kernel.decl_run(BigInt(seed),index,program.susceptible,program.infected,program.infectious)>>>0;
  if(ever===0xffffffff)fail('The kernel refused this declaration.');
  const run={ever,counts:view(Uint32Array,7,days*states).slice(),infectedOn:view(Int32Array,8,n).slice()};
  if(!response)return run;
  const events=view(Int32Array,17,2+response.actions.length);
  // Emergence: the first day of the index case's course on which it is in a transmitting state.
  const course=view(Int32Array,6,steps.length*2*n);
  let emergedOn=-1;
  for(let k=0;k<steps.length;k++){const to=course[(index*steps.length+k)*2]!;if(to<0)break;
    if(program.infectious>>>to&1){emergedOn=course[(index*steps.length+k)*2+1]!;break;}}
  let peak=0,peakOn=0;
  for(let day=0;day<days;day++){let infectious=0;
    for(let s=0;s<states;s++)if(program.infectious>>>s&1)infectious+=run.counts[day*states+s]!;
    if(infectious>peak){peak=infectious;peakOn=day;}}
  return {...run,detectedOn:events[0]!,notifiedOn:events[1]!,actionsOn:Array.from(events.subarray(2)),emergedOn,peakOn,peak};
}

/** The three 7-1-7 intervals of a run, in days, and whether each meets its target; null where the event never came. An
 *  action never started is not met (7-1-7's rule, Frieden 2021, as recorded in experiment 220). */
export function sevenOneSeven(run:RespondedRun):{detect:number|null;notify:number|null;respond:number|null;met:{detect:boolean;notify:boolean;respond:boolean;all:boolean}}{
  const detect=run.detectedOn>=0&&run.emergedOn>=0?run.detectedOn-run.emergedOn:null;
  const notify=run.notifiedOn>=0?run.notifiedOn-run.detectedOn:null;
  const respond=run.notifiedOn>=0&&run.actionsOn.length&&run.actionsOn.every(d=>d>=0)?Math.max(...run.actionsOn)-run.notifiedOn:null;
  const met={detect:detect!==null&&detect<=7,notify:notify!==null&&notify<=1,respond:respond!==null&&respond<=7,all:false};
  met.all=met.detect&&met.notify&&met.respond;
  return {detect,notify,respond,met};
}
