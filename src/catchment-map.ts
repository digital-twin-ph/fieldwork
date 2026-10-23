import L from 'leaflet';
/** HOW MANY STREET SEGMENTS AN INTERACTIVE MAP DRAWS. See the sampling below for the measurement
 *  this comes from: past about a quarter of a million, every pan and zoom reprojects them all. */
export const INTERACTIVE_SEGMENT_LIMIT=200_000;
import type {Polygons} from './catchments.js';
import type {PointCollection,Escape,Position} from './types.js';

import {BASEMAP_CHOICES,type BasemapChoice} from './types.js';
import {layerSymbol,markPath} from './presentation.js';
import type {LayerShape,FillClass,FillEncoding} from './presentation.js';
import {fillClass,SPATIAL_RELATION_FILL,MARK_HALO} from './presentation.js';
export type {BasemapChoice};

/** OpenFreeMap serves VECTOR tiles, not raster, so these cannot be an `L.tileLayer` URL.
 *
 *  The practitioner asked for them on 2026-10-17: *"OpenFreeMap has more to offer down the road
 *  in terms of communication stage."* That is the right reason to want them — Positron, Liberty
 *  and Bright are cartographic DESIGNS, not just another tile server, and choosing one is the
 *  kind of judgment [118](../docs/experiments/118-cartographic-judgment-as-rules.md) records as
 *  `selected` rather than inferred.
 *
 *  Vector styles need MapLibre GL. The renderer is not swapped: `@maplibre/maplibre-gl-leaflet`
 *  puts a MapLibre canvas underneath the existing Leaflet layers, so everything this application
 *  draws — the polygons, the 188 markers, the layer control — is untouched and only layer 0
 *  changes.
 *
 *  **Attribution comes from the source and is not added here.** The TileJSON at
 *  `tiles.openfreemap.org/planet` carries its own `attribution` -- OpenFreeMap, OpenMapTiles and
 *  OpenStreetMap, linked -- which MapLibre surfaces through the bridge into Leaflet's control.
 *  Adding it by hand produced a near-duplicate credit that outlived the layer, because Leaflet
 *  refcounts attributions and the source's copy is removed with the layer while a hand-added one
 *  is not. Caught in WebKit on 2026-10-17. The obligation was already being met.
 *
 *  Data is OpenStreetMap; the project is MIT; there is no key and no stated request limit.
 *  Offline bulk download is capped at 3,000 tiles or 50 MB by their terms, which this
 *  application never approaches because it fetches only what is viewed. */
const OPENFREEMAP_ATTRIBUTION=
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> '
  +'Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const VECTOR_BASEMAPS={
  'ofm-liberty':{label:'OpenFreeMap Liberty',style:'https://tiles.openfreemap.org/styles/liberty'},
  'ofm-positron':{label:'OpenFreeMap Positron (muted)',style:'https://tiles.openfreemap.org/styles/positron'},
  'ofm-bright':{label:'OpenFreeMap Bright',style:'https://tiles.openfreemap.org/styles/bright'},
} as const;
let workerReady=false;
export const isVectorBasemap=(choice:BasemapChoice):choice is keyof typeof VECTOR_BASEMAPS=>
  Object.hasOwn(VECTOR_BASEMAPS,choice);
const BASEMAPS={
  osm:{label:'OpenStreetMap streets',url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19},
  topo:{label:'OpenTopoMap terrain',url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',attribution:'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC BY-SA)',maxZoom:17}
} as const;

/** THE basemap list, for every control that offers one.
 *
 *  The practitioner, 2026-10-20: *"I also still do not see why we do not yet have OpenFreeMap as
 *  a Basemap option in the Map widget."* It was there -- three styles, drawing since 2026-10-17 --
 *  in the map's own toolbar, and not in the widget's Inspector, which carried its own hand-written
 *  list of three options written before the vector styles existed. The project's recurring defect,
 *  again: a derivation replaced by a copy somebody has to remember to update.
 *
 *  One source now, used by both selects. What still needs a human is the `BasemapChoice` union in
 *  types.ts, which cannot import this module because the workers build types.ts without Leaflet. */
