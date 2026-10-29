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

export function polygonInputInspector(n:WorkflowNode<'polygon_input'>,esc:Escape,
  boundary?:Boundary,areaSources:{id:string;label:string}[]=[],connectedArea?:string):string{
  const p=n.params;
  const method=p.inputMethod==='extract'?'extract':'file';
  const kinds=p.kinds??[];
  let html=labelField(p.label||'',100,esc)
    +`<div class="notice">Read as published. Nothing is clipped, simplified or reprojected, and `
    +`a file whose coordinates are not CRS84 degrees is refused rather than converted. How many `
    +`features is not a limit; ${MAX_LAYER_VERTICES.toLocaleString()} vertices is, because that `
    +`is the thing that costs.</div>`
    +`<div class="field"><label class="field-label" for="polygon-input-method">Where the features `
    +`come from</label><select id="polygon-input-method">`
    +`<option value="file" ${method==='file'?'selected':''}>A published GeoJSON layer</option>`
    +`<option value="extract" ${method==='extract'?'selected':''}>Areas from a published .osm.pbf `
    +`extract (Geofabrik)</option>`
    +`</select></div>`;

  if(method==='file'){
    html+=`<div class="field"><label class="field-label" for="polygon-file">GeoJSON `
      +`FeatureCollection</label>`
      +`<input id="polygon-file" type="file" accept=".geojson,.json,application/geo+json,application/json">`
      +`<small>Polygons and multipolygons, in longitude, latitude order. The file is read here, `
      +`its features are kept on this device by digest, and the file itself is not kept.`
      +`</small></div>`;
  }else{
    // THE BOX, SHOWN BEFORE THE READ. A practitioner choosing a margin is choosing how far
    // outside their study area to look, and the number only means something as the box it makes.
    const bounds=boundary?geometryBounds(boundary):undefined;
    const margin=p.marginM??0;
    const box=bounds?readBox([bounds[0],bounds[1],bounds[2],bounds[3]],margin):undefined;
    html+=`<div class="field"><span class="field-label">Which areas to read</span>`
      +AREA_KINDS.map(kind=>`<label><input type="checkbox" data-area-kind="${kind}" `
        +`${kinds.includes(kind)?'checked':''}> ${esc(KIND_LABELS[kind])}</label>`).join('')
      +`<small>Each kind is a claim about which tags mean an area of that kind, so the set is `
      +`closed. Nothing is matched on a feature's name.</small></div>`
      +`<div class="field"><label class="field-label" for="polygon-min-vertices">Read only `
      +`features with at least this many vertices</label>`
      +`<input id="polygon-min-vertices" type="number" min="0" step="1" `
      +`value="${p.minVertices===undefined?'':p.minVertices}" placeholder="Not set">`
      // STATED, NEVER INFERRED, and the measurement is given instead of a default.
      +`<small>Unset reads every area of the chosen kinds, which is usually what you want. `
      +`Measured on South London's box, 2026-10-28: water returns 1,030 features at no `
      +`threshold, 511 at 20 vertices and 186 at 45. A threshold is for dropping ponds and `
      +`basins you did not come for, not for getting under a limit.</small></div>`
      +`<div class="field"><label class="field-label" for="polygon-margin">Read this far outside `
      +`the study area's bounds (metres)</label>`
      +`<input id="polygon-margin" type="number" min="0" step="100" value="${margin}">`
      +`<small>Teddington Lock sits 4,460 m outside South London's bounds, so the reach that `
      +`study needs is 5,000. There is no ceiling here: the cost of a larger box is the read, and `
      +`the read is local.</small></div>`
      +(box
        ?`<p class="muted">Reading ${esc(box.map(c=>c.toFixed(4)).join(', '))} — the study `
          +`area's bounds${margin?` widened by ${margin.toLocaleString()} m`:''}. A layer read for `
          +`one study area is refused for another, so moving the area means reading again.</p>`
        :`<p class="notice">Connect a Study area. The box to read comes from its bounds, and `
          +`without one there is nothing to scope the read to.</p>`)
      +`<div class="field"><label class="field-label" for="polygon-extract">Published .osm.pbf `
      +`extract</label>`
      +`<input id="polygon-extract" type="file" accept=".pbf,.osm.pbf,application/octet-stream">`
      +`<small>Any published extract, downloaded here or given to you. It is read where it sits `
      +`and never copied into this application; only the areas it yields are kept.</small></div>`
      +(()=>{
        // The same arrangement the street network uses, and for the same reason: Geofabrik sends
        // no CORS header, so the application works out WHICH file and the browser fetches it.
        // The suggestion is made against the READ BOX, not the boundary -- a margin that reaches
        // into the next region is a margin whose extract must cover it, and South London's 5 km
        // crosses the Greater London boundary at Teddington.
        if(!box)return '';
        const regions=extractsFor({type:'Polygon',coordinates:[[
          [box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]],
        ]] as unknown as never});
        if(!regions.length)return `<p class="muted">No catalogued extract covers this box.</p>`;
        return `<label class="field-label">Don't have one? Download an extract covering this `
          +`box</label><div class="extract-links">`
          +regions.map(region=>`<a class="button" href="${esc(region.pbf)}" download `
            +`target="_blank" rel="noopener noreferrer">↓ ${esc(region.name)}</a>`).join('')
          +`</div><small>Your browser downloads it from `
          +`${esc(new URL(regions[0].pbf).host)}; this application cannot fetch it for you, as `
          +`that host sends no CORS header. Catalogue of ${EXTRACT_CATALOGUE_TAKEN}; ODbL. `
          +`Regions are fixed, not extents: the smallest one containing this box is what there is `
          +`to download, and it may be far larger than the box. Come back to the file box above `
          +`once it has landed.</small>`;
      })()
      +`<p id="polygon-extract-status" class="muted"></p>`;
  }

  html+=`<div class="field"><label class="field-label" for="polygon-name-field">Which property `
    +`names each feature</label>`
    +`<input id="polygon-name-field" maxlength="100" value="${esc(p.nameField||'')}" `
    +`placeholder="Not set">`
    +`<small>Nothing is guessed from a property name. Unset numbers the features; a property the `
    +`file does not carry is refused rather than left blank.</small></div>`
    +`<div class="field"><label class="field-label" for="polygon-layer-name">What to call the `
    +`layer</label><input id="polygon-layer-name" maxlength="100" value="${esc(p.layerName||'')}" `
    +`placeholder="${esc(p.label||'Polygon layer')}"><small>Where a reader toggles it on a `
    +`map.</small></div>`
    // THE AREA PORT, which nothing offered until a test could not connect one. The port is
    // optional -- a file layer needs no area, which is what keeps this widget in the input stage
    // on a blank canvas -- and an acquisition cannot proceed without it, so the picker is in both
    // paths rather than only in the one that refuses.
    +`<div class="field"><label class="field-label" for="polygon-area">Study area `
    +`(${method==='extract'?'required: it is the scope of the read':'optional'})</label>`
    +`<select id="polygon-area" data-map-port="area"><option value="">Not connected</option>`
    +areaSources.map(source=>`<option value="${esc(source.id)}" `
      +`${connectedArea===source.id?'selected':''}>${esc(source.label)}</option>`).join('')
    +`</select><small>${method==='extract'
      ?'The box to read comes from this area\u2019s bounds, and a layer read for one area is '
        +'refused for another.'
      :'A layer read from a file is read as published, so it is not scoped to anything.'
    }</small></div>`
    +layerCard(n,esc);
  return html;
}
