/** STEPS THAT MEASURE IN METRES, ON THE STANDARD (experiment 186), 2026-11-22: Convex hull, Voronoi catchments, Network
 *  isochrone and Mean center. Moved out of app.ts and catchment-ui.ts by the rule for any widget touched: Name, Inputs,
 *  Settings in one sentence with Configure…, Result. Each dialog carries the UTM zone with the zone the workflow's data
 *  suggests and what the chosen zone stretches, which the Inspector showed below the step before. */
import type {WorkflowNode} from './types.js';
import type {InspectorKit,OwnInspector} from './inspector-kit.js';
import type {AreaStepKit} from './area-steps-ui.js';
import {openConfigDialog} from './config-dialog.js';
import {validateCatchmentNode} from './catchments.js';
import {validateHullNode} from './convex-hull.js';
import {validateMeanCenterNode} from './mean-center.js';
import {errorMessage} from './guards.js';

type Hemisphere='north'|'south';
interface Zoned {zone:string; hemisphere:Hemisphere}
const zoneName=(zone:number|string,hemisphere:string)=>`${zone}${hemisphere==='north'?'N':'S'}`;
const sentence=(kit:InspectorKit,text:string)=>`<p class="standard-sentence">${kit.esc(text)}</p>`;
const configure='<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>';
const notRun='<p class="notice">Not run yet, or changed since the last run.</p>';
const row=(kit:InspectorKit,label:string,value:string)=>`<div class="detail-row"><span>${kit.esc(label)}</span><strong>${kit.esc(value)}</strong></div>`;
const nodeIn=<T extends WorkflowNode['type']>(kit:InspectorKit,n:WorkflowNode<T>)=>kit.workflow().nodes.find(x=>x.id===n.id) as WorkflowNode<T>|undefined;
const summaryOf=(kit:InspectorKit,n:WorkflowNode)=>(kit as AreaStepKit).summary(n.id);
const count=(v:unknown)=>Number(v??0).toLocaleString('en');
const metres=(m:number)=>m>=1000?`${(m/1000).toLocaleString('en',{maximumFractionDigits:2})} km`:`${Math.round(m).toLocaleString('en')} m`;
const squareMetres=(m2:number)=>m2>=1e5?`${(m2/1e6).toLocaleString('en',{maximumSignificantDigits:3})} km²`:`${Math.round(m2).toLocaleString('en')} m²`;

/** THE ZONE FIELDS, with what the workflow's coordinates suggest and what the chosen zone costs. */
function zoneFields(kit:InspectorKit,d:Zoned,prefix:string):string{
  const advice=(kit as AreaStepKit).zoneAdvice(Number(d.zone),d.hemisphere);
  return `<div class="field"><label class="field-label" for="${prefix}-zone">UTM zone it measures in</label>`
    +`<input id="${prefix}-zone" type="number" min="1" max="60" step="1" value="${kit.esc(d.zone)}"></div>`
    +`<div class="field"><label class="field-label" for="${prefix}-hemisphere">Hemisphere</label>`
    +`<select id="${prefix}-hemisphere"><option value="north"${d.hemisphere==='north'?' selected':''}>North</option>`
    +`<option value="south"${d.hemisphere==='south'?' selected':''}>South</option></select></div>`
    +(advice?`<p class="${advice.matches?'muted':'notice'}" data-utm-advice>`
      +kit.esc(advice.matches?`Zone ${zoneName(d.zone,d.hemisphere)} fits this workflow's ${advice.positions.toLocaleString('en')} coordinates`
          +(Number.isFinite(advice.stretch)?`, and stretches distances here by up to ${advice.stretch.toFixed(3)}%.`:'.')
        :`This workflow's ${advice.positions.toLocaleString('en')} coordinates suggest zone ${zoneName(advice.zone,advice.hemisphere)}`
          +(Number.isFinite(advice.stretch)?`; zone ${zoneName(d.zone,d.hemisphere)} stretches distances here by up to ${advice.stretch.toFixed(3)}%.`:'.'))
      +(advice.straddles.length?kit.esc(` The data spans zones ${advice.straddles.join(' and ')}, so the choice is which side to keep whole.`):'')
      +(advice.matches?'':` <button type="button" class="button small" data-suggested-zone="${advice.zone}:${advice.hemisphere}">Use zone ${zoneName(advice.zone,advice.hemisphere)}</button>`)
      +'</p>':'');
}
/** A ZONE THE DATA DISAGREES WITH, said in Settings where it is seen without opening the dialog. */
function zoneMismatch(kit:InspectorKit,p:{zone:number;hemisphere:Hemisphere}):string{
  const advice=(kit as AreaStepKit).zoneAdvice(p.zone,p.hemisphere);
  if(!advice||advice.matches)return '';
  return `<p class="notice" data-utm-mismatch>${kit.esc(`This workflow's coordinates are in UTM zone ${zoneName(advice.zone,advice.hemisphere)}, not ${zoneName(p.zone,p.hemisphere)}`
    +(Number.isFinite(advice.stretch)?`, which stretches distances here by up to ${advice.stretch.toFixed(3)}%.`:'.'))}</p>`;
}
function wireZone(root:ParentNode,d:Zoned,redraw:()=>void,prefix:string){
  root.querySelector<HTMLInputElement>(`#${prefix}-zone`)!.onchange=e=>{d.zone=(e.target as HTMLInputElement).value;redraw();};
  root.querySelector<HTMLSelectElement>(`#${prefix}-hemisphere`)!.onchange=e=>{d.hemisphere=(e.target as HTMLSelectElement).value as Hemisphere;redraw();};
  root.querySelector<HTMLButtonElement>('[data-suggested-zone]')?.addEventListener('click',e=>{
    const [zone,hemisphere]=(e.currentTarget as HTMLElement).dataset.suggestedZone!.split(':');d.zone=zone;d.hemisphere=hemisphere as Hemisphere;redraw();});
}
/** What the run's own check says of a draft, so Apply is held while it would refuse. */
function refusal(check:()=>void):{blocked?:boolean;message?:{tone:'refusal';text:string}}{
  try{check();return {};}catch(error){return {blocked:true,message:{tone:'refusal',text:errorMessage(error)}};}
}
const zoneOf=(d:Zoned)=>({zone:Number(d.zone),hemisphere:d.hemisphere});

