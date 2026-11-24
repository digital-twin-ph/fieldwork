/** LINE LAYER, ON THE STANDARD (experiment 229): the name, the inputs where it is a border, one sentence, Configure… and
 *  what the last run made. Every setting is in the dialog: where the lines come from, the file read, or the two areas and
 *  the distance within which their outlines count as one border, with the lines drawn After. Nothing reaches the workflow
 *  until Apply. */
import type {Boundary,Escape,LineLayer,ParamsByType,Workflow} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {readLinesGpx,readLinesKml,readLinesKmz,readLinesGeoJson,sharedBorder,lineSentence,lengthKm,BORDER_TOLERANCE_M} from './line-layer.js';
import {type DrawnLine,addVertex,finishLine,reverseLine,endsOf,drawnLayer,linesFromLayer,LINE_MINIMUM} from './line-draw.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {rasterBasemap,PIN_BASEMAPS,BASEMAP_LABELS} from './catchment-map.js';
import {arrowIconSvg,endBearing} from './map-lines.js';
import type {BasemapChoice} from './basemaps.js';

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
  if(p.inputMethod==='drawn')
    return p.data?.features.length
      ?`${lineSentence(p.data)} Each is drawn in the direction it was clicked, so a flow is not the same the other way.`
      :'Routes and flows drawn on a map, once they are drawn in Configure….';
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

/** THE DRAWING SURFACE. Held in module state for the life of one dialog, because `redraw()` rewrites the markup
 *  and would take a Leaflet map with it: the map is mounted once by `wire` and everything it shows afterwards is
 *  written straight to the DOM, as the pin editor does for the same reason. */
let drawing:{lines:DrawnLine[];pending:[number,number][];selected:string|null;refused:string}=
  {lines:[],pending:[],selected:null,refused:''};
let drawnMap:L.Map|null=null;
/** The observer that keeps the map the size of its container. Disconnected with the map it belongs to, so a dialog
 *  reopened or a method changed does not leave one watching a host that is gone. */
let drawnFit:ResizeObserver|null=null;

/** The settings and the picture, for a layer drawn by hand. */
function drawnSections(d:LineDraft,method:string,esc:Escape){
  const settings=method
    +'<div class="field"><p class="description">Click the map to lay down a route or a flow, one position at a '
    +'time, then <strong>Finish the line</strong>. The order you click is the direction: a flow drawn from a camp '
    +'to a clinic is not the same as one drawn the other way, and <strong>Reverse</strong> turns it round.</p></div>'
    +`<div class="field"><label class="field-label" for="line-basemap">Basemap</label><select id="line-basemap">`
    +PIN_BASEMAPS.map(b=>`<option value="${b}">${esc(BASEMAP_LABELS[b])}</option>`).join('')+'</select></div>'
    +'<div id="line-map" style="height:380px"></div>'
    +'<div class="inspector-actions">'
    +'<button id="line-finish" class="button small" type="button">Finish the line</button>'
    +'<button id="line-undo" class="button small" type="button">Undo the last position</button>'
    +'<button id="line-reverse" class="button small" type="button">Reverse the selected line</button>'
    +'<button id="line-remove" class="button small danger" type="button">Delete the selected line</button></div>'
    +'<p id="line-draw-status" role="status" class="description"></p>'
    +`<div class="field"><label class="field-label" for="line-name">Name of the selected line</label>`
    +'<input id="line-name" maxlength="80" placeholder="Team 1, day 1"></div>';
  return {settings,preview:`<fieldset class="line-after"><legend>After</legend>`
    +`<p data-line-sentence>${esc(lineSettingsSentence(d))}</p>`
    +'<div class="table-scroll"><table><thead><tr><th scope="col">Line</th><th scope="col">Positions</th>'
    +'<th scope="col">Length, km</th></tr></thead><tbody data-line-rows></tbody></table></div></fieldset>'};
}

/** AN ARROWHEAD AT A LINE'S END, in screen pixels and pointing the way the line runs. The bearing is taken in layer
 *  points, where the line is actually drawn, so the head does not lean away from its own line far from the equator.
 *  Nothing is drawn where the last segment has no length: there is no direction to point in. */
function arrowAt(vertices:readonly [number,number][],colour:string,title:string):void{
  const map=drawnMap;if(!map)return;
  const angle=endBearing(vertices,v=>map.latLngToLayerPoint(L.latLng([v[1],v[0]])));
  if(angle===null)return;
  const end=vertices[vertices.length-1]!;
  const m=L.marker(L.latLng([end[1],end[0]]),{interactive:false,keyboard:false,
    icon:L.divIcon({className:'line-arrow',iconSize:[20,20],iconAnchor:[10,10],html:arrowIconSvg(angle,colour)})});
  (m as {_fwDrawn?:boolean})._fwDrawn=true;m.bindTooltip(title);m.addTo(map);
}

