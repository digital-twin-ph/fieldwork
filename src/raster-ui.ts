import {fileDigest} from './sha256-stream.js';
import {RASTER_SOURCE_FIELDS,validateRasterProvenance,WORLDPOP_BOTSWANA,WORLDPOP_BOTSWANA_FILENAME} from './raster-provenance.js';
import type {RasterProvenance} from './raster-provenance.js';
import type {Boundary,Position,Workflow,WorkflowNode} from './types.js';
import {escapeHtml} from './html-escape.js';
import {type OwnInspector,type StepKit} from './inspector-kit.js';
import {geometryBounds} from './study-area.js';
import type {RasterAsset,RasterGrid,RasterMetadata} from './raster.js';
import {rasterImage,rasterImageFactor,scaleKeySvg,scaleWords} from './raster-image.js';
export {rasterImage} from './raster-image.js';
import {inspectRaster,rasterWindow,readRasterWindow,encodeRaster,savedWindowCells,rasterOverhang,overhangSentence,rasterFileByteLimit,MAX_RASTER_CELLS,overWindowLimit,reductionFactor,reduceWindow} from './raster.js';
import {sessionFiles} from './raster-workflow.js';
import {rasterUnitsOf} from './raster-units.js';
import {rasterMeasure} from './raster-panels.js';
import {contentHash} from './project-files.js';
import {isNetcdf,inspectNetcdf,readNetcdfWindow,type NetcdfGrid} from './netcdf-raster.js';
import {storePDFs} from './evidence-storage.js';
import {openConfigDialog} from './config-dialog.js';

const esc=escapeHtml;

/** RASTER INPUT, CONFIGURED (experiment 186, 2026-11-11): where to get a file, the file or its address, the variable of a
 *  NetCDF grid, the margin, and the source's citation, in the standard dialog. Apply reads the window and keeps it.
 *  The file is held here, outside the controls, because a redraw empties a file input; a read that fails leaves the
 *  dialog open with the reason, and nothing on the step changed. */
