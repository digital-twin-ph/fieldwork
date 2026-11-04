import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** A FETCHED FILE IS DOWNLOADED ONCE, AND EVERY WORKFLOW ON IT RUNS. The practitioner, 2026-11-04: *"For NYC when I run
 *  workflows from notes it only runs 2 and there are 4 workflows"*, and *"I am back to having to download it for every
 *  tabular input in the NYC workflows"*. Measured on the live site: one download, but the second Fetch the table said
 *  nothing about reading the device's copy, and a workflow whose table had not been fetched loaded without running. */
test.use({serviceWorkers:'block'});

const ZENODO='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
const REPO=new URL('../../example-2025-nyc-ozone/',import.meta.url);
const PKG=process.env.NYC_PKG;
const skip=!existsSync(new URL('manual.json',REPO))?'example-2025-nyc-ozone is not checked out beside this repository.'
  :!(PKG&&existsSync(PKG))?'Set NYC_PKG to a local copy of the authors\' Zenodo package.':false;

test('NYC from its pin: one download, the rest read from the device, and Notes runs all four',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(300_000);
  let downloads=0;
  await page.route(ZENODO,route=>{downloads++;route.fulfill({status:200,body:readFileSync(PKG),headers:{'access-control-allow-origin':'*'}});});
  await page.route(/raw\.githubusercontent\.com/,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO))});
  });
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]')).toContainText('digest matched',{timeout:30000});
  const open=async name=>{
    const value=await page.locator('#workflow-select option').filter({hasText:name}).getAttribute('value');
    await page.locator('#workflow-select').selectOption(value);
    await page.locator('[data-view="workflow"]').click();
    const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  };

  // The first fetch downloads, and says so where it stays.
  await open('What happened');
  await page.locator('#table-fetch-remote').click();
  await expect(page.locator('[data-table-remote]')).toContainText('downloaded from zenodo.org',{timeout:60000});
  expect(downloads).toBe(1);

  // Another workflow on the same file: opening it fills its table from the device's copy, and it runs, with nothing
  // pressed and nothing downloaded.
  await open('Did visits move');
  await expect(page.locator('[data-table-remote]')).toContainText('read from the copy on this device',{timeout:60000});
  await expect(page.locator('#table-fetch-remote')).toHaveCount(0);
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  expect(downloads).toBe(1);
  // And the regression, as in the practitioner's photograph of 2026-11-04.
  await open('How much does ozone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  expect(downloads).toBe(1);

  // Notes runs all four, and says so only because all four ran.
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-run-pending]').click();
  // Two had already run on opening, so Notes runs the other two; then all four are in the write-up.
  await expect(page.locator('#toast')).toContainText('The write-up now holds the whole project',{timeout:120000});
  await expect(page.locator('#notes-view')).toContainText("All 4 of this project's workflows have run in this session");
  expect(downloads).toBe(1);
});
