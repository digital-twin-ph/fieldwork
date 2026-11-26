/** STEPS THAT MEASURE IN METRES, ON THE STANDARD (experiment 186), 2026-11-22: Convex hull, Voronoi catchments, Network
 *  isochrone and Mean center; Reachable junctions 2026-11-23. Moved out of app.ts and catchment-ui.ts by the rule for any widget touched: Name, Inputs,
 *  Settings in one sentence with Configure…, Result. Each dialog carries the UTM zone with the zone the workflow's data
 *  suggests and what the chosen zone stretches, which the Inspector showed below the step before. */
import type {WorkflowNode} from './types.js';
import type {InspectorKit,OwnInspector} from './inspector-kit.js';
import type {AreaStepKit} from './area-steps-ui.js';
import {openConfigDialog} from './config-dialog.js';
import {validateCatchmentNode,voronoi} from './catchments.js';
import {validateHullNode,convexHull} from './convex-hull.js';
import {validateMeanCenterNode,computeMeanCenter} from './mean-center.js';
import {reachableNodes} from './reachable-nodes.js';
import {calculateArea} from './area-computation.js';
import {validateReachNode,MODE_SPEED_BANDS} from './reachable-nodes.js';
import {errorMessage} from './guards.js';
import {SHOW_ME,showMeIn} from './table-walkthrough.js';
import {hullWalkthrough,voronoiWalkthrough,isochroneWalkthrough,meanCenterWalkthrough} from './spatial-walkthroughs.js';

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
export type ZoneAdvice=AreaStepKit['zoneAdvice'];
export function zoneFields(kit:InspectorKit&{zoneAdvice:ZoneAdvice},d:Zoned,prefix:string):string{
  const advice=kit.zoneAdvice(Number(d.zone),d.hemisphere);
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
export function wireZone(root:ParentNode,d:Zoned,redraw:()=>void,prefix:string){
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

/** WHAT THESE STEPS WOULD MAKE OF THE POINTS THEY HAVE, computed with each step's OWN function (2026-11-25).
 *
 *  Three dialogs offered "Show me how it works" and nothing else under Preview. The practitioner met them one after
 *  another -- *"for this voronoi catchment dialog there is no preview"*, then Convex hull, then Mean center -- and
 *  then said what they all are: *"Practically all widgets used in Snow built in have similar problems."*
 *
 *  A made-up example explains the method and says nothing about this workflow's points. These run `convexHull`,
 *  `voronoi` and `computeMeanCenter` on the points actually connected, so the Preview cannot show something the step
 *  would not do. Said where there is nothing to compute, never left blank: an empty Preview reads as a dialog that
 *  does not work, which is the objection `area-steps-ui.ts` records under "SAID, NOT SWALLOWED". */
const pointsOn=(kit:InspectorKit,nodeId:string,port='points'):import('./types.js').PointCollection|null=>{
  const {features}=(kit as AreaStepKit).pointChoices(nodeId,port);
  const placed=features.filter(f=>f.geometry&&Array.isArray(f.geometry.coordinates));
  if(!placed.length)return null;
  return {type:'FeatureCollection',features:placed.map((f,i)=>({type:'Feature',id:`p${i+1}`,
    properties:{name:f.name},geometry:f.geometry}))} as unknown as import('./types.js').PointCollection;
};
const waitingFor=(what:string)=>`<p class="muted">Connect ${what}, and what this step would make of them is counted here.</p>`;
const cannotYet=(kit:InspectorKit,error:unknown)=>
  `<p class="muted">This cannot be previewed yet: ${kit.esc(error instanceof Error?error.message:String(error))}</p>`;
const km2=(m2:number)=>`${new Intl.NumberFormat('en',{maximumSignificantDigits:3}).format(m2/1e6)} km²`;

/** WHAT REACHABLE JUNCTIONS WOULD REACH, over the network connected (2026-11-25).
 *
 *  Its Preview was `minutes x speed` -- *"That goes up to 850 m along the streets from each site"* -- which is
 *  arithmetic on the two numbers just typed. It reads like a preview, which is why it survived a search for empty
 *  ones, and it says nothing about these streets: the same sentence appears whether the network reaches a thousand
 *  junctions or none. The practitioner's objection to the walkthrough beside it was the same thing in another
 *  place, that a street network is used point to point.
 *
 *  This runs `reachableNodes`, the function the run itself calls. The budget sentence stays, because it is what the
 *  two settings mean, and is now followed by what that budget actually buys.
 *
 *  THE SITES ARE READ WITH THEIR PROPERTIES. `reachableNodes` reads `networkNodeId` to tell a site already on the
 *  network from one it must attach itself, so previewing from the trimmed features a picker uses would describe a
 *  different run -- and silently, since both produce a number. */
function reachPreview(kit:InspectorKit,n:WorkflowNode,params:WorkflowNode<'reachable_nodes'>['params']):string{
  const budget=params.minutes*params.speedMPerMin;
  const said=budget>0
    ?`<p>${kit.esc(`That is a budget of ${metres(budget)} along the streets from each site.`)}</p>`:'';
  const sites=(kit as AreaStepKit).recordsOn(n.id,'sites');
  const network=(kit as AreaStepKit).networkOn(n.id);
  // WHAT IS MISSING IS SAID EXACTLY, because two different things look alike here. A port with nothing on it is
  // waiting to be connected. A port with a street network on it may still have nothing to count from: a downloaded
  // network is held outside the page by reference (`dataRef`, in IndexedDB) and read when the workflow runs, so it
  // is not there to be walked while a dialog is drawing. Saying "connect a street network" over a connected one
  // would send the reader to fix something that is not broken (measured on the Snow isochrone example, 2026-11-25).
  if(!sites||!network){
    const connected=(port:string)=>kit.workflow().edges.some(e=>e.to===n.id&&e.port===port);
    const missing=[!sites&&!connected('sites')?'the sites':'',!network&&!connected('network')?'a street network':'']
      .filter(Boolean);
    return said+(missing.length
      ?`<p class="muted">Connect ${missing.join(' and ')}, and what this step would reach is counted here.</p>`
      :'<p class="muted">The street network is kept outside the page and read when the workflow runs, so what this '
        +'step reached is in the Inspector after a run rather than here.</p>');
  }
  try{
    const {value}=reachableNodes(sites,network,{...n,type:'reachable_nodes',params} as WorkflowNode<'reachable_nodes'>,
      'preview',n.id);
    const reached=value.features.length;
    const unconnected=(value as unknown as {unconnected?:unknown[]}).unconnected??[];
    const offNetwork=(value as unknown as {offNetwork?:{name:string;distanceM:number}[]}).offNetwork??[];
    const sited=sites.features.filter(f=>f.geometry).length;
    const n0=(v:number)=>v.toLocaleString('en-US');
    return said
      +`<p class="standard-result"><strong>${n0(reached)}</strong> junction${reached===1?'':'s'} `
      +`${params.direction==='inbound'?'can reach':'reachable from'} `
      +`<strong>${n0(sited-unconnected.length)}</strong> of ${n0(sited)} site${sited===1?'':'s'}, `
      +`over ${kit.esc(network.source)}.</p>`
      // THE SITES THAT REACH NOTHING ARE THE FINDING, and a count of junctions hides them: a site whose nearest
      // street is further than the whole budget simply does not appear in the result.
      +(unconnected.length?`<p class="profile-flag">${n0(unconnected.length)} site${unconnected.length===1?'':'s'} `
        +`${unconnected.length===1?'reaches':'reach'} nothing: the leg to the nearest street spends the whole budget.</p>`:'')
      +(offNetwork.length?`<p class="profile-flag">${n0(offNetwork.length)} site${offNetwork.length===1?'':'s'} `
        +`${offNetwork.length===1?'joins':'join'} the network across ground no street covers, charged as a straight `
        +'line, so they reach further here than on the ground.</p>':'');
  }catch(error){return said+cannotYet(kit,error);}
}

function hullPreview(kit:InspectorKit,n:WorkflowNode,params:WorkflowNode<'summarize_hull'>['params']):string{
  const input=pointsOn(kit,n.id);
  if(!input)return waitingFor('the points')+SHOW_ME;
  try{
    const {value}=convexHull(input,{...n,type:'summarize_hull',params} as WorkflowNode<'summarize_hull'>,'preview',n.id);
    const ring=value.features[0];
    const area=ring?calculateArea(ring.geometry,'km2').squareMetres:0;
    // THE POINTS ON THE OUTLINE ARE THE FINDING: a hull is decided by its corners, and how few there are says how
    // much of the layer is doing the work.
    const corners=ring&&ring.geometry.type==='Polygon'?Math.max(0,(ring.geometry.coordinates[0]?.length??1)-1):0;
    return `<p class="standard-result"><strong>${kit.esc(km2(area))}</strong> inside the outline, `
      +`drawn through ${corners.toLocaleString('en')} of the ${input.features.length.toLocaleString('en')} points. `
      +`The rest fall inside it.</p>`+SHOW_ME;
  }catch(error){return cannotYet(kit,error)+SHOW_ME;}
}

function voronoiPreview(kit:InspectorKit,n:WorkflowNode,params:{zone:number;hemisphere:'north'|'south'}):string{
  const input=pointsOn(kit,n.id,'sites');
  const area=(kit as AreaStepKit).output(
    (kit.workflow().edges.find(e=>e.to===n.id&&e.port==='area')?.from)??'')as {boundary?:import('./types.js').Boundary}|undefined;
  const boundary=area?.boundary
    ??(kit.workflow().nodes.find(x=>x.id===kit.workflow().edges.find(e=>e.to===n.id&&e.port==='area')?.from)?.params as {geometry?:import('./types.js').Boundary}|undefined)?.geometry;
  if(!input)return waitingFor('the sites')+SHOW_ME;
  if(!boundary)return waitingFor('a study area')+SHOW_ME;
  try{
    const made=voronoi(input,boundary,params.zone,params.hemisphere);
    const areas=made.features.map(f=>calculateArea(f.geometry,'km2').squareMetres).sort((a,b)=>a-b);
    if(!areas.length)return cannotYet(kit,new Error('no catchment was drawn'))+SHOW_ME;
    // SMALLEST AND LARGEST, because what a reader judges about catchments is how uneven they are.
    return `<p class="standard-result"><strong>${made.features.length.toLocaleString('en')} catchments</strong>, `
      +`one per site, from ${kit.esc(km2(areas[0]!))} to ${kit.esc(km2(areas[areas.length-1]!))}.</p>`+SHOW_ME;
  }catch(error){return cannotYet(kit,error)+SHOW_ME;}
}

function meanCenterPreview(kit:InspectorKit,n:WorkflowNode,params:WorkflowNode<'mean_center'>['params']):string{
  const input=pointsOn(kit,n.id);
  if(!input)return waitingFor('the points')+SHOW_ME;
  try{
    const centre=computeMeanCenter(input,params);
    const [lon,lat]=centre.coordinates;
    return `<p class="standard-result"><strong>${lat.toFixed(5)}, ${lon.toFixed(5)}</strong> from `
      +`${centre.count.toLocaleString('en')} points`
      +(centre.weight?`, weighted by ${kit.esc(centre.weight.field)} totalling ${centre.weight.total.toLocaleString('en')}`:', each counted once')
      +'.</p>'+SHOW_ME;
  }catch(error){return cannotYet(kit,error)+SHOW_ME;}
}

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
        sections:d=>({settings:zoneFields(kit as AreaStepKit,d,'hull'),preview:hullPreview(kit,n,{...node.params,...zoneOf(d)}),
          ...refusal(()=>validateHullNode({...node,params:{...node.params,...zoneOf(d)}}))}),
        wire:(r,d,redraw)=>{wireZone(r,d,redraw,'hull');showMeIn(r,kit.esc,hullWalkthrough);},
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
        sections:d=>({settings:zoneFields(kit as AreaStepKit,d,'voronoi'),preview:voronoiPreview(kit,n,zoneOf(d)),
          ...refusal(()=>validateCatchmentNode({...node,params:{...node.params,...zoneOf(d)}}))}),
        wire:(r,d,redraw)=>{wireZone(r,d,redraw,'voronoi');showMeIn(r,kit.esc,voronoiWalkthrough);},
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
            +zoneFields(kit as AreaStepKit,d,'isochrone'),
            preview:(()=>{const q=isoParams(d),far=q.minutes*q.speedMPerMin;
              return (far>0?`<p>${kit.esc(`${q.thresholds?'The longest time goes':'That goes'} up to ${metres(far)} along the streets at ${q.speedMPerMin} metres a minute.`)}</p>`:'')+SHOW_ME;})(),
            ...refusal(()=>validateCatchmentNode({...node,params:{...p,...isoParams(d)}}))};},
        wire:(r,d,redraw)=>{
          r.querySelectorAll<HTMLInputElement>('[data-iso]').forEach(el=>el.onchange=()=>{(d as unknown as Record<string,string>)[el.dataset.iso!]=el.value;redraw();});
          r.querySelector<HTMLInputElement>('#isochrone-times')!.onchange=e=>{d.times=(e.target as HTMLInputElement).value;redraw();};
          r.querySelector<HTMLSelectElement>('#isochrone-direction')!.onchange=e=>{d.direction=(e.target as HTMLSelectElement).value as IsochroneDraft['direction'];redraw();};
          r.querySelector<HTMLInputElement>('#isochrone-fillHoles')!.onchange=e=>{d.fillHoles=(e.target as HTMLInputElement).checked;redraw();};
          wireZone(r,d,redraw,'isochrone');
          showMeIn(r,kit.esc,()=>{const q=isoParams(d);return isochroneWalkthrough(q.minutes,q.speedMPerMin,q.bufferM);});},
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
          +zoneFields(kit as AreaStepKit,d,'mean-center'),preview:meanCenterPreview(kit,n,{...(nodeIn(kit,n)?.params as WorkflowNode<'mean_center'>['params']),...zoneOf(d)}),
          ...refusal(()=>validateMeanCenterNode({...node,params:{...node.params,...zoneOf(d),weightField:d.weightField}}))}),
        wire:(r,d,redraw)=>{
          r.querySelector<HTMLInputElement|HTMLSelectElement>('#mean-center-weight')!.onchange=e=>{d.weightField=(e.target as HTMLInputElement).value.trim();redraw();};
          wireZone(r,d,redraw,'mean-center');showMeIn(r,kit.esc,()=>meanCenterWalkthrough(d.weightField));},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type!=='mean_center')return;
          Object.assign(t.params,zoneOf(d));if(d.weightField)t.params.weightField=d.weightField;else delete t.params.weightField;}),
      },kit.esc);
    });
  },
};

