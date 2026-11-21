/** JOIN A TABLE TO THE STUDY AREA, on the standard (experiment 186; 2026-11-20). The practitioner, on a DR Congo census
 *  joined to provinces from geoBoundaries: the run stopped on *"The table has no column """*, because the column naming
 *  each part had never been chosen, and nothing showed what the area's parts were called or what the join would make.
 *  So: the Inspector says what the step will do and what it lacks; every setting is in the configuration dialog, with the
 *  table and the parts Before, and each part with its value After; the column is proposed from the names themselves. */
import type {Escape,WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import type {DataTable} from './data-table.js';
import {joinTableToAreas,proposeKeyColumn,type AreaJoinResult} from './area-join.js';
export {proposeKeyColumn};
import {openConfigDialog} from './config-dialog.js';
import {PREVIEW_ROWS} from './long-tables.js';
import {openWalkthrough} from './table-walkthrough.js';
import {joinTableWalkthrough} from './spatial-walkthroughs.js';
export {joinTableWalkthrough};

type JoinParams=WorkflowNode<'join_table_to_area'>['params'];
type Part={id:string;name:string};
type Match='exact'|'fuzzy';

export interface JoinKit extends StepKit {
  /** What the step feeding a port is called, or `fallback`. */
  sourceName:(nodeId:string,port:string,fallback:string)=>string;
  /** The table's columns, read up the workflow without a run. */
  keyColumns:(nodeId:string)=>string[];
  /** The parts joined to: the study area's own, before a run, or the polygon layer's from the last run. */
  parts:(nodeId:string)=>Part[]|undefined;
  /** What the last run joined. */
  joined:(nodeId:string)=>AreaJoinResult|undefined;
}

const n=(x:number)=>x.toLocaleString('en');

/** One sentence of what the step will do, or what it still needs. */
export function joinSentence(p:JoinParams,table:string,area:string):string{
  if(!p.keyField)return `Puts a value from ${table} onto each part of ${area}, once the column naming each part is chosen.`;
  return `Puts ${table}'s value onto each part of ${area} whose name its column "${p.keyField}" gives, `
    +(p.normalisation==='exact'?'written exactly as the part’s name':'ignoring capitals, punctuation and spacing')
    +(p.frameField?`, one value per "${p.frameField}"`:'')+(p.categoryField?`, each part classed by "${p.categoryField}"`:'')+'.';
}

interface JoinDraft {keyField:string;normalisation:Match;frameField:string;categoryField:string;proposed?:number;proposedRows?:number}
export interface JoinConfigView {
  step:string; tableName:string; areaName:string;
  columns:string[]; table?:DataTable; parts?:Part[];
  initial:JoinDraft;
  apply:(draft:JoinDraft)=>void;
}
const ROWS_SHOWN=PREVIEW_ROWS;
const scroll=(head:string[],rows:string[][],esc:Escape)=>'<div class="table-scroll join-scroll"><table><thead><tr>'
  +head.map(h=>`<th scope="col">${esc(h)}</th>`).join('')+'</tr></thead><tbody>'
  +rows.map(r=>'<tr>'+r.map(c=>`<td>${esc(c)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';

export function openJoinConfig(view:JoinConfigView,esc:Escape):void{
  const select=(id:string,label:string,options:string[],current:string,empty:string)=>
    `<div class="field"><label class="field-label" for="${id}">${esc(label)}</label><select id="${id}"${view.columns.length?'':' disabled'}>`
    +`<option value="">${esc(view.columns.length?empty:'Connect a table first')}</option>`
    +options.map(c=>`<option value="${esc(c)}"${c===current?' selected':''}>${esc(c)}</option>`).join('')+'</select></div>';
  openConfigDialog<JoinDraft>({
    id:'join-config',widget:'Join a table to the study area',step:view.step,draft:view.initial,wide:true,
    sections:d=>{
      const others=view.columns.filter(c=>c!==d.keyField);
      const settings=`<p class="description">Puts a value from <strong>${esc(view.tableName)}</strong> onto each part of `
        +`<strong>${esc(view.areaName)}</strong> its row names.</p>`
        +'<p><button type="button" class="button" id="join-show-me" data-show-me>Show me how it works</button></p>'
        +select('join-key','Column naming each part',view.columns,d.keyField,'Choose a column…')
        +(d.proposed!==undefined&&d.keyField?`<p class="notice" data-join-proposed>Proposed: "${esc(d.keyField)}" names ${n(d.proposed)} of `
          +`${n(view.parts?.length??0)} parts. Choose another if it is not the column naming them.</p>`
          +(d.proposedRows!==undefined&&d.proposedRows>d.proposed?`<p class="notice notice-warning" data-join-repeats>It names them in ${n(d.proposedRows)} rows, `
            +`about ${n(Math.round(d.proposedRows/d.proposed))} each, and a part carries one value: the table is finer than the study area. `
            +'Use a table with one row per part, or a study area at the table’s level.</p>':''):'')
        +`<div class="field"><label class="field-label" for="join-normalisation">Match names</label><select id="join-normalisation">`
        +`<option value="fuzzy"${d.normalisation==='fuzzy'?' selected':''}>Ignoring capitals, punctuation and spacing</option>`
        +`<option value="exact"${d.normalisation==='exact'?' selected':''}>Exactly as written, capitals aside</option></select></div>`
        +select('join-frames','Frames from (optional)',others,d.frameField,'No frames: one value per part')
        +select('join-category','Shade by a class (optional)',others.filter(c=>c!==d.frameField),d.categoryField,'No class: shade by the value');
      // BEFORE: the table as it reaches the step, and the parts of the area, by name.
      const t=view.table,parts=view.parts;
      const before='<fieldset class="join-before"><legend>Before</legend>'
        +(t?`<details open><summary>${esc(view.tableName)} · ${n(t.rows.length)} rows</summary>`
          +scroll([...t.keys,t.valueField||'value'],t.rows.slice(0,ROWS_SHOWN).map(r=>[...t.keys.map(k=>String(r.key[k]??'')),r.value===null||r.value===undefined?'':String(r.value)]),esc)
          +(t.rows.length>ROWS_SHOWN?`<p class="muted">The first ${n(ROWS_SHOWN)} of ${n(t.rows.length)} rows.</p>`:'')+'</details>'
          :'<p class="muted">The table is known once it is read or the workflow has run.</p>')
        +(parts?`<details open><summary>${esc(view.areaName)} · ${n(parts.length)} parts</summary>`
          +scroll(['name','id'],parts.map(p=>[p.name,p.id]),esc)+'</details>'
          :'<p class="muted">The parts of a polygon layer are known once the workflow has run.</p>')
        +'</fieldset>';
      if(!t||!parts||!d.keyField)return {settings,preview:before,
        ...(!d.keyField&&view.columns.length?{message:{tone:'warning' as const,text:'Choose the column naming each part.'},blocked:true}:{})};
      let joined:AreaJoinResult;
      try{joined=joinTableToAreas(parts,t,{keyField:d.keyField,normalisation:d.normalisation,
        ...(d.categoryField?{categoryField:d.categoryField}:{}),...(d.frameField?{frameField:d.frameField}:{})});}
      catch(error){return {settings,preview:before,message:{tone:'refusal',text:error instanceof Error?error.message:String(error)},blocked:true};}
      // AFTER: each part with what it receives, then what was left over, each named.
      const c=joined.counts;
      const valueOf=(p:AreaJoinResult['parts'][number])=>!p.matched?'empty'
        :p.frames?`${Object.keys(p.frames).length} frames, last ${p.value??'empty'}`:String(p.value??'empty');
      const rowsNamingNone=joined.diagnostics.filter(x=>x.code==='unmatched-data-key').map(x=>x.subject);
      const other=joined.diagnostics.filter(x=>!['unmatched-data-key','unmatched-boundary'].includes(x.code));
      const after='<fieldset class="join-after"><legend>After</legend>'
        +`<p data-join-counts><strong>${n(c.matchedParts)} of ${n(c.parts)} parts</strong> take a value; `
        +`${n(c.unmatchedParts)} ${c.unmatchedParts===1?'is':'are'} drawn empty; ${n(c.unmatchedRows)} of ${n(c.rows)} rows name no part.</p>`
        +scroll(['part',joined.declared.valueName??t.valueField??'value',...(d.categoryField?[d.categoryField]:[])],
          joined.parts.map(p=>[p.name,valueOf(p),...(d.categoryField?[p.category??'']:[])]),esc)
        +(rowsNamingNone.length?`<details><summary>Rows naming no part · ${n(rowsNamingNone.length)}</summary><p>${rowsNamingNone.map(esc).join(', ')}</p></details>`:'')
        +(other.length?`<details open><summary>Also found · ${n(other.length)}</summary><ul>${other.slice(0,20).map(x=>`<li>${esc(x.subject)}: ${esc(x.says)}</li>`).join('')}</ul></details>`:'')
        +'</fieldset>';
      return {settings,preview:before+after,
        ...(c.matchedParts===0?{message:{tone:'warning' as const,text:`No part is named in "${d.keyField}". Choose the column naming each part, or match names ignoring punctuation.`}}:{})};
    },
    wire:(root,d,redraw)=>{
      const show=root.querySelector<HTMLButtonElement>('#join-show-me');
      if(show)show.onclick=()=>openWalkthrough(joinTableWalkthrough(d.normalisation),esc,show);
      const on=(id:string,f:(v:string)=>void)=>root.querySelector<HTMLSelectElement>(id)?.addEventListener('change',e=>{f((e.target as HTMLSelectElement).value);redraw();});
      on('#join-key',v=>{d.keyField=v;delete d.proposed;delete d.proposedRows;if(d.frameField===v)d.frameField='';if(d.categoryField===v)d.categoryField='';});
      on('#join-normalisation',v=>{d.normalisation=v==='exact'?'exact':'fuzzy';});
      on('#join-frames',v=>{d.frameField=v;if(d.categoryField===v)d.categoryField='';});
      on('#join-category',v=>{d.categoryField=v;});
    },
    apply:draft=>view.apply(draft),
  },esc);
}

/** The draft the dialog opens on: the step's settings, with the column proposed where none is chosen. */
export function joinDraftOf(p:JoinParams,table:DataTable|undefined,parts:Part[]|undefined,columns:string[]):JoinDraft{
  const draft:JoinDraft={keyField:p.keyField,normalisation:p.normalisation??'fuzzy',frameField:p.frameField??'',categoryField:p.categoryField??''};
  if(!draft.keyField&&table&&parts){const proposed=proposeKeyColumn(table,parts,columns,draft.normalisation);
    if(proposed){draft.keyField=proposed.column;draft.proposed=proposed.named;draft.proposedRows=proposed.rows;}}
  return draft;
}
export function applyJoinDraft(p:JoinParams,d:JoinDraft):void{
  p.keyField=d.keyField;p.normalisation=d.normalisation;
  if(d.frameField)p.frameField=d.frameField;else delete p.frameField;
  // Deleted rather than set empty: a class exists only where one was asked for, which keeps a figure from becoming
  // categorical by accident.
  if(d.categoryField)p.categoryField=d.categoryField;else delete p.categoryField;
}

/** THE STANDARD INSPECTOR: what the step is called, what feeds it, one sentence of what it will do, Configure…, and what
 *  the last run joined. */
export const joinInspector:OwnInspector<'join_table_to_area'>={
  markup:(n0,kit)=>{const k=kit as JoinKit,p=n0.params,esc=kit.esc;
    const table=k.sourceName(n0.id,'records','the table'),area=k.sourceName(n0.id,'area','')||k.sourceName(n0.id,'polygons','the study area');
    const missing=!p.keyField&&k.keyColumns(n0.id).length
      ?'<div class="notice notice-warning" data-join-missing>Choose the column naming each part in Configure… before running.</div>':'';
    const joined=k.joined(n0.id),why=k.unfinished(n0.id);
    const line=joined
      ?`${n(joined.counts.matchedParts)} of ${n(joined.counts.parts)} parts took a value; ${n(joined.counts.unmatchedRows)} of ${n(joined.counts.rows)} rows named no part.`
      :why?`The last run could not compute this step: ${why}`:'Not run yet.';
    return kit.section('Name',kit.name('join-label',p.label||'Values on the study area'))
      +kit.section('Inputs',kit.inputs(n0,{records:'Table naming the parts',area:'Study area',polygons:'Or a polygon layer'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(joinSentence(p,table,area))}</p>${missing}`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why||(joined&&joined.counts.unmatchedParts)?' standard-result-warning':''}">${esc(line)}</p>`);},
  wire:(n0,kit,root)=>{const k=kit as JoinKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=kit.workflow().nodes.find(x=>x.id===n0.id);
      if(node?.type!=='join_table_to_area')return;
      const p=node.params,columns=k.keyColumns(n0.id),table=k.tableOn(n0.id,'records'),parts=k.parts(n0.id);
      openJoinConfig({step:p.label||k.title('join_table_to_area'),
        tableName:k.sourceName(n0.id,'records','the table'),
        areaName:k.sourceName(n0.id,'area','')||k.sourceName(n0.id,'polygons','the study area'),
        columns,...(table?{table}:{}),...(parts?{parts}:{}),initial:joinDraftOf(p,table,parts,columns),
        apply:draft=>k.keep(w=>{const t=w.nodes.find(x=>x.id===n0.id);if(t?.type==='join_table_to_area')applyJoinDraft(t.params,draft);}),
      },kit.esc);
    });
  },
};
