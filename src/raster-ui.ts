import {RASTER_SOURCE_FIELDS,validateRasterProvenance,WORLDPOP_BOTSWANA,WORLDPOP_BOTSWANA_FILENAME} from './raster-provenance.js';
import type {RasterProvenance} from './raster-provenance.js';
import type {Boundary,Position} from './types.js';
import type {RasterAsset,RasterGrid,RasterMetadata} from './raster.js';
import {rasterImage} from './raster-image.js';
export {rasterImage} from './raster-image.js';
import {inspectRaster,rasterWindow,readRasterWindow,encodeRaster,rasterOverhang,overhangSentence} from './raster.js';
import {contentHash} from './project-files.js';
import {isNetcdf,inspectNetcdf,readNetcdfWindow,type NetcdfGrid} from './netcdf-raster.js';
import {storePDFs} from './evidence-storage.js';
import {openConfigDialog} from './config-dialog.js';

const esc=(value:unknown):string=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);

/** RASTER INPUT, CONFIGURED (experiment 186, 2026-11-11): where to get a file, the file or its address, the variable of a
 *  NetCDF grid, the margin, and the source's citation, in the standard dialog. Apply reads the window and keeps it.
 *  The file is held here, outside the controls, because a redraw empties a file input; a read that fails leaves the
 *  dialog open with the reason, and nothing on the step changed. */
