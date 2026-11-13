import {validateRasterProvenance,rasterProvenanceN3,WORLDPOP_BOTSWANA} from '../build/raster-provenance.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser} from 'n3';
import {writeArrayBuffer} from 'geotiff';
import {inspectRaster,encodeRaster,readRasterWindow,rasterWindow,clipRaster,rasterOverhang,overhangSentence} from '../build/raster.js';
import {rasterReceipt} from '../build/raster-workflow.js';
import {contentHash,projectFiles,fileByteLimit} from '../build/project-files.js';
import {decodeFile} from '../build/evidence.js';
import {createEncryptedPackage,readEncryptedPackage} from '../build/encrypted-package.js';
import {blankWorkflow} from '../build/study-area.js';
// Old Naledi's workflow was only a container to package here; it retired on 2026-11-11, and an empty one serves.
const oldNalediWorkflow=()=>({...blankWorkflow(),nodes:[],edges:[]});
import {validateWorkflow} from '../build/core.js';
// No data is NaN in a compact raster (2026-11-13); read as null here, as these checks were written.
const cell=v=>v===undefined||Number.isNaN(v)?null:v,cells=a=>Array.from(a,cell);
// GeoTIFF.js BlobSource uses the browser FileReader API; emulate only that API in Node.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onload({target:this});},error=>{this.error=error;this.onerror(error);});}};
const metadata={width:4,height:4,bands:1,bounds:[25,-25,26,-24],origin:[25,-24],resolution:[0.25,-0.25],crs:'EPSG:4326',rasterType:'PixelIsArea',noData:'NaN',bits:64,sampleFormat:3,compression:1,blockWidth:4,blockHeight:4,bytesPerPixel:8,geoKeys:{},gdal:null,band:null,description:''};
const boundary={type:'Polygon',coordinates:[[[25,-24],[26,-24],[25,-25],[25,-24]]]};
test('clip parameters survive portable projects and evidence distinguishes cutline from study area',async()=>{
 const {grid,bytes}=await fixture(),w=oldNalediWorkflow(),cutline={geometry:boundary,selectionMode:'polygon'};
 w.nodes.push({id:'raster',type:'raster_input',x:0,y:0,params:{label:'Raster',asset:grid.asset}},{id:'clip',type:'clip_raster',x:0,y:0,params:{label:'Clip',method:'all-touched',marginPixels:0,cutline}});
 const zip=await createEncryptedPackage(w,new Map([[grid.asset.sha256,bytes]]),'independent cutline passphrase'),restored=await readEncryptedPackage(zip,'independent cutline passphrase',validateWorkflow);
 assert.deepEqual(restored.workflow.nodes.find(n=>n.id==='clip').params.cutline,cutline);assert.equal(restored.workflow.manifest.inventory.nodes.find(n=>n.id==='clip').geometry,true);
 assert.deepEqual(restored.workflow.nodes.find(n=>n.id==='clip').params,w.nodes.at(-1).params);for(const marginPixels of [-1,1.1]){const invalid=structuredClone(w);invalid.nodes.at(-1).params.marginPixels=marginPixels;assert.throws(()=>validateWorkflow(invalid),/margin/);}
 const area={boundary:{type:'Polygon',coordinates:[[[25,-24],[26,-24],[26,-25],[25,-25],[25,-24]]]},areaId:'urn:area',geometryId:'urn:area-geometry'},receipt=rasterReceipt(w.nodes.at(-1),clipRaster(grid,boundary),area,'independent','raster');
 const quads=new Parser().parse(receipt.facts),cutlineQuad=quads.find(q=>q.predicate.value==='urn:fieldwork:clipGeometry');assert.ok(cutlineQuad);
 const wkt=subject=>quads.find(q=>q.subject.value===subject&&q.predicate.value==='http://www.opengis.net/ont/geosparql#asWKT').object.value;
 assert.notEqual(wkt(cutlineQuad.object.value),wkt('urn:area-geometry'));const bad=structuredClone(w);bad.nodes.at(-1).params.cutline.geometry={type:'Point',coordinates:[25,-24]};assert.throws(()=>validateWorkflow(bad),/polygon/i);
});
async function fixture(){const values=[0,1.25,2,3,4,null,6,7,8,9,10,11,12,13,14,15],bytes=encodeRaster({metadata,values}),actual=await inspectRaster(new Blob([bytes])),asset={sha256:await contentHash(bytes),bytes:bytes.length,filename:'window.tif',mediaType:'image/tiff',metadata:actual,source:{filename:'original.tif',bytes:bytes.length,lastModified:0,metadata:actual},window:[0,0,4,4]};return {grid:{metadata:actual,values,asset},bytes};}
test('GeoTIFF round trip preserves zero, floating values, NoData and native georeferencing',async()=>{const {grid,bytes}=await fixture(),r=await readRasterWindow(new Blob([bytes]),grid.metadata,[0,0,4,4]);assert.deepEqual(cells(r.values),grid.values);assert.deepEqual(r.metadata.bounds,metadata.bounds);assert.equal(r.metadata.crs,'EPSG:4326');});
test('all-touched retains partial edge cells and tiny islands without inventing missing data',async()=>{
 const {grid}=await fixture(),diagonal={type:'Polygon',coordinates:[[[25,-24],[25.8,-24],[25,-24.8],[25,-24]]]};
 const center=clipRaster(grid,diagonal),touched=clipRaster(grid,diagonal,{method:'all-touched'});
 assert.equal(center.mask.inside,6);assert.equal(touched.mask.inside,10);assert.equal(cell(center.values[3]),null);assert.equal(cell(touched.values[3]),3);assert.equal(cell(touched.values[5]),null);assert.equal(cell(touched.values[0]),0);
 const island={type:'Polygon',coordinates:[[[25.05,-24.05],[25.075,-24.05],[25.05,-24.075],[25.05,-24.05]]]};assert.equal(clipRaster(grid,island).mask.inside,0);assert.equal(clipRaster(grid,island,{method:'all-touched'}).values[0],0);
 const decoded=await inspectRaster(new Blob([encodeRaster(touched)])),restored=await readRasterWindow(new Blob([encodeRaster(touched)]),decoded,[0,0,4,4]);assert.deepEqual(cells(restored.values),cells(touched.values));assert.match(decoded.description,/all-touched/);
});
test('pixel margin uses source data, honors holes and budgets, and requires real source coverage',async()=>{
 const {grid}=await fixture(),inner={type:'Polygon',coordinates:[[[25.275,-24.275],[25.675,-24.275],[25.275,-24.675],[25.275,-24.275]]]};
 const noMargin=clipRaster(grid,inner,{method:'all-touched'}),margin=clipRaster(grid,inner,{method:'all-touched',marginPixels:.25});assert.ok(margin.mask.inside>noMargin.mask.inside);assert.equal(cell(margin.values[0]),0);
 for(const r of [noMargin,margin,clipRaster(grid,inner,{method:'all-touched',marginPixels:1})]){const x=Math.round((r.metadata.origin[0]-grid.metadata.origin[0])/.25),y=Math.round((r.metadata.origin[1]-grid.metadata.origin[1])/-.25);for(let i=0;i<r.values.length;i++)if(cell(r.values[i])!==null)assert.equal(cell(r.values[i]),cell(grid.values[(Math.floor(i/r.metadata.width)+y)*4+i%r.metadata.width+x]));}
 const outer=[[25.01,-24.01],[25.99,-24.01],[25.99,-24.99],[25.01,-24.99],[25.01,-24.01]],hole=[[25.2,-24.2],[25.55,-24.2],[25.55,-24.55],[25.2,-24.55],[25.2,-24.2]],filled={...grid,values:Array.from({length:16},(_,i)=>i)};
 const h=clipRaster(filled,{type:'Polygon',coordinates:[outer,hole]},{method:'all-touched'});assert.equal(cell(h.values[5]),null);assert.equal(cell(h.values[9]),9);assert.deepEqual(cells(clipRaster(filled,{type:'MultiPolygon',coordinates:[[outer,hole]]},{method:'all-touched'}).values),cells(h.values));
 // A margin past the raster's edge is cut to the raster, never filled with made-up cells (2026-11-12).
 {const edge=clipRaster(grid,boundary,{method:'all-touched',marginPixels:1});assert.ok(edge.metadata.width<=grid.metadata.width&&edge.metadata.height<=grid.metadata.height);}for(const marginPixels of [-1,1.1,NaN,Infinity])assert.throws(()=>clipRaster(grid,inner,{marginPixels}),/margin/);
});
test('polygon clipping preserves source and masks cell centers including holes and multipart areas',async()=>{const {grid}=await fixture(),before=structuredClone(grid),clipped=clipRaster(grid,boundary);assert.equal(cell(clipped.values[0]),0);assert.equal(cell(clipped.values[1]),1.25);assert.equal(cell(clipped.values[5]),null);assert.equal(cell(clipped.values[15]),null);assert.deepEqual(grid,before);assert.equal(clipped.mask.inside,10);assert.equal(clipped.mask.valid,9);const outer=[[25,-24],[26,-24],[26,-25],[25,-25],[25,-24]],hole=[[25.05,-24.05],[25.2,-24.05],[25.2,-24.2],[25.05,-24.2],[25.05,-24.05]],holes=clipRaster(grid,{type:'Polygon',coordinates:[outer,hole]});assert.equal(cell(holes.values[0]),null);const multi=clipRaster(grid,{type:'MultiPolygon',coordinates:[[outer,hole]]});assert.deepEqual(cells(multi.values),cells(holes.values));const out=await readRasterWindow(new Blob([encodeRaster(clipped)]),clipped.metadata,[0,0,4,4]);assert.deepEqual(cells(out.values),cells(clipped.values));});
test('window bounds, decoding budgets and smaller native-grid crops are enforced',async()=>{const {grid}=await fixture();{const past={type:'Polygon',coordinates:[[[24,-24],[26,-24],[26,-25],[24,-24]]]};
  // An area reaching past the raster gets the part the raster covers, and says how far past which edge (2026-11-12).
  const w=rasterWindow(metadata,past);assert.ok(w[0]>=0&&w[1]>=0&&w[2]<=metadata.width&&w[3]<=metadata.height);
  assert.ok(rasterOverhang(metadata,past).length>0);assert.match(overhangSentence(rasterOverhang(metadata,past)),/reaches past this raster/);
  assert.deepEqual(rasterOverhang(metadata,boundary),[]);
  assert.throws(()=>rasterWindow(metadata,{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}),/do not overlap/);}assert.throws(()=>rasterWindow({...metadata,blockWidth:20000,blockHeight:20000},boundary),/decoding budget/);const small=clipRaster(grid,{type:'Polygon',coordinates:[[[25.25,-24.25],[25.5,-24.25],[25.5,-24.5],[25.25,-24.5],[25.25,-24.25]]]});assert.deepEqual(small.metadata.origin,[25.25,-24.25]);assert.equal(small.values.length,1);assert.equal(cell(small.values[0]),null);});
