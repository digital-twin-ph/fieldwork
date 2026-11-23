import {issueFacts} from './data-issues.js';
import {validateRasterProvenance,rasterProvenanceN3} from './raster-provenance.js';
import type {WorkflowNode} from './types.js';
import type {AreaValue,Receipt} from './results.js';
import type {RasterAsset,RasterGrid} from './raster.js';
import {inspectRaster,readRasterWindow,rasterWindow,clipRaster,rasterOverhang,overhangSentence} from './raster.js';
import {SAVED_WINDOW_CELLS,SAVED_WINDOW_BYTES} from './raster-limits.js';
import {verifiedProjectFile} from './evidence-storage.js';
import {geometryWKT,CRS84,geometryByReference} from './study-area.js';
export function validateRasterAsset(asset:RasterAsset):void{
  validateRasterProvenance(asset?.provenance);const m=asset?.metadata;
  if(!asset||asset.mediaType!=='image/tiff'||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<8||asset.bytes>SAVED_WINDOW_BYTES||typeof asset.filename!=='string'||asset.filename.length>200||!m||!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||m.width*m.height>SAVED_WINDOW_CELLS||m.crs!=='EPSG:4326'||m.rasterType!=='PixelIsArea'||!Array.isArray(m.origin)||m.origin.length!==2||!m.origin.every(Number.isFinite)||!Array.isArray(m.resolution)||m.resolution.length!==2||!(m.resolution[0]>0&&m.resolution[1]<0)||!Array.isArray(m.bounds)||m.bounds.length!==4||!m.bounds.every(Number.isFinite)||!asset.source||typeof asset.source.filename!=='string'||!Number.isSafeInteger(asset.source.bytes)||!Array.isArray(asset.window)||asset.window.length!==4||!asset.window.every(Number.isSafeInteger)||JSON.stringify(asset).length>200000)throw new Error('Invalid retained raster asset or metadata.');
  const derived=[m.origin[0],m.origin[1]+m.height*m.resolution[1],m.origin[0]+m.width*m.resolution[0],m.origin[1]];
  if(!m.resolution.every(Number.isFinite)||m.bands!==1||m.bounds.some((v,i)=>Math.abs(v-derived[i])>1e-9)||![m.blockWidth,m.blockHeight,m.bytesPerPixel].every(v=>Number.isSafeInteger(v)&&v>0)||(asset.source.url?asset.source.bytes<0||!/^https?:\/\/\S{1,2000}$/.test(asset.source.url):asset.source.bytes<8)||asset.source.filename.length>255||(asset.source.sha256!==undefined&&!/^[a-f0-9]{64}$/.test(asset.source.sha256))||!Number.isFinite(asset.source.lastModified)||!asset.source.metadata||asset.window[0]<0||asset.window[1]<0||Math.ceil((asset.window[2]-asset.window[0])/(asset.streamed?.factor??1))!==m.width||Math.ceil((asset.window[3]-asset.window[1])/(asset.streamed?.factor??1))!==m.height||(asset.streamed!==undefined&&(!Number.isSafeInteger(asset.streamed.factor)||asset.streamed.factor<2||!['sum','mean'].includes(asset.streamed.how))))throw new Error('Raster bounds, dimensions or source window are inconsistent.');
}
/** A WINDOW THAT CAN BE READ AGAIN (experiment 209): from the address it was read at, or from a GeoTIFF whose digest was
 *  kept. Such a window travels as its source, window and digest, not its bytes, because a country's window from each of
 *  three sources is hundreds of megabytes; on another device it is read again and refused if it differs. */
/** FILES CHOSEN THIS SESSION, by digest (2026-11-19): a streamed raster read from a file on this device is read again from it
 *  at each run, and a browser keeps no file between sessions, so after a reload it is chosen again in Raster input. */
export const sessionFiles=new Map<string,File>();
/** THE KEY A CHOSEN FILE IS HELD UNDER: the source file's digest where one was taken, else the kept window's own, so a
 *  window first read at an address can be served by a copy on this device once that copy has given the window again. */
export const sourceKey=(asset:RasterAsset):string=>asset.source.sha256??asset.sha256;
/** THE SOURCE FILE CHOSEN AGAIN for a streamed raster whose kept copy is on this device: checked against the file first
 *  chosen, then held for this session's runs. */
