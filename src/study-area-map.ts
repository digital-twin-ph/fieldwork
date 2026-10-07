import type {WorkflowNode,AreaParams,Boundary,Polygon,Position} from './types.js';
import {element} from './dom.js';
import {errorMessage} from './guards.js';
type DrawnParams=Extract<AreaParams,{source:'drawn'}>;
type DrawTool='pan'|'bbox'|'polygon';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {bboxPolygon,validateDrawnGeometry,geometryBounds,studyAreaN3,geometryWKT,CRS84} from './study-area.js';
import type {RasterGrid} from './raster.js';
import {clipRaster} from './raster.js';
import {rasterImage} from './raster-ui.js';
import type {RasterClipOptions,RasterMaskMethod} from './raster-mask.js';
import {dimensionedBox} from './area-buffer.js';

export function openStudyAreaEditor(node:WorkflowNode<'area'>,onApply:(params:DrawnParams,options?:RasterClipOptions)=>void|boolean,context:{boundary?:Boundary;point?:{coordinates:Position|null;name:string};raster?:RasterGrid;clip?:boolean;clipOptions?:RasterClipOptions}={}){
  const clipOptions:RasterClipOptions={method:context.clipOptions?.method||'cell-center',marginPixels:context.clipOptions?.marginPixels||0};
  const dialog=element('#area-dialog'),$=<S extends string>(s:S)=>element(s,dialog);
  let geometry:Polygon|null=node.params.source==='drawn'&&node.params.geometry?structuredClone(node.params.geometry):null,selectionMode:DrawnParams['selectionMode']=node.params.source==='drawn'?node.params.selectionMode:'polygon';
  let tool:DrawTool='pan',vertices:Position[]=[],firstCorner:Position|null=null,down:L.LeafletMouseEvent|null=null,ignoreClickUntil=0,map:L.Map,loaded=0,failed=0;
  const name=$('#area-name');name.value=node.params.label||'My study area';
  const nameLabel=dialog.querySelector('label[for="area-name"]')!,eyebrow=dialog.querySelector('.eyebrow')!,draftLabel=dialog.querySelector('.area-draft .inspector-section')!;
  const originalLabels=[nameLabel.textContent,eyebrow.textContent,draftLabel.textContent];
  if(context.clip){name.maxLength=60;nameLabel.textContent='Clipped raster label';eyebrow.textContent='CLIP RASTER · PROCESSING PARAMETERS';draftLabel.textContent='Cutline geometry · draft';$('#area-apply').textContent='Apply clip parameters';}
  const boundsDetails=$('#area-west').closest('details')!,boundsWereOpen=boundsDetails.open;
  if(context.raster)boundsDetails.open=true;
  $('#area-online').checked=!context.raster&&navigator.onLine;
  $('#area-dialog-title').textContent=context.raster?'Preview and adjust raster clip':'Choose your study area';
  dialog.showModal();
  map=L.map($('#area-map'),{center:[-24.685,25.901],zoom:14,minZoom:2,maxZoom:19,worldCopyJump:false,doubleClickZoom:false,boxZoom:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
  L.control.scale({imperial:false}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'});
  const shapes=L.layerGroup().addTo(map),handles=L.layerGroup().addTo(map);
  const boxControls=document.createElement('details');boxControls.id='area-sized-box';boxControls.innerHTML='<summary>Configure a square or rectangle</summary><label for="area-box-shape">Shape</label><select id="area-box-shape"><option value="square">Square</option><option value="rectangle">Rectangle</option></select><label for="area-box-lon">Centre longitude</label><input id="area-box-lon" type="number" step="any"><label for="area-box-lat">Centre latitude</label><input id="area-box-lat" type="number" step="any"><label for="area-box-width">Width (metres)</label><input id="area-box-width" type="number" min="1" max="50000" value="1000"><label for="area-box-height">Height (metres)</label><input id="area-box-height" type="number" min="1" max="50000" value="1000" disabled><button id="area-box-center" type="button" class="button small">Use map centre</button><button id="area-box-create" type="button" class="button small">Use sized boundary</button><p>North-aligned bounding box. Ground dimensions are approximate at the centre, not equal degree spans. Resizing map corners afterward creates a free rectangle. Applying keeps the resulting geometry.</p>';
  boundsDetails.after(boxControls);
  const boxInput=(id:string)=>boxControls.querySelector<HTMLInputElement>('#area-box-'+id)!;
  const currentBounds=geometry?geometryBounds(geometry):null;
  boxInput('lon').value=String(currentBounds?(currentBounds[0]+currentBounds[2])/2:25.901);boxInput('lat').value=String(currentBounds?(currentBounds[1]+currentBounds[3])/2:-24.685);
  const boxShape=boxControls.querySelector<HTMLSelectElement>('#area-box-shape')!;
  if(currentBounds){const height=(currentBounds[3]-currentBounds[1])*111195,width=(currentBounds[2]-currentBounds[0])*111195*Math.cos((currentBounds[1]+currentBounds[3])/2*Math.PI/180);boxInput('width').value=width.toFixed(2);boxInput('height').value=height.toFixed(2);boxShape.value=Math.abs(width-height)<.1?'square':'rectangle';boxInput('height').disabled=boxShape.value==='square';}
  boxShape.onchange=()=>{boxInput('height').disabled=boxShape.value==='square';if(boxShape.value==='square')boxInput('height').value=boxInput('width').value;};
  boxInput('width').oninput=()=>{if(boxShape.value==='square')boxInput('height').value=boxInput('width').value;};
  boxControls.querySelector<HTMLButtonElement>('#area-box-center')!.onclick=()=>{const c=map.getCenter();boxInput('lon').value=String(c.lng);boxInput('lat').value=String(c.lat);};
  boxControls.querySelector<HTMLButtonElement>('#area-box-create')!.onclick=()=>{try{const number=(id:string)=>boxInput(id).value.trim()?Number(boxInput(id).value):NaN;geometry=dimensionedBox([number('lon'),number('lat')],number('width'),boxShape.value==='square'?number('width'):number('height'));selectionMode='bbox';setTool('pan');refresh();fit();}catch(e){message(errorMessage(e));$('#area-feedback').setAttribute('role','alert');}};
  let rasterControls:HTMLElement|undefined,previewStatus:HTMLElement|undefined;
  const validateClip=()=>{if(context.raster&&geometry){const clipped=clipRaster(context.raster,geometry,clipOptions);if(previewStatus)previewStatus.textContent=`Preview: ${clipped.metadata.width} × ${clipped.metadata.height} cells; ${clipped.mask!.inside} ${clipOptions.method==='all-touched'?'cells selected':'centers inside'}, ${clipped.mask!.valid} with data, ${clipped.mask!.outside} outside. ${clipOptions.method}; margin ${clipOptions.marginPixels} px; native resolution; no resampling.`;}};
  if(context.raster){
    const grid=context.raster,[west,south,east,north]=grid.metadata.bounds,bounds:L.LatLngBoundsExpression=[[south,west],[north,east]];
    map.createPane('raster-preview').style.zIndex='350';
    L.rectangle(bounds,{interactive:false,color:'#546577',weight:1,dashArray:'5 5',fill:false}).addTo(map);
    const overlay=L.imageOverlay(rasterImage(grid),bounds,{pane:'raster-preview',opacity:.8,interactive:false,className:'raster-preview-image'}).addTo(map);
    rasterControls=document.createElement('section');rasterControls.id='raster-preview-controls';
    rasterControls.innerHTML='<h3>Clip parameters</h3><p>Drag polygon vertices or enter bounding coordinates below to replace the polygon with a rectangle. Applying changes updates the connected Study area for all its downstream nodes. Rerun to calculate outputs.</p><label for="raster-preview-opacity">Raster opacity (display only)</label><input id="raster-preview-opacity" type="range" min="0" max="100" value="80"><p>Dashed outline: available raster. Gray: NoData. Colors show relative values.</p><p id="raster-preview-grid"></p><p id="raster-preview-status" role="status"></p><button id="raster-preview-fit" type="button" class="button small">Fit raster and polygon</button>';
    dialog.querySelector('.area-draft')!.prepend(rasterControls);
    if(context.clip)rasterControls.querySelector('p')!.textContent='Drag vertices or enter bounding coordinates below to replace the cutline with a rectangle. Save these parameters on Clip raster, then Run workflow. The shared Study area is unchanged.';
    if(context.clip){
      const fields=document.createElement('div');fields.innerHTML='<label for="clip-preview-method">Pixel inclusion</label><select id="clip-preview-method"><option value="all-touched">All touched (retain intersecting edge pixels)</option><option value="cell-center">Cell center inside</option></select><label for="clip-preview-margin">Outer margin (native pixels, 0–1)</label><input id="clip-preview-margin" type="number" min="0" max="1" step="0.25"><p>Margin expands the clip footprint, including into holes. Pixel values stay unchanged. Map hides the portions outside this footprint. Genuine NoData stays missing.</p>';
      rasterControls.querySelector('p')!.after(fields);
      const method=fields.querySelector<HTMLSelectElement>('#clip-preview-method')!,margin=fields.querySelector<HTMLInputElement>('#clip-preview-margin')!;method.value=clipOptions.method!;margin.value=String(clipOptions.marginPixels);
      method.onchange=()=>{clipOptions.method=method.value as RasterMaskMethod;refresh();};margin.oninput=()=>{clipOptions.marginPixels=margin.value===''?NaN:Number(margin.value);refresh();};
    }
    rasterControls.querySelector('#raster-preview-grid')!.textContent=`${grid.metadata.width} × ${grid.metadata.height} retained cells · EPSG:4326 · pixel size ${grid.metadata.resolution.map(Math.abs).join(' × ')} degrees.`;
    previewStatus=rasterControls.querySelector<HTMLElement>('#raster-preview-status')!;
    const opacity=rasterControls.querySelector<HTMLInputElement>('#raster-preview-opacity')!;opacity.oninput=()=>overlay.setOpacity(Number(opacity.value)/100);
    rasterControls.querySelector<HTMLButtonElement>('#raster-preview-fit')!.onclick=()=>{const b=L.latLngBounds(bounds);if(geometry){const g=geometryBounds(geometry);b.extend([[g[1],g[0]],[g[3],g[2]]]);}map.fitBounds(b,{padding:[25,25],maxZoom:19});};
  }
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
    $('#area-feedback').classList.remove('clip-preview-error');$('#area-feedback').setAttribute('role','status');if(previewStatus)previewStatus.textContent='Draw a valid boundary to preview the clip.';
    shapes.clearLayers();handles.clearLayers();
    $('#area-geojson').textContent=geometry?JSON.stringify(geometry,null,2):'No geometry selected.';
    $('#area-finish').disabled=tool!=='polygon'||vertices.length<3;$('#area-undo-point').disabled=!vertices.length&&!firstCorner;
    let valid=false;
    if(geometry){
      const label=document.createElement('span');label.textContent=name.value.trim();
      L.geoJSON(geometry,{style:{color:'#176b59',weight:2,fillColor:'#5a9b7f',fillOpacity:.2}}).bindTooltip(label,{permanent:true,direction:'center',className:'area-map-label'}).addTo(shapes);
      const b=geometryBounds(geometry);['west','south','east','north'].forEach((key,i)=>( $('#area-'+key) as HTMLInputElement).value=b[i].toFixed(7));
      try{validateDrawnGeometry(geometry);validateClip();const n3=studyAreaN3({id:node.id,params:currentParams()});$('#area-n3').textContent=context.clip?'@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n<urn:fieldwork:cutline:'+node.id+'> a geo:Geometry; geo:asWKT '+JSON.stringify('<'+CRS84+'> '+geometryWKT(geometry))+'^^geo:wktLiteral.':n3.input;$('#area-summary').textContent=`${selectionMode==='bbox'?'Bounding box':'Polygon'} · ${geometry.coordinates[0].length-1} vertices · longitude, latitude`;message(context.raster?`${previewStatus?.textContent} Apply the clip parameters, then rerun to update results.`:'Shape is valid. Apply it to the node, then run to evaluate the N3 rule.');valid=true;}
      catch(e){message(errorMessage(e));$('#area-feedback').classList.add('clip-preview-error');$('#area-feedback').setAttribute('role','alert');if(previewStatus)previewStatus.textContent=errorMessage(e);$('#area-n3').textContent='The draft must be valid and named before N3 is generated.';$('#area-summary').textContent='Draft needs correction';}
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
  for(const key of ['west','south','east','north'])($('#area-'+key) as HTMLInputElement).oninput=()=>{$('#area-apply').disabled=true;message('Choose Use these bounds to replace the polygon with this rectangle before applying.');};
  function fit(){const scope=geometry||context.boundary;if(scope){const b=geometryBounds(scope),bounds:L.LatLngTuple[]=[[b[1],b[0]],[b[3],b[2]]];if(context.point?.coordinates)bounds.push([context.point.coordinates[1],context.point.coordinates[0]]);map.fitBounds(bounds,{padding:[35,35],maxZoom:17});}}
  $('#area-fit').onclick=fit;$('#area-old-naledi').onclick=()=>map.setView([-24.685,25.901],14);
  name.oninput=refresh;
  $('#area-apply').onclick=()=>{try{validateDrawnGeometry(geometry);validateClip();studyAreaN3({id:node.id,params:currentParams()});if(onApply(structuredClone(currentParams()),structuredClone(clipOptions))===false)throw new Error(context.clip?'Clip parameters could not be saved. Retry Apply.':'Study area could not be saved. Retry Apply.');dialog.close();}catch(e){message(errorMessage(e));$('#area-feedback').setAttribute('role','alert');$('#area-feedback').classList.add('clip-preview-error');}};
  $('#area-cancel').onclick=()=>dialog.close();$('#area-close').onclick=()=>dialog.close();
  window.addEventListener('offline',tileStatus);window.addEventListener('online',tileStatus);
  let layoutTimer:ReturnType<typeof setTimeout>;
  dialog.addEventListener('close',()=>{clearTimeout(layoutTimer);window.removeEventListener('offline',tileStatus);window.removeEventListener('online',tileStatus);map.stop();map.remove();rasterControls?.remove();boxControls.remove();boundsDetails.open=boundsWereOpen;name.maxLength=100;nameLabel.textContent=originalLabels[0];eyebrow.textContent=originalLabels[1];draftLabel.textContent=originalLabels[2];$('#area-apply').textContent='Apply study area';},{once:true});
  setTool('pan');refresh();dialog.querySelector('.area-draft')!.scrollTop=0;layoutTimer=setTimeout(()=>{if(dialog.open){map.invalidateSize();fit();}},0);
}
