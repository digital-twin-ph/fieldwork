/** THE STUDY DESIGN, READ AGAINST THE WORKFLOW THAT IS MEANT TO CARRY IT OUT. Experiment 159.
 *
 *  The practitioner, 2026-11-01: *"The question is how to make the study design the workflow
 *  checklist that addresses the study design implementation."*
 *
 *  TWO KINDS OF ITEM, KEPT APART BECAUSE THEY CLAIM DIFFERENT THINGS. A `declared` item records
 *  what the practitioner said, and nothing here can check it. An `implemented` item is read off
 *  the graph, so it changes as the canvas does, which is the feedback loop.
 *
 *  IT REPORTS AND DOES NOT GRADE. No item stops a run and there is no score. An item read from the
 *  graph says the workflow holds a thing, never that the thing is right. */
import {DESIGN_LICENCES,includedMeasures,upstreamNodeIds} from './study-design.js';
import {designQuestions,chosenOption,investigatorAllocated,openSlots,DESIGN_TABLES,TABLE_CELLS,cellDescribed} from './study-design-questions.js';
import type {Workflow,WorkflowNode} from './types.js';

/** `unknown` is "not sure / not stated", which is an answer. `open` is no answer yet. `differs`
 *  is two wordings that may or may not be one group: a person's to judge, so nothing is left to do
 *  and nothing is wrong. Saying `open` here contradicted the page's advice to name a row as the
 *  group it is, which was found walking South London. */
export type ChecklistStatus='done'|'open'|'unknown'|'differs';
export interface ChecklistItem {
  id:string;
  kind:'declared'|'implemented';
  text:string;
  status:ChecklistStatus;
  detail?:string;
}

const downstreamOf=(w:Workflow,from:string):Set<string>=>{
  const seen=new Set<string>([from]),queue=[from];
  while(queue.length){
    const at=queue.shift()!;
    for(const edge of w.edges)if(edge.from===at&&!seen.has(edge.to)){seen.add(edge.to);queue.push(edge.to);}
  }
  return seen;
};
const nameOf=(n:WorkflowNode)=>(n.params as {label?:string}).label||n.id;
const isInput=(n:WorkflowNode)=>n.type.endsWith('_input');
const isOutput=(n:WorkflowNode)=>n.type.endsWith('_output');
const hasSource=(n:WorkflowNode)=>{
  const p=(n.params as {provenance?:{source?:string;citation?:unknown}}).provenance;
  return Boolean(p?.source?.trim()||p?.citation);
};
const item=(id:string,text:string,met:boolean,detail?:string):ChecklistItem=>
  ({id,kind:'implemented',text,status:met?'done':'open',...(detail?{detail}:{})});

