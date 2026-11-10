/** GEOREFERENCED MAP IMAGE, CONFIGURED (experiments 186 and 201): the image, how it is placed -- by a world file, or by
 *  points matched between the image and today's map -- and how far it can be read through.
 *
 *  The practitioner, 2026-11-10: *"We can have an interface that pairs control points between the image and a map of
 *  the place"*; *"we should be able to do the georeferencing by hand"*; *"How do we point the user to the right pairs of
 *  points is the question."*
 *
 *  BY HAND, AND BY NUMBERS. Every matched point is a row of fields -- a name, its pixel on the image, its longitude and
 *  latitude -- that a click fills and a person can type, so a manual can say exactly what to enter and a person who
 *  cannot click precisely can still place a plan. The residuals update as points are added: on the ground, in metres,
 *  for each point, and, once there are more points than the fit needs, with the point left out, which is what shows a
 *  pair that fits only because it is in the fit.
 *
 *  GUIDED, NOT DONE FOR THEM. The dialog says what makes a good pair. Once a fit exists, a point clicked on the image is
 *  shown where the fit expects it on the map, as a ring to search near; the person still finds and clicks it.
 *
 *  WHERE TO LOOK, IN A WORKED EXAMPLE (experiment 201: *"How do we point the user to the right pairs of points is the
 *  question"*). The example names each feature to find and why; a slow pulse, about 0.4 a second and far below the three
 *  flashes a second WCAG 2.3.1 allows, marks the area on both panes, sized to the feature, so the exact click is still
 *  the learner's. It holds still for anyone whose system asks for reduced motion, and a setting turns it off. It says
 *  whether a click landed on the feature; it never fills a field.
 *
 *  The map pane fetches OpenStreetMap's tiles, which sends the area viewed to its servers, and says so. */
import L from 'leaflet';
import type {Escape} from './types.js';
import {openConfigDialog} from './config-dialog.js';
import {fitPlacement,MIN_POINTS,onGuide,type ControlPoint,type GuidePoint,type Placement,type PlacementModel} from './georeference.js';
import {readWorldFile,type WorldFile} from './map-image.js';

export interface MapImageDraft {
  label:string;
  image?:{data:string;width:number;height:number;bytes:number;sha256:string;filename?:string};
  /** A new file chosen in this dialog, kept on Apply. */
  file?:File;
  placement:'world-file'|'points';
  worldText?:string; worldName?:string;
  model:PlacementModel; points:ControlPoint[];
  opacity:number;
  /** The worked example's features to find, read only. */
  guide?:GuidePoint[];
  /** The image a worked example offers, served beside the application. */
  offered?:OfferedImage;
}
export interface OfferedImage {url:string; filename:string; credit:string}

/** The cue, on or off, for this visit: a viewer's choice, not the workflow's. */
let cuesOn=true;

const round=(v:number,d:number)=>Number.isFinite(v)?v.toFixed(d):'';

/** The fit with each point left out in turn: how far that point is from where the others put it. */
function leftOut(points:readonly ControlPoint[],model:PlacementModel):(number|null)[]{
  if(points.length<=MIN_POINTS[model])return points.map(()=>null);
  return points.map((p,i)=>{
    try{const others=fitPlacement(points.filter((_,j)=>j!==i),model),{a,b,c,d,e,f}=others.coefficients;
      const lon=a*p.pixel[0]+b*p.pixel[1]+c,lat=d*p.pixel[0]+e*p.pixel[1]+f;
      return Math.hypot((lon-p.lonlat[0])*111_320*Math.cos(p.lonlat[1]*Math.PI/180),(lat-p.lonlat[1])*110_570);}
    catch{return null;}
  });
}

