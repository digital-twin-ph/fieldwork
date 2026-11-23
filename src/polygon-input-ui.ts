import type {WorkflowNode,Escape,Boundary,Workflow} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {MAX_AREA_INPUTS,outputOf} from './core.js';
import {areaParts} from './area-parts-layer.js';
import {contentHash} from './project-files.js';
import {dropPayload} from './payload-store.js';
import {errorMessage} from './guards.js';
import {mountFeatureChooser} from './polygon-review.js';
import {openConfigDialog} from './config-dialog.js';
import {payloadDigest} from './project.js';
import {previewArea} from './raster-preview.js';
import {AREA_KINDS,readBox,areasInWorker,retrievalProvenance,type AreaKind} from './osm-areas.js';
import {MAX_LAYER_VERTICES,readPolygonFeatures} from './polygon-layer.js';
import {extractsFor,EXTRACT_CATALOGUE_TAKEN} from './extract-catalogue.js';
import {geometryBounds} from './study-area.js';
import {shareAlike} from './input-provenance.js';
import type {FeatureDecisions} from './polygon-review.js';
/** Study areas a layer of their parts takes; the cap Map keeps on polygon layers (core's MAX_AREA_INPUTS). */
const MAX_AREAS=6;

/** THE WIDGET HAD NO INSPECTOR AT ALL until this panel.
 *
 *  `polygon_input` shipped addable, implemented and tested, and every parameter it declares --
 *  the naming property, the layer name, the provenance -- could be set only by editing a
 *  workflow file. South London's layers reach the canvas because the worked example's own file
 *  carries them; a practitioner who added the widget from the palette got a node with no way to
 *  put anything in it. That is the same gap `reachable_nodes` had on 2026-10-17, found the same
 *  way: a palette audit asserts a widget is ADDABLE, and addable is not configurable.
 *
 *  So this panel builds BOTH paths. The acquisition is what was asked for -- the practitioner,
 *  2026-10-28: *"what we just need from the polygon widget is something like what study area does
 *  already with geoboundary and what street network does with Geofabrik"* -- and a file path
 *  rendered as a dead branch beside it would be worse than the nothing it replaces. */

const KIND_LABELS:Record<AreaKind,string>={
  water:'Water — lakes, rivers, basins, docks',
  building:'Buildings',
};

/** WHAT IS IN THE WIDGET NOW, for either path.
 *
 *  A card only for an acquisition was the first version of this, and the file path then showed
 *  nothing at all after an import: the features were read, kept and referenced, and the panel
 *  looked exactly as it had before. A practitioner cannot check an import they cannot see, and a
 *  browser test could not either -- which is how this was found.
 *
 *  The DROPPED counts belong here and not only in the receipt, because this is where the
 *  threshold is decided. 186 features is a number with no meaning until it sits beside the 844
 *  that were below the threshold and the ones that fell outside the box. */