const BASEMAP_LABELS:Record<BasemapChoice,string>={
  none:'None \u00b7 works offline',
  osm:BASEMAPS.osm.label,
  topo:BASEMAPS.topo.label,
  'ofm-liberty':VECTOR_BASEMAPS['ofm-liberty'].label,
  'ofm-positron':VECTOR_BASEMAPS['ofm-positron'].label,
  'ofm-bright':VECTOR_BASEMAPS['ofm-bright'].label,
};
export const BASEMAP_OPTIONS:readonly {value:BasemapChoice;label:string}[]=
  BASEMAP_CHOICES.map(value=>({value,label:BASEMAP_LABELS[value]}));
/** The options as markup, so the two selects cannot drift in their labels either. */
export const basemapOptions=(selected:BasemapChoice|undefined):string=>BASEMAP_OPTIONS
  .map(option=>`<option value="${option.value}" ${(selected||'none')===option.value?'selected':''}>${option.label}</option>`)
  .join('');

/** What an interactive map can draw. Every field optional, because a map draws the layers it is
 *  given: the practitioner's model of 2026-10-14, reaching the renderer on 2026-10-15.
 *
 *  Until then this function required `Polygons`, so the interactive presentation existed only for
 *  catchment maps -- and since a basemap can only be drawn by the interactive presentation, nine
 *  of the ten maps in the worked examples could not have one. The practitioner reported the
 *  missing basemap three times before the cause turned out to be here rather than in the control. */
export interface MapLayers {
  polygons?:Polygons;
  /** A study area, drawn as the ground the rest sits on. */
  boundary?:{type:string;coordinates:unknown};
  /** Points carried on a value rather than arriving at a port of their own. */
  rows?:{id:string;name:string;coordinates?:Position|null;status?:string;relation?:string;excluded?:boolean;sourceNodeId?:string;fill?:FillClass}[];
  /** What the fill channel stands for. The renderer prints the words and draws the classes; it
   *  does not know which variable produced them. */
  fillEncoding?:FillEncoding;
  markHalo?:boolean;
  /** What each source is called, so a layer control names the widget rather than its node id. */
  layerNames?:Record<string,string>;
  /** The symbol each source is drawn with, resolved from the practitioner's choice where they
   *  made one and from the layer's position where they did not. */
  layerSymbols?:Record<string,{colour:string;shape:LayerShape}>;
  centers?:{id?:string;name?:string;geometry?:{coordinates:Position}|null}[];
  /** A street graph, drawn as itself. Added 2026-10-20: a Map showing a network could not be made
   *  interactive and could carry no basemap, because the static branch returned before the
   *  interactive one was reached. */
  network?:{nodes:{id:string;coordinates:Position}[];edges:{from:string;to:string;geometry?:Position[]}[]};
}

