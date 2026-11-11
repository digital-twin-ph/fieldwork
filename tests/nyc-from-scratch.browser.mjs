import {test,expect} from './fixtures.mjs';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';
import {makeFixture,serveRange} from './fixtures/s5p-fixture.mjs';

/** NYC CHILD ASTHMA AND OZONE, 2016–2025, FROM AN EMPTY CANVAS, by performing the example's own manual.
 *
 *  The counts belong to NYC DOHMH and are not redistributed, so the example's repository holds no rows: the table
 *  is fetched from the authors' Zenodo package (experiment 170). This test answers that URL from a local copy of
 *  the package named by NYC_PKG, and is skipped without one, because the package cannot be shipped beside the
 *  tests either. NYC_REAL fetches from Zenodo itself, for the export the example repository takes.
 *
 *  THE STEPS ARE THE EXAMPLE'S manual.json (experiment 173), the same file its Manual tab shows, so a step that no
 *  longer matches the application fails here. */
test.use({serviceWorkers:'block'});

const ZENODO='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
const MANUAL=new URL('../../example-2025-nyc-ozone/manual.json',import.meta.url);
const local=process.env.NYC_PKG;
const skip=!existsSync(MANUAL)?'example-2025-nyc-ozone is not checked out beside this repository.'
  :process.env.NYC_REAL||(local&&existsSync(local))?false:'Set NYC_PKG to a local copy of the Zenodo package, or NYC_REAL=1.';

test('two questions about child asthma visits in New York City, built by following the manual',async({page})=>{test.skip(!!skip,skip);
  // LIVE, the satellite workflow reads fourteen real files, about 170 MB; from the machine this was built on, a browser
  // read that storage at 35-55 s per MB (experiment 179). Hours, not minutes.
  const live=!!process.env.SATELLITE_LIVE;
  test.setTimeout(live?6*3600_000:600_000);
  if(!process.env.NYC_REAL){
    const bytes=readFileSync(local);
    await page.route(ZENODO,route=>route.fulfill({status:200,body:bytes,headers:{'access-control-allow-origin':'*'}}));
  }
  // THE SATELLITE WORKFLOW READS NO REAL FILE HERE unless SATELLITE_LIVE is set: the catalog answers with a near-real-time
  // and an offline item for each of 1 to 14 June 2023, and every item is the Sentinel-5P-shaped file made on the spot.
  // Fourteen real offline files are roughly 170 MB (experiment 179).
  if(!process.env.SATELLITE_LIVE){
    const bytes=await makeFixture();
    await page.route(/sentinel5euwest\.blob\.core\.windows\.net/,route=>serveRange(route,bytes));
    await page.route(/planetarycomputer\.microsoft\.com\/api\/sas\/v1\/token/,route=>route.fulfill({status:200,
      contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({token:'st=fixture&sig=none','msft:expiry':'2099-01-01T00:00:00Z'})}));
    const item=(day,stream)=>({type:'Feature',id:`S5P_${stream}_L2__NO2____202306${day}`,bbox:[-80,35,-65,48],geometry:null,
      properties:{datetime:`2023-06-${day}T17:2${stream==='OFFL'?'0':'5'}:00Z`,platform:'Sentinel 5 Precursor','s5p:product_type':'L2__NO2___',
        's5p:processing_mode':stream,'sat:absolute_orbit':29200+Number(day)},
      assets:{no2:{href:`https://sentinel5euwest.blob.core.windows.net/sentinel-5p/S5P_${stream}_FIXTURE_${day}.nc`,type:'application/x-netcdf',roles:['data']}}});
    const days=Array.from({length:14},(_,i)=>String(i+1).padStart(2,'0'));
    await page.route(/planetarycomputer\.microsoft\.com\/api\/stac\/v1\/collections\/sentinel-5p-l2-netcdf\/items/,route=>route.fulfill({
      status:200,contentType:'application/geo+json',headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({type:'FeatureCollection',links:[],features:days.flatMap(d=>[item(d,'NRTI'),item(d,'OFFL')])})}));
  }
  // ONE DOWNLOAD FOR ALL THREE WORKFLOWS: the second and third read the device's copy. The practitioner, 2026-11-04:
  // *"I had to download the data set for NYC twice for 2 workflows. Double download."*
  let downloads=0;
  page.on('request',request=>{if(request.url()===ZENODO)downloads++;});
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  for(const workflow of manual.workflows){
    // Only the satellite workflow gets hours: given to every step, a stalled boundary download in the fifth waited for
    // hours instead of failing (found 2026-11-05).
    const reads=live&&workflow.steps.some(s=>s.add==='sample_satellite_files_at_points');
    await performManual(page,workflow,reads?{runTimeout:5*3600_000}:undefined);
    await page.screenshot({path:`test-results/nyc-${manual.workflows.indexOf(workflow)+1}.png`});
    await page.locator('[data-view="workflow"]').click();await page.locator('#tidy-button').click();
  }

  expect(downloads,'requests for the Zenodo package').toBe(1);
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Ozone and child asthma'}).first();
  await expect(block).toContainText(`${manual.workflows.length} workflows`);
  if(process.env.NYC_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.NYC_EXPORT);
  }
});