type RasterDraft={provenance:RasterProvenance; padding:number; picked:string; variable:string};
export function openRasterEditor(boundary:Boundary,onSave:(asset:RasterAsset)=>boolean,existing?:RasterAsset,
  /** WHERE TO GET A FILE, at the top of Settings: the population sources for the study area's country. `html` is
   *  called on every redraw; `wire` connects its controls. */
  source?:{html:()=>string;wire:(root:HTMLElement)=>void},step='',
  /** A file Fieldwork pointed to, recognised by its name: its source record, filled in where none is written. */
  recognise?:(filename:string)=>RasterProvenance|undefined,
  /** THE KEPT WINDOW, in the dialog rather than the Inspector (experiment 186's standard, 2026-11-17): whether its cells
   *  are on this device, reading them again from the same source when they are not, and downloading them when they are. */
  kept?:{onDevice:boolean;rereadable:boolean;reread:(file:File|undefined,say:(text:string)=>void)=>Promise<void>;download:()=>Promise<void>}):void{
  let netcdf:NetcdfGrid|undefined,file:File|undefined,url:string|undefined,urlBytes:number|undefined,metadata:RasterMetadata|undefined;
  let reading='',failure='',urlField='',urlOpen=false,serial=0,redrawNow:()=>void=()=>{},rereadSaid='',rereadDone=false;
  const nameOf=(href:string)=>{try{return decodeURIComponent(new URL(href).pathname.split('/').pop()||href);}catch{return href;}};
  const picked=()=>!!(file||url);
  const windowOf=(d:RasterDraft)=>metadata?rasterWindow(metadata,boundary,Number(d.padding),false):undefined;
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
      // PAST WHAT A TAB HOLDS, SAID AND NOT REFUSED (2026-11-20). The window was checked against the old limits as soon as
      // a raster was chosen, so GHS-POP over DR Congo was refused here and Apply, which streams it, was never reached.
      // A NetCDF grid is not streamed, and is still refused.
      let streamedNote='';
      if(window&&metadata&&overWindowLimit(metadata,window)){
        if(file&&netcdf){try{rasterWindow(metadata,boundary,Number(d.padding));}catch(e){windowFailure=e instanceof Error?e.message:String(e);}}
        else{const width=window[2]-window[0],height=window[3]-window[1],factor=reductionFactor(width,height);
          streamedNote=`This window is ${(width*height).toLocaleString('en')} cells, more than a tab holds at once. Apply keeps a copy `
            +`in blocks of ${factor} by ${factor} cells for the map, and Sample a raster reads the full cells from `
            +`${file?'this file':'its address'} in strips at each run.`;}
      }
      const chosenName=file?file.name:url?nameOf(url):'';
      const presetShown=(file?file.name:existing&&!url?existing.source.filename:'')===WORLDPOP_BOTSWANA_FILENAME;
      const away=existing&&kept&&!kept.onDevice&&!picked();
      // A STREAMED RASTER READ FROM A FILE: its copy is here, but each run reads the file, which a browser keeps only per session.
      const needsFile=!!(existing?.streamed&&kept?.onDevice&&!existing.source.url&&existing.source.sha256&&!sessionFiles.has(existing.source.sha256)&&!picked());
      const where=existing?(existing.source.url?new URL(existing.source.url).hostname:existing.source.filename):'';
      const keptCard=rereadDone&&!picked()?card(existing?.streamed?'The source file':'The kept window',existing?.streamed&&kept?.onDevice?'<p class="notice" data-raster-reread-done>Checked: it is the file first chosen. Each run this session reads it.</p>':'<p class="notice" data-raster-reread-done>Read again and checked: it is the window that was kept.</p>')
        :!away&&!needsFile?'':card(needsFile?'The source file':'The kept window',kept!.rereadable
        ?(needsFile?`<p class="notice" data-raster-streamed-file>This raster is too large to keep on the device, so each run reads it from ${esc(where)}. `
            +'A browser keeps no file between sessions: choose it again for this session. It is checked against the file first chosen.</p>'
          :`<p class="notice" data-raster-missing>The window is not on this device yet: the project carries where it came from, not its cells. Read it again from ${esc(where)}; it is checked against the window that was kept.</p>`)
          // A COPY ON THIS DEVICE SERVES INSTEAD OF THE HOST (2026-11-23): a practitioner holding GHS-POP's 12 GB global
          // grid still had to send the study area to the host, because a window read at an address offered only that
          // address. The window read from the file is checked against the window kept, which is what decides it.
          +(existing!.source.url?'<div class="inspector-actions"><button type="button" id="raster-reread" class="button primary">Read the window again</button></div>'
            +`<div class="field"><label class="field-label" for="raster-reread-file">Or the same file on this device: ${esc(existing!.source.filename)}</label>`
            +'<input id="raster-reread-file" type="file" accept=".tif,.tiff,image/tiff">'
            +'<small>Read where it sits and never copied. The window read from it is checked against the window that was kept, and refused if it differs.</small></div>'
            :`<div class="field"><label class="field-label" for="raster-reread-file">The same file again: ${esc(existing!.source.filename)} (${existing!.source.bytes.toLocaleString('en')} bytes)</label><input id="raster-reread-file" type="file" accept=".tif,.tiff,image/tiff"></div>`)
          +`<p id="raster-reread-status" class="description" role="status">${esc(rereadSaid)}</p>`
        :'<p class="notice" data-raster-missing>The window is not on this device, and this project does not say where to read it again. Import the project with its files.</p>');
      const settings=keptCard+(source?`<section class="config-group" id="raster-population">${source.html()}</section>`:'')
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
      const said=reading||(metadata&&window?`Source: ${metadata.width} × ${metadata.height}${metadata.sourceRegistration?', values at grid nodes, read as the cells around them':''}.${overWindowLimit(metadata,window)?` Window ${(window[2]-window[0]).toLocaleString('en')} × ${(window[3]-window[1]).toLocaleString('en')} cells, kept in blocks of ${reductionFactor(window[2]-window[0],window[3]-window[1])} by ${reductionFactor(window[2]-window[0],window[3]-window[1])}.`:` Retain ${window[2]-window[0]} × ${window[3]-window[1]} cells.`}`
        :existing?`Kept: ${existing.metadata.width} × ${existing.metadata.height} cells from ${existing.source.filename}.`:'No file chosen.');
      const shown=metadata&&window?{...(file?{sourceFile:file.name,sourceBytes:file.size}:{sourceURL:url,sourceBytes:urlBytes??null}),source:metadata,retainedWindow:window,retainedCells:(window[2]-window[0])*(window[3]-window[1]),extraPixels:d.padding}
        :existing?existing:undefined;
      const preview=`<p id="raster-status" role="status">${esc(said)}</p>`
        +(shown?`<details><summary>${metadata&&window?'Metadata read from the file':'The kept window: its source, window and digest'}</summary><pre id="raster-metadata">${esc(JSON.stringify(shown,null,2))}</pre></details>`:'')
        +(existing&&kept?.onDevice&&!picked()?'<div class="inspector-actions"><button type="button" id="download-node-raster" class="button">Download GeoTIFF</button></div>'
          +'<p class="description">The kept window at native resolution, with its georeferencing and source metadata.</p>':'');
      const problem=failure||windowFailure;
      const overhang=metadata&&window&&!problem?overhangSentence(rasterOverhang(metadata,boundary)):'';
      return {settings,preview,decisions:`<p>Pixel values are not automatically interpreted as population totals.</p>`,
        blocked:!!reading||!!problem||!(metadata&&window)&&!(existing&&!picked()),
        ...(problem?{message:{tone:'refusal' as const,text:problem}}:streamedNote||overhang?{message:{tone:'warning' as const,text:[streamedNote,overhang].filter(Boolean).join(' ')}}:{})};
    },
    wire:(root,d,redraw)=>{
      redrawNow=redraw;
      const reread=async(chosen?:File)=>{rereadSaid='Reading the window again…';redraw();
        try{await kept!.reread(chosen,text=>{rereadSaid=text;const at=root.querySelector('#raster-reread-status');if(at)at.textContent=text;});
          kept!.onDevice=true;rereadSaid='';rereadDone=true;}
        catch(error){rereadSaid=error instanceof Error?error.message:String(error);}
        redraw();};
      root.querySelector('#raster-reread')?.addEventListener('click',()=>void reread());
      root.querySelector<HTMLInputElement>('#raster-reread-file')?.addEventListener('change',e=>{const f=(e.target as HTMLInputElement).files?.[0];if(f)void reread(f);});
      root.querySelector<HTMLButtonElement>('#download-node-raster')?.addEventListener('click',async e=>{
        const button=e.currentTarget as HTMLButtonElement;button.disabled=true;button.textContent='Preparing\u2026';
        try{await kept!.download();}catch(error){fail(error);redraw();return;}
        button.disabled=false;button.textContent='Download GeoTIFF';});
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
        const known=recognise?.(chosen.name);if(known&&!Object.values(d.provenance??{}).some(v=>String(v??'').trim()))d.provenance={...known};
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
          // A FILE READ BY ITS ADDRESS IS RECOGNISED BY ITS NAME TOO (2026-11-17): GHS-POP is read this way, and its unit is stated.
          const known=recognise?.(nameOf(href));if(known&&!Object.values(d.provenance??{}).some(v=>String(v??'').trim()))d.provenance={...known};
        }catch(error){if(request===serial)fail(error);}
        if(request===serial)redraw();});
    },
    apply:()=>{},
    applyAsync:async(d,say)=>{
      const provenance=structuredClone(d.provenance);validateRasterProvenance(provenance);
      if(!picked()&&existing){if(!onSave({...structuredClone(existing),provenance}))throw new Error('Source metadata could not be saved. Retry Apply.');return true;}
      const from=file??url;if(!from||!metadata)throw new Error('Choose a supported raster file.');
      say('Reading the selected window…');
      // PAST WHAT A TAB HOLDS, STREAMED (2026-11-19): a copy reduced in blocks is kept, and Sample raster reads the full cells
      // from the source in strips at each run. A NetCDF grid is not streamed yet, and is refused as before.
      const full=rasterWindow(metadata,boundary,Number(d.padding),false);
      if(!(file&&netcdf)&&overWindowLimit(metadata,full)){
        const {terrio,terrioLoaded}=await import('./terrio.js');
        if(!terrioLoaded()){say('Fetching Fieldwork\u2019s raster engine, about 6 MB, once for this device…');await terrio();}
        const width=full[2]-full[0],height=full[3]-full[1],factor=reductionFactor(width,height);
        const probe={provenance,source:{filename:file?file.name:nameOf(url!),bytes:0,lastModified:0,metadata}} as unknown as RasterAsset;
        const how=rasterMeasure(rasterUnitsOf(probe)?.units).kind==='count'?'sum' as const:'mean' as const;
        const reduced=await reduceWindow(from,metadata,full,factor,how,(rows,of)=>say(`This window is ${(width*height).toLocaleString('en')} cells, `
          +`more than a tab holds at once. Keeping a copy in blocks of ${factor} by ${factor} (${how==='sum'?'each block summed':'each block averaged'}): `
          +`${Math.round(100*rows/of)}% of ${of.toLocaleString('en')} rows read…`,rows/of));
        const bytes=encodeRaster(reduced);
        const chosen=file,sourceDigest=chosen?await fileDigest(chosen,(read,of)=>say(`Checking ${chosen.name}: ${Math.round(100*read/of)}% of ${(of/1e9).toFixed(1)} GB read…`,read/of)):undefined;
        if(chosen&&sourceDigest)sessionFiles.set(sourceDigest,chosen);
        const retained=await inspectRaster(bytes.buffer),asset:RasterAsset={provenance,filename:'raster-window.tif',mediaType:'image/tiff',bytes:bytes.length,
          sha256:await contentHash(bytes),metadata:retained,streamed:{factor,how},
          source:file?{filename:file.name,bytes:file.size,lastModified:file.lastModified,metadata,...(sourceDigest?{sha256:sourceDigest}:{})}
            :{filename:nameOf(url!),bytes:urlBytes??0,lastModified:0,metadata,url:url!},window:full};
        await storePDFs(new Map([[asset.sha256,bytes]]),new Map([[asset.sha256,{...asset,asset}]]));
        if(!onSave(asset))throw new Error('Raster metadata could not be saved. Your previous project is unchanged; retry Apply.');
        return true;
      }
      const window=rasterWindow(metadata,boundary,Number(d.padding));
      // THE ENGINE'S FIRST FETCH, SAID (experiment 221): 6 MB the first time a raster is read on this device, then kept.
      if(!(file&&netcdf)){const {terrio,terrioLoaded}=await import('./terrio.js');
        if(!terrioLoaded()){say('Fetching Fieldwork\u2019s raster engine, about 6 MB, once for this device…');await terrio();}}
      let data:Pick<RasterGrid,'metadata'|'values'>|null=file&&netcdf?await readNetcdfWindow(file,netcdf,metadata,window)
        :await readRasterWindow(from,metadata,window,(rows,of,note)=>say(`Reading the selected window: ${Math.round(100*rows/of)}%, `
          +`${rows.toLocaleString('en')} of ${of.toLocaleString('en')} rows${file?'':` from ${nameOf(url!)}`}${note?`; ${note}`:''}…`,rows/of),undefined,
          savedWindowCells(metadata,window));
      say('Saving the window…');
      // ONE WINDOW WHILE SAVING (2026-11-17): once encoded, the file holds the cells, so the cells as read are let go.
      const cells=data.values.length,bytes=encodeRaster(data);data=null;
      if(bytes.length>rasterFileByteLimit())throw new Error(`This window is ${cells.toLocaleString('en')} cells, past the ${MAX_RASTER_CELLS.toLocaleString('en')} a step keeps. Use a smaller study area.`);
      // THE SOURCE FILE'S DIGEST, read a slice at a time: a global grid of 12 GB could not be read whole (2026-11-13).
      const chosen=file,sourceDigest=chosen&&!netcdf?await fileDigest(chosen,(read,of)=>say(`Checking ${chosen.name}: ${Math.round(100*read/of)}% of ${(of/1e9).toFixed(1)} GB read…`,read/of)):undefined;
      const retained=await inspectRaster(bytes.buffer),asset:RasterAsset={provenance,filename:'raster-window.tif',mediaType:'image/tiff',bytes:bytes.length,sha256:await contentHash(bytes),metadata:retained,
        // A GEOTIFF CHOSEN HERE keeps its digest, so its window can be read again from the same file elsewhere (experiment 209).
        source:file?{filename:file.name,bytes:file.size,lastModified:file.lastModified,metadata,
          ...(sourceDigest?{sha256:sourceDigest}:{})}
          :{filename:nameOf(url!),bytes:urlBytes??0,lastModified:0,metadata,url:url!},window};
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
export function rasterSvg(grid:RasterGrid,overlay='',shade?:import('./raster-panels.js').PanelScale):string{
  const m=grid.metadata;
  const {west,north,cos,scale,width,height,x,y}=rasterFrame(grid);
  const path=grid.boundary?(grid.boundary.type==='Polygon'?[grid.boundary.coordinates]:grid.boundary.coordinates).flatMap(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${x+(p[0]-west)*cos*scale},${y+(north-p[1])*scale}`).join(' ')+'Z')).join(' '):'';
  const polygons=grid.boundary?(grid.boundary.type==='Polygon'?[grid.boundary.coordinates]:grid.boundary.coordinates):[];
  const pixelPaths=polygons.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${(p[0]-m.origin[0])/m.resolution[0]},${(p[1]-m.origin[1])/m.resolution[1]}`).join(' ')+'Z').join(' '));
  const transform=`translate(${x} ${y}) scale(${width/m.width} ${height/m.height})`,margin=grid.mask?.marginPixels||0,maskId='raster-visible-footprint';
  const shapes=(color:string)=>pixelPaths.map(d=>`<path data-raster-mask-shape d="${d}" fill="${color}" fill-rule="evenodd" stroke="${color}" stroke-width="${2*margin}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  const background=grid.mask?`<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="850" height="295" style="mask-type:alpha"><g transform="${transform}">${shapes('white')}</g></mask></defs><g transform="${transform}">${shapes('#e8ece5').replaceAll('data-raster-mask-shape','data-raster-nodata-background')}</g>`:`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#e8ece5"/>`;
  // SHADED BY ITS UNIT, WITH ITS KEY UNDER IT (2026-11-17): the caller frames it 375 high, its key below the cells.
  const key='',keyBelow=shade?scaleKeySvg(shade,300,scaleWords(shade,'single'),esc):'';
  return `${key}${background}<image ${grid.mask?`mask="url(#${maskId})"`:''} href="${rasterImage(grid,undefined,shade)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" style="image-rendering:pixelated"/><path d="${path}" fill="none" stroke="#193d33" stroke-width="1.4"/>${overlay}<text x="15" y="18" font-size="14">${rasterImageFactor(m)>1?`Raster cells, each pixel the mean of ${rasterImageFactor(m)} × ${rasterImageFactor(m)}`:'Native raster cells'} · ${grid.mask?`${grid.mask.method} · margin ${margin} px · outside footprint = transparent`:'unmasked input window'} · ${shade?'clear inside = nothing to shade':'gray inside = NoData'}</text>${keyBelow}`;
}
export function downloadRaster(grid:RasterGrid):void{const url=URL.createObjectURL(new Blob([encodeRaster(grid)],{type:'image/tiff'})),link=document.createElement('a');link.href=url;link.download=grid.mask?'fieldwork-clipped.tif':'fieldwork-raster-window.tif';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}

