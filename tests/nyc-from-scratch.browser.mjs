import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';

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
  test.setTimeout(600_000);
  if(!process.env.NYC_REAL){
    const bytes=readFileSync(local);
    await page.route(ZENODO,route=>route.fulfill({status:200,body:bytes,headers:{'access-control-allow-origin':'*'}}));
  }
  // ONE DOWNLOAD FOR ALL THREE WORKFLOWS: the second and third read the device's copy. The practitioner, 2026-11-04:
  // *"I had to download the data set for NYC twice for 2 workflows. Double download."*
  let downloads=0;
  page.on('request',request=>{if(request.url()===ZENODO)downloads++;});
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  for(const workflow of manual.workflows){
    await performManual(page,workflow);
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
