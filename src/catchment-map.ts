import L from 'leaflet';
import type {Polygons} from './catchments.js';
import type {PointCollection,Escape,Position} from './types.js';

export type BasemapChoice='none'|'osm'|'topo';
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
  toolbar.innerHTML='<button class="button small" data-fit>Fit all layers</button><button class="button small" data-fullscreen>Full screen</button><label>Basemap <select data-basemap aria-label="Interactive map basemap"><option value="none">Local geometry (offline)</option><option value="osm">OpenStreetMap streets</option><option value="topo">OpenTopoMap terrain</option></select></label><span data-tile-status role="status">Local layers work offline</span>';
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
  let tiles:L.TileLayer|undefined;
  const setBasemap=(choice:BasemapChoice)=>{
    if(tiles){tiles.remove();tiles=undefined;}
    if(choice==='none'){status.textContent='Local layers work offline';return;}
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
