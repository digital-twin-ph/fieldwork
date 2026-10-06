import type {WorkflowNode,AreaParams,Boundary,Polygon,Position} from './types.js';
import {element} from './dom.js';
import {errorMessage} from './guards.js';
type DrawnParams=Extract<AreaParams,{source:'drawn'}>;
type DrawTool='pan'|'bbox'|'polygon';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {bboxPolygon,validateDrawnGeometry,geometryBounds,studyAreaN3} from './study-area.js';

export function openStudyAreaEditor(node:WorkflowNode<'area'>,onApply:(params:DrawnParams)=>void,context:{boundary?:Boundary;point?:{coordinates:Position|null;name:string}}={}){
  const dialog=element('#area-dialog'),$=<S extends string>(s:S)=>element(s,dialog);
  let geometry:Polygon|null=node.params.source==='drawn'&&node.params.geometry?structuredClone(node.params.geometry):null,selectionMode:DrawnParams['selectionMode']=node.params.source==='drawn'?node.params.selectionMode:'polygon';
  let tool:DrawTool='pan',vertices:Position[]=[],firstCorner:Position|null=null,down:L.LeafletMouseEvent|null=null,ignoreClickUntil=0,map:L.Map,loaded=0,failed=0;
  const name=$('#area-name');name.value=node.params.label||'My study area';
  $('#area-online').checked=navigator.onLine;
  dialog.showModal();
  map=L.map($('#area-map'),{center:[-24.685,25.901],zoom:14,minZoom:2,maxZoom:19,worldCopyJump:false,doubleClickZoom:false,boxZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  L.control.scale({imperial:false}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'});
  const shapes=L.layerGroup().addTo(map),handles=L.layerGroup().addTo(map);
  if(context.boundary&&node.params.source!=='drawn')L.geoJSON(context.boundary,{interactive:false,style:{color:'#68877b',dashArray:'5 5',fillOpacity:.05}}).addTo(map);
  if(context.point?.coordinates){const p=context.point.coordinates,label=document.createElement('span');label.textContent=context.point.name+' · record under review';L.circleMarker([p[1],p[0]],{radius:7,color:'#ad6027',fillOpacity:1}).bindTooltip(label,{permanent:true,direction:'top'}).addTo(map);}
  const message=(text:string)=>$('#area-feedback').textContent=text;
  const tileStatus=()=>{$('#area-tile-status').textContent=!$('#area-online').checked?'Basemap off · geometry stays local':!navigator.onLine?'Offline · saved geometry remains available':failed?'Some map tiles are unavailable · geometry editing still works':loaded?'Online map · OpenStreetMap':'Loading online map…';};
  tiles.on('tileload',()=>{loaded++;tileStatus();});tiles.on('tileerror',()=>{failed++;tileStatus();});
  $('#area-online').onchange=()=>{if($('#area-online').checked){loaded=0;failed=0;tiles.addTo(map);}else map.removeLayer(tiles);tileStatus();};
  $('#area-online').dispatchEvent(new Event('change'));
  const ll=(p:Position)=>L.latLng(p[1],p[0]);
  function setTool(next:DrawTool){tool=next;map.dragging[next==='pan'?'enable':'disable']();$('#area-map').classList.toggle('drawing',next!=='pan');dialog.querySelectorAll<HTMLButtonElement>('[data-draw]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.draw===next)));}
  function currentParams():DrawnParams{return {source:'drawn',label:name.value.trim(),selectionMode,geometry};}
  function refresh(){
    shapes.clearLayers();handles.clearLayers();
    $('#area-geojson').textContent=geometry?JSON.stringify(geometry,null,2):'No geometry selected.';
    $('#area-finish').disabled=tool!=='polygon'||vertices.length<3;$('#area-undo-point').disabled=!vertices.length&&!firstCorner;
    let valid=false;
    if(geometry){
      const label=document.createElement('span');label.textContent=name.value.trim();
      L.geoJSON(geometry,{style:{color:'#176b59',weight:2,fillColor:'#5a9b7f',fillOpacity:.2}}).bindTooltip(label,{permanent:true,direction:'center',className:'area-map-label'}).addTo(shapes);
      const b=geometryBounds(geometry);['west','south','east','north'].forEach((key,i)=>( $('#area-'+key) as HTMLInputElement).value=b[i].toFixed(7));
      try{validateDrawnGeometry(geometry);const n3=studyAreaN3({id:node.id,params:currentParams()});$('#area-n3').textContent=n3.input;$('#area-summary').textContent=`${selectionMode==='bbox'?'Bounding box':'Polygon'} · ${geometry.coordinates[0].length-1} vertices · longitude, latitude`;message('Shape is valid. Apply it to the node, then run to evaluate the N3 rule.');valid=true;}
      catch(e){message(errorMessage(e));$('#area-n3').textContent='The draft must be valid and named before N3 is generated.';$('#area-summary').textContent='Draft needs correction';}
      const ring=geometry.coordinates[0],points=selectionMode==='bbox'?[ring[0],ring[2]]:ring.slice(0,-1);
      points.forEach((p,i)=>{
        const marker=L.marker(ll(p),{draggable:true,icon:L.divIcon({className:'area-vertex',iconSize:[12,12],iconAnchor:[6,6]}),title:`Move ${selectionMode==='bbox'?'corner':'vertex'} ${i+1}`,keyboard:true}).addTo(handles);
        marker.on('dragstart',()=>setTool('pan'));
        marker.on('dragend',()=>{const v=marker.getLatLng(),next=[v.lng,v.lat];if(selectionMode==='bbox'){const other=points[1-i];geometry={type:'Polygon',coordinates:[[[Math.min(next[0],other[0]),Math.min(next[1],other[1])],[Math.max(next[0],other[0]),Math.min(next[1],other[1])],[Math.max(next[0],other[0]),Math.max(next[1],other[1])],[Math.min(next[0],other[0]),Math.max(next[1],other[1])],[Math.min(next[0],other[0]),Math.min(next[1],other[1])]]]};}else{const r=ring.slice(0,-1);r[i]=next;geometry={type:'Polygon',coordinates:[[...r,r[0]]]};}refresh();});
      });
    }else{
      const draft=tool==='bbox'&&firstCorner?[firstCorner]:vertices;
      if(draft.length)L.polyline(draft.map(ll),{color:'#176b59',dashArray:'5 5'}).addTo(shapes);
      draft.forEach(p=>L.circleMarker(ll(p),{radius:4,color:'#176b59'}).addTo(shapes));
      $('#area-summary').textContent=draft.length?`${draft.length} draft ${draft.length===1?'point':'points'}`:'No area selected';
      $('#area-n3').textContent='Draw a bounding box or finish a polygon to preview the N3 facts and rule.';
      message(tool==='bbox'?'Click two opposite corners, or drag a rectangle.':tool==='polygon'?'Click each vertex, then choose Finish polygon.':'Pan and zoom to your study area, then choose Bounding box or Polygon.');
    }
    $('#area-apply').disabled=!valid;
  }
  function makeBox(a:Position,b:Position){geometry={type:'Polygon',coordinates:[[[Math.min(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.min(a[1],b[1])]]]};selectionMode='bbox';firstCorner=null;setTool('pan');refresh();}
  dialog.querySelectorAll<HTMLButtonElement>('[data-draw]').forEach(b=>b.onclick=()=>{const next=b.dataset.draw as DrawTool;setTool(next);if(next!=='pan'){geometry=null;vertices=[];firstCorner=null;selectionMode=next;}refresh();});
  map.on('click',e=>{if(Date.now()<ignoreClickUntil)return;const p=[e.latlng.lng,e.latlng.lat];if(tool==='bbox'){if(firstCorner)makeBox(firstCorner,p);else{firstCorner=p;refresh();}}else if(tool==='polygon'){if(vertices.length>=200){message('Use at most 200 vertices.');return;}vertices.push(p);refresh();}});
  map.on('mousedown',e=>{if(tool==='bbox')down=e;});
  map.on('mouseup',e=>{if(tool==='bbox'&&down&&e.containerPoint.distanceTo(down.containerPoint)>8){makeBox([down.latlng.lng,down.latlng.lat],[e.latlng.lng,e.latlng.lat]);ignoreClickUntil=Date.now()+300;}down=null;});
  $('#area-finish').onclick=()=>{if(vertices.length<3)return;geometry={type:'Polygon',coordinates:[[...vertices,vertices[0]]]};vertices=[];setTool('pan');refresh();};
  $('#area-undo-point').onclick=()=>{if(firstCorner)firstCorner=null;else vertices.pop();refresh();};
  $('#area-clear').onclick=()=>{geometry=null;vertices=[];firstCorner=null;setTool('pan');refresh();};
  $('#area-use-bounds').onclick=()=>{try{const values=['west','south','east','north'].map(k=>( $('#area-'+k) as HTMLInputElement).value.trim()===''?NaN:Number(( $('#area-'+k) as HTMLInputElement).value));geometry=bboxPolygon(values[0],values[1],values[2],values[3]);selectionMode='bbox';setTool('pan');refresh();fit();}catch(e){message(errorMessage(e));}};
  function fit(){const scope=geometry||context.boundary;if(scope){const b=geometryBounds(scope),bounds:L.LatLngTuple[]=[[b[1],b[0]],[b[3],b[2]]];if(context.point?.coordinates)bounds.push([context.point.coordinates[1],context.point.coordinates[0]]);map.fitBounds(bounds,{padding:[35,35],maxZoom:17});}}
  $('#area-fit').onclick=fit;$('#area-old-naledi').onclick=()=>map.setView([-24.685,25.901],14);
  name.oninput=refresh;
  $('#area-apply').onclick=()=>{try{validateDrawnGeometry(geometry);studyAreaN3({id:node.id,params:currentParams()});onApply(structuredClone(currentParams()));dialog.close();}catch(e){message(errorMessage(e));}};
  $('#area-cancel').onclick=()=>dialog.close();$('#area-close').onclick=()=>dialog.close();
  window.addEventListener('offline',tileStatus);window.addEventListener('online',tileStatus);
  let layoutTimer:ReturnType<typeof setTimeout>;
  dialog.addEventListener('close',()=>{clearTimeout(layoutTimer);window.removeEventListener('offline',tileStatus);window.removeEventListener('online',tileStatus);map.stop();map.remove();},{once:true});
  setTool('pan');refresh();layoutTimer=setTimeout(()=>{if(dialog.open){map.invalidateSize();fit();}},0);
}