test('raster assets are complete, digest-checked portable encrypted project contents',async()=>{const {grid,bytes}=await fixture(),w=oldNalediWorkflow();w.nodes.push({id:'raster',type:'raster_input',x:0,y:0,params:{label:'Raster',asset:grid.asset}});const files=new Map([[grid.asset.sha256,bytes]]),password='raster test passphrase',zip=await createEncryptedPackage(w,files,password),result=await readEncryptedPackage(zip,password,validateWorkflow);assert.deepEqual(result.files,files);assert.equal(result.workflow.manifest.inventory.assets[0].mediaType,'image/tiff');await assert.rejects(()=>createEncryptedPackage(w,new Map(),password));const bad=new Uint8Array(bytes);bad[100]^=1;await assert.rejects(()=>createEncryptedPackage(w,new Map([[grid.asset.sha256,bad]]),password),/checksum/);const receipt=rasterReceipt({id:'clip',type:'clip_raster',params:{label:'Clip',method:'cell-center'}},clipRaster(grid,boundary),{boundary,areaId:'urn:area',geometryId:'urn:geometry'},'trial','raster');assert.ok(new Parser().parse(receipt.facts).length>10);assert.match(receipt.facts,/RasterClipping/);});

// A POINT-REGISTERED GRID IS NO LONGER REFUSED (experiment 198, 2026-11-09): it is read as the cells around its nodes,
// and tests/raster-point-registration.test.mjs holds that. An unsupported CRS still is.
test('an unsupported CRS is rejected before acquisition',async()=>{for(const keys of [{GeographicTypeGeoKey:4269,GTRasterTypeGeoKey:1}]){const bytes=writeArrayBuffer(new Float64Array([0]),{width:1,height:1,BitsPerSample:[64],SampleFormat:[3],ModelPixelScale:[1,1,0],ModelTiepoint:[0,0,0,25,-24,0],GTModelTypeGeoKey:2,...keys});await assert.rejects(()=>inspectRaster(new Blob([bytes])),/EPSG:4326|PixelIsArea/);}});

