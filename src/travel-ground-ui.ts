/** TRAVEL TIME OVER GROUND: its Inspector and its Configure… dialog (experiments 186, 231). The standard sections --
 *  the name, the inputs, one sentence and Configure…, and what the last run found -- and a preview that says what the
 *  step would answer with what is connected now, before any surface is read. */
import type {Workflow,WorkflowNode} from './types.js';
import type {RasterAsset} from './raster.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {MAX_FRICTION_CELLS} from './friction-travel.js';

/** WHAT THE STEP SAYS IT WILL DO, in one sentence, from its settings alone. */
export function travelSentence(n:WorkflowNode<'travel_over_ground'>):string{
  const attribute=n.params.attribute?.trim()||'minutes';
  const ceiling=n.params.maxMinutes;
  return `Writes ${attribute} onto each place: the time to the nearest starting point, accumulated cell by cell across the friction surface`
    +(ceiling&&ceiling>0?`, stopping at ${ceiling} minutes.`:', with no ceiling.')
    +' A place the walk does not reach keeps its row, with nothing in that column and the reason beside it.';
}

/** THE FRICTION SURFACE ARRIVING AT THE STEP, found by following raster ports up the canvas, as the sampler does. */
function frictionArriving(workflow:Workflow,nodeId:string):RasterAsset|undefined{
  const seen=new Set<string>();let at=nodeId;
  for(;;){
    const edge=workflow.edges.find(e=>e.to===at&&(e.port==='friction'||e.port==='raster'));
    if(!edge||seen.has(edge.from))return undefined;
    seen.add(edge.from);
    const from=workflow.nodes.find(n=>n.id===edge.from);
    const asset=(from?.params as {asset?:RasterAsset}|undefined)?.asset;
    if(asset)return asset;
    at=edge.from;
  }
}

/** WHAT IS CONNECTED, AND WHAT THAT WOULD COST, said before a run (the pattern the sampler settled on 2026-11-13:
 *  a step whose inputs are not yet in place should say so rather than leave the practitioner to find out by running).
 *
 *  The cell count is the one number worth saying in advance, because it is the only way this step refuses. */
function travelArrivals(kit:StepKit,nodeId:string):{html:string;missing:string[]} {
  const workflow=kit.workflow(),esc=kit.esc;
  const into=(port:string)=>workflow.edges.filter(e=>e.to===nodeId&&e.port===port)
    .map(e=>workflow.nodes.find(n=>n.id===e.from)).filter((n):n is WorkflowNode=>!!n);
  const named=(n:WorkflowNode)=>n.params.label||kit.title(n.type);
  const asset=frictionArriving(workflow,nodeId);
  const origins=into('origins'),places=into('places');
  const missing=[...(asset?[]:['a friction surface']),...(origins.length?[]:['somewhere to start from']),...(places.length?[]:['places to answer for'])];
  let surface='<strong>No friction surface is connected yet.</strong> Connect a Raster input, or a Clip raster, to Friction surface.';
  if(asset){
    const m=asset.source.metadata,cells=asset.metadata.width*asset.metadata.height;
    const metres=Math.round(Math.abs(m.resolution[0])*111_320);
    const over=cells>MAX_FRICTION_CELLS;
    surface=`<strong>${esc(asset.provenance?.title?.trim()||asset.source.filename)}</strong>: `
      +`${asset.metadata.width.toLocaleString('en')} by ${asset.metadata.height.toLocaleString('en')} cells kept `
      +`(${cells.toLocaleString('en')} in all), each about ${metres.toLocaleString('en')} m across at the equator. `
      +(over
        ?`<strong>That is more than one pass crosses (${MAX_FRICTION_CELLS.toLocaleString('en')}).</strong> Clip it to the area you are asking about, or read a coarser surface.`
        :'A cell is the finest distinction the answer can make: two places in one cell get the same time.')
      +(m.noData!==null?` No data is written as ${esc(String(m.noData))}, and the walk cannot cross those cells.`:'');
  }
  return {missing,html:'<div class="standard-arrivals" data-travel-arrivals>'
    +`<p>${surface}</p>`
    +`<p>${origins.length?`Starting from: ${esc(origins.map(named).join('; '))}.`:'<strong>Nothing to start from yet.</strong>'}`
    +` ${places.length?`Answering for: ${esc(places.map(named).join('; '))}.`:'<strong>No places to answer for yet.</strong>'}</p>`
    +'</div>'};
}