export function clipSentence(n:WorkflowNode<'clip_raster'>):string{
  const p=n.params,margin=p.marginPixels||0;
  return `Keeps the cells ${p.method==='all-touched'?'the boundary touches':'whose centre is inside the boundary'}`
    +(margin?`, and ${margin} cell${margin===1?'':'s'} beyond it`:'')+', at the raster\u2019s own resolution; cells outside become no data. '
    +(p.cutline?'The boundary is its own, saved here: changing the study area does not change it.':'The boundary is the connected study area\u2019s.');
}

/** CLIP RASTER'S CONFIGURATION DIALOG (experiment 186): which cells are kept, the margin, and whose boundary. */
function openClipConfig(kit:RasterKit,nodeId:string){
  const esc=kit.esc,found=kit.workflow().nodes.find(x=>x.id===nodeId);
  if(found?.type!=='clip_raster')return;
  const node=found;
  type Draft={method:'all-touched'|'cell-center';marginPixels:number;studyArea:boolean};
  const valid=(m:number)=>Number.isFinite(m)&&m>=0&&m<=1;
  openConfigDialog<Draft>({
    id:'clip-config',widget:'Clip raster',step:node.params.label||kit.title('clip_raster'),
    draft:{method:node.params.method,marginPixels:node.params.marginPixels||0,studyArea:!node.params.cutline},
    sections:draft=>({...(valid(draft.marginPixels)?{}:{blocked:true,message:{tone:'refusal' as const,text:'The margin is a number of cells from 0 to 1.'}}),
      settings:`<div class="field"><label class="field-label" for="clip-method">Keep a cell when</label><select id="clip-method">`
        +`<option value="all-touched"${draft.method==='all-touched'?' selected':''}>the boundary covers any part of it (all touched)</option>`
        +`<option value="cell-center"${draft.method==='cell-center'?' selected':''}>its centre is inside the boundary</option></select>`
        +'<small>All touched matches GDAL except where a boundary corner lies exactly on a cell border.</small></div>'
        +`<div class="field"><label class="field-label" for="clip-margin">Margin beyond the boundary, in cells (0 to 1)</label>`
        +`<input id="clip-margin" type="number" min="0" max="1" step="0.25" value="${Number.isFinite(draft.marginPixels)?draft.marginPixels:''}">`
        +'<small>A margin needs the raster to reach that far past the boundary. Cells with no data are never filled.</small></div>'
        +(node.params.cutline?`<div class="field"><span class="field-label">Boundary</span><p class="description">Its own, drawn on the map: `
          +geometryBounds(node.params.cutline.geometry).map((v,i)=>`${['west','south','east','north'][i]} ${v.toFixed(4)}\u00b0`).join(', ')+'.</p>'
          +`<label class="check"><input type="checkbox" id="reset-clip-boundary"${draft.studyArea?' checked':''}> Use the study area\u2019s boundary instead</label></div>`
          :'<div class="field"><span class="field-label">Boundary</span><p class="description">The connected study area\u2019s. Draw the boundary on the map to give this step its own.</p></div>'),
      preview:`<p class="muted">${esc(clipSentence({...node,params:{...node.params,method:draft.method,marginPixels:draft.marginPixels,...(draft.studyArea?{cutline:undefined}:{})}}))}</p>`}),
    wire:(root,draft,redraw)=>{
      root.querySelector<HTMLSelectElement>('#clip-method')?.addEventListener('change',e=>{draft.method=(e.target as HTMLSelectElement).value as Draft['method'];redraw();});
      root.querySelector<HTMLInputElement>('#clip-margin')?.addEventListener('change',e=>{const v=(e.target as HTMLInputElement).value;draft.marginPixels=v===''?NaN:Number(v);redraw();});
      root.querySelector<HTMLInputElement>('#reset-clip-boundary')?.addEventListener('change',e=>{draft.studyArea=(e.target as HTMLInputElement).checked;redraw();});
    },
    apply:draft=>kit.keepChange(w=>{const t=w.nodes.find(x=>x.id===nodeId);if(t?.type!=='clip_raster')return;t.params.method=draft.method;t.params.marginPixels=draft.marginPixels;
      if(draft.studyArea)delete t.params.cutline;}),
  },esc);
}