test('source provenance uses safe bounded metadata, standard RDF and preserves existing assets',async()=>{validateRasterProvenance(undefined);validateRasterProvenance(WORLDPOP_BOTSWANA);assert.throws(()=>validateRasterProvenance({sourceURL:'javascript:alert(1)'}),/HTTP/);assert.throws(()=>validateRasterProvenance({citation:'x'.repeat(4001)}),/length/);assert.throws(()=>validateRasterProvenance({unexpected:'x'}));const facts='@prefix dct:<http://purl.org/dc/terms/>. @prefix dcat:<http://www.w3.org/ns/dcat#>. @prefix fw:<urn:fieldwork:>. '+rasterProvenanceN3('<urn:source>',{...WORLDPOP_BOTSWANA,title:'Title "quoted"\nline'});assert.ok(new Parser().parse(facts).some(q=>q.predicate.value.endsWith('bibliographicCitation')));const {grid,bytes}=await fixture();grid.asset.provenance=WORLDPOP_BOTSWANA;const w=oldNalediWorkflow();w.nodes.push({id:'r',type:'raster_input',x:0,y:0,params:{label:'Source',asset:grid.asset}});const zip=await createEncryptedPackage(w,new Map([[grid.asset.sha256,bytes]]),'provenance test passphrase');const restored=await readEncryptedPackage(zip,'provenance test passphrase',validateWorkflow);assert.deepEqual(restored.workflow.nodes.find(n=>n.id==='r').params.asset.provenance,WORLDPOP_BOTSWANA);});

