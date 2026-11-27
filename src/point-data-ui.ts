/** POINT DATA, ON THE STANDARD (experiments 186, 200), out of app.ts (2026-11-26): its sentence, its Inspector, and the
 *  dialog where a table's longitude and latitude columns are named. Points held on the step open the Input data editor
 *  instead, which the application draws; the records panel and its buttons are the application's too, shared by their
 *  data attributes. What it reads of the application comes through PointKit. */
import type {Workflow,WorkflowNode} from './types.js';
import {escapeHtml as esc} from './html-escape.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {TYPES,portSourceName} from './core.js';
import {columnFor} from './input-data.js';
import {isDescribed} from './column-metadata.js';

export interface PointKit extends StepKit {
  /** The columns of the table on the records port: as last run, then as declared upstream. */ tableColumns:(nodeId:string)=>string[];
  /** The records panel, with its Table, JSON, Quick look and Data quality controls. */
  records:(nodeId:string,data:WorkflowNode<'point_input'>['params']['data'])=>string;
  /** The Input data editor, for points held on the step. */ openEditor:(nodeId:string)=>void;
}

function getNode(w:Workflow,id:string):WorkflowNode<'point_input'>{
  const node=w.nodes.find(n=>n.id===id);
  if(!node||node.type!=='point_input')throw new Error(`Expected a point_input step called ${id}.`);
  return node as WorkflowNode<'point_input'>;
}
const fromTable=(w:Workflow,id:string)=>w.edges.some(e=>e.to===id&&e.port==='records');

/** WHAT POINT DATA HOLDS, in one sentence. */
export function pointSentence(w:Workflow,n:WorkflowNode<'point_input'>):string{
  if(fromTable(w,n.id)){const m=n.params.fromTable;
    return m?.x&&m?.y?`One point per row of ${portSourceName(w,n.id,'records','the table')}, at ${m.x} (longitude) and ${m.y} (latitude), in WGS 84 degrees.`
      :`Reads points from ${portSourceName(w,n.id,'records','the table')}. Name its longitude and latitude columns in Configure…`;}
  const count=n.params.data.features.length;
  return count?`${count} points, ${n.params.sourceInfo?.format||'entered here'}.`
    :'No points yet. Generate, import or place them in Configure…';
}

/** What Point data's columns mean, counted, and the buttons to describe them and view the dictionary (experiment 211). */
function pointMeaning(p:WorkflowNode<'point_input'>['params']):string{
  const columns=[...new Set((p.data.features??[]).flatMap(f=>Object.keys(f.properties??{})))];
  if(!columns.length)return '';
  const described=columns.filter(c=>isDescribed(p.columns?.[c])).length,proposed=columns.filter(c=>p.columns?.[c]&&!p.columns[c]!.confirmed).length;
  return `<p class="standard-state" data-table-meaning>What the columns mean: ${described} of ${columns.length} described`
    +(proposed?`, ${proposed} proposed and not yet accepted`:'')+'.</p>'
    +(p.dictionary?`<p class="standard-state" data-table-dictionary>Data dictionary: ${esc(p.dictionary.name)}, ${p.dictionary.sheets[0]?.rows.length??0} variables.</p>`:'')
    +'<div class="inspector-actions"><button id="describe-columns" class="button">Describe columns…</button>'
    +(p.dictionary?'<button id="view-dictionary" class="button">View the data dictionary</button>':'')+'</div>';
}

/** POINTS FROM A TABLE, CONFIGURED (experiments 178, 186, 200): x (longitude) and y (latitude), named and never guessed,
 *  as geopandas' points_from_xy reads them; an id and a label, optional. The columns are the table's as last run, or as
 *  declared upstream. */
function openPointsFromTableConfig(kit:PointKit,nodeId:string){
  const node=getNode(kit.workflow(),nodeId);
  const columns=kit.tableColumns(nodeId);
  type Draft={x:string;y:string;id?:string;name?:string};
  // PROPOSED BY NAME, AS THE CSV IMPORT PROPOSES (2026-11-23): shown in the selects, where it can be seen and changed.
  // The mapping a run reads is still the one stored here, so `tablePoints` names its columns and never guesses.
  const proposed:Draft={x:columnFor('longitude',columns)??'',y:columnFor('latitude',columns)??'',
    ...(columnFor('id',columns)?{id:columnFor('id',columns)}:{}),...(columnFor('name',columns)?{name:columnFor('name',columns)}:{})};
  openConfigDialog<Draft>({
    id:'points-config',widget:'Point data',step:node.params.label||TYPES.point_input.title,
    draft:{...proposed,...(node.params.fromTable??{})},
    sections:draft=>{
      const pick=(id:string,key:keyof Draft,label:string,optional:boolean)=>
        `<div class="field"><label class="field-label" for="${id}">${label}</label>`
        +`<select id="${id}" data-from-table="${key}"><option value="">${optional?'Generate automatically':'Choose a column…'}</option>`
        +columns.map(c=>`<option value="${esc(c)}" ${draft[key]===c?'selected':''}>${esc(c)}</option>`).join('')+`</select></div>`;
      const settings=(columns.length?'':'<p class="notice">Run the workflow once to list the table’s columns.</p>')
        +pick('from-table-x','x','x (longitude)',false)+pick('from-table-y','y','y (latitude)',false)
        +pick('from-table-id','id','Record ID',true)+pick('from-table-name','name','Label',true);
      return {settings,preview:'<p class="muted">One point per row, in WGS 84 degrees, every column with it. A row without a usable '
        +'position is kept and counted, never dropped.</p>'};
    },
    wire:(root,draft,redraw)=>{
      root.querySelectorAll<HTMLSelectElement>('[data-from-table]').forEach(el=>el.addEventListener('change',()=>{
        const key=el.dataset.fromTable as keyof Draft;
        if(el.value)draft[key]=el.value;else if(key==='id'||key==='name')delete draft[key];else draft[key]='';
        redraw();}));
    },
    apply:draft=>{kit.change(w=>{getNode(w,nodeId).params.fromTable={...draft};});},
  },esc);
}

/** POINT DATA'S INSPECTOR: name, inputs, one sentence and Configure…, and the records it holds. The ids of the controls
 *  are kept, so a manual that named them still finds them. */
export const pointInspector:OwnInspector<'point_input'>={
  markup:(n,kitIn)=>{
    const kit=kitIn as PointKit,table=fromTable(kit.workflow(),n.id);
    return (n.sourceMigration?`<p class="notice">${n.sourceMigration.fromType==='output'
        ?`Replaced the retired <strong>Visual output</strong> widget; name and connections retained.`
        :`Now uses the shared Input data editor; label, records and connections retained.`}</p>`:'')
      +kit.section('Name',kit.name('source-label',n.params.label||'Point data'))
      +kit.section('Inputs',kit.inputs(n,{records:'A table with longitude and latitude columns, optional',area:'The area to generate points in, optional'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(pointSentence(kit.workflow(),n))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',table
        ?'<p class="standard-result">Run the workflow to place the table’s rows. A row with no usable position is kept and counted, never dropped.</p>'
        :`<p class="standard-result">${n.params.data.features.length} point records · ${n.params.data.features.filter(f=>!f.geometry).length} without a location</p>`
          +pointMeaning(n.params)+kit.records(n.id,n.params.data));
  },
  wire:(n,kitIn,root)=>{
    const kit=kitIn as PointKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>
      fromTable(kit.workflow(),n.id)?openPointsFromTableConfig(kit,n.id):kit.openEditor(n.id));
  },
};