/** WHAT A RASTER INPUT HOLDS, in one sentence: the file, where from, the window and the cells' registration. */
export function rasterSentence(n:WorkflowNode<'raster_input'>):string{
  const a=n.params.asset;
  if(!a)return 'Keeps the window of a GeoTIFF around the study area, from a file on this device or at a URL. Nothing is kept yet.';
  const from=a.source.url?`read in parts from ${(()=>{try{return new URL(a.source.url).hostname;}catch{return a.source.url;}})()}`:'from a file on this device';
  return `Keeps ${a.metadata.width} × ${a.metadata.height} cells of ${a.source.filename}, ${from}, around the study area`
    +`${a.source.metadata.sourceRegistration?'; its values sit at grid nodes and are read as the cells around them':''}.`;
}

/** WHAT RASTER INPUT'S AND CLIP RASTER'S INSPECTORS ARE GIVEN (2026-11-20, moved out of app.ts when Raster input learned
 *  to stream a window past what a tab holds, and Clip raster's receipt to name its boundary by digest). Reading a file,
 *  drawing a preview and finding the study area stay in app.ts, with what they read; the kit runs them. */
export interface RasterKit extends StepKit {
  facts:(nodeId:string)=>string|undefined;
  ran:()=>boolean;
  /** A change the project must keep. */
  keepChange:(edit:(w:Workflow)=>void)=>void;
  prepare:(n:WorkflowNode<'raster_input'>)=>void;
  previewClip:(n:WorkflowNode<'clip_raster'>,e:Event)=>void;
  downloadClipped:(n:WorkflowNode<'clip_raster'>,e:Event)=>void;
  addMap:(n:WorkflowNode)=>void;
  /** Whether a kept window's bytes are on this device, said in `host`. */
  presence:(n:WorkflowNode<'raster_input'>,host:HTMLElement)=>void;
}
/** RASTER INPUT ON THE STANDARD INSPECTOR (experiments 186, 198): name, inputs, one sentence with Configure…, and what it
 *  holds. CLIP RASTER ON IT (experiment 186, 0.149.0): its method, margin and boundary in Configure…, the boundary drawn
 *  on the map beside it, and what the last run kept. The country WorldPop is offered for is read from the study area, in
 *  Configure… (2026-11-10). */
