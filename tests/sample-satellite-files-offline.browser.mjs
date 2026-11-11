import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {FIXTURE,makeFixture,serveRange} from './fixtures/s5p-fixture.mjs';

/** SAMPLE SATELLITE FILES AT POINTS, OFFLINE (experiment 179): the real worker and h5wasm read a Sentinel-5P-shaped file
 *  made on the spot and served by range, so the gate covers the reading path with no network. One point per outcome:
 *  passing, below the threshold, no retrieval, and off the swath. The live check is sample-satellite-files.browser.mjs. */
test.use({serviceWorkers:'block'});
const HREF='https://sentinel5euwest.blob.core.windows.net/sentinel-5p/S5P_OFFL_FIXTURE.nc';
const at=(r,c)=>[FIXTURE.lon(c)+0.004,FIXTURE.lat(r)-0.003];

test('one point per outcome, read by range in the worker, and the table says which gap is which',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  const bytes=await makeFixture();
  await page.route(/sentinel5euwest\.blob\.core\.windows\.net/,route=>serveRange(route,bytes));
  await page.route(/planetarycomputer\.microsoft\.com\/api\/sas\/v1\/token/,route=>route.fulfill({status:200,
    contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({token:'st=fixture&sig=none','msft:expiry':'2099-01-01T00:00:00Z'})}));
  await page.goto('/');
  await page.evaluate(({points,href})=>{
    const search={catalog:'https://planetarycomputer.microsoft.com/api/stac/v1',collection:'sentinel-5p-l2-netcdf',productType:'L2__NO2___',
      bbox:[-74.26,40.49,-73.70,40.92],from:'2023-06-06',until:'2023-06-07',returned:1,truncated:false,requests:1,searchedAt:'2026-11-05T00:00:00Z',
      areaFrom:'typed extent',items:[{id:'S5P_OFFL_FIXTURE',datetime:'2023-06-07T17:19:31Z',bbox:[-180,-80,180,90],platform:'Sentinel 5 Precursor',
        stream:'OFFL',orbit:29273,files:[{key:'no2',host:'sentinel5euwest.blob.core.windows.net',href,type:'application/x-netcdf',roles:['data']}]}]};
    const w={schema:'fieldwork/workflow/1',name:'Fixture',nodes:[
      {id:'pts',type:'point_input',x:40,y:40,params:{label:'Points',data:{type:'FeatureCollection',
        features:points.map(([id,[x,y]])=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates:[x,y]}}))}}},
      {id:'product',type:'find_satellite_products',x:40,y:220,params:{label:'NO₂',topic:'no2',route:'pc-s5p-no2'}},
      {id:'search',type:'search_satellite_catalog',x:340,y:220,params:{label:'Files',from:'2023-06-06',until:'2023-06-07',search}},
      {id:'sample',type:'sample_satellite_files_at_points',x:640,y:120,params:{label:'Sampled'}},
      {id:'out',type:'table_output',x:940,y:120,params:{label:'Out',inputMode:'table'}}],
      edges:[{id:'e1',from:'product',to:'search',port:'product'},{id:'e2',from:'pts',to:'sample',port:'points'},
        {id:'e3',from:'search',to:'sample',port:'files'},{id:'e4',from:'sample',to:'out',port:'table'}]};
    localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify({blank:w}));},
    {href:HREF,points:[['passes',at(2,5)],['below',at(1,1)],['cloud',at(3,4)],['far',[-72.0,41.5]]]});
  await page.goto('/?example=blank');
  // The Inspector: the quality rule, both operators offered, the manual's chosen by default.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="sample"]').click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#satellite-qa-operator')).toHaveValue('>=');
  await page.locator('#config-cancel').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:90000});
  await page.locator('[data-view="results"]').click();
  const main=page.locator('main').first();
  await expect(main).toContainText('Read 1 file of Sentinel-5P · TROPOMI NO₂ (Planetary Computer) at 4 points over 2 days: 8 rows');
  await expect(main).toContainText('1 row hold a value passing qa_value >= 0.75; 1 below it, 1 with no retrieval, 5 with no overpass.');
  await expect(main).toContainText('nitrogendioxide_tropospheric_column');
  // The operator, saved, changes the rule stated on the result.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="sample"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#satellite-qa-operator').selectOption('>');
  await page.locator('#config-apply').click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.id==='sample').params.qaOperator)).toBe('>');
  expect(errors).toEqual([]);
});
