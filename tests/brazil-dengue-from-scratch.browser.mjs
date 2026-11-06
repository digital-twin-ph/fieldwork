import {test,expect} from '@playwright/test';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
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
  // THE SATELLITE FILES ARE MADE HERE unless BRAZIL_SATELLITE_LIVE is set: every 8-day period of 2024 from each MODIS
  // satellite, each the same 60 x 40 km grid of 1 km cells over Rio de Janeiro city in the sinusoidal projection, good
  // quality and clear every day. The temperature differs from period to period (14,500 + 40 per period, stored), so the
  // lag models have something to estimate; some municipalities have cells and the rest say they have none. The
  // playback checks the steps, not MODIS.
  if(!process.env.BRAZIL_SATELLITE_LIVE){
    const R=6371007.181,X0=Math.round(R*(-43.75*Math.PI/180)*Math.cos(-22.75*Math.PI/180)),Y0=Math.round(R*(-22.75*Math.PI/180)),W=60,H=40;
    const tif=(fill,bits)=>Buffer.from(writeArrayBuffer(bits===16?new Uint16Array(W*H).fill(fill):new Uint8Array(W*H).fill(fill),
      {width:W,height:H,BitsPerSample:[bits],SampleFormat:[1],SamplesPerPixel:[1],PhotometricInterpretation:1,
        ModelPixelScale:[1000,1000,0],ModelTiepoint:[0,0,0,X0,Y0,0],GTModelTypeGeoKey:1,GTRasterTypeGeoKey:1,ProjectedCSTypeGeoKey:32767}));
    const fixed={QC_Day:tif(0,8),Clear_sky_days:tif(255,8),QC_Night:tif(0,8),Clear_sky_nights:tif(255,8)};
    const DAY=86400000,starts=Array.from({length:46},(_,i)=>new Date(Date.UTC(2024,0,1)+i*8*DAY).toISOString().slice(0,10));
    const lst=new Map();
    await page.route(/modiseuwest\.blob\.core\.windows\.net/,route=>{
      const url=route.request().url(),key=Object.keys({...fixed,LST_Day_1km:0,LST_Night_1km:0}).find(k=>url.includes(`_${k}.tif`));
      if(fixed[key])return serveRange(route,fixed[key]);
      const index=Number(/\.p(\d+)\./.exec(url)[1]);
      if(!lst.has(index))lst.set(index,tif(14500+40*index,16));
      return serveRange(route,lst.get(index));});
    await page.route(/planetarycomputer\.microsoft\.com\/api\/sas\/v1\/token\/modiseuwest/,route=>route.fulfill({status:200,
      contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({token:'st=fixture&sig=none','msft:expiry':'2099-01-01T00:00:00Z'})}));
    const item=(platform,index)=>{const start=starts[index],end=new Date(Date.parse(start)+7*DAY).toISOString().slice(0,10);
      const id=`${platform==='terra'?'MOD':'MYD'}11A2.p${index}.fixture`;
      return {type:'Feature',id,bbox:[-45,-24,-40,-20],geometry:null,properties:{datetime:null,start_datetime:`${start}T00:00:00Z`,end_datetime:`${end}T23:59:59Z`,platform},
        assets:Object.fromEntries(['LST_Day_1km','QC_Day','Clear_sky_days','LST_Night_1km','QC_Night','Clear_sky_nights'].map(k=>[k,{href:`https://modiseuwest.blob.core.windows.net/modis-061-cogs/fixture/${id}_${k}.tif`,
          type:'image/tiff; application=geotiff; profile=cloud-optimized',roles:['data']}]))};};
    await page.route(/planetarycomputer\.microsoft\.com\/api\/stac\/v1\/collections\/modis-11A2-061\/items/,route=>route.fulfill({status:200,
      contentType:'application/geo+json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({type:'FeatureCollection',links:[],
        features:starts.flatMap((_,i)=>[item('terra',i),item('aqua',i)])})}));
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
  // THE MODELS' RESULTS, written out where BRAZIL_RESULTS names a file: the rate ratio per lag is what the example
  // reports, and the exported project keeps no results.
  if(process.env.BRAZIL_RESULTS){
    await page.locator('[data-view="results"]').click();
    const out={};
    for(const tab of await page.locator('#result-tabs [data-output]').all()){
      const label=(await tab.innerText()).replace(/^\S+\s/,'').trim();
      await tab.click();await page.waitForTimeout(300);
      out[label]=await page.locator('main').first().innerText();
    }
    writeFileSync(process.env.BRAZIL_RESULTS,JSON.stringify(out,null,1));
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