export function layerCard(n:WorkflowNode<'polygon_input'>,esc:Escape):string{
  const read=n.params.retrieval,source=n.params.source;
  const kept=n.params.data.features.length;
  if(!read&&!kept)return '';
  const vertices=n.params.data.features.reduce((total,f)=>{
    const rings=f.geometry.type==='Polygon'
      ?(f.geometry.coordinates as unknown as number[][][])
      :(f.geometry.coordinates as unknown as number[][][][]).flat();
    return total+rings.reduce((n2,ring)=>n2+ring.length,0);
  },0);
  const share=shareAlike(n.params.provenance);
  return `<div class="source-card"><span class="inspector-section">`
    +`${read?'What was read':'This layer'}</span>`
    +`<h3>${kept.toLocaleString()} ${read?esc(read.kinds.join(' and '))+' ':''}feature`
    +`${kept===1?'':'s'}</h3>`
    +`<p>${vertices.toLocaleString()} vertices`
    +(read?`, within ${esc(read.bbox.map(c=>c.toFixed(4)).join(', '))}`:'')+`.</p>`
    +(source?.filename
      ?`<p class="muted">From ${esc(source.filename)}`
        +(source.sha256?` \u00b7 sha256 ${esc(source.sha256.slice(0,12))}\u2026`:'')
        // THE FILE IS NOT KEPT EITHER WAY, and for the extract that is the whole point: 124 MB
        // read where it sat, of which the name and the digest are the only trace. `-latest`
        // redirects to a dated build, so the name alone would not say which one was read.
        +`. ${read?'The extract itself was not kept: it was read where it sat.'
          :'The file itself was not kept.'}</p>`:'')
    +`<div class="detail-row"><span>Kept</span><strong>`
    +`${n.params.dataRef?'On this device by digest, not in the workflow':'In the workflow'}`
    +`</strong></div>`
    +(read
      ?`<div class="detail-row"><span>Not read</span><strong>`
        +`${read.dropped.belowMinVertices.toLocaleString()} below the threshold, `
        +`${read.dropped.outsideBox.toLocaleString()} outside the box`
        +(read.dropped.unclosed?`, ${read.dropped.unclosed.toLocaleString()} unclosed`:'')
        +(read.dropped.noGeometry?`, ${read.dropped.noGeometry.toLocaleString()} without geometry`:'')
        +`</strong></div>`
        +`<div class="detail-row"><span>Terms</span><strong>${esc(read.attribution)} \u00b7 `
        +`${esc(read.licence)}</strong></div>`
        +`<p class="${share?'notice':'muted'}">${share
          ?'Share-alike: a figure built on this layer carries the same terms, and its credits '
            +'must name OpenStreetMap.'
          :'Read '+esc(read.at.slice(0,10))+'.'}</p>`
      :`<p class="muted">Read as published \u2014 nothing was clipped, simplified or `
        +`reprojected.</p>`)
    +`</div>`;
}


/** The two naming questions, which both paths ask in the same words. */
function nameFields(p:WorkflowNode<'polygon_input'>['params'],esc:Escape):string{
  return `<label class="field-label" for="polygon-name-field">Which property names each feature`
    +`</label>`
    +`<input id="polygon-name-field" maxlength="100" value="${esc(p.nameField||'')}" `
    +`placeholder="Not set">`
    +`<small>Leave it unset to number them. A property the file does not carry is refused rather `
    +`than left blank.</small>`
    +`<label class="field-label" for="polygon-layer-name">What to call the layer</label>`
    +`<input id="polygon-layer-name" maxlength="100" value="${esc(p.layerName||'')}" `
    +`placeholder="${esc(p.label||'Polygon layer')}">`
    +`<small>What a reader sees beside it on a map.</small>`;
}


/** WHAT CONFIGURE… HOLDS (experiment 186, 2026-11-11: the practitioner, "Let's also standardize the Polygon layer input
 *  ASAP"). Everything the panel used to carry, now a draft that nothing reads until Apply, which is the read. */
export interface PolygonDraft {
  inputMethod:'file'|'extract'|'areas'; kinds:AreaKind[];
  /** The study areas whose parts make the layer, one per input, in order (2026-11-21). */
  areas:string[]; marginM:number; minVertices?:number;
  nameField?:string; layerName?:string; area?:string; label:string;
  /** Choose features' decisions, made in the same dialog (2026-11-13). */
  decisions:FeatureDecisions;
}
export function polygonDraftOf(n:WorkflowNode<'polygon_input'>,connectedArea?:string,connectedAreas:string[]=[]):PolygonDraft{
  const p=n.params;
  return {inputMethod:p.inputMethod==='extract'||p.inputMethod==='areas'?p.inputMethod:'file',areas:[...connectedAreas],kinds:[...(p.kinds??[])],marginM:p.marginM??0,
    ...(p.minVertices!==undefined?{minVertices:p.minVertices}:{}),...(p.nameField?{nameField:p.nameField}:{}),
    ...(p.layerName?{layerName:p.layerName}:{}),...(connectedArea?{area:connectedArea}:{}),label:p.label||'',
    decisions:{hidden:[...(p.hidden??[])],clipped:p.clipToBox===true,names:{...(p.names??{})},merges:(p.merges??[]).map(g=>[...g])}};
}
/** What is still missing before Apply, one thing at a time. A layer already held needs no file: Apply then writes the
 *  settings and the features chosen, and a file is chosen only to replace what is held. */
