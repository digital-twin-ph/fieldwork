import {test,expect} from './fixtures.mjs';
import {writeArrayBuffer} from 'geotiff';
import {collectPageErrors} from './page-errors.mjs';
import {serveRange} from './fixtures/s5p-fixture.mjs';

/** VEGETATION OVER AREAS, OFFLINE (0.149.0): two GeoTIFF layers made here, shaped like MODIS NDVI (int16 stored, fill
 *  -3000, the files' scale_factor 10000, a divisor) and its pixel reliability (uint8, fill 255), served by range. The
 *  practitioner, 2026-11-18: "Did we build NDVI for Brazil?" Every expected number is worked by hand below. */
test.use({serviceWorkers:'block'});

const R=6371007.181,X0=-4400000,Y0=-2440000,CELL=250,W=4,H=2;
const lonlat=(x,y)=>{const lat=y/R;return [x/(R*Math.cos(lat))*180/Math.PI,lat*180/Math.PI];};
const cells=(c0,r0,c1,r1)=>{const x0=X0+(c0+0.25)*CELL,x1=X0+(c1-0.25)*CELL,y0=Y0-(r0+0.25)*CELL,y1=Y0-(r1-0.25)*CELL;
  return {type:'Polygon',coordinates:[[lonlat(x0,y0),lonlat(x1,y0),lonlat(x1,y1),lonlat(x0,y1),lonlat(x0,y0)]]};};
// Area A, cells (0,0) (1,0) (0,1) (1,1): NDVI 0.5 good, 0.7 marginal, 0.9 cloudy, fill. The default keeps 0 and 1:
// a mean of 0.6 on 2 of 4 cells.
const NDVI=[5000,7000,0,0, 9000,-3000,0,0];
const RELIABILITY=[0,1,0,0, 3,255,0,0];
// Signed values are handed to the writer as their 16 bits, unsigned, with SampleFormat 2: geotiff.js 3.0.5's writer
// mangles an Int16Array (5000 is read back as -30632 by geotiff.js and terrio alike), 2026-11-18.
const tif=(values,signed)=>Buffer.from(writeArrayBuffer(signed?Uint16Array.from(values.map(v=>v&0xffff)):Uint8Array.from(values),
  {width:W,height:H,BitsPerSample:[signed?16:8],SampleFormat:[signed?2:1],SamplesPerPixel:[1],PhotometricInterpretation:1,
    ModelPixelScale:[CELL,CELL,0],ModelTiepoint:[0,0,0,X0,Y0,0],GTModelTypeGeoKey:1,GTRasterTypeGeoKey:1,ProjectedCSTypeGeoKey:32767}));
const BASE='https://modiseuwest.blob.core.windows.net/modis-061-cogs/MOD13Q1/fixture/MOD13Q1.A2024033.fixture_';

test('NDVI over an area: the default keeps good and marginal cells, divides by 10000, and says it is unitless',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  const files={'250m_16_days_NDVI':tif(NDVI,true),'250m_16_days_pixel_reliability':tif(RELIABILITY,false)};
  await page.route(/modiseuwest\.blob\.core\.windows\.net/,route=>{
    const name=Object.keys(files).find(k=>route.request().url().includes(`_${k}.tif`));
    return serveRange(route,files[name]);});
  await page.route(/planetarycomputer\.microsoft\.com\/api\/sas\/v1\/token\/modiseuwest/,route=>route.fulfill({status:200,
    contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({token:'st=fixture&sig=none','msft:expiry':'2099-01-01T00:00:00Z'})}));
  await page.goto('/');
  await page.evaluate(({area,base})=>{
    const file=key=>({key,host:'modiseuwest.blob.core.windows.net',href:`${base}${key}.tif`,type:'image/tiff; application=geotiff; profile=cloud-optimized',roles:['data']});
    const search={catalog:'https://planetarycomputer.microsoft.com/api/stac/v1',collection:'modis-13Q1-061',
      bbox:[-44,-23,-42,-21],from:'2024-02-02',until:'2024-02-17',returned:1,truncated:false,requests:1,searchedAt:'2026-11-18T00:00:00Z',
      areaFrom:'typed extent',items:[{id:'MOD13Q1.A2024033.fixture',datetime:'2024-02-02T00:00:00.000000Z',end:'2024-02-17T23:59:59.000000Z',
        bbox:null,platform:'terra',files:['250m_16_days_NDVI','250m_16_days_pixel_reliability'].map(file)}]};
    const w={schema:'fieldwork/workflow/1',name:'Fixture',nodes:[
      {id:'areas',type:'polygon_input',x:40,y:40,params:{label:'Municipalities',data:{features:[{id:'A',name:'A',geometry:area,properties:{name:'A'}}]}}},
      {id:'product',type:'find_satellite_products',x:40,y:220,params:{label:'NDVI',topic:'vegetation',route:'pc-modis-vi-16day'}},
      {id:'search',type:'search_satellite_catalog',x:340,y:220,params:{label:'Files',from:'2024-02-02',until:'2024-02-17',search}},
      // A layer and a rule left from temperature are not carried to vegetation.
      {id:'sample',type:'sample_satellite_files_at_points',x:640,y:120,params:{label:'Sampled',placeColumn:'municipio',layer:'day',qualityRule:'produced-2k'}},
      {id:'out',type:'table_output',x:940,y:120,params:{label:'Out',inputMode:'table'}}],
      edges:[{id:'e1',from:'product',to:'search',port:'product'},{id:'e2',from:'areas',to:'sample',port:'areas'},
        {id:'e3',from:'search',to:'sample',port:'files'},{id:'e4',from:'sample',to:'out',port:'table'}]};
    localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify({blank:w}));},{base:BASE,area:cells(0,0,2,2)});
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="sample"]').click();
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('Reads NDVI over each area, unitless, keeping cells that pass: pixel reliability 0 or 1');
  await page.locator('#configure-step').click();
  await expect(page.locator('#satellite-layer')).toHaveValue('ndvi');
  await expect(page.locator('#satellite-quality-rule')).toHaveValue('reliability-useful');
  await expect(page.locator('#satellite-quality-rule option')).toHaveCount(2);
  await expect(page.locator('#satellite-unit')).toHaveCount(0);
  await page.locator('#config-cancel').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
  const main=page.locator('main').first();
  await expect(main).toContainText('at 1 area over 1 16-day period: 1 row');
  await expect(main).toContainText('NDVI, unitless');
  await expect(main).toContainText('Each stored value was divided by 10000');
  // cells, cells_with_value, cells_passing, value_min, value_max, clear_days, gap, NDVI_250m.
  const cellsOfRow=(await page.locator('main table tbody tr').first().locator('td, th').allTextContents()).map(t=>t.trim());
  expect(cellsOfRow.slice(5)).toEqual(['4','3','2','0.5','0.7','','','0.6']);
  expect(errors).toEqual([]);
});
