import type {WorkflowNode,Escape,Boundary} from './types.js';
import {AREA_KINDS,readBox,type AreaKind} from './osm-areas.js';
import {MAX_LAYER_VERTICES} from './polygon-layer.js';
import {extractsFor,EXTRACT_CATALOGUE_TAKEN} from './extract-catalogue.js';
import {geometryBounds} from './study-area.js';
import {labelField} from './catchment-ui.js';
import {shareAlike} from './input-provenance.js';

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
  inputMethod:'file'|'extract'; kinds:AreaKind[]; marginM:number; minVertices?:number;
  nameField?:string; layerName?:string; area?:string; label:string;
}
export function polygonDraftOf(n:WorkflowNode<'polygon_input'>,connectedArea?:string):PolygonDraft{
  const p=n.params;
  return {inputMethod:p.inputMethod==='extract'?'extract':'file',kinds:[...(p.kinds??[])],marginM:p.marginM??0,
    ...(p.minVertices!==undefined?{minVertices:p.minVertices}:{}),...(p.nameField?{nameField:p.nameField}:{}),
    ...(p.layerName?{layerName:p.layerName}:{}),...(connectedArea?{area:connectedArea}:{}),label:p.label||''};
}
/** What is still missing before Apply can read, one thing at a time. */
export function polygonMissing(d:PolygonDraft,file?:File):string{
  return d.inputMethod==='extract'
    ?(!d.area?'Choose the study area to read inside.':!d.kinds.length?'Choose at least one kind of area to read.'
      :!file?'Choose an extract file.':'')
    :(!file?'Choose a GeoJSON file.':'');
}
/** The settings, as the panel had them, numbered in the order a person decides them. */
export function polygonConfigSettings(d:PolygonDraft,esc:Escape,boundary:Boundary|undefined,
  areaSources:{id:string;label:string}[],chosen?:string):string{
  const step=(index:number,title:string,inner:string)=>
    `<div class="field-step"><span class="inspector-section">${index} · ${esc(title)}</span>${inner}</div>`;
  const names=`<label class="field-label" for="polygon-name-field">Which property names each feature</label>`
    +`<input id="polygon-name-field" maxlength="100" value="${esc(d.nameField||'')}" placeholder="Not set">`
    +`<small>Leave it unset to number them. A property the file does not carry is refused rather than left blank.</small>`
    +`<label class="field-label" for="polygon-layer-name">What to call the layer</label>`
    +`<input id="polygon-layer-name" maxlength="100" value="${esc(d.layerName||'')}" placeholder="${esc(d.label||'Polygon layer')}">`
    +`<small>What a reader sees beside it on a map.</small>`;
  const pending=`<p id="polygon-pending" class="muted">${chosen?`Chosen: ${esc(chosen)}`:''}</p>`;
  let html=step(1,'Where the features come from',
    `<select id="polygon-input-method" aria-label="Where the features come from">`
    +`<option value="file" ${d.inputMethod==='file'?'selected':''}>A GeoJSON file</option>`
    +`<option value="extract" ${d.inputMethod==='extract'?'selected':''}>An OpenStreetMap extract (.osm.pbf)</option></select>`
    +`<small>${d.inputMethod==='file'?'A layer somebody published. Read as published — nothing is clipped or reprojected.'
      :'Areas read out of a published extract on your computer, inside your study area.'}</small>`);
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
  if(!count)return 'No features yet. Choose a GeoJSON file, or read areas out of an OpenStreetMap extract, in Configure…';
  const from=p.retrieval?`read from ${p.source?.filename??'an OpenStreetMap extract'} inside the study area (${p.retrieval.kinds.join(' and ')})`
    :`read from ${p.source?.filename??'a GeoJSON file'}, as published`;
  return `${count.toLocaleString('en')} polygon feature${count===1?'':'s'}, ${from}.`
    +(p.hidden?.length?` ${p.hidden.length} set aside.`:'');
}