export function polygonMissing(d:PolygonDraft,file?:File,held=false):string{
  if(d.inputMethod==='areas')return d.areas.some(Boolean)?'':'Choose a study area.';
  if(held&&!file)return '';
  return d.inputMethod==='extract'
    ?(!d.area?'Choose the study area to read inside.':!d.kinds.length?'Choose at least one kind of area to read.'
      :!file?'Choose an extract file.':'')
    :(!file?'Choose a GeoJSON file.':'');
}
/** THE FILE THE LAYER HOLDS, said where the file is chosen: "No file chosen" beside a layer of 32 features read from one
 *  (the practitioner's screenshot, 2026-11-13) said the opposite of what was there. */
export function heldFileLine(source:WorkflowNode<'polygon_input'>['params']['source'],count:number,esc:Escape):string{
  if(!count)return '';
  return `<p class="polygon-held" data-polygon-held>Holding ${count.toLocaleString('en')} feature${count===1?'':'s'}`
    +(source?.filename?` read from <strong>${esc(source.filename)}</strong>`:'')
    +(source?.sha256?` \u00b7 sha256 ${esc(source.sha256.slice(0,12))}\u2026`:'')
    +`. Choose a file only to replace them.</p>`;
}
/** The settings, as the panel had them, numbered in the order a person decides them. */
export function polygonConfigSettings(d:PolygonDraft,esc:Escape,boundary:Boundary|undefined,
  areaSources:{id:string;label:string}[],chosen?:string,held=''):string{
  const step=(index:number,title:string,inner:string)=>
    `<div class="field-step"><span class="inspector-section">${index} · ${esc(title)}</span>${inner}</div>`;
  const names=`<label class="field-label" for="polygon-name-field">Which property names each feature</label>`
    +`<input id="polygon-name-field" maxlength="100" value="${esc(d.nameField||'')}" placeholder="Not set">`
    +`<small>Leave it unset to number them. A property the file does not carry is refused rather than left blank.</small>`
    +`<label class="field-label" for="polygon-layer-name">What to call the layer</label>`
    +`<input id="polygon-layer-name" maxlength="100" value="${esc(d.layerName||'')}" placeholder="${esc(d.label||'Polygon layer')}">`
    +`<small>What a reader sees beside it on a map.</small>`;
  const pending=(chosen?'':held)+`<p id="polygon-pending" class="muted">${chosen?`Chosen: ${esc(chosen)}`:''}</p>`;
  let html=step(1,'Where the features come from',
    `<select id="polygon-input-method" aria-label="Where the features come from">`
    +`<option value="file" ${d.inputMethod==='file'?'selected':''}>A GeoJSON file</option>`
    +`<option value="extract" ${d.inputMethod==='extract'?'selected':''}>An OpenStreetMap extract (.osm.pbf)</option>`
    +`<option value="areas" ${d.inputMethod==='areas'?'selected':''}>The parts of connected study areas</option></select>`
    +`<small>${d.inputMethod==='file'?'A layer somebody published. Read as published — nothing is clipped or reprojected.'
      :d.inputMethod==='areas'?'Each part of each study area is a feature, with its country and level: one layer across a border.'
      :'Areas read out of a published extract on your computer, inside your study area.'}</small>`);
  if(d.inputMethod==='areas'){
    const slots=d.areas.length?d.areas:[''];
    html+=step(2,'Study areas',slots.map((chosen,i)=>`<label class="field-label" for="polygon-area-${i}">Study area ${i+1}</label>`
      +`<select id="polygon-area-${i}" data-polygon-area="${i}"><option value="">Not connected</option>`
      +areaSources.map(source=>`<option value="${esc(source.id)}" ${chosen===source.id?'selected':''}>${esc(source.label)}</option>`).join('')
      +'</select>').join('')
      +`<div class="inspector-actions">`
      +(slots.length<MAX_AREAS?'<button type="button" class="button" id="polygon-add-area">+ Add a study area</button>':'')
      +(slots.length>1?'<button type="button" class="button" id="polygon-remove-area">Remove the last</button>':'')+'</div>'
      +`<small>Each country at the level you want; a part keeps its name and geoBoundaries ID.</small>`);
    return html+step(3,'What to call the layer',`<input id="polygon-layer-name" maxlength="100" value="${esc(d.layerName||'')}" placeholder="${esc(d.label||'Polygon layer')}">`
      +`<small>What a reader sees beside it on a map.</small>`);
  }
  if(d.inputMethod==='file'){
    html+=step(2,'Choose the file',`<input id="polygon-file" type="file" accept=".geojson,.json,application/geo+json,application/json">`
      +`<small>Polygons and multipolygons, longitude then latitude.</small>`+pending);
    return html+step(3,'Name the features',names);
  }
  const bounds=boundary?geometryBounds(boundary):undefined;
  const box=bounds?readBox([bounds[0],bounds[1],bounds[2],bounds[3]],d.marginM):undefined;
  html+=step(2,'Study area to read inside',
    `<select id="polygon-area"><option value="">Not connected</option>`
    +areaSources.map(source=>`<option value="${esc(source.id)}" ${d.area===source.id?'selected':''}>${esc(source.label)}</option>`).join('')
    +`</select>`+(box?`<small>Reading ${esc(box.map(c=>c.toFixed(4)).join(', '))}.</small>`:`<small>Required. The box to read comes from this area.</small>`));
  html+=step(3,'What to read',
    AREA_KINDS.map(kind=>`<label><input type="checkbox" data-area-kind="${kind}" ${d.kinds.includes(kind)?'checked':''}> ${esc(KIND_LABELS[kind])}</label>`).join('')
    +`<label class="field-label" for="polygon-margin">How far outside the area to look (metres)</label>`
    +`<input id="polygon-margin" type="number" min="0" step="100" value="${d.marginM}">`
    +`<label class="field-label" for="polygon-min-vertices">Skip features smaller than (vertices)</label>`
    +`<input id="polygon-min-vertices" type="number" min="0" step="1" value="${d.minVertices===undefined?'':d.minVertices}" placeholder="No limit">`
    +`<small>Leave the limit empty to read everything, then choose what to keep after the read.</small>`);
  html+=step(4,'Choose the extract file',
    `<input id="polygon-extract" type="file" accept=".pbf,.osm.pbf,application/octet-stream">`
    +`<small>It is read where it sits and never copied in.</small>`+pending
    +(()=>{
      if(!box)return '';
      const regions=extractsFor({type:'Polygon',coordinates:[[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]]] as unknown as never});
      if(!regions.length)return `<small>No catalogued extract covers this box.</small>`;
      return `<details><summary>Don’t have one? Download an extract covering this box</summary><div class="extract-links">`
        +regions.map(region=>`<a class="button" href="${esc(region.pbf)}" download target="_blank" rel="noopener noreferrer">↓ ${esc(region.name)}</a>`).join('')
        +`</div><small>Your browser downloads it from ${esc(new URL(regions[0]!.pbf).host)}. Come back here once it has landed.</small></details>`;
    })());
  return html+step(5,'Name the features',names);
}
/** The Inspector's one sentence: what the layer holds and where it came from. */
export function polygonSentence(n:WorkflowNode<'polygon_input'>):string{
  const p=n.params,count=p.data.features.length;
  if(p.inputMethod==='areas'){const k=p.areaInputCount??1;
    return `The parts of ${k===1?'the connected study area':`${k} connected study areas`}, each a feature with its name, geoBoundaries ID, country and level.`;}
  if(!count)return 'No features yet. Choose a GeoJSON file, or read areas out of an OpenStreetMap extract, in Configure…';
  const from=p.retrieval?`read from ${p.source?.filename??'an OpenStreetMap extract'} inside the study area (${p.retrieval.kinds.join(' and ')})`
    :`read from ${p.source?.filename??'a GeoJSON file'}, as published`;
  return `${count.toLocaleString('en')} polygon feature${count===1?'':'s'}, ${from}.`
    +(p.hidden?.length?` ${p.hidden.length} set aside.`:'');
}