type RasterDraft={provenance:RasterProvenance; padding:number; picked:string; variable:string};
export function openRasterEditor(boundary:Boundary,onSave:(asset:RasterAsset)=>boolean,existing?:RasterAsset,
  /** WHERE TO GET A FILE, at the top of Settings: the population sources for the study area's country. `html` is
   *  called on every redraw; `wire` connects its controls. */
  source?:{html:()=>string;wire:(root:HTMLElement)=>void},step=''):void{
  let netcdf:NetcdfGrid|undefined,file:File|undefined,url:string|undefined,urlBytes:number|undefined,metadata:RasterMetadata|undefined;
  let reading='',failure='',urlField='',urlOpen=false,serial=0,redrawNow:()=>void=()=>{};
  const nameOf=(href:string)=>{try{return decodeURIComponent(new URL(href).pathname.split('/').pop()||href);}catch{return href;}};
  const picked=()=>!!(file||url);
  const windowOf=(d:RasterDraft)=>metadata?rasterWindow(metadata,boundary,Number(d.padding)):undefined;
  const fail=(e:unknown)=>{failure=e instanceof Error?e.message:String(e);reading='';};
  const card=(title:string,body:string)=>`<section class="config-group"><h3 class="config-group-title">${title}</h3>${body}</section>`;

  const readNetcdf=async(chosen:File,request:number,d:RasterDraft,variable?:string)=>{
    reading='Reading the NetCDF header…';redrawNow();
    const found=await inspectNetcdf(chosen,variable);if(request!==serial)return;
    netcdf=found.grid;metadata=found.metadata;d.variable=found.grid.variable;reading='';
  };

  openConfigDialog<RasterDraft>({
    id:'raster-dialog',widget:'Raster input',step,
    draft:{provenance:structuredClone(existing?.provenance||{}),padding:0,picked:'',variable:''},
    sections:d=>{
      let window:ReturnType<typeof rasterWindow>|undefined,windowFailure='';
      try{window=windowOf(d);}catch(e){windowFailure=e instanceof Error?e.message:String(e);}
      const chosenName=file?file.name:url?nameOf(url):'';
      const presetShown=(file?file.name:existing&&!url?existing.source.filename:'')===WORLDPOP_BOTSWANA_FILENAME;
      const settings=(source?`<section class="config-group" id="raster-population">${source.html()}</section>`:'')
        +card('The file',
          `<div class="field"><label for="raster-file" class="field-label">GeoTIFF or NetCDF file</label>`
          +`<input id="raster-file" type="file" accept=".tif,.tiff,image/tiff,.nc,.nc4">`
          +`<small>${chosenName?`Chosen: ${esc(chosenName)}. `:existing?`Kept: ${esc(existing.source.filename)}. `:''}`
          +`One band, north-up WGS 84 (EPSG:4326), or one grid of a NetCDF-4 file. Not resampled or reprojected.</small></div>`
          +(netcdf&&netcdf.candidates.length>1?`<div class="field" id="raster-variable-row"><label for="raster-variable" class="field-label">Variable</label>`
            +`<select id="raster-variable">${netcdf.candidates.map(name=>`<option value="${esc(name)}"${name===netcdf!.variable?' selected':''}>${esc(name)}</option>`).join('')}</select></div>`:'')
          +`<details id="raster-url-source"${urlOpen?' open':''}><summary>Or a GeoTIFF at a URL</summary>`
          +`<div class="field"><label for="raster-url" class="field-label">URL of a GeoTIFF</label><input id="raster-url" type="url" placeholder="https://" value="${esc(urlField)}">`
          +`<small>Only the window around the study area is read, by range.</small></div>`
          +`<button type="button" id="raster-url-read" class="button">Read</button><div id="raster-url-keep">`
          +(url?`<a class="button" href="${esc(url)}" download="${esc(nameOf(url))}" target="_blank" rel="noopener noreferrer">`
            +`↓ Download the whole file · ${esc(nameOf(url))}${urlBytes?` · ${(urlBytes/1e6).toFixed(1)} MB`:''}</a>`
            +`<p class="muted">From ${esc(new URL(url).hostname)}${urlBytes?'':', size not stated by the host'}. Keep it on this laptop and choose it above to work without the connection; it is read in parts there too.</p>`:'')
          +`</div></details>`
          +`<div class="field"><label for="raster-padding" class="field-label">Extra source coverage (when preparing a file)</label><select id="raster-padding"${existing&&!picked()?' disabled':''}>`
          +`<option value="0"${d.padding===0?' selected':''}>None</option><option value="1"${d.padding===1?' selected':''}>One pixel around the study area</option></select>`
          +`<small>One cell more, for a small clipping margin.</small></div>`)
        +card('Source metadata and citation',
          (presetShown?`<button type="button" id="raster-worldpop" class="button">Use Botswana WorldPop source details</button>`:'')
          +`<fieldset id="raster-source-fields">`+Object.entries(RASTER_SOURCE_FIELDS).map(([key,label])=>{const long=['citation','notes'].includes(key);
            return `<div class="field"><label class="field-label" for="raster-source-${key}">${esc(label)}</label>`
              +`<textarea id="raster-source-${key}" data-source-field="${key}" rows="${long?3:1}" maxlength="${long?4000:2000}">${esc(d.provenance[key as keyof RasterProvenance]||'')}</textarea></div>`;}).join('')
          +`</fieldset>`);
      const said=reading||(metadata&&window?`Source: ${metadata.width} × ${metadata.height}${metadata.sourceRegistration?', values at grid nodes, read as the cells around them':''}. Retain ${window[2]-window[0]} × ${window[3]-window[1]} cells.`
        :existing?`Kept: ${existing.metadata.width} × ${existing.metadata.height} cells from ${existing.source.filename}.`:'No file chosen.');
      const shown=metadata&&window?{...(file?{sourceFile:file.name,sourceBytes:file.size}:{sourceURL:url,sourceBytes:urlBytes??null}),source:metadata,retainedWindow:window,retainedCells:(window[2]-window[0])*(window[3]-window[1]),extraPixels:d.padding}
        :existing?existing.source.metadata:undefined;
      const preview=`<p id="raster-status" role="status">${esc(said)}</p>`
        +(shown?`<details><summary>Metadata read from the file</summary><pre id="raster-metadata">${esc(JSON.stringify(shown,null,2))}</pre></details>`:'');
      const problem=failure||windowFailure;
      const overhang=metadata&&window&&!problem?overhangSentence(rasterOverhang(metadata,boundary)):'';
      return {settings,preview,decisions:`<p>Pixel values are not automatically interpreted as population totals.</p>`,
        blocked:!!reading||!!problem||!(metadata&&window)&&!(existing&&!picked()),
        ...(problem?{message:{tone:'refusal' as const,text:problem}}:overhang?{message:{tone:'warning' as const,text:overhang}}:{})};
    },
    wire:(root,d,redraw)=>{
      redrawNow=redraw;
      const block=root.querySelector<HTMLElement>('#raster-population');if(block&&source)source.wire(block);
      root.querySelector<HTMLDetailsElement>('#raster-url-source')?.addEventListener('toggle',e=>{urlOpen=(e.target as HTMLDetailsElement).open;});
      const urlInput=root.querySelector<HTMLInputElement>('#raster-url')!;urlInput.addEventListener('input',()=>{urlField=urlInput.value;});
      root.querySelectorAll<HTMLTextAreaElement>('[data-source-field]').forEach(el=>el.addEventListener('input',()=>{
        const key=el.dataset.sourceField as keyof RasterProvenance,value=el.value.trim();
        if(value)d.provenance[key]=value;else delete d.provenance[key];}));
      root.querySelector<HTMLButtonElement>('#raster-worldpop')?.addEventListener('click',()=>{d.provenance={...WORLDPOP_BOTSWANA};redraw();});
      root.querySelector<HTMLSelectElement>('#raster-padding')!.addEventListener('change',e=>{d.padding=Number((e.target as HTMLSelectElement).value);redraw();});
      root.querySelector<HTMLSelectElement>('#raster-variable')?.addEventListener('change',async e=>{
        if(!file||!netcdf)return;const request=++serial;failure='';
        try{await readNetcdf(file,request,d,(e.target as HTMLSelectElement).value);}catch(error){if(request===serial)fail(error);}
        if(request===serial)redraw();});
      root.querySelector<HTMLInputElement>('#raster-file')!.addEventListener('change',async e=>{
        const chosen=(e.target as HTMLInputElement).files?.[0];if(!chosen)return;
        const request=++serial;file=chosen;url=undefined;urlBytes=undefined;netcdf=undefined;metadata=undefined;failure='';
        d.picked=chosen.name;if(existing)d.provenance={};
        try{
          if(isNetcdf(chosen))await readNetcdf(chosen,request,d);
          else{reading='Reading GeoTIFF metadata…';redraw();const found=await inspectRaster(chosen);if(request!==serial)return;metadata=found;reading='';}
        }catch(error){if(request===serial)fail(error);}
        if(request===serial)redraw();});
      root.querySelector<HTMLButtonElement>('#raster-url-read')!.addEventListener('click',async()=>{
        const request=++serial,href=urlInput.value.trim();urlField=href;urlOpen=true;
        file=undefined;netcdf=undefined;metadata=undefined;url=undefined;urlBytes=undefined;failure='';
        try{const parsed=new URL(href);if(!/^https?:$/.test(parsed.protocol))throw new Error('Give an http or https address.');}
        catch(error){fail(error instanceof Error&&error.message.startsWith('Give')?error:new Error('That is not a web address.'));redraw();return;}
        reading='Reading the GeoTIFF header…';redraw();
        try{
          const found=await inspectRaster(href);if(request!==serial)return;
          // THE SIZE, SAID BEFORE ANYONE DOWNLOADS IT. A host that does not say is said not to.
          try{const head=await fetch(href,{method:'HEAD'});const n=Number(head.headers.get('content-length'));if(head.ok&&Number.isFinite(n)&&n>0)urlBytes=n;}catch{/* unstated */}
          if(request!==serial)return;
          url=href;metadata=found;reading='';d.picked=href;if(existing)d.provenance={};
        }catch(error){if(request===serial)fail(error);}
        if(request===serial)redraw();});
    },
    apply:()=>{},
    applyAsync:async(d,say)=>{
      const provenance=structuredClone(d.provenance);validateRasterProvenance(provenance);
      if(!picked()&&existing){if(!onSave({...structuredClone(existing),provenance}))throw new Error('Source metadata could not be saved. Retry Apply.');return true;}
      const from=file??url;if(!from||!metadata)throw new Error('Choose a supported raster file.');
      say('Reading the selected window and saving…');
      const window=rasterWindow(metadata,boundary,Number(d.padding));
      const data=file&&netcdf?await readNetcdfWindow(file,netcdf,metadata,window):await readRasterWindow(from,metadata,window),bytes=encodeRaster(data);
      if(bytes.length>5_000_000)throw new Error('Retained GeoTIFF exceeds 5 MB. Use a smaller study area.');
      const retained=await inspectRaster(new Blob([bytes])),asset:RasterAsset={provenance,filename:'raster-window.tif',mediaType:'image/tiff',bytes:bytes.length,sha256:await contentHash(bytes),metadata:retained,
        source:file?{filename:file.name,bytes:file.size,lastModified:file.lastModified,metadata}:{filename:nameOf(url!),bytes:urlBytes??0,lastModified:0,metadata,url:url!},window};
      await storePDFs(new Map([[asset.sha256,bytes]]),new Map([[asset.sha256,{...asset,asset}]]));
      if(!onSave(asset))throw new Error('Raster metadata could not be saved. Your previous project is unchanged; retry Apply.');
      return true;
    },
  },esc);
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
