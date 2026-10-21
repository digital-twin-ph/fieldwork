import type {WorkflowNode,AreaParams,Boundary,Polygon,Position} from './types.js';
import {element} from './dom.js';
import {errorMessage} from './guards.js';
type DrawnParams=Extract<AreaParams,{source:'drawn'}>;
type DrawTool='pan'|'bbox'|'polygon'|'circle';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
/** MapLibre's stylesheet, linked eagerly even though its renderer loads on demand.
 *
 *  esbuild emits the CSS of a DYNAMIC import as a chunk stylesheet -- build/chunks/maplibre-gl-*.css
 *  -- under a content-hashed name that nothing links: index.html loads four stylesheets and that is
 *  not one of them. Leaflet's CSS works only because it rides in this module's bundle, which IS
 *  linked. Without it .maplibregl-canvas-container stays position:static and an OpenFreeMap
 *  basemap draws NOTHING while its status line reads "online" -- found by screenshotting both
 *  basemaps on 2026-10-17: OpenStreetMap returned 228,590 bytes of detail, Liberty 24,041 bytes of
 *  flat colour.
 *
 *  83 KB, against the renderer's 1,035,119. Linking the small half eagerly is what makes the
 *  on-demand half work at all, and a hashed chunk href resolved by hand would break on the next
 *  content change. */
import 'maplibre-gl/dist/maplibre-gl.css';
import {bboxPolygon,validateDrawnGeometry,geometryBounds,studyAreaN3,geometryWKT,boundaryFingerprint,CRS84} from './study-area.js';
import type {RasterGrid} from './raster.js';
import {clipRaster} from './raster.js';
import {rasterImage} from './raster-ui.js';
import type {RasterClipOptions,RasterMaskMethod} from './raster-mask.js';
import {dimensionedBox,circleAround} from './area-buffer.js';

/** A text preview a browser can lay out.
 *
 *  A published jurisdiction is megabytes of text: North Kivu pretty-prints to about 1 MB of
 *  GeoJSON and 370 kB of N3, and this dialog put BOTH into the DOM on every refresh. The
 *  assignment is fast -- 3 ms measured -- and the LAYOUT is not: the dialog kept resizing, the
 *  Apply button kept moving, and it could not be pressed for about seven seconds after a boundary
 *  landed. Measured 2026-10-20, which is what the practitioner reported as a hang.
 *
 *  So the panel shows the head of it and says what it is not showing. The whole thing is on the
 *  node, in the export and in the N3 tab; this is a preview and now says so. */
/** How many vertex handles this dialog will build.
 *
 *  Measured 2026-10-20: each is a Leaflet marker, a div and a set of listeners, and a published
 *  jurisdiction carries thousands -- North Kivu 16,548 -- which freezes the interface for seconds
 *  in Chromium and kills the page in WebKit. Four hundred is comfortably more than anybody draws
 *  by hand and far below where the cost shows. */
