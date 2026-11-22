import type {WorkflowNode,Escape,Workflow} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openMapImageConfig} from './georeference-ui.js';
import {boundsFromWorldFile} from './map-image.js';
import {boundsOf} from './health-facilities.js';
import {previewArea} from './raster-preview.js';
import {contentHash} from './project-files.js';
import {payloadDigest} from './project.js';
import {errorMessage} from './guards.js';
import {DEFAULT_OPACITY,groundResolution} from './map-image.js';

/** THE PANEL THIS WIDGET NEVER HAD.
 *
 *  The practitioner, 2026-10-29: *"I looked at the Inspector panel of the georeferenced image
 *  input and it does not even have a component to upload the georeferenced image."*
 *
 *  It did not. `map_image_input` was addable from the palette, its parameters were declared, the
 *  map drew what it carried and `mapImage` even refused with *"This step has no image yet. Choose
 *  a map image and its world file"* -- a message naming two controls that did not exist. The
 *  image reached the worked example because the example's own file carried it, which is exactly
 *  the gap `polygon_input` had until 2026-10-28: addable is not configurable.
 *
 *  Steps, on the shape the polygon layer now uses, and nothing is read until Apply. */
export function mapImageInspector(n:WorkflowNode<'map_image_input'>,esc:Escape):string{
  const p=n.params;
  const placed=typeof p.data==='string'&&p.data.startsWith('data:');
  const opacity=typeof p.opacity==='number'?p.opacity:DEFAULT_OPACITY;
  const step=(index:number,title:string,inner:string)=>
    `<div class="field-step"><span class="inspector-section">${index} · ${esc(title)}</span>`
    +inner+`</div>`;

  return `<label class="field-label" for="map-image-label">Name</label>`
    +`<input id="map-image-label" maxlength="100" value="${esc(p.label||'')}">`
    +step(1,'Choose the map image',
      `<input id="map-image-file" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg">`
      +`<small>A scan or export of a published map. It is drawn as ground, under everything your `
      +`workflow produces.</small>`
      +`<p id="map-image-pending" class="muted"></p>`)
    +step(2,'Choose its world file',
      `<input id="map-image-world" type="file" accept=".jgw,.pgw,.wld,.tfw,text/plain">`
      +`<small>The six-line file beside the image — .jgw for a JPEG, .pgw for a PNG. It says `
      +`where the image sits. A rotated one is refused rather than drawn in the wrong place.</small>`
      +`<p id="map-image-world-pending" class="muted"></p>`)
    +step(3,'How far you can read through it',
      `<input id="map-image-opacity" type="range" min="0" max="1" step="0.05" `
      +`value="${opacity}"><span class="muted" id="map-image-opacity-value">`
      +`${Math.round(opacity*100)}%</span>`
      +`<small>Ground a reader wants to read through is the ordinary case.</small>`)
    +`<div class="field-step"><button id="map-image-apply" class="button primary" disabled>`
      +`Place the image</button>`
      +`<p id="map-image-apply-note" class="muted">Choose an image and its world file.</p></div>`
    +placedCard(n,esc);
}

/** What was placed, in the facts a figure can state without decoding the image again. */
export function placedCard(n:WorkflowNode<'map_image_input'>,esc:Escape):string{
  const p=n.params;
  if(typeof p.data!=='string'||!p.data.startsWith('data:'))return '';
  const [west,south,east,north]=p.bounds??[0,0,0,0];
  const metres=Number.isFinite(west)&&east>west&&north>south
    ?groundResolution([west,south,east,north],p.image.width,p.image.height):undefined;
  return `<div class="source-card"><span class="inspector-section">What is placed</span>`
    +`<h3>${p.image.width.toLocaleString()} × ${p.image.height.toLocaleString()} pixels</h3>`
    +`<p>${esc([west,south,east,north].map(c=>c.toFixed(4)).join(', '))}`
    +`${metres?` · about ${metres.toFixed(1)} m per pixel`:''}.</p>`
    +(p.image.filename?`<p class="muted">From ${esc(p.image.filename)}`
      +`${p.image.sha256?` · sha256 ${esc(p.image.sha256.slice(0,12))}…`:''}`
      +` · ${(p.image.bytes/1e6).toFixed(1)} MB</p>`:'')
    +`<p class="muted">${p.placement==='points'
      ?`Placed by ${p.controlPoints?.length??0} matched points, ${p.placementModel==='north-up'?'north up':'turned and stretched as the points need'}.`
      :p.world&&(p.world.xSkew||p.world.ySkew)?'Placed by its world file, turned as it says.':'Drawn north-up, as its world file places it.'} Nothing is reprojected.</p></div>`;
}

