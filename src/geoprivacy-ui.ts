/** THE TWO GEOPRIVACY STEPS ON THE STANDARD (experiment 186), 2026-11-22: Move points in a donut and Aggregate points to H3
 *  cells, moved out of app.ts by the rule for any widget touched. Name, Inputs, Settings in one sentence with Configure…,
 *  Result. Both are teaching transformations: each sentence says it is no anonymity guarantee. */
import type {WorkflowNode} from './types.js';
import type {InspectorKit,OwnInspector} from './inspector-kit.js';
import type {AreaStepKit} from './area-steps-ui.js';
import {openConfigDialog} from './config-dialog.js';
import {validatePrivacyNode} from './geoprivacy.js';
import {errorMessage} from './guards.js';

const sentence=(kit:InspectorKit,text:string)=>`<p class="standard-sentence">${kit.esc(text)}</p>`;
const configure='<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>';
const notRun='<p class="notice">Not run yet, or changed since the last run.</p>';
const row=(kit:InspectorKit,label:string,value:string)=>`<div class="detail-row"><span>${kit.esc(label)}</span><strong>${kit.esc(value)}</strong></div>`;
const nodeIn=<T extends WorkflowNode['type']>(kit:InspectorKit,n:WorkflowNode<T>)=>kit.workflow().nodes.find(x=>x.id===n.id) as WorkflowNode<T>|undefined;
const kept=(kit:InspectorKit,n:WorkflowNode)=>(kit as AreaStepKit).summary(n.id)?.features;
const NOTEBOOKS='<p class="muted">Calibrating a mask to a stated risk is not done here. The <a href="https://git.cdc.gov/jupyterlite/2026-Map-Encryption-Library" target="_blank" rel="noopener noreferrer">geoprivacy notebooks</a> go further.</p>';
function refusal(check:()=>void):{blocked?:boolean;message?:{tone:'refusal';text:string}}{
  try{check();return {};}catch(error){return {blocked:true,message:{tone:'refusal',text:errorMessage(error)}};}
}
const field=(kit:InspectorKit,id:string,label:string,value:string,min:number,max:number,hint='')=>
  `<div class="field"><label class="field-label" for="${id}">${label}</label><input id="${id}" type="number" min="${min}" max="${max}" step="1" value="${kit.esc(value)}">${hint?`<small>${hint}</small>`:''}</div>`;

interface DonutDraft {innerM:string;outerM:string;seed:string}
export const donutInspector:OwnInspector<'donut_geomask'>={
  markup:(n,kit)=>{const p=n.params,out=kept(kit,n);
    return kit.section('Name',kit.name('donut-label',p.label||'Move points in a donut'))
      +kit.section('Inputs',kit.inputs(n,{points:'The points to move'}))
      +kit.section('Settings',sentence(kit,`Moves each point in a random direction, between ${p.innerM.toLocaleString('en')} and ${p.outerM.toLocaleString('en')} m from where it was, `
        +'and gives it a new name and id; nothing else of the record is carried. A teaching transformation, not a privacy guarantee.')+configure)
      +kit.section('Result',out!==undefined?row(kit,'Points moved',Number(out).toLocaleString('en')):notRun);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;const p=node.params;
      const params=(d:DonutDraft)=>({...p,innerM:Number(d.innerM),outerM:Number(d.outerM),seed:Number(d.seed)});
      openConfigDialog<DonutDraft>({id:'donut-dialog',widget:'Move points in a donut',step:p.label||'',
        draft:{innerM:String(p.innerM),outerM:String(p.outerM),seed:String(p.seed)},
        sections:d=>({settings:field(kit,'donut-inner','Least distance moved (metres)',d.innerM,0,5000)
          +field(kit,'donut-outer','Most distance moved (metres)',d.outerM,1,5000)
          +field(kit,'donut-seed','Seed',d.seed,0,4294967295,'The same seed moves the same points the same way, so a run can be repeated. Predictable, so not for real protection.')
          +NOTEBOOKS,
          ...refusal(()=>validatePrivacyNode({...node,params:params(d)}))}),
        wire:(r,d,redraw)=>{
          for(const [id,key] of [['donut-inner','innerM'],['donut-outer','outerM'],['donut-seed','seed']] as const)
            r.querySelector<HTMLInputElement>(`#${id}`)!.onchange=e=>{d[key]=(e.target as HTMLInputElement).value;redraw();};},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='donut_geomask')Object.assign(t.params,params(d));}),
      },kit.esc);
    });
  },
};

interface HexDraft {resolution:string;minOccupancy:string}
export const h3Inspector:OwnInspector<'aggregate_points_to_h3_cell'>={
  markup:(n,kit)=>{const p=n.params,out=kept(kit,n);
    return kit.section('Name',kit.name('h3-label',p.label||'Aggregate points to H3 cells'))
      +kit.section('Inputs',kit.inputs(n,{points:'The points to count'}))
      +kit.section('Settings',sentence(kit,`Counts the points in each H3 cell at resolution ${p.resolution}, and leaves out any cell holding fewer than ${p.minOccupancy}. `
        +'It counts locations, not what they carry. A teaching transformation, not a privacy guarantee.')+configure)
      +kit.section('Result',out!==undefined?row(kit,'Cells kept',Number(out).toLocaleString('en')):notRun);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;const p=node.params;
      const params=(d:HexDraft)=>({...p,resolution:Number(d.resolution),minOccupancy:Number(d.minOccupancy)});
      openConfigDialog<HexDraft>({id:'h3-dialog',widget:'Aggregate points to H3 cells',step:p.label||'',
        draft:{resolution:String(p.resolution),minOccupancy:String(p.minOccupancy)},
        sections:d=>({settings:field(kit,'h3-resolution','H3 resolution (0 coarsest, 15 finest)',d.resolution,0,15,'Resolution 9 cells are about 0.1 km², resolution 7 about 5 km².')
          +field(kit,'h3-min','Fewest points a cell must hold to be shown',d.minOccupancy,2,100,'A cell with fewer is left out. Holding many points does not by itself make a cell safe to share.')
          +NOTEBOOKS,
          ...refusal(()=>validatePrivacyNode({...node,params:params(d)}))}),
        wire:(r,d,redraw)=>{
          for(const [id,key] of [['h3-resolution','resolution'],['h3-min','minOccupancy']] as const)
            r.querySelector<HTMLInputElement>(`#${id}`)!.onchange=e=>{d[key]=(e.target as HTMLInputElement).value;redraw();};},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='aggregate_points_to_h3_cell')Object.assign(t.params,params(d));}),
      },kit.esc);
    });
  },
};

export const GEOPRIVACY_INSPECTORS={donut_geomask:donutInspector,aggregate_points_to_h3_cell:h3Inspector} as const;
