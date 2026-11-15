import test from 'node:test';
import assert from 'node:assert/strict';
import {pictureOrValues,projectionOf,footprintOf,northUpPlan,northUpPixels,graticuleOf,printedSheetOf,dms} from '../build/geotiff-picture.js';

/** A SCANNED MAP IN A GEOTIFF (TODO 35, 2026-11-15). The tags are USGS's own for Oswego East, NY, 1943: polyconic on NAD27,
 *  centred on the sheet, 2.68224 m pixels; read from the file, not invented. */
const OSWEGO_EAST={samplesPerPixel:3,bitsPerSample:8,sampleFormat:1,width:4896,height:6600,
  origin:[-7283.700931018117,15210.394745042633],resolution:[2.68224,-2.68224],
  geoKeys:{GTModelTypeGeoKey:1,GTRasterTypeGeoKey:1,GeographicTypeGeoKey:4267,ProjectedCSTypeGeoKey:32767,ProjCoordTransGeoKey:22,
    ProjLinearUnitsGeoKey:9001,ProjNatOriginLongGeoKey:-76.4375,ProjNatOriginLatGeoKey:43.375,ProjFalseEastingGeoKey:0,ProjFalseNorthingGeoKey:0}};

test('a scan is a picture and a measurement is values, from the tags alone',()=>{
  assert.equal(pictureOrValues(OSWEGO_EAST).kind,'picture');
  assert.equal(pictureOrValues({samplesPerPixel:1,bitsPerSample:8,photometric:3}).kind,'picture','a palette is a picture');
  assert.equal(pictureOrValues({samplesPerPixel:1,bitsPerSample:32,sampleFormat:3}).kind,'values');
  assert.equal(pictureOrValues({samplesPerPixel:3,bitsPerSample:16}).kind,'values','three 16-bit bands are measurements');
});
test('the projection comes from the tags: polyconic on NAD27, UTM by code, and an unknown method is refused by name',()=>{
  const p=projectionOf(OSWEGO_EAST.geoKeys);
  assert.match(p.proj,/\+proj=poly \+lat_0=43\.375 \+lon_0=-76\.4375/);assert.match(p.proj,/\+ellps=clrk66 \+towgs84=-8,160,176/);
  assert.match(p.said,/polyconic.*NAD27/);
  assert.match(projectionOf({GTModelTypeGeoKey:1,ProjectedCSTypeGeoKey:32618}).proj,/\+proj=utm \+zone=18 \+datum=WGS84/);
  assert.match(projectionOf({GTModelTypeGeoKey:1,ProjectedCSTypeGeoKey:26718}).said,/UTM zone 18 north, NAD27/);
  assert.throws(()=>projectionOf({GTModelTypeGeoKey:1,ProjectedCSTypeGeoKey:2263}),/EPSG:2263, which this does not read yet/);
  assert.throws(()=>projectionOf({...OSWEGO_EAST.geoKeys,ProjCoordTransGeoKey:9}),/method 9/);
});
test('where the tags put the page, its printed sheet by default, and only the window over the study area is read',()=>{
  const proj=projectionOf(OSWEGO_EAST.geoKeys).proj,foot=footprintOf(OSWEGO_EAST,proj);
  assert.ok(foot[0]<-76.5&&foot[2]>-76.375&&foot[1]<43.375&&foot[3]>43.5,'the page with its margins covers the sheet');
  assert.deepEqual(printedSheetOf(foot),{box:[-76.5,43.375,-76.375,43.5],stepMinutes:7.5});
  const plan=northUpPlan(OSWEGO_EAST,proj,[-76.405,43.486,-76.375,43.514]);
  assert.ok(plan.window[2]-plan.window[0]<1000&&plan.window[3]-plan.window[1]<1200,'about 900 by 1,000 of 4,896 by 6,600 pixels');
  assert.equal(northUpPlan(OSWEGO_EAST,proj,[10,10,11,11]),null,'no overlap, no plan');
});
test('north-up pixels are read from the window, nearest neighbour, white where the file has nothing',()=>{
  const proj=projectionOf(OSWEGO_EAST.geoKeys).proj,plan=northUpPlan(OSWEGO_EAST,proj,[-76.40,43.49,-76.39,43.495],40);
  const [x0,y0,x1,y1]=plan.window,rgb=new Uint8Array((x1-x0)*(y1-y0)*3).fill(7);
  const px=northUpPixels(OSWEGO_EAST,proj,plan,rgb);
  assert.equal(px.length,plan.width*plan.height*4);assert.equal(px[0],7);assert.equal(px[3],255);
});
test('the graticule a sheet should print, and degrees as it prints them',()=>{
  assert.deepEqual(graticuleOf([-76.405,43.486,-76.375,43.514]),{meridians:[-76.375],parallels:[43.5]});
  assert.equal(dms(-76.375,['E','W']),'76° 22′ 30″ W');assert.equal(dms(43.5,['N','S']),'43° 30′ N');
});

test('a shift moves the file’s own placement by where the pairs say it lies, keeping its scale; one pair is enough',async()=>{
  const {fitPlacement,MIN_POINTS}=await import('../build/georeference.js');
  assert.equal(MIN_POINTS.shift,1);
  // A north-up image placed by its tags: 2.5 m pixels near 43.5 N.
  const base={xScale:0.00003094,ySkew:0,xSkew:0,yScale:-0.00002250,xOrigin:-76.405,yOrigin:43.514};
  const at=(x,y)=>[base.xOrigin+base.xScale*(x-0.5),base.yOrigin+base.yScale*(y-0.5)];
  // The crossroads truly lies 0.00803 degrees east of where the tags put its pixel: about 650 m.
  const p=(id,x,y)=>{const [lon,lat]=at(x,y);return {id,pixel:[x,y],lonlat:[lon+0.00803,lat]};};
  const one=fitPlacement([p('crossroads',610,640)],'shift',base);
  assert.ok(Math.abs(one.world.xOrigin-(base.xOrigin+0.00803))<1e-9);assert.equal(one.world.xScale,base.xScale);
  assert.ok(one.rmsM<1e-6,'a pure shift leaves no error');
  const two=fitPlacement([p('crossroads',610,640),p('school',540,960)],'shift',base);
  assert.ok(two.rmsM<1e-6&&Math.abs(two.world.xOrigin-one.world.xOrigin)<1e-9);
  assert.throws(()=>fitPlacement([p('crossroads',610,640)],'shift'),/needs a placement to start from/);
});