test('long Unicode citation in exported TIFF preserves header, source distinction and pixels',async()=>{const {grid}=await fixture();grid.asset.provenance={citation:'\u00e9\u4eba'.repeat(1500),sourceURL:'https://example.org/source'};const encoded=encodeRaster(grid),m=await inspectRaster(new Blob([encoded])),description=JSON.parse(m.description.replace(/\x00+$/,''));assert.equal(description.source.citation,grid.asset.provenance.citation);assert.equal(description.embeddedBy,'Fieldwork');assert.match(description.sourceMetadataOrigin,/separate from original/);assert.deepEqual(description.originalRasterMetadata,grid.asset.source.metadata);const decoded=await readRasterWindow(new Blob([encoded]),m,[0,0,4,4]);assert.deepEqual(cells(decoded.values),cells(grid.values));});

test('a cutline running exactly along a cell border does not include the cell outside it',async()=>{
  // The convention is positive area: a cell joins the mask when the cutline covers part of
  // its area or crosses its interior, not when an edge merely grazes its border. Measured
  // against GDAL ALL_TOUCHED in the Validation Lab; see docs/experiments/29-raster-edge-inclusion.md.
  const {grid}=await fixture();
  const {origin,resolution}=grid.metadata;
  const edge=(column,row)=>[origin[0]+column*resolution[0],origin[1]+row*resolution[1]];
  // A rectangle whose sides sit exactly on the borders of cells 1..2 in both directions.
  const aligned={type:'Polygon',coordinates:[[edge(1,1),edge(3,1),edge(3,3),edge(1,3),edge(1,1)]]};
  const clipped=clipRaster(grid,aligned,{method:'all-touched',marginPixels:0});
  assert.equal(clipped.metadata.width,2,'the window covers only the cells the cutline encloses');
  assert.equal(clipped.metadata.height,2);
  assert.equal(clipped.mask.inside,4,'four enclosed cells, and none of the eight neighbours');
  // A cutline inset inside one cell must still include that cell, and only that cell.
  const inside={type:'Polygon',coordinates:[[edge(1.25,1.25),edge(1.75,1.25),edge(1.75,1.75),edge(1.25,1.75),edge(1.25,1.25)]]};
  assert.equal(clipRaster(grid,inside,{method:'all-touched'}).mask.inside,1);
});
test('a kept window past the old 5 MB and 10 MB limits validates and round trips through an encrypted package',async()=>{
  // 2026-11-12: a window was held to 5 MB as a file and to 10 MB with the project's PDFs, numbers from before the cell cap
  // was measured. 2,048 by 2,048 cells of 4 bytes is about 16.8 MB, past both and well inside the cap.
  const side=2048,m={...metadata,width:side,height:side,bounds:[25,-25,26,-24],resolution:[1/side,-1/side],bits:32,bytesPerPixel:4,blockWidth:side,blockHeight:side};
  const values=Array.from({length:side*side},(_,i)=>i%97===0?null:(i%1000)/4),bytes=encodeRaster({metadata:m,values});
  assert.ok(bytes.length>10_000_000&&bytes.length<side*side*4+1_000_000,`${bytes.length} bytes, 4 a cell`);
  const actual=await inspectRaster(new Blob([bytes])),asset={sha256:await contentHash(bytes),bytes:bytes.length,filename:'window.tif',mediaType:'image/tiff',metadata:actual,source:{filename:'original.tif',bytes:bytes.length,lastModified:0,metadata:actual},window:[0,0,side,side]};
  const w=oldNalediWorkflow();w.nodes.push({id:'raster',type:'raster_input',x:0,y:0,params:{label:'Raster',asset}});
  assert.equal(projectFiles(validateWorkflow(w)).size,1);
  const files=new Map([[asset.sha256,bytes]]),password='large window passphrase',restored=await readEncryptedPackage(await createEncryptedPackage(w,files,password),password,validateWorkflow);
  assert.deepEqual(restored.files.get(asset.sha256),bytes);
  const base64=Buffer.from(bytes).toString('base64');
  assert.throws(()=>decodeFile(base64),/oversized/);
  assert.equal(decodeFile(base64,fileByteLimit('image/tiff')).length,bytes.length);
});