export const rasterInspector:OwnInspector<'raster_input'|'clip_raster'>={
  markup:(n,kit)=>{const k=kit as RasterKit,esc=kit.esc,why=k.unfinished(n.id);
    if(n.type==='raster_input'){const node=n as WorkflowNode<'raster_input'>,asset=node.params.asset;
      return kit.section('Name',kit.name('raster-label',node.params.label||'Raster input'))
        +kit.section('Inputs',kit.inputs(n,{area:'Study area, around which a window is kept'}))
        +kit.section('Settings',`<p class="standard-sentence">${esc(rasterSentence(node))}</p>`
          +'<div class="inspector-actions"><button id="prepare-raster" class="button primary">Configure…</button></div>')
        +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`
          :asset?`Holds ${asset.metadata.width} × ${asset.metadata.height} cells of ${asset.source.filename}.`:'Nothing kept yet: choose a GeoTIFF in Configure…')}</p>`
          +(asset?'<div data-raster-presence></div>':''));
    }
    const node=n as WorkflowNode<'clip_raster'>,facts=k.facts(n.id)??'';
    const count=(name:string)=>{const m=new RegExp(`fw:${name} (\\d+)`).exec(facts);return m?Number(m[1]):undefined;};
    const inside=count('insideCellCount'),valid=count('validCellCount');
    return kit.section('Name',kit.name('clip-raster-label',node.params.label||'Clip raster'))
      +kit.section('Inputs',kit.inputs(n,{raster:'Raster to clip',area:'Study area, whose boundary is copied as the cutline'}))
      +kit.section('Settings',`<p class="standard-sentence">${esc(clipSentence(node))}</p>`
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button>'
        +'<button id="preview-raster-clip" class="button">Draw the boundary on the map…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">${esc(why?`The last run could not compute this step: ${why}`
        :inside!==undefined?`${inside.toLocaleString('en')} cell${inside===1?'':'s'} kept inside the boundary, ${(valid??0).toLocaleString('en')} of them with a value. Cells outside are no data.`
        :k.ran()?'Run to clip the raster.':'Not run yet.')}</p>`
        +'<div class="inspector-actions"><button id="download-node-raster" class="button">Download GeoTIFF</button><button id="add-raster-map" class="button">Add raster map</button></div>');},
  wire:(n,kit,root)=>{const k=kit as RasterKit;
    if(n.type==='raster_input'){const node=n as WorkflowNode<'raster_input'>;
      root.querySelector('#prepare-raster')?.addEventListener('click',()=>k.prepare(node));
      // A WINDOW THAT TRAVELLED WITHOUT ITS BYTES (experiment 209): said on the Result line; read again in Configure… (186).
      const host=root.querySelector<HTMLElement>('[data-raster-presence]');if(host)k.presence(node,host);
      return;}
    const node=n as WorkflowNode<'clip_raster'>;
    root.querySelector('#configure-step')?.addEventListener('click',()=>openClipConfig(k,n.id));
    root.querySelector('#preview-raster-clip')?.addEventListener('click',e=>k.previewClip(node,e));
    // Clip raster's own download, of the masked grid; Raster input's is in its dialog (186, 2026-11-17).
    root.querySelector('#download-node-raster')?.addEventListener('click',e=>k.downloadClipped(node,e));
    root.querySelector('#add-raster-map')?.addEventListener('click',()=>k.addMap(n));
  },
};