/** What the map shows: every finished line with its start, the way it runs, and the one being drawn. */
function paintDrawn(esc:Escape):void{
  if(!drawnMap)return;
  drawnMap.eachLayer(l=>{if((l as {_fwDrawn?:boolean})._fwDrawn)drawnMap!.removeLayer(l);});
  const mark=(at:[number,number],fill:string,title:string)=>{
    const m=L.circleMarker([at[1],at[0]],{radius:5,color:'#1d4ed8',weight:2,fillColor:fill,fillOpacity:1});
    (m as {_fwDrawn?:boolean})._fwDrawn=true;m.bindTooltip(title);m.addTo(drawnMap!);};
  for(const line of drawing.lines){
    const chosen=line.id===drawing.selected;
    const poly=L.polyline(line.vertices.map(v=>[v[1],v[0]] as [number,number]),
      {color:chosen?'#1d4ed8':'#3f6f55',weight:chosen?5:3,opacity:0.9});
    (poly as {_fwDrawn?:boolean})._fwDrawn=true;
    poly.bindTooltip(esc(line.name));
    poly.on('click',()=>{drawing.selected=line.id;paintDrawn(esc);syncDrawn(esc);});
    poly.addTo(drawnMap);
    const ends=endsOf(line);
    // THE DIRECTION, SHOWN: hollow where the line starts, an arrowhead where it ends. A flow nobody can read the
    // direction of is a flow drawn wrong half the time.
    //
    // AN ARROWHEAD RATHER THAN A SECOND DOT (2026-11-24): the same mark the Map draws when its Configure dialog is
    // set to mark direction. The editor is where direction is decided, so it should read the way the figure will,
    // and two indications of one thing is clutter -- the filled end dot it replaces is gone.
    if(ends){
      mark(ends.from,'#ffffff',`${line.name}: from here`);
      arrowAt(line.vertices,chosen?'#1d4ed8':'#3f6f55',`${line.name}: to here`);
    }
  }
  if(drawing.pending.length){
    const poly=L.polyline(drawing.pending.map(v=>[v[1],v[0]] as [number,number]),
      {color:'#b45309',weight:4,dashArray:'6 4'});
    (poly as {_fwDrawn?:boolean})._fwDrawn=true;poly.addTo(drawnMap);
    for(const v of drawing.pending)mark(v,'#b45309','Being drawn');
  }
}

/** The sentence, the table and the name field, written straight to the DOM so no redraw unmounts the map. */
function syncDrawn(esc:Escape,d?:LineDraft):void{
  const root=document.querySelector('#line-config');if(!root)return;
  if(d)d.data=drawnLayer(drawing.lines);
  const said=root.querySelector('[data-line-sentence]');
  if(said&&d)said.textContent=lineSettingsSentence(d);
  const rows=root.querySelector('[data-line-rows]');
  if(rows)rows.innerHTML=drawing.lines.map(l=>{
    const layer=drawnLayer([l]).features[0];
    return `<tr${l.id===drawing.selected?' class="is-open"':''}><td>${esc(l.name)}</td>`
      +`<td>${l.vertices.length}</td><td>${layer?km(lengthKm(layer)):'0'}</td></tr>`;}).join('');
  const name=root.querySelector<HTMLInputElement>('#line-name');
  const chosen=drawing.lines.find(l=>l.id===drawing.selected);
  if(name)name.value=chosen?chosen.name:'';
  const status=root.querySelector('#line-draw-status');
  // A REFUSAL IS WHAT THE READER NEEDS, so it survives the running commentary that follows it. Written and then
  // immediately overwritten by this very line until 2026-11-24, which made "Finish the line" look like it did
  // nothing when it had said exactly why it would not.
  if(status&&drawing.refused){status.textContent=drawing.refused;return;}
  if(status)status.textContent=drawing.pending.length
    ?`${drawing.pending.length} position${drawing.pending.length===1?'':'s'} so far; ${LINE_MINIMUM} are needed.`
    :drawing.lines.length?`${drawing.lines.length} line${drawing.lines.length===1?'':'s'} drawn. Click the map to start another.`
    :'Click the map to start a line.';
}

interface LineView {step:string;initial:LineDraft;areas:{area?:Area;area_2?:Area};apply:(d:LineDraft)=>void}

