/** FOUR AREA STEPS ON THE STANDARD (experiment 186), 2026-11-20: Area around a point, Buffer study area, Calculate area and
 *  Clip polygons. Touched for their receipts, which now name the study area's shape by its digest, they move to the
 *  standard Inspector -- Name, Inputs, Settings in one sentence with Configure…, Result -- and out of app.ts, by the
 *  practitioner's rule for any widget changed (*"Apply standardization rule"*). Each dialog, and Clip polygons'
 *  Settings, offers Show me how it works, a made-up example drawn step by step (spatial-walkthroughs.ts). */
import type {WorkflowNode,AreaUnit,Boundary} from './types.js';
import type {InspectorKit,OwnInspector} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {openWalkthrough} from './table-walkthrough.js';
import {MAX_BUFFER_M} from './area-buffer.js';
import {clipPointsToArea} from './clip-points.js';
import {previewBuffers} from './buffer-point.js';
import {bufferPointWalkthrough,measureAreaWalkthrough,clipPolygonsWalkthrough,clipPointsWalkthrough,summarizePointsWalkthrough} from './spatial-walkthroughs.js';
import {areaUnitOptions} from './area-measurement.js';
import {calculateArea,formatArea} from './area-computation.js';
import {METRIC_STEP_INSPECTORS} from './metric-steps-ui.js';
import {GEOPRIVACY_INSPECTORS} from './geoprivacy-ui.js';
type Measurement=ReturnType<typeof calculateArea>;

