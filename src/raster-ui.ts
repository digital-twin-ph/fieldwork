import {RASTER_SOURCE_FIELDS,validateRasterProvenance,WORLDPOP_BOTSWANA,WORLDPOP_BOTSWANA_FILENAME} from './raster-provenance.js';
import type {RasterProvenance} from './raster-provenance.js';
import type {Boundary,Position} from './types.js';
import type {RasterAsset,RasterGrid,RasterMetadata} from './raster.js';
import {rasterImage} from './raster-image.js';
export {rasterImage} from './raster-image.js';
import {inspectRaster,rasterWindow,readRasterWindow,encodeRaster} from './raster.js';
import {contentHash} from './project-files.js';
import {isNetcdf,inspectNetcdf,readNetcdfWindow,type NetcdfGrid} from './netcdf-raster.js';
import {storePDFs} from './evidence-storage.js';

export function openRasterEditor(boundary:Boundary,onSave:(asset:RasterAsset)=>boolean,existing?:RasterAsset,
  /** WHERE TO GET A FILE, above the chooser (2026-11-10): the WorldPop population raster for the study area's country,
   *  moved here from the Inspector, which kept only Name, Inputs, Settings and Result. `wire` connects its controls. */
  source?:{html:string;wire:(root:HTMLElement)=>void}):void{
  const dialog=document.createElement('dialog');dialog.id='raster-dialog';dialog.setAttribute('aria-labelledby','raster-title');
  dialog.innerHTML='<h2 id="raster-title">Prepare raster input</h2><p>Select a local GeoTIFF or NetCDF-4 grid. Only a native-resolution window around the connected study area will be saved. Clip raster applies the polygon mask separately.</p><label for="raster-file" class="field-label">GeoTIFF or NetCDF file</label><input id="raster-file" type="file" accept=".tif,.tiff,image/tiff,.nc,.nc4"><div id="raster-variable-row" hidden><label for="raster-variable" class="field-label">Variable</label><select id="raster-variable"></select></div><details id="raster-url-source"><summary>Or a GeoTIFF at a URL</summary><label for="raster-url" class="field-label">URL of a GeoTIFF</label><input id="raster-url" type="url" placeholder="https://"><button type="button" id="raster-url-read" class="button">Read</button><p class="muted">Only the window around the study area is read, by range: the file is never downloaded whole.</p><div id="raster-url-keep"></div></details><p id="raster-status" role="status"></p><details><summary>Extracted GeoTIFF metadata (from the file)</summary><pre id="raster-metadata"></pre></details><p>A NetCDF file is read in parts on this device: a regular latitude-longitude grid, one variable, its values at the grid nodes. A GeoTIFF: one band, north-up WGS84 / EPSG:4326, with cells or with values at grid nodes (a node grid is read as the cells around its nodes, and says so). No resampling or reprojection. Pixel values are not automatically interpreted as population totals.</p><p id="raster-error" role="alert" hidden></p><div class="package-actions"><button id="raster-cancel" class="button">Cancel</button><button id="raster-save" class="button primary" disabled>Save raster window</button></div>';
  const fields=document.createElement('fieldset');fields.id='raster-source-fields';fields.innerHTML='<legend>Source metadata and citation (entered separately)</legend><p>Entered by the workflow author; separate from extracted GeoTIFF metadata. These details follow the raster through clipping and export.</p><button type="button" id="raster-worldpop" class="button" hidden>Use Botswana WorldPop source details</button>'+Object.entries(RASTER_SOURCE_FIELDS).map(([key,label])=>'<label class="field-label" for="raster-source-'+key+'">'+label+'</label><textarea id="raster-source-'+key+'" data-source-field="'+key+'" rows="'+(['citation','notes'].includes(key)?3:1)+'" maxlength="'+(['citation','notes'].includes(key)?4000:2000)+'"></textarea>').join('');dialog.querySelector('#raster-error')!.before(fields);
  const controls=[...fields.querySelectorAll<HTMLTextAreaElement>('[data-source-field]')],fill=(values:RasterProvenance)=>controls.forEach(el=>el.value=values[el.dataset.sourceField as keyof RasterProvenance]||''),collect=():RasterProvenance=>Object.fromEntries(controls.map(el=>[el.dataset.sourceField!,el.value.trim()]).filter(([,v])=>v));fill(existing?.provenance||{});
  const preset=fields.querySelector<HTMLButtonElement>('#raster-worldpop')!;preset.hidden=existing?.source.filename!==WORLDPOP_BOTSWANA_FILENAME;preset.onclick=()=>fill(WORLDPOP_BOTSWANA);
  if(source){const block=document.createElement('section');block.id='raster-population';block.innerHTML=source.html;
    dialog.querySelector('#raster-title')!.nextElementSibling!.after(block);source.wire(block);}
  document.body.append(dialog);const fileInput=dialog.querySelector<HTMLInputElement>('#raster-file')!,save=dialog.querySelector<HTMLButtonElement>('#raster-save')!,cancel=dialog.querySelector<HTMLButtonElement>('#raster-cancel')!,error=dialog.querySelector<HTMLElement>('#raster-error')!,status=dialog.querySelector<HTMLElement>('#raster-status')!,preview=dialog.querySelector<HTMLElement>('#raster-metadata')!;
  let netcdf:NetcdfGrid|undefined,file:File|undefined,url:string|undefined,urlBytes:number|undefined,metadata:RasterMetadata|undefined,busy=false,serial=0;
  // A GEOTIFF AT A URL (experiment 198): read in parts, and offered whole as a link, so it can be kept on this laptop and
  // chosen above, which also reads it in parts.
  const urlInput=dialog.querySelector<HTMLInputElement>('#raster-url')!,urlKeep=dialog.querySelector<HTMLElement>('#raster-url-keep')!;
  const variableRow=dialog.querySelector<HTMLElement>('#raster-variable-row')!,variableSelect=dialog.querySelector<HTMLSelectElement>('#raster-variable')!;
  const nameOf=(href:string)=>{try{return decodeURIComponent(new URL(href).pathname.split('/').pop()||href);}catch{return href;}};
  const paddingLabel=document.createElement('label');paddingLabel.className='field-label';paddingLabel.textContent='Extra source coverage (when preparing a file)';
  const padding=document.createElement('select');padding.id='raster-padding';padding.innerHTML='<option value="0">None</option><option value="1">One pixel around Study area (allows a small clipping margin)</option>';paddingLabel.append(padding);fileInput.after(paddingLabel);padding.disabled=!!existing;
  padding.onchange=()=>{if((!file&&!url)||!metadata)return;try{const window=rasterWindow(metadata,boundary,Number(padding.value));preview.textContent=JSON.stringify({sourceFile:file?file.name:url,sourceBytes:file?file.size:urlBytes??null,source:metadata,retainedWindow:window,extraPixels:Number(padding.value)},null,2);status.textContent=`Retain ${window[2]-window[0]} × ${window[3]-window[1]} cells, including selected source padding.`;error.hidden=true;save.disabled=false;}catch(e){save.disabled=true;fail(e);}};
  if(existing){save.disabled=false;save.textContent='Save raster and source metadata';status.textContent='Edit source metadata without selecting the original file again.';preview.textContent=JSON.stringify(existing.source.metadata,null,2);}
  const fail=(e:unknown)=>{error.textContent=e instanceof Error?e.message:String(e);error.hidden=false;error.scrollIntoView({block:'nearest'});};
  cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>{serial++;file=undefined;metadata=undefined;dialog.remove();};
  dialog.querySelector<HTMLButtonElement>('#raster-url-read')!.onclick=async()=>{
    const request=++serial,href=urlInput.value.trim();file=undefined;netcdf=undefined;variableRow.hidden=true;fileInput.value='';metadata=undefined;save.disabled=true;error.hidden=true;urlKeep.innerHTML='';
    try{const parsed=new URL(href);if(!/^https?:$/.test(parsed.protocol))throw new Error('Give an http or https address.');}catch(e){fail(e instanceof Error&&e.message.startsWith('Give')?e:new Error('That is not a web address.'));return;}
    status.textContent='Reading the GeoTIFF header…';
    try{
      const source=await inspectRaster(href);if(request!==serial)return;
      // THE SIZE, SAID BEFORE ANYONE DOWNLOADS IT. A host that does not say is said not to.
      urlBytes=undefined;try{const head=await fetch(href,{method:'HEAD'});const n=Number(head.headers.get('content-length'));if(head.ok&&Number.isFinite(n)&&n>0)urlBytes=n;}catch{/* unstated */}
      url=href;metadata=source;padding.disabled=false;
      const window=rasterWindow(source,boundary,Number(padding.value));
      preview.textContent=JSON.stringify({sourceURL:href,sourceBytes:urlBytes??null,source,retainedWindow:window,retainedCells:(window[2]-window[0])*(window[3]-window[1])},null,2);
      status.textContent=`Source: ${source.width} × ${source.height}${source.sourceRegistration?', values at grid nodes, read as the cells around them':''}. Retain ${window[2]-window[0]} × ${window[3]-window[1]} cells.`;
      const a=document.createElement('a');a.className='button';a.href=href;a.download=nameOf(href);a.target='_blank';a.rel='noopener noreferrer';
      a.textContent=`\u2193 Download the whole file · ${nameOf(href)}${urlBytes?` · ${(urlBytes/1e6).toFixed(1)} MB`:''}`;
      const said=document.createElement('p');said.className='muted';
      said.textContent=`From ${new URL(href).hostname}${urlBytes?'':', size not stated by the host'}. Keep it on this laptop and choose it above to work without the connection; it is read in parts there too.`;
      urlKeep.replaceChildren(a,said);save.disabled=false;
    }catch(e){if(request===serial){status.textContent='Raster cannot be prepared.';url=undefined;fail(e);}}
  };
  const shown=(source:RasterMetadata,picked:File)=>{const window=rasterWindow(source,boundary,Number(padding.value));preview.textContent=JSON.stringify({sourceFile:picked.name,sourceBytes:picked.size,source,retainedWindow:window,retainedCells:(window[2]-window[0])*(window[3]-window[1])},null,2);status.textContent=`Source: ${source.width} × ${source.height}${source.sourceRegistration?', values at grid nodes, read as the cells around them':''}. Retain ${window[2]-window[0]} × ${window[3]-window[1]} cells.`;save.disabled=false;};
  // A NETCDF FILE IS ASKED WHICH VARIABLE, when it holds more than one grid: DTU25MSS carries mss and its sigma.
  const readNetcdf=async(picked:File,request:number,variable?:string)=>{status.textContent='Reading the NetCDF header…';const found=await inspectNetcdf(picked,variable);if(request!==serial)return;netcdf=found.grid;metadata=found.metadata;
    variableSelect.innerHTML=found.grid.candidates.map(name=>`<option value="${name.replace(/[&<>"]/g,'')}">${name.replace(/[&<>"]/g,'')}</option>`).join('');variableSelect.value=found.grid.variable;variableRow.hidden=found.grid.candidates.length<2;shown(found.metadata,picked);};
  variableSelect.onchange=async()=>{if(!file||!netcdf)return;const request=++serial;save.disabled=true;error.hidden=true;try{await readNetcdf(file,request,variableSelect.value);}catch(e){if(request===serial){status.textContent='Raster cannot be prepared.';fail(e);}}};
  fileInput.onchange=async()=>{const request=++serial;url=undefined;netcdf=undefined;variableRow.hidden=true;urlKeep.innerHTML='';file=fileInput.files?.[0];padding.disabled=!file;metadata=undefined;save.disabled=true;error.hidden=true;if(!file){save.disabled=!existing;return;}preset.hidden=file.name!==WORLDPOP_BOTSWANA_FILENAME;if(existing){fill({});status.textContent='Replacement file selected: review and re-enter source metadata.';}
    try{if(isNetcdf(file)){await readNetcdf(file,request);return;}status.textContent='Reading GeoTIFF metadata…';const source=await inspectRaster(file);if(request!==serial)return;metadata=source;shown(source,file);}catch(e){if(request===serial){status.textContent='Raster cannot be prepared.';fail(e);}}};
  save.onclick=async()=>{if(((!(file||url)||!metadata)&&!existing)||busy)return;busy=true;save.disabled=true;cancel.disabled=true;fileInput.disabled=true;padding.disabled=true;fields.disabled=true;error.hidden=true;status.textContent='Reading the selected window and saving…';try{
    const provenance=collect();validateRasterProvenance(provenance);if(!file&&!url&&existing){const asset={...structuredClone(existing),provenance};if(!onSave(asset))throw new Error('Source metadata could not be saved. Retry Save.');dialog.close();return;}const from=file??url;if(!from||!metadata)throw new Error('Select a supported raster file.');
    const window=rasterWindow(metadata,boundary,Number(padding.value)),data=file&&netcdf?await readNetcdfWindow(file,netcdf,metadata,window):await readRasterWindow(from,metadata,window),bytes=encodeRaster(data);if(bytes.length>5_000_000)throw new Error('Retained GeoTIFF exceeds 5 MB. Use a smaller study area.');
    const retained=await inspectRaster(new Blob([bytes])),asset:RasterAsset={provenance,filename:'raster-window.tif',mediaType:'image/tiff',bytes:bytes.length,sha256:await contentHash(bytes),metadata:retained,source:file?{filename:file.name,bytes:file.size,lastModified:file.lastModified,metadata}:{filename:nameOf(url!),bytes:urlBytes??0,lastModified:0,metadata,url:url!},window};
    await storePDFs(new Map([[asset.sha256,bytes]]),new Map([[asset.sha256,{...asset,asset}]]));if(!onSave(asset))throw new Error('Raster metadata could not be saved. Your previous project is unchanged; retry Save.');dialog.close();
  }catch(e){fail(e);status.textContent='Raster has not been applied to the project.';}finally{busy=false;save.disabled=false;cancel.disabled=false;fileInput.disabled=false;padding.disabled=!file;fields.disabled=false;}};
  dialog.showModal();
}
/** The frame the raster is drawn in, and the projection that puts anything else in it.
 *
 *  Extracted so a caller can place a mark on the raster without recomputing this arithmetic and
 *  getting a slightly different answer. The raster is GROUND, and ground is drawn under the
 *  layers that were wired beside it -- it is not a mode that replaces them. */