/** WHAT POLYGON LAYER READS OF THE APPLICATION, through its kit (2026-11-22, the Inspector move's batch D). */
export interface PolygonKit extends StepKit {
  /** Connect `from` to the layer, as every step's input lists do. */
  connect:(w:Workflow,from:string,to:string,port:string)=>void;
  /** A change that must reach storage: false, said by the caller, where it could not. */
  persist:(edit:(w:Workflow)=>void)=>boolean;
  /** Keep a payload on the device by its digest. */
  keepDataset:(digest:string,payload:unknown)=>Promise<boolean>;
  toast:(text:string)=>void;
  /** Whether the last run made this layer. */
  ran:(nodeId:string)=>boolean;
}

export function openPolygonConfig(kit:PolygonKit,nodeId:string){
  const esc=kit.esc,workflow=kit.workflow(),node=workflow.nodes.find(x=>x.id===nodeId) as WorkflowNode<'polygon_input'>|undefined;if(!node)return;
  const target=(w:Workflow)=>w.nodes.find(x=>x.id===nodeId) as WorkflowNode<'polygon_input'>;
  const connected=workflow.edges.find(e=>e.to===nodeId&&e.port==='area')?.from;
  const areaPort=(i:number)=>i===0?'area':`area_${i+1}`;
  const connectedAreas=Array.from({length:MAX_AREA_INPUTS},(_,i)=>workflow.edges.find(e=>e.to===nodeId&&e.port===areaPort(i))?.from)
    .filter((x):x is string=>!!x);
  const areaSources=workflow.nodes.filter(x=>x.id!==nodeId&&outputOf(x)==='area').map(x=>({id:x.id,label:x.params.label||kit.title(x.type)}));
  // THE PARTS, BEFORE A RUN, where an area is a Study area that holds its shape; another step's area is known once it runs.
  const partsOf=(ids:string[])=>{const known=ids.map(id=>workflow.nodes.find(x=>x.id===id)).filter((x):x is WorkflowNode<'study_area'>=>x?.type==='study_area'&&!!x.params.geometry);
    return {parts:areaParts(known.map(x=>({value:{boundary:x.params.geometry!,...(x.params.boundary?.units?{units:x.params.boundary.units}:{}),areaId:x.id,geometryId:x.id,label:x.params.label||'Study area'},
      ...(x.params.boundary?.boundaryID?{boundaryID:x.params.boundary.boundaryID}:{})}))),unknown:ids.length-known.length};};
  let file:File|undefined;
  type Feature=WorkflowNode<'polygon_input'>['params']['data']['features'][number];
  const held=node.params.data.features as Feature[];
  // THE FEATURES SHOWN in the chooser: a GeoJSON file just chosen, read on the spot so its features can be chosen before
  // Apply; else the layer held, named again by the property in the draft where that changed. An extract is read on Apply.
  let fresh:Feature[]|undefined,readError='',anyKept=true,unmount:(()=>void)|undefined;
  const fromFile=node.params.inputMethod!=='extract';
  const renamed=(features:readonly Feature[],nameField?:string):Feature[]=>readPolygonFeatures({type:'FeatureCollection',
    features:features.map(f=>({type:'Feature',id:f.id,geometry:f.geometry,properties:(f as {properties?:object}).properties??{}}))},{nameField}) as Feature[];
  const shownFor=(d:PolygonDraft):Feature[]|undefined=>{
    if(file)return d.inputMethod==='file'?fresh:undefined;
    if(!held.length)return undefined;
    if(fromFile&&d.inputMethod==='file'&&(d.nameField??'')!==(node.params.nameField??'')){
      try{readError='';return renamed(held,d.nameField);}catch(error){readError=errorMessage(error);return undefined;}
    }
    return held;
  };
  const readChosen=async(d:PolygonDraft)=>{
    fresh=undefined;readError='';
    if(!file||d.inputMethod!=='file')return;
    try{fresh=readPolygonFeatures(JSON.parse(await file.text()),{nameField:d.nameField,layerName:d.layerName}) as Feature[];}
    catch(error){readError=errorMessage(error);}
  };
  const boundaryOf=(area?:string)=>{if(!area)return undefined;try{return previewArea(workflow,area).boundary;}catch{return undefined;}};
  const frameOf=(d:PolygonDraft)=>{
    // THE FRAME THE READ USED, where there is one: an extract read records its own box; a file layer has none, so the
    // connected study area's bounds stand in.
    if(node.params.retrieval?.bbox&&!file)return node.params.retrieval.bbox;
    const area=boundaryOf(d.area??connected);const b=area?geometryBounds(area):undefined;
    return b?[b[0],b[1],b[2],b[3]] as [number,number,number,number]:undefined;
  };
  openConfigDialog<PolygonDraft>({
    id:'polygon-config',widget:'Polygon layer',step:node.params.label||kit.title('polygon_input'),draft:polygonDraftOf(node,connected,connectedAreas),wide:true,
    sections:d=>{
      if(d.inputMethod==='areas'){
        const missing=polygonMissing(d),{parts,unknown}=partsOf(d.areas.filter(Boolean));
        const after=parts.features.length?'<fieldset class="join-after"><legend>After</legend>'
          +`<p><strong>${parts.features.length.toLocaleString('en')} parts</strong> at ${esc(parts.levels.join(', '))}`
          +(parts.levels.length>1?': at different levels, so a count compares only units at one level, and a rate compares across them.':'.')+'</p>'
          +'<div class="table-scroll"><table><thead><tr><th scope="col">name</th><th scope="col">id</th><th scope="col">country</th><th scope="col">level</th><th scope="col">study area</th></tr></thead><tbody>'
          +parts.features.map(f=>`<tr>${['name','id','country','level','study_area'].map(k=>`<td>${esc(String(f.properties[k]??''))}</td>`).join('')}</tr>`).join('')
          +'</tbody></table></div>'+(unknown?`<p class="muted">${unknown} more area${unknown===1?' is':'s are'} made by a step, and ${unknown===1?'its':'their'} parts are known once the workflow runs.</p>`:'')+'</fieldset>'
          :unknown?'<p class="muted">The parts are known once the workflow runs: the area is made by a step.</p>':'';
        return {settings:polygonConfigSettings(d,esc,undefined,areaSources,undefined,''),...(after?{preview:after}:{}),blocked:!!missing,
          ...(missing?{message:{tone:'warning' as const,text:missing}}:{})};
      }
      const shown=shownFor(d);
      const missing=readError||polygonMissing(d,file,held.length>0)||(shown&&!anyKept?'Every feature is set aside. Tick at least one.':'');
      const preview=shown?`<div id="polygon-chooser-host"></div>`
        :file&&d.inputMethod==='extract'?`<p class="muted">The areas are read from ${esc(file.name)} on Apply; open Configure… again to choose among them.</p>`
        :'';
      return {settings:polygonConfigSettings(d,esc,boundaryOf(d.area),areaSources,file?.name,heldFileLine(node.params.source,held.length,esc)),
        ...(preview?{preview}:{}),blocked:!!missing,
        ...(missing?{message:{tone:readError?'refusal' as const:'warning' as const,text:missing}}:{})};},
    beforeRedraw:()=>{unmount?.();unmount=undefined;},
    wire:(root,d,redraw)=>{
      const on=(selector:string,fn:(el:HTMLInputElement&HTMLSelectElement)=>void)=>
        root.querySelectorAll<HTMLInputElement&HTMLSelectElement>(selector).forEach(el=>el.addEventListener('change',()=>{fn(el);redraw();}));
      on('#polygon-input-method',el=>{d.inputMethod=el.value==='extract'||el.value==='areas'?el.value:'file';file=undefined;fresh=undefined;readError='';
        if(d.inputMethod==='areas'&&!d.areas.length&&connected)d.areas=[connected];});
      on('[data-polygon-area]',el=>{const i=Number(el.dataset.polygonArea);if(!d.areas.length)d.areas=[''];d.areas[i]=el.value;});
      root.querySelector('#polygon-add-area')?.addEventListener('click',()=>{if(!d.areas.length)d.areas=[''];d.areas.push('');redraw();});
      root.querySelector('#polygon-remove-area')?.addEventListener('click',()=>{d.areas.pop();redraw();});
      on('#polygon-area',el=>{if(el.value)d.area=el.value;else delete d.area;});
      on('[data-area-kind]',el=>{const kind=el.dataset.areaKind as AreaKind,kept=new Set(d.kinds);
        if(el.checked)kept.add(kind);else kept.delete(kind);d.kinds=AREA_KINDS.filter(k=>kept.has(k));});
      // UNSET IS A VALUE HERE, not zero: unset reads every area of the chosen kinds.
      on('#polygon-min-vertices',el=>{const raw=el.value.trim();if(raw==='')delete d.minVertices;else d.minVertices=Number(raw);});
      on('#polygon-margin',el=>{const raw=el.value.trim();d.marginM=raw===''?0:Number(raw);});
      on('#polygon-layer-name',el=>{const raw=el.value.trim();if(raw)d.layerName=raw;else delete d.layerName;});
      // A FILE OR A NAMING PROPERTY CHANGED: the features are read again, and choices made among the others start over,
      // since a feature's id may not name the same feature.
      const fresh0=()=>{d.decisions={hidden:[],clipped:false,names:{},merges:[]};anyKept=true;};
      root.querySelectorAll<HTMLInputElement>('#polygon-file,#polygon-extract').forEach(el=>el.addEventListener('change',()=>{
        file=el.files?.[0];fresh0();void readChosen(d).then(redraw);}));
      root.querySelector<HTMLInputElement>('#polygon-name-field')?.addEventListener('change',el=>{
        const raw=(el.target as HTMLInputElement).value.trim();if(raw)d.nameField=raw;else delete d.nameField;
        fresh0();void readChosen(d).then(redraw);});
      const host=root.querySelector<HTMLElement>('#polygon-chooser-host'),shown=shownFor(d);
      if(host&&shown)unmount=mountFeatureChooser(host,shown,d.nameField,d.decisions,esc,kept=>{
        // Only a change of whether anything is kept redraws: a redraw rebuilds the map.
        if(kept!==anyKept){anyKept=kept;redraw();}},frameOf(d));
    },
    apply:()=>{},
    applyAsync:async(d,say)=>{
      // THE PARTS OF CONNECTED STUDY AREAS: nothing to read; the areas are connected, one to each input, and the layer is
      // made from them each run.
      if(d.inputMethod==='areas'){
        const chosen=d.areas.filter(Boolean);
        if(!kit.persist(w=>{const t=target(w).params;t.inputMethod='areas';t.areaInputCount=Math.max(1,chosen.length);
          if(d.layerName)t.layerName=d.layerName;else delete t.layerName;
          w.edges=w.edges.filter(e=>!(e.to===nodeId&&/^area(_\d+)?$/.test(e.port)));
          chosen.forEach((id,i)=>w.edges.push({id:`e-${nodeId}-${areaPort(i)}`,from:id,to:nodeId,port:areaPort(i)}));}))
          throw new Error('The layer could not be saved on this device.');
        kit.toast('Polygon layer updated. Run the workflow to make it.');
        return true;
      }
      // The settings first, then any read: the read is of these settings, and the study area it reads inside.
      const settle=(w:Workflow)=>{const t=target(w).params;
        t.inputMethod=d.inputMethod;t.kinds=d.kinds;t.marginM=d.marginM;
        if(d.minVertices===undefined)delete t.minVertices;else t.minVertices=d.minVertices;
        if(d.nameField)t.nameField=d.nameField;else delete t.nameField;
        if(d.layerName)t.layerName=d.layerName;else delete t.layerName;
        if(d.inputMethod==='extract'&&d.area)kit.connect(w,d.area,nodeId,'area');
        // CHOOSE FEATURES' DECISIONS, each stored only where it was made, so a layer nobody reduced carries nothing.
        const {hidden,clipped,names,merges}=d.decisions;
        if(hidden.length)t.hidden=hidden;else delete t.hidden;
        if(clipped)t.clipToBox=true;else delete t.clipToBox;
        if(Object.keys(names).length)t.names=names;else delete t.names;
        if(merges.length)t.merges=merges;else delete t.merges;};
      const keepFeatures=async(features:Feature[],extra:(t:WorkflowNode<'polygon_input'>)=>void)=>{
        const data={features};
        const digest=await payloadDigest(data);
        if(!await kit.keepDataset(digest,data))
          throw new Error(`These ${features.length.toLocaleString('en')} features could not be kept on this device, so they were not saved.`
            +(d.inputMethod==='extract'?' A higher vertex threshold reads fewer of them.':' Export the workflow to a file to keep it.'));
        const kept=kit.persist(w=>{settle(w);const t=target(w);t.params.data=data;t.params.dataRef=digest;extra(t);});
        if(!kept){await dropPayload(digest);throw new Error('The layer could not be saved on this device.');}
      };
      if(!file){
        // NOTHING NEW TO READ: the settings and the features chosen; the held layer named again where its property changed.
        const shown=shownFor(d);
        if(shown&&shown!==held)await keepFeatures(shown,t=>{if(t.params.source)t.params.source={...t.params.source,features:shown.length};});
        else if(!kit.persist(w=>settle(w)))throw new Error('The layer could not be saved on this device.');
        kit.toast('Polygon layer updated. Rerun to update results.');
        return true;
      }
      const bytes=new Uint8Array(await file.arrayBuffer());
      const sha256=await contentHash(bytes);
      let features:Feature[],retrieval;
      if(d.inputMethod==='extract'){
        // THE SCOPE IS THE STUDY AREA'S, which is why the port exists: a read with no box is a read of whatever the file holds.
        if(d.area)kit.change(w=>kit.connect(w,d.area!,nodeId,'area'));
        const {boundary}=previewArea(kit.workflow(),nodeId);
        const bounds=geometryBounds(boundary);
        const bbox=readBox([bounds[0],bounds[1],bounds[2],bounds[3]],d.marginM);
        ({features,retrieval}=await areasInWorker(bytes,{kinds:d.kinds,bbox,nameTag:d.nameField,minVertices:d.minVertices},say));
        say('Keeping the areas on this device…');
      }else{
        say(`Reading ${file.name}…`);
        features=fresh??readPolygonFeatures(JSON.parse(new TextDecoder().decode(bytes)),{nameField:d.nameField,layerName:d.layerName}) as Feature[];
      }
      const read=retrieval?{...retrieval,filename:file.name,sha256,bytes:bytes.length}:undefined;
      await keepFeatures(features,t=>{
        t.params.source={filename:file!.name,bytes:bytes.length,sha256,features:features.length};
        if(read){t.params.retrieval=read;t.params.provenance=retrievalProvenance(read,{filename:file!.name,sha256});}
        // A FILE LAYER HAS NO RETRIEVAL, and leaving the previous one would compare this file against a box it was never read for.
        else delete t.params.retrieval;});
      kit.toast(`${features.length.toLocaleString('en')} polygon feature${features.length===1?'':'s'} read`
        +`${d.inputMethod==='extract'?' from the extract and saved on this device':''}. Run the workflow to use them.`);
      return true;
    },
  },esc);
}