/** What a step's last run made, for its Result: the area it passed on and, for Calculate area, its measurement. */
export interface AreaStepKit extends InspectorKit {
  output:(nodeId:string)=>{boundary?:Boundary;measurement?:Measurement}|undefined;
  /** False when the workflow has changed since the last run, so a result shown would be stale. */
  current:()=>boolean;
  /** The method the last run's receipt states for the step, if it ran. */
  method:(nodeId:string)=>string|undefined;
  /** The numeric columns of the points arriving on a port, where their source holds them. */
  numericFields:(nodeId:string,port:string)=>string[];
  /** THE POINTS ARRIVING ON A PORT, by the name each is known by. The practitioner, 2026-11-23, of Area around a
   *  point refusing a connected Mines layer: *"This should not be guess work as the input port is connected."* A
   *  step that is wired to a layer knows which points it may be given, so asking for one by typing its name is
   *  asking the practitioner to supply what the workflow already holds -- and to spell it the way the file does.
   *  Read from the source's own records where it holds them, and from the last run where it does not; empty where
   *  neither has them yet, which is the only case a name must still be typed in. */
  pointChoices:(nodeId:string,port:string)=>{names:string[];total:number;
    features:{name:string;geometry:{type:string;coordinates:unknown}}[]};
  /** What a process step made in the last run, in a few numbers, while that run is current. */
  summary:(nodeId:string)=>Record<string,number|string|undefined>|undefined;
  /** The UTM zone this workflow's coordinates suggest, against the one chosen, and how far the chosen one stretches
   *  distances over them, as a percentage; undefined where nothing on the canvas has a coordinate yet. */
  zoneAdvice:(zone:number,hemisphere:'north'|'south')=>{zone:number;hemisphere:'north'|'south';matches:boolean;positions:number;straddles:number[];stretch:number}|undefined;
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

/** The one point a connected layer offers, where it offers exactly one; otherwise nothing, because choosing
 *  between several is the practitioner's. */
const soleChoice=(kit:AreaStepKit,nodeId:string):string=>{
  const {names}=kit.pointChoices(nodeId,'points');
  return names.length===1?names[0]!:'';
};

/** WHAT THE STEP WILL DO, in the Inspector, saying which of the two things it makes. */
export const bufferSentence=(p:{pointId:string;distanceM:number;yields?:'area'|'polygons'}):string=>{
  const d=`${p.distanceM.toLocaleString('en')} m`;
  const what=p.pointId?`of ${p.pointId}`:'of everything connected';
  return p.yields==='polygons'
    ?`Everything within ${d} ${what}, kept as a separate area around each one.`
    :`Everything within ${d} ${what}, combined into one study area.`;
};

/** THE PICTURE, drawn from the same construction the run uses. Areas and overlaps to scale, so a radius can be
 *  judged against the ground before anything is run -- which is the whole reason the section exists. */
function bufferPreview(kit:AreaStepKit,nodeId:string,d:{pointId:string;distanceM:string;yields:string}):string{
  const {features}=kit.pointChoices(nodeId,'points');
  if(!features.length)return '<p class="muted">Connect points, lines or a polygon layer, and the areas drawn appear here.</p>';
  const wanted=d.pointId.trim();
  const chosen=wanted?features.filter(f=>f.name===wanted):features;
  if(!chosen.length)return '<p class="muted">Nothing connected is called that, so there is nothing to draw.</p>';
  const made=previewBuffers(chosen.map((f,i)=>({id:String(i),name:f.name,geometry:f.geometry})),
    Number(d.distanceM),d.yields!=='polygons');
  if(!made)return '<p class="muted">Give a radius above 0 and the areas appear here.</p>';
  const rings:[number,number][][]=[];
  const collect=(g:{type:string;coordinates:unknown})=>{
    const parts=g.type==='MultiPolygon'?g.coordinates as number[][][][]:[g.coordinates as number[][][]];
    for(const polygon of parts)for(const ring of polygon)rings.push(ring as [number,number][]);
  };
  for(const b of made.each)collect(b.geometry as {type:string;coordinates:unknown});
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const ring of rings)for(const [x,y] of ring){
    if(x<xmin)xmin=x;if(x>xmax)xmax=x;if(y<ymin)ymin=y;if(y>ymax)ymax=y;}
  const cos=Math.cos((ymin+ymax)/2*Math.PI/180)||1;
  const w=Math.max((xmax-xmin)*cos,1e-9),h=Math.max(ymax-ymin,1e-9);
  const box=360,pad=12,scale=Math.min((box-2*pad)/w,(180-2*pad)/h);
  const px=(x:number)=>pad+((x-xmin)*cos)*scale,py=(y:number)=>180-pad-(y-ymin)*scale;
  const path=(ring:[number,number][])=>'M'+ring.map(([x,y])=>`${px(x).toFixed(1)},${py(y).toFixed(1)}`).join('L')+'Z';
  // Each area drawn in its own right and semi-transparent, so where two overlap reads darker: that is the picture
  // the practitioner asked to see, and combining them is the thing that would erase it.
  const drawn=made.each.map(b=>collectPaths(b.geometry as {type:string;coordinates:unknown}).map(path).join(''))
    .map(dd=>`<path d="${dd}" fill="#3f6f55" fill-opacity="0.28" stroke="#2c5340" stroke-width="1"/>`).join('');
  const m2=(v:number)=>v>=1e6?`${(v/1e6).toFixed(1)} km\u00b2`:`${Math.round(v).toLocaleString('en')} m\u00b2`;
  const said=made.combined
    ?`${made.each.length.toLocaleString('en')} areas covering ${m2(made.partsArea)} between them, `
      +`${m2(made.combinedM2!)} once combined into ${made.pieces} piece${made.pieces===1?'':'s'}`
      +(made.overlapM2>=1?`; ${m2(made.overlapM2)} is covered more than once, and combining discards which one reached it.`:'.')
    :`${made.each.length.toLocaleString('en')} area${made.each.length===1?'':'s'}, ${m2(made.partsArea)} between them, kept apart.`;
  return `<svg viewBox="0 0 ${box} 180" width="100%" height="180" role="img" aria-label="The areas this step draws">`
    +`<rect width="${box}" height="180" fill="var(--surface-raised-1)"/>${drawn}</svg>`
    +`<p class="description">${kit.esc(said)} Drawn to scale; the ground beneath is not shown.</p>`;
}
const collectPaths=(g:{type:string;coordinates:unknown}):[number,number][][]=>{
  const parts=g.type==='MultiPolygon'?g.coordinates as number[][][][]:[g.coordinates as number[][][]];
  return parts.flatMap(polygon=>polygon.map(ring=>ring as [number,number][]));
};

