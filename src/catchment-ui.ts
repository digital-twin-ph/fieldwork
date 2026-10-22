import type {WorkflowNode,Escape} from './types.js';
import {CATCHMENT_TYPES,downloadLimits,NETWORK_NODE_LIMIT_MAX,NETWORK_MEASURED_NODES,EXTRACT_MEASURED_NODES,JSON_EDITOR_ELEMENT_LIMIT,offersJsonEditor,defaultTravelMode} from './catchments.js';
import {recommendedPauseSeconds} from './network-throttle.js';
import {payloadStoreKind} from './payload-store.js';
import {extractsFor,EXTRACT_CATALOGUE_TAKEN} from './extract-catalogue.js';
import {networkPreviewSvg,networkPreviewCaption,networkCoverage,PREVIEW_SCALE_NOTE} from './network-preview.js';
import type {Boundary} from './types.js';
/** The picture, its measurement, and -- when it matters -- the sentence saying the download did not
 *  reach the ground it was asked for. */
function networkPreview(data:{nodes:unknown[];edges:unknown[]},boundary:Boundary|undefined,esc:Escape):string{
  const network=data as Parameters<typeof networkCoverage>[0];
  if(!network.nodes.length)return '';
  const coverage=networkCoverage(network,boundary);
  const short=coverage.boundaryCovered!==null&&coverage.boundaryCovered<0.999;
  return `<div class="network-preview-frame">${networkPreviewSvg(network,boundary)}</div>`
    +`<p class="muted">${esc(networkPreviewCaption(coverage))}</p>`
    +(boundary?`<p class="${short?'notice':'muted'}">${esc(PREVIEW_SCALE_NOTE(coverage))}</p>`:'');
}

/** `reachable_nodes` had NO Inspector panel until 2026-10-17.
 *
 *  It is addable, implemented and tested, and every parameter it declares --
 *  the travel time, the speed, the mode, the direction -- could only be set by editing the
 *  workflow file or by adding the micro-workflow that pins them. `catchmentInspector` served the
 *  five `CATCHMENT_TYPES` and `buffer_area`; nothing served this one, and no generic parameter
 *  renderer exists to fall back on. The gap was found while giving the widget a UTM zone, which
 *  is the kind of thing a palette audit cannot see: `palette.ts` asserts a widget is ADDABLE, and
 *  addable is not configurable.
 *
 *  The zone, the hemisphere and the snap limit are the OPTIONAL three, and the panel says when
 *  they are read: only for origins this step has to attach to the network itself. */
function reachInspector(n:WorkflowNode<'reachable_nodes'>,
  number:(key:string,label:string,value:number,min:number,max:number,step?:number)=>string):string{
  const p=n.params;
  const optional=(key:string,label:string,value:number|undefined,min:number,max:number)=>
    `<div class="field"><label class="field-label" for="catchment-${key}">${label}</label>`
    +`<input id="catchment-${key}" data-catchment-param="${key}" data-optional="true" type="number" min="${min}" max="${max}" value="${value===undefined?'':value}" placeholder="Not set"></div>`;
  return number('minutes','Travel time (minutes)',p.minutes,.1,60,.1)
    +number('speedMPerMin','Speed (metres/minute)',p.speedMPerMin,1,1200)
    +`<div class="field"><label class="field-label" for="catchment-travelMode">How people travel</label>`
    +`<select id="catchment-travelMode" data-catchment-param="travelMode">`
    +(['walking','cycling','driving','other'] as const).map(m=>`<option value="${m}" ${p.travelMode===m?'selected':''}>${m[0].toUpperCase()+m.slice(1)}</option>`).join('')
    +`</select><p class="muted">The mode is checked against the speed and refuses an obvious mismatch. It certifies nothing about any actual traveller, and public transport is not a mode here because it follows routes and a timetable rather than the street network.</p></div>`
    +`<div class="field"><label class="field-label" for="catchment-direction">Travel direction</label>`
    +`<select id="catchment-direction" data-catchment-param="direction">`
    +`<option value="outbound" ${p.direction==='outbound'?'selected':''}>From site (outbound)</option>`
    +`<option value="inbound" ${p.direction==='inbound'?'selected':''}>To site (inbound)</option>`
    +`</select><p class="muted">Inbound reverses every edge, which answers who can reach the site rather than where it can get to. On one-way streets the two differ.</p></div>`
    +`<div class="inspector-divider"></div><span class="inspector-section">Attaching origins to the network</span>`
    +`<p class="muted">Read only for origins that arrive WITHOUT a network junction. A point snapped before this step keeps the junction and the distance it arrived with, nothing is projected, and these three are not used. Leave them unset in that case: the run says so by name if an unattached origin turns up.</p>`
    +optional('zone','WGS84 UTM zone',p.zone,1,60)
    +`<div class="field"><label class="field-label" for="catchment-hemisphere">Hemisphere</label>`
    +`<select id="catchment-hemisphere" data-catchment-param="hemisphere" data-optional="true">`
    +`<option value="" ${p.hemisphere===undefined?'selected':''}>Not set</option>`
    +`<option value="north" ${p.hemisphere==='north'?'selected':''}>North</option>`
    +`<option value="south" ${p.hemisphere==='south'?'selected':''}>South</option>`
    +`</select><p class="muted">Nearest junction is measured in metres: a degree of longitude is not a degree of latitude, and nearest-in-degrees picks the wrong junction away from the equator.</p></div>`
    +optional('maxSnapM','Snap limit: mark an origin off-network past (metres)',p.maxSnapM,0,1000)
    +`<p class="muted">Unset means no limit, and no origin is marked as having crossed unmapped ground. An origin beyond the limit is attached anyway and marked, never dropped: the sites furthest from a mapped road are where coverage is thinnest and where the question is usually being asked. The point is not moved \u2014 it keeps its own position and the distance to its junction is charged against the budget above.</p>`
    ;
}