export const hullInspector:OwnInspector<'summarize_hull'>={
  markup:(n,kit)=>{const p=n.params,f=summaryOf(kit,n) as {areaSquareMetres?:number;spanMetres?:number}|undefined;
    return kit.section('Name',kit.name('hull-label',p.label||'Convex hull'))
      +kit.section('Inputs',kit.inputs(n,{points:'The points to outline'}))
      +kit.section('Settings',sentence(kit,`The smallest convex outline around the points, measured in metres in UTM zone ${zoneName(p.zone,p.hemisphere)}.`)+zoneMismatch(kit,p)+configure)
      +kit.section('Result',f?.areaSquareMetres!==undefined
        ?row(kit,'Area enclosed',squareMetres(f.areaSquareMetres))+(f.spanMetres!==undefined?row(kit,'Widest across',metres(f.spanMetres)):'')
        :notRun);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog<Zoned>({id:'hull-dialog',widget:'Convex hull',step:node.params.label||'',
        draft:{zone:String(node.params.zone),hemisphere:node.params.hemisphere},
        sections:d=>({settings:zoneFields(kit,d,'hull'),
          ...refusal(()=>validateHullNode({...node,params:{...node.params,...zoneOf(d)}}))}),
        wire:(r,d,redraw)=>wireZone(r,d,redraw,'hull'),
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='summarize_hull')Object.assign(t.params,zoneOf(d));}),
      },kit.esc);
    });
  },
};

export const voronoiInspector:OwnInspector<'voronoi'>={
  markup:(n,kit)=>{const p=n.params,out=summaryOf(kit,n);
    return kit.section('Name',kit.name('voronoi-label',p.label||'Voronoi catchments'))
      +kit.section('Inputs',kit.inputs(n,{area:'The study area to divide',sites:'The sites, up to 100'}))
      +kit.section('Settings',sentence(kit,`Gives every place in the study area to its nearest site in a straight line, measured in metres in UTM zone ${zoneName(p.zone,p.hemisphere)}. `
        +'A straight line ignores roads, rivers and travel time.')+zoneMismatch(kit,p)+configure)
      +kit.section('Result',out?row(kit,'Catchments drawn',count(out.features)):notRun);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog<Zoned>({id:'voronoi-dialog',widget:'Voronoi catchments',step:node.params.label||'',
        draft:{zone:String(node.params.zone),hemisphere:node.params.hemisphere},
        sections:d=>({settings:zoneFields(kit,d,'voronoi'),
          ...refusal(()=>validateCatchmentNode({...node,params:{...node.params,...zoneOf(d)}}))}),
        wire:(r,d,redraw)=>wireZone(r,d,redraw,'voronoi'),
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='voronoi')Object.assign(t.params,zoneOf(d));}),
      },kit.esc);
    });
  },
};