export const bufferPointInspector:OwnInspector<'buffer_point'>={
  markup:(n,kit)=>{const k=kit as AreaStepKit,p=n.params;
    return kit.section('Name',kit.name('bp-label',p.label||'Area around a point'))
      +kit.section('Inputs',kit.inputs(n,{points:'Points',lines:'Lines',polygons:'Polygon layer'}))
      +kit.section('Settings',sentence(kit,bufferSentence(p))+configure)
      +kit.section('Result',areaResult(k,n,'The area drawn'));},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog({id:'buffer-point-dialog',widget:'Area around a point',step:node.params.label||'',
        // ONE POINT ARRIVING IS NOT A CHOICE. Where the connected layer offers exactly one and none has been
        // chosen, the dialog opens on it: the practitioner's Mines layer holds a single mine, and asking which
        // one it is is asking them to type back what the wire already says. Several, and they pick.
        draft:{pointId:node.params.pointId||soleChoice(kit as AreaStepKit,node.id),distanceM:String(node.params.distanceM),
          yields:node.params.yields==='polygons'?'polygons':'area'},
        sections:d=>{const m=Number(d.distanceM),ok=Number.isFinite(m)&&m>0&&m<=MAX_BUFFER_M;
          const edge=kit.workflow().edges.find(e=>e.to===n.id&&e.port==='points');
          const from=edge&&kit.workflow().nodes.find(x=>x.id===edge.from);
          const layer=from?(from.params.label||'the connected layer'):'';
          const {names,total}=(kit as AreaStepKit).pointChoices(n.id,'points');
          // The chosen point is kept on the list even where the layer no longer offers it, so opening this dialog
          // on an old workflow shows what it says rather than silently standing for something else.
          const options=d.pointId&&!names.includes(d.pointId)?[d.pointId,...names]:names;
          // A SELECT SHOWING A NAME THE STEP DOES NOT HOLD would read as an answer while the dialog refuses, so
          // where none is chosen the first entry says so and carries no value.
          const label=layer?`What in ${layer} the area is drawn around`:'What the area is drawn around, by its name or id';
          return {settings:`<div class="field"><label class="field-label" for="bp-point">${kit.esc(label)}</label>`
            +(options.length
              // EVERY FEATURE IS THE DEFAULT now that several are supported (2026-11-23). It used to refuse until
              // one was named, which was the only behaviour a single-feature step could have.
              ?`<select id="bp-point"><option value=""${!d.pointId?' selected':''}>Every one of them (${options.length.toLocaleString('en')})</option>`
                +`${options.map(name=>`<option value="${kit.esc(name)}"${name===d.pointId?' selected':''}>${kit.esc(name)}</option>`).join('')}</select>`
                +(total>options.length?`<p class="description">${total.toLocaleString('en')} points arrive here; the first ${options.length.toLocaleString('en')} are listed.</p>`:'')
              // NOTHING TO OFFER YET: a source that holds no records of its own and has not run. The name is typed
              // in, as it always was, rather than the step pretending to a list it does not have.
              :`<input id="bp-point" maxlength="80" value="${kit.esc(d.pointId)}" placeholder="MANILA">`
                +`<p class="description">Run the workflow once and this step will offer the points by name.</p>`)
            +`</div>`
            +`<div class="field"><label class="field-label" for="bp-distance">Radius in metres</label>`
            +`<input id="bp-distance" type="number" min="0" max="${MAX_BUFFER_M}" step="100" value="${kit.esc(d.distanceM)}">`
            // THE RADIUS IS EVIDENCE, NOT A PREFERENCE (2026-11-23, the practitioner: *"The radius cap (buffer) is
            // really going to be based on evidence, for example how far do bats travel from their roosts"*). The
            // step cannot know the evidence, so it does not pretend to; it says what the number means and leaves
            // the number to the practitioner, who states its source in the write-up.
            +`<p class="description">Up to ${MAX_BUFFER_M.toLocaleString('en')} m. The radius is a claim about reach \u2014 how far something travels, how far a service draws \u2014 so give the figure your evidence supports and say where it came from in Methods.</p></div>`
            +`<div class="field"><label class="field-label" for="bp-yields">Where several areas are drawn</label>`
            +`<select id="bp-yields">`
            +`<option value="area"${d.yields!=='polygons'?' selected':''}>Combine them into one study area</option>`
            +`<option value="polygons"${d.yields==='polygons'?' selected':''}>Keep each one separate, as a polygon layer</option>`
            +`</select><p class="description">Combined, the answer is whether ground is within reach of any of them, and which one reached it is discarded. Kept apart, two overlapping areas still say two things reach the same ground. Only a study area can be connected to the clip, the street network or a facility search.</p></div>`,
            preview:bufferPreview(kit as AreaStepKit,n.id,d)+showMe,blocked:!ok,
            ...(!ok?{message:{tone:'refusal' as const,text:`Give a radius above 0 and up to ${MAX_BUFFER_M.toLocaleString('en')} metres.`}}:{})};},
        wire:(root,d,redraw)=>{
          root.querySelector<HTMLInputElement|HTMLSelectElement>('#bp-point')!.onchange=
            e=>{d.pointId=(e.target as HTMLInputElement|HTMLSelectElement).value;redraw();};
          root.querySelector<HTMLInputElement>('#bp-distance')!.onchange=e=>{d.distanceM=(e.target as HTMLInputElement).value;redraw();};
          root.querySelector<HTMLSelectElement>('#bp-yields')!.onchange=e=>{d.yields=(e.target as HTMLSelectElement).value;redraw();};
          showMeIn(root,kit,()=>bufferPointWalkthrough(Number(d.distanceM)));},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='buffer_point'){
          t.params.pointId=d.pointId.trim();t.params.distanceM=Number(d.distanceM);
          t.params.yields=d.yields==='polygons'?'polygons':'area';}}),
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

