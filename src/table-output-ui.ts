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
import {zoneFields,wireZone,type ZoneAdvice} from './metric-steps-ui.js';
import {projectFromCRS84} from './reproject.js';
import {isProjectedReference,type PointCollection,type AnySpatialReference} from './types.js';
import {PREVIEW_ROWS} from './long-tables.js';

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
  /** The UTM zone the workflow's coordinates suggest, for coordinates shown in metres. */
  zoneAdvice:ZoneAdvice;
  /** The point records on one of the table's ports: held by Point data, or made by a run that still matches. */
  layerOn:(nodeId:string,port:string)=>PointCollection|undefined;
}

/** THE TABLE ITSELF, IN THE DIALOG (the practitioner, 2026-11-27: "Table output config dialog should have a preview of the
 *  table"): the rows the Results tab will show, with the coordinates as the dialog now sets them, before Apply. A table
 *  shows its rows as they stand; point records show their name, coordinates and attributes. Longer than 20 rows, it
 *  scrolls, as every dialog's table does. */
function tablePreview(kit:TableOutputKit,node:WorkflowNode<'table_output'>,mode:ReturnType<typeof shownMode>,
  coord:{metres:boolean;zone:string;hemisphere:'north'|'south'}):string{
  const esc=kit.esc;
  const table=(head:string[],rows:string[][],total:number)=>
    `<p class="muted">${total.toLocaleString('en')} ${total===1?'row':'rows'}${total>rows.length?`, the first ${rows.length.toLocaleString('en')} shown`:''}.</p>`
    +`<div class="table-scroll"><table><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>`
    +rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>';
  if(mode==='table'){
    const t=kit.tableOn(node.id,'table');
    if(!t?.rows.length)return '<p class="muted">Nothing to show yet: the table connected has no rows. Run the workflow if a step makes it.</p>';
    const head=[...t.keys,...(t.valueField?[t.valueField]:[])];
    return table(head,t.rows.slice(0,PREVIEW_ROWS).map(r=>[...t.keys.map(k=>String(r.key[k]??'')),
      ...(t.valueField?[r.value===null||r.value===undefined?'unknown':String(r.value)]:[])]),t.rows.length);
  }
  if(mode==='polygons')return '<p class="muted">Each polygon layer connected, one row per area, with its summaries.</p>';
  const layers=nodeInputs(node).filter(([,type])=>type==='points').map(([port])=>kit.layerOn(node.id,port)).filter((c):c is PointCollection=>!!c);
  if(!layers.length)return '<p class="muted">Nothing to show yet: connect point records, or run the workflow if a step makes them.</p>';
  const zone=Number(coord.zone);
  if(coord.metres&&(!Number.isInteger(zone)||zone<1||zone>60))return '<p class="muted">Choose a UTM zone from 1 to 60 to see the coordinates in metres.</p>';
  // A run's layer can arrive already in metres, read from a UTM file; a saved one is always longitude and latitude.
  const projected=(c:PointCollection)=>isProjectedReference((c as {spatialReference?:AnySpatialReference}).spatialReference);
  let shown:PointCollection[];
  try{shown=layers.map(c=>coord.metres&&!projected(c)&&c.features.length?projectFromCRS84(c,zone,coord.hemisphere).collection:c);}
  catch(e){return `<p class="muted">${esc(e instanceof Error?e.message:'These records cannot be shown in metres.')}</p>`;}
  const inMetres=(c:PointCollection)=>coord.metres||projected(c);
  const features=shown.flatMap(c=>c.features.map(f=>({f,metres:inMetres(c)})));
  const attributes=[...new Set(features.flatMap(({f})=>Object.keys(f.properties??{})))].filter(k=>k!=='name');
  const anyMetres=features.some(x=>x.metres),round=(v:number,metres:boolean)=>metres?v.toFixed(1):v.toFixed(6);
  const head=['Record',anyMetres?'Easting (m)':'Longitude',anyMetres?'Northing (m)':'Latitude',...attributes];
  const said=(v:unknown)=>v===null||v===undefined||v===''?'unknown':typeof v==='object'?JSON.stringify(v):String(v);
  const rows=features.slice(0,PREVIEW_ROWS).map(({f,metres})=>{const at=f.geometry?.coordinates as [number,number]|undefined;
    return [String((f.properties as {name?:unknown}|null)?.name??f.id??''),at?round(at[0],metres):'missing',at?round(at[1],metres):'missing',
      ...attributes.map(k=>said(f.properties?.[k]))];});
  return table(head,rows,features.length);
}