/** Presentation only: never changes polygons, memberships, or source points. */
export function mountCatchmentMap(host:HTMLElement,source:Polygons|MapLayers,context:PointCollection|undefined,esc:Escape,basemap:BasemapChoice='none',onBasemapChange?:(choice:BasemapChoice)=>void){
  // A Polygons value passed directly is the old call, kept working: it is one layer set with no
  // boundary and no rows.
  const layers:MapLayers=(source as Polygons)?.features!==undefined&&!(source as MapLayers).polygons
    ?{polygons:source as Polygons}:source as MapLayers;
  const p:Polygons=layers.polygons??{features:[],sites:[],observations:undefined} as unknown as Polygons;
  const toolbar=document.createElement('div');toolbar.className='catchment-map-toolbar';
  toolbar.innerHTML='<button class="button small" data-fit>Fit all layers</button><button class="button small" data-fullscreen>Full screen</button><label>Basemap <select data-basemap aria-label="Interactive map basemap">'
    +basemapOptions(basemap)
    +'</select></label><span data-tile-status role="status">Local layers work offline</span>';
  const canvas=document.createElement('div');canvas.className='catchment-leaflet';canvas.setAttribute('aria-label','Interactive catchment map');
  host.append(toolbar,canvas);
  // Views can disappear immediately on tab/workspace changes. Avoid delayed zoom
  // transition callbacks that outlive Leaflet's removed panes.
  const map=L.map(canvas,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}),all=L.featureGroup(),overlays:Record<string,L.Layer>=Object.create(null);
  // POINT MARKS GET THEIR OWN PANE, under the markers. They used to be circleMarkers, which
  // Leaflet draws in the overlay pane -- below every marker. Drawing each mark as an icon so it
  // could carry a halo put them in the MARKER pane instead, where a dense facility layer covered
  // the pump and site markers and swallowed their clicks. One pane, one z-index below markers,
  // restores the stacking the circleMarkers had.
  // Ground first, under everything the workflow produced.
  if(layers.boundary){
    // Canvas for the same reason the streets use it: a published boundary can be tens of
    // thousands of vertices, and an SVG path that long is seconds of paint on every redraw.
    const area=L.geoJSON(layers.boundary as never,{renderer:L.canvas(),interactive:false,style:{color:'#176b59',weight:2,fillColor:'#dbe8d6',fillOpacity:.25}} as L.GeoJSONOptions);
    area.addTo(map);all.addLayer(area);overlays['Study area']=area;
  }
  const sorted=[...p.features].sort((a,b)=>(b.minutes||0)-(a.minutes||0));
  for(const f of sorted){
    const layer=L.geoJSON(f.geometry,{style:{color:'#39779e',weight:1,fillColor:'#1f77b4',fillOpacity:.2}});
    layer.bindPopup(`<b>${esc(f.name)}</b>${f.minutes===undefined?'':`<br>Within ${f.minutes} minutes (cumulative)`}${f.count===undefined?'':`<br>${f.count} locations${p.summary?.valueField?`<br>${esc(p.summary.valueField)}: ${f.total}`:''}`}`);
    layer.addTo(map);all.addLayer(layer);const label=esc(f.name);overlays[Object.hasOwn(overlays,label)?`${label} (${esc(f.id)})`:label]=layer;
  }
  // The streets, as ONE multi-polyline on a canvas renderer rather than a layer per segment.
  // A town-sized graph is tens of thousands of segments -- Bunia is an estimated 94,000 directed
  // ones -- and a Leaflet layer each would not draw. Each undirected segment arrives twice, once
  // per direction, so only one of the pair is drawn.
  if(layers.network?.nodes?.length){
    const at=new Map(layers.network.nodes.map(n=>[n.id,n.coordinates]));
    const lines:[number,number][][]=[];
    // AN EVEN SAMPLE PAST THE LIMIT, as the Inspector preview has always done. A province
    // arrived on 2026-10-22 -- 984,906 junctions and 2,022,803 directed segments for Ituri --
    // and the interactive map tried to draw every one of them. Measured that day in a Chromium
    // tab with straight two-point segments: 100,000 add in 76 ms and zoom in 29 ms, 250,000 zoom
    // in 185 ms, a million zoom in 824 ms, and a real edge carries geometry which multiplies
    // that on every pan. This is a limit on a DRAWING: the graph is untouched and every
    // junction is still routed over, measured and exported.
    const drawable=layers.network.edges.filter(edge=>edge.from<=edge.to).length;
    const step=Math.max(1,Math.ceil(drawable/INTERACTIVE_SEGMENT_LIMIT));
    let seen=0;
    for(const edge of layers.network.edges){
      if(edge.from>edge.to)continue;
      if(seen++%step)continue;
      const a=at.get(edge.from),b=at.get(edge.to);
      if(!a||!b)continue;
      lines.push(edge.geometry?.length
        ?edge.geometry.map(([lon,lat])=>[lat,lon] as [number,number])
        :[[a[1],a[0]],[b[1],b[0]]]);
    }
    if(lines.length){
      const streets=L.polyline(lines,{color:'#55706a',weight:1,opacity:.9,interactive:false,renderer:L.canvas()});
      streets.addTo(map);all.addLayer(streets);
      // Named for what it is, so a sampled picture is never read as the whole network.
      overlays[step>1
        ?`Street network (${lines.length.toLocaleString('en')} of ${drawable.toLocaleString('en')} segments)`
        :'Street network']=streets;
    }
  }
  const observations=L.featureGroup();
  for(const f of p.observations?.features||[]){if(!f.geometry)continue;const [lon,lat]=f.geometry.coordinates,n=f.properties.DEATHS;
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const radius=typeof n==='number'&&Number.isFinite(n)&&n>0?Math.max(2,Math.min(20,n)):3;
    L.circleMarker([lat,lon],{radius,color:'#222',weight:1,fillColor:'#d62f2f',fillOpacity:.85}).bindPopup(`<b>${esc(f.properties.name)}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}${typeof n==='number'?`<br>Deaths: ${n}`:''}`).addTo(observations);
  }
  // ONLY IF THERE IS SOMETHING IN IT. The practitioner, 2026-10-20, on a map of a border study
  // area and its streets: *"Stale UI artifacts --- Observations (red circles) and Sites (blue
  // squares)."* Both were listed, both were empty, and a layer control that offers a layer which
  // cannot appear is a claim that the workflow has data it does not have -- on a map whose whole
  // job is to say what is there. The two below already guard this way; these two did not.
  if(observations.getLayers().length){observations.addTo(map);all.addLayer(observations);overlays['Observations (red circles)']=observations;}
  const pumps=L.featureGroup(),points=context?.features||p.sites;
  for(const f of points){if(!f.geometry)continue;const [lon,lat]=f.geometry.coordinates;
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const marker=L.marker([lat,lon],{zIndexOffset:1000,icon:L.divIcon({className:'catchment-site-marker',iconSize:[12,12],iconAnchor:[6,6]}),title:f.properties.name}).bindPopup(`<b>${esc(f.properties.name)}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}${p.sites.some(s=>s.id===f.id)?'<br>Travel-time origin':''}`).addTo(pumps);
    marker.on('add',()=>{const icon=marker.getElement();if(icon){L.DomEvent.disableClickPropagation(icon);icon.addEventListener('mousedown',event=>event.preventDefault());icon.addEventListener('click',event=>{event.stopPropagation();marker.openPopup();});}});
  }
  if(pumps.getLayers().length){pumps.addTo(map);all.addLayer(pumps);overlays['Sites / context (blue squares)']=pumps;}
  // Points a value carried rather than a port delivered -- a spatial map's rows, and the centers
  // it measured against. Drawn with the status each row was given, because that is what the map
  // is about.
  // ONE OVERLAY PER SOURCE, and hue says which source it is.
  //
  // The practitioner, 2026-10-20, with an OpenStreetMap search and an Overture search on one map:
  // *"they are both rendered same color when inside the polygon and there is no layer to check or
  // uncheck to assess which points come from which source."* Hue had been spent on the spatial
  // relation, so provenance had no channel and the layer control had nothing to list.
  //
  // Hue now carries the LAYER, fill carries the RELATION -- solid inside, hollow outside, grey
  // where there is no usable location -- and the mark repeats the layer, because colour alone is
  // not an encoding everybody can read. The marks are named as OGC Symbology Encoding names them,
  // and a practitioner can choose one per layer on the Map widget.
  if(layers.rows?.length){
    const bySource=new Map<string,typeof layers.rows>();
    for(const row of layers.rows){
      const key=String((row as {sourceNodeId?:string}).sourceNodeId||'records');
      const held=bySource.get(key)||[];held.push(row);bySource.set(key,held);
    }
    const named=layers.layerNames||{};
    let index=0;
    for(const [source,rows] of bySource){
      const symbol=layers.layerSymbols?.[source]??layerSymbol(index);
      const group=L.featureGroup();
      for(const row of rows){
        if(!row.coordinates)continue;
        const [lon,lat]=row.coordinates;
        // Belt and braces for a row from a run saved before the relation was fixed: Leaflet
        // throws on a non-finite pair, and a stored result must not be able to stop a render.
        if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
        // The class the map resolved, not a variable this renderer knows. A row from an older
        // value carries none, so the encoding is applied here instead -- which is the same table,
        // read in the same place, rather than a second opinion hard-coded in the drawing code.
        const encoding=layers.fillEncoding||SPATIAL_RELATION_FILL;
        const state=row.excluded?'Excluded':row.relation??row.status??'';
        const paint=row.fill??fillClass(encoding,state);
        const ink=paint==='absent'?'#8C8C8C':symbol.colour;
        const inside=paint==='solid';
        // The mark is DRAWN, not just named. The layer control said "(square)" while every point
        // on the map was a circleMarker, so the mark channel existed in the label and the receipt
        // and nowhere a reader could see it.
        //
        // EVERY mark carries a dark halo, drawn first and wider, so the symbol reads on any
        // ground. The practitioner, 2026-10-21, over OpenTopoMap: *"we can add a dark border to
        // the symbols so they are easier to see on any basemap."* A terrain basemap runs through
        // the same values as the palette, and a hollow mark over it was nearly invisible. The halo
        // is a neutral, not a seventh hue: it separates the symbol from the ground without
        // competing with the layer colours. A circle no longer takes the cheaper circleMarker
        // path, because one stroke cannot be both the halo and the hue.
        L.marker([lat,lon],{title:row.name,icon:L.divIcon({className:'catchment-point-mark',
          iconSize:[16,16],iconAnchor:[8,8],
          html:`<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">`
            +(layers.markHalo===false?'':`<path d="${markPath(symbol.shape,8,8,5)}" fill="none" `
              +`stroke="${MARK_HALO}" stroke-width="3.4" stroke-linejoin="round"/>`)
            +`<path d="${markPath(symbol.shape,8,8,5)}" fill="${inside?ink:'none'}" `
            +`stroke="${ink}" stroke-width="1.5" stroke-linejoin="round"/></svg>`})})
          .bindPopup(`<b>${esc(row.name)}</b>${state?`<br>${esc(state)}`:''}`
            +`<br>${esc(named[source]||source)}<br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`)
          .addTo(group);
      }
      if(group.getLayers().length){
        group.addTo(map);all.addLayer(group);
        // Two widgets born with the same default label are the common case, so the key can
        // collide; the node id is what tells them apart when the label does not.
        const key=`${named[source]||source} (${symbol.shape})`;
        overlays[Object.hasOwn(overlays,key)?`${key} · ${esc(source)}`:key]=group;
      }
      index++;
    }
  }
  if(layers.centers?.length){
    const group=L.featureGroup();
    for(const center of layers.centers){
      if(!center.geometry)continue;
      const [lon,lat]=center.geometry.coordinates;
      if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      // ABOVE the point marks. Facility marks became icons on 2026-10-21 so they could carry a
      // halo, which moved them from the overlay pane into the marker pane -- where a dense layer
      // covered the site markers and swallowed their clicks. A custom pane fixed the stacking and
      // broke the vector basemap's attribution, which arrives through the bridge into Leaflet's
      // control; `zIndexOffset` orders them inside the one pane and leaves that alone.
      L.marker([lat,lon],{zIndexOffset:1000,icon:L.divIcon({className:'catchment-site-marker',iconSize:[12,12],iconAnchor:[6,6]}),title:center.name})
        .bindPopup(`<b>${esc(center.name??'Center')}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`).addTo(group);
    }
    if(group.getLayers().length){group.addTo(map);all.addLayer(group);overlays['Centers']=group;}
  }
  L.control.layers({},overlays,{collapsed:false}).addTo(map);L.control.scale({imperial:false}).addTo(map);
  const fit=()=>{if(all.getBounds().isValid())map.fitBounds(all.getBounds(),{padding:[20,20]});else map.setView([0,0],2);};fit();
  toolbar.querySelector<HTMLButtonElement>('[data-fit]')!.onclick=fit;
  // Full screen, on the element the CSS is written for. Safari before 16.4 has only the webkit
  // names, and an iPhone has neither on a div, so the button says so rather than appearing to work.
  // The button carries its own state: it used to keep saying "Full screen" while full screen was on.
  const fullscreenButton=toolbar.querySelector<HTMLButtonElement>('[data-fullscreen]')!;
  type WebkitElement=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
  type WebkitDocument=Document&{webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>Promise<void>|void};
  const panel=()=>host.closest<HTMLElement>('#map-panel')||host;
  const fullscreenNow=()=>document.fullscreenElement||(document as WebkitDocument).webkitFullscreenElement||null;
  const markFullscreen=()=>{const on=fullscreenNow()===panel();
    fullscreenButton.textContent=on?'Exit full screen':'Full screen';
    fullscreenButton.setAttribute('aria-pressed',String(on));
    requestAnimationFrame(()=>map.invalidateSize());};
  markFullscreen();
  for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,markFullscreen);
  fullscreenButton.onclick=async()=>{
    const target=panel() as WebkitElement;
    try{
      if(fullscreenNow()===target)await (document.exitFullscreen?.()??(document as WebkitDocument).webkitExitFullscreen?.());
      else if(target.requestFullscreen)await target.requestFullscreen();
      else if(target.webkitRequestFullscreen)await target.webkitRequestFullscreen();
      else throw new Error('unsupported');
    }catch{status.textContent='Full screen unavailable in this browser; use Full screen on the results panel.';}
    markFullscreen();
  };
  const status=toolbar.querySelector<HTMLElement>('[data-tile-status]')!,select=toolbar.querySelector<HTMLSelectElement>('[data-basemap]')!;
  let tiles:L.TileLayer|undefined,pending=0;
  const setBasemap=(choice:BasemapChoice)=>{
    const generation=++pending;
    if(tiles){
      // The vector bridge's getAttribution() reads the LIVE GL map's style sources, so Leaflet
      // gets null when the layer is added (the style has not loaded yet), the credit is added
      // later, and on removal the map is already gone -- Leaflet asks again, gets null, and
      // removes nothing. The source's credit then outlives the basemap it credits. Read it while
      // the layer is still alive, then remove it by hand.
      const credit=(tiles as unknown as {getAttribution?:()=>string|null}).getAttribution?.();
      tiles.remove();tiles=undefined;
      if(credit)map.attributionControl.removeAttribution(credit);
    }
    if(choice==='none'){status.textContent='Local layers work offline';return;}
    if(isVectorBasemap(choice)){
      const design=VECTOR_BASEMAPS[choice];
      // Loaded on demand. maplibre-gl is the largest dependency this application would carry, and
      // a practitioner who never chooses a vector basemap must not pay for it: the import is
      // dynamic so it is a separate chunk, fetched when a style is first selected and never on
      // the offline path.
      status.textContent=`${design.label} loading\u2026`;
      // MAPLIBRE'S STYLESHEET IS NOT OPTIONAL. Without it the canvas container has no
      // positioning and no size, so the layer mounts, the style loads, the tiles are fetched and
      // NOTHING IS DRAWN -- the status line says "online" over a blank map. Leaflet's own CSS is
      // imported in study-area-map.ts; this one was simply never added. Imported here with the
      // renderer so the two always arrive together.
      // The renderer loads on demand; its STYLESHEET is linked eagerly from study-area-map.ts,
      // for the reason recorded there.
      Promise.all([import('maplibre-gl'),import('@maplibre/maplibre-gl-leaflet')]).then(([maplibre])=>{
        // Told where its worker is, once, before any map exists. Without this MapLibre resolves
        // the URL against its own bundle and fails under the chunk layout -- see build.mjs.
        if(!workerReady){maplibre.setWorkerUrl(new URL('./maplibre-gl-worker.mjs',import.meta.url).href);workerReady=true;}
        // The practitioner may have changed basemap while this was loading. A style that
        // arrives late must not draw itself over the one they chose instead, nor credit itself.
        if(generation!==pending)return;
        const layer=(L as unknown as {maplibreGL:(o:unknown)=>L.Layer}).maplibreGL({style:design.style});
        tiles=layer as L.TileLayer;layer.addTo(map);
        (layer as unknown as {bringToBack?:()=>void}).bringToBack?.();
        // ATTRIBUTION IS A LICENCE TERM AND THE BRIDGE DOES NOT CARRY IT. MapLibre adds its own
        // when it IS the map; through maplibre-gl-leaflet it is a Leaflet layer, and passing
        // `attribution` to the layer options did nothing -- the control showed "Leaflet" alone,
        // which is the map rendering somebody else's data with no credit. Added to the control
        // directly, and removed when the basemap changes so a style that is no longer drawn is
        // no longer credited.
        status.textContent=`${design.label} online \u00b7 viewed area sent to provider`;
      }).catch(()=>{status.textContent='Vector basemap unavailable; local layers remain visible.';});
      return;
    }
    const source=BASEMAPS[choice];tiles=L.tileLayer(source.url,{maxZoom:source.maxZoom,referrerPolicy:'origin',updateWhenIdle:true,keepBuffer:0,attribution:source.attribution});
    tiles.on('tileerror',()=>{status.textContent='Basemap unavailable; local layers remain visible.';});
    tiles.addTo(map);tiles.bringToBack();status.textContent=`${source.label} online · viewed area sent to provider`;
  };
  select.value=basemap;setBasemap(basemap);
  select.onchange=()=>{const choice=select.value as BasemapChoice;setBasemap(choice);onBasemapChange?.(choice);};
  const note=document.createElement('p');note.className='muted';note.textContent='Blue nested regions: cumulative travel times. Red circles: observations (DEATHS radius capped at 20 px); blue squares: sites/context. Use layer controls and click features for details.';host.append(note);
  let disposed=false;const observer=new ResizeObserver(()=>{if(!disposed)map.invalidateSize();});observer.observe(canvas);observer.observe(panel());
  return ()=>{disposed=true;observer.disconnect();
    for(const event of ['fullscreenchange','webkitfullscreenchange'])document.removeEventListener(event,markFullscreen);
    map.stop();map.remove();host.replaceChildren();};
}