export function openLineConfig(view:LineView,esc:Escape):void{
  const draft:LineDraft={...view.initial};
  // ONE DIALOG, ONE DRAWING. Opened again, it starts from the lines the step holds rather than from whatever the
  // last dialog left in module state.
  drawnMap=null;drawnFit?.disconnect();drawnFit=null;
  drawing={lines:view.initial.inputMethod==='drawn'?linesFromLayer(view.initial.data):[],pending:[],selected:null,refused:''};
  let error='';
  openConfigDialog<LineDraft>({
    id:'line-config',widget:'Line layer',step:view.step,draft,wide:true,
    sections:d=>{
      const method=`<div class="field"><label class="field-label" for="line-method">Where the lines come from</label><select id="line-method">`
        +`<option value="file"${d.inputMethod==='file'?' selected':''}>A file: GPX, KML, KMZ or GeoJSON</option>`
        +`<option value="border"${d.inputMethod==='border'?' selected':''}>The border of two study areas</option>`
        +`<option value="drawn"${d.inputMethod==='drawn'?' selected':''}>Drawn on a map: routes and flows you observed</option></select></div>`;
      if(d.inputMethod==='drawn')return drawnSections(d,method,esc);
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
      root.querySelector<HTMLSelectElement>('#line-method')?.addEventListener('change',e=>{
        d.inputMethod=(e.target as HTMLSelectElement).value as LineDraft['inputMethod'];error='';
        drawnMap=null;drawnFit?.disconnect();drawnFit=null;
        if(d.inputMethod==='drawn')drawing={lines:linesFromLayer(d.data),pending:[],selected:null,refused:''};
        redraw();});
      // THE MAP, MOUNTED ONCE. Everything after this writes to the DOM rather than calling redraw(), which would
      // rewrite the markup and take the map with it.
      const host=root.querySelector<HTMLElement>('#line-map');
      if(host&&d.inputMethod==='drawn'&&!drawnMap){
        const map=L.map(host,{center:[3,29.6],zoom:6,zoomAnimation:false,fadeAnimation:false,doubleClickZoom:false});
        drawnMap=map;
        let tiles=rasterBasemap('osm' as BasemapChoice).layer;
        if(tiles)tiles.addTo(map);
        root.querySelector<HTMLSelectElement>('#line-basemap')?.addEventListener('change',ev=>{
          if(tiles)map.removeLayer(tiles);
          tiles=rasterBasemap((ev.target as HTMLSelectElement).value as BasemapChoice).layer;
          if(tiles)tiles.addTo(map);});
        // THE MAP IS LAID OUT AFTER IT IS MOUNTED (2026-11-24). Reported as *"Line layer basemap does not show in
        // configure dialog"*: the dialog's panel has no size yet when `wire` runs, so Leaflet measured a container of
        // nothing and asked for one tile, which is the fragment in the corner with grey around it. The pin editor and
        // the georeference dialog each settle their maps the same way -- an observer for every later layout change,
        // full screen among them, and two frames for the first.
        const fit=new ResizeObserver(()=>{if(drawnMap===map)map.invalidateSize({pan:false});});
        fit.observe(host);
        drawnFit?.disconnect();drawnFit=fit;
        requestAnimationFrame(()=>requestAnimationFrame(()=>{if(drawnMap===map)map.invalidateSize({pan:false});}));
        map.on('click',ev=>{
          drawing.refused='';
          drawing.pending=addVertex(drawing.pending,[ev.latlng.lng,ev.latlng.lat]);
          paintDrawn(esc);syncDrawn(esc,d);});
        // Where lines are already drawn, the map opens on them rather than on a default somewhere else.
        const all=drawing.lines.flatMap(l=>l.vertices);
        if(all.length)map.fitBounds(L.latLngBounds(all.map(v=>[v[1],v[0]] as [number,number])).pad(0.2));
        paintDrawn(esc);syncDrawn(esc,d);
      }
      const act=(sel:string,f:()=>void)=>root.querySelector<HTMLButtonElement>(sel)
        ?.addEventListener('click',()=>{f();paintDrawn(esc);syncDrawn(esc,d);});
      act('#line-finish',()=>{
        const made=finishLine(drawing.lines,drawing.pending);
        if('refused' in made){drawing.refused=made.refused;return;}
        drawing.refused='';
        drawing.lines=made.lines;drawing.selected=made.lines[made.lines.length-1]!.id;drawing.pending=[];});
      act('#line-undo',()=>{
        if(drawing.pending.length){drawing.pending=drawing.pending.slice(0,-1);return;}
        // Nothing half-drawn: the last FINISHED line is taken back up for more, rather than the click doing nothing.
        const last=drawing.lines[drawing.lines.length-1];
        if(last){drawing.pending=[...last.vertices];drawing.lines=drawing.lines.slice(0,-1);drawing.selected=null;}});
      act('#line-reverse',()=>{drawing.lines=drawing.lines.map(l=>l.id===drawing.selected?reverseLine(l):l);});
      act('#line-remove',()=>{drawing.lines=drawing.lines.filter(l=>l.id!==drawing.selected);drawing.selected=null;});
      root.querySelector<HTMLInputElement>('#line-name')?.addEventListener('change',e=>{
        const value=(e.target as HTMLInputElement).value.trim();
        if(!value||!drawing.selected)return;
        drawing.lines=drawing.lines.map(l=>l.id===drawing.selected?{...l,name:value}:l);
        paintDrawn(esc);syncDrawn(esc,d);});
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
  if(d.inputMethod==='border')return {inputMethod:'border',...(d.toleranceM!==undefined?{toleranceM:d.toleranceM}:{})};
  // A DRAWN LAYER KEEPS ITS LINES AND NO FILENAME: there is no file, and naming one would put into the evidence a
  // source that does not exist -- the same thing a typed table was saying until 2026-11-23.
  if(d.inputMethod==='drawn')return {inputMethod:'drawn',...(d.data?{data:d.data}:{})};
  return {inputMethod:'file',...(d.data?{data:d.data}:{}),...(d.file?{file:d.file}:{})};
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
