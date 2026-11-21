/** FOUR AREA STEPS ON THE STANDARD (experiment 186), 2026-11-20: Area around a point, Buffer study area, Calculate area and
 *  Clip polygons. Touched for their receipts, which now name the study area's shape by its digest, they move to the
 *  standard Inspector -- Name, Inputs, Settings in one sentence with Configure…, Result -- and out of app.ts, by the
 *  practitioner's rule for any widget changed (*"Apply standardization rule"*). Each dialog, and Clip polygons'
 *  Settings, offers Show me how it works, a made-up example drawn step by step (spatial-walkthroughs.ts). */
import type {WorkflowNode,AreaUnit,Boundary} from './types.js';
import type {InspectorKit,OwnInspector} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {openWalkthrough} from './table-walkthrough.js';
import {bufferPointWalkthrough,measureAreaWalkthrough,clipPolygonsWalkthrough} from './spatial-walkthroughs.js';
import {areaUnitOptions} from './area-measurement.js';
import {calculateArea,formatArea} from './area-computation.js';
type Measurement=ReturnType<typeof calculateArea>;

/** What a step's last run made, for its Result: the area it passed on and, for Calculate area, its measurement. */
export interface AreaStepKit extends InspectorKit {
  output:(nodeId:string)=>{boundary?:Boundary;measurement?:Measurement}|undefined;
  /** False when the workflow has changed since the last run, so a result shown would be stale. */
  current:()=>boolean;
}
const showMe='<p><button type="button" class="button" data-show-me>Show me how it works</button></p>';
const configure='<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>';
const sentence=(kit:InspectorKit,text:string)=>`<p class="standard-sentence">${kit.esc(text)}</p>`;
function areaResult(kit:AreaStepKit,n:WorkflowNode,made:string):string{
  const out=kit.current()?kit.output(n.id):undefined;
  if(!out?.boundary)return '<p class="notice">Not run yet, or changed since the last run.</p>';
  return `<div class="detail-row"><span>${kit.esc(made)}</span><strong>${kit.esc(formatArea(out.measurement??calculateArea(out.boundary,'km2')))}</strong></div>`;
}
const nodeIn=<T extends WorkflowNode['type']>(kit:InspectorKit,n:WorkflowNode<T>)=>kit.workflow().nodes.find(x=>x.id===n.id) as WorkflowNode<T>|undefined;
const showMeIn=(root:ParentNode,kit:InspectorKit,walk:()=>Parameters<typeof openWalkthrough>[0])=>
  root.querySelector<HTMLButtonElement>('[data-show-me]')?.addEventListener('click',event=>openWalkthrough(walk(),kit.esc,event.currentTarget as HTMLElement));

export const bufferPointInspector:OwnInspector<'buffer_point'>={
  markup:(n,kit)=>{const k=kit as AreaStepKit,p=n.params;
    return kit.section('Name',kit.name('bp-label',p.label||'Area around a point'))
      +kit.section('Inputs',kit.inputs(n,{points:'The points, one of them named here'}))
      +kit.section('Settings',sentence(kit,p.pointId?`Everything within ${p.distanceM.toLocaleString('en')} m of the point named ${p.pointId}.`
        :'Name one point, and a distance: everything within it becomes the study area.')+configure)
      +kit.section('Result',areaResult(k,n,'The area drawn'));},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog({id:'buffer-point-dialog',widget:'Area around a point',step:node.params.label||'',
        draft:{pointId:node.params.pointId,distanceM:String(node.params.distanceM)},
        sections:d=>{const m=Number(d.distanceM),ok=Number.isFinite(m)&&m>0&&m<=5000;
          return {settings:`<div class="field"><label class="field-label" for="bp-point">Point that defines the area, by its name or id</label>`
            +`<input id="bp-point" maxlength="80" value="${kit.esc(d.pointId)}" placeholder="MANILA"></div>`
            +`<div class="field"><label class="field-label" for="bp-distance">Radius in metres</label>`
            +`<input id="bp-distance" type="number" min="0" max="5000" step="100" value="${kit.esc(d.distanceM)}"></div>`,
            preview:showMe,blocked:!ok||!d.pointId.trim(),
            ...(!d.pointId.trim()?{message:{tone:'refusal' as const,text:'Name the point the area is drawn around.'}}
              :!ok?{message:{tone:'refusal' as const,text:'Give a radius above 0 and up to 5,000 metres.'}}:{})};},
        wire:(root,d,redraw)=>{
          root.querySelector<HTMLInputElement>('#bp-point')!.onchange=e=>{d.pointId=(e.target as HTMLInputElement).value;redraw();};
          root.querySelector<HTMLInputElement>('#bp-distance')!.onchange=e=>{d.distanceM=(e.target as HTMLInputElement).value;redraw();};
          showMeIn(root,kit,()=>bufferPointWalkthrough(Number(d.distanceM)));},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='buffer_point'){t.params.pointId=d.pointId.trim();t.params.distanceM=Number(d.distanceM);}}),
      },kit.esc);
    });
  },
};