/** THE CONFIGURATION DIALOG (experiment 186): the column the minutes go into, and the ceiling. Only Apply writes.
 *  There is no speed here on purpose -- the surface states what the ground costs, which is the reason for using one. */
function openTravelConfig(kit:StepKit,nodeId:string){
  const workflow=kit.workflow(),esc=kit.esc,node=workflow.nodes.find(x=>x.id===nodeId);
  if(node?.type!=='travel_over_ground')return;
  type Draft=WorkflowNode<'travel_over_ground'>['params'];
  openConfigDialog<Draft>({
    id:'travel-ground-config',widget:'Travel time over ground',step:node.params.label||kit.title('travel_over_ground'),
    draft:structuredClone(node.params),
    sections:draft=>{
      const {html,missing}=travelArrivals(kit,nodeId);
      return {
        ...(missing.length?{message:{tone:'warning' as const,
          text:`This step still needs ${missing.join(', ')}. A run cannot answer anything until ${missing.length===1?'it is':'they are'} connected.`}}:{}),
        settings:html
          +`<div class="field"><label class="field-label" for="travel-attribute">Column the travel time is written into</label>`
          +`<input id="travel-attribute" maxlength="60" value="${esc(draft.attribute)}">`
          +'<small>Minutes to the nearest starting point. Name it as the table you will read it in does.</small></div>'
          +`<div class="field"><label class="field-label" for="travel-ceiling">Stop the walk at (minutes)</label>`
          +`<input id="travel-ceiling" type="number" min="1" step="1" value="${draft.maxMinutes??''}" placeholder="no ceiling">`
          +'<small>Leave it empty to walk as far as the surface allows. A place past the ceiling is unreached <em>here</em>, which is not the same as unreachable.</small></div>',
        preview:`<p class="muted">${esc(travelSentence({...node,params:draft}))}</p>`
          +'<p class="muted">The minutes are a model of crossing ground, not a route: nobody walks the line the grid implies, '
          +'and a surface that is wrong about the ground makes every number wrong with it.</p>',
      };
    },
    wire:(root,draft,redraw)=>{
      root.querySelector<HTMLInputElement>('#travel-attribute')?.addEventListener('change',e=>{
        draft.attribute=(e.target as HTMLInputElement).value.trim();redraw();});
      root.querySelector<HTMLInputElement>('#travel-ceiling')?.addEventListener('change',e=>{
        const raw=(e.target as HTMLInputElement).value.trim();
        const value=Number(raw);
        if(!raw||!Number.isFinite(value)||value<=0)delete draft.maxMinutes;else draft.maxMinutes=value;
        redraw();});
    },
    apply:draft=>kit.change(w=>{
      const params=(w.nodes.find(y=>y.id===nodeId) as WorkflowNode<'travel_over_ground'>).params;
      params.attribute=draft.attribute?.trim()||'minutes';
      if(draft.maxMinutes&&draft.maxMinutes>0)params.maxMinutes=draft.maxMinutes;else delete params.maxMinutes;
    }),
  },esc);
}

export const travelInspector:OwnInspector<'travel_over_ground'>={
  markup:(n,kit)=>{
    const k=kit as StepKit,esc=kit.esc,why=k.unfinished(n.id),method=k.method(n.id);
    const {missing}=travelArrivals(k,n.id);
    return kit.section('Name',kit.name('travel-label',n.params.label||k.title('travel_over_ground')))
      +kit.section('Inputs',kit.inputs(n,{friction:'Friction surface',origins:'Start from',places:'Places'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(travelSentence(n))}</p>`
        +(missing.length?`<p class="notice">Still needs ${esc(missing.join(', '))}.</p>`:'')
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why
        ?`The last run could not compute this step: ${why}`
        :method??'Run the workflow to answer at each place. The places the walk does not reach stay in the result, with the reason beside them.')}</p>`);
  },
  wire:(n,kit,root)=>{
    root.querySelector<HTMLButtonElement>('#configure-step')?.addEventListener('click',()=>openTravelConfig(kit as StepKit,n.id));
  },
};
