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
function layerCard(n:WorkflowNode<'polygon_input'>,esc:Escape):string{
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

/** ONE DECISION AT A TIME, AND ONLY THE PARTS THAT FOLLOW FROM IT.
 *
 *  The practitioner, 2026-10-29: *"The Inspector panel needs to have a step by step decision
 *  guided UI. Pick GeoJSON and only components that are relevant to the choice shows up. Pick PBF
 *  and the relevant components show up. There's also developer commentary on the panel, that adds
 *  clutter, epidemiologists and field practitioners will not read those."*
 *
 *  So the steps are numbered, each path shows only its own, and the prose is what a practitioner
 *  needs to make the next choice. The measurements, the dates and the reasons a rule exists have
 *  moved to `docs/widgets/polygon_input.md`, where someone who wants them can find them and
 *  everyone else is not reading past them.
 *
 *  AND NOTHING RUNS UNTIL APPLY. *"There needs to be an Apply button so the decision and choices
 *  are finalized and seen as executed."* Choosing a file used to start the read on the spot,
 *  which meant the settings above it had to be right BEFORE the file was picked -- change a kind
 *  afterwards and the layer still held what the old kinds matched, with nothing saying so. The
 *  file is now held until Apply, and Apply is the read. */
export function polygonInputInspector(n:WorkflowNode<'polygon_input'>,esc:Escape,
  boundary?:Boundary,areaSources:{id:string;label:string}[]=[],connectedArea?:string):string{
  const p=n.params;
  const method=p.inputMethod==='extract'?'extract':'file';
  const kinds=p.kinds??[];
  const step=(index:number,title:string,inner:string)=>
    `<div class="field-step"><span class="inspector-section">${index} \u00b7 ${esc(title)}</span>`
    +inner+`</div>`;

  let html=labelField(p.label||'',100,esc)
    +step(1,'Where the features come from',
      `<select id="polygon-input-method" aria-label="Where the features come from">`
      +`<option value="file" ${method==='file'?'selected':''}>A GeoJSON file</option>`
      +`<option value="extract" ${method==='extract'?'selected':''}>An OpenStreetMap extract `
      +`(.osm.pbf)</option></select>`
      +`<small>${method==='file'
        ?'A layer somebody published. Read as published \u2014 nothing is clipped or reprojected.'
        :'Areas read out of a published extract on your computer, inside your study area.'
      }</small>`);

  if(method==='file'){
    html+=step(2,'Choose the file',
      `<input id="polygon-file" type="file" accept=".geojson,.json,application/geo+json,application/json">`
      +`<small>Polygons and multipolygons, longitude then latitude.</small>`
      +`<p id="polygon-pending" class="muted"></p>`);
    html+=step(3,'Name the features',nameFields(p,esc));
  }else{
    const bounds=boundary?geometryBounds(boundary):undefined;
    const margin=p.marginM??0;
    const box=bounds?readBox([bounds[0],bounds[1],bounds[2],bounds[3]],margin):undefined;
    html+=step(2,'Study area to read inside',
      `<select id="polygon-area" data-map-port="area"><option value="">Not connected</option>`
      +areaSources.map(source=>`<option value="${esc(source.id)}" `
        +`${connectedArea===source.id?'selected':''}>${esc(source.label)}</option>`).join('')
      +`</select>`
      +(box
        ?`<small>Reading ${esc(box.map(c=>c.toFixed(4)).join(', '))}.</small>`
        :`<small>Required. The box to read comes from this area.</small>`));
    html+=step(3,'What to read',
      AREA_KINDS.map(kind=>`<label><input type="checkbox" data-area-kind="${kind}" `
        +`${kinds.includes(kind)?'checked':''}> ${esc(KIND_LABELS[kind])}</label>`).join('')
      +`<label class="field-label" for="polygon-margin">How far outside the area to look `
      +`(metres)</label>`
      +`<input id="polygon-margin" type="number" min="0" step="100" value="${margin}">`
      +`<label class="field-label" for="polygon-min-vertices">Skip features smaller than `
      +`(vertices)</label>`
      +`<input id="polygon-min-vertices" type="number" min="0" step="1" `
      +`value="${p.minVertices===undefined?'':p.minVertices}" placeholder="No limit">`
      +`<small>Leave the limit empty to read everything, then choose what to keep after the `
      +`read.</small>`);
    html+=step(4,'Choose the extract file',
      `<input id="polygon-extract" type="file" accept=".pbf,.osm.pbf,application/octet-stream">`
      +`<small>It is read where it sits and never copied in.</small>`
      +`<p id="polygon-pending" class="muted"></p>`
      +(()=>{
        if(!box)return '';
        const regions=extractsFor({type:'Polygon',coordinates:[[
          [box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]],
        ]] as unknown as never});
        if(!regions.length)return `<small>No catalogued extract covers this box.</small>`;
        return `<details><summary>Don\u2019t have one? Download an extract covering this box`
          +`</summary><div class="extract-links">`
          +regions.map(region=>`<a class="button" href="${esc(region.pbf)}" download `
            +`target="_blank" rel="noopener noreferrer">\u2193 ${esc(region.name)}</a>`).join('')
          +`</div><small>Your browser downloads it from ${esc(new URL(regions[0].pbf).host)}. `
          +`Come back here once it has landed.</small></details>`;
      })());
    html+=step(5,'Name the features',nameFields(p,esc));
  }

  // APPLY, and what it is waiting for. A disabled button that does not say why is a dead end, so
  // the line beneath it names the one thing still missing.
  const waiting=method==='extract'
    ?(!connectedArea?'Connect a study area in step 2.'
      :!kinds.length?'Choose at least one kind in step 3.':'')
    :'';
  html+=`<div class="field-step"><button id="polygon-apply" class="button primary" disabled>`
    +`${method==='extract'?'Read the extract':'Read the file'}</button>`
    +`<p id="polygon-apply-note" class="muted">${esc(waiting||'Choose a file to read.')}</p>`
    +`<p id="polygon-extract-status" class="muted" role="status"></p></div>`;

  html+=layerCard(n,esc)
    +(n.params.data.features.length
      ?`<button class="button" data-review-polygons="${esc(n.id)}">Choose features`
        +`${n.params.hidden?.length?` \u00b7 ${n.params.hidden.length} set aside`:''}</button>`
      :'');
  return html;
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