export const measureAreaInspector:OwnInspector<'measure_area'>={
  markup:(n,kit)=>{const k=kit as AreaStepKit,p=n.params;
    return kit.section('Name',kit.name('measure-label',p.label||'Calculate area'))
      +kit.section('Inputs',kit.inputs(n,{area:'The study area to measure'}))
      +kit.section('Settings',sentence(kit,`Measures the study area on the curved Earth, in ${unitLabel(p.unit)}, and passes the same area on with its size attached.`)+configure)
      +kit.section('Result',areaResult(k,n,'Calculated area'));},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog({id:'measure-area-dialog',widget:'Calculate area',step:node.params.label||'',
        draft:{unit:node.params.unit},
        sections:d=>({settings:`<div class="field"><label class="field-label" for="area-unit">Area unit</label>`
          +`<select id="area-unit">${areaUnitOptions(d.unit)}</select></div>`,preview:showMe}),
        wire:(root,d,redraw)=>{
          root.querySelector<HTMLSelectElement>('#area-unit')!.onchange=e=>{d.unit=(e.target as HTMLSelectElement).value as AreaUnit;redraw();};
          showMeIn(root,kit,()=>measureAreaWalkthrough(d.unit));},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='measure_area')t.params.unit=d.unit;}),
      },kit.esc);
    });
  },
};
const unitLabel=(unit:AreaUnit)=>({m2:'square metres',km2:'square kilometres',ha:'hectares',ft2:'square feet',acre:'acres',mi2:'square miles'} as Record<AreaUnit,string>)[unit]??unit;

export const clipPolygonsInspector:OwnInspector<'clip_polygons'>={
  markup:(n,kit)=>{
    const k=kit as AreaStepKit,out=k.current()?k.output(n.id) as {features?:unknown[]}|undefined:undefined;
    return kit.section('Name',kit.name('clip-label',n.params.label||'Clip polygons'))
      +kit.section('Inputs',kit.inputs(n,{area:'The study area to clip to',polygons:'The polygons to clip'}))
      +kit.section('Settings',sentence(kit,'Cuts each polygon to the study area: one inside is kept whole, one across its edge is cut along it, and one outside is left out. Nothing to set.')+configure)
      +kit.section('Result',out?.features?`<div class="detail-row"><span>Polygons kept</span><strong>${out.features.length.toLocaleString('en')}</strong></div>`
        :'<p class="notice">Not run yet, or changed since the last run.</p>');},
  // SHOW ME HOW IN THE DIALOG, as every step's is (2026-11-21): nothing to set, as Table output's dialog says.
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog({id:'clip-polygons-dialog',widget:'Clip polygons',step:node.params.label||'',draft:{},
        sections:()=>({settings:'<p class="muted">Nothing to set: each polygon is cut to the study area connected.</p>',preview:showMe}),
        wire:root2=>{showMeIn(root2,kit,()=>clipPolygonsWalkthrough());},
        apply:()=>{},
      },kit.esc);
    });
  },
};

export const AREA_STEP_INSPECTORS={buffer_point:bufferPointInspector,
  measure_area:measureAreaInspector,clip_polygons:clipPolygonsInspector} as const;