function implemented(w:Workflow,node:WorkflowNode<'study_design'>):ChecklistItem[]{
  const licence=DESIGN_LICENCES[node.params.design];
  const governed=w.edges.filter(e=>e.from===node.id&&e.port==='design')
    .map(e=>w.nodes.find(n=>n.id===e.to)).filter(Boolean) as WorkflowNode[];
  const tables=governed.filter(n=>n.type==='two_by_two') as WorkflowNode<'two_by_two'>[];
  const rest=governed.filter(n=>n.type!=='two_by_two');
  const items:ChecklistItem[]=[];
  if(investigatorAllocated(node.params))return [item('stopped',
    'No design is declared, because investigators allocated exposure',false,
    'The five designs are observational. Computations run under neutral names. Change the answer on allocation, or remove this node.')];

  if(licence.estimates.length){
    // A REGRESSION IS A COMPARISON TOO, and reads the design's licences (experiment 176). The Rate ratio widget counted
    // here with a note that it did not obey the design; it was retired into the two-by-two on 2026-11-05.
    const comparing=tables.length>0||rest.some(n=>n.type==='regression');
    items.push(item('computation','A comparison reads this design',comparing));
    items.push(item('measures','At least one measure is kept',includedMeasures(node.params).length>0));
    if(tables.length)items.push(item('mapping','The two-by-two names its groups and outcome',
      tables.every(t=>t.params.exposureColumn&&t.params.exposed&&t.params.unexposed
        &&t.params.outcomeColumn&&t.params.caseValue)));
  }else items.push(item('no-comparison','No comparison is drawn from these data',tables.length===0,
    tables.length?'A two-by-two is connected, and it reports no measure under this design.':undefined));

  // THE INPUTS BEHIND WHAT THIS DESIGN GOVERNS, or every input where it governs nothing yet.
  const behind=new Set(governed.flatMap(n=>[...upstreamNodeIds(w,n.id)]));
  const scoped=governed.length?w.nodes.filter(n=>behind.has(n.id)):w.nodes;
  const inputs=scoped.filter(isInput);
  const silent=inputs.filter(n=>!hasSource(n));
  items.push(item('data','Data are connected',inputs.length>0));
  if(inputs.length)items.push(item('provenance','Each input says where it came from',!silent.length,
    silent.length?`Not stated: ${silent.map(nameOf).join(', ')}.`:undefined));

  const after=new Set(governed.flatMap(n=>[...downstreamOf(w,n.id)]));
  const outputs=(governed.length?w.nodes.filter(n=>after.has(n.id)):w.nodes).filter(isOutput);
  items.push(item('output','The result reaches an output',outputs.length>0));
  // THE TABLE DECLARED AGAINST THE TABLE COMPUTED. Compared as words, so it can only report a
  // difference: two spellings may be one group, and that is for a person.
  const said=node.params.table;
  const groupsOf=(n:WorkflowNode):[string|undefined,string|undefined]|null=>
    n.type==='two_by_two'?[(n as WorkflowNode<'two_by_two'>).params.exposed,(n as WorkflowNode<'two_by_two'>).params.unexposed]:null;
  // SEVERAL EXPOSURES ARE NOT COMPARED WITH THE ONE DECLARED PAIR. Declared groups in words, "ate" and
  // "did not eat", against a file's Y and N would read as a difference for every food, which is a
  // false alarm and teaches a reader to ignore the real one. They report what they are instead.
  const many=(n:WorkflowNode)=>n.type==='two_by_two'
    &&((n as WorkflowNode<'two_by_two'>).params.exposureColumns?.length??0)>1;
  for(const table of tables.filter(many))items.push(item('exposures',
    `${table.params.exposureColumns!.length} exposures are compared on one outcome`,true,
    'No interval is adjusted for the number of comparisons, and overlapping exposures are not separated.'));
  const computed=governed.filter(n=>!many(n)).flatMap(n=>{const g=groupsOf(n);return g?[g]:[];});
  if(said?.exposed?.trim()&&said.unexposed?.trim()&&computed.length){
    const same=(x?:string,y?:string)=>x?.trim().toLowerCase()===y?.trim().toLowerCase();
    const differing=computed.find(([e,u])=>!same(e,said.exposed)||!same(u,said.unexposed));
    items.push({...item('table-match','The computation has the groups this design declared',!differing,
      differing?`Declared ${said.exposed} against ${said.unexposed}; the computation has `
        +`${differing[0]} against ${differing[1]}. Are these the same groups?`:undefined),
      ...(differing?{status:'differs' as const}:{})});
  }
  return items;
}

function declared(node:WorkflowNode<'study_design'>):ChecklistItem[]{
  const answers=node.params.answers;
  const stated=(id:string,text:string,value:string):ChecklistItem=>
    ({id,kind:'declared',text,status:value.trim()?'done':'open'});
  const table=node.params.table;
  const hasTable=Boolean(DESIGN_TABLES[node.params.design]);
  const blanks=TABLE_CELLS.filter(key=>!cellDescribed(table?.cells?.[key]));
  const stop=investigatorAllocated(node.params);
  return [...(stop?[]:[stated('period','Study period stated',node.params.period)]),
    ...(hasTable&&!stop?[stated('table-groups','The groups and outcome are named',
      table?.exposed&&table.unexposed&&table.outcome?'yes':''),
    {...stated('table-cells','Each cell says what it counts and where it comes from',blanks.length?'':'yes'),
      ...(blanks.length?{detail:`Not yet described: ${blanks.join(', ')}.`}:{})}]:[]),
    ...designQuestions(node.params).map((q):ChecklistItem=>{
      const option=chosenOption(q,answers?.[q.id]);
      const blanks=openSlots(q,answers?.[q.id],node.params.table);
      return {id:q.id,kind:'declared',text:q.text.split('? ')[0]!.replace(/\?*$/,'?'),
        status:!option||blanks.length?'open':option.unknown?'unknown':'done',
        ...(option?{detail:blanks.length?`Answered; still to fill: ${blanks.join(', ')}.`:option.label}:{})};
    })];
}

export function designChecklist(w:Workflow,nodeId:string):ChecklistItem[]{
  const node=w.nodes.find(n=>n.id===nodeId&&n.type==='study_design') as WorkflowNode<'study_design'>|undefined;
  return node?[...implemented(w,node),...declared(node)]:[];
}

/** One line for the Inspector. Counts of each state, deliberately not a percentage: a percentage
 *  would read as a grade. */
export function checklistSummary(items:readonly ChecklistItem[]):string{
  const count=(s:ChecklistStatus)=>items.filter(i=>i.status===s).length;
  const differing=count('differs')?`, ${count('differs')} to compare`:'';
  return `Checklist: ${count('done')} done, ${count('unknown')} stated as unknown, ${count('open')} open${differing}.`;
}
