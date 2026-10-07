import L from 'leaflet';
import type {Polygons} from './catchments.js';
import type {PointCollection,Escape} from './types.js';

/** Presentation only: never changes polygons, memberships, or source points. */
export function mountCatchmentMap(host:HTMLElement,p:Polygons,context:PointCollection|undefined,esc:Escape){
  const toolbar=document.createElement('div');toolbar.className='catchment-map-toolbar';
  toolbar.innerHTML='<button class="button small" data-fit>Fit all layers</button><button class="button small" data-fullscreen>Full screen</button><label><input type="checkbox" data-basemap> Online street basemap</label><span data-tile-status role="status">Local layers work offline</span>';
  const canvas=document.createElement('div');canvas.className='catchment-leaflet';canvas.setAttribute('aria-label','Interactive catchment map');
  host.append(toolbar,canvas);
  // Views can disappear immediately on tab/workspace changes. Avoid delayed zoom
  // transition callbacks that outlive Leaflet's removed panes.
  const map=L.map(canvas,{scrollWheelZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}),all=L.featureGroup(),overlays:Record<string,L.Layer>=Object.create(null);
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
    L.marker([lat,lon],{icon:L.divIcon({className:'catchment-site-marker',iconSize:[12,12],iconAnchor:[6,6]}),title:f.properties.name}).bindPopup(`<b>${esc(f.properties.name)}</b><br>Location: ${lat.toFixed(6)}, ${lon.toFixed(6)}${p.sites.some(s=>s.id===f.id)?'<br>Travel-time origin':''}`).addTo(pumps);
  }
  pumps.addTo(map);all.addLayer(pumps);overlays['Sites / context (blue squares)']=pumps;
  L.control.layers({},overlays,{collapsed:false}).addTo(map);L.control.scale({imperial:false}).addTo(map);
  const fit=()=>{if(all.getBounds().isValid())map.fitBounds(all.getBounds(),{padding:[20,20]});else map.setView([0,0],2);};fit();
  toolbar.querySelector<HTMLButtonElement>('[data-fit]')!.onclick=fit;
  toolbar.querySelector<HTMLButtonElement>('[data-fullscreen]')!.onclick=async()=>{if(document.fullscreenElement===host)await document.exitFullscreen();else await host.requestFullscreen().catch(()=>{status.textContent='Full screen unavailable; use Expand Results.';});};
  const status=toolbar.querySelector<HTMLElement>('[data-tile-status]')!,tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'origin',updateWhenIdle:true,keepBuffer:0,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
  tiles.on('tileerror',()=>{status.textContent='Basemap unavailable; local layers remain visible.';});
  toolbar.querySelector<HTMLInputElement>('[data-basemap]')!.onchange=e=>{if((e.target as HTMLInputElement).checked){tiles.addTo(map);status.textContent='Online basemap requested';}else{tiles.remove();status.textContent='Local layers work offline';}};
  const note=document.createElement('p');note.className='muted';note.textContent='Blue nested regions: cumulative travel times. Red circles: observations (DEATHS radius capped at 20 px); blue squares: sites/context. Use layer controls and click features for details.';host.append(note);
  let disposed=false;const observer=new ResizeObserver(()=>{if(!disposed)map.invalidateSize();});observer.observe(canvas);
  return ()=>{disposed=true;observer.disconnect();map.stop();map.remove();host.replaceChildren();};
}