/** POLYGON LAYER'S STANDARD INSPECTOR, moved out of app.ts with its dialog. */
export const polygonInspector:OwnInspector<'polygon_input'>={
  markup:(n,k)=>{const kit=k as PolygonKit;
    const esc=kit.esc,p=n.params;let content='';
    content+=kit.section('Name',kit.name('polygon-label',p.label||'Polygon layer'));
    content+=kit.section('Inputs',kit.inputs(n,p.inputMethod==='areas'
      ?Object.fromEntries(Array.from({length:MAX_AREA_INPUTS},(_,i)=>[i===0?'area':`area_${i+1}`,`Study area ${i+1}`]))
      :{area:'Study area to read inside, for an extract'}));
    content+=kit.section('Settings',`<p class="standard-sentence">${esc(polygonSentence(n))}</p>`
      +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button></div>');
    content+=kit.section('Result',p.inputMethod==='areas'
      ?`<p class="standard-result">${esc(kit.ran(n.id)?'Made from the connected study areas in the last run.':'Made from the connected study areas when the workflow runs.')}</p>`
      :p.data.features.length
      // Choosing among the features is in Configure… since 2026-11-13, beside the file they came from.
      ?layerCard(n,esc)
      :'<p class="standard-result">Nothing read yet.</p>');
    return content;
  },
  wire:(n,k,root)=>{root.querySelector('#configure-step')?.addEventListener('click',()=>openPolygonConfig(k as PolygonKit,n.id));},
};
