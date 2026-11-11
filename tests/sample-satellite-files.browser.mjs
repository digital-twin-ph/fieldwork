import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** SAMPLE SATELLITE FILES AT POINTS, LIVE (experiment 179): two NYC ozone monitors, the NO2 product, 7 June 2023, read
 *  from the real Planetary Computer file. SATELLITE_LIVE=1 only: it reads about 10-15 MB of a 606 MB file and took 8.3
 *  minutes from this machine's browser. sample-satellite-files-offline.browser.mjs covers the same path in the gate. */
test.use({serviceWorkers:'block'});
const live=!!process.env.SATELLITE_LIVE;

test('the NO2 value at two NYC monitors on 7 June 2023, with its quality and the gap kinds',async({page})=>{
  test.skip(!live,'Set SATELLITE_LIVE=1 to read the real files.');
  test.setTimeout(1800000);
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>{
    const monitors=[['QC','Queens College 2',-73.82153,40.73614],['IS52','IS 52',-73.90200,40.81618]];
    const w={schema:'fieldwork/workflow/1',name:'NO2 at the monitors',nodes:[
      {id:'monitors',type:'point_input',x:40,y:40,params:{label:'Ozone monitors',data:{type:'FeatureCollection',
        features:monitors.map(([id,name,x,y])=>({type:'Feature',id,properties:{name},geometry:{type:'Point',coordinates:[x,y]}}))}}},
      {id:'product',type:'find_satellite_products',x:40,y:220,params:{label:'NO₂ product',topic:'no2',route:'pc-s5p-no2'}},
      {id:'search',type:'search_satellite_catalog',x:340,y:220,params:{label:'NO₂ overpasses',from:'2023-06-07',until:'2023-06-07',
        box:[-74.26,40.49,-73.70,40.92]}},
      {id:'sample',type:'sample_satellite_files_at_points',x:640,y:120,params:{label:'NO₂ at the monitors'}},
      {id:'out',type:'table_output',x:940,y:120,params:{label:'NO₂ by monitor and overpass',inputMode:'table'}}],
      edges:[{id:'e1',from:'product',to:'search',port:'product'},{id:'e2',from:'monitors',to:'sample',port:'points'},
        {id:'e3',from:'search',to:'sample',port:'files'},{id:'e4',from:'sample',to:'out',port:'table'}]};
    localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify({blank:w}));});
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="search"]').click();
  await page.locator('#catalog-search-open').click();
  const dialog=page.locator('#satellite-catalog-dialog');
  await dialog.locator('#cat-search').click();
  await expect(dialog.locator('.satellite-items li').first()).toBeVisible({timeout:60000});
  await expect(dialog).toContainText('offline (OFFL)');
  await dialog.locator('#cat-close').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:1700000});
  await page.locator('[data-view="results"]').click();
  // Measured 2026-11-05 (experiment 179): one offline orbit file, both monitors on pixels with qa_value 0.74, just
  // below the threshold, as S5 found for the whole of the city that day.
  const main=page.locator('main').first();
  await expect(main).toContainText('Read 1 file of Sentinel-5P · TROPOMI NO₂ (Planetary Computer) at 2 points over 1 day: 2 rows');
  await expect(main).toContainText('0 rows hold a value passing qa_value >= 0.75; 2 below it, 0 with no retrieval, 0 with no overpass.');
  await expect(main).toContainText('29273');
  expect(errors).toEqual([]);
});