export function openMapImageConfig(o:{step:string;initial:MapImageDraft;esc:Escape;
  /** Where to open the map pane where nothing is placed yet: the study area's extent, if there is one. */
  near?:[number,number,number,number];
  apply:(draft:MapImageDraft,placement:{world:WorldFile;fit?:Placement})=>void}):void{
  const {esc}=o;
  let dispose:(()=>void)|undefined;
  let view:{center:L.LatLngExpression;zoom:number}|undefined;
  let active=0,imageZoom=1;
  if(o.initial.guide?.length&&!o.initial.points.length)o.initial.points.push({id:o.initial.guide[0]!.id,pixel:[NaN,NaN],lonlat:[NaN,NaN]});
  const fitOf=(d:MapImageDraft):Placement|undefined=>{
    const ok=d.points.filter(p=>[...p.pixel,...p.lonlat].every(Number.isFinite));
    if(ok.length<MIN_POINTS[d.model])return undefined;
    try{return fitPlacement(ok,d.model);}catch{return undefined;}
  };
  openConfigDialog<MapImageDraft>({
    id:'map-image-config',widget:'Georeferenced map image',step:o.step,draft:structuredClone({...o.initial,file:undefined}),wide:true,
    sections:d=>{
      const image=d.image;
      const settings=''
        +`<div class="field"><label class="field-label" for="map-image-file">The map image</label>`
          +`<input id="map-image-file" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg">`
          +(d.offered&&!image?`<p><button type="button" class="button" id="map-image-offered">Use this example's image: ${esc(d.offered.filename)}</button></p>`
            +`<p class="muted">${esc(d.offered.credit)}</p>`:'')
          +`<p class="muted">${image?`${esc(image.filename||'The image')}: ${image.width.toLocaleString('en-US')} × ${image.height.toLocaleString('en-US')} pixels.`
            :'A scan or export of a published map, drawn as ground under everything the workflow produces.'}</p></div>`
        +`<div class="field"><label class="field-label" for="map-image-placement">How to place it</label><select id="map-image-placement">`
          +`<option value="world-file" ${d.placement==='world-file'?'selected':''}>From a world file (.jgw, .pgw, .wld)</option>`
          +`<option value="points" ${d.placement==='points'?'selected':''}>By matching points on the image and today's map</option></select></div>`
        +(d.placement==='world-file'
          ?`<div class="field"><label class="field-label" for="map-image-world">The world file</label>`
            +`<input id="map-image-world" type="file" accept=".jgw,.pgw,.wld,.tfw,text/plain">`
            +`<p class="muted">${d.worldText?`${esc(d.worldName||'Chosen')}.`:'Six lines beside the image that say where it sits; a turned one is drawn turned.'}</p></div>`
          :pointsPanel(d))
        +`<div class="field"><label class="field-label" for="map-image-opacity">How far you can read through it</label>`
          +`<input id="map-image-opacity" type="range" min="0" max="1" step="0.05" value="${d.opacity}">`
          +`<span class="muted">${Math.round(d.opacity*100)}%</span></div>`;
      // APPLY WAITS FOR A PLACEMENT, and says what it is waiting for.
      const missing=!d.image?'Choose the map image.'
        :d.placement==='world-file'?(d.worldText?'':'Choose the world file, or place the image by matching points.')
        :fitOf(d)?'':`Match at least ${MIN_POINTS[d.model]} points for this placement.`;
      return {settings,blocked:!!missing,...(missing?{message:{tone:'warning' as const,text:missing}}:{})};
    },
    beforeRedraw:()=>{dispose?.();dispose=undefined;},
    wire:(root,d,redraw)=>{
      const useFile=async(file:File)=>{
        const bitmap=await createImageBitmap(file);
        const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));
          r.onerror=()=>reject(new Error('That image could not be read.'));r.readAsDataURL(file);});
        d.image={data,width:bitmap.width,height:bitmap.height,bytes:file.size,sha256:'',filename:file.name};bitmap.close();
        d.file=file;d.points=[];active=0;
        if(d.guide?.length)d.points.push({id:d.guide[0]!.id,pixel:[NaN,NaN],lonlat:[NaN,NaN]});
        redraw();
      };
      root.querySelector<HTMLInputElement>('#map-image-file')?.addEventListener('change',e=>{
        const file=(e.target as HTMLInputElement).files?.[0];if(file)void useFile(file);});
      // THE EXAMPLE'S OWN IMAGE, fetched from beside the application: the same bytes a person would download and choose.
      root.querySelector<HTMLButtonElement>('#map-image-offered')?.addEventListener('click',async e=>{
        const button=e.target as HTMLButtonElement,offered=d.offered!;button.disabled=true;button.textContent='Fetching the image…';
        try{
          const response=await fetch(offered.url);
          if(!response.ok)throw new Error(`The example's image could not be fetched (${response.status}).`);
          const blob=await response.blob();
          await useFile(new File([blob],offered.filename,{type:blob.type||'image/jpeg'}));
        }catch(error){button.disabled=false;button.textContent=`Use this example's image: ${offered.filename}`;
          root.querySelector('.muted')?.insertAdjacentText('afterend',error instanceof Error?` ${error.message}`:'');}
      });
      root.querySelector<HTMLSelectElement>('#map-image-placement')?.addEventListener('change',e=>{
        d.placement=(e.target as HTMLSelectElement).value==='points'?'points':'world-file';redraw();});
      root.querySelector<HTMLInputElement>('#map-image-world')?.addEventListener('change',async e=>{
        const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
        d.worldText=await file.text();d.worldName=file.name;redraw();});
      root.querySelector<HTMLInputElement>('#map-image-opacity')?.addEventListener('change',e=>{
        d.opacity=Number((e.target as HTMLInputElement).value);redraw();});
      if(d.placement==='points')wirePoints(root,d,redraw);
    },
    apply:d=>{
      dispose?.();dispose=undefined;
      if(d.placement==='world-file'){
        o.apply(d,{world:readWorldFile(d.worldText!)});return;
      }
      const fit=fitOf(d)!;
      o.apply(d,{world:fit.world,fit});
    },
  },esc);

  function pointsPanel(d:MapImageDraft):string{
    if(!d.image)return '<p class="muted">Choose the map image first.</p>';
    const fit=fitOf(d),out=leftOut(d.points.filter(p=>[...p.pixel,...p.lonlat].every(Number.isFinite)),d.model);
    let k=0;
    const target=d.guide?.[active],status=(v:boolean|null)=>v===null?'not clicked yet':v?'on the feature':'not on it yet: look inside the ring';
    const found=target&&d.points[active]?onGuide(d.points[active]!,target):null;
    const worked=!d.guide?.length?'':`<div class="geo-worked" id="geo-worked">`
      +(target
        ?`<p><strong>Worked example, point ${active+1} of ${d.guide.length}: ${esc(target.id)}.</strong> ${esc(target.why)}</p>`
          +`<p id="geo-found">On the image: ${status(found!.image)}. On today's map: ${status(found!.map)}.</p>`
        :`<p><strong>Worked example:</strong> each of its ${d.guide.length} features has a row above. This point is yours to choose.</p>`)
      +`<label class="geo-cue-toggle"><input type="checkbox" id="geo-cues" ${cuesOn?'checked':''}> Show where to look (a slow pulse)</label></div>`;
    return worked+`<div class="geo-guide"><p><strong>Good pairs</strong> are things that have not moved: a church, a bridge, an old `
        +`road junction, the corner of a building still standing. Spread them across the image, corners as well as the middle. `
        +`Three fix a placement; a fourth and fifth measure it. Where the sheet prints its own grid or frame with known `
        +`coordinates, use those first.</p></div>`
      +`<div class="field"><label class="field-label" for="map-image-model">Placement</label><select id="map-image-model">`
        +`<option value="affine" ${d.model==='affine'?'selected':''}>Turned and stretched as needed (affine, 3 points or more)</option>`
        +`<option value="north-up" ${d.model==='north-up'?'selected':''}>North up, no turning (2 points or more)</option></select></div>`
      +`<div class="geo-panes"><div><p class="geo-pane-title">On the image <span id="geo-cursor" class="geo-cursor"></span></p>`
        +`<div class="geo-image-tools"><button type="button" class="button small" data-geo-zoom="1.5">Zoom in</button>`
        +`<button type="button" class="button small" data-geo-zoom="0.667">Zoom out</button></div>`
        +`<div class="geo-pane geo-image-pane" id="geo-image-pane"><div class="geo-image-frame" id="geo-image-frame">`
        +`<img id="geo-image" src="${d.image.data}" alt="The map image" draggable="false"><div id="geo-image-marks"></div></div></div></div>`
        +`<div><p class="geo-pane-title">On today's map</p><div class="geo-pane" id="geo-map-pane"></div>`
        +`<p class="muted">Tiles from OpenStreetMap: the area you view is sent to its servers.</p></div></div>`
      +`<table class="geo-points"><thead><tr><th>Clicks fill</th><th>Feature</th><th>Image x</th><th>Image y</th><th>Longitude</th><th>Latitude</th>`
        +`<th>Error, m</th><th>Left out, m</th><th></th></tr></thead><tbody>`
      +d.points.map((p,i)=>{
        const done=[...p.pixel,...p.lonlat].every(Number.isFinite);
        const r=done&&fit?fit.residuals[k]:undefined,lo=done?out[k]:null;if(done)k++;
        const doubt=lo!==null&&fit&&lo>2*Math.max(1,fit.rmsM);
        return `<tr data-geo-row="${i}"${doubt?' class="geo-doubt"':''}><td><input type="radio" name="geo-active" value="${i}" ${i===active?'checked':''} aria-label="Clicks fill point ${i+1}"></td>`
          +`<td><input data-geo-field="id" value="${esc(p.id)}" aria-label="Feature"></td>`
          +(['x','y','lon','lat'] as const).map((f,j)=>{const v=j<2?p.pixel[j]:p.lonlat[j-2];
            return `<td><input data-geo-field="${f}" inputmode="decimal" value="${Number.isFinite(v)?round(v!,j<2?1:6):''}" aria-label="${f}"></td>`;}).join('')
          +`<td>${r?round(r.metres,0):''}</td><td>${lo!==null?round(lo,0):''}${doubt?' · check this pair':''}</td>`
          +`<td><button type="button" class="button small" data-geo-remove="${i}" aria-label="Remove point ${i+1}">Remove</button></td></tr>`;
      }).join('')+`</tbody></table>`
      +`<button type="button" class="button" id="geo-add-point">+ Add a point</button>`
      +`<p class="standard-sentence" id="geo-fit">${fit?esc(fitText(fit)):`Match ${MIN_POINTS[d.model]} points or more to place the image.`}</p>`;
  }

  function fitText(fit:Placement):string{
    const worst=fit.residuals.reduce((w,r)=>r.metres>w.metres?r:w,fit.residuals[0]!);
    return `Placed from ${fit.points} points: errors ${Math.round(fit.rmsM)} m root mean square, largest ${Math.round(fit.maxM)} m at ${worst.id||'a point'}.`
      +(fit.points===MIN_POINTS[fit.model]?' With no more points than the fit needs, every error is zero and says nothing: add a point to measure it.':'');
  }

  function wirePoints(root:HTMLElement,d:MapImageDraft,redraw:()=>void){
    if(!d.image)return;
    const blank=():ControlPoint=>({id:'',pixel:[NaN,NaN],lonlat:[NaN,NaN]});
    root.querySelector('#geo-model')?.remove();
    root.querySelector<HTMLSelectElement>('#map-image-model')?.addEventListener('change',e=>{
      d.model=(e.target as HTMLSelectElement).value==='north-up'?'north-up':'affine';redraw();});
    root.querySelector('#geo-add-point')?.addEventListener('click',()=>{
      const p=blank();p.id=d.guide?.[d.points.length]?.id??'';d.points.push(p);active=d.points.length-1;redraw();});
    root.querySelectorAll<HTMLInputElement>('input[name="geo-active"]').forEach(el=>el.addEventListener('change',()=>{active=Number(el.value);if(d.guide?.length)redraw();}));
    root.querySelector<HTMLInputElement>('#geo-cues')?.addEventListener('change',e=>{cuesOn=(e.target as HTMLInputElement).checked;redraw();});
    const target=cuesOn?d.guide?.[active]:undefined;
    root.querySelectorAll<HTMLButtonElement>('[data-geo-remove]').forEach(el=>el.addEventListener('click',()=>{
      d.points.splice(Number(el.dataset.geoRemove),1);active=Math.max(0,Math.min(active,d.points.length-1));redraw();}));
    root.querySelectorAll<HTMLInputElement>('[data-geo-field]').forEach(el=>el.addEventListener('change',()=>{
      const i=Number(el.closest('tr')!.dataset.geoRow),p=d.points[i]!,v=Number(el.value);
      const f=el.dataset.geoField;
      if(f==='id')p.id=el.value.trim();else if(f==='x')p.pixel[0]=v;else if(f==='y')p.pixel[1]=v;
      else if(f==='lon')p.lonlat[0]=v;else if(f==='lat')p.lonlat[1]=v;
      // AFTER the event, not in it: a change fires as focus leaves the field, and rebuilding the rows inside that handler
      // removes the very field the browser is moving focus away from.
      setTimeout(redraw,0);}));

    // THE IMAGE PANE: a click is a pixel of the image, whatever the zoom; the pixel under the cursor is shown large.
    const img=root.querySelector<HTMLImageElement>('#geo-image')!,frame=root.querySelector<HTMLElement>('#geo-image-frame')!;
    const cursor=root.querySelector<HTMLElement>('#geo-cursor')!;
    const size=()=>{frame.style.width=`${d.image!.width*imageZoom*baseScale()}px`;};
    const pane=root.querySelector<HTMLElement>('#geo-image-pane')!;
    const baseScale=()=>Math.min(1,(pane.clientWidth||600)/d.image!.width);
    const pixelAt=(e:MouseEvent):[number,number]=>{const r=img.getBoundingClientRect();
      return [(e.clientX-r.left)*d.image!.width/r.width,(e.clientY-r.top)*d.image!.height/r.height];};
    img.addEventListener('mousemove',e=>{const [x,y]=pixelAt(e);cursor.textContent=`x ${Math.round(x)}, y ${Math.round(y)}`;});
    img.addEventListener('click',e=>{
      if(!d.points.length)d.points.push(blank());
      const p=d.points[active]!;p.pixel=pixelAt(e);
      const fit=fitOf(d);
      if(fit)expect=[fit.coefficients.a*p.pixel[0]+fit.coefficients.b*p.pixel[1]+fit.coefficients.c,
        fit.coefficients.d*p.pixel[0]+fit.coefficients.e*p.pixel[1]+fit.coefficients.f];
      redraw();});
    root.querySelectorAll<HTMLButtonElement>('[data-geo-zoom]').forEach(b=>b.addEventListener('click',()=>{
      imageZoom=Math.min(16,Math.max(1,imageZoom*Number(b.dataset.geoZoom)));size();marks();}));
    const marks=()=>{
      const box=root.querySelector<HTMLElement>('#geo-image-marks')!,scale=img.getBoundingClientRect().width/d.image!.width||baseScale()*imageZoom;
      box.innerHTML=d.points.map((p,i)=>Number.isFinite(p.pixel[0])&&Number.isFinite(p.pixel[1])
        ?`<span class="geo-mark${i===active?' is-active':''}" style="left:${p.pixel[0]*scale}px;top:${p.pixel[1]*scale}px">${i+1}</span>`:'').join('')
        +(target?`<span class="geo-cue" data-geo-cue="image" style="left:${target.pixel[0]*scale}px;top:${target.pixel[1]*scale}px;`
          +`width:${2*target.radiusPx*scale}px;height:${2*target.radiusPx*scale}px"></span>`:'');
    };
    size();img.complete?marks():img.addEventListener('load',marks,{once:true});

    // THE MAP PANE, at the last view, or the points, or the study area.
    const host=root.querySelector<HTMLElement>('#geo-map-pane')!;
    const map=L.map(host,{zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    const onMap=(p:ControlPoint)=>Number.isFinite(p.lonlat[0])&&Number.isFinite(p.lonlat[1]);
    const placed=d.points.filter(onMap);
    if(view)map.setView(view.center,view.zoom);
    else if(placed.length>1)map.fitBounds(placed.map(p=>[p.lonlat[1],p.lonlat[0]] as [number,number]),{padding:[30,30]});
    else if(placed.length===1)map.setView([placed[0]!.lonlat[1],placed[0]!.lonlat[0]],16);
    else if(o.near)map.fitBounds([[o.near[1],o.near[0]],[o.near[3],o.near[2]]]);
    else map.setView([20,0],2);
    d.points.forEach((p,i)=>{if(onMap(p))L.marker([p.lonlat[1],p.lonlat[0]],{interactive:false,
      icon:L.divIcon({className:`geo-mark${i===active?' is-active':''}`,html:String(i+1),iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map);});
    if(target)L.circle([target.lonlat[1],target.lonlat[0]],{radius:target.radiusM,color:'#b6377a',weight:3,fill:false,
      interactive:false,className:'geo-cue-map'}).addTo(map);
    if(expect)L.circleMarker([expect[1],expect[0]],{radius:18,color:'#b6377a',weight:3,fill:false,interactive:false})
      .bindTooltip('Where the fit expects this point: find it near here').addTo(map);
    map.on('click',e=>{
      if(!d.points.length)d.points.push(blank());
      const p=d.points[active]!;p.lonlat=[e.latlng.lng,e.latlng.lat];expect=undefined;
      view={center:map.getCenter(),zoom:map.getZoom()};redraw();});
    map.on('moveend',()=>{view={center:map.getCenter(),zoom:map.getZoom()};});
    dispose=()=>{map.off();map.eachLayer(l=>{if(!(l instanceof L.Renderer))map.removeLayer(l);});map.remove();};
  }
}
let expect:[number,number]|undefined;