const HANDLE_LIMIT=400;
const PREVIEW_LINES=60;
function preview(text:string,what:string):string{
  const lines=text.split('\n');
  if(lines.length<=PREVIEW_LINES)return text;
  return lines.slice(0,PREVIEW_LINES).join('\n')
    +`\n\u2026 ${(lines.length-PREVIEW_LINES).toLocaleString()} more lines of ${what}, `
    +`${(text.length/1e6).toFixed(1)} MB in all. The whole of it is kept on the widget and in every export.`;
}
export function openStudyAreaEditor(node:WorkflowNode<'study_area'>,onApply:(params:DrawnParams,options?:RasterClipOptions)=>void|boolean,context:{boundary?:Boundary;point?:{coordinates:Position|null;name:string};raster?:RasterGrid;clip?:boolean;clipOptions?:RasterClipOptions;
  /** Why a refused save was refused, in the caller's words. "Retry Apply" is not advice when the
   *  store is full: the retry fails identically, and what the practitioner needs is the size and
   *  what to do about it. */
  refusal?:(fallback:string)=>string}={}){
  const clipOptions:RasterClipOptions={method:context.clipOptions?.method||'cell-center',marginPixels:context.clipOptions?.marginPixels||0};
  const dialog=element('#area-dialog'),$=<S extends string>(s:S)=>element(s,dialog);
  let geometry:Boundary|null=node.params.source==='drawn'&&node.params.geometry?structuredClone(node.params.geometry):null,selectionMode:DrawnParams['selectionMode']=node.params.source==='drawn'?node.params.selectionMode:'polygon';
  let tool:DrawTool='pan',centre:Position|null=null,vertices:Position[]=[],firstCorner:Position|null=null,down:L.LeafletMouseEvent|null=null,ignoreClickUntil=0,map:L.Map,loaded=0,failed=0;
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
  const boxControls=document.createElement('details');boxControls.id='area-sized-box';boxControls.innerHTML='<summary>Set a shape by centre coordinates</summary><label for="area-box-shape">Shape</label><select id="area-box-shape"><option value="square">Square</option><option value="rectangle">Rectangle</option><option value="circle">Circle around the centre</option></select><label for="area-box-lon">Centre longitude</label><input id="area-box-lon" type="number" step="any"><label for="area-box-lat">Centre latitude</label><input id="area-box-lat" type="number" step="any"><label for="area-box-radius">Radius (metres)</label><input id="area-box-radius" type="number" min="1" max="50000" value="5000"><label for="area-box-width">Width (metres)</label><input id="area-box-width" type="number" min="1" max="50000" value="1000"><label for="area-box-height">Height (metres)</label><input id="area-box-height" type="number" min="1" max="50000" value="1000" disabled><button id="area-box-center" type="button" class="button small">Use map centre</button><button id="area-box-create" type="button" class="button small">Use sized boundary</button><p>North-aligned bounding box. Ground dimensions are approximate at the centre, not equal degree spans. Resizing map corners afterward creates a free rectangle. Applying keeps the resulting geometry.</p>';
  boundsDetails.after(boxControls);
  const boxInput=(id:string)=>boxControls.querySelector<HTMLInputElement>('#area-box-'+id)!;
  const currentBounds=geometry?geometryBounds(geometry):null;
  boxInput('lon').value=String(currentBounds?(currentBounds[0]+currentBounds[2])/2:25.901);boxInput('lat').value=String(currentBounds?(currentBounds[1]+currentBounds[3])/2:-24.685);
  const boxShape=boxControls.querySelector<HTMLSelectElement>('#area-box-shape')!;
  if(currentBounds){const height=(currentBounds[3]-currentBounds[1])*111195,width=(currentBounds[2]-currentBounds[0])*111195*Math.cos((currentBounds[1]+currentBounds[3])/2*Math.PI/180);boxInput('width').value=width.toFixed(2);boxInput('height').value=height.toFixed(2);boxShape.value=Math.abs(width-height)<.1?'square':'rectangle';boxInput('height').disabled=boxShape.value==='square';}
  boxShape.onchange=()=>{boxInput('height').disabled=boxShape.value==='square';if(boxShape.value==='square')boxInput('height').value=boxInput('width').value;};
  boxInput('width').oninput=()=>{if(boxShape.value==='square')boxInput('height').value=boxInput('width').value;};
  boxControls.querySelector<HTMLButtonElement>('#area-box-center')!.onclick=()=>{const c=map.getCenter();boxInput('lon').value=String(c.lng);boxInput('lat').value=String(c.lat);};
  boxControls.querySelector<HTMLButtonElement>('#area-box-create')!.onclick=()=>{try{const number=(id:string)=>boxInput(id).value.trim()?Number(boxInput(id).value):NaN;geometry=boxShape.value==='circle'?circleAround([number('lon'),number('lat')],number('radius')):dimensionedBox([number('lon'),number('lat')],number('width'),boxShape.value==='square'?number('width'):number('height'));selectionMode=boxShape.value==='circle'?'circle':'bbox';setTool('pan');refresh();fit();}catch(e){message(errorMessage(e));$('#area-feedback').setAttribute('role','alert');}};
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
  if(context.boundary&&node.params.source!=='drawn')L.geoJSON(context.boundary,{renderer:L.canvas(),interactive:false,style:{color:'#68877b',dashArray:'5 5',fillOpacity:.05}} as L.GeoJSONOptions).addTo(map);
  if(context.point?.coordinates){const p=context.point.coordinates,label=document.createElement('span');label.textContent=context.point.name+' · record under review';L.circleMarker([p[1],p[0]],{radius:7,color:'#ad6027',fillOpacity:1}).bindTooltip(label,{permanent:true,direction:'top'}).addTo(map);}
  const message=(text:string)=>$('#area-feedback').textContent=text;
  const tileStatus=()=>{$('#area-tile-status').textContent=!$('#area-online').checked?'Basemap off · geometry stays local':!navigator.onLine?'Offline · saved geometry remains available':failed?'Some map tiles are unavailable · geometry editing still works':loaded?'Online map · OpenStreetMap':'Loading online map…';};
  tiles.on('tileload',()=>{loaded++;tileStatus();});tiles.on('tileerror',()=>{failed++;tileStatus();});
  $('#area-online').onchange=()=>{if($('#area-online').checked){loaded=0;failed=0;tiles.addTo(map);}else map.removeLayer(tiles);tileStatus();};
  $('#area-online').dispatchEvent(new Event('change'));
  const ll=(p:Position)=>L.latLng(p[1],p[0]);
  function setTool(next:DrawTool){tool=next;const radiusControl=dialog.querySelector<HTMLElement>('#area-radius-control');if(radiusControl)radiusControl.hidden=next!=='circle';map.dragging[next==='pan'?'enable':'disable']();$('#area-map').classList.toggle('drawing',next!=='pan');dialog.querySelectorAll<HTMLButtonElement>('[data-draw]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.draw===next)));}
  // Provenance survives editing on purpose. If a practitioner drags a vertex of an acquired
  // boundary, the receipt must still name the source AND say the shape is no longer theirs, which
  // it cannot do if the record is dropped the moment the shape changes.
  let acquired:DrawnParams['boundary']=node.params.source==='drawn'?node.params.boundary:undefined;
  const chosenUnitName=()=>acquired?.unitName||acquired?.unitID||'This published outline';
  function currentParams():DrawnParams{return {source:'drawn',label:name.value.trim(),selectionMode,geometry,...(acquired?{boundary:acquired}:{})};}
  let lastShape:Boundary|null=null,lastName='',lastSettings='',lastN3:ReturnType<typeof studyAreaN3>|null=null;
  function refresh(){
    $('#area-feedback').classList.remove('clip-preview-error');$('#area-feedback').setAttribute('role','status');if(previewStatus)previewStatus.textContent='Draw a valid boundary to preview the clip.';
    shapes.clearLayers();handles.clearLayers();
    $('#area-geojson').textContent=geometry?preview(JSON.stringify(geometry,null,2),'coordinates'):'No geometry selected.';
    $('#area-finish').disabled=tool!=='polygon'||vertices.length<3;$('#area-undo-point').disabled=!vertices.length&&!firstCorner;
    let valid=false;
    if(geometry){
      const label=document.createElement('span');label.textContent=name.value.trim();
      drawParts(geometry,label);
      const b=geometryBounds(geometry);['west','south','east','north'].forEach((key,i)=>( $('#area-'+key) as HTMLInputElement).value=b[i].toFixed(7));
      // VALIDATION AND N3 ARE RECOMPUTED ONLY WHEN THE SHAPE OR ITS NAME CHANGES. refresh() runs
      // on map movement too, and for a published jurisdiction each run costs about 1.3 s --
      // 16,548 vertices walked for the crossing check and written out as WKT -- for an answer
      // that cannot have changed, because whether a polygon is valid does not depend on where
      // the camera is. Measured 2026-10-20.
      // The clip parameters have to be part of the key. They change WITHOUT the shape changing --
      // a margin typed into the raster clip preview is exactly that -- and skipping validateClip
      // for an unchanged shape left Apply enabled on an invalid margin. Caught by the raster
      // test, 2026-10-20, which is the test that exists for that control.
      const settingsKey=JSON.stringify(clipOptions);
      const shapeKey=geometry===lastShape&&name.value===lastName&&settingsKey===lastSettings;
      try{if(!shapeKey){validateDrawnGeometry(geometry);validateClip();}
        const n3=(shapeKey&&lastN3)?lastN3:studyAreaN3({id:node.id,params:currentParams()});
        lastShape=geometry;lastName=name.value;lastSettings=settingsKey;lastN3=n3;$('#area-n3').textContent=preview(context.clip?'@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n<urn:fieldwork:cutline:'+node.id+'> a geo:Geometry; geo:asWKT '+JSON.stringify('<'+CRS84+'> '+geometryWKT(geometry))+'^^geo:wktLiteral.':n3.input,'facts and rules');$('#area-summary').textContent=`${selectionMode==='bbox'?'Bounding box':'Polygon'} · ${geometry.coordinates.reduce((n,r)=>n+r.length-1,0)} vertices${geometry.coordinates.length>1?` · ${geometry.coordinates.length-1} interior ring${geometry.coordinates.length>2?'s':''}`:''} · ${Math.max(1,Math.round(JSON.stringify(geometry).length/1024))} KB · longitude, latitude`;message(context.raster?`${previewStatus?.textContent} Apply the clip parameters, then rerun to update results.`:'Shape is valid. Apply it to the node, then run to evaluate the N3 rule.');valid=true;}
      catch(e){message(errorMessage(e));$('#area-feedback').classList.add('clip-preview-error');$('#area-feedback').setAttribute('role','alert');if(previewStatus)previewStatus.textContent=errorMessage(e);$('#area-n3').textContent='The draft must be valid and named before N3 is generated.';$('#area-summary').textContent='Draft needs correction';}
      // VERTEX HANDLES ARE FOR A SINGLE-PART SHAPE. A study area may now hold several parts --
      // two jurisdictions, possibly in different countries -- and dragging a vertex of one of
      // them is not an operation this dialog offers: the outlines came from a source as
      // published, and editing one by hand is what the provenance records as a modification.
      // The parts are still drawn; they just carry no handles.
      if(geometry.type==='Polygon'){
      const ring=geometry.coordinates[0];
      // A circle is a polygon, but it must not be edited as one: dragging one of its 128
      // vertices would deform it into something that is no longer a radius around a centre.
      // It gets two handles instead — move the whole circle, or change the radius.
      if(selectionMode==='circle'){circleHandles(ring);}
      else{
      const points=selectionMode==='bbox'?[ring[0],ring[2]]:ring.slice(0,-1);
      // A HANDLE PER VERTEX, AND A PUBLISHED JURISDICTION HAS THOUSANDS.
      //
      // This is the cause of what the practitioner reported as a hang. Profiled 2026-10-20 while
      // applying North Kivu: of 6.5 s sampled, 3.3 s is the browser's own layout and 492 ms is
      // Leaflet's `_listens`, with `_initIcon` and `_setIconStyles` beneath it -- one draggable
      // marker, one div and one set of listeners for each of 16,547 vertices. The arithmetic this
      // dialog does is nothing beside it: `crossingFault` is 35 ms and `validateDrawnGeometry`
      // 17 ms. It is also why WebKit does not survive the same boundary while Kwango's 15,236
      // vertices apply in 5.7 s.
      //
      // Handles are for a shape somebody DREW: a box has two, a hand-drawn polygon a few dozen.
      // Dragging one vertex of an acquired outline is not an operation this dialog offers in the
      // first place -- the geometry is as published, and editing it is what the provenance
      // records as a modification -- so an outline above the limit is drawn without them and says
      // so, rather than building controls nobody can use out of the interface's own budget.
      // AN ACQUIRED OUTLINE IS NOT DRAGGABLE, WHATEVER ITS SIZE. The practitioner, 2026-10-20:
      // *"If it's a jurisdictional polygon as a study area, I don't think we should make the
      // vertices draggable. That would be changing the shape, provenance and authoritativeness of
      // the polygon."* A first version capped handles by VERTEX COUNT, which answered the
      // performance question and got the principle wrong: a small district -- 40 vertices, well
      // under any cap -- would still have offered the gesture. The question is not how many
      // vertices there are, it is whose shape it is.
      //
      // The provenance machinery stays as it was: a boundary that is modified by some other route
      // keeps naming its source and records `fw:geometryAsPublished false`, because a shape that
      // was edited and says nothing is worse than one that was edited and says so. What changes
      // is that this dialog no longer invites the edit.
      if(acquired){
        $('#area-summary').textContent=`${chosenUnitName()} as published \u00b7 ${points.length.toLocaleString()} vertices \u00b7 not editable by hand`;
        message('This outline is a published jurisdiction, so its vertices cannot be dragged. Draw your own shape if you need a different area.');
      }else if(points.length>HANDLE_LIMIT){
        // Nobody draws four hundred vertices by hand; a geometry this size arrived some other way,
        // and one draggable marker per vertex is what froze this dialog and killed WebKit.
        $('#area-summary').textContent=`${points.length.toLocaleString()} vertices \u00b7 drag handles are not shown above ${HANDLE_LIMIT.toLocaleString()}`;
      }else{
      points.forEach((p,i)=>{
        const marker=L.marker(ll(p),{draggable:true,icon:L.divIcon({className:'area-vertex',iconSize:[12,12],iconAnchor:[6,6]}),title:`Move ${selectionMode==='bbox'?'corner':'vertex'} ${i+1}`,keyboard:true}).addTo(handles);
        marker.on('dragstart',()=>setTool('pan'));
        marker.on('dragend',()=>{const v=marker.getLatLng(),next=[v.lng,v.lat];if(selectionMode==='bbox'){const other=points[1-i];geometry={type:'Polygon',coordinates:[[[Math.min(next[0],other[0]),Math.min(next[1],other[1])],[Math.max(next[0],other[0]),Math.min(next[1],other[1])],[Math.max(next[0],other[0]),Math.max(next[1],other[1])],[Math.min(next[0],other[0]),Math.max(next[1],other[1])],[Math.min(next[0],other[0]),Math.min(next[1],other[1])]]]};}else{const r=ring.slice(0,-1);r[i]=next;geometry={type:'Polygon',coordinates:[[...r,r[0]]]};}refresh();});
      });
      }
      }
      }
    }else{
      const draft=tool==='bbox'&&firstCorner?[firstCorner]:vertices;
      if(draft.length)L.polyline(draft.map(ll),{color:'#176b59',dashArray:'5 5'}).addTo(shapes);
      draft.forEach(p=>L.circleMarker(ll(p),{radius:4,color:'#176b59'}).addTo(shapes));
      $('#area-summary').textContent=draft.length?`${draft.length} draft ${draft.length===1?'point':'points'}`:'No area selected';
      $('#area-n3').textContent='Draw a bounding box or finish a polygon to preview the N3 facts and rule.';
      message(tool==='bbox'?'Click two opposite corners, or drag a rectangle.':tool==='polygon'?'Click each vertex, then choose Finish polygon.':tool==='circle'?(centre?'Adjust the radius, then apply. Click again to move the centre.':'Click the centre of your study area.'):'Pan and zoom to your study area, then choose Bounding box or Polygon.');
    }
    $('#area-apply').disabled=!valid;
  }
  /** Below this many pixels across, a part is drawn as a pin instead of an outline.
   *
   *  The practitioner, 2026-10-18: *"if there are several countries or cities in different
   *  countries involved in the study area, the polygons will likely be too small for a zoomed out
   *  view and hence it will be a global view zoomed out with pins on the centroids of the study
   *  area. When zoomed in on one, we can show the polygon."*
   *
   *  14 px is about the size of the pin itself, so the rule is simply: never draw a shape smaller
   *  than the marker that would stand for it. An outline that renders as three pixels of fill is
   *  not a boundary a reader can judge -- it is a dot that merely looks like a measurement. The
   *  same rule covers polygons, circles and bounding boxes, because all three are rings here. */
  const PIN_BELOW_PX=14;
  const partsOf=(g:Boundary):Position[][][]=>g.type==='Polygon'?[g.coordinates]:g.coordinates;
  /** A point guaranteed to be INSIDE the ring, not merely its average.
   *
   *  A centroid falls outside a crescent or a horseshoe, and a pin outside the jurisdiction it
   *  stands for would be worse than no pin. The average is used when it lands inside, and a
   *  scanline midpoint through the ring's middle when it does not. */
  function representativePoint(ring:Position[]):Position{
    const pts=ring.slice(0,-1);
    const avg:Position=[pts.reduce((t,p)=>t+p[0],0)/pts.length,pts.reduce((t,p)=>t+p[1],0)/pts.length];
    if(pointInRing(avg,ring))return avg;
    const ys=pts.map(p=>p[1]),y=(Math.min(...ys)+Math.max(...ys))/2;
    const xs:number[]=[];
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const [xi,yi]=pts[i],[xj,yj]=pts[j];
      if((yi>y)!==(yj>y))xs.push(xi+(y-yi)/(yj-yi)*(xj-xi));
    }
    xs.sort((a,b)=>a-b);
    return xs.length>=2?[(xs[0]+xs[1])/2,y]:avg;
  }
  function pointInRing(p:Position,ring:Position[]){
    let inside=false;
    for(let i=0,j=ring.length-2;i<ring.length-1;j=i++){
      const [xi,yi]=ring[i],[xj,yj]=ring[j];
      if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))inside=!inside;
    }
    return inside;
  }
  /** Each part at the size it actually occupies: an outline when that is legible, a pin when it
   *  is not. Re-evaluated on every zoom, so zooming in on a pin turns it into its boundary. */
  function drawParts(g:Boundary,label?:HTMLElement){
    const parts=partsOf(g);
    let labelled=false,pins=0;
    for(const rings of parts){
      const ring=rings[0];
      let w=Infinity,s2=Infinity,e=-Infinity,n2=-Infinity;
      for(const [x,y] of ring){if(x<w)w=x;if(x>e)e=x;if(y<s2)s2=y;if(y>n2)n2=y;}
      const a=map.latLngToContainerPoint([s2,w]),b=map.latLngToContainerPoint([n2,e]);
      const across=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));
      if(across<PIN_BELOW_PX){
        pins++;
        const at=representativePoint(ring);
        const pin=L.circleMarker(ll(at),{radius:6,color:'#176b59',weight:2,fillColor:'#5a9b7f',fillOpacity:.9})
          .addTo(shapes);
        if(label&&!labelled){pin.bindTooltip(label,{permanent:true,direction:'top',className:'area-map-label'});labelled=true;}
      }else{
        // CANVAS, not SVG. A published jurisdiction is tens of thousands of vertices -- North
        // Kivu is 16,548 -- and an SVG path that long is what makes applying one feel like a
        // hang: measured 2026-10-20, the JavaScript in Apply totals 400 ms while the wall clock
        // is 8.3 s, and the difference is the browser painting this path. The same change the
        // street network needed, for the same reason.
        const shape=L.geoJSON({type:'Polygon',coordinates:rings} as Boundary,
          {renderer:L.canvas(),style:{color:'#176b59',weight:2,fillColor:'#5a9b7f',fillOpacity:.2}} as L.GeoJSONOptions).addTo(shapes);
        if(label&&!labelled){shape.bindTooltip(label,{permanent:true,direction:'center',className:'area-map-label'});labelled=true;}
      }
    }
    const el=$('#area-map');
    el.dataset.drawnParts=String(parts.length);
    el.dataset.drawnPins=String(pins);
  }
  // Zooming changes which representation is honest, so the shapes are redrawn, and only the
  // shapes -- revalidating and re-serialising the N3 on every zoom would rebuild a 166 KB string
  // to move a camera.
  map.on('zoomend',()=>{if(geometry){shapes.clearLayers();const label=document.createElement('span');label.textContent=name.value.trim();drawParts(geometry,label);}});
  const radiusInput=()=>dialog.querySelector<HTMLInputElement>('#area-radius');
  function drawCircle(){
    if(!centre)return;
    const metres=Number(radiusInput()?.value||5000);
    const output=dialog.querySelector<HTMLOutputElement>('#area-radius-value');
    if(output)output.textContent=`${metres.toLocaleString()} m`;
    try{geometry=circleAround(centre,metres);selectionMode='circle';refresh();}
    catch(error){message(errorMessage(error));}
  }
  /** Centre and radius of a circle, read back from its ring so a reopened node is editable. */
  function circleOf(ring:Position[]){
    const b=geometryBounds({type:'Polygon',coordinates:[ring]});
    const c:Position=[(b[0]+b[2])/2,(b[1]+b[3])/2];
    return {centre:c,radiusM:Math.max(1,Math.round((b[3]-b[1])/2*111195))};
  }
  /** Ground distance in metres, as the circle itself is constructed: adequate at these radii. */
  function metresBetween(a:Position,b:Position){
    const dy=(b[1]-a[1])*111195,dx=(b[0]-a[0])*111195*Math.cos(a[1]*Math.PI/180);
    return Math.sqrt(dx*dx+dy*dy);
  }
  function circleHandles(ring:Position[]){
    const {centre:c,radiusM}=circleOf(ring);
    centre=c;
    const slider=radiusInput();
    if(slider&&Number(slider.value)!==radiusM)slider.value=String(radiusM);
    const output=dialog.querySelector<HTMLOutputElement>('#area-radius-value');
    if(output)output.textContent=`${radiusM.toLocaleString()} m`;
    const move=L.marker(ll(c),{draggable:true,icon:L.divIcon({className:'area-vertex area-centre',iconSize:[14,14],iconAnchor:[7,7]}),title:'Move the circle',keyboard:true}).addTo(handles);
    move.on('dragstart',()=>setTool('pan'));
    move.on('dragend',()=>{const v=move.getLatLng();centre=[v.lng,v.lat];drawCircle();});
    // Due east of the centre, so there is one unambiguous place to grab for size.
    const edge:Position=[c[0]+(radiusM/(111195*Math.cos(c[1]*Math.PI/180))),c[1]];
    const size=L.marker(ll(edge),{draggable:true,icon:L.divIcon({className:'area-vertex area-radius-handle',iconSize:[12,12],iconAnchor:[6,6]}),title:'Change the radius',keyboard:true}).addTo(handles);
    size.on('dragstart',()=>setTool('pan'));
    size.on('dragend',()=>{
      const v=size.getLatLng(),next=Math.round(metresBetween(c,[v.lng,v.lat]));
      const slider=radiusInput();
      if(slider){slider.value=String(Math.min(Number(slider.max),Math.max(Number(slider.min),next)));}
      drawCircle();
    });
  }
  function makeBox(a:Position,b:Position){geometry={type:'Polygon',coordinates:[[[Math.min(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.min(a[1],b[1])],[Math.max(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.max(a[1],b[1])],[Math.min(a[0],b[0]),Math.min(a[1],b[1])]]]};selectionMode='bbox';firstCorner=null;setTool('pan');refresh();}
  dialog.querySelectorAll<HTMLButtonElement>('[data-draw]').forEach(b=>b.onclick=()=>{const next=b.dataset.draw as DrawTool;setTool(next);if(next!=='pan'){geometry=null;vertices=[];firstCorner=null;selectionMode=next;}refresh();});
  map.on('click',e=>{if(Date.now()<ignoreClickUntil)return;const p=[e.latlng.lng,e.latlng.lat];if(tool==='circle'){centre=p;drawCircle();return;}if(tool==='bbox'){if(firstCorner)makeBox(firstCorner,p);else{firstCorner=p;refresh();}}else if(tool==='polygon'){if(vertices.length>=200){message('Use at most 200 vertices.');return;}vertices.push(p);refresh();}});
  map.on('mousedown',e=>{if(tool==='bbox')down=e;});
  map.on('mouseup',e=>{if(tool==='bbox'&&down&&e.containerPoint.distanceTo(down.containerPoint)>8){makeBox([down.latlng.lng,down.latlng.lat],[e.latlng.lng,e.latlng.lat]);ignoreClickUntil=Date.now()+300;}down=null;});
  $('#area-finish').onclick=()=>{if(vertices.length<3)return;geometry={type:'Polygon',coordinates:[[...vertices,vertices[0]]]};vertices=[];setTool('pan');refresh();};
  $('#area-undo-point').onclick=()=>{if(firstCorner)firstCorner=null;else vertices.pop();refresh();};
  radiusInput()?.addEventListener('input',drawCircle);
  $('#area-clear').onclick=()=>{geometry=null;vertices=[];firstCorner=null;centre=null;setTool('pan');refresh();};
  $('#area-use-bounds').onclick=()=>{try{const values=['west','south','east','north'].map(k=>( $('#area-'+k) as HTMLInputElement).value.trim()===''?NaN:Number(( $('#area-'+k) as HTMLInputElement).value));geometry=bboxPolygon(values[0],values[1],values[2],values[3]);selectionMode='bbox';setTool('pan');refresh();fit();}catch(e){message(errorMessage(e));}};
  for(const key of ['west','south','east','north'])($('#area-'+key) as HTMLInputElement).oninput=()=>{$('#area-apply').disabled=true;message('Choose Use these bounds to replace the polygon with this rectangle before applying.');};
  function fit(){const scope=geometry||context.boundary;if(scope){const b=geometryBounds(scope),bounds:L.LatLngTuple[]=[[b[1],b[0]],[b[3],b[2]]];if(context.point?.coordinates)bounds.push([context.point.coordinates[1],context.point.coordinates[0]]);map.fitBounds(bounds,{padding:[35,35],maxZoom:17});}}
  // AN ADMINISTRATIVE BOUNDARY, CHOSEN BY NAME. Experiment 14 specified this on 2026-10-06 and
  // recorded that jurisdiction selection was "not yet implemented"; A54 asks to select members
  // without forcing a union. Two steps, deliberately: CHECK the level, which fetches metadata
  // only, then download the units actually chosen. The probe of 2026-10-17 is what makes that
  // possible -- the metadata endpoint carries admUnitCount and vertex statistics and no geometry,
  // so the size is visible before anything large is fetched.
  // The summary is rebuilt whenever the selection changes. It used to be written once, with a
  // hard-coded empty list, so it read "0 of 189 ADM2 units" however many a practitioner had
  // clicked -- the dialog actively denied a selection it had in fact registered. The practitioner,
  // 2026-10-18: *"This selection does not work even if offered."*
  let summarise:typeof import('./boundary-source.js').selectionSummary|null=null;
  let pickedLevel:import('./boundary-source.js').BoundaryLevel|null=null;
  let pickedUnits:import('./boundary-source.js').BoundaryUnit[]=[];
/** Bytes a published boundary vertex costs, measured 2026-10-19 on DRC ADM2: 6,386,010 bytes over
 *  189 units averaging 774 vertices, which is 43.7. Rounded down to 40, so the estimate shown
 *  before a download is a little under rather than a little over -- a progress line that passes
 *  its own estimate is better than one that stalls short of it. */
const ESTIMATED_BYTES_PER_VERTEX=40;

/** Fetch, reporting what has arrived. The same shape the street-network client uses, and for the
 *  same reason: a multi-megabyte download with no progress is indistinguishable from a hang.
 *  `content-length` is preferred when the server sends one; the estimate is the fallback, since
 *  these files are served through a Git LFS redirect that may not declare a length.
 *
 *  The timeout is per READ, not for the whole download, so a slow connection is given as long as
 *  it needs while a stalled one is given up on. */
async function fetchWithProgress(url:string,estimate:number,onProgress:(read:number)=>void,stallMs=20000):Promise<string>{
  const response=await fetch(url);
  if(!response.ok||!response.body)throw new Error('The boundary file could not be fetched.');
  const declared=Number(response.headers.get('content-length'))||estimate;
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];
  let read=0;
  for(;;){
    const next=await Promise.race([
      reader.read(),
      new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error(
        `The boundary download stopped after ${(read/1e6).toFixed(1)} MB of about ${(declared/1e6).toFixed(1)} MB. `
        +'Nothing was changed. The study area can still be drawn.')),stallMs)),
    ]);
    if(next.done)break;
    chunks.push(next.value);read+=next.value.length;onProgress(read);
  }
  const joined=new Uint8Array(read);let offset=0;
  for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder().decode(joined);
}

  const boundaryStatus=$('#area-boundary-status'),unitsBox=$('#area-boundary-units');
  const unitPick=$('#area-boundary-pick') as HTMLSelectElement;
  // The list is filled from the bundled snapshot the moment the dialog opens, so typing
  // "Congo" offers both Congos and the practitioner picks the one they mean.
  void import('./boundary-source.js').then(({COUNTRIES})=>{
    const list=$('#area-iso-options');
    if(list.childElementCount)return;
    list.innerHTML=COUNTRIES.map(c=>`<option value="${c.name}">${c.iso}</option>`).join('');
  });
  $('#area-boundary-check').onclick=async()=>{
    const typed=($('#area-iso') as HTMLInputElement).value;
    const adm=($('#area-adm') as HTMLSelectElement).value;
    const {resolveCountry}=await import('./boundary-source.js');
    const iso=resolveCountry(typed);
    if(!iso){
      // "Congo" matches two countries. Refusing an ambiguous prefix is the point: silently
      // picking one would choose a different nation than the practitioner meant.
      boundaryStatus.textContent=typed.trim()
        ?`No single country matches "${typed.trim()}". Choose one from the list \u2014 more than one may start that way.`
        :'Choose a country, by name or by its three-letter code.';
      return;
    }
    unitsBox.hidden=true;pickedLevel=null;pickedUnits=[];
    // The country is NAMED, not just coded. Typing "Congo" resolves correctly to the Republic
    // of the Congo -- and somebody who meant the Democratic Republic of the Congo has to be able
    // to see that before they download a boundary a thousand kilometres from their outbreak.
    const {countryName,alsoMatching}=await import('./boundary-source.js');
    const near=alsoMatching(typed,iso);
    boundaryStatus.textContent=`Checking ${countryName(iso)} (${iso}) ${adm}\u2026`
      +(near.length?` \u2014 note: ${near.join(', ')} also match what you typed.`:'');
    try{
      const {levelUrl,readLevel,selectionSummary}=await import('./boundary-source.js');
      const response=await fetch(levelUrl(iso,adm));
      const level=response.ok?readLevel(iso,adm,await response.json()):null;
      if(!level){
        // Nigeria publishes no ADM3. An absent level is an ANSWER, not a failed request, and
        // saying so is what stops a practitioner retrying a thing that cannot work.
        boundaryStatus.textContent=`${countryName(iso)} (${iso}) publishes no ${adm}. Try a higher level.`
          +(near.length?` Note: ${near.join(', ')} also match what you typed.`:'');return;
      }
      pickedLevel=level;
      // The SIZE, before the wait rather than after it. The level check exists so a practitioner
      // can see how large a level is first, and it reported "189 units, 774 vertices each on
      // average" without ever turning that into megabytes. DRC ADM2 is 6,386,010 bytes and took
      // 15.3 seconds on a fast connection, measured 2026-10-19 -- during which this dialog said
      // "Downloading the shapes next." and nothing else, with no progress and no timeout. The
      // practitioner, reasonably: *"This one broke -- I cannot select an ADM unit."* It had not
      // broken. It was working and saying nothing, which is indistinguishable.
      //
      // `selectionSummary(level,[])` is kept for the licence and the vintage but its leading
      // count is dropped here: "0 of 189 ADM2 units" before anything has been chosen reads as a
      // failure to find them.
      const estimate=level.units*level.meanVertices*ESTIMATED_BYTES_PER_VERTEX;
      const summary=selectionSummary(level,[]).replace(/^\d+ of /,'');
      const describe=(lead:string)=>`${lead} \u00b7 ${level.units} units \u00b7 ${level.meanVertices} vertices each on average \u00b7 ${summary}`;
      boundaryStatus.textContent=describe(`Downloading about ${(estimate/1e6).toFixed(1)} MB of shapes\u2026`);
      const shapes=await fetchWithProgress(level.geoJsonUrl,estimate,read=>{
        boundaryStatus.textContent=`Downloading ${countryName(iso)} ${adm} shapes \u2014 `
          +`${(read/1e6).toFixed(1)} MB of about ${(estimate/1e6).toFixed(1)} MB\u2026`;
      });
      const {readUnits}=await import('./boundary-source.js');
      pickedUnits=readUnits(level,JSON.parse(shapes));
      unitPick.innerHTML=pickedUnits.map((u,i)=>`<option value="${i}">${u.name}</option>`).join('');
      unitsBox.hidden=false;
      // The SIZE stays on screen rather than flashing past. It is the thing that makes
      // "only the boundaries we need" a decision the practitioner can take, and a message that
      // is replaced as soon as the download finishes is a message they may never read.
      summarise=selectionSummary;
      showSelection();
      // THE COUNTRY, as soon as its units are known. There is no country outline to fit before
      // the download -- the bundled list carries names and codes, not geometry -- so the extent
      // of every unit at this level is the country's extent.
      lookAt(pickedUnits);
      // The near miss OUTLIVES the lookup. Putting "another country also matches what you typed"
      // in the transient checking message meant it was replaced the instant the download
      // finished -- the second time in this dialog that the one thing worth reading disappeared
      // before it could be read.
      // AND IT SAYS THE DOWNLOAD FINISHED. The practitioner, 2026-10-20: *"What's missing is the
      // feedback that the download completed."* A first attempt announced it in a line of its
      // own, which the next assignment replaced in the same task -- it flashed for milliseconds,
      // and feedback nobody can read is not feedback. It belongs in the sentence that stays.
      boundaryStatus.textContent=`Downloaded ${(shapes.length/1e6).toFixed(1)} MB \u00b7 ${countryName(iso)} (${iso}) `
        +`\u00b7 ${pickedUnits.length} units ready. Choose the ones you need.`
        +(near.length?` Note: ${near.join(', ')} also match what you typed.`:'');
    }catch{boundaryStatus.textContent='That boundary could not be reached. The study area can still be drawn.';}
  };
  function chosenUnits(){return [...unitPick.selectedOptions].map(o=>pickedUnits[Number(o.value)]).filter(Boolean);}
  // THE MAP FOLLOWS THE CHOICE. The practitioner, 2026-10-18: *"if I select the country the map
  // should go there, and if I select an ADM unit, the map should go there, less friction."* The
  // dialog could sit over Gaborone while a practitioner picked units in the DRC, which left them
  // choosing a study area they could not see.
  //
  // This moves the CAMERA only; it commits no geometry. Nothing is applied to the node until
  // "Use the selected units", so looking somewhere is not the same as choosing it.
  function lookAt(units:readonly {geometry:Boundary}[]){
    let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
    for(const u of units){
      const [w,s2,e,n]=geometryBounds(u.geometry);
      if(w<west)west=w; if(e>east)east=e;
      if(s2<south)south=s2; if(n>north)north=n;
    }
    if(!Number.isFinite(west)||!Number.isFinite(south))return;
    map.fitBounds([[south,west],[north,east]],{padding:[35,35],maxZoom:17});
    // The extent the camera was sent to, recorded on the element. Leaflet keeps its view in a
    // closure, so without this there is nothing outside the map that can state where it is --
    // neither a test nor anyone reading the DOM to find out why they are looking at Gaborone.
    const el=$('#area-map');
    el.dataset.lookingAt=`${west.toFixed(4)},${south.toFixed(4)},${east.toFixed(4)},${north.toFixed(4)}`;
  }
  // Naming what is selected, not just counting it: with 189 units in a six-row list, "1 of 189"
  // still leaves open WHICH one, and Bunia (a city) sits beside Irumu (a territory a hundred
  // times larger) under the same ADM2 label.
  function showSelection(){
    if(!pickedLevel||!summarise)return;
    const chosen=chosenUnits();
    const names=chosen.length
      ? ` \u00b7 ${chosen.slice(0,4).map(u=>u.name).join(', ')}${chosen.length>4?` and ${chosen.length-4} more`:''}`
      : ' \u00b7 none chosen yet';
    $('#area-boundary-terms').textContent=
      `${pickedLevel.meanVertices} vertices each on average \u00b7 ${summarise(pickedLevel,chosen)}${names}`;
  }
  unitPick.onchange=()=>{showSelection();const chosen=chosenUnits();if(chosen.length)lookAt(chosen);};
  $('#area-boundary-use').onclick=()=>{
    const chosen=chosenUnits();
    if(!pickedLevel||!chosen.length){$('#area-boundary-terms').textContent='Select at least one unit.';return;}
    void (async()=>{
      // The same silence as Apply, in the phase WebKit spends it in: measured 2026-10-20, taking
      // North Kivu's 16,548 vertices through this button costs 7.7 s in WebKit and 0.1 s in
      // Chromium, while Apply costs 7.9 s in Chromium and little in WebKit. The work is the same
      // and the engines schedule it differently, so both phases have to say what they are doing.
      const chosenVertices=chosen.reduce((n,unit)=>{
        const g=unit.geometry as {type:string;coordinates:unknown};
        const rings=g.type==='Polygon'?g.coordinates as Position[][]:(g.coordinates as Position[][][]).flat();
        return n+rings.reduce((m,ring)=>m+ring.length,0);},0);
      if(chosenVertices>2000){
        $('#area-feedback').textContent=`Drawing ${chosen.length===1?chosen[0].name:`${chosen.length} units`} \u2014 ${chosenVertices.toLocaleString()} vertices\u2026`;
        await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      }
      const {publishedRings,publishedNote}=await import('./boundary-source.js');
      // ONE unit gets its OWN OUTLINE, AS PUBLISHED. "Selecting Bunia gave me a square not the
      // jurisdictional polygon" -- it did, because a bounding box was the shortcut for combining
      // several, and it was applied even to one. A box includes ground that is not in the
      // jurisdiction, which for an outbreak investigation is the difference between a district
      // and the land round it.
      //
      // Nothing is simplified to fit a vertex count any more. Simplifying preserved area to
      // within 0.05% while moving up to 0.82% of a unit to the other side of its own edge, and
      // membership at the edge is exactly what an outbreak question asks about
      // (docs/research/vertex-contract-probe-2026-10-18.md). The budget is bytes now, so an
      // outline is either admitted whole or refused with its size named.
      if(chosen.length===1){
        const rings=publishedRings(chosen[0].geometry);
        if(!rings){$('#area-boundary-terms').textContent='That unit carries no usable outline.';return;}
        try{geometry=validateDrawnGeometry({type:'Polygon',coordinates:rings.rings});}
        catch(e){$('#area-boundary-terms').textContent=`${chosen[0].name}: ${errorMessage(e)}`;return;}
        acquired={boundaryID:pickedLevel!.boundaryID,unitID:chosen[0].id,unitName:chosen[0].name,
          source:pickedLevel!.source,licence:pickedLevel!.licence,licenceSource:pickedLevel!.licenceSource,
          yearRepresented:pickedLevel!.yearRepresented,canonical:pickedLevel!.canonical,
          retrievedFrom:pickedLevel!.geoJsonUrl,retrievedAt:new Date().toISOString(),
          vertices:rings.vertices,publishedHash:boundaryFingerprint(geometry)};
        selectionMode='polygon';setTool('pan');refresh();fit();
        $('#area-boundary-terms').textContent=
          `${publishedNote(chosen[0].name,rings)} \u00b7 ${pickedLevel!.source} \u00b7 ${pickedLevel!.boundaryID} \u00b7 ${pickedLevel!.licence}`;
        return;
      }
      // SEVERAL UNITS ARE SEVERAL PARTS, each as published. They used to collapse to a bounding
      // box around all of them -- a shape belonging to none, and the practitioner reported it
      // twice -- and that was only ever because a study area could hold one polygon. It can hold
      // several now, so there is nothing left to collapse.
      const parts:[number,number][][][]=[];
      const kept:typeof chosen=[];
      for(const u of chosen){
        const r=publishedRings(u.geometry);
        if(r)       {parts.push(r.rings);kept.push(u);}
      }
      if(!parts.length){$('#area-boundary-terms').textContent='Those units carry no usable outline.';return;}
      try{geometry=validateDrawnGeometry({type:'MultiPolygon',coordinates:parts});}
      catch(e){$('#area-boundary-terms').textContent=`${kept.map(u=>u.name).join(', ')}: ${errorMessage(e)}`;return;}
      selectionMode='polygon';
      acquired={boundaryID:pickedLevel!.boundaryID,unitID:kept.map(u=>u.id).join(' '),
        unitName:kept.map(u=>u.name).join(', '),source:pickedLevel!.source,licence:pickedLevel!.licence,
        licenceSource:pickedLevel!.licenceSource,yearRepresented:pickedLevel!.yearRepresented,
        canonical:pickedLevel!.canonical,retrievedFrom:pickedLevel!.geoJsonUrl,
        retrievedAt:new Date().toISOString(),
        vertices:parts.reduce((n,rings)=>n+rings.reduce((m,r)=>m+r.length-1,0),0),
        publishedHash:boundaryFingerprint(geometry)};
      setTool('pan');refresh();fit();
      const dropped=chosen.length-kept.length;
      $('#area-boundary-terms').textContent=
        `${kept.map(u=>u.name).join(', ')} \u00b7 ${kept.length} outlines as published, `
        +`${parts.reduce((n,rings)=>n+rings.reduce((m,r)=>m+r.length-1,0),0)} vertices`
        +`${dropped?`, ${dropped} unit${dropped===1?'':'s'} carried no usable outline`:''} \u00b7 `
        +`${pickedLevel!.source} \u00b7 ${pickedLevel!.boundaryID} \u00b7 ${pickedLevel!.licence}`;
    })();
  };
  $('#area-fit').onclick=fit;$('#area-old-naledi').onclick=()=>map.setView([-24.685,25.901],14);
  name.oninput=refresh;
  /** Applying a published boundary is SLOW and was silent.
   *
   *  "I tried to download North Kivu ADM1 study area and I think process hangs." It does not
   *  hang. Measured 2026-10-20 with the level served from a fixture: the download and the unit
   *  list take 0.5 s, choosing takes 0.1 s, and APPLY takes 7.6 s -- North Kivu is 16,548
   *  vertices admitted whole, and every step that follows walks them. Seven seconds with a frozen
   *  dialog, nothing disabled and no message is indistinguishable from a crash, which is the
   *  lesson the download itself learned in October and this surface had not.
   *
   *  Each phase says what it is doing and yields to the browser so the words appear. That does
   *  not make it faster: it makes it legible, and it tells a practitioner where the time went. */
  const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  $('#area-apply').onclick=async()=>{
    const button=$('#area-apply') as HTMLButtonElement;
    if(button.disabled)return;
    const label=button.textContent||'Apply';
    const vertices=!geometry?0:(geometry.type==='Polygon'
      ?(geometry.coordinates as Position[][]).reduce((n,ring)=>n+ring.length,0)
      :(geometry.coordinates as Position[][][]).reduce((n,part)=>n+part.reduce((m,ring)=>m+ring.length,0),0));
    const heavy=vertices>2000;
    button.disabled=true;button.textContent='Applying\u2026';
    const began=Date.now();
    try{
      if(heavy){message(`Checking the outline \u2014 ${vertices.toLocaleString()} vertices\u2026`);await paint();}
      validateDrawnGeometry(geometry);validateClip();
      if(heavy){message('Writing the facts for this area\u2026');await paint();}
      studyAreaN3({id:node.id,params:currentParams()});
      if(heavy){message('Saving it to this device\u2026');await paint();}
      if(onApply(structuredClone(currentParams()),structuredClone(clipOptions))===false)
        throw new Error((context.refusal??(m=>m))(context.clip
          ?'Clip parameters could not be saved. Retry Apply.'
          :'Study area could not be saved. Retry Apply.'));
      // No "applied in N s" here: this panel closes in the same breath, so the confirmation is
      // raised on the canvas instead, where the practitioner is afterwards.
      dialog.close();
    }catch(e){message(errorMessage(e));}
    finally{button.disabled=false;button.textContent=label;}
  };
  $('#area-cancel').onclick=()=>dialog.close();$('#area-close').onclick=()=>dialog.close();
  window.addEventListener('offline',tileStatus);window.addEventListener('online',tileStatus);
  let layoutTimer:ReturnType<typeof setTimeout>;
  dialog.addEventListener('close',()=>{clearTimeout(layoutTimer);window.removeEventListener('offline',tileStatus);window.removeEventListener('online',tileStatus);map.stop();map.remove();rasterControls?.remove();boxControls.remove();boundsDetails.open=boundsWereOpen;name.maxLength=100;nameLabel.textContent=originalLabels[0];eyebrow.textContent=originalLabels[1];draftLabel.textContent=originalLabels[2];$('#area-apply').textContent='Apply study area';},{once:true});
  setTool('pan');refresh();dialog.querySelector('.area-draft')!.scrollTop=0;layoutTimer=setTimeout(()=>{if(dialog.open){map.invalidateSize();fit();}},0);
}
