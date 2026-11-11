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
import {errorHistory,expectedFromOthers,fitPlacement,fitShape,groundMetres,MIN_POINTS,onGuide,type ControlPoint,type GuidePoint,type Placement,type PlacementModel} from './georeference.js';
import {readWorldFile,turnedCorners,type WorldFile} from './map-image.js';
import {TurnedImage} from './turned-image.js';

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
export interface OfferedImage {url:string; filename:string; credit:string; width?:number; height?:number}

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
  let active=0,imageZoom=1,previewing=false,previewOpacity=0.6;
  // WHERE THE SHEET PANE IS LOOKING, as fractions of the image, kept across zooms and redraws (the practitioner,
  // 2026-11-10: "once zoomed in it's hard to figure out where the glowing circle is").
  let look:{fx:number;fy:number}|undefined;
  /** The guide's positions are pixels of the example's own image: on any other image they point at nothing. */
  const guideFits=(d:MapImageDraft)=>!!d.guide?.length&&!!d.image
    &&(!d.offered?.width||(d.image.width===d.offered.width&&d.image.height===d.offered.height));
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
    const fits=guideFits(d),target=fits?d.guide?.[active]:undefined,status=(v:boolean|null)=>v===null?'not clicked yet':v?'on the feature':'not on it yet: look inside the ring';
    const found=target&&d.points[active]?onGuide(d.points[active]!,target):null;
    const worked=!d.guide?.length?'':d.image&&!fits
      ?`<div class="geo-worked" id="geo-worked"><p><strong>Worked example:</strong> its features to find are on its own image, `
        +`${esc(d.offered?.filename??'the example\'s image')}${d.offered?.width?` (${d.offered.width.toLocaleString('en-US')} × ${d.offered.height!.toLocaleString('en-US')} pixels)`:''}. `
        +`This image is different, so no cue is shown: find your own pairs.</p></div>`
      :`<div class="geo-worked" id="geo-worked">`
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
        +`<div class="geo-image-wrap"><span class="geo-crosshair" aria-hidden="true"></span>`
        +`<div class="geo-pane geo-image-pane" id="geo-image-pane"><div class="geo-image-frame" id="geo-image-frame">`
        +`<img id="geo-image" src="${d.image.data}" alt="The map image" draggable="false"><div id="geo-image-marks"></div></div></div></div></div>`
        +`<div><p class="geo-pane-title">On today's map</p>`
        +`<p class="geo-map-how" id="geo-map-how">Drag to move the map. <strong>Shift + click</strong> to place the point. `
        +`<strong>Press and hold</strong> a numbered point, then drag, to move it.</p><div class="geo-pane" id="geo-map-pane"></div>`
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
      +`<p class="standard-sentence" id="geo-fit">${fit?esc(fitText(fit)):`Match ${MIN_POINTS[d.model]} points or more to place the image.`}</p>`
      +liveCheck(d,fit,out)
      +`<p><button type="button" class="button" id="geo-preview-toggle" ${fit?'':'disabled'} aria-expanded="${previewing&&!!fit}">`
        +`${previewing&&fit?'Close the preview':'Preview on today’s map'}</button>`
        +(fit?'':` <span class="muted">Once ${MIN_POINTS[d.model]} pairs place it.</span>`)+`</p>`
      +(previewing&&fit?`<div class="geo-preview-block"><p class="geo-pane-title">The image as placed, over today's map</p>`
        +`<div class="field"><label class="field-label" for="geo-preview-opacity">See through the image</label>`
        +`<input id="geo-preview-opacity" type="range" min="0" max="1" step="0.05" value="${previewOpacity}"> `
        +`<span class="muted" id="geo-preview-opacity-value">${Math.round(previewOpacity*100)}% opaque</span></div>`
        +`<div class="geo-pane geo-preview" id="geo-preview"></div>`
        +`<p class="muted">Each pair is drawn twice: a ring where the placement puts your click on the image, a dot where you clicked `
        +`today's map, joined by its error. Streets and buildings that line up across the image are the check that matters. `
        +`Tiles from OpenStreetMap: the area you view is sent to its servers.</p></div>`:'');
  }

  /** THE LIVE CHECK (experiment 201): the pair just made against the others, what the fit implies, the error as pairs
   *  were added, and, as the cursor moves over the map, how far it is from where the other pairs expect the feature --
   *  with the instruction to find the feature first, so the number checks a click and does not replace looking. */
  function liveCheck(d:MapImageDraft,fit:Placement|undefined,out:(number|null)[]):string{
    const done=(p:ControlPoint)=>[...p.pixel,...p.lonlat].every(Number.isFinite);
    const complete=d.points.filter(done),min=MIN_POINTS[d.model],p=d.points[active];
    const name=p?.id?`“${esc(p.id)}”`:`pair ${active+1}`;
    let pair:string;
    if(!p)pair='Add a pair to begin.';
    else if(!p.pixel.every(Number.isFinite))pair=`For ${name}: click the feature on the image, then the same feature on the map.`;
    else if(!p.lonlat.every(Number.isFinite))pair=`For ${name}: now find the same feature on the map and click it.`;
    else if(complete.length<=min)pair=`${name[0]!.toUpperCase()+name.slice(1)} is pair ${complete.indexOf(p)+1} of the ${min} the fit needs. `
      +`It can be checked against the others from pair ${min+1}.`;
    else{
      const lo=out[complete.indexOf(p)],typical=fit?Math.max(1,fit.rmsM):1;
      pair=lo===null||lo===undefined?`${name} cannot be checked yet.`
        :`${name[0]!.toUpperCase()+name.slice(1)} is ${Math.round(lo)} m from where your other ${complete.length-1} pairs put it.`
          +(lo>2*typical?' That is more than twice their typical error: look again at both halves.':'');
    }
    const lat=complete.length?complete.reduce((s,c)=>s+c.lonlat[1],0)/complete.length:0;
    const shape=fit?fitShape(fit,lat):undefined;
    const turn=shape?Math.abs(shape.turnDeg)<0.05?'not turned':`turned ${Math.abs(shape.turnDeg).toFixed(1)}° ${shape.turnDeg>0?'anticlockwise':'clockwise'}`:'';
    const history=errorHistory(complete,d.model);
    return `<div class="geo-live" id="geo-live" aria-live="polite">`
      +`<p id="geo-live-pair"><strong>This pair:</strong> ${pair}</p>`
      +(shape?`<p id="geo-live-shape"><strong>What the fit implies:</strong> ${shape.acrossM.toFixed(2)} m a pixel across, `
        +`${shape.downM.toFixed(2)} m down, ${turn}. Check it against the sheet’s scale bar; a sheet drawn north up should be turned little.</p>`:'')
      +(history.length?`<p id="geo-live-history"><strong>Overall error as pairs were added:</strong> `
        +history.map(h=>`${h.pairs} pairs ${Math.round(h.rmsM)} m`).join(' · ')+`. When it stops changing, more pairs add little.</p>`:'')
      +`<p class="geo-look-first"><strong>Find the feature on the map by looking first.</strong> The distance below checks where `
        +`your cursor is against your other pairs; it does not show where the feature is, and it is only as good as they are.</p>`
      +`<p id="geo-hover" class="muted">${fit&&p?.pixel.every(Number.isFinite)?'Move over the map to see the distance.':'Shown once the image half is clicked and other pairs can place it.'}</p>`
      +`</div>`;
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
    const target=cuesOn&&guideFits(d)?d.guide?.[active]:undefined;
    root.querySelectorAll<HTMLButtonElement>('[data-geo-remove]').forEach(el=>el.addEventListener('click',()=>{
      d.points.splice(Number(el.dataset.geoRemove),1);active=Math.max(0,Math.min(active,d.points.length-1));redraw();}));
    root.querySelectorAll<HTMLInputElement>('[data-geo-field]').forEach(el=>el.addEventListener('change',()=>{
      // An EMPTY field is not yet entered, not zero: Number('') is 0, which put a point at the image's top edge or on the
      // equator when a field was cleared or replaced before it was read (WebKit CI, 0.83.0).
      const i=Number(el.closest('tr')!.dataset.geoRow),p=d.points[i]!,v=el.value.trim()===''?NaN:Number(el.value);
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
    // ZOOM ABOUT THE CROSSHAIR: what is under the centre of the pane stays there.
    const centre=()=>({fx:(pane.scrollLeft+pane.clientWidth/2)/(frame.offsetWidth||1),fy:(pane.scrollTop+pane.clientHeight/2)/(frame.offsetHeight||1)});
    const lookAt=(at:{fx:number;fy:number})=>{pane.scrollLeft=at.fx*frame.offsetWidth-pane.clientWidth/2;pane.scrollTop=at.fy*frame.offsetHeight-pane.clientHeight/2;};
    pane.addEventListener('scroll',()=>{look=centre();});
    root.querySelectorAll<HTMLButtonElement>('[data-geo-zoom]').forEach(b=>b.addEventListener('click',()=>{
      const at=centre();imageZoom=Math.min(16,Math.max(1,imageZoom*Number(b.dataset.geoZoom)));size();marks();lookAt(at);look=at;}));
    const marks=()=>{
      const box=root.querySelector<HTMLElement>('#geo-image-marks')!,scale=img.getBoundingClientRect().width/d.image!.width||baseScale()*imageZoom;
      box.innerHTML=d.points.map((p,i)=>Number.isFinite(p.pixel[0])&&Number.isFinite(p.pixel[1])
        ?`<span class="geo-mark${i===active?' is-active':''}" style="left:${p.pixel[0]*scale}px;top:${p.pixel[1]*scale}px">${i+1}</span>`:'').join('')
        +(target?`<span class="geo-cue" data-geo-cue="image" style="left:${target.pixel[0]*scale}px;top:${target.pixel[1]*scale}px;`
          +`width:${2*target.radiusPx*scale}px;height:${2*target.radiusPx*scale}px"></span>`:'');
    };
    const settle=()=>{marks();if(look)lookAt(look);};
    size();img.complete?settle():img.addEventListener('load',settle,{once:true});

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
    // A POINT IS MOVED BY PRESSING AND HOLDING IT, then dragging (the practitioner, 2026-11-11): a quick drag pans the map
    // instead, so a point cannot be nudged by moving the map across it. While it moves, its coordinates are shown.
    const HOLD_MS=300,how=root.querySelector<HTMLElement>('#geo-map-how');
    d.points.forEach((p,i)=>{if(!onMap(p))return;
      const marker=L.marker([p.lonlat[1],p.lonlat[0]],{draggable:true,autoPan:true,keyboard:false,
        icon:L.divIcon({className:`geo-mark${i===active?' is-active':''}`,html:String(i+1),iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map);
      let pressed=0,held=false,timer:number|undefined;const from=marker.getLatLng();
      const element=marker.getElement();
      element?.setAttribute('data-geo-point',String(i));
      element?.addEventListener('pointerdown',()=>{pressed=Date.now();held=false;
        timer=window.setTimeout(()=>{held=true;element.classList.add('is-lifted');},HOLD_MS);});
      const release=()=>{window.clearTimeout(timer);element?.classList.remove('is-lifted');};
      element?.addEventListener('pointerup',release);
      marker.on('dragstart',()=>{held=held||Date.now()-pressed>=HOLD_MS;});
      marker.on('drag',()=>{if(!held){marker.setLatLng(from);return;}
        const at=marker.getLatLng();if(how)how.textContent=`Point ${i+1} at ${at.lng.toFixed(6)}, ${at.lat.toFixed(6)}. Release to place it.`;});
      marker.on('dragend',()=>{release();
        if(!held){marker.setLatLng(from);return;}
        const at=marker.getLatLng();d.points[i]!.lonlat=[at.lng,at.lat];active=i;expect=undefined;
        view={center:map.getCenter(),zoom:map.getZoom()};redraw();});
    });
    if(target)L.circle([target.lonlat[1],target.lonlat[0]],{radius:target.radiusM,color:'#b6377a',weight:3,fill:false,
      interactive:false,className:'geo-cue-map'}).addTo(map);
    if(expect)L.circleMarker([expect[1],expect[0]],{radius:18,color:'#b6377a',weight:3,fill:false,interactive:false})
      .bindTooltip('Where the fit expects this point: find it near here').addTo(map);
    // SHIFT + CLICK PLACES; the hand only moves the map (the practitioner, 2026-11-11: "the pointer on the right map to place
    // the point is a hand, not a precise tool"). Holding Shift turns the pointer into a crosshair over the map.
    map.on('click',e=>{
      if(!(e.originalEvent as MouseEvent).shiftKey){
        if(how)how.textContent=`Hold Shift and click to place point ${active+1}. Drag to move the map.`;return;}
      if(!d.points.length)d.points.push(blank());
      const p=d.points[active]!;p.lonlat=[e.latlng.lng,e.latlng.lat];expect=undefined;
      view={center:map.getCenter(),zoom:map.getZoom()};redraw();});
    const placing=(on:boolean)=>host.classList.toggle('geo-placing',on);
    const keys=(e:KeyboardEvent)=>placing(e.shiftKey);
    document.addEventListener('keydown',keys);document.addEventListener('keyup',keys);
    map.on('mousemove',e=>placing((e.originalEvent as MouseEvent).shiftKey));
    map.on('mouseout',()=>placing(false));
    map.on('moveend',()=>{view={center:map.getCenter(),zoom:map.getZoom()};});
    const hover=root.querySelector<HTMLElement>('#geo-hover');
    const current=d.points[active],wanted=current?expectedFromOthers(d.points,active,d.model,current.pixel):null;
    if(hover&&wanted)map.on('mousemove',e=>{
      hover.textContent=`The cursor is ${Math.round(groundMetres([e.latlng.lng,e.latlng.lat],wanted))} m from where your other pairs `
        +`expect ${current!.id?`“${current!.id}”`:'this point'}.`;});
    // THE PREVIEW: the image through the current placement, over today's map, so it can be compared by eye.
    root.querySelector('#geo-preview-toggle')?.addEventListener('click',()=>{previewing=!previewing;redraw();});
    let preview:L.Map|undefined;
    const previewHost=root.querySelector<HTMLElement>('#geo-preview'),fitNow=fitOf(d);
    if(previewHost&&fitNow&&d.image){
      preview=L.map(previewHost,{zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(preview);
      const corners=turnedCorners(fitNow.world,d.image.width,d.image.height);
      const sheet=new TurnedImage(d.image.data,corners,d.image.width,d.image.height,previewOpacity).addTo(preview);
      const {a,b,c,d:dd,e,f}=fitNow.coefficients;
      d.points.filter(p=>[...p.pixel,...p.lonlat].every(Number.isFinite)).forEach(p=>{
        const placed:[number,number]=[dd*p.pixel[0]+e*p.pixel[1]+f,a*p.pixel[0]+b*p.pixel[1]+c],clicked:[number,number]=[p.lonlat[1],p.lonlat[0]];
        L.polyline([placed,clicked],{color:'#b6377a',weight:3,interactive:false,className:'geo-preview-error'}).addTo(preview!);
        L.circleMarker(placed,{radius:7,color:'#261156',weight:3,fill:false,interactive:false,className:'geo-preview-placed'}).addTo(preview!);
        L.circleMarker(clicked,{radius:4,color:'#b6377a',weight:2,fillColor:'#b6377a',fillOpacity:1,interactive:false,className:'geo-preview-clicked'})
          .bindTooltip(p.id||'A pair').addTo(preview!);
      });
      const lats=corners.map(x=>x[1]),lons=corners.map(x=>x[0]);
      preview.fitBounds([[Math.min(...lats),Math.min(...lons)],[Math.max(...lats),Math.max(...lons)]]);
      root.querySelector<HTMLInputElement>('#geo-preview-opacity')?.addEventListener('input',ev=>{
        previewOpacity=Number((ev.target as HTMLInputElement).value);sheet.setOpacity(previewOpacity);
        root.querySelector('#geo-preview-opacity-value')!.textContent=`${Math.round(previewOpacity*100)}% opaque`;});
    }
    dispose=()=>{
      document.removeEventListener('keydown',keys);document.removeEventListener('keyup',keys);
      if(preview){preview.off();preview.eachLayer(l=>{if(!(l instanceof L.Renderer))preview!.removeLayer(l);});preview.remove();}
      map.off();map.eachLayer(l=>{if(!(l instanceof L.Renderer))map.removeLayer(l);});map.remove();};
  }
}
let expect:[number,number]|undefined;
