import type {WorkflowNode,Escape} from './types.js';
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
function placedCard(n:WorkflowNode<'map_image_input'>,esc:Escape):string{
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
    +`<p class="muted">Drawn north-up, as published. Nothing is rotated or reprojected.</p></div>`;
}
