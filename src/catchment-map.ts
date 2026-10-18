import L from 'leaflet';
import type {Polygons} from './catchments.js';
import type {PointCollection,Escape,Position} from './types.js';

import type {BasemapChoice} from './types.js';
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
  rows?:{id:string;name:string;coordinates?:Position|null;status?:string;relation?:string;excluded?:boolean}[];
  centers?:{id?:string;name?:string;geometry?:{coordinates:Position}|null}[];
}

/** Presentation only: never changes polygons, memberships, or source points. */
export function mountCatchmentMap(host:HTMLElement,source:Polygons|MapLayers,context:PointCollection|undefined,esc:Escape,basemap:BasemapChoice='none',onBasemapChange?:(choice:BasemapChoice)=>void){
  // A Polygons value passed directly is the old call, kept working: it is one layer set with no
  // boundary and no rows.
  const layers:MapLayers=(source as Polygons)?.features!==undefined&&!(source as MapLayers).polygons
    ?{polygons:source as Polygons}:source as MapLayers;
  const p:Polygons=layers.polygons??{features:[],sites:[],observations:undefined} as unknown as Polygons;
  const toolbar=document.createElement('div');toolbar.className='catchment-map-toolbar';
  toolbar.innerHTML='<button class="button small" data-fit>Fit all layers</button><button class="button small" data-fullscreen>Full screen</button><label>Basemap <select data-basemap aria-label="Interactive map basemap"><option value="none">Local geometry (offline)</option><option value="osm">OpenStreetMap streets</option><option value="topo">OpenTopoMap terrain</option><option value="ofm-liberty">OpenFreeMap Liberty</option><option value="ofm-positron">OpenFreeMap Positron (muted)</option><option value="ofm-bright">OpenFreeMap Bright</option></select></label><span data-tile-status role="status">Local layers work offline</span>';
  const canvas=document.createElement('div');canvas.className='catchment-leaflet';canvas.setAttribute('aria-label','Interactive catchment map');
  host.append(toolbar,canvas);
  // Views can disappear immediately on tab/workspace changes. Avoid delayed zoom
  // transition callbacks that outlive Leaflet's removed panes.
  const map=L.map(canvas,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}),all=L.featureGroup(),overlays:Record<string,L.Layer>=Object.create(null);
  // Ground first, under everything the workflow produced.
  if(layers.boundary){
    const area=L.geoJSON(layers.boundary as never,{interactive:false,style:{color:'#176b59',weight:2,fillColor:'#dbe8d6',fillOpacity:.25}});
    area.addTo(map);all.addLayer(area);overlays['Study area']=area;
  }
  const sorted=[...p.features].sort((a,b)=>(b.minutes||0)-(a.minutes||0));
  for(const f of sorted){
    const layer=L.geoJSON(f.geometry,{style:{color:'#39779e',weight:1,fillColor:'#1f77b4',fillOpacity:.2}});
    layer.bindPopup(`<b>${esc(f.name)}</b>${f.minutes===undefined?'':`<br>Within ${f.minutes} minutes (cumulative)`}${f.count===undefined?'':`<br>${f.count} locations${p.summary?.valueField?`<br>${esc(p.summary.valueField)}: ${f.total}`:''}`}`);
    layer.addTo(map);all.addLayer(layer);const label=esc(f.name);overlays[Object.hasOwn(overlays,label)?`${label} (${esc(f.id)})`:label]=layer;
  }
  const observations=L.featureGroup();
  for(const f of p.observations?.features||[]){if(!f.geometry)continue;const [lon,lat]=f.geometry.coordinates,n=f.properties.DEATHS;
    const radius=typeof n==='number'&&Number.isFinite(n)&&n>0?Math.max(2,Math.min(20,n)):3;
    L.circleMarker([lat,lon],{radius,color:'#222',weight:1,fillColor:'#d62f2f',fillOpacity:.85}).bindPopup(`<b>${esc(f.properties.name)}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}${typeof n==='number'?`<br>Deaths: ${n}`:''}`).addTo(observations);
  }
  observations.addTo(map);all.addLayer(observations);overlays['Observations (red circles)']=observations;
  const pumps=L.featureGroup(),points=context?.features||p.sites;
  for(const f of points){if(!f.geometry)continue;const [lon,lat]=f.geometry.coordinates;
    const marker=L.marker([lat,lon],{icon:L.divIcon({className:'catchment-site-marker',iconSize:[12,12],iconAnchor:[6,6]}),title:f.properties.name}).bindPopup(`<b>${esc(f.properties.name)}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}${p.sites.some(s=>s.id===f.id)?'<br>Travel-time origin':''}`).addTo(pumps);
    marker.on('add',()=>{const icon=marker.getElement();if(icon){L.DomEvent.disableClickPropagation(icon);icon.addEventListener('mousedown',event=>event.preventDefault());icon.addEventListener('click',event=>{event.stopPropagation();marker.openPopup();});}});
  }
  pumps.addTo(map);all.addLayer(pumps);overlays['Sites / context (blue squares)']=pumps;
  // Points a value carried rather than a port delivered -- a spatial map's rows, and the centers
  // it measured against. Drawn with the status each row was given, because that is what the map
  // is about.
  if(layers.rows?.length){
    const group=L.featureGroup();
    for(const row of layers.rows){
      if(!row.coordinates)continue;
      const [lon,lat]=row.coordinates,state=row.excluded?'Excluded':row.relation??row.status??'';
      L.circleMarker([lat,lon],{radius:4,color:'#222',weight:1,
        fillColor:state==='Outside'||state==='Review'?'#d62f2f':state==='Excluded'?'#999':'#39779e',fillOpacity:.85})
        .bindPopup(`<b>${esc(row.name)}</b>${state?`<br>${esc(state)}`:''}<br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`)
        .addTo(group);
    }
    if(group.getLayers().length){group.addTo(map);all.addLayer(group);overlays['Records']=group;}
  }
  if(layers.centers?.length){
    const group=L.featureGroup();
    for(const center of layers.centers){
      if(!center.geometry)continue;
      const [lon,lat]=center.geometry.coordinates;
      L.marker([lat,lon],{icon:L.divIcon({className:'catchment-site-marker',iconSize:[12,12],iconAnchor:[6,6]}),title:center.name})
        .bindPopup(`<b>${esc(center.name??'Center')}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`).addTo(group);
    }
    if(group.getLayers().length){group.addTo(map);all.addLayer(group);overlays['Centers']=group;}
  }
  L.control.layers({},overlays,{collapsed:false}).addTo(map);L.control.scale({imperial:false}).addTo(map);
  const fit=()=>{if(all.getBounds().isValid())map.fitBounds(all.getBounds(),{padding:[20,20]});else map.setView([0,0],2);};fit();
  toolbar.querySelector<HTMLButtonElement>('[data-fit]')!.onclick=fit;
  toolbar.querySelector<HTMLButtonElement>('[data-fullscreen]')!.onclick=async()=>{const panel=host.closest<HTMLElement>('#map-panel')||host;if(document.fullscreenElement===panel)await document.exitFullscreen();else await panel.requestFullscreen().catch(()=>{status.textContent='Full screen unavailable; use Expand Results.';});requestAnimationFrame(()=>map.invalidateSize());};
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
  let disposed=false;const observer=new ResizeObserver(()=>{if(!disposed)map.invalidateSize();});observer.observe(canvas);
  return ()=>{disposed=true;observer.disconnect();map.stop();map.remove();host.replaceChildren();};
}