export async function chooseStreamedFile(asset:RasterAsset,file:File,say?:(text:string)=>void):Promise<void>{
  const {fileDigest}=await import('./sha256-stream.js');
  if(file.size!==asset.source.bytes||await fileDigest(file,(read,of)=>say?.(`Checking ${file.name}: ${Math.round(100*read/of)}% read…`))!==asset.source.sha256)
    throw new Error(`That is not the file this raster was read from: ${asset.source.filename}, ${asset.source.bytes.toLocaleString('en')} bytes, was expected.`);
  sessionFiles.set(asset.source.sha256!,file);
}
/** A RUN THAT NEEDS ITS SOURCE FILE AGAIN, said as itself so the stop message can offer to choose it (2026-11-20). */
export class StreamedFileNeeded extends Error{
  constructor(readonly asset:RasterAsset,readonly remembered:boolean){
    super(remembered
      ?`Allow Fieldwork to read ${asset.source.filename} again: this raster is too large to keep on the device, so each run reads it from the file.`
      :`Choose ${asset.source.filename} again: this raster is too large to keep on the device, so each run reads it from the file, `
        +'and this browser keeps no file between sessions.');
    this.name='StreamedFileNeeded';
  }
}
/** A REMEMBERED FILE IS CHECKED BY ITS SIZE AND MODIFICATION TIME against those recorded when its digest was taken: reading
 *  12.3 GB again for its digest is a minute each session. A file chosen afresh is checked by its digest, as before. */
const sameFile=(asset:RasterAsset,file:File)=>file.size===asset.source.bytes&&(!asset.source.lastModified||file.lastModified===asset.source.lastModified);
/** Where a streamed raster's full cells are read from at a run: its address, the file chosen this session, or the file
 *  this device remembers, where the browser still allows reading it. */
export async function streamedSource(asset:RasterAsset):Promise<string|File>{
  // A COPY ON THIS DEVICE COMES BEFORE THE ADDRESS (2026-11-23): once a local file has given this window again, byte for
  // byte, the run reads its full cells from that file rather than asking the host for them at every run.
  const held=sessionFiles.get(sourceKey(asset));
  if(held)return held;
  if(asset.source.url)return asset.source.url;
  const digest=asset.source.sha256;
  const {rememberedHandle}=await import('./file-handles.js');
  const handle=digest?await rememberedHandle(digest):undefined;
  if(handle&&digest){
    try{
      if((await handle.queryPermission?.({mode:'read'}))==='granted'){
        const again=await handle.getFile();
        if(sameFile(asset,again)){sessionFiles.set(digest,again);return again;}
      }
    }catch{/* moved or gone: chosen again below */}
  }
  throw new StreamedFileNeeded(asset,!!handle);
}
/** THE FILE AGAIN, FROM A CLICK: the remembered one, once allowed, or one chosen now and checked by digest, then remembered
 *  where the browser can. Called from the stop message's button, which is the click the browser asks for. */
