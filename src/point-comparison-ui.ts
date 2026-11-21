/** COMPARE POINT SETS ON THE STANDARD (experiment 186; 2026-11-20, when Comparison map retired into Map). Its name, its
 *  inputs, one sentence of what it compares, the UTM zone in Configure…, and what the last run found. The points go to a
 *  Map and the distances it hands on to a Table; the comparison draws nothing of its own. */
import type {WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import type {DataTable} from './data-table.js';
import {openConfigDialog} from './config-dialog.js';

type CompareParams=WorkflowNode<'compare_point_sets'>['params'];
export interface CompareKit extends StepKit {
  /** The table of distances the last run made. */
  made:(nodeId:string)=>DataTable|undefined;
}

export function compareSentence(p:CompareParams):string{
  return `Finds how far the mean centre moved between the original and moved points, and each centre's nearest pump, `
    +`measured in metres in WGS84 / UTM zone ${p.zone}${p.hemisphere==='north'?'N':'S'}`
    +(p.centers?', from the two Mean center steps connected':'')+'. The original locations stay private: keep them out of anything shared.';
}

export const compareInspector:OwnInspector<'compare_point_sets'>={
  markup:(n,kit)=>{const k=kit as CompareKit,p=n.params,esc=kit.esc;
    const made=k.made(n.id),why=k.unfinished(n.id);
    const moved=made?.rows.find(r=>r.key.measure==='mean centre moved')?.value;
    const line=made&&typeof moved==='number'?`The mean centre moved ${moved.toLocaleString('en')} m. ${made.rows.length} distances, for a Table output.`
      :why?`The last run could not compute this step: ${why}`:'Not run yet.';
    return kit.section('Name',kit.name('compare-label',p.label||'Compare point sets'))
      +kit.section('Inputs',kit.inputs(n,{original:'Original points',moved:'Moved points',pumps:'Pumps, for reference',
        originalCenter:'Original mean centre',movedCenter:'Moved mean centre'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(compareSentence(p))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(line)}</p>`);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=kit.workflow().nodes.find(x=>x.id===n.id);if(node?.type!=='compare_point_sets')return;
      const esc=kit.esc;
      openConfigDialog<{zone:string;hemisphere:'north'|'south'}>({id:'compare-config',widget:'Compare point sets',step:node.params.label||'Compare point sets',
        draft:{zone:String(node.params.zone),hemisphere:node.params.hemisphere},
        sections:d=>{const zone=Number(d.zone),ok=Number.isInteger(zone)&&zone>=1&&zone<=60;
          return {settings:'<p class="description">Distances are measured in metres, in the UTM zone the points lie in. '
            +'Each Mean center step connected must use the same zone.</p>'
            +`<div class="field"><label class="field-label" for="comparison-zone">WGS84 UTM zone</label><input id="comparison-zone" type="number" min="1" max="60" value="${esc(d.zone)}"></div>`
            +`<div class="field"><label class="field-label" for="comparison-hemisphere">Hemisphere</label><select id="comparison-hemisphere">`
            +`<option value="north"${d.hemisphere==='north'?' selected':''}>North</option><option value="south"${d.hemisphere==='south'?' selected':''}>South</option></select></div>`,
            ...(ok?{}:{message:{tone:'refusal' as const,text:'Choose a UTM zone from 1 to 60.'},blocked:true})};},
        wire:(root2,d,redraw)=>{
          root2.querySelector<HTMLInputElement>('#comparison-zone')?.addEventListener('change',e=>{d.zone=(e.target as HTMLInputElement).value;redraw();});
          root2.querySelector<HTMLSelectElement>('#comparison-hemisphere')?.addEventListener('change',e=>{d.hemisphere=(e.target as HTMLSelectElement).value==='south'?'south':'north';redraw();});},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='compare_point_sets'){t.params.zone=Number(d.zone);t.params.hemisphere=d.hemisphere;}}),
      },esc);
    });
  },
};
