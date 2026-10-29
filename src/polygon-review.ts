import type {WorkflowNode} from './types.js';
import {element} from './dom.js';
import L from 'leaflet';
import {clipToBox,applyNames,applyMerges,namedByFile} from './polygon-layer.js';

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
<p id="polygon-review-selection" class="notice" hidden>
<span id="polygon-review-selected"></span>
<button id="polygon-review-keep-only" class="button small">Keep only these</button>
<button id="polygon-review-discard" class="button small">Discard these</button>
<button id="polygon-review-merge" class="button small">Merge these</button>
<button id="polygon-review-clear" class="button small">Clear selection</button></p>
<p id="polygon-review-status" class="notice" role="status"></p>
<div class="area-dialog-actions"><label class="polygon-review-unnamed"><input type="checkbox" id="polygon-review-hide-unnamed"> Set aside the unnamed</label>
<button id="polygon-review-clip" class="button" hidden>Clip to the box</button>
<button id="polygon-review-all" class="button">Keep all</button>
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
/** Chosen on the map for a bulk action. Distinct from PICKED, which marks the one row you are
 *  looking at: these are the ones an action is about to apply to. */
const CHOSEN={color:'#1D4ED8',weight:3,fillColor:'#1D4ED8',fillOpacity:.4};
/** The box the read was scoped to. A frame, so it is drawn as one and takes no clicks. */
const BOX={color:'#4D4D4D',weight:1.5,dashArray:'6 4',fill:false,interactive:false};