/** REACHABLE JUNCTIONS (2026-11-23, off the old catchment panel). The zone, hemisphere and snap limit are optional: read
 *  only for origins this step attaches to the network itself, and left unset where the sites were snapped first. */
interface ReachDraft {minutes:string;speedMPerMin:string;travelMode:WorkflowNode<'reachable_nodes'>['params']['travelMode'];
  direction:'inbound'|'outbound';zone:string;hemisphere:''|Hemisphere;maxSnapM:string}
const optionalNumber=(v:string)=>v.trim()===''?undefined:Number(v);
const reachParams=(d:ReachDraft)=>({minutes:Number(d.minutes),speedMPerMin:Number(d.speedMPerMin),travelMode:d.travelMode,
  direction:d.direction,zone:optionalNumber(d.zone),hemisphere:d.hemisphere||undefined,maxSnapM:optionalNumber(d.maxSnapM)});
const MODE_WORDS:Record<ReachDraft['travelMode'],string>={walking:'walking',cycling:'cycling',driving:'driving',other:'travelling'};
export function reachSentence(p:WorkflowNode<'reachable_nodes'>['params']):string{
  return `The street junctions ${p.direction==='inbound'?'that can reach each site':'each site can reach'} within ${p.minutes} minutes, `
    +`${MODE_WORDS[p.travelMode]} at ${p.speedMPerMin} metres a minute`
    +(p.zone&&p.hemisphere?`; a site not yet on the network is attached in UTM zone ${zoneName(p.zone,p.hemisphere)}`
      +(p.maxSnapM!==undefined?`, marked past ${p.maxSnapM} m`:'')+'.':'.');
}
export const reachInspector:OwnInspector<'reachable_nodes'>={
  markup:(n,kit)=>{const out=summaryOf(kit,n);
    return kit.section('Name',kit.name('reach-label',n.params.label||'Reachable junctions'))
      +kit.section('Inputs',kit.inputs(n,{sites:'The sites to travel from or to',network:'The street network'}))
      +kit.section('Settings',sentence(kit,reachSentence(n.params))
        +(n.params.zone&&n.params.hemisphere?zoneMismatch(kit,{zone:n.params.zone,hemisphere:n.params.hemisphere}):'')+configure)
      +kit.section('Result',out
        ?row(kit,'Junctions reached',count(out.features))
          +(Number(out.unconnected)?row(kit,'Sites that reach nothing in the time',count(out.unconnected)):'')
          +(Number(out.offNetwork)?row(kit,'Sites past the snap limit, routed anyway',count(out.offNetwork)):'')
        :notRun);},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;const p=node.params;
      openConfigDialog<ReachDraft>({id:'reach-dialog',widget:'Reachable junctions',step:p.label||'',
        draft:{minutes:String(p.minutes),speedMPerMin:String(p.speedMPerMin),travelMode:p.travelMode,direction:p.direction,
          zone:p.zone===undefined?'':String(p.zone),hemisphere:p.hemisphere??'',maxSnapM:p.maxSnapM===undefined?'':String(p.maxSnapM)},
        sections:d=>{const band=MODE_SPEED_BANDS[d.travelMode],q=reachParams(d);
          const advice=q.zone&&q.hemisphere?(kit as AreaStepKit).zoneAdvice(q.zone,q.hemisphere):undefined;
          return {settings:`<div class="field"><label class="field-label" for="reach-direction">Direction</label>`
            +`<select id="reach-direction"><option value="outbound"${d.direction==='outbound'?' selected':''}>From each site: where it can reach</option>`
            +`<option value="inbound"${d.direction==='inbound'?' selected':''}>To each site: who can reach it</option></select></div>`
            +`<div class="field"><label class="field-label" for="reach-minutes">Travel time (minutes)</label>`
            +`<input id="reach-minutes" data-reach="minutes" type="number" min="0.1" max="60" step="0.1" value="${kit.esc(d.minutes)}"></div>`
            +`<div class="field"><label class="field-label" for="reach-travelMode">How people travel</label><select id="reach-travelMode">`
            +(Object.keys(MODE_SPEED_BANDS) as ReachDraft['travelMode'][]).map(m=>`<option value="${m}"${d.travelMode===m?' selected':''}>${m[0]!.toUpperCase()+m.slice(1)}</option>`).join('')+'</select></div>'
            +`<div class="field"><label class="field-label" for="reach-speedMPerMin">Speed (metres a minute)</label>`
            +`<input id="reach-speedMPerMin" data-reach="speedMPerMin" type="number" min="1" max="1200" value="${kit.esc(d.speedMPerMin)}">`
            +`<small>${kit.esc(`For ${d.travelMode}: ${band.minMPerMin} to ${band.maxMPerMin} metres a minute.`)}</small></div>`
            +'<span class="inspector-section">Sites not yet on the network</span>'
            +'<p class="muted">Read only for sites this step attaches to the nearest junction itself. Leave unset where the sites were snapped first.</p>'
            +`<div class="field"><label class="field-label" for="reach-zone">UTM zone it measures in</label>`
            +`<input id="reach-zone" data-reach="zone" type="number" min="1" max="60" step="1" value="${kit.esc(d.zone)}" placeholder="Not set"></div>`
            +`<div class="field"><label class="field-label" for="reach-hemisphere">Hemisphere</label><select id="reach-hemisphere">`
            +`<option value=""${d.hemisphere===''?' selected':''}>Not set</option><option value="north"${d.hemisphere==='north'?' selected':''}>North</option>`
            +`<option value="south"${d.hemisphere==='south'?' selected':''}>South</option></select></div>`
            +(advice&&!advice.matches?`<p class="notice" data-utm-advice>${kit.esc(`This workflow's ${advice.positions.toLocaleString('en')} coordinates suggest zone ${zoneName(advice.zone,advice.hemisphere)}.`)}`
              +` <button type="button" class="button small" data-suggested-zone="${advice.zone}:${advice.hemisphere}">Use zone ${zoneName(advice.zone,advice.hemisphere)}</button></p>`:'')
            +`<div class="field"><label class="field-label" for="reach-maxSnapM">Snap limit: a site further from a street is marked (metres)</label>`
            +`<input id="reach-maxSnapM" data-reach="maxSnapM" type="number" min="0" max="1000" value="${kit.esc(d.maxSnapM)}" placeholder="Not set">`
            +'<small>Unset means no limit. A site past the limit is attached and marked, not dropped.</small></div>',
            preview:reachPreview(kit,n,{...p,...reachParams(d)}),
            ...refusal(()=>validateReachNode({...node,params:{...p,...reachParams(d)}}))};},
        wire:(r,d,redraw)=>{
          r.querySelectorAll<HTMLInputElement>('[data-reach]').forEach(el=>el.onchange=()=>{(d as unknown as Record<string,string>)[el.dataset.reach!]=el.value;redraw();});
          r.querySelector<HTMLSelectElement>('#reach-direction')!.onchange=e=>{d.direction=(e.target as HTMLSelectElement).value as ReachDraft['direction'];redraw();};
          r.querySelector<HTMLSelectElement>('#reach-travelMode')!.onchange=e=>{d.travelMode=(e.target as HTMLSelectElement).value as ReachDraft['travelMode'];redraw();};
          r.querySelector<HTMLSelectElement>('#reach-hemisphere')!.onchange=e=>{d.hemisphere=(e.target as HTMLSelectElement).value as ReachDraft['hemisphere'];redraw();};
          r.querySelector<HTMLButtonElement>('[data-suggested-zone]')?.addEventListener('click',e=>{
            const [zone,hemisphere]=(e.currentTarget as HTMLElement).dataset.suggestedZone!.split(':');d.zone=zone!;d.hemisphere=hemisphere as Hemisphere;redraw();});},
        // UNSET IS ABSENT: a cleared field removes its key rather than storing NaN or 0.
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type!=='reachable_nodes')return;const q=reachParams(d);
          Object.assign(t.params,q);for(const key of ['zone','hemisphere','maxSnapM'] as const)if(q[key]===undefined)delete t.params[key];}),
      },kit.esc);
    });
  },
};

export const METRIC_STEP_INSPECTORS={summarize_hull:hullInspector,voronoi:voronoiInspector,isochrone:isochroneInspector,
  mean_center:meanCenterInspector,reachable_nodes:reachInspector} as const;