interface IsochroneDraft extends Zoned {times:string;speedMPerMin:string;bufferM:string;maxSnapM:string;direction:'inbound'|'outbound';fillHoles:boolean}
/** ONE TIME OR SEVERAL, in one field: one is the travel time, several are nested regions, the longest the step's time. */
const timesOf=(d:IsochroneDraft)=>d.times.split(',').map(v=>v.trim()).filter(Boolean).map(Number);
const isoParams=(d:IsochroneDraft)=>{const times=timesOf(d);return {...zoneOf(d),minutes:times.length?Math.max(...times):NaN,
  speedMPerMin:Number(d.speedMPerMin),bufferM:Number(d.bufferM),
  maxSnapM:Number(d.maxSnapM),direction:d.direction,fillHoles:d.fillHoles,
  thresholds:times.length>1?times:undefined};};
const listed=(values:readonly number[])=>values.length<2?String(values[0]):`${values.slice(0,-1).join(', ')} and ${values[values.length-1]}`;
export function isochroneSentence(p:WorkflowNode<'isochrone'>['params']):string{
  const times=p.thresholds?.length?listed(p.thresholds):String(p.minutes);
  return `${p.direction==='inbound'?'Who can reach each site':'Where each site can reach'} within ${times} minutes along the streets, `
    +`at ${p.speedMPerMin} metres a minute, with ${p.bufferM} m off the street at the end; measured in UTM zone ${zoneName(p.zone,p.hemisphere)}.`;
}
export const isochroneInspector:OwnInspector<'isochrone'>={
  markup:(n,kit)=>{const out=summaryOf(kit,n);
    return kit.section('Name',kit.name('isochrone-label',n.params.label||'Network isochrone'))
      +kit.section('Inputs',kit.inputs(n,{sites:'The sites to travel from or to',network:'The street network'}))
      +kit.section('Settings',sentence(kit,isochroneSentence(n.params))+zoneMismatch(kit,n.params)+configure)
      +kit.section('Result',out
        ?row(kit,'Regions drawn',count(out.features))
          +(Number(out.unconnected)?row(kit,'Sites that reach nothing in the time',count(out.unconnected)):'')
          +(Number(out.offNetwork)?row(kit,'Sites past the snap limit, routed anyway',count(out.offNetwork)):'')
        :notRun);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;const p=node.params;
      openConfigDialog<IsochroneDraft>({id:'isochrone-dialog',widget:'Network isochrone',step:p.label||'',
        draft:{zone:String(p.zone),hemisphere:p.hemisphere,times:p.thresholds?.length?p.thresholds.join(', '):String(p.minutes),
          speedMPerMin:String(p.speedMPerMin),bufferM:String(p.bufferM),maxSnapM:String(p.maxSnapM),direction:p.direction,fillHoles:!!p.fillHoles},
        sections:d=>{const num=(key:keyof IsochroneDraft,label:string,min:number,max:number,step=1)=>
            `<div class="field"><label class="field-label" for="isochrone-${key}">${label}</label>`
            +`<input id="isochrone-${key}" data-iso="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${kit.esc(d[key])}"></div>`;
          return {settings:`<div class="field"><label class="field-label" for="isochrone-direction">Direction</label>`
            +`<select id="isochrone-direction"><option value="outbound"${d.direction==='outbound'?' selected':''}>From each site: where it can reach</option>`
            +`<option value="inbound"${d.direction==='inbound'?' selected':''}>To each site: who can reach it</option></select></div>`
            +`<div class="field"><label class="field-label" for="isochrone-times">Travel time in minutes, or several separated by commas</label>`
            +`<input id="isochrone-times" value="${kit.esc(d.times)}" placeholder="5, 10, 15"><small>Up to six, increasing, from 0.1 to 60. Several give nested regions, each holding the shorter ones.</small></div>`
            +num('speedMPerMin','Speed (metres a minute)',1,200)
            +num('bufferM','Last walk off the street, to a door (metres)',1,100)
            +num('maxSnapM','Snap limit: a site further from a street is marked (metres)',0,1000)
            +`<label class="field-option"><input type="checkbox" id="isochrone-fillHoles"${d.fillHoles?' checked':''}> Fill holes inside each region</label>`
            +zoneFields(kit,d,'isochrone'),
            preview:(()=>{const q=isoParams(d),far=q.minutes*q.speedMPerMin;
              return far>0?`<p>${kit.esc(`${q.thresholds?'The longest time goes':'That goes'} up to ${metres(far)} along the streets at ${q.speedMPerMin} metres a minute.`)}</p>`:'';})(),
            ...refusal(()=>validateCatchmentNode({...node,params:{...p,...isoParams(d)}}))};},
        wire:(r,d,redraw)=>{
          r.querySelectorAll<HTMLInputElement>('[data-iso]').forEach(el=>el.onchange=()=>{(d as unknown as Record<string,string>)[el.dataset.iso!]=el.value;redraw();});
          r.querySelector<HTMLInputElement>('#isochrone-times')!.onchange=e=>{d.times=(e.target as HTMLInputElement).value;redraw();};
          r.querySelector<HTMLSelectElement>('#isochrone-direction')!.onchange=e=>{d.direction=(e.target as HTMLSelectElement).value as IsochroneDraft['direction'];redraw();};
          r.querySelector<HTMLInputElement>('#isochrone-fillHoles')!.onchange=e=>{d.fillHoles=(e.target as HTMLInputElement).checked;redraw();};
          wireZone(r,d,redraw,'isochrone');},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type!=='isochrone')return;const q=isoParams(d);
          Object.assign(t.params,q);if(!q.thresholds)delete t.params.thresholds;if(!q.fillHoles)delete t.params.fillHoles;}),
      },kit.esc);
    });
  },
};

