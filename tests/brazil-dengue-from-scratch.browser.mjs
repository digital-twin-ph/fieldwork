import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';
import {writeArrayBuffer} from 'geotiff';
import {serveRange} from './fixtures/s5p-fixture.mjs';

/** DENGUE IN RIO DE JANEIRO STATE, 2024, FROM AN EMPTY CANVAS, by performing the example's own manual (experiment 180).
 *
 *  The table is an extract of DATASET_MULTIMODAL_V8 (CC BY 4.0) committed to the example's repository, and the manual
 *  fetches it from raw.githubusercontent.com at a fixed commit. This test answers that URL from the checkout beside
 *  this repository, by path, so it reads the bytes the commit holds without the network. The boundaries come from
 *  geoBoundaries live, as a practitioner's would. BRAZIL_EXPORT saves the project for the example repository. */
test.use({serviceWorkers:'block'});

const REPO=new URL('../../example-2024-brazil-dengue/',import.meta.url);
const MANUAL=new URL('manual.json',REPO);
const skip=existsSync(MANUAL)?false:'example-2024-brazil-dengue is not checked out beside this repository.';

test('dengue in Rio de Janeiro state, 2024, built by following the manual',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(process.env.BRAZIL_SATELLITE_LIVE?3600_000:600_000);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2024-brazil-dengue\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*','content-type':'text/plain'}});
  });
  // THE SATELLITE FILES ARE MADE HERE unless BRAZIL_SATELLITE_LIVE is set: two 8-day periods from each MODIS satellite,
  // every one the same 60 x 40 km grid of 1 km cells over Rio de Janeiro city in the sinusoidal projection, all cells
  // 15,000 (300 K) of good quality and clear every day. So some municipalities have cells and the rest say they have
  // none, which is what the playback checks: the steps, not MODIS.
  if(!process.env.BRAZIL_SATELLITE_LIVE){
    const R=6371007.181,X0=Math.round(R*(-43.75*Math.PI/180)*Math.cos(-22.75*Math.PI/180)),Y0=Math.round(R*(-22.75*Math.PI/180)),W=60,H=40;
    const tif=(fill,bits)=>Buffer.from(writeArrayBuffer(bits===16?new Uint16Array(W*H).fill(fill):new Uint8Array(W*H).fill(fill),
      {width:W,height:H,BitsPerSample:[bits],SampleFormat:[1],SamplesPerPixel:[1],PhotometricInterpretation:1,
        ModelPixelScale:[1000,1000,0],ModelTiepoint:[0,0,0,X0,Y0,0],GTModelTypeGeoKey:1,GTRasterTypeGeoKey:1,ProjectedCSTypeGeoKey:32767}));
    const layers={LST_Day_1km:tif(15000,16),QC_Day:tif(0,8),Clear_sky_days:tif(255,8),LST_Night_1km:tif(14500,16),QC_Night:tif(0,8),Clear_sky_nights:tif(255,8)};
    await page.route(/modiseuwest\.blob\.core\.windows\.net/,route=>{
      const key=Object.keys(layers).find(k=>route.request().url().includes(`_${k}.tif`));return serveRange(route,layers[key]);});
    await page.route(/planetarycomputer\.microsoft\.com\/api\/sas\/v1\/token\/modiseuwest/,route=>route.fulfill({status:200,
      contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({token:'st=fixture&sig=none','msft:expiry':'2099-01-01T00:00:00Z'})}));
    const item=(platform,start,end)=>{const id=`${platform==='terra'?'MOD':'MYD'}11A2.A${start}.fixture`;
      return {type:'Feature',id,bbox:[-45,-24,-40,-20],geometry:null,properties:{datetime:null,start_datetime:`${start}T00:00:00Z`,end_datetime:`${end}T23:59:59Z`,platform},
        assets:Object.fromEntries(Object.keys(layers).map(k=>[k,{href:`https://modiseuwest.blob.core.windows.net/modis-061-cogs/fixture/${id}_${k}.tif`,
          type:'image/tiff; application=geotiff; profile=cloud-optimized',roles:['data']}]))};};
    await page.route(/planetarycomputer\.microsoft\.com\/api\/stac\/v1\/collections\/modis-11A2-061\/items/,route=>route.fulfill({status:200,
      contentType:'application/geo+json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({type:'FeatureCollection',links:[],
        features:[item('terra','2024-02-18','2024-02-25'),item('aqua','2024-02-18','2024-02-25'),item('terra','2024-02-26','2024-03-04'),item('aqua','2024-02-26','2024-03-04')]})}));
  }
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  const built=[];
  for(const [index,workflow] of manual.workflows.entries()){
    // A YEAR OF REAL MODIS FILES takes minutes, not seconds: only that workflow's run gets the long wait, when live.
    const reads=process.env.BRAZIL_SATELLITE_LIVE&&workflow.steps.some(x=>x.add==='sample_satellite_files_at_points');
    built.push(await performManual(page,workflow,reads?{runTimeout:3000_000}:undefined));
    await page.screenshot({path:`test-results/brazil-${index+1}.png`});
    await page.locator('[data-view="workflow"]').click();await page.locator('#tidy-button').click();
    if(index!==1)continue;
    // AFTER A RELOAD the run's tables are gone, and a step's table is one button away: it runs, then shows Before and
    // After. The practitioner, 2026-11-06: Select rows by value and Total within groups had "no before and after".
    await page.reload();
    // The page settles first: a reload re-checks the workflow for half a second, with every control disabled.
    await expect(page.locator('#workflow-state')).not.toContainText('Running',{timeout:30000});
    await page.locator('[data-view="workflow"]').click();
    await page.locator(`.react-flow__node[data-id="${built[1].year}"]`).click();
    // Either the table is already there, from the device's copy re-read on load, or a button runs and shows it. Never a
    // sentence with nothing to press.
    const look=page.locator('#output-quick-look'),runLook=page.locator('#output-run-look:not([disabled])');
    await expect(look.or(runLook)).toBeVisible({timeout:60000});
    if(await runLook.count())await runLook.click();else await look.click();
    await expect(page.locator('#table-viewer')).toBeVisible({timeout:60000});
    await expect(page.locator('#table-viewer')).toContainText('Before');
    await expect(page.locator('#table-viewer')).toContainText('After');
    // BEFORE GREYS WHAT THE SELECTION DROPPED: the doubled week, 2 rows for each of 92 municipalities, outside the range,
    // each holding cases and population: 368 of 9,752.
    await page.locator('#table-viewer').getByRole('button',{name:'Before'}).click();
    await expect(page.locator('#table-viewer .table-excluded-note')).toContainText('368 of 9,752 rows greyed: not kept by this step, data_iniSE outside 2023-12-31 to 2024-12-28');
    expect(await page.locator('#table-viewer tr[data-row-excluded]').count()).toBeGreaterThan(0);
    await page.locator('#table-viewer').screenshot({path:'test-results/select-before-greyed.png'});
    await page.locator('#table-viewer').getByRole('button',{name:'Close'}).click();
  }
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Dengue in Rio de Janeiro state'}).first();
  await expect(block).toContainText(`${manual.workflows.length} workflow`);
  if(process.env.BRAZIL_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.BRAZIL_EXPORT);
  }
});
