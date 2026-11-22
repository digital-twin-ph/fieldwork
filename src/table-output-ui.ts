/** TABLE OUTPUT, OUT OF APP.TS (2026-11-22, the Inspector move's batch D): its standard Inspector -- the Results tab's name and
 *  where its figure goes in the write-up, what is connected and one picker to connect more, one sentence and Configure…,
 *  and what the last run showed -- its sentence and its dialog. Moved as they were; the controls it shares with Map (the
 *  name, the write-up section, the port pickers) are still wired where Map's are. Its older "Input mode" branch, from
 *  before what is wired decided the mode, is retired: the standard Inspector shows a polygon table as it shows any. */
import type {WorkflowNode,Workflow} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {nodeInputs,portAccepts,outputOf,shownMode} from './core.js';
import {MAX_POINT_LAYERS} from './point-layers.js';

export interface TableOutputKit extends StepKit {
  /** The unit the table's rows state, where they state one, so the totals claim is not offered over it. */
  unitFor:(n:WorkflowNode)=>string|undefined;
  /** The control saying where the figure goes in the write-up, shared by Map, Table and Chart. */
  writeUpSelect:(n:WorkflowNode<'table_output'>)=>string;
  /** A change of presentation only: the run stays current. */
  presentation:(edit:(w:Workflow)=>void)=>void;
  /** Redraw the figures in Results. */
  renderResults:()=>void;
  /** Whether the last run showed this table. */
  shown:(nodeId:string)=>boolean;
}

/** WHAT A TABLE OUTPUT SHOWS, in one sentence, from what is wired. */
export function tableOutputSentence(kit:TableOutputKit,n:WorkflowNode<'table_output'>,mode:ReturnType<typeof shownMode>):string{
  const workflow=kit.workflow();const from=(port:string)=>{const e=workflow.edges.find(x=>x.to===n.id&&x.port===port);const up=e&&workflow.nodes.find(m=>m.id===e.from);
    return up?(up.params.label||kit.title(up.type)):'';};
  if(mode==='table')return `Shows the rows of ${from('table')||'the table connected'} as they stand${n.params.totalsAsserted?', with totals you asserted':''}.`;
  if(mode==='polygons')return 'Shows the polygon layers connected and their summaries.';
  return workflow.edges.some(e=>e.to===n.id)?'Shows the point records connected, with their coordinates and every attribute.'
    :'Nothing is connected yet, so this table has nothing to show.';
}

/** TABLE'S CONFIGURATION DIALOG (experiment 186): how a reasoning result is shown, and the totals claim. Both on a draft,
 *  written by Apply. Turning a reasoning table into a map or a chart changes the step itself. */
function openTableConfig(kit:TableOutputKit,nodeId:string){
  const esc=kit.esc,workflow=kit.workflow(),node=workflow.nodes.find(x=>x.id===nodeId) as WorkflowNode<'table_output'>|undefined;if(!node)return;
  type Draft=WorkflowNode<'table_output'>['params']&{view?:'map'|'table'|'bars'};
  const mode=shownMode(node,workflow.edges);
  openConfigDialog<Draft>({
    id:'table-config',widget:'Table',step:node.params.label||kit.title('table_output'),draft:structuredClone(node.params),
    sections:draft=>{
      let settings='';
      // THE MARGINS AN EPIDEMIOLOGIST READS FIRST, and the claim that earns them (2026-10-26). Offered only for a table,
      // and only where the table does not already state its unit.
      if(mode==='table'&&!kit.unitFor(node))settings+=`<label class="check"><input type="checkbox" id="output-totals" ${draft.totalsAsserted?'checked':''}> Show totals: these values count the same thing</label>`
        +'<p class="description">Tick it only where every cell counts the same thing.</p>';
      if(!settings)settings='<p class="muted">Nothing to set: what you connect decides how it is shown.</p>';
      const shows={table:'Rows are shown as imported, an absent value as unknown.',
        other:'Every point with its coordinates and attributes, missing ones included.'};
      return {settings,preview:`<p class="muted">${mode==='table'?shows.table:shows.other}</p>`};
    },
    wire:(root,draft,redraw)=>{
      root.querySelector<HTMLSelectElement>('#output-view')?.addEventListener('change',e=>{draft.view=(e.target as HTMLSelectElement).value as Draft['view'];redraw();});
      root.querySelector<HTMLInputElement>('#output-totals')?.addEventListener('change',e=>{
        if((e.target as HTMLInputElement).checked)draft.totalsAsserted=true;else delete draft.totalsAsserted;redraw();});
    },
    apply:draft=>{
      const {view,...params}=draft;
      if(view&&view!=='table'){kit.change(w=>{const index=w.nodes.findIndex(x=>x.id===nodeId);
        w.nodes[index]={...w.nodes[index]!,type:'output',params:{label:params.label,view}} as never;});return;}
      kit.presentation(w=>{const t=w.nodes.find(x=>x.id===nodeId) as WorkflowNode<'table_output'>|undefined;if(t)t.params=params;});
      kit.renderResults();
    },
  },esc);
}

