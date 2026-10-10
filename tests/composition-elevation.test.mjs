import test from 'node:test';
import assert from 'node:assert/strict';
import {TYPES} from '../build/core.js';
import {bufferPoint} from '../build/buffer-point.js';
import {clipRaster} from '../build/raster.js';
import {sampleRaster} from '../build/sample-raster.js';

// A minimal composition fixture, in the sense the audit now distinguishes from a teaching
// worked example: it proves these nodes' ports meet and that a value survives the chain, with
// synthetic data and no external dependency. The sea-level example remains the teaching
// artifact; it is not what admits these primitives. See docs/audits/ontology-audit.md.
//
//   Area around a point  ->  Clip raster  ->  Sample raster at points
//          (area)              (raster)             (points)

const gauge={type:'FeatureCollection',features:[
  {type:'Feature',id:'145',properties:{name:'MANILA'},geometry:{type:'Point',coordinates:[120.97,14.58]}},
]};
const facilities={type:'FeatureCollection',features:[
  {type:'Feature',id:'a',properties:{name:'Inside, on land'},geometry:{type:'Point',coordinates:[120.965,14.575]}},
  {type:'Feature',id:'b',properties:{name:'Inside, no-data cell'},geometry:{type:'Point',coordinates:[120.935,14.615]}},
  {type:'Feature',id:'c',properties:{name:'Beyond the raster'},geometry:{type:'Point',coordinates:[122.5,14.58]}},
  {type:'Feature',id:'d',properties:{name:'No coordinates'},geometry:null},
]};

// A 14 x 14 grid over the gauge, one hundredth of a degree per cell.
const width=14,height=14;
const metadata={width,height,bands:1,origin:[120.90,14.65],resolution:[0.01,-0.01],crs:'EPSG:4326',
  rasterType:'PixelIsArea',bounds:[120.90,14.51,121.04,14.65],noData:-9999,bits:32,sampleFormat:3,
  compression:1,blockWidth:width,blockHeight:height,bytesPerPixel:4,geoKeys:{},gdal:null,band:null,description:''};
const values=Array.from({length:width*height},(_,i)=>i===3*width+3?-9999:1+(i%40)/10);
const grid={metadata,values,asset:{}};

const node=(type,params)=>({id:type,type,x:0,y:0,params});

test('the declared ports chain: area out of one, area in to the next, and so on',()=>{
  assert.equal(TYPES.buffer_point.output,'area');
  assert.ok(TYPES.clip_raster.inputs.some(([,t])=>t==='area'),'Clip raster takes the area');
  assert.equal(TYPES.clip_raster.output,'raster');
  const sample=TYPES.sample_raster.inputs.map(([,t])=>t);
  assert.ok(sample.includes('raster')&&sample.includes('points'),'Sample raster takes both');
  assert.equal(TYPES.sample_raster.output,'points','and yields a layer the rest of the app accepts');
});

test('a scope from a gauge clips a raster and puts an elevation on each facility',()=>{
  const scope=bufferPoint(gauge,node('buffer_point',{label:'Around the gauge',pointId:'MANILA',distanceM:5000}),'run');
  const clipped=clipRaster(grid,scope.value.boundary,{method:'all-touched'});
  assert.ok(clipped.mask.inside>0,'the scope selects cells');
  assert.ok(clipped.mask.outside>0,'and excludes others, so the clip did something');

  const sampled=sampleRaster(facilities,clipped,
    node('sample_raster',{label:'Elevation',attribute:'elevation_m',valueUnit:'metres'}).params);
  const by=id=>sampled.value.features.find(f=>f.id===id);

  assert.equal(typeof by('a').properties.elevation_m,'number','a facility in a retained cell gets a value');
  assert.ok(!Object.hasOwn(by('c').properties,'elevation_m'),'one beyond the raster gets none');
  assert.ok(!Object.hasOwn(by('d').properties,'elevation_m'),'one without coordinates gets none');
  assert.equal(sampled.counts.outside,1);
  assert.equal(sampled.counts.unlocated,1);
  assert.equal(sampled.counts.sampled+sampled.counts.noData,2,'the two located, in-grid facilities are accounted for');
});

test('clipping narrows the grid, so a distant facility becomes outside rather than no-data',()=>{
  const params=node('sample_raster',{label:'Elevation',attribute:'elevation_m',valueUnit:'metres'}).params;
  const at=distanceM=>{
    const scope=bufferPoint(gauge,node('buffer_point',{label:'s',pointId:'MANILA',distanceM}),'run');
    return sampleRaster(facilities,clipRaster(grid,scope.value.boundary,{method:'all-touched'}),params).counts;
  };
  const wide=at(5000),narrow=at(500);
  // Facility b sits on the grid's no-data cell. A wide scope retains that cell, so b is a
  // *considered* no-data. A narrow scope windows the grid away from it entirely, so b is simply
  // not covered. Both mean "no value", and conflating them would hide the difference between a
  // gap in the source and a gap in coverage — which is why the two counts are reported apart.
  assert.equal(wide.noData,1,'the wide scope keeps the no-data cell, and reports it as such');
  assert.equal(wide.outside,1,'only the far facility is beyond the raster');
  assert.equal(narrow.noData,0,'the narrow scope no longer covers that cell at all');
  assert.equal(narrow.outside,2,'so that facility joins the far one as uncovered');
  for(const counts of [wide,narrow]){
    assert.equal(counts.unlocated,1,'the point without coordinates is counted apart in both');
    assert.equal(counts.sampled+counts.noData+counts.outside+counts.unlocated,
      facilities.features.length,'every facility is accounted for exactly once');
  }
});
