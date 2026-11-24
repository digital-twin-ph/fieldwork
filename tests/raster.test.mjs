import {createHash} from 'node:crypto';
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
 const wkt=subject=>quads.find(q=>q.subject.value===subject&&q.predicate.value==='urn:fieldwork:sha256')?.object.value;
 const digestOf=g=>createHash('sha256').update(JSON.stringify(g)).digest('hex');assert.equal(wkt(cutlineQuad.object.value),digestOf(boundary),'the receipt names the cutline');assert.notEqual(wkt(cutlineQuad.object.value),digestOf(area.boundary),'and not the study area');const bad=structuredClone(w);bad.nodes.at(-1).params.cutline.geometry={type:'Point',coordinates:[25,-24]};assert.throws(()=>validateWorkflow(bad),/polygon/i);
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
  assert.throws(()=>rasterWindow(metadata,{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}),/do not overlap/);}assert.throws(()=>rasterWindow({...metadata,blockWidth:20000,blockHeight:20000},boundary),/GB to decode/);const small=clipRaster(grid,{type:'Polygon',coordinates:[[[25.25,-24.25],[25.5,-24.25],[25.5,-24.5],[25.25,-24.5],[25.25,-24.25]]]});assert.deepEqual(small.metadata.origin,[25.25,-24.25]);assert.equal(small.values.length,1);assert.equal(cell(small.values[0]),null);});
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

test('a window read in bands, saying how far it has got, gives the cells a whole read gives',async()=>{
  const {writeGeoTiff}=await import('../build/raster.js');
  const width=2000,height=1500,cells=new Float32Array(width*height).map((_,i)=>i%97===0?NaN:i*0.5);
  const blob=new Blob([writeGeoTiff(cells,width,height,[30,-1],[0.001,-0.001],'test')]),m=await inspectRaster(blob),window=[3,7,1900,1490];
  const whole=await readRasterWindow(blob,m,window),seen=[];
  const banded=await readRasterWindow(blob,m,window,(rows,of)=>seen.push([rows,of]));
  assert.equal(banded.values.length,whole.values.length);
  for(let i=0;i<whole.values.length;i++)if(!Object.is(banded.values[i],whole.values[i]))assert.fail(`cell ${i}: ${banded.values[i]} against ${whole.values[i]}`);
  assert.deepEqual(banded.metadata,whole.metadata);
  assert.ok(seen.length>=3,`${seen.length} reports`);
  assert.deepEqual(seen.at(-1),[1483,1483]);assert.deepEqual(seen[0],[0,1483]);
  assert.ok(seen.every(([r],i)=>i===0||r>seen[i-1][0]),'rows only rise');
});

// GHS-POP over Botswana stopped at 37% in Edge with a bare "Failed to fetch" (2026-11-17): a remote band that fails is
// tried again, one that keeps failing is said plainly, and the bands already read are kept for Apply again.
async function servedGrid(){
  const {writeGeoTiff}=await import('../build/raster.js');
  const width=600,height=900,cells=new Float32Array(width*height).map((_,i)=>i%89===0?NaN:i*0.25);
  const bytes=writeGeoTiff(cells,width,height,[30,-1],[0.001,-0.001],'test'),blob=new Blob([bytes]),m=await inspectRaster(blob);
  const window=[5,11,590,880],whole=await readRasterWindow(blob,m,window);
  const real=globalThis.fetch;let requests=0,failWhen=()=>false;
  globalThis.fetch=async(_url,init={})=>{requests++;if(failWhen(requests))throw new TypeError('Failed to fetch');
    const range=new Headers(init.headers).get('Range'),[a,b]=(range??`bytes=0-${bytes.length-1}`).slice(6).split('-').map(Number),end=Math.min(b,bytes.length-1);
    return new Response(bytes.slice(a,end+1),{status:206,headers:{'Content-Range':`bytes ${a}-${end}/${bytes.length}`,'Content-Length':String(end-a+1)}});};
  return {m,window,whole,url:`https://grid.example.org/served-${Math.random()}.tif`,setFail:f=>{failWhen=f;},requests:()=>requests,restore:()=>{globalThis.fetch=real;}};
}
const sameCells=(a,b)=>{assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i]))assert.fail(`cell ${i}: ${a[i]} against ${b[i]}`);};

test('a remote band whose connection drops is tried again, and the cells are the same',async()=>{
  const s=await servedGrid();
  try{let failed=0;s.setFail(()=>{const n=s.requests();if(n>4&&failed<2){failed++;return true;}return false;});
    const notes=[],read=await readRasterWindow(s.url,s.m,s.window,(rows,of,note)=>{if(note)notes.push(note);},1);
    sameCells(read.values,s.whole.values);
    assert.ok(notes.some(n=>/trying again \(2 of 4\)/.test(n)),notes.join(' | '));}
  finally{s.restore();}
});

test('a connection that stays down is said plainly, and Apply again carries on from what was read',async()=>{
  const s=await servedGrid();
  // DOWN FROM THE FIRST BAND ON: counted by bands read, not requests, since how many requests opening a file takes is
  // the engine's business (geotiff.js took four, terrio more; experiment 221).
  try{let down=false;s.setFail(()=>down);
    await assert.rejects(readRasterWindow(s.url,s.m,s.window,rows=>{if(rows>0)down=true;},1),
      e=>/^The connection to grid\.example\.org dropped at \d+% \(.+ rows\) and did not come back after 4 tries \(the browser said: Failed to fetch\)\. What was read is kept: press Apply again/.test(e.message)||assert.fail(e.message));
    s.setFail(()=>false);const seen=[];
    const read=await readRasterWindow(s.url,s.m,s.window,(rows,of,note)=>seen.push([rows,note]),1);
    assert.ok(seen[0][0]>0,`began at ${seen[0][0]}`);assert.match(seen[0][1],/carrying on/);
    sameCells(read.values,s.whole.values);}
  finally{s.restore();}
});