export function rasterFrame(grid:RasterGrid){
  const m=grid.metadata;
  const [west,south,east,north]=m.bounds,cos=Math.cos((north+south)/2*Math.PI/180),scale=Math.min(800/((east-west)*cos),245/(north-south)),width=(east-west)*cos*scale,height=(north-south)*scale,x=(850-width)/2,y=(295-height)/2;
  return {west,south,east,north,cos,scale,width,height,x,y,
    project:(p:Position):[number,number]=>[x+(p[0]-west)*cos*scale,y+(north-p[1])*scale]};
}
/** `overlay` is SVG already projected by `rasterFrame(grid).project`, drawn over the cells and
 *  under the caption. Empty when nothing else was wired, which is the only time this map is
 *  honestly a picture of a raster alone. */
export function rasterSvg(grid:RasterGrid,overlay=''):string{
  const m=grid.metadata;
  const {west,north,cos,scale,width,height,x,y}=rasterFrame(grid);
  const path=grid.boundary?(grid.boundary.type==='Polygon'?[grid.boundary.coordinates]:grid.boundary.coordinates).flatMap(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${x+(p[0]-west)*cos*scale},${y+(north-p[1])*scale}`).join(' ')+'Z')).join(' '):'';
  const polygons=grid.boundary?(grid.boundary.type==='Polygon'?[grid.boundary.coordinates]:grid.boundary.coordinates):[];
  const pixelPaths=polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${(p[0]-m.origin[0])/m.resolution[0]},${(p[1]-m.origin[1])/m.resolution[1]}`).join(' ')+'Z').join(' '));
  const transform=`translate(${x} ${y}) scale(${width/m.width} ${height/m.height})`,margin=grid.mask?.marginPixels||0,maskId='raster-visible-footprint';
  const shapes=(color:string)=>pixelPaths.map(d=>`<path data-raster-mask-shape d="${d}" fill="${color}" fill-rule="evenodd" stroke="${color}" stroke-width="${2*margin}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const background=grid.mask?`<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="850" height="295" style="mask-type:alpha"><g transform="${transform}">${shapes('white')}</g></mask></defs><g transform="${transform}">${shapes('#e8ece5').replaceAll('data-raster-mask-shape','data-raster-nodata-background')}</g>`:`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#e8ece5"/>`;
  return `${background}<image ${grid.mask?`mask="url(#${maskId})"`:''} href="${rasterImage(grid)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" style="image-rendering:pixelated"/><path d="${path}" fill="none" stroke="#193d33" stroke-width="1.4"/>${overlay}<text x="15" y="18" font-size="11">Native raster cells · ${grid.mask?`${grid.mask.method} · margin ${margin} px · outside footprint = transparent`:'unmasked input window'} · gray inside = NoData</text>`;
}
export function downloadRaster(grid:RasterGrid):void{const url=URL.createObjectURL(new Blob([encodeRaster(grid)],{type:'image/tiff'})),link=document.createElement('a');link.href=url;link.download=grid.mask?'fieldwork-clipped.tif':'fieldwork-raster-window.tif';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