/** KEEP POINTS INSIDE THE AREA AND SUMMARIZE POINTS TO POLYGONS ON THE STANDARD (2026-11-22), moved here from app.ts and
 *  catchment-ui.ts when Show me how was added to each (TODO 6, the practitioner's rule for any widget touched). */
const ran=(kit:InspectorKit,n:WorkflowNode)=>{const k=kit as AreaStepKit,said=k.current()?k.method(n.id):undefined;
  return said?`<p class="standard-result">${kit.esc(said)}</p>`:'<p class="notice">Not run yet, or changed since the last run.</p>';};
/** WHAT THE CLIP WILL KEEP, counted before it runs. The practitioner, 2026-11-23, of a Preview section holding only
 *  a generic walkthrough: *"This one still does not have a preview."* The counts ARE this step's result, and the
 *  checkbox above them moves records between kept and set aside, so the preview is the one place the setting can be
 *  judged. Computed with `clipPointsToArea` itself, so what is previewed is what the step does.
 *
 *  Only where both sides are already on the device: the area a study area holds, or one a run produced, and the
 *  points a source holds. Where either is missing the section says so rather than implying nothing falls inside. */
function clipPreview(kit:AreaStepKit,n:WorkflowNode,keepBoundary:boolean):string{
  const edges=kit.workflow().edges.filter(e=>e.to===n.id);
  const areaFrom=edges.find(e=>e.port==='area')?.from,pointsFrom=edges.find(e=>e.port==='points')?.from;
  if(!areaFrom||!pointsFrom)
    return '<p class="muted">Connect a study area and the points, and what the clip keeps is counted here.</p>';
  const node=kit.workflow().nodes.find(x=>x.id===areaFrom);
  const boundary=(kit.current()?kit.output(areaFrom)?.boundary:undefined)
    ??(node?.params as {geometry?:import('./types.js').Boundary}|undefined)?.geometry;
  const {features}=kit.pointChoices(n.id,'points');
  if(!boundary||!features.length)
    return `<p class="muted">${!boundary?'The area is drawn when the workflow runs, and':'The points arrive when the workflow runs, and'} the counts appear here then.</p>`;
  const points={type:'FeatureCollection' as const,
    features:features.map((f,i)=>({type:'Feature' as const,id:String(i),properties:{name:f.name},
      geometry:f.geometry as {type:'Point';coordinates:[number,number]}}))};
  let counted;
  try{counted=clipPointsToArea(points as never,boundary,keepBoundary);}catch{return '';}
  const total=counted.inside+counted.boundary+counted.outside+counted.missing;
  const n0=(v:number)=>v.toLocaleString('en');
  return `<p class="standard-result"><strong>${n0(counted.collection.features.length)} of ${n0(total)} kept.</strong> `
    +`${n0(counted.inside)} inside` 
    +(counted.boundary?`, ${n0(counted.boundary)} exactly on the outline (${keepBoundary?'kept':'set aside'})`:'')
    +`, ${n0(counted.outside)} outside`
    +(counted.missing?`, ${n0(counted.missing)} with no usable location`:'')
    +'.</p>';
}