test('a file on this device is not retried',async()=>{
  const {writeGeoTiff}=await import('../build/raster.js');
  const cells=new Float32Array(100*100).fill(1),blob=new Blob([writeGeoTiff(cells,100,100,[30,-1],[0.001,-0.001],'t')]),m=await inspectRaster(blob);
  const broken=new Blob([await blob.slice(0,2000).arrayBuffer()]);let notes=0;
  await assert.rejects(readRasterWindow(broken,m,[0,0,100,100],(r,o,note)=>{if(note)notes++;},1));assert.equal(notes,0);
});

/** ONE COPY WHILE SAVING (2026-11-17): a window read into the place the saved file keeps its cells is saved without a
 *  second buffer, and the file is byte for byte the one written the ordinary way. */
test('a window read into its saved file\'s place is saved in place, to the same bytes',async()=>{
  const {writeGeoTiff,savedWindowCells}=await import('../build/raster.js');
  const width=1200,height=900,cells=new Float32Array(width*height).map((_,i)=>i%53===0?NaN:i*0.25);
  const blob=new Blob([writeGeoTiff(cells,width,height,[30,-1],[0.001,-0.001],'test')]),m=await inspectRaster(blob),window=[5,9,1100,880];
  const ordinary=encodeRaster(await readRasterWindow(blob,m,window,()=>{}));
  const into=savedWindowCells(m,window),read=await readRasterWindow(blob,m,window,()=>{},undefined,into);
  assert.equal(read.values,into,'the cells were read where they were given');
  const saved=encodeRaster(read);
  assert.equal(saved.buffer,into.buffer,'the file is the buffer the cells were read into');
  assert.deepEqual(saved,ordinary);
  // A grid whose cells lie elsewhere is copied, as before.
  assert.deepEqual(encodeRaster({...read,values:new Float32Array(read.values)}),ordinary);
});

/** A COVERAGE PLACED BY A MATRIX (2026-11-24). A GeoTIFF says where its cells sit either as a pixel scale with a
 *  tie point, or as one 4x4 ModelTransformation. Fieldwork refused the second outright and blamed a rotation, which
 *  refused every raster window pulled from a WCS -- GeoServer writes the matrix form -- and sent the reader looking
 *  for a rotation that is not in the file. Found pulling the Malaria Atlas Project's walking friction surface for
 *  the Nigeria microplanning example. What is still refused is a matrix whose CROSS TERMS turn or shear the grid,
 *  because a cell is then not a rectangle in longitude and latitude and every window, clip and sample in this
 *  prototype indexes cells by arithmetic on origin and resolution. */
const placedBy=transform=>new Blob([writeArrayBuffer(new Float32Array([1,2,3,4,5,6,7,8,9]),
  {width:3,height:3,ModelTransformation:transform,
    GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1})]);
// Row-major: [sx, shear_x, 0, x0,  shear_y, sy, 0, y0,  0,0,0,0,  0,0,0,1].
const northUp=[0.01,0,0,10, 0,-0.01,0,20, 0,0,0,0, 0,0,0,1];

test('a raster placed by an unrotated matrix is read, and says where its cells sit',async()=>{
  const m=await inspectRaster(placedBy(northUp));
  assert.deepEqual(m.origin,[10,20],'the matrix’s translation is the origin');
  assert.deepEqual(m.resolution,[0.01,-0.01],'and its scale is the resolution, y negative because rows run south');
  assert.deepEqual(m.bounds,[10,19.97,10.03,20],'so the bounds follow as they do from a scale and a tie point');
  assert.equal(m.rasterType,'PixelIsArea');
});

test('the same grid states the same placement whichever tag carries it',async()=>{
  const matrix=await inspectRaster(placedBy(northUp));
  const scaled=await inspectRaster(new Blob([writeArrayBuffer(new Float32Array([1,2,3,4,5,6,7,8,9]),
    {width:3,height:3,ModelPixelScale:[0.01,0.01,0],ModelTiepoint:[0,0,0,10,20,0],
      GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:1})]));
  // The two tags are two spellings of one placement, so nothing downstream may be able to tell them apart.
  assert.deepEqual([matrix.origin,matrix.resolution,matrix.bounds],[scaled.origin,scaled.resolution,scaled.bounds]);
});

test('a raster turned or sheared on the ground is refused, for being unfit and not for the tag',async()=>{
  for(const [what,transform] of [
    ['turned',[0.01,0.002,0,10, 0.002,-0.01,0,20, 0,0,0,0, 0,0,0,1]],
    ['sheared in x',[0.01,0.0005,0,10, 0,-0.01,0,20, 0,0,0,0, 0,0,0,1]],
    ['sheared in y',[0.01,0,0,10, 0.0005,-0.01,0,20, 0,0,0,0, 0,0,0,1]],
  ]){
    await assert.rejects(()=>inspectRaster(placedBy(transform)),
      /turned or sheared on the ground/,`a ${what} grid is refused`);
  }
});

test('floating-point dust in a matrix is not a shear',async()=>{
  // Reprojection arithmetic leaves cross terms of this order. A billionth of the cell size cannot move a cell by a
  // millimetre across any grid this prototype accepts, so it is read rather than refused.
  const m=await inspectRaster(placedBy([0.01,1e-20,0,10, -1e-20,-0.01,0,20, 0,0,0,0, 0,0,0,1]));
  assert.deepEqual(m.resolution,[0.01,-0.01]);
});