interface MeanDraft extends Zoned {weightField:string}
export const meanCenterInspector:OwnInspector<'mean_center'>={
  markup:(n,kit)=>{const p=n.params,field=p.weightField?.trim(),out=summaryOf(kit,n);
    return kit.section('Name',kit.name('mean-center-label',p.label||'Mean center'))
      +kit.section('Inputs',kit.inputs(n,{points:'The points to find the centre of'}))
      +kit.section('Settings',sentence(kit,`The average position of the points${field?`, each counted in proportion to its ${field}`:', each counted once'}, `
        +`measured in metres in UTM zone ${zoneName(p.zone,p.hemisphere)}.`)+zoneMismatch(kit,p)+configure)
      +kit.section('Result',out
        ?row(kit,'Centre (longitude, latitude)',`${Number(out.longitude).toFixed(6)}, ${Number(out.latitude).toFixed(6)}`)
          +row(kit,'Points used',count(out.count))
          +(out.weightField?row(kit,`Total ${out.weightField}`,count(out.weightTotal)):'')
        :notRun);},
  wire:(n,kit,root)=>{const k=kit as AreaStepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      const fields=k.numericFields(n.id,'points');
      openConfigDialog<MeanDraft>({id:'mean-center-dialog',widget:'Mean center',step:node.params.label||'',
        draft:{zone:String(node.params.zone),hemisphere:node.params.hemisphere,weightField:node.params.weightField??''},
        sections:d=>({settings:`<div class="field"><label class="field-label" for="mean-center-weight">Weight each point by (optional)</label>`
          +(fields.length?`<select id="mean-center-weight"><option value="">None: each point counted once</option>`
            +[...new Set([...fields,...(d.weightField&&!fields.includes(d.weightField)?[d.weightField]:[])])].map(f=>`<option value="${kit.esc(f)}"${f===d.weightField?' selected':''}>${kit.esc(f)}</option>`).join('')+'</select>'
            :`<input id="mean-center-weight" maxlength="60" value="${kit.esc(d.weightField)}" placeholder="for example deaths">`)
          +'<small>250 addresses carrying 489 deaths have two different centres.</small></div>'
          +zoneFields(kit,d,'mean-center'),
          ...refusal(()=>validateMeanCenterNode({...node,params:{...node.params,...zoneOf(d),weightField:d.weightField}}))}),
        wire:(r,d,redraw)=>{
          r.querySelector<HTMLInputElement|HTMLSelectElement>('#mean-center-weight')!.onchange=e=>{d.weightField=(e.target as HTMLInputElement).value.trim();redraw();};
          wireZone(r,d,redraw,'mean-center');},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type!=='mean_center')return;
          Object.assign(t.params,zoneOf(d));if(d.weightField)t.params.weightField=d.weightField;else delete t.params.weightField;}),
      },kit.esc);
    });
  },
};

export const METRIC_STEP_INSPECTORS={summarize_hull:hullInspector,voronoi:voronoiInspector,isochrone:isochroneInspector,
  mean_center:meanCenterInspector} as const;
