import {validateRasterProvenance,rasterProvenanceN3} from './raster-provenance.js';
import type {WorkflowNode} from './types.js';
import type {AreaValue,Receipt} from './results.js';
import type {RasterAsset,RasterGrid} from './raster.js';
import {inspectRaster,readRasterWindow,rasterWindow,clipRaster,MAX_RASTER_CELLS} from './raster.js';
import {verifiedProjectFile} from './evidence-storage.js';
import {geometryWKT,CRS84} from './study-area.js';
export function validateRasterAsset(asset:RasterAsset):void{
  validateRasterProvenance(asset?.provenance);const m=asset?.metadata;
  if(!asset||asset.mediaType!=='image/tiff'||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<8||asset.bytes>5_000_000||typeof asset.filename!=='string'||asset.filename.length>200||!m||!Number.isSafeInteger(m.width)||!Number.isSafeInteger(m.height)||m.width<1||m.height<1||m.width*m.height>MAX_RASTER_CELLS||m.crs!=='EPSG:4326'||m.rasterType!=='PixelIsArea'||!Array.isArray(m.origin)||m.origin.length!==2||!m.origin.every(Number.isFinite)||!Array.isArray(m.resolution)||m.resolution.length!==2||!(m.resolution[0]>0&&m.resolution[1]<0)||!Array.isArray(m.bounds)||m.bounds.length!==4||!m.bounds.every(Number.isFinite)||!asset.source||typeof asset.source.filename!=='string'||!Number.isSafeInteger(asset.source.bytes)||!Array.isArray(asset.window)||asset.window.length!==4||!asset.window.every(Number.isSafeInteger)||JSON.stringify(asset).length>200000)throw new Error('Invalid retained raster asset or metadata.');
  const derived=[m.origin[0],m.origin[1]+m.height*m.resolution[1],m.origin[0]+m.width*m.resolution[0],m.origin[1]];
  if(!m.resolution.every(Number.isFinite)||m.bands!==1||m.bounds.some((v,i)=>Math.abs(v-derived[i])>1e-9)||![m.blockWidth,m.blockHeight,m.bytesPerPixel].every(v=>Number.isSafeInteger(v)&&v>0)||asset.source.bytes<8||asset.source.filename.length>255||!Number.isFinite(asset.source.lastModified)||!asset.source.metadata||asset.window[0]<0||asset.window[1]<0||asset.window[2]-asset.window[0]!==m.width||asset.window[3]-asset.window[1]!==m.height)throw new Error('Raster bounds, dimensions or source window are inconsistent.');
}
export async function loadRaster(asset:RasterAsset,area:AreaValue):Promise<RasterGrid>{
  validateRasterAsset(asset);rasterWindow(asset.metadata,area.boundary);
  const grid=await loadRasterAsset(asset);
  rasterWindow(grid.metadata,area.boundary);
  return {...grid,boundary:structuredClone(area.boundary)};
}
/** Preview may need to repair a boundary outside the retained window. */
export async function loadRasterAsset(asset:RasterAsset):Promise<RasterGrid>{
  validateRasterAsset(asset);
  const bytes=await verifiedProjectFile({...asset,asset}),blob=new Blob([bytes]),actual=await inspectRaster(blob);
  if(actual.width!==asset.metadata.width||actual.height!==asset.metadata.height||actual.bounds.some((v,i)=>Math.abs(v-asset.metadata.bounds[i])>1e-9))throw new Error('Retained GeoTIFF dimensions or bounds do not match the project metadata.');
  const [w,s,e,n]=actual.bounds;rasterWindow(actual,{type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});
  const data=await readRasterWindow(blob,actual,[0,0,actual.width,actual.height]);
  return {metadata:actual,values:data.values,asset};
}
export function rasterReceipt(node:WorkflowNode<'raster_input'|'clip_raster'>,grid:RasterGrid,area:AreaValue,runId:string,sourceId?:string):Receipt{
  const activity=`<urn:fieldwork:run:${runId}:raster:${node.id}>`,result=`<urn:fieldwork:run:${runId}:output:${node.id}>`,source=sourceId?`<urn:fieldwork:run:${runId}:output:${sourceId}>`:`<urn:sha256:${grid.asset.sha256}>`;
  const original=`<urn:fieldwork:run:${runId}:source-descriptor:${node.id}>`;
  const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix geo: <http://www.opengis.net/ont/geosparql#>.\n@prefix dcat: <http://www.w3.org/ns/dcat#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n@prefix dct: <http://purl.org/dc/terms/>.\n'+
    `${activity} a fw:${node.type==='clip_raster'?'RasterClipping':'RasterInputReading'}, prov:Activity; prov:used ${source}, <${area.areaId}>; fw:rasterMaskMethod "${grid.mask?grid.mask.method:'bounding-window'}"; fw:rasterMaskConvention "${grid.mask?grid.mask.method==='all-touched'?'positive-area/1':'cell-centre/1':'native-window/1'}"${grid.mask?`; fw:rasterMaskMarginPixels "${(grid.mask.marginPixels||0).toFixed(3)}"^^xsd:decimal`:''}.\n${result} a fw:RasterDataset, dcat:Dataset, prov:Entity; prov:wasGeneratedBy ${activity}; prov:wasDerivedFrom ${source}; fw:rasterWidth ${grid.metadata.width}; fw:rasterHeight ${grid.metadata.height}.\n<${area.areaId}> geo:hasGeometry <${area.geometryId}>.\n<${area.geometryId}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(area.boundary))}^^geo:wktLiteral.\n`+
    `${result} fw:rasterCRS <http://www.opengis.net/def/crs/EPSG/0/4326>; fw:pixelSizeX ${grid.metadata.resolution[0]}; fw:pixelSizeY ${grid.metadata.resolution[1]}.\n`+
    (grid.mask&&grid.boundary?`${activity} fw:clipGeometry <urn:fieldwork:run:${runId}:cutline:${node.id}>; prov:used <urn:fieldwork:run:${runId}:cutline:${node.id}>.\n<urn:fieldwork:run:${runId}:cutline:${node.id}> a geo:Geometry; geo:asWKT ${JSON.stringify('<'+CRS84+'> '+geometryWKT(grid.boundary))}^^geo:wktLiteral.\n`:'')+
    (sourceId?'':`${source} a fw:RasterDataset; fw:sha256 "${grid.asset.sha256}"; prov:wasDerivedFrom ${original}; fw:sourcePixelWindow ${JSON.stringify(grid.asset.window.join(','))}.\n${original} a fw:LocalFileDescriptor; dct:title ${JSON.stringify(grid.asset.source.filename)}; fw:sourceBytes ${grid.asset.source.bytes}; fw:rasterWidth ${grid.asset.source.metadata.width}; fw:rasterHeight ${grid.asset.source.metadata.height}.\n`)+
    (sourceId?`${original} a fw:LocalFileDescriptor. ${result} prov:wasDerivedFrom ${original}.\n`:'')+rasterProvenanceN3(original,grid.asset.provenance)+
    (grid.mask?`${activity} fw:rasterMarginPixels ${grid.mask.marginPixels||0}. ${result} fw:validCellCount ${grid.mask.valid}; fw:insideCellCount ${grid.mask.inside}.\n`:'');
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],method:grid.mask?`Mask native cells using ${grid.mask.method} inclusion and an outer margin of ${grid.mask.marginPixels||0} native pixels. Map hides pixel portions outside this footprint; stored values are unchanged. No resampling, population total or fractional-cell weighting.`:'Use a locally retained native-resolution GeoTIFF window. Original file descriptors and extracted source metadata accompany the raster asset.'};
}
export {clipRaster};