export const clipPointsInspector:OwnInspector<'clip_points_to_area'>={
  markup:(n,kit)=>{const p=n.params,keep=p.keepBoundary!==false;
    return kit.section('Name',kit.name('clip-points-label',p.label||'Points inside the area'))
      +kit.section('Inputs',kit.inputs(n,{area:'The study area',points:'The points to keep or set aside'}))
      +kit.section('Settings',sentence(kit,`Keeps the points inside the study area${keep?', and those exactly on its outline':'; those exactly on its outline are set aside'}. `
        +`Points outside, and records with no location, are counted apart${p.showExcluded!==false?', and those outside are drawn faint on a connected map':''}.`)+configure)
      +kit.section('Result',ran(kit,n));},
  wire:(n,kit,root)=>{
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      openConfigDialog({id:'clip-points-dialog',widget:'Keep points inside the area',step:node.params.label||'',
        draft:{keepBoundary:node.params.keepBoundary!==false,showExcluded:node.params.showExcluded!==false},
        sections:d=>({preview:clipPreview(kit as AreaStepKit,n,d.keepBoundary)+showMe,
          settings:`<label class="field-option"><input type="checkbox" id="clip-points-boundary"${d.keepBoundary?' checked':''}> Keep points that sit exactly on the outline</label>`
          +`<label class="field-option"><input type="checkbox" id="clip-points-excluded"${d.showExcluded?' checked':''}> Show the points set aside, faint, on a connected map</label>`}),
        wire:(root2,d,redraw)=>{
          root2.querySelector<HTMLInputElement>('#clip-points-boundary')!.onchange=e=>{d.keepBoundary=(e.target as HTMLInputElement).checked;redraw();};
          root2.querySelector<HTMLInputElement>('#clip-points-excluded')!.onchange=e=>{d.showExcluded=(e.target as HTMLInputElement).checked;redraw();};
          showMeIn(root2,kit,()=>clipPointsWalkthrough(d.keepBoundary));},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='clip_points_to_area'){t.params.keepBoundary=d.keepBoundary;t.params.showExcluded=d.showExcluded;}}),
      },kit.esc);
    });
  },
};
export const summarizePointsInspector:OwnInspector<'summarize_points_to_polygon'>={
  markup:(n,kit)=>{const p=n.params,field=p.valueField?.trim();
    return kit.section('Name',kit.name('summarize-label',p.label||'Summarize points to polygons'))
      +kit.section('Inputs',kit.inputs(n,{polygons:'The polygons to count in',points:'The points to count'}))
      +kit.section('Settings',sentence(kit,`Counts the points in each polygon${field?` and adds their ${field}`:''}. `
        +(p.boundary==='include'?'A point on an edge is counted in every polygon it touches.':'A point on an edge is counted in none.')
        +(field?` A point with no ${field} is counted, its value counted apart.`:''))+configure)
      +kit.section('Result',ran(kit,n));},
  wire:(n,kit,root)=>{const k=kit as AreaStepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const node=nodeIn(kit,n);if(!node)return;
      const fields=k.numericFields(n.id,'points');
      openConfigDialog({id:'summarize-points-dialog',widget:'Summarize points to polygons',step:node.params.label||'',
        draft:{boundary:node.params.boundary,valueField:node.params.valueField??''},
        sections:d=>({settings:`<div class="field"><label class="field-label" for="summarize-boundary">A point on a polygon's edge</label>`
          +`<select id="summarize-boundary"><option value="include"${d.boundary==='include'?' selected':''}>Counted in every polygon it touches</option>`
          +`<option value="exclude"${d.boundary==='exclude'?' selected':''}>Counted in none</option></select></div>`
          +`<div class="field"><label class="field-label" for="summarize-value">A number to add up (optional)</label>`
          +(fields.length?`<select id="summarize-value"><option value="">None: count the points only</option>${[...new Set([...fields,...(d.valueField&&!fields.includes(d.valueField)?[d.valueField]:[])])].map(f=>`<option value="${kit.esc(f)}"${f===d.valueField?' selected':''}>${kit.esc(f)}</option>`).join('')}</select>`
            :`<input id="summarize-value" maxlength="100" value="${kit.esc(d.valueField)}" placeholder="for example deaths">`)
          +'<small>A missing or non-numeric value is counted apart, never as 0.</small></div>',preview:showMe}),
        wire:(root2,d,redraw)=>{
          root2.querySelector<HTMLSelectElement>('#summarize-boundary')!.onchange=e=>{d.boundary=(e.target as HTMLSelectElement).value as 'include'|'exclude';redraw();};
          root2.querySelector<HTMLInputElement|HTMLSelectElement>('#summarize-value')!.onchange=e=>{d.valueField=(e.target as HTMLInputElement).value.trim();redraw();};
          showMeIn(root2,kit,()=>summarizePointsWalkthrough(d.boundary,d.valueField));},
        apply:d=>kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='summarize_points_to_polygon'){t.params.boundary=d.boundary;t.params.valueField=d.valueField;}}),
      },kit.esc);
    });
  },
};

export const AREA_STEP_INSPECTORS={buffer_point:bufferPointInspector,
  measure_area:measureAreaInspector,clip_polygons:clipPolygonsInspector,
  clip_points_to_area:clipPointsInspector,summarize_points_to_polygon:summarizePointsInspector,
  ...METRIC_STEP_INSPECTORS,...GEOPRIVACY_INSPECTORS} as const;
