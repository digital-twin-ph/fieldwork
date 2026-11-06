import {test,expect} from '@playwright/test';
import {writeArrayBuffer} from 'geotiff';
import {collectPageErrors} from './page-errors.mjs';
import {serveRange} from './fixtures/s5p-fixture.mjs';

/** SAMPLE SATELLITE FILES OVER AREAS, OFFLINE (experiment 180): geotiff.js reads three GeoTIFF layers made here, shaped
 *  like MODIS land surface temperature (a grid in sinusoidal metres, uint16 values scaled by 0.02, QC bits, clear-day
 *  bits), served by range. Three areas, one per outcome. Every expected number is worked by hand below. */
test.use({serviceWorkers:'block'});

const R=6371007.181,X0=-4400000,Y0=-2440000,CELL=1000,W=6,H=4;
// The inverse of the sinusoidal projection, to draw areas whose cells are known.
const lonlat=(x,y)=>{const lat=y/R;return [x/(R*Math.cos(lat))*180/Math.PI,lat*180/Math.PI];};
// A rectangle of cells, inset a quarter cell so every centre in it is inside and none outside is.
const cells=(c0,r0,c1,r1)=>{const x0=X0+(c0+0.25)*CELL,x1=X0+(c1-0.25)*CELL,y0=Y0-(r0+0.25)*CELL,y1=Y0-(r1-0.25)*CELL;
  return {type:'Polygon',coordinates:[[lonlat(x0,y0),lonlat(x1,y0),lonlat(x1,y1),lonlat(x0,y1),lonlat(x0,y0)]]};};
// Area A, cells (0,0) (1,0) (0,1) (1,1): 15000 passes, 15100 passes, 15200 fails (LST error > 3 K), the fourth is fill.
// Area B, cells (3,1) (4,1): values whose QC says other quality with an error <= 3 K, which the default rule refuses.
const VALUE=[15000,15100,0,0,0,0, 15200,0,0,16000,16100,0, 0,0,0,0,0,0, 0,0,0,0,0,0];
const QC=   [0,1,0,0,0,0,         192,0,0,129,129,0,      0,0,0,0,0,0, 0,0,0,0,0,0];
const CLEAR=[7,1,0,0,0,0,         255,0,0,3,3,0,          0,0,0,0,0,0, 0,0,0,0,0,0];
const tif=(values,bits)=>Buffer.from(writeArrayBuffer(bits===16?Uint16Array.from(values):Uint8Array.from(values),
  {width:W,height:H,BitsPerSample:[bits],SampleFormat:[1],SamplesPerPixel:[1],PhotometricInterpretation:1,
    ModelPixelScale:[CELL,CELL,0],ModelTiepoint:[0,0,0,X0,Y0,0],GTModelTypeGeoKey:1,GTRasterTypeGeoKey:1,
    // A user-defined projected system, as MODIS files declare: without one, the writer replaces the tie point with -180, 90.
    ProjectedCSTypeGeoKey:32767}));
const BASE='https://modiseuwest.blob.core.windows.net/modis-061-cogs/MOD11A2/fixture/MOD11A2.A2024049.fixture_';

test('three areas, one per outcome, read by range: the mean rests on the cells that passed, and says so',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  const files={LST_Day_1km:tif(VALUE,16),QC_Day:tif(QC,8),Clear_sky_days:tif(CLEAR,8)};
  await page.route(/modiseuwest\.blob\.core\.windows\.net/,route=>{
    const name=Object.keys(files).find(k=>route.request().url().includes(`_${k}.tif`));
    return serveRange(route,files[name]);});
  await page.route(/planetarycomputer\.microsoft\.com\/api\/sas\/v1\/token\/modiseuwest/,route=>route.fulfill({status:200,
    contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({token:'st=fixture&sig=none','msft:expiry':'2099-01-01T00:00:00Z'})}));
  await page.goto('/');
  await page.evaluate(({areas,base})=>{
    const file=key=>({key,host:'modiseuwest.blob.core.windows.net',href:`${base}${key}.tif`,type:'image/tiff; application=geotiff; profile=cloud-optimized',roles:['data']});
    const search={catalog:'https://planetarycomputer.microsoft.com/api/stac/v1',collection:'modis-11A2-061',
      bbox:[-44,-23,-42,-21],from:'2024-02-18',until:'2024-02-25',returned:1,truncated:false,requests:1,searchedAt:'2026-11-06T00:00:00Z',
      areaFrom:'typed extent',items:[{id:'MOD11A2.A2024049.fixture',datetime:'2024-02-18T00:00:00.000000Z',end:'2024-02-25T23:59:59.000000Z',
        bbox:null,platform:'terra',files:['LST_Day_1km','QC_Day','Clear_sky_days'].map(file)}]};
    const w={schema:'fieldwork/workflow/1',name:'Fixture',nodes:[
      {id:'areas',type:'polygon_input',x:40,y:40,params:{label:'Municipalities',data:{features:areas.map(([id,geometry])=>({id,name:id,geometry,properties:{name:id}}))}}},
      {id:'product',type:'find_satellite_products',x:40,y:220,params:{label:'LST',topic:'heat',route:'pc-modis-lst-8day'}},
      {id:'search',type:'search_satellite_catalog',x:340,y:220,params:{label:'Files',from:'2024-02-18',until:'2024-02-25',search}},
      {id:'sample',type:'sample_satellite_files_at_points',x:640,y:120,params:{label:'Sampled',placeColumn:'municipio'}},
      {id:'out',type:'table_output',x:940,y:120,params:{label:'Out',inputMode:'table'}}],
      edges:[{id:'e1',from:'product',to:'search',port:'product'},{id:'e2',from:'areas',to:'sample',port:'areas'},
        {id:'e3',from:'search',to:'sample',port:'files'},{id:'e4',from:'sample',to:'out',port:'table'}]};
    localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify({blank:w}));},
    {base:BASE,areas:[['A',cells(0,0,2,2)],['B',cells(3,1,5,2)],['C',{type:'Polygon',coordinates:[[[10,10],[10.1,10],[10.1,10.1],[10,10.1],[10,10]]]}]]});
  await page.goto('/?example=blank');
  // The Inspector offers MODIS's controls, the default rule chosen, and not Sentinel-5P's operator.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="sample"]').click();
  await expect(page.locator('#satellite-quality-rule')).toHaveValue('produced-2k');
  await expect(page.locator('#satellite-layer')).toHaveValue('day');
  await expect(page.locator('#satellite-qa-operator')).toHaveCount(0);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
  const main=page.locator('main').first();
  await expect(main).toContainText('at 3 areas over 1 8-day period: 3 rows, one per area per period per satellite, Terra and Aqua kept apart.');
  await expect(main).toContainText('1 hold a mean of passing cells; 1 have values none of which passed, 0 no retrieval, 1 no cell in the area.');
  // The table, read back from what was saved: A's mean is (15000+15100)/2 x 0.02 = 301.0 K on 2 of 4 cells, 2 clear days.
  const result=await page.evaluate(()=>{
    const store=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));return store.nodes.find(n=>n.id==='sample').params;});
  expect(result.placeColumn).toBe('municipio');
  const rows=await page.locator('#results table tbody tr, main table tbody tr').allTextContents();
  const text=rows.join('\n');
  expect(text).toContain('301');
  expect(text).toContain('below quality threshold');
  expect(text).toContain('no cell in the area');
  expect(errors).toEqual([]);
});
