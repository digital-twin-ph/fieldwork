import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleRaster,cellAt,validateSampleNode,requireRunnableSample} from '../build/sample-raster.js';

// A 3x2 grid, north-up PixelIsArea: origin is the top-left corner, resolution[1] is negative.
// Cell (column,row) covers [origin.x + column, origin.x + column + 1) in x.
const metadata={width:3,height:2,bands:1,origin:[10,20],resolution:[1,-1],crs:'EPSG:4326',
  rasterType:'PixelIsArea',bounds:[10,18,13,20],noData:-9999,bits:32,sampleFormat:3,
  compression:1,blockWidth:3,blockHeight:2,bytesPerPixel:4,geoKeys:{},gdal:null,band:null,description:''};
//         column 0  1      2
// row 0:        5, -9999,  7
// row 1:        1,     2,  null   (null = masked by an earlier clip)
const grid={metadata,values:[5,-9999,7,1,2,null],asset:{}};
const at=(x,y,id='p')=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates:[x,y]}});
const layer=features=>({type:'FeatureCollection',features});
const params={label:'Sample raster at points',attribute:'elevation_m',valueUnit:'metres'};

test('a sampled value is the value of the containing cell',()=>{
  assert.deepEqual(cellAt(metadata,[10.5,19.5]),[0,0]);
  assert.deepEqual(cellAt(metadata,[12.5,18.5]),[2,1]);
  const out=sampleRaster(layer([at(10.5,19.5,'a'),at(12.5,19.5,'b'),at(11.5,18.5,'c')]),grid,params);
  assert.equal(out.value.features[0].properties.elevation_m,5);
  assert.equal(out.value.features[1].properties.elevation_m,7);
  assert.equal(out.value.features[2].properties.elevation_m,2);
  assert.equal(out.counts.sampled,3);
});

test('no-data, masked cells, points outside and unlocated points carry no value and are counted apart',()=>{
  const out=sampleRaster(layer([
    at(11.5,19.5,'nodata'),                                   // declared no-data value
    at(12.5,18.5,'masked'),                                   // null from an earlier clip
    at(99,99,'outside'),                                      // beyond the grid
    {type:'Feature',id:'unlocated',properties:{name:'unlocated'},geometry:null},
  ]),grid,params);
  for(const f of out.value.features)
    assert.ok(!Object.hasOwn(f.properties,'elevation_m'),`${f.id} must carry no value`);
  assert.equal(out.counts.noData,2,'a declared no-data and a masked cell are both no-data');
  assert.equal(out.counts.outside,1);
  assert.equal(out.counts.unlocated,1);
  assert.equal(out.counts.sampled,0);
});

test('a point on a cell boundary belongs to one cell, and the edges are the stated ones',()=>{
  // The origin corner belongs to cell (0,0); the far corner is outside, as a half-open grid.
  assert.deepEqual(cellAt(metadata,[10,20]),[0,0]);
  assert.equal(cellAt(metadata,[13,18]),null);
});

test('an attribute already on the layer is never overwritten',()=>{
  const surveyed={...at(10.5,19.5,'s'),properties:{name:'s',elevation_m:2.5}};
  assert.throws(()=>sampleRaster(layer([surveyed]),grid,params),/already has an attribute/);
});

test('an unusable attribute name is refused, but an empty one is only unfinished',()=>{
  const draft=attribute=>({id:'c',type:'sample_raster',x:0,y:0,params:{...params,attribute}});
  // Wrong whenever present, so refused even in a draft.
  for(const attribute of ['9start','has space','name'])
    assert.throws(()=>validateSampleNode(draft(attribute)),/not a usable attribute name/,
      `"${attribute}" must be refused`);
  // Absent is unfinished, not wrong: the node must stay addable before it is configured.
  assert.doesNotThrow(()=>validateSampleNode(draft('')),'an empty draft is valid');
  assert.throws(()=>requireRunnableSample(draft('')),/Name the attribute/,'but it cannot run');
});

test('a raster on another CRS is refused, since no datum shift exists',()=>{
  const other={...grid,metadata:{...metadata,crs:'EPSG:32735'}};
  assert.throws(()=>sampleRaster(layer([at(10.5,19.5)]),other,params),/EPSG:4326/);
});

test('sampling leaves the layer usable as ordinary point input',()=>{
  const out=sampleRaster(layer([at(10.5,19.5,'a')]),grid,params);
  assert.equal(out.value.type,'FeatureCollection');
  assert.equal(out.value.features[0].geometry.type,'Point');
  assert.equal(out.value.features[0].properties.name,'a','existing attributes survive');
});
