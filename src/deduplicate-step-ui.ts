/** DEDUPLICATE RECORDS, OUT OF APP.TS (2026-11-22, the Inspector move's batch C, begun with this widget because the table
 *  stress tests changed it): its standard Inspector -- name, inputs, one sentence, Configure…, and what the last run
 *  found, with the review one button away -- its sentence, settings and dialog. Moved as they were; the Inspector's own
 *  controls for the settings, left over from before the dialog, went with nothing to attach to. */
import type {WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import type {DeduplicateResult} from './deduplicate-points.js';
import {pairSignature} from './deduplicate-points.js';
import {openDeduplicateReview} from './deduplicate-ui.js';
import {openConfigDialog} from './config-dialog.js';
import {nodeInputs} from './core.js';

export interface DedupKit extends StepKit {
  /** What the last run's deduplication found, if it ran. */
  linkage:(nodeId:string)=>DeduplicateResult|undefined;
  /** The key columns arriving on the step. */
  upstreamKeys:(nodeId:string)=>string[];
}

/** DEDUPLICATE RECORDS' ONE SENTENCE (experiment 186). */
export function dedupSentence(p:import('./types.js').ParamsByType['deduplicate_points']):string{
  if(p.format==='table')return `Finds rows of one table that are one record entered twice, by ${(p.blockColumns?.length?p.blockColumns:['its primary key']).join(', ')}.`;
  return `Finds records in two or more point layers that are the same place: names ${p.nameMatch==='fuzzy'?`within ${p.fuzzyThreshold}`:'equal'} and within ${p.nearDistanceM} m.`;
}

/** DEDUPLICATE RECORDS' SETTINGS, for its dialog: the way in, and what that way compares. Built from a draft. */
function dedupSettings(kit:DedupKit,n:WorkflowNode<'deduplicate_points'>,p:import('./types.js').ParamsByType['deduplicate_points']):string{
  const esc=kit.esc,workflow=kit.workflow();
  const tabular=p.format==='table';
  let html=`<div class="field"><label class="field-label" for="dedup-format">The records are</label>`
    +`<select id="dedup-format"><option value="points" ${!tabular?'selected':''}>Points, in two or more sources</option>`
    +`<option value="table" ${tabular?'selected':''}>Rows of one table</option></select></div>`;
    const offered=tabular?kit.upstreamKeys(n.id):[];
    const upTable=(()=>{const edge=workflow.edges.find(e=>e.to===n.id&&e.port==='records');
      const up=edge?workflow.nodes.find(m=>m.id===edge.from):undefined;
      return up?.type==='table_input'?up.params.data:undefined;})();
    const tableColumns=upTable?[...upTable.keys,upTable.valueField]:offered;
    const pick=(key:'blockColumns'|'compareColumns',legend:string,fallback:string[])=>
      `<fieldset class="field exposure-list"><legend class="field-label">${legend}</legend>`
      +tableColumns.map(name=>`<label class="check"><input type="checkbox" data-dedup-columns="${key}" value="${esc(name)}" `
        +`${(p[key]?.length?p[key]:fallback).includes(name)?'checked':''}> ${esc(name)}</label>`).join('')+`</fieldset>`;
    if(tabular){
      const block=p.blockColumns?.length?p.blockColumns:upTable?.primaryKey??[];
      html+=`<p class="description">Compares rows that share the columns identifying a row, by default the table's primary key. `
        +`Rows identical on every compared column are one record entered twice and merge on their own. Any disagreement comes to you, and you choose which row to keep.</p>`
        +(tableColumns.length?pick('blockColumns','Rows are the same record only if they share',upTable?.primaryKey??[])
          +pick('compareColumns','Compare these columns',tableColumns.filter(c=>!block.includes(c)))
          :'<p class="description">Connect a table to choose its columns.</p>')
        +`<label class="field-label" for="dedup-name-match">Text comparison</label>`
        +`<select id="dedup-name-match" data-dedup="nameMatch">`
        +`<option value="exact" ${p.nameMatch==='exact'?'selected':''}>Exact, after normalising</option>`
        +`<option value="fuzzy" ${p.nameMatch==='fuzzy'?'selected':''}>Jaro-Winkler similarity</option></select>`
        +(p.nameMatch==='fuzzy'?`<label class="field-label" for="dedup-fuzzy">Similarity at or above</label>`
          +`<input id="dedup-fuzzy" data-dedup="fuzzyThreshold" type="number" min="0.5" max="1" step="0.01" value="${p.fuzzyThreshold}">`:'');
    }else html+=`<p class="description">Finds records in two or more sources that are the same place.</p>`
    if(!tabular)html+=`<label class="field-label" for="dedup-name-field">Name attribute</label>`
      +`<input id="dedup-name-field" data-dedup="nameField" maxlength="60" value="${esc(p.nameField)}">`
      +`<label class="field-label" for="dedup-name-match">Name comparison</label>`
      +`<select id="dedup-name-match" data-dedup="nameMatch">`
      +`<option value="fuzzy" ${p.nameMatch==='fuzzy'?'selected':''}>Jaro-Winkler similarity</option>`
      +`<option value="exact" ${p.nameMatch==='exact'?'selected':''}>Exact, after normalising</option>`
      +`</select>`
      +(p.nameMatch==='fuzzy'?`<label class="field-label" for="dedup-fuzzy">Similarity at or above</label>`
        +`<input id="dedup-fuzzy" data-dedup="fuzzyThreshold" type="number" min="0.5" max="1" step="0.01" value="${p.fuzzyThreshold}">`:'')
      +`<label class="field-label" for="dedup-block">Compare pairs within (m)</label>`
      +`<input id="dedup-block" data-dedup="blockDistanceM" type="number" min="1" max="50000" step="10" value="${p.blockDistanceM}">`
      +``
      +`<label class="field-label" for="dedup-near">Count as the same place within (m)</label>`
      +`<input id="dedup-near" data-dedup="nearDistanceM" type="number" min="1" max="50000" step="5" value="${p.nearDistanceM}">`
      +``
      +`<label class="field-label" for="dedup-match">Merge automatically at a score of</label>`
      +`<input id="dedup-match" data-dedup="matchThreshold" type="number" min="1" max="2" step="1" value="${p.matchThreshold}">`
      +`<label class="field-label" for="dedup-review">Ask me at a score of</label>`
      +`<input id="dedup-review" data-dedup="reviewThreshold" type="number" min="0" max="2" step="1" value="${p.reviewThreshold}">`
      +``;
  return html;
}

/** DEDUPLICATE RECORDS' DIALOG (experiment 186): every setting on a draft. What a run found, and the pairs that wait
 *  for a person, stay in the Inspector's Result and the review dialog. */
function openDedupConfig(kit:DedupKit,nodeId:string){
  const esc=kit.esc,node=kit.workflow().nodes.find(x=>x.id===nodeId) as WorkflowNode<'deduplicate_points'>|undefined;if(!node)return;
  type Draft=import('./types.js').ParamsByType['deduplicate_points'];
  openConfigDialog<Draft>({
    id:'dedup-config',widget:'Deduplicate records',step:node.params.label||kit.title('deduplicate_points'),draft:structuredClone(node.params),
    sections:draft=>{
      const settings=dedupSettings(kit,node,draft);
      return {settings,preview:'<p class="muted">The pairs are compared when the workflow runs; what it found, and the pairs that wait for you, are in the Inspector\u2019s Result.</p>'};
    },
    wire:(root,draft,redraw)=>{
      const on=(selector:string,fn:(el:HTMLInputElement&HTMLSelectElement)=>void)=>
        root.querySelectorAll<HTMLInputElement&HTMLSelectElement>(selector).forEach(el=>el.addEventListener('change',()=>{fn(el);redraw();}));
      on('#dedup-format',el=>{const f=el.value as Draft['format'];draft.format=f;
        // Text in a table is compared exactly unless somebody asks otherwise; names across sources are not.
        draft.nameMatch=f==='points'?'fuzzy':'exact';});
      on('[data-dedup]',el=>{(draft as unknown as Record<string,unknown>)[el.dataset.dedup!]=(el as HTMLElement as HTMLInputElement).type==='number'?Number(el.value):el.value;});
      on('[data-dedup-columns]',el=>{const key=el.dataset.dedupColumns as 'blockColumns'|'compareColumns';
        draft[key]=[...root.querySelectorAll<HTMLInputElement>(`[data-dedup-columns="${key}"]:checked`)].map(b=>b.value);});
    },
    apply:draft=>{
      kit.change(w=>{const target=w.nodes.find(x=>x.id===nodeId) as WorkflowNode<'deduplicate_points'>|undefined;if(!target)return;const was=target.params.format??'points';
        target.params=draft;
        // WHAT THE RECORDS ARE decides the ports, so the edges that no longer fit are removed with it.
        if((draft.format??'points')!==was){const ports=new Set(nodeInputs(target).map(([port])=>port));
          w.edges=w.edges.filter(edge=>edge.to!==nodeId||ports.has(edge.port));}});
    },
  },esc);
}

export const dedupInspector:OwnInspector<'deduplicate_points'>={
  markup:(n,k)=>{const kit=k as DedupKit;
    const esc=kit.esc,p=n.params,linkage=kit.linkage(n.id);let content='';
    content+=kit.section('Name',kit.name('dedup-label',p.label||'Deduplicated records'));
    content+=kit.section('Inputs',kit.inputs(n));
    content+=kit.section('Settings',`<p class="standard-sentence">${esc(dedupSentence(p))}</p>`
      +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button></div>');
    const why=kit.unfinished(n.id);
    let summary='';
    if(linkage){
      const waiting=linkage.candidates.filter(c=>c.classification==='review'&&!c.decided);
      const review=linkage.candidates.filter(c=>c.classification==='review').length;
      const considered=linkage.compared+linkage.blocked;
      // EVERY OUTCOME IN ONE TABLE, each against the two denominators that mean something: how
      // much of the whole comparison it was, and how much of what was actually compared. The
      // practitioner, 2026-10-21, with 48 pairs waiting outside the summary that reported the run:
      // *"the 48 review pairs should be included in the THIS RUN summary ... as a table with
      // percentage over total and percentage over pairs compared."* 379 matched reads differently
      // at 69% of what was compared than at 0.3% of what was considered, and both are true.
      // Two decimals only where one would read as zero: 0.29% of 132,317 pairs is a real
      // quantity and "0.3%" hides how small it is, while a plain zero is a zero.
      const share=(n:number,of:number)=>!of?'—':!n?'0%':`${(n/of*100).toFixed(n/of<0.01?2:1)}%`;
      const row=(label:string,count:number,{compared=true,emphasis=false}={})=>
        `<tr${emphasis?' class="emphasis"':''}><th scope="row">${label}</th><td>${count.toLocaleString()}</td>`
        +`<td>${share(count,considered)}</td><td>${compared?share(count,linkage.compared):'—'}</td></tr>`;
      summary+=`<span class="inspector-section">This run</span>`
        +`<table class="dedup-summary"><thead><tr><th>Pairs</th><th>Count</th><th title="Of every pair considered">% all</th><th title="Of the pairs actually compared">% compared</th></tr></thead><tbody>`
        +row('Considered',considered,{compared:false})
        +row('Never compared',linkage.blocked,{compared:false})
        +row('Compared',linkage.compared)
        +row('Matched',linkage.matched,{emphasis:true})
        +row('In review',review)
        +row('Awaiting you',waiting.length,{emphasis:!!waiting.length})
        +row('Not a match',linkage.compared-linkage.matched-review)
        +`</tbody></table>`
        +`<table class="dedup-summary"><thead><tr><th>Records</th><th>Count</th><th title="Of the records that came in">% all</th><th></th></tr></thead><tbody>`
        +`<tr><th scope="row">Came in</th><td>${linkage.inputCount.toLocaleString()}</td><td>100%</td><td></td></tr>`
        +`<tr class="emphasis"><th scope="row">Merged away</th><td>${linkage.merged.toLocaleString()}</td><td>${share(linkage.merged,linkage.inputCount)}</td><td></td></tr>`
        +`<tr><th scope="row">Came out</th><td>${(linkage.inputCount-linkage.merged).toLocaleString()}</td><td>${share(linkage.inputCount-linkage.merged,linkage.inputCount)}</td><td></td></tr>`
        +`</tbody></table>`;
      if(waiting.length)summary+=`<button id="dedup-review-open" class="button primary">Review ${waiting.length} ${waiting.length===1?'pair':'pairs'}</button>`
        +``;
      if(p.decisions.length)summary+=`<p class="muted">${p.decisions.length} ${p.decisions.length===1?'decision':'decisions'} recorded. Editing either record lapses the one made about it.</p>`;
    }
    content+=kit.section('Result',(why||!linkage?`<p class="standard-result${why?' standard-result-warning':''}">`
      +`${esc(why?`The last run could not compute this step: ${why}`:'Not run yet.')}</p>`:'')+summary);
    return content;
  },
  wire:(n,k,root)=>{const kit=k as DedupKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>openDedupConfig(kit,n.id));
    root.querySelector('#dedup-review-open')?.addEventListener('click',()=>{
      const linkage=kit.linkage(n.id);if(!linkage)return;
      const node=kit.workflow().nodes.find(x=>x.id===n.id);if(node?.type!=='deduplicate_points')return;
      const waiting=linkage.candidates.filter(c=>c.classification==='review');
      const decided=new Map(node.params.decisions.map(d=>[d.key,{decision:d.decision,reason:d.reason}]));
      const target=(w:import('./types.js').Workflow)=>w.nodes.find(x=>x.id===n.id) as WorkflowNode<'deduplicate_points'>|undefined;
      openDeduplicateReview({
        title:node.params.label,candidates:waiting,decided,
        onDecide:(key,decision,reason,keep)=>{
          const candidate=waiting.find(c=>c.key===key);if(!candidate)return;
          kit.change(w=>{const t=target(w);if(!t)return;
            t.params.decisions=[...t.params.decisions.filter(d=>d.key!==key),{key,decision,reason,signature:pairSignature(candidate),...(keep?{keep}:{})}];});
        },
        onClear:key=>kit.change(w=>{const t=target(w);if(t)t.params.decisions=t.params.decisions.filter(d=>d.key!==key);}),
      },kit.esc);
    });
  },
};
