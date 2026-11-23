/** LINE LAYER, ON THE STANDARD (experiment 229): the name, the inputs where it is a border, one sentence, Configure… and
 *  what the last run made. Every setting is in the dialog: where the lines come from, the file read, or the two areas and
 *  the distance within which their outlines count as one border, with the lines drawn After. Nothing reaches the workflow
 *  until Apply. */
import type {Boundary,Escape,LineLayer,ParamsByType,Workflow} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {readLinesGpx,readLinesKml,readLinesKmz,readLinesGeoJson,sharedBorder,lineSentence,lengthKm,BORDER_TOLERANCE_M} from './line-layer.js';

type Params=ParamsByType['line_input'];
export type LineDraft=Omit<Params,'label'>;
interface Area {label:string;boundary:Boundary}
export interface LineKit extends StepKit {
  /** The study areas on the step's two inputs, as drawn or acquired, where they are connected. */
  areasOn:(nodeId:string)=>{area?:Area;area_2?:Area};
  /** What the last run made: its lines and their length. */
  summary:(nodeId:string)=>Record<string,number|string|undefined>|undefined;
}
const km=(x:number)=>x<10?x.toFixed(2):Math.round(x).toLocaleString('en');

/** A file of lines, read by its extension. */
export async function readLineFile(file:File):Promise<LineLayer>{
  const name=file.name.toLowerCase();
  if(name.endsWith('.gpx'))return readLinesGpx(await file.text());
  if(name.endsWith('.kml'))return readLinesKml(await file.text());
  if(name.endsWith('.kmz'))return readLinesKmz(new Uint8Array(await file.arrayBuffer()));
  if(name.endsWith('.geojson')||name.endsWith('.json')){
    let raw:unknown;try{raw=JSON.parse(await file.text());}catch{throw new Error('This file is not JSON: it does not parse.');}
    return readLinesGeoJson(raw);}
  throw new Error('Choose a GPX, KML, KMZ or GeoJSON file.');
}

/** What the step does, in one sentence. */
export function lineSettingsSentence(p:Pick<Params,'inputMethod'|'data'|'file'|'toleranceM'>,areas:{area?:Area;area_2?:Area}={}):string{
  if(p.inputMethod==='border'){
    const d=(p.toleranceM??BORDER_TOLERANCE_M).toLocaleString('en');
    return areas.area&&areas.area_2?`The border of ${areas.area.label} and ${areas.area_2.label}: where their outlines lie within ${d} m of each other.`
      :`The border of the two study areas connected, where their outlines lie within ${d} m of each other.`;}
  return p.data?`${p.file?`${p.file}: `:''}${lineSentence(p.data)}`:'Lines read from a GPX, KML, KMZ or GeoJSON file, once one is chosen in Configure….';
}

/** THE LINES DRAWN, with the areas' outlines under them where there are any: a small figure for the dialog. */
export function linesPreviewSvg(lines:LineLayer|undefined,outlines:Boundary[],esc:Escape,label:string):string{
  const parts=(lines?.features??[]).flatMap(f=>f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates);
  const rings=outlines.flatMap(b=>(b.type==='Polygon'?[b.coordinates]:b.coordinates).flat() as [number,number][][]);
  const all=[...parts.flat(),...rings.flat()];
  if(!all.length)return '';
  let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;
  for(const [x,y] of all){if(x<w)w=x;if(x>e)e=x;if(y<s)s=y;if(y>n)n=y;}
  const cos=Math.cos((s+n)/2*Math.PI/180),W=560,span=Math.max((e-w)*cos,n-s,1e-9),k=(W-24)/span,H=Math.max(120,Math.min(420,(n-s)*k+24));
  const at=([x,y]:[number,number])=>`${(12+(x-w)*cos*k).toFixed(1)},${(H-12-(y-s)*k).toFixed(1)}`;
  const path=(ps:[number,number][][],close:boolean)=>ps.map(p=>'M'+p.map(at).join('L')+(close?'Z':'')).join('');
  return `<figure class="line-preview"><svg viewBox="0 0 ${W} ${H.toFixed(0)}" role="img" aria-label="${esc(label)}">`
    +(rings.length?`<path d="${path(rings,true)}" class="line-preview-area"/>`:'')
    +(parts.length?`<path d="${path(parts,false)}" class="line-preview-line"/>`:'')+'</svg></figure>';
}