export function openPolygonReview(node:WorkflowNode<'polygon_input'>,
  esc:(value:unknown)=>string,
  onApply:(decided:{hidden:string[];clipped:boolean;names:Record<string,string>;
    merges:string[][]})=>boolean|void,
  /** The box the read was scoped to, drawn for reference. The practitioner, 2026-10-29: *"can we
   *  also show the study area bounding box?"* -- which is the frame everything here was read
   *  inside, and without it a river running off the edge looks like a river that was cut. */
  box?:readonly [number,number,number,number]){
  if(!document.querySelector('#polygon-dialog'))document.body.insertAdjacentHTML('beforeend',markup);
  const dialog=element('#polygon-dialog') as HTMLDialogElement;
  const $=<S extends string>(s:S)=>element(s,dialog);
  const features=node.params.data.features as Feature[];
  const hidden=new Set(node.params.hidden||[]);
  const layers=new Map<string,L.GeoJSON>();
  let picked:string|null=null,map:L.Map|null=null;
  let group:L.FeatureGroup|null=null,surface:L.Canvas|null=null;
  /** What the clip leaves of each feature, or null where it leaves nothing. Empty while the layer
   *  is uncut. */
  const cut=new Map<string,unknown>();
  /** CHOSEN ON THE MAP, which is the other direction. The rows answer "is this one kept"; the map
   *  answers "which ones are these". The practitioner, 2026-10-29: *"Is it possible to also do
   *  the reverse, select the polygons and have a few actions - keep, discard, cancel."* A
   *  selection is transient and decides nothing by itself -- the action does. */
  const selected=new Set<string>();
  /** Whether the layer is cut to the frame. Shown here the moment it is pressed, and carried out
   *  again by the run -- the same function both times, so the preview is the answer. */
  let clipped=node.params.clipToBox===true;
  /** The names given here, and the groups merged here. Both are decisions the run applies in the
   *  same order this preview does, so what is listed is what the layer will hold. */
  const given=new Map(Object.entries(node.params.names||{}));
  let merges:string[][]=(node.params.merges||[]).map(group=>[...group]);
  /** The features as they stand after naming and merging: what every row, count and shape below
   *  is about. Recomputed rather than mutated, so an undone merge needs no bookkeeping. */
  let shown=features;
  const settle=()=>{
    shown=applyMerges(applyNames(features,Object.fromEntries(given)),merges);
  };

  const style=(id:string)=>selected.has(id)?CHOSEN:id===picked?PICKED:hidden.has(id)?HIDDEN:KEPT;
  const restyle=(id:string)=>layers.get(id)?.setStyle(style(id) as L.PathOptions);

  const status=()=>{
    const kept=shown.filter(f=>!hidden.has(String(f.id))&&!outside(String(f.id))).length;
    $('#polygon-review-status').textContent=kept
      ? `${kept.toLocaleString()} of ${shown.length.toLocaleString()} features kept`
        +`${hidden.size?`, ${hidden.size.toLocaleString()} set aside`:''}`
        +`${clipped?', cut to the box':''}.`
      : 'Every feature is set aside, so this layer would hold nothing. Tick at least one.';
    ($('#polygon-review-apply') as HTMLButtonElement).disabled=!kept;
  };

  const selection=()=>{
    const bar=$('#polygon-review-selection');
    bar.hidden=selected.size===0;
    $('#polygon-review-selected').textContent=selected.size
      ?`${selected.size.toLocaleString()} chosen on the map.`:'';
  };
  const act=(keepOnly:boolean)=>{
    if(!selected.size)return;
    // KEEP ONLY sets aside everything that was not chosen; DISCARD sets aside what was. Both
    // leave the read alone -- this is the same hiding the boxes do, applied to a set at once.
    if(keepOnly)for(const feature of shown){
      const id=String(feature.id);
      if(selected.has(id))hidden.delete(id);else hidden.add(id);
    }
    else for(const id of selected)hidden.add(id);
    selected.clear();
    for(const id of layers.keys())restyle(id);
    rows();selection();status();
  };
  /** DRAW WHAT THE LAYER WOULD HOLD. The same `clipToBox` the run uses, so what is on screen
   *  before Apply is what the layer carries after it. */
  const recut=()=>{
    cut.clear();
    if(clipped&&box)for(const feature of shown){
      const kept=clipToBox([feature],box);
      cut.set(String(feature.id),kept.length?kept[0].geometry:null);
    }
  };
  const outside=(id:string)=>clipped&&box&&cut.get(id)===null;
  const redraw=()=>{
    if(!map||!group||!surface)return;
    group.clearLayers();layers.clear();
    for(const feature of shown){
      const id=String(feature.id);
      const geometry=clipped&&box?cut.get(id):feature.geometry;
      if(!geometry)continue;
      const layer=L.geoJSON(geometry as never,
        {renderer:surface,style:style(id)} as L.GeoJSONOptions);
      layer.on('click',()=>{
        if(selected.has(id))selected.delete(id);else selected.add(id);
        restyle(id);rows();selection();
      });
      layer.addTo(group);layers.set(id,layer);
    }
  };
  const rows=()=>{
    $('#polygon-review-rows').innerHTML=shown.map(feature=>{
      const id=String(feature.id);
      return `<div class="polygon-review-row${picked===id?' is-picked':''}`
        +`${selected.has(id)?' is-chosen':''}" data-feature="${esc(id)}" role="option" `
        +`aria-selected="${picked===id}">`
        +`<input type="checkbox" data-keep="${esc(id)}" ${hidden.has(id)?'':'checked'} aria-label="Keep ${esc(feature.name||id)}">`
        +`<input class="polygon-review-name" data-name="${esc(id)}" value="${esc(feature.name||id)}" `
        +`maxlength="100" aria-label="Name for ${esc(feature.name||id)}"`
        +`${namedByFile(feature,node.params.nameField)?'':' data-unnamed="true"'}>`
        +`<span class="muted">${outside(id)?'outside the box'
          :`${verticesOf(feature).toLocaleString()} vertices`}</span></div>`;
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

  $('#polygon-review-rows').addEventListener('input',event=>{
    const field=event.target as HTMLInputElement;
    const id=field.getAttribute('data-name');
    if(!id)return;
    // A NAME GIVEN HERE, over whatever the file called it. The practitioner, 2026-10-29: *"That's
    // a major gap if we were to have maps showing polygons with meaningful names."* Cleared back
    // to empty removes the override rather than storing a blank.
    const value=field.value.trim();
    if(value)given.set(id,value);else given.delete(id);
    settle();status();
  });
  // FOCUSING A NAME FINDS IT ON THE MAP. The class is toggled in place rather than by
  // re-rendering the list: a re-render replaces the input you are typing into and takes the
  // caret with it.
  $('#polygon-review-rows').addEventListener('focusin',event=>{
    const id=(event.target as HTMLElement).getAttribute?.('data-name');
    if(!id||id===picked)return;
    const was=picked;picked=id;
    for(const row of Array.from($('#polygon-review-rows').children))
      row.classList.toggle('is-picked',row.getAttribute('data-feature')===id);
    if(was)restyle(was);
    restyle(id);
    const layer=layers.get(id);
    if(layer&&map)map.fitBounds(layer.getBounds(),{padding:[24,24],maxZoom:14});
  });
  $('#polygon-review-rows').onclick=event=>{
    const target=event.target as HTMLElement;
    // THE ROW CHOOSES TOO, not only the map. Selecting on a map needs a mouse and good aim at a
    // 25-vertex island; the list is the same decision for anyone who would rather read than
    // point, and it is the only route for a keyboard.
    const row=target.closest('[data-feature]')?.getAttribute('data-feature');
    if(!row||target.closest('input'))return;
    if(selected.has(row))selected.delete(row);else selected.add(row);
    restyle(row);rows();selection();
  };
  $('#polygon-review-rows').onchange=event=>{
    const box=event.target as HTMLInputElement;
    const id=box.getAttribute('data-keep');
    if(!id)return;
    if(box.checked)hidden.delete(id);else hidden.add(id);
    restyle(id);status();
  };
  $('#polygon-review-all').onclick=()=>{hidden.clear();rows();for(const id of layers.keys())restyle(id);status();};
  $('#polygon-review-clip').onclick=()=>{
    clipped=!clipped;
    ($('#polygon-review-clip') as HTMLButtonElement).textContent=clipped
      ?'Undo the clip':'Clip to the box';
    recut();redraw();rows();status();
  };
  // MERGE THE CHOSEN, which the practitioner names as the third reduction beside keep/discard
  // and clip. Two reaches of one river, or a dock drawn as four touching basins, are one thing a
  // workflow counts once.
  $('#polygon-review-merge').onclick=()=>{
    if(selected.size<2){
      $('#polygon-review-status').textContent='Choose at least two features to merge.';return;
    }
    merges=[...merges,[...selected]];
    selected.clear();
    settle();recut();redraw();rows();selection();status();
  };
  // SET ASIDE WHAT THE FILE DID NOT NAME. Exact rather than guessed: it asks whether the property
  // you nominated carried a value, not whether the name looks automatic.
  $('#polygon-review-hide-unnamed').onchange=event=>{
    const on=(event.target as HTMLInputElement).checked;
    for(const feature of shown){
      const id=String(feature.id);
      if(namedByFile(feature,node.params.nameField)||given.has(id))continue;
      if(on)hidden.add(id);else hidden.delete(id);
    }
    rows();status();
    for(const id of layers.keys())restyle(id);
  };
  $('#polygon-review-keep-only').onclick=()=>act(true);
  $('#polygon-review-discard').onclick=()=>act(false);
  $('#polygon-review-clear').onclick=()=>{
    const was=[...selected];selected.clear();
    for(const id of was)restyle(id);
    rows();selection();
  };
  const close=()=>{dialog.close();};
  $('#polygon-review-close').onclick=close;
  $('#polygon-review-cancel').onclick=close;
  $('#polygon-review-apply').onclick=()=>{
    if(onApply({hidden:[...hidden] as string[],clipped,
      names:Object.fromEntries(given),merges})!==false)close();};

  // The clip is only offered where there is a frame to clip to.
  ($('#polygon-review-clip') as HTMLButtonElement).hidden=!box;
  ($('#polygon-review-clip') as HTMLButtonElement).textContent=clipped
    ?'Undo the clip':'Clip to the box';
  settle();recut();rows();status();selection();
  dialog.showModal();

  // AFTER THE DIALOG IS OPEN, because Leaflet measures a container that has no size until then.
  if(!map){
    map=L.map($('#polygon-review-map'),{scrollWheelZoom:false,zoomAnimation:false,
      fadeAnimation:false,markerZoomAnimation:false});
    group=L.featureGroup().addTo(map);
    // ONE RENDERER FOR ALL OF THEM. Each feature used to get its own `L.canvas()`, which is one
    // canvas element each: 279 of them stacked, and only the topmost receives a pointer event. So
    // the map drew correctly and answered no clicks, reported 2026-10-29 -- *"I still cannot
    // select polygons from the map canvas."* A shared renderer hit-tests across every layer on it.
    surface=L.canvas();
    recut();redraw();
    // THE BOX THE READ WAS SCOPED TO, behind everything and taking no clicks.
    if(box){
      const [west,south,east,north]=box;
      L.rectangle([[south,west],[north,east]],BOX as L.PathOptions).addTo(map);
    }
    if(group.getLayers().length)map.fitBounds(group.getBounds(),{padding:[16,16]});
    else map.setView([51.5,-0.12],10);
  }
  map.invalidateSize();
}