/** WHAT A TABLE OUTPUT SHOWS, in one sentence, from what is wired. */
export function tableOutputSentence(kit:TableOutputKit,n:WorkflowNode<'table_output'>,mode:ReturnType<typeof shownMode>):string{
  const workflow=kit.workflow();const from=(port:string)=>{const e=workflow.edges.find(x=>x.to===n.id&&x.port===port);const up=e&&workflow.nodes.find(m=>m.id===e.from);
    return up?(up.params.label||kit.title(up.type)):'';};
  if(mode==='table')return `Shows the rows of ${from('table')||'the table connected'} as they stand${n.params.totalsAsserted?', with totals you asserted':''}.`;
  if(mode==='polygons')return 'Shows the polygon layers connected and their summaries.';
  const c=n.params.coordinates;
  return workflow.edges.some(e=>e.to===n.id)?`Shows the point records connected, with ${c?`their coordinates in metres, as easting and northing in UTM zone ${c.zone}${c.hemisphere==='north'?'N':'S'},`:'their longitude and latitude'} and every attribute.`
    :'Nothing is connected yet, so this table has nothing to show.';
}

/** TABLE'S CONFIGURATION DIALOG (experiment 186): how a reasoning result is shown, and the totals claim. Both on a draft,
 *  written by Apply. Turning a reasoning table into a map or a chart changes the step itself. */
function openTableConfig(kit:TableOutputKit,nodeId:string){
  const esc=kit.esc,workflow=kit.workflow(),node=workflow.nodes.find(x=>x.id===nodeId) as WorkflowNode<'table_output'>|undefined;if(!node)return;
  type Draft=WorkflowNode<'table_output'>['params']&{view?:'map'|'table'|'bars';coord:{metres:boolean;zone:string;hemisphere:'north'|'south'}};
  const mode=shownMode(node,workflow.edges);
  const points=mode!=='table'&&mode!=='polygons';
  const held=node.params.coordinates,suggested=kit.zoneAdvice(30,'north');
  openConfigDialog<Draft>({
    id:'table-config',widget:'Table',step:node.params.label||kit.title('table_output'),draft:{...structuredClone(node.params),coord:{metres:!!held,zone:String(held?.zone??suggested?.zone??30),hemisphere:held?.hemisphere??suggested?.hemisphere??'north'}},
    sections:draft=>{
      let settings='';
      // THE MARGINS AN EPIDEMIOLOGIST READS FIRST, and the claim that earns them (2026-10-26). Offered only for a table,
      // and only where the table does not already state its unit.
      if(mode==='table'&&!kit.unitFor(node))settings+=`<label class="check"><input type="checkbox" id="output-totals" ${draft.totalsAsserted?'checked':''}> Show totals: these values count the same thing</label>`
        +'<p class="description">Tick it only where every cell counts the same thing.</p>';
      // COORDINATES IN METRES, where a partner or a lesson wants easting and northing: what Reproject points did as a step
      // until it retired into this choice (0.169.0).
      if(points)settings+=`<div class="field"><label class="field-label" for="output-coordinates">Coordinates</label>`
        +`<select id="output-coordinates"><option value="degrees"${draft.coord.metres?'':' selected'}>Longitude and latitude, as recorded</option>`
        +`<option value="metres"${draft.coord.metres?' selected':''}>In metres: easting and northing in a UTM zone</option></select></div>`
        +(draft.coord.metres?zoneFields(kit,draft.coord,'output'):'');
      if(!settings)settings='<p class="muted">Nothing to set: what you connect decides how it is shown.</p>';
      return {settings,preview:tablePreview(kit,node,mode,draft.coord)};
    },
    wire:(root,draft,redraw)=>{
      root.querySelector<HTMLSelectElement>('#output-coordinates')?.addEventListener('change',e=>{draft.coord.metres=(e.target as HTMLSelectElement).value==='metres';redraw();});
      if(draft.coord.metres)wireZone(root,draft.coord,redraw,'output');
      root.querySelector<HTMLInputElement>('#output-totals')?.addEventListener('change',e=>{
        if((e.target as HTMLInputElement).checked)draft.totalsAsserted=true;else delete draft.totalsAsserted;redraw();});
    },
    apply:draft=>{
      const {view,coord,...params}=draft;
      if(coord.metres)params.coordinates={zone:Number(coord.zone),hemisphere:coord.hemisphere};else delete params.coordinates;
      if(view&&view!=='table'){kit.change(w=>{const index=w.nodes.findIndex(x=>x.id===nodeId);
        w.nodes[index]={...w.nodes[index]!,type:'output',params:{label:params.label,view}} as never;});return;}
      // Coordinates in metres are computed, so a change to them asks for a run; the rest is presentation.
      const edit=(w:Workflow)=>{const t=w.nodes.find(x=>x.id===nodeId) as WorkflowNode<'table_output'>|undefined;if(t)t.params=params;};
      if(JSON.stringify(params.coordinates)!==JSON.stringify(node.params.coordinates))kit.change(edit);else kit.presentation(edit);
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
    const portName=(port:string)=>({area:'Study area',decisions:'Reasoning result',table:'Tabular data',raster:'Or: Raster',network:'Street network',polygons:'Polygons'} as Record<string,string>)[port]
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