interface LineView {step:string;initial:LineDraft;areas:{area?:Area;area_2?:Area};apply:(d:LineDraft)=>void}

export function openLineConfig(view:LineView,esc:Escape):void{
  const draft:LineDraft={...view.initial};
  let error='';
  openConfigDialog<LineDraft>({
    id:'line-config',widget:'Line layer',step:view.step,draft,wide:true,
    sections:d=>{
      const method=`<div class="field"><label class="field-label" for="line-method">Where the lines come from</label><select id="line-method">`
        +`<option value="file"${d.inputMethod==='file'?' selected':''}>A file: GPX, KML, KMZ or GeoJSON</option>`
        +`<option value="border"${d.inputMethod==='border'?' selected':''}>The border of two study areas</option></select></div>`;
      if(d.inputMethod==='file'){
        const settings=method+`<div class="field"><label class="field-label" for="line-file">File</label>`
          +`<input id="line-file" type="file" accept=".gpx,.kml,.kmz,.geojson,.json">`
          +`<small>Tracks and routes from a GPS device or phone app, lines from Google Earth, or a GeoJSON of roads. Points and areas in it are counted and left out.</small></div>`;
        if(error)return {settings,message:{tone:'refusal' as const,text:error},blocked:true};
        if(!d.data)return {settings,message:{tone:'warning' as const,text:'Choose a file of lines.'},blocked:true};
        const after=`<fieldset class="line-after"><legend>After</legend><p data-line-sentence>${esc(lineSettingsSentence(d))}</p>`
          +linesPreviewSvg(d.data,[],esc,'The lines read')
          +'<div class="table-scroll"><table><thead><tr><th scope="col">Line</th><th scope="col">Length, km</th></tr></thead><tbody>'
          +d.data.features.slice(0,500).map(f=>`<tr><td>${esc(f.properties.name)}</td><td>${km(lengthKm(f))}</td></tr>`).join('')+'</tbody></table></div></fieldset>';
        return {settings,preview:after,...(d.data.features.length?{}:{message:{tone:'refusal' as const,text:'This file holds no line of two positions or more.'},blocked:true})};
      }
      const tolerance=d.toleranceM??BORDER_TOLERANCE_M,{area,area_2}=view.areas;
      const settings=method+`<div class="field"><label class="field-label" for="line-tolerance">Outlines within, metres</label>`
        +`<input id="line-tolerance" type="number" min="1" max="10000" step="any" value="${d.toleranceM??''}" placeholder="${BORDER_TOLERANCE_M}">`
        +`<small>Two countries’ outlines, drawn apart, rarely meet exactly. ${BORDER_TOLERANCE_M} m found the whole of Rwanda’s border with DR Congo; more takes in nothing that is not border.</small></div>`;
      if(!area||!area_2)return {settings,message:{tone:'warning' as const,text:'Connect two study areas to this step on the canvas: its border is where they meet.'}};
      const before=`<fieldset class="line-before"><legend>Before</legend><p>${esc(area.label)} and ${esc(area_2.label)}</p>`
        +linesPreviewSvg(undefined,[area.boundary,area_2.boundary],esc,'The two study areas')+'</fieldset>';
      let stretches:[number,number][][];
      try{stretches=sharedBorder(area.boundary,area_2.boundary,tolerance);}
      catch(e){return {settings,preview:before,message:{tone:'refusal' as const,text:e instanceof Error?e.message:String(e)},blocked:true};}
      const layer:LineLayer={kind:'lines',source:'border',features:stretches.map((coordinates,i)=>({type:'Feature',id:`border-${i+1}`,
        properties:{name:`${i+1}`},geometry:{type:'LineString',coordinates}}))};
      const total=layer.features.reduce((t,f)=>t+lengthKm(f),0);
      const after=`<fieldset class="line-after"><legend>After</legend><p data-line-sentence>${stretches.length
        ?`${stretches.length} ${stretches.length===1?'stretch':'stretches'} of border, ${km(total)} km in all.`
        :`${esc(area.label)} and ${esc(area_2.label)} do not meet within ${tolerance.toLocaleString('en')} m.`}</p>`
        +linesPreviewSvg(layer,[area.boundary,area_2.boundary],esc,'The border, over the two study areas')+'</fieldset>';
      return {settings,preview:before+after,...(stretches.length?{}:{message:{tone:'warning' as const,text:'No border at this distance: widen it, or check the two areas are neighbours.'}})};
    },
    wire:(root,d,redraw)=>{
      root.querySelector<HTMLSelectElement>('#line-method')?.addEventListener('change',e=>{d.inputMethod=(e.target as HTMLSelectElement).value as LineDraft['inputMethod'];error='';redraw();});
      root.querySelector<HTMLInputElement>('#line-tolerance')?.addEventListener('change',e=>{const raw=(e.target as HTMLInputElement).value.trim();
        if(raw==='')delete d.toleranceM;else d.toleranceM=Number(raw);redraw();});
      root.querySelector<HTMLInputElement>('#line-file')?.addEventListener('change',async e=>{
        const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
        try{d.data=await readLineFile(file);d.file=file.name;error='';}catch(err){delete d.data;delete d.file;error=err instanceof Error?err.message:String(err);}
        redraw();});
    },
    apply:d=>view.apply(d),
  },esc);
}