/** WHAT GEOREFERENCED MAP IMAGE READS OF THE APPLICATION, through its kit (2026-11-22, the Inspector move's batch D). */
export interface MapImageKit extends StepKit {
  keepDataset:(digest:string,payload:unknown)=>Promise<boolean>;
  /** A change that must reach storage. */
  persist:(edit:(w:Workflow)=>void)=>void;
  toast:(text:string,tone?:'failure')=>void;
}
/** GEOREFERENCED MAP IMAGE'S STANDARD INSPECTOR and its Configure…, moved out of app.ts as they were. */
export const mapImageStep:OwnInspector<'map_image_input'>={
  markup:(n,k)=>{const kit=k as MapImageKit;
    const esc=kit.esc;let content='';
    const p=n.params,placed=typeof p.data==='string'&&p.data.startsWith('data:');
    content+=kit.section('Name',kit.name('map-image-label',p.label||'Georeferenced map image'));
    content+=kit.section('Inputs',kit.inputs(n));
    content+=kit.section('Settings',`<p class="standard-sentence">${esc(placed
      ?`Draws ${p.image.filename||'the image'} as ground, ${p.placement==='points'?`placed by ${p.controlPoints?.length??0} matched points`:'placed by its world file'}, ${Math.round((p.opacity??0.85)*100)}% opaque.`
      :'Choose a map image and how to place it, in Configure\u2026')
      +(p.guide?.length?` A worked example names ${p.guide.length} features to find, in Configure\u2026`:'')}</p>`
      +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button></div>');
    content+=kit.section('Result',placed?placedCard(n,esc):'<p class="standard-result">Nothing placed yet.</p>');
    return content;
  },
  wire:(n,k,root)=>{const kit=k as MapImageKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
    const esc=kit.esc,workflow=kit.workflow(),p=(workflow.nodes.find(x=>x.id===n.id) as WorkflowNode<'map_image_input'>).params,placed=typeof p.data==='string'&&p.data.startsWith('data:');
    const area=workflow.nodes.find(x=>x.type==='study_area');
    let near:[number,number,number,number]|undefined;
    try{if(area){const b=previewArea(workflow,area.id).boundary;near=[...boundsOf(b)] as [number,number,number,number];}}catch{near=undefined;}
    openMapImageConfig({step:p.label||'Georeferenced map image',esc,near,
      initial:{label:p.label,...(placed?{image:{data:p.data!,...p.image}}:{}),placement:p.placement??'world-file',
        model:p.placementModel??'affine',points:structuredClone(p.controlPoints??[]),opacity:p.opacity??0.85,
        ...(p.tagsWorld&&p.tagsSaid?{tags:{world:p.tagsWorld,said:p.tagsSaid,...(p.tagsGeographic?{geographic:p.tagsGeographic}:{}),...(p.tagsDatum?{datum:p.tagsDatum}:{})}}:{}),
        ...(p.guide?.length?{guide:p.guide}:{}),...(p.offered?{offered:p.offered}:{})},
      apply:(d,{world,fit})=>void (async()=>{
        try{
          let image=d.image!,digest=p.dataRef,data=d.image!.data;
          if(d.file){
            const bytes=new Uint8Array(await d.file.arrayBuffer());
            image={...image,sha256:await contentHash(bytes),bytes:bytes.length};
            digest=await payloadDigest(data);
            if(!await kit.keepDataset(digest,data))throw new Error('This image could not be kept on this device, so it was not placed. A smaller export of the same plate will fit.');
          }
          const bounds=boundsFromWorldFile(world,image.width,image.height);
          kit.persist(w=>{const t=w.nodes.find(x=>x.id===n.id) as WorkflowNode<'map_image_input'>;
            t.params.data=data;if(digest)t.params.dataRef=digest;
            t.params.image={width:image.width,height:image.height,bytes:image.bytes,sha256:image.sha256,...(image.filename?{filename:image.filename}:{})};
            t.params.bounds=bounds;t.params.world=world;t.params.placement=d.placement;t.params.opacity=d.opacity;
            if(d.placement==='points'){t.params.controlPoints=d.points.filter(c=>[...c.pixel,...c.lonlat].every(Number.isFinite));t.params.placementModel=d.model;}
            else{delete t.params.controlPoints;delete t.params.placementModel;}
            if(d.tags){t.params.tagsWorld=d.tags.world;t.params.tagsSaid=d.tags.said;
              if(d.tags.geographic)t.params.tagsGeographic=d.tags.geographic;if(d.tags.datum)t.params.tagsDatum=d.tags.datum;}
            else{delete t.params.tagsWorld;delete t.params.tagsSaid;delete t.params.tagsGeographic;delete t.params.tagsDatum;}
          });
          if(fit)kit.toast(`Placed from ${fit.points} points: errors ${Math.round(fit.rmsM)} m root mean square. Run the workflow to draw it.`);
        }catch(error){kit.toast(errorMessage(error),'failure');}
      })()});
    });
  },
};
