import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {collectPageErrors} from './page-errors.mjs';

/** FROM A QUESTION TO THE FILES (experiment 179): Find satellite products, then Search a satellite catalog over the NYC
 *  example's own study area, the five boroughs. Planetary Computer is stubbed here so the test needs no network;
 *  SATELLITE_LIVE=1 lets it reach the real catalog, which is how the live search was checked. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-2025-nyc-ozone/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false:'example-2025-nyc-ozone is not checked out beside this repository.';
const item=(id,type,dt,bbox)=>({type:'Feature',stac_version:'1.0.0',id,bbox,geometry:null,
  properties:{datetime:dt,platform:'Sentinel-5P','s5p:product_type':type},
  assets:{product:{href:`https://sentinel5euwest.blob.core.windows.net/sentinel-5p/${id}.nc`,type:'application/x-netcdf',roles:['data']}}});

test('a NO2 product, the five boroughs, and the overpasses of 7 June 2023, each with its access facts',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  const project=JSON.parse(gunzipSync(readFileSync(BUNDLE)));
  const city=project.workflows.find(w=>w.document.name==='Where was the air measured?').document.nodes.find(n=>n.type==='study_area');
  if(!process.env.SATELLITE_LIVE)
    await page.route(/planetarycomputer\.microsoft\.com\/api\/stac\/v1\/collections\/sentinel-5p-l2-netcdf\/items/,route=>route.fulfill({
      status:200,contentType:'application/geo+json',headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({type:'FeatureCollection',links:[],features:[
        item('S5P_NRTI_L2__NO2____20230607T172349','L2__NO2___','2023-06-07T17:23:49Z',[-90,30,-65,50]),
        item('S5P_NRTI_L2__NO2____20230607T162845','L2__NO2___','2023-06-07T16:28:45Z',[-80,35,-60,48]),
        item('S5P_NRTI_L2__O3_____20230607T172349','L2__O3____','2023-06-07T17:23:49Z',[-90,30,-65,50])]})}));
  await page.goto('/');
  await page.evaluate(({city})=>{
    const w={schema:'fieldwork/workflow/1',name:'Where was the air measured, from space?',nodes:[
      {id:'city',type:'study_area',x:40,y:40,params:city.params},
      {id:'product',type:'find_satellite_products',x:40,y:220,params:{label:'NO₂ product',topic:'no2',route:'pc-s5p-no2'}},
      {id:'search',type:'search_satellite_catalog',x:340,y:120,params:{label:'NO₂ overpasses',from:'',until:''}}],
      edges:[{id:'e1',from:'product',to:'search',port:'product'},{id:'e2',from:'city',to:'search',port:'area'}]};
    localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify({blank:w}));},{city});
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="search"]').click();
  await expect(page.locator('#inspector-content')).toContainText('Not searched yet');
  await page.locator('#catalog-search-open').click();
  const dialog=page.locator('#satellite-catalog-dialog');
  await expect(dialog).toContainText('Sentinel-5P · TROPOMI NO₂ (Planetary Computer)');
  await expect(dialog).toContainText('Study area extent: W -74.2');
  await dialog.locator('#cat-from').fill('2023-06-07');await dialog.locator('#cat-from').dispatchEvent('change');
  await dialog.locator('#cat-until').fill('2023-06-07');await dialog.locator('#cat-until').dispatchEvent('change');
  await dialog.locator('#cat-search').click();
  await expect(dialog.locator('.satellite-items li')).toHaveCount(2,{timeout:30000});
  await expect(dialog.locator('.satellite-coverage .footprint')).toHaveCount(2);
  await expect(dialog).toContainText('2 L2__NO2___ items in sentinel-5p-l2-netcdf over the study area from 2023-06-07 to 2023-06-07');
  // Inspect: access facts from the product, attribution with the year, and what is not known.
  await expect(dialog).toContainText('No account (anonymous token)');
  await expect(dialog).toContainText('Contains modified Copernicus Sentinel data 2023');
  await expect(dialog).toContainText('not known until a reader opens the file');
  await page.screenshot({path:'test-results/search-satellite-catalog.png'});
  await dialog.locator('[data-cat-keep]').nth(1).uncheck();
  await dialog.locator('#cat-close').click();
  await expect(page.locator('#inspector-content')).toContainText('2 found, 1 kept');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(saved.nodes.find(n=>n.id==='search').params.kept).toHaveLength(1);
  expect(errors).toEqual([]);
});
