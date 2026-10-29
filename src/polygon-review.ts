import type {WorkflowNode} from './types.js';
import {element} from './dom.js';
import L from 'leaflet';

/** SEE THE POLYGONS, THEN KEEP THE ONES YOU CAME FOR.
 *
 *  The practitioner, 2026-10-29, after a read of Greater London's water areas returned 606
 *  features where two were wanted:
 *
 *  > Perhaps the polygon input can have a polygon viewer that has polygons in view and the rows
 *  > associated with them. If I click on the row the polygon is highlighted. And then I can hide
 *  > it.
 *
 *  Which is a better answer than the one it replaced. The first design filtered at read time by a
 *  named property and a list of values -- and you cannot name values you have not seen. A read of
 *  OpenStreetMap water areas returns ponds, basins and a boating lake whose names nobody knows in
 *  advance, so a typed predicate asks the practitioner to already have the answer. Looking is how
 *  you find out which two of 606 are the Thames.
 *
 *  Hidden rather than deleted, and by id: the read is unchanged and repeatable, the layer carries
 *  what survives, and the count of what was set aside travels with it. A practitioner who hides
 *  the wrong reach gets it back by unchecking a box rather than by reading 124 MB again.
 *
 *  Built on `openInputDataEditor`'s shape, which is the pushpin editor beside it: its own markup,
 *  its own Leaflet map, and an apply that hands back the one thing it decided. */

const markup=`<dialog id="polygon-dialog" aria-labelledby="polygon-dialog-title">
<div class="area-dialog-heading"><h2 id="polygon-dialog-title">Choose features</h2>
<button id="polygon-review-close" class="icon-button" aria-label="Close the feature viewer">×</button></div>
<p class="description">Every feature the read returned. Select a row to find it on the map; clear its box to leave it out of the layer. Nothing is deleted — the read is unchanged, and a feature you set aside comes back by ticking it again.</p>
<div class="polygon-review-layout"><div id="polygon-review-map"></div>
<div id="polygon-review-rows" role="listbox" aria-label="Features this read returned"></div></div>
<p id="polygon-review-status" class="notice" role="status"></p>
<div class="area-dialog-actions"><button id="polygon-review-all" class="button">Keep all</button>
<button id="polygon-review-cancel" class="button">Cancel</button>
<button id="polygon-review-apply" class="button primary">Keep selection</button></div></dialog>`;

type Feature=WorkflowNode<'polygon_input'>['params']['data']['features'][number];
const ringsOf=(feature:Feature):number[][][]=>feature.geometry.type==='Polygon'
  ?feature.geometry.coordinates as unknown as number[][][]
  :(feature.geometry.coordinates as unknown as number[][][][]).flat();
const verticesOf=(feature:Feature)=>ringsOf(feature).reduce((n,ring)=>n+ring.length,0);

const KEPT={color:'#176b59',weight:1.5,fillColor:'#176b59',fillOpacity:.18};
const HIDDEN={color:'#8C8C8C',weight:1,fillColor:'#8C8C8C',fillOpacity:.06,dashArray:'3 3'};
/** The selected row's feature, drawn so it can be found among six hundred. Not a hue from the
 *  figure palette: this is a pointer on a working surface, not a category in a published map. */
const PICKED={color:'#C2410C',weight:3,fillColor:'#C2410C',fillOpacity:.35};

export function openPolygonReview(node:WorkflowNode<'polygon_input'>,
  esc:(value:unknown)=>string,onApply:(hidden:string[])=>boolean|void){
  if(!document.querySelector('#polygon-dialog'))document.body.insertAdjacentHTML('beforeend',markup);
  const dialog=element('#polygon-dialog') as HTMLDialogElement;
  const $=<S extends string>(s:S)=>element(s,dialog);
  const features=node.params.data.features as Feature[];
  const hidden=new Set(node.params.hidden||[]);
  const layers=new Map<string,L.GeoJSON>();
  let picked:string|null=null,map:L.Map|null=null;

  const style=(id:string)=>id===picked?PICKED:hidden.has(id)?HIDDEN:KEPT;
  const restyle=(id:string)=>layers.get(id)?.setStyle(style(id) as L.PathOptions);

  const status=()=>{
    const kept=features.length-hidden.size;
    $('#polygon-review-status').textContent=kept
      ? `${kept.toLocaleString()} of ${features.length.toLocaleString()} features kept`
        +`${hidden.size?`, ${hidden.size.toLocaleString()} set aside`:''}.`
      : 'Every feature is set aside, so this layer would hold nothing. Tick at least one.';
    ($('#polygon-review-apply') as HTMLButtonElement).disabled=!kept;
  };

  const rows=()=>{
    $('#polygon-review-rows').innerHTML=features.map(feature=>{
      const id=String(feature.id);
      return `<div class="polygon-review-row${picked===id?' is-picked':''}" data-feature="${esc(id)}" role="option" aria-selected="${picked===id}">`
        +`<input type="checkbox" data-keep="${esc(id)}" ${hidden.has(id)?'':'checked'} aria-label="Keep ${esc(feature.name||id)}">`
        +`<button class="polygon-review-name" data-pick="${esc(id)}">${esc(feature.name||id)}</button>`
        +`<span class="muted">${verticesOf(feature).toLocaleString()} vertices</span></div>`;
    }).join('');
  };

  const pick=(id:string)=>{
    const was=picked;picked=id;
    if(was)restyle(was);
    restyle(id);
    const layer=layers.get(id);
    if(layer&&map)map.fitBounds(layer.getBounds(),{padding:[24,24],maxZoom:14});
    rows();
    (dialog.querySelector(`[data-pick="${CSS.escape(id)}"]`) as HTMLElement|null)?.focus();
  };

  $('#polygon-review-rows').onclick=event=>{
    const target=event.target as HTMLElement;
    const id=target.closest('[data-pick]')?.getAttribute('data-pick');
    if(id)pick(id);
  };
  $('#polygon-review-rows').onchange=event=>{
    const box=event.target as HTMLInputElement;
    const id=box.getAttribute('data-keep');
    if(!id)return;
    if(box.checked)hidden.delete(id);else hidden.add(id);
    restyle(id);status();
  };
  $('#polygon-review-all').onclick=()=>{hidden.clear();rows();for(const id of layers.keys())restyle(id);status();};
  const close=()=>{dialog.close();};
  $('#polygon-review-close').onclick=close;
  $('#polygon-review-cancel').onclick=close;
  $('#polygon-review-apply').onclick=()=>{if(onApply([...hidden] as string[])!==false)close();};

  rows();status();
  dialog.showModal();

  // AFTER THE DIALOG IS OPEN, because Leaflet measures a container that has no size until then.
  if(!map){
    map=L.map($('#polygon-review-map'),{scrollWheelZoom:false,zoomAnimation:false,
      fadeAnimation:false,markerZoomAnimation:false});
    const group=L.featureGroup().addTo(map);
    for(const feature of features){
      const id=String(feature.id);
      const layer=L.geoJSON(feature.geometry as never,
        {renderer:L.canvas(),style:style(id)} as L.GeoJSONOptions);
      layer.on('click',()=>pick(id));
      layer.addTo(group);layers.set(id,layer);
    }
    if(group.getLayers().length)map.fitBounds(group.getBounds(),{padding:[16,16]});
    else map.setView([51.5,-0.12],10);
  }
  map.invalidateSize();
}
