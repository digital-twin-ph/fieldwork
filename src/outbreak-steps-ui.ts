/** TRANSMISSION CHAINS, SPACE-TIME SCAN AND STUDY DESIGN, OUT OF APP.TS (2026-11-22, the Inspector move's batch B):
 *  their standard Inspectors -- name, inputs, one sentence, Configure…, and what the last run said -- and their dialogs.
 *  The chains' and the scan's dialogs moved as they were; Study design came onto the standard here, its period, unit and
 *  note moving from the Inspector into its dialog's first page. What they read of the application comes through the kit. */
import type {NodeType,WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import type {Receipt} from './results.js';
import type {ChecklistItem} from './study-design-checklist.js';
import {openConfigDialog} from './config-dialog.js';
import {transmissionChains} from './transmission-chains.js';
import {dataTableMarkup} from './data-table-ui.js';
import {PREVIEW_ROWS} from './long-tables.js';
import {checklistSummary} from './study-design-checklist.js';
import {DESIGN_LICENCES,includedMeasures} from './study-design.js';
import {investigatorAllocated} from './study-design-questions.js';
import {openDesignDialog} from './study-design-dialog.js';

export interface OutbreakKit extends StepKit {
  receipt:(nodeId:string)=>Receipt|undefined;
  /** The columns of the cases arriving on the points port, held or read in the last run. */
  caseColumns:(nodeId:string)=>string[];
  /** The key columns arriving and their values. */
  shape:(nodeId:string)=>Record<string,string[]>;
  /** What the workflow has declared, item by item, for the study design's checklist. */
  checklist:(nodeId:string)=>ChecklistItem[];
}

/** THE SPACE-TIME SCAN'S SETTINGS IN ONE SENTENCE (experiment 186). */
export function scanSettingsSentence(p:import('./types.js').ParamsByType['space_time_scan']):string{
  if(!p.dateField)return 'Choose the column holding each case\u2019s date in Configure\u2026';
  return `${p.replay?`Replays the outbreak ${p.unit} by ${p.unit}, scanning each ${p.unit} for clusters still going on;`:'Scans'} circles over places and runs of ${p.unit}s of ${p.dateField}: circles up to ${Math.round(p.maxCaseShare*100)}% of the cases`
    +`${p.maxRadiusKm?` and ${p.maxRadiusKm} km across`:''}, runs up to ${Math.round(p.maxTimeShare*100)}% of the study period`
    +`${p.start||p.end?`, ${p.start??'the first date'} to ${p.end??'the last'}`:''}; tested by shuffling the dates ${p.replications.toLocaleString('en-US')} times, seed ${p.seed}.`;
}


/** THE SPACE-TIME SCAN'S CONFIGURATION DIALOG (experiments 186 and 200). The date column is nominated, never guessed;
 *  the limits are SaTScan's defaults until changed; the seed is shown, so a run can be repeated exactly. */
function openScanConfig(kit:OutbreakKit,nodeId:string){
  const esc=kit.esc,node=kit.workflow().nodes.find(x=>x.id===nodeId) as WorkflowNode<'space_time_scan'>|undefined;if(!node)return;
  type Draft=WorkflowNode<'space_time_scan'>['params'];
  const columns=kit.caseColumns(nodeId);
  openConfigDialog<Draft>({
    id:'scan-config',widget:'Space-time scan',step:node.params.label||kit.title('space_time_scan'),draft:structuredClone(node.params),
    sections:draft=>({settings:''
      +`<div class="field"><label class="field-label" for="scan-date">Each case\u2019s date</label><select id="scan-date">`
        +`<option value="">Choose a column</option>`+columns.map(c=>`<option value="${esc(c)}" ${draft.dateField===c?'selected':''}>${esc(c)}</option>`).join('')+`</select>`
        +(columns.length?'':'<p class="muted">Connect a point layer of cases first.</p>')+`</div>`
      +`<div class="field"><label class="field-label" for="scan-mode">How to scan</label><select id="scan-mode">`
        +`<option value="once" ${draft.replay?'':'selected'}>Once, over the whole period (retrospective)</option>`
        +`<option value="replay" ${draft.replay?'selected':''}>Day by day, as the outbreak unfolded (prospective)</option></select>`
        +`</div>`
      +`<div class="field"><label class="field-label" for="scan-unit">Count by</label><select id="scan-unit">`
        +`<option value="day" ${draft.unit==='day'?'selected':''}>Day</option><option value="week" ${draft.unit==='week'?'selected':''}>Week</option></select></div>`
      +`<div class="field"><label class="field-label" for="scan-case-share">Largest circle, as a share of all cases</label>`
        +`<input id="scan-case-share" type="number" min="0.01" max="0.5" step="0.01" value="${draft.maxCaseShare}"></div>`
      +`<div class="field"><label class="field-label" for="scan-radius">Largest radius, in km (blank: no limit)</label>`
        +`<input id="scan-radius" type="number" min="0.001" step="any" value="${draft.maxRadiusKm??''}"></div>`
      +`<div class="field"><label class="field-label" for="scan-time-share">Longest run, as a share of the study period</label>`
        +`<input id="scan-time-share" type="number" min="0.01" max="0.5" step="0.01" value="${draft.maxTimeShare}"></div>`
      +`<div class="field"><label class="field-label" for="scan-start">Study period from (blank: the first date)</label><input id="scan-start" type="date" value="${draft.start??''}"></div>`
      +`<div class="field"><label class="field-label" for="scan-end">Study period to (blank: the last date)</label><input id="scan-end" type="date" value="${draft.end??''}"></div>`
      +`<div class="field"><label class="field-label" for="scan-replications">Shuffles of the dates</label>`
        +`<input id="scan-replications" type="number" min="99" max="99999" step="1" value="${draft.replications}"></div>`
      +`<div class="field"><label class="field-label" for="scan-seed">Seed of the shuffles</label>`
        +`<input id="scan-seed" type="number" min="0" max="4294967295" step="1" value="${draft.seed}"></div>`
      +``,
      preview:`<p class="standard-sentence">${esc(scanSettingsSentence(draft))}</p>`}),
    wire:(root,draft,redraw)=>{
      const on=(id:string,fn:(el:HTMLInputElement&HTMLSelectElement)=>void)=>root.querySelector<HTMLInputElement&HTMLSelectElement>(id)?.addEventListener('change',e=>{fn(e.target as never);redraw();});
      on('#scan-date',el=>{draft.dateField=el.value;});
      on('#scan-unit',el=>{draft.unit=el.value==='week'?'week':'day';});
      on('#scan-mode',el=>{if(el.value==='replay')draft.replay=true;else delete draft.replay;});
      on('#scan-case-share',el=>{draft.maxCaseShare=Number(el.value);});
      on('#scan-time-share',el=>{draft.maxTimeShare=Number(el.value);});
      on('#scan-radius',el=>{if(el.value)draft.maxRadiusKm=Number(el.value);else delete draft.maxRadiusKm;});
      on('#scan-start',el=>{if(el.value)draft.start=el.value;else delete draft.start;});
      on('#scan-end',el=>{if(el.value)draft.end=el.value;else delete draft.end;});
      on('#scan-replications',el=>{draft.replications=Number(el.value);});
      on('#scan-seed',el=>{draft.seed=Number(el.value);});
    },
    apply:draft=>{kit.keep(w=>{const t=w.nodes.find(x=>x.id===nodeId);if(t?.type==='space_time_scan')t.params=draft;});},
  },esc);
}


/** TRANSMISSION CHAINS' SETTINGS (experiment 216), in the standard dialog: which column names each case, which names its
 *  recorded source, the value written for "no source", and the date that orders a case's children. The preview runs on
 *  the table the last run handed this step. */
function openChainsConfig(kit:OutbreakKit,node:WorkflowNode<'transmission_chains'>){
  const esc=kit.esc;
  type Draft={id:string;parent:string;none:string;date:string};
  const values=kit.shape(node.id),table=kit.tableOn(node.id,'records');
  const columns=table?.keys??Object.keys(values);
  const pick=(id:string,label:string,chosen:string,optional=false)=>`<div class="field"><label class="field-label" for="${id}">${label}</label>`
    +`<select id="${id}">${optional||!chosen?`<option value="">${optional?'None':'Choose a column'}</option>`:''}`
    +columns.map(c=>`<option value="${esc(c)}" ${c===chosen?'selected':''}>${esc(c)}</option>`).join('')+`</select></div>`;
  openConfigDialog<Draft>({id:'chains-dialog',widget:kit.title('transmission_chains'),step:node.params.label||kit.title('transmission_chains'),
    draft:{id:node.params.id??'',parent:node.params.parent??'',none:node.params.none??'',date:node.params.date??''},
    sections:draft=>{
      const settings=pick('chains-id','Each case is named in',draft.id)+pick('chains-parent','Its recorded source is in',draft.parent)
        +`<div class="field"><label class="field-label" for="chains-none">Written for "no source recorded"</label>`
        +`<input id="chains-none" value="${esc(draft.none)}" placeholder="Leave empty if an empty cell means none"></div>`
        +pick('chains-date','Order each case\u2019s children by',draft.date,true);
      if(!draft.id||!draft.parent)return {settings,message:{tone:'warning',text:'Choose the column naming each case and the column naming its source.'},blocked:true};
      if(!table)return {settings,preview:'<p>Run the workflow once to see the chains this finds.</p>'};
      try{
        const found=transmissionChains(table,{id:draft.id,parent:draft.parent,...(draft.none?{none:draft.none}:{}),...(draft.date?{date:draft.date}:{})});
        return {settings,preview:`<p class="select-preview-count">${esc(found.sentence)}</p>`
          +`<div class="chains-preview">${dataTableMarkup(found.table,esc,{pageSize:PREVIEW_ROWS})}</div>`};
      }catch(error){return {settings,message:{tone:'refusal',text:error instanceof Error?error.message:String(error)},blocked:true};}
    },
    wire:(root,draft,redraw)=>{
      for(const [id,key] of [['chains-id','id'],['chains-parent','parent'],['chains-date','date']] as const)
        root.querySelector<HTMLSelectElement>('#'+id)?.addEventListener('change',e=>{draft[key]=(e.target as HTMLSelectElement).value;redraw();});
      root.querySelector<HTMLInputElement>('#chains-none')?.addEventListener('change',e=>{draft.none=(e.target as HTMLInputElement).value.trim();redraw();});
    },
    apply:draft=>{kit.keep(w=>{const t=w.nodes.find(x=>x.id===node.id);if(t?.type!=='transmission_chains')return;const p=t.params;
      for(const key of ['id','parent','none','date'] as const){if(draft[key])p[key]=draft[key];else delete p[key];}});},
  },esc);
}

const configure='<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button></div>';
const said=(kit:OutbreakKit,id:string,ran:string|undefined)=>{const why=kit.unfinished(id);
  return `<p class="standard-result${why?' standard-result-warning':''}">${kit.esc(why?`The last run could not compute this step: ${why}`:ran??'Not run yet.')}</p>`;};
export const chainsInspector:OwnInspector<'transmission_chains'>={
  // The columns are in Configure…; here, what it follows, and what the last run found (experiment 216).
  markup:(n,kit)=>{const k=kit as OutbreakKit,p=n.params;
    return kit.section('Name',kit.name('chains-label',p.label||'Transmission chains'))
      +kit.section('Inputs',kit.inputs(n,{records:'Cases, each with its recorded source'}))
      +kit.section('Settings',`<p class="standard-sentence">${kit.esc(p.id&&p.parent
        ?`Follows ${p.parent} from each ${p.id} back to the case its chain starts with${p.none?`; "${p.none}" means no source`:''}.`
        :'Choose the case id and infected-by columns in Configure\u2026')}</p>`+configure)
      +kit.section('Result',said(k,n.id,k.receipt(n.id)?.method));},
  wire:(n,kit,root)=>{const k=kit as OutbreakKit;root.querySelector('#configure-step')?.addEventListener('click',()=>{
    const node=k.workflow().nodes.find(x=>x.id===n.id);if(node?.type==='transmission_chains')openChainsConfig(k,node as WorkflowNode<'transmission_chains'>);});},
};
export const scanInspector:OwnInspector<'space_time_scan'>={
  // The settings are in Configure…; here, one sentence of what it scans and what the last run found (experiment 200).
  markup:(n,kit)=>{const k=kit as OutbreakKit,p=n.params;
    return kit.section('Name',kit.name('scan-label',p.label||'Space-time scan'))
      +kit.section('Inputs',kit.inputs(n,{points:'Cases, with a date and a place'}))
      +kit.section('Settings',`<p class="standard-sentence">${kit.esc(scanSettingsSentence(p))}</p>`+configure)
      +kit.section('Result',said(k,n.id,k.receipt(n.id)?.method)+'<div data-standard-result></div>');},
  wire:(n,kit,root)=>{root.querySelector('#configure-step')?.addEventListener('click',()=>openScanConfig(kit as OutbreakKit,n.id));},
};
/** STUDY DESIGN'S ONE SENTENCE: what it declares, what it reports, and when and of what (experiment 154). */
export function designSentence(p:WorkflowNode<'study_design'>['params']):string{
  if(investigatorAllocated(p))return 'No design declared: investigators allocated exposure.';
  const reported=includedMeasures(p).join(', ')||'no measure';
  return `A ${p.design} study, reporting ${reported}`+(p.period?`, ${p.period}`:'')+(p.unitOfAnalysis?`; one row is one ${p.unitOfAnalysis}`:'')+'.';
}
export const designInspector:OwnInspector<'study_design'>={
  // Declared and never inferred: nothing reads a design off a table. What each design licenses is shown in Configure…
  // before it is chosen; here, what was chosen, and the checklist of what the workflow has declared under it.
  markup:(n,kit)=>{const k=kit as OutbreakKit,p=n.params;
    return kit.section('Name',kit.name('design-label',p.label||'Study design'))+kit.section('Inputs',kit.inputs(n))
      +kit.section('Settings',`<p class="standard-sentence">${kit.esc(designSentence(p))}</p>`
        +`<p class="description">${kit.esc(DESIGN_LICENCES[p.design].because)}</p>`+configure)
      +kit.section('Result',`<p class="standard-result" id="design-checklist-summary">${kit.esc(checklistSummary(k.checklist(n.id)))}</p>`);},
  wire:(n,kit,root)=>{const k=kit as OutbreakKit;root.querySelector('#configure-step')?.addEventListener('click',()=>{
    const node=k.workflow().nodes.find(x=>x.id===n.id);if(node?.type!=='study_design')return;
    // Replaced rather than merged: a design change removes `computations`, and `Object.assign` would leave the old
    // design's choice standing.
    openDesignDialog(node.params,kit.esc,next=>{k.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='study_design')t.params=next;});},
      ()=>k.checklist(n.id));});},
};
export const OUTBREAK_STEP_INSPECTORS={transmission_chains:chainsInspector,space_time_scan:scanInspector,study_design:designInspector} as const;