/** The node label, with an Apply button.
 *
 *  The practitioner, 2026-10-20: *"The label for the Street Network widget should have an Apply
 *  Label button like the Study Area's. It does save the custom label even without the button but
 *  we want that in-widget workflow to be consistent across widgets."* It did save on change, and
 *  that stays -- nothing typed is lost by not pressing the button. What was missing is the
 *  affordance: a practitioner who has typed a name has no way to say so, and two widgets behaved
 *  differently for the same job. One control here, so every widget this inspector builds gets it.
 */
export function labelField(label:string,maxLength:number,esc:Escape):string{
  return `<form id="catchment-label-form" class="field"><label class="field-label" for="catchment-label">Node label</label>`
    +`<input id="catchment-label" data-catchment-param="label" maxlength="${maxLength}" value="${esc(label)}">`
    +`<button type="submit" class="button small">Apply label</button></form>`;
}
export function catchmentInspector(n:WorkflowNode,esc:Escape,boundary?:Boundary,boundaryID?:string):string{
  if(n.type==='reachable_nodes')
    return labelField(n.params.label||'',60,esc)
      +reachInspector(n as WorkflowNode<'reachable_nodes'>,
        (key,label,value,min,max,step=1)=>`<div class="field"><label class="field-label" for="catchment-${key}">${label}</label><input id="catchment-${key}" data-catchment-param="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></div>`);
  if(!Object.hasOwn(CATCHMENT_TYPES,n.type))return '';
  let html=labelField(n.params.label||'',100,esc)+`<div class="notice">Local computation. Parameters and source links appear in N3 & evidence. Outputs are modeled catchments, not observed facility use.</div>`;
  const number=(key:string,label:string,value:number,min:number,max:number,step=1)=>`<div class="field"><label class="field-label" for="catchment-${key}">${label}</label><input id="catchment-${key}" data-catchment-param="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
  if(n.type==='voronoi'||n.type==='isochrone')html+=number('zone','Computation CRS: WGS84 UTM zone',n.params.zone,1,60)+`<label class="field-label" for="catchment-hemisphere">Hemisphere</label><select id="catchment-hemisphere" data-catchment-param="hemisphere"><option value="north" ${n.params.hemisphere==='north'?'selected':''}>North</option><option value="south" ${n.params.hemisphere==='south'?'selected':''}>South</option></select><p class="muted">Input/output: CRS84. Computation projects to the selected UTM CRS. Restricted to a local zone; no global distance claim.</p>`;
  if(n.type==='isochrone')html+='<p class="muted">Large graphs are the limit here: about 5,250 network nodes is where this has been measured to strain memory. It runs in a worker, so too large a graph fails this step rather than the tab.</p>'
    +`<label class="field-label" for="catchment-thresholds">Time thresholds (minutes, comma separated)</label><input id="catchment-thresholds" data-catchment-param="thresholds" value="${(n.params.thresholds||[]).join(', ')}"><small>Up to six increasing values. Leave empty to use the single travel time below.</small><label><input type="checkbox" data-catchment-param="fillHoles" ${n.params.fillHoles?'checked':''}> Fill interior holes (illustrative regions)</label><p class="muted">Infill can include locations not reachable on the network. Keep off for corridor coverage.</p>`+number('minutes','Travel time (minutes)',n.params.minutes,.1,60,.1)+number('speedMPerMin','Walking speed (metres/minute)',n.params.speedMPerMin,1,200)+number('bufferM','Final walk off the street (metres)',n.params.bufferM,1,100)+number('maxSnapM','Snap limit: mark a route off-network past (metres)',n.params.maxSnapM,0,1000)+`<label class="field-label" for="catchment-direction">Travel direction</label><select id="catchment-direction" data-catchment-param="direction"><option value="outbound" ${n.params.direction==='outbound'?'selected':''}>From site (outbound)</option><option value="inbound" ${n.params.direction==='inbound'?'selected':''}>To site (inbound)</option></select><p class="muted">All three legs are charged against the travel time: the walk onto the network, the streets, and the walk off. A site past the snap limit is routed anyway and marked; one whose walk alone spends the budget gets no catchment.</p>`;
  if(n.type==='summarize_points_to_polygon')html+=`<label class="field-label" for="catchment-boundary">Points on polygon boundary</label><select id="catchment-boundary" data-catchment-param="boundary"><option value="include" ${n.params.boundary==='include'?'selected':''}>Include in every matching polygon</option><option value="exclude" ${n.params.boundary==='exclude'?'selected':''}>Exclude boundary points</option></select><label class="field-label" for="catchment-valueField">Optional numeric field to sum</label><input id="catchment-valueField" data-catchment-param="valueField" maxlength="100" value="${esc(n.params.valueField)}"><p class="muted">Location count is always retained. Empty field: chart counts locations. Enter DEATHS: chart sums deaths. Missing/non-numeric values are counted separately. Multiple memberships are reported, never silently deduplicated.</p>`;
  if(n.type==='network_input')html+=`<label class="field-label" for="network-input-method">Input method</label><select id="network-input-method" data-catchment-param="inputMethod"><option value="file" ${n.params.inputMethod!=='osm'&&n.params.inputMethod!=='extract'?'selected':''}>Upload network file</option><option value="osm" ${n.params.inputMethod==='osm'?'selected':''}>Download from OpenStreetMap</option><option value="extract" ${n.params.inputMethod==='extract'?'selected':''}>Read a published .osm.pbf extract (Geofabrik)</option></select>`+(n.params.inputMethod==='extract'?`<label class="field-label" for="network-travel-mode">Travel mode</label><select id="network-travel-mode" data-catchment-param="travelMode">`
    +`<option value="walking" ${(n.params.travelMode??defaultTravelMode(boundaryID))!=='driving'?'selected':''}>Walking</option>`
    +`<option value="driving" ${(n.params.travelMode??defaultTravelMode(boundaryID))==='driving'?'selected':''}>Driving</option>`
    +`</select>`
    // WHAT THE CHOICE DOES, at the control. Carried as a field hint, not a commentary paragraph:
    // the two values keep different ways, and that is the whole of what there is to decide here.
    +`<small>Walking keeps footways, paths and steps; driving keeps roads and their one-way rules.</small>`
    // WHICH FILE, and a link that starts the browser's own download of it. Geofabrik serves no
    // CORS header, so this application cannot fetch the file; the browser can, and then it is on
    // the practitioner's computer for every province after this one.
    +`<label class="field-label" for="network-extract">Published .osm.pbf extract</label>`
    +`<input id="network-extract" type="file" accept=".pbf,.osm.pbf,application/octet-stream">`
    +`<p class="muted">Any published extract, downloaded here or given to you. Clipped to the study `
    +`area; the file stays where it is. Measured to ${EXTRACT_MEASURED_NODES.toLocaleString('en')} `
    +`junctions.</p>`
    +(()=>{
      const regions=boundary?extractsFor(boundary):[];
      if(!regions.length)return boundary?`<p class="muted">No catalogued extract covers this area.</p>`:'';
      // THE QUERY IS THE APP'S, THE FETCH IS THE BROWSER'S. The practitioner, 2026-10-22:
      // *"The query can be done in the app, including the URL. Then I use the link (button) to
      // download the file. That was the Option 1 intent."* It is, and it was built that way --
      // this widget works out which published extracts contain the study area and hands over
      // their URLs, because Geofabrik sends no CORS header and the application may not fetch
      // them itself. What it did not do was LOOK like that: the URLs were small text links
      // joined by a middot, above a file input, with nothing saying one leads to the other.
      return `<label class="field-label">Don't have one? Download an extract covering this area</label>`
        +`<p class="extract-links">`+regions.map(region=>
          `<a class="button" href="${esc(region.pbf)}" download target="_blank" rel="noopener noreferrer">`
          +`↓ ${esc(region.name)}</a>`).join('')
        +`</p><small>Your browser downloads it from ${esc(new URL(regions[0].pbf).host)}; `
        +`this application cannot fetch it for you, as that host sends no CORS header. `
        +`Catalogue of ${EXTRACT_CATALOGUE_TAKEN}; ODbL. Sizes are not published, and a country `
        +`is typically hundreds of megabytes. Come back to the file box above once it has landed.`
        +`</small>`;
    })()
    // IN FORCE HERE TOO, so it is settable here. The extract clip reads marginM exactly as the
    // download does, and the control lived only on the download: a setting governing this path
    // with no way to see or change it from this path.
    +number('marginM','Clip margin outside study bounds (metres)',n.params.marginM??250,0,2000)
    +`<p id="network-extract-status" class="muted"></p>`
    :n.params.inputMethod==='osm'?`<label class="field-label" for="network-travel-mode">Travel mode to download for</label><select id="network-travel-mode" data-catchment-param="travelMode">`
    +`<option value="walking" ${(n.params.travelMode??defaultTravelMode(boundaryID))!=='driving'?'selected':''}>Walking</option>`
    +`<option value="driving" ${(n.params.travelMode??defaultTravelMode(boundaryID))==='driving'?'selected':''}>Driving</option>`
    +`</select>`
    +`<small>Walking keeps footways, paths and steps; driving keeps roads and their one-way rules.</small>`
    // WHY IT IS DRIVING HERE, said where the default was chosen rather than left to be noticed.
    +(n.params.travelMode===undefined&&defaultTravelMode(boundaryID)==='driving'
      ?`<p class="muted">Default for a published ${/-(ADM[0-9])-/i.exec(boundaryID??'')?.[1]?.toUpperCase()} unit.</p>`
      :'')
    
    +number('marginM','Download margin outside study bounds (metres)',n.params.marginM??250,0,2000)+number('pauseSeconds','Minimum pause between OSM requests (seconds)',n.params.pauseSeconds??60,60,900)

    
    +(payloadStoreKind()==='indexeddb'?'':`<p class="notice" id="network-store-warning">Saved data is in the small store on this device, about 5 MB in all, so a street network will be refused. Export the workflow to keep one.</p>`)
    +`<button class="button primary" id="download-network">Download and save OSM network</button><button class="button" id="stop-network-download" hidden>Stop</button><p class="muted">Sends the study area's bounds to overpass-api.de, which is asked to count first, so too large an area is refused before anything is sent.</p>`:'')// THE GRAPH LIMIT IS A DOWNLOAD BUDGET, so it belongs to the download. It sizes the bytes and
    // features this widget will accept from overpass-api.de; an extract on this device is not
    // transferred and has no such budget, and an uploaded file keeps its own extent. Shown on all
    // three until 2026-10-22, where on two of them it governed nothing.
    +(n.params.inputMethod==='osm'
      ?number('maxNodes','Graph limit (junctions); segments allowed at 2.5x this',n.params.maxNodes??50000,500,NETWORK_NODE_LIMIT_MAX)
        +`<p class="muted">Accepts ${(downloadLimits(n.params.maxNodes).maxBytes/1e6).toFixed(1)} MB and `
        +`${downloadLimits(n.params.maxNodes).maxFeatures.toLocaleString('en')} features here.</p>`
        +((n.params.maxNodes??50000)>NETWORK_MEASURED_NODES
          ?`<p class="notice">Past the largest response this project has downloaded: ${NETWORK_MEASURED_NODES.toLocaleString('en')} junctions from 7.4 MB.</p>`
          :'')
      :'')
    // WHICH GRAPH THIS IS. The practitioner, 2026-10-22, mid-download: *"the Inspector still shows
    // the street network preview from the first approach (opening the downloaded PBF file)."* It
    // does, correctly -- it is the graph this node holds -- but it sits directly under the
    // download controls with nothing marking it as the saved one, so it reads as the result of
    // the download just started. The caption says where it came from; this says when.
    +(n.params.data.nodes.length
      ?`<small>Saved on this node${n.params.inputMethod==='osm'?', from an earlier input. A download replaces it only when it finishes.':''}</small>`
      :'')
    +networkPreview(n.params.data,boundary,esc)
    +`<p>${n.params.data.nodes.length} nodes · ${n.params.data.edges.length} directed edges</p><p>${esc(n.params.data.source)}</p>${n.params.inputMethod==='osm'||n.params.inputMethod==='extract'?'':`<label class="field-label" for="network-upload">Upload GraphML or JSON</label><input id="network-upload" type="file" accept=".json,.graphml"><small>GraphML (directed, with its CRS declared as EPSG:4326), raw Overpass JSON, or a network JSON this application exported. Not GeoPackage, shapefile or OSM XML. Up to ${(downloadLimits(n.params.maxNodes).maxBytes/1e6).toFixed(1)} MB at this graph limit.</small><p class="muted">An uploaded file keeps its own extent.</p><details><summary>Edit bounded network JSON</summary>${!offersJsonEditor(n.params.data)?`<p class="muted">Too large to hand-edit here: ${(n.params.data.nodes.length+n.params.data.edges.length).toLocaleString('en')} nodes and edges against ${JSON_EDITOR_ELEMENT_LIMIT.toLocaleString('en')}. Export the workflow to work on the graph.</p>`:`<label class="field-label" for="network-json">Network JSON: nodes, edges, source</label><textarea id="network-json" rows="10">${esc(JSON.stringify(n.params.data,null,2))}</textarea><button class="button" id="save-network">Save network edits</button>`}<label class="field-label" for="network-file">Upload GraphML / JSON (up to ${(downloadLimits(n.params.maxNodes).maxBytes/1e6).toFixed(1)} MB)</label><input id="network-file" type="file" accept=".json,.graphml,application/json,application/xml"><p class="muted">Directed edges need from, to and lengthM in metres; the manual page carries the full contract.</p></details>`}`;
  if(n.type==='network_input'){
    // WHO can serve this, before the download rather than after it fails. The practitioner:
    // "We build an endpoint ping that shows up on the widget before download and show whether API
    // endpoint is live or not and which one worked if it did (receipts)" -- and then, on the
    // mechanism: "/api/status is better than ping because it returns useful information." It is:
    // the rate limit, the free slots, the queries running and when the next slot frees. A ping
    // returns a boolean, and on 2026-10-19 that boolean was wrong -- a healthy instance took 14 to
    // 27 seconds to answer a one-line probe, so the client called it dead.
    //
    // Asked only when the practitioner asks, because every check is a request to a donated service.
    html+='<div class="field"><button class="button" id="check-endpoints">Check endpoint status</button>'
      +'<div id="endpoint-status"></div>'
      +'<p class="muted">Reads each instance\'s own status: free slots, and when the next one frees.</p></div>';
    // WHICH ONE SERVED the graph that is saved, which is provenance and not decoration.
    const held=n.params.data?.provenance as Record<string,unknown>|undefined;
    if(held?.travelMode)html+=`<p class="muted">Saved graph was downloaded for <strong>${esc(String(held.travelMode))}</strong>.</p>`;
    if(held)html+=`<p class="muted">Saved graph: ${held.fromCache
      ?`served from this device's cache, first retrieved ${esc(String(held.retrievedAt??'at an unrecorded time'))}`
      :`${esc(String(held.attribution??'OpenStreetMap contributors'))}, retrieved ${esc(String(held.retrievedAt??'at an unrecorded time'))}`}.</p>`;
    html+='<p id="network-download-status" role="status"></p><p class="muted">One OSM request at a time; at least 60 seconds between attempts. No automatic retries. Saved networks remain usable offline. Changing the boundary or buffer does not expand a saved graph.</p>';
  }
  return html;
}
