import type {WorkflowNode,Escape} from './types.js';
import {CATCHMENT_TYPES,downloadLimits} from './catchments.js';
import {recommendedPauseSeconds} from './network-throttle.js';
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
 *  It is in `ALWAYS_ADDABLE`, it is implemented, it is tested, and every parameter it declares --
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

export function catchmentInspector(n:WorkflowNode,esc:Escape,boundary?:Boundary):string{
  if(n.type==='reachable_nodes')
    return `<label class="field-label" for="catchment-label">Node label</label><input id="catchment-label" data-catchment-param="label" maxlength="60" value="${esc(n.params.label||'')}">`
      +reachInspector(n as WorkflowNode<'reachable_nodes'>,
        (key,label,value,min,max,step=1)=>`<div class="field"><label class="field-label" for="catchment-${key}">${label}</label><input id="catchment-${key}" data-catchment-param="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></div>`);
  if(!Object.hasOwn(CATCHMENT_TYPES,n.type))return '';
  let html=`<label class="field-label" for="catchment-label">Node label</label><input id="catchment-label" data-catchment-param="label" maxlength="100" value="${esc(n.params.label||'')}"><div class="notice">Local computation. Parameters and source links appear in N3 & evidence. Outputs are modeled catchments, not observed facility use.</div>`;
  const number=(key:string,label:string,value:number,min:number,max:number,step=1)=>`<div class="field"><label class="field-label" for="catchment-${key}">${label}</label><input id="catchment-${key}" data-catchment-param="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
  if(n.type==='voronoi'||n.type==='isochrone')html+=number('zone','Computation CRS: WGS84 UTM zone',n.params.zone,1,60)+`<label class="field-label" for="catchment-hemisphere">Hemisphere</label><select id="catchment-hemisphere" data-catchment-param="hemisphere"><option value="north" ${n.params.hemisphere==='north'?'selected':''}>North</option><option value="south" ${n.params.hemisphere==='south'?'selected':''}>South</option></select><p class="muted">Input/output: CRS84. Computation projects to the selected UTM CRS. Restricted to a local zone; no global distance claim.</p>`;
  if(n.type==='isochrone')html+=`<label class="field-label" for="catchment-thresholds">Time thresholds (minutes, comma separated)</label><input id="catchment-thresholds" data-catchment-param="thresholds" value="${(n.params.thresholds||[]).join(', ')}"><small>Up to six increasing values. Leave empty to use the single travel time below.</small><label><input type="checkbox" data-catchment-param="fillHoles" ${n.params.fillHoles?'checked':''}> Fill interior holes (illustrative regions)</label><p class="muted">Infill can include locations not reachable on the network. Keep off for corridor coverage.</p>`+number('minutes','Travel time (minutes)',n.params.minutes,.1,60,.1)+number('speedMPerMin','Walking speed (metres/minute)',n.params.speedMPerMin,1,200)+number('bufferM','Final walk off the street (metres)',n.params.bufferM,1,100)+number('maxSnapM','Snap limit: mark a route off-network past (metres)',n.params.maxSnapM,0,1000)+`<label class="field-label" for="catchment-direction">Travel direction</label><select id="catchment-direction" data-catchment-param="direction"><option value="outbound" ${n.params.direction==='outbound'?'selected':''}>From site (outbound)</option><option value="inbound" ${n.params.direction==='inbound'?'selected':''}>To site (inbound)</option></select><p class="muted">Dijkstra uses directed edges and supplied metre lengths. Includes partial curved edges. Buffer approximates off-street coverage; holes remain unless infill is enabled. All three segments are charged against the travel time: the straight walk onto the network, the streets, and the final walk off the street, which is this width where the budget allows it and narrower where it does not. The region therefore stops at the time it is drawn for instead of overshooting it. A site further than the snap limit is routed anyway and marked off-network; one whose walk alone spends the budget gets no catchment. Both are named on this widget. Graph extent may truncate coverage.</p>`;
  if(n.type==='summarize_polygons')html+=`<label class="field-label" for="catchment-boundary">Points on polygon boundary</label><select id="catchment-boundary" data-catchment-param="boundary"><option value="include" ${n.params.boundary==='include'?'selected':''}>Include in every matching polygon</option><option value="exclude" ${n.params.boundary==='exclude'?'selected':''}>Exclude boundary points</option></select><label class="field-label" for="catchment-valueField">Optional numeric field to sum</label><input id="catchment-valueField" data-catchment-param="valueField" maxlength="100" value="${esc(n.params.valueField)}"><p class="muted">Location count is always retained. Empty field: chart counts locations. Enter DEATHS: chart sums deaths. Missing/non-numeric values are counted separately. Multiple memberships are reported, never silently deduplicated.</p>`;
  if(n.type==='network_input')html+=`<label class="field-label" for="network-input-method">Input method</label><select id="network-input-method" data-catchment-param="inputMethod"><option value="file" ${n.params.inputMethod!=='osm'?'selected':''}>Upload network file</option><option value="osm" ${n.params.inputMethod==='osm'?'selected':''}>Download from OpenStreetMap</option></select>`+(n.params.inputMethod==='osm'?number('marginM','Download margin outside study bounds (metres)',n.params.marginM??250,0,2000)+number('pauseSeconds','Minimum pause between OSM requests (seconds)',n.params.pauseSeconds??60,60,900)
    +`<p class="muted">60 seconds is the floor and can only be raised. A request also pays for what it takes: 30 seconds per megabyte received. At the graph limit below, this widget will accept up to ${(downloadLimits(n.params.maxNodes).maxBytes/1e6).toFixed(1)} MB, for which the recommended pause is <strong>${recommendedPauseSeconds(downloadLimits(n.params.maxNodes).maxBytes)} seconds</strong>. One request at a time, across tabs.</p>`
    +`<details><summary>Recommended pause by response size</summary><table><thead><tr><th>Response</th><th>Recommended pause</th></tr></thead><tbody>`
    +[1e6,2e6,4e6,8e6,16e6,30e6].map(b=>`<tr><td>${b/1e6} MB</td><td>${recommendedPauseSeconds(b)} s</td></tr>`).join('')
    +`</tbody></table><p class="muted">The pause a download earns is applied whether or not the knob is set this high; setting it means knowing the wait before it happens rather than after.</p></details>`
    +`<button class="button primary" id="download-network">Download and save OSM network</button><p>Uses the connected Study area's bounding box plus margin (up to 6 km across). Whole ways may extend beyond it. Sends those bounds to overpass-api.de; no key required. Retains topology rather than cutting edges at the polygon. The response and feature limits follow the graph limit below: at 2,000 junctions they are 2 MB and 15,000 features.</p>`:'')+number('maxNodes','Graph limit (junctions); segments allowed at 2.5x this',n.params.maxNodes??2000,500,50000)
    +`<p class="muted">2,000 is the measured default. A 1 km square of central London needs about 5,250, and at that size isochrone construction exhausted a 4 GB heap when measured on 2026-10-13 — so above roughly 3,000 this is untested rather than merely slower. Raising it is safe to try: the isochrone runs in a worker with a 45-second timeout, so too large a graph fails that one step rather than the tab.</p>`
    +networkPreview(n.params.data,boundary,esc)
    +`<p>${n.params.data.nodes.length} nodes · ${n.params.data.edges.length} directed edges</p><p>${esc(n.params.data.source)}</p><label class="field-label" for="network-upload">Upload GraphML or JSON</label><input id="network-upload" type="file" accept=".json,.graphml"><p>Files retain their existing network extent. Attach a URL or PDF reference below for citation.</p><details><summary>Edit bounded network JSON</summary><label class="field-label" for="network-json">Network JSON: nodes, edges, source</label><textarea id="network-json" rows="10">${esc(JSON.stringify(n.params.data,null,2))}</textarea><button class="button" id="save-network">Save network edits</button><label class="field-label" for="network-file">Upload GraphML / JSON (up to 2 MB)</label><input id="network-file" type="file" accept=".json,.graphml,application/json,application/xml"><p>Directed edges require from, to, lengthM and optional CRS84 geometry. Reverse travel requires a reverse edge. Full contract: worked-example guide.</p></details>`;
  if(n.type==='network_input')html+='<p id="network-download-status" role="status"></p><p class="muted">One OSM request at a time; at least 60 seconds between attempts. No automatic retries. Saved networks remain usable offline. Changing the boundary or buffer does not expand a saved graph.</p>';
  return html;
}
