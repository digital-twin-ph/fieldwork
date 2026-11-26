/** TRANSMISSION CHAINS, SPACE-TIME SCAN AND STUDY DESIGN, OUT OF APP.TS (2026-11-22, the Inspector move's batch B):
 *  their standard Inspectors -- name, inputs, one sentence, Configure…, and what the last run said -- and their dialogs.
 *  The chains' and the scan's dialogs moved as they were; Study design came onto the standard here, its period, unit and
 *  note moving from the Inspector into its dialog's first page. What they read of the application comes through the kit. */
import type {WorkflowNode} from './types.js';
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
  checklist:(nodeId:string,draft?:WorkflowNode<'study_design'>['params'])=>ChecklistItem[];
  /** The cases on the points port, with their properties, where a layer holds them. */
  caseRecords:(nodeId:string)=>import('./types.js').PointCollection|undefined;
}

/** THE SPACE-TIME SCAN'S SETTINGS IN ONE SENTENCE (experiment 186). */
export function scanSettingsSentence(p:import('./types.js').ParamsByType['space_time_scan']):string{
  if(!p.dateField)return 'Choose the column holding each case\u2019s date in Configure\u2026';
  return `${p.replay?`Replays the outbreak ${p.unit} by ${p.unit}, scanning each ${p.unit} for clusters still going on;`:'Scans'} circles over places and runs of ${p.unit}s of ${p.dateField}: circles up to ${Math.round(p.maxCaseShare*100)}% of the cases`
    +`${p.maxRadiusKm?` and ${p.maxRadiusKm} km across`:''}, runs up to ${Math.round(p.maxTimeShare*100)}% of the study period`
    +`${p.start||p.end?`, ${p.start??'the first date'} to ${p.end??'the last'}`:''}; tested by shuffling the dates ${p.replications.toLocaleString('en-US')} times, seed ${p.seed}.`;
}


/** WHAT THE SCAN'S LIMITS COME TO, over the cases connected (2026-11-25).
 *
 *  Every setting in this dialog but two is a SHARE -- the largest circle as a share of all cases, the longest run as
 *  a share of the study period -- and a share says nothing on its own. "Circles up to 5% of the cases" is the same
 *  sentence over 60 cases and over 6,000, where it means three cases and three hundred. The Preview restated those
 *  shares back, so the reader had the arithmetic to do themselves, from numbers the dialog had and did not show.
 *
 *  The scan itself is not run here: it shuffles the dates hundreds or thousands of times, which belongs in the run.
 *  What is counted is the material the scan would be given -- how many cases carry a date it can read, what period
 *  they span, and what each share works out to over them. */
function scanPreview(kit:OutbreakKit,nodeId:string,d:import('./types.js').ParamsByType['space_time_scan'],
  esc:(v:string)=>string):string{
  const said=`<p class="standard-sentence">${esc(scanSettingsSentence(d))}</p>`;
  if(!d.dateField)return said;
  const cases=kit.caseRecords(nodeId);
  if(!cases)return said+'<p class="muted">Connect the cases, and what these limits come to over them is counted here.</p>';
  const DAY=86400000;
  const read=(v:unknown):number|null=>{
    const text=String(v??'').trim();
    if(!/^\d{4}-\d{2}-\d{2}/.test(text))return null;
    const at=Date.parse(text.slice(0,10));
    return Number.isFinite(at)?at:null;};
  const placed=cases.features.filter(f=>f.geometry);
  const dated=placed.map(f=>read(f.properties?.[d.dateField])).filter((v):v is number=>v!==null).sort((a,b)=>a-b);
  if(!dated.length)return said+`<p class="profile-flag">None of the ${placed.length.toLocaleString('en-US')} cases `
    +`carry a date this step can read in ${esc(d.dateField)}. It reads dates written year-month-day.</p>`;
  const from=d.start?Date.parse(d.start):dated[0]!,to=d.end?Date.parse(d.end):dated[dated.length-1]!;
  const inPeriod=dated.filter(v=>v>=from&&v<=to);
  const days=Math.max(1,Math.round((to-from)/DAY)+1);
  const units=d.unit==='week'?Math.max(1,Math.ceil(days/7)):days;
  const n=(v:number)=>v.toLocaleString('en-US');
  const iso=(at:number)=>new Date(at).toISOString().slice(0,10);
  return said
    +`<p class="standard-result"><strong>${n(inPeriod.length)}</strong> cases over `
    +`<strong>${n(units)}</strong> ${esc(d.unit)}${units===1?'':'s'}, ${esc(iso(from))} to ${esc(iso(to))}.</p>`
    // THE SHARES IN THE UNITS OF THE THING THEY LIMIT, which is the whole point: a circle is a number of cases and a
    // run is a number of days, and those are what a reader can judge against an outbreak they know.
    +(()=>{
      // THE SCAN'S OWN ARITHMETIC, floor and all: `Math.max(1, floor(bins * maxTimeShare))` in space-time-scan.ts.
      // Without the minimum this said "up to 0 days" of a scan that runs one-day windows -- five days at a tenth
      // floors to zero, and a limit of nothing is not a limit the scan ever applies (review of 0.197.0).
      const longest=Math.max(1,Math.floor(units*d.maxTimeShare));
      return `<p class="description">The largest circle holds up to `
        +`<strong>${n(Math.floor(inPeriod.length*d.maxCaseShare))}</strong> of those cases; the longest run is up to `
        +`<strong>${n(longest)}</strong> ${esc(d.unit)}${longest===1?'':'s'}.</p>`;})()
    +(dated.length<placed.length
      ?`<p class="profile-flag">${n(placed.length-dated.length)} of ${n(placed.length)} cases carry no date this step `
        +`can read in ${esc(d.dateField)}, so they are not scanned.</p>`:'')
    +(inPeriod.length<dated.length
      ?`<p class="profile-flag">${n(dated.length-inPeriod.length)} dated case`
        +`${dated.length-inPeriod.length===1?' falls':'s fall'} outside the study period set above.</p>`:'');
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
      preview:scanPreview(kit,nodeId,draft,esc)}),
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
      draft=>k.checklist(n.id,draft),node.params.label||'Study design');});},
};
export const OUTBREAK_STEP_INSPECTORS={transmission_chains:chainsInspector,space_time_scan:scanInspector,study_design:designInspector} as const;
