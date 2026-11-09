import test from 'node:test';
import assert from 'node:assert/strict';
import {writeArrayBuffer} from 'geotiff';
import {inspectRaster,readRasterWindow,rasterWindow} from '../build/raster.js';
import {sampleRaster,bilinearAt} from '../build/sample-raster.js';
// GeoTIFF.js BlobSource uses the browser FileReader API; emulate only that API in Node, as tests/raster.test.mjs does.
globalThis.FileReader??=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onload({target:this});},error=>{this.error=error;this.onerror(error);});}};

/** A PUBLISHED GRID READ AT POINTS (experiment 198). A geoid grid is point-registered: each value sits at a node, so its
 *  cells start half a cell out. And a smooth field is read between the four nearest centres, as PROJ reads EGM2008. */
const grid=(rasterType)=>new Blob([writeArrayBuffer(new Float32Array([1,2,3, 4,5,6, 7,8,9]),{width:3,height:3,
  BitsPerSample:[32],SampleFormat:[3],SamplesPerPixel:[1],PhotometricInterpretation:1,
  ModelPixelScale:[1,1,0],ModelTiepoint:[0,0,0,10,20,0],GeographicTypeGeoKey:4326,GTModelTypeGeoKey:2,GTRasterTypeGeoKey:rasterType})]);

test('a point-registered grid is read as cells around its nodes, and says so',async()=>{
  const point=await inspectRaster(grid(2)),area=await inspectRaster(grid(1));
  assert.equal(point.sourceRegistration,'PixelIsPoint');
  assert.equal(area.sourceRegistration,undefined);
  assert.deepEqual(area.origin,[10,20]);
  assert.deepEqual(point.origin,[9.5,20.5],'half a cell out from the first node');
  assert.deepEqual(point.bounds,[9.5,17.5,12.5,20.5]);
});

test('a window read from a point grid keeps each value at its node',async()=>{
  const m=await inspectRaster(grid(2));
  const box={type:'Polygon',coordinates:[[[10.6,18.6],[11.4,18.6],[11.4,19.4],[10.6,19.4],[10.6,18.6]]]};
  const w=rasterWindow(m,box,0);
  const g=await readRasterWindow(grid(2),m,w);
  // The node at (11, 19) holds 5, and its cell is the one containing (11, 19).
  const pts={type:'FeatureCollection',features:[{type:'Feature',id:'p',properties:{},geometry:{type:'Point',coordinates:[11,19]}}]};
  const out=sampleRaster(pts,{...g,asset:{}},{label:'s',attribute:'v',valueUnit:'m'});
  assert.equal(out.value.features[0].properties.v,5);
});

test('bilinear reads between the four nearest centres; a missing one gives no value; an edge point is outside',async()=>{
  const m=await inspectRaster(grid(2)),g=await readRasterWindow(grid(2),m,[0,0,3,3]);
  const none=v=>v===null||!Number.isFinite(v);
  // Halfway between the nodes 5, 6, 8 and 9: their mean.
  assert.equal(bilinearAt(g,[11.5,18.5],none),7);
  // A quarter of the way from 5 towards 6, on the row of 5.
  assert.equal(bilinearAt(g,[11.25,19],none),5.25);
  assert.equal(bilinearAt(g,[9.6,20.4],none),'outside','no four nodes around it');
  const holed={...g,values:g.values.map((v,i)=>i===8?null:v)};
  assert.equal(bilinearAt(holed,[11.5,18.5],none),null);
  const pts={type:'FeatureCollection',features:[[11.5,18.5],[9.6,20.4]].map((c,i)=>({type:'Feature',id:String(i),properties:{},geometry:{type:'Point',coordinates:c}}))};
  const out=sampleRaster(pts,{...g,asset:{}},{label:'s',attribute:'v',valueUnit:'m',method:'bilinear'});
  assert.equal(out.value.features[0].properties.v,7);
  assert.deepEqual(out.counts,{sampled:1,noData:0,outside:1,unlocated:0});
});

// EXPERIMENT 198'S COMMITMENT: the canvas reads EGM2008 at the Manila gauge as pyproj did by hand, 43.009 m (the
// terrain research note, 2026-11-09). tests/fixtures/egm08-manila-cut.tif is a 24 x 24 node cut of PROJ's
// us_nga_egm08_25.tif, point-registered as the source is; read with the bilinear option Sample raster offers.
test('EGM2008 at the Manila gauge, read bilinearly, is the value pyproj gives',async()=>{
  const {readFileSync}=await import('node:fs');
  const blob=new Blob([readFileSync(new URL('./fixtures/egm08-manila-cut.tif',import.meta.url))]);
  const metadata=await inspectRaster(blob);
  assert.equal(metadata.sourceRegistration,'PixelIsPoint');
  const grid=await readRasterWindow(blob,metadata,[0,0,metadata.width,metadata.height]);
  const gauge=bilinearAt(grid,[120+58/60,14+35/60],v=>v===null||!Number.isFinite(v));
  assert.ok(Math.abs(gauge-43.009)<0.001,`EGM2008 at 14°35′ N, 120°58′ E: ${gauge}`);
});