export async function fileAgainByClick(asset:RasterAsset,say?:(text:string)=>void):Promise<void>{
  const digest=asset.source.sha256;if(!digest)throw new Error('This raster has no recorded digest to check a file against.');
  const {rememberedHandle,rememberHandle,handlePicker}=await import('./file-handles.js');
  const handle=await rememberedHandle(digest);
  if(handle?.requestPermission&&(await handle.requestPermission({mode:'read'}))==='granted'){
    const again=await handle.getFile();
    if(sameFile(asset,again)){sessionFiles.set(digest,again);return;}
  }
  const picker=handlePicker();
  if(picker){
    const [chosen]=await picker({types:[{description:'GeoTIFF',accept:{'image/tiff':['.tif','.tiff']}}]});
    if(!chosen)throw new Error('No file was chosen.');
    await chooseStreamedFile(asset,await chosen.getFile(),say);
    await rememberHandle(digest,chosen);
    return;
  }
  // This module is also typed for workers, which have no document; the picker runs only on the page.
  type FileInput={type:string;accept:string;files:{[i:number]:File}|null;onchange:(()=>void)|null;click():void};
  const input=(globalThis as unknown as {document:{createElement(tag:'input'):FileInput}}).document.createElement('input');
  input.type='file';input.accept='.tif,.tiff,image/tiff';
  const file=await new Promise<File|undefined>(resolve=>{input.onchange=()=>resolve(input.files?.[0]);input.click();});
  if(!file)throw new Error('No file was chosen.');
  await chooseStreamedFile(asset,file,say);
}
export const rereadable=(asset:RasterAsset):boolean=>!!asset.source.url||/^[a-f0-9]{64}$/.test(asset.source.sha256??'');
/** READ THE KEPT WINDOW AGAIN, from its address or from the file chosen, and refuse it unless it is the window kept. */
export async function rereadWindow(asset:RasterAsset,file?:File,say?:(text:string)=>void):Promise<Uint8Array<ArrayBuffer>>{
  // A WINDOW KEPT WHOLE PAST TODAY'S LIMITS IS NOT READ WHOLE AGAIN (2026-11-20): DR Congo's 2.1 GB could not be read back.
  const {overWindowLimit}=await import('./raster.js');
  if(!asset.streamed&&overWindowLimit(asset.source.metadata,asset.window))
    throw new Error(`This window was kept whole, ${(asset.bytes/1e9).toFixed(1)} GB, more than a tab reads back. Choose ${asset.source.filename} `
      +'above and Apply: a window this size is now streamed, a reduced copy kept and the full cells read at each run.');
  const {inspectRaster,readRasterWindow,encodeRaster}=await import('./raster.js');
  const {contentHash}=await import('./project-files.js');
  let from:File|string;
  if(file){
    // Read a slice at a time: the whole file in memory failed on a 12 GB grid (2026-11-13).
    const {fileDigest}=await import('./sha256-stream.js');
    if(asset.source.sha256&&(file.size!==asset.source.bytes||await fileDigest(file,(read,of)=>say?.(`Checking ${file.name}: ${Math.round(100*read/of)}% read…`))!==asset.source.sha256))
      throw new Error(`That is not the file this window was read from: ${asset.source.filename}, ${asset.source.bytes.toLocaleString('en')} bytes, was expected. Nothing was kept.`);
    from=file;
  }else if(asset.source.url)from=asset.source.url;
  else throw new Error(`Choose ${asset.source.filename} on this device to read the window again.`);
  // A STREAMED RASTER'S KEPT COPY is made again the way it was made: reduced in blocks from the full window.
  const {reduceWindow}=await import('./raster.js');
  const metadata=await inspectRaster(from),bytes=encodeRaster(asset.streamed
    ?await reduceWindow(from,metadata,asset.window,asset.streamed.factor,asset.streamed.how,(rows,of)=>say?.(`Reading the window again: ${Math.round(100*rows/of)}%…`))
    :await readRasterWindow(from,metadata,asset.window));
  // WHICH CASE IT IS (2026-11-23): a file chosen here that gives a different window is a different file, not a changed
  // source. Said apart, because a practitioner holding several epochs of one grid meets the first and not the second.
  if(bytes.length!==asset.bytes||await contentHash(bytes)!==asset.sha256)
    throw new Error(file
      ?`${file.name} gives a different window from the one that was kept, so it is not the file this window was read from. Nothing was kept.`
      :'The window read again is not the window that was kept: the source has changed since. Nothing was kept.');
  // HELD ONLY ONCE IT HAS PASSED THAT CHECK: a file giving a different window was held for the session's runs before it.
  if(file&&asset.streamed)sessionFiles.set(sourceKey(asset),file);
  return bytes;
}
export async function loadRaster(asset:RasterAsset,area:AreaValue):Promise<RasterGrid>{
  // A SAVED WINDOW IS NOT REFUSED BY TODAY'S KEEPING LIMITS (2026-11-20): one kept whole before them is said to be off the
  // device, and Raster input reads it again, streamed.
  validateRasterAsset(asset);rasterWindow(asset.metadata,area.boundary,0,false);
  const grid=await loadRasterAsset(asset);
  rasterWindow(grid.metadata,area.boundary,0,false);
  return {...grid,boundary:structuredClone(area.boundary)};
}
/** Preview may need to repair a boundary outside the retained window. */
export async function loadRasterAsset(asset:RasterAsset):Promise<RasterGrid>{
  validateRasterAsset(asset);
  // NOT ON THIS DEVICE YET, where the window travels as its source: said as what to do, not as a missing file.
  let bytes:Uint8Array<ArrayBuffer>;
  try{bytes=await verifiedProjectFile({...asset,asset});}
  catch(error){if(!rereadable(asset))throw error;
    throw new Error(`The window is not on this device yet. In Raster input, read it again from ${asset.source.url?new URL(asset.source.url).hostname:asset.source.filename}.`);}
  // READ IN PLACE (2026-11-13): the kept window is Fieldwork's own GeoTIFF, so its cells are taken as they lie in the bytes.
  const buffer=bytes.byteOffset===0&&bytes.byteLength===bytes.buffer.byteLength?bytes.buffer:bytes.slice().buffer;
  const blob=buffer,actual=await inspectRaster(blob);
  if(actual.width!==asset.metadata.width||actual.height!==asset.metadata.height||actual.bounds.some((v,i)=>Math.abs(v-asset.metadata.bounds[i])>1e-9))throw new Error('Retained GeoTIFF dimensions or bounds do not match the project metadata.');
  const [w,s,e,n]=actual.bounds;rasterWindow(actual,{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
  const {keptCells}=await import('./raster.js');
  const values=await keptCells(buffer,actual)??(await readRasterWindow(blob,actual,[0,0,actual.width,actual.height])).values;
  return {metadata:actual,values,asset};
}
export function rasterReceipt(node:WorkflowNode<'raster_input'|'clip_raster'>,grid:RasterGrid,area:AreaValue,runId:string,sourceId?:string):Receipt{
  const activity=`<urn:fieldwork:run:${runId}:raster:${node.id}>`,result=`<urn:fieldwork:run:${runId}:output:${node.id}>`,source=sourceId?`<urn:fieldwork:run:${runId}:output:${sourceId}>`:`<urn:sha256:${grid.asset.sha256}>`;
  const original=`<urn:fieldwork:run:${runId}:source-descriptor:${node.id}>`;
  const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix dcat: <http://www.w3.org/ns/dcat#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n@prefix dct: <http://purl.org/dc/terms/>.\n'+
    `${activity} a fw:${node.type==='clip_raster'?'RasterClipping':'RasterInputReading'}, prov:Activity; prov:used ${source}, <${area.areaId}>; fw:rasterMaskMethod "${grid.mask?grid.mask.method:'bounding-window'}"; fw:rasterMaskConvention "${grid.mask?grid.mask.method==='all-touched'?'positive-area/1':'cell-centre/1':'native-window/1'}"${grid.mask?`; fw:rasterMaskMarginPixels "${(grid.mask.marginPixels||0).toFixed(3)}"^^xsd:decimal`:''}.\n${result} a fw:RasterDataset, dcat:Dataset, prov:Entity; prov:wasGeneratedBy ${activity}; prov:wasDerivedFrom ${source}; fw:rasterWidth ${grid.metadata.width}; fw:rasterHeight ${grid.metadata.height}.\n<${area.areaId}> geo:hasGeometry <${area.geometryId}>.\n<${area.geometryId}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(area.boundary))}^^geo:wktLiteral.\n`+
    `${result} fw:rasterCRS <http://www.opengis.net/def/crs/EPSG/0/4326>; fw:pixelSizeX ${grid.metadata.resolution[0]}; fw:pixelSizeY ${grid.metadata.resolution[1]}.\n`+
    (grid.mask&&grid.boundary?`${activity} fw:clipGeometry <urn:fieldwork:run:${runId}:cutline:${node.id}>; prov:used <urn:fieldwork:run:${runId}:cutline:${node.id}>.\n<urn:fieldwork:run:${runId}:cutline:${node.id}> a geo:Geometry; ${geometryByReference(grid.boundary)}.\n`:'')+
    (sourceId?'':`${source} a fw:RasterDataset; fw:sha256 "${grid.asset.sha256}"; prov:wasDerivedFrom ${original}; fw:sourcePixelWindow ${JSON.stringify(grid.asset.window.join(','))}.\n${original} a fw:LocalFileDescriptor; dct:title ${JSON.stringify(grid.asset.source.filename)}; fw:sourceBytes ${grid.asset.source.bytes}; fw:rasterWidth ${grid.asset.source.metadata.width}; fw:rasterHeight ${grid.asset.source.metadata.height}.\n`)+
    (sourceId?`${original} a fw:LocalFileDescriptor. ${result} prov:wasDerivedFrom ${original}.\n`:'')+rasterProvenanceN3(original,grid.asset.provenance)+
    (grid.mask?`${activity} fw:rasterMarginPixels ${grid.mask.marginPixels||0}. ${result} fw:validCellCount ${grid.mask.valid}; fw:insideCellCount ${grid.mask.inside}.\n`:'');
  // AN AREA REACHING PAST THE RASTER, as a data issue about the raster (2026-11-12): said, never refused.
  const overhang=rasterOverhang(grid.metadata,area.boundary);
  const beyond=overhang.length?issueFacts(activity,source,`urn:fieldwork:run:${runId}:raster:${node.id}`,
    [{kind:'AreaBeyondRaster',says:overhangSentence(overhang)}]):'';
  // A STREAMED RASTER, SAID (2026-11-19): what is kept and drawn is reduced; Sample raster reads the full cells.
  const streamed=grid.asset.streamed&&!sourceId?`${activity} fw:keptReduction "blocks of ${grid.asset.streamed.factor} by ${grid.asset.streamed.factor} cells, `
    +`${grid.asset.streamed.how==='sum'?'each summed':'each averaged'}; the full window too large to keep, read from its source in strips by Sample a raster".\n`:'';
  const all=facts+beyond+streamed;
  return {nodeId:node.id,kind:'computation',facts:all,input:all,rules:'',conclusions:[],method:grid.mask?`Mask native cells using ${grid.mask.method} inclusion and an outer margin of ${grid.mask.marginPixels||0} native pixels. Map hides pixel portions outside this footprint; stored values are unchanged. No resampling, population total or fractional-cell weighting.`:'Use a locally retained native-resolution GeoTIFF window. Original file descriptors and extracted source metadata accompany the raster asset.'};
}
export {clipRaster};