export const tableOutputInspector:OwnInspector<'table_output'>={
  markup:(n,k)=>{const kit=k as TableOutputKit;
    const esc=kit.esc,workflow=kit.workflow();let content='';
    const mode=shownMode(n,workflow.edges);
    content+=kit.section('Name',`<div class="field"><label class="field-label" for="table-label">Results tab name</label><input id="table-label" maxlength="60" value="${esc(n.params.label)}"></div>`
      +kit.writeUpSelect(n));
    const portName=(port:string)=>({area:'Study area',coverage:'Or: spatial coverage check',decisions:'Reasoning result',table:'Tabular data',raster:'Or: Raster',network:'Street network',polygons:'Polygons'} as Record<string,string>)[port]
      ||'Point data '+(port==='points'?1:port.split('_')[1]);
    // WHAT IS CONNECTED, and one picker to connect more (2026-11-09, the practitioner: *"streamline its input ports like
    // map output"*). A select for each of five ports, most never used, was the Inspector's half of the clutter.
    let inputs=`<p class="description">What you connect decides how it is shown.</p>`
      +nodeInputs(n).map(([port,type])=>{const edge=workflow.edges.find(e=>e.to===n.id&&e.port===port);
        if(!edge)return '';
        return `<div class="field"><label class="field-label" for="table-${port}">${esc(portName(port))}</label><select id="table-${port}" data-map-port="${port}"><option value="">Not connected</option>`
          +workflow.nodes.filter(x=>x.id!==n.id&&portAccepts(type,outputOf(x))).map(x=>`<option value="${esc(x.id)}" ${edge?.from===x.id?'selected':''}>${esc(x.params.label||kit.title(x.type))}</option>`).join('')+'</select></div>';}).join('');
    {
      const showable=new Set(nodeInputs(n).map(([,type])=>type));
      const candidates=workflow.nodes.filter(x=>x.id!==n.id&&(showable.has(outputOf(x) as never)||portAccepts('table',outputOf(x)))
        &&!workflow.edges.some(e=>e.to===n.id&&e.from===x.id));
      if(candidates.length)inputs+=`<div class="field"><label class="field-label" for="table-add-input">Add an input</label>`
        +`<select id="table-add-input"><option value="">Choose a result to show…</option>`
        +candidates.map(x=>`<option value="${esc(x.id)}">${esc(x.params.label||kit.title(x.type))}</option>`).join('')
        +`</select></div>`;
    }
    if(!n.params.inputMode||n.params.inputMode==='spatial')
      inputs+=`<div class="inspector-actions"><button id="add-point-input" class="button small" ${(n.params.pointInputCount??1)>=MAX_POINT_LAYERS?'disabled':''}>＋ Add point input</button><button id="remove-point-input" class="button small" ${(n.params.pointInputCount??1)<=1?'disabled':''}>Remove last input</button></div>`;
    content+=kit.section('Inputs',inputs);
    content+=kit.section('Settings',`<p class="standard-sentence">${esc(tableOutputSentence(kit,n,mode))}</p>`
      +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button></div>');
    const shown=kit.shown(n.id);
    const why=kit.unfinished(n.id);
    content+=kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`
      :shown?`Shown in Results, under "${n.params.label||'Table'}".`:'Not run yet.')}</p>`);
    return content;
  },
  wire:(n,k,root)=>{const kit=k as TableOutputKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>openTableConfig(kit,n.id));
  },
};