/** A file's layer is kept; a border's lines are made at run time from the areas, so none is stored with it. */
function kept(d:LineDraft):LineDraft{
  return d.inputMethod==='border'?{inputMethod:'border',...(d.toleranceM!==undefined?{toleranceM:d.toleranceM}:{})}
    :{inputMethod:'file',...(d.data?{data:d.data}:{}),...(d.file?{file:d.file}:{})};
}

export const lineInspector:OwnInspector<'line_input'>={
  markup:(node,kit)=>{const k=kit as LineKit,p=node.params,why=k.unfinished(node.id),made=k.summary(node.id);
    const result=why?`The last run could not make this layer: ${why}`
      :made?`${made.lines} ${made.lines===1?'line':'lines'}, ${made.km} km in all.`:'Not run yet.';
    return kit.section('Name',kit.name('line-label',p.label||k.title('line_input')))
      +(p.inputMethod==='border'?kit.section('Inputs',kit.inputs(node,{area:'A study area',area_2:'The study area it borders'})):'')
      +kit.section('Settings',`<p class="standard-sentence">${kit.esc(lineSettingsSentence(p,k.areasOn(node.id)))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${kit.esc(result)}</p>`);},
  wire:(node,kit,root)=>{const k=kit as LineKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const w=kit.workflow(),now=w.nodes.find(x=>x.id===node.id);
      if(now?.type!=='line_input')return;
      const {label,...initial}=now.params;void label;
      openLineConfig({step:now.params.label||k.title('line_input'),initial,areas:k.areasOn(node.id),
        apply:d=>k.keep((w2:Workflow)=>{const t=w2.nodes.find(x=>x.id===node.id);if(t?.type!=='line_input')return;
          t.params={label:t.params.label,...kept(d)};
          // A FILE TAKES NO AREAS: what was connected to the border's inputs is let go, so no edge points at a port gone.
          if(d.inputMethod==='file')w2.edges=w2.edges.filter(e=>!(e.to===node.id&&(e.port==='area'||e.port==='area_2')));})},kit.esc);
    });
  },
};
