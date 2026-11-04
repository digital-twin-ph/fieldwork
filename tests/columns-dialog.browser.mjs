import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** WHAT THE COLUMNS MEAN, declared from the authors' own data dictionary (experiment 172). The practitioner,
 *  2026-11-04, on a regression table whose terms read `o3_lag02_10`: *"I am noticing that the regression table uses
 *  variables we did not select"*, then *"So let's include the data dictionary work. It's actually critical for data
 *  quality work. Which is upstream."* */
test.use({serviceWorkers:'block'});

const ZENODO='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
const REPO=new URL('../../example-2025-nyc-ozone/',import.meta.url);
const PKG=process.env.NYC_PKG;
const skip=!existsSync(new URL('manual.json',REPO))?'example-2025-nyc-ozone is not checked out beside this repository.'
  :!(PKG&&existsSync(PKG))?'Set NYC_PKG to a local copy of the authors\' Zenodo package.':false;

test('the regression table\'s columns described from the dictionary in the same zip, and the result says what each term is',async({page})=>{test.skip(!!skip,skip);
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
  const value=await page.locator('#workflow-select option').filter({hasText:'How much does ozone'}).getAttribute('value');
  await page.locator('#workflow-select').selectOption(value);
  await page.locator('[data-view="workflow"]').click();
  const table=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${table}"]`).click();
  await page.locator('#table-fetch-remote').click();
  const meaning=page.locator('[data-table-meaning]');
  await expect(meaning).toContainText('0 of 8 described',{timeout:60000});

  await page.locator('#describe-columns').click();
  const dialog=page.locator('#columns-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('summary').click();
  await dialog.locator('#columns-dictionary-entry').selectOption({label:'NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0/Metadata/Core/ANALYSIS_DATA_DICTIONARY.csv'});
  // The mapping is proposed from the dictionary's headers, and shown.
  await expect(dialog.locator('#columns-map-name')).toHaveValue('variable');
  await expect(dialog.locator('#columns-map-missing')).toHaveValue('missing_n');
  await dialog.locator('#columns-propose').click();
  await expect(dialog.locator('#columns-check')).toContainText('It describes every kept column.');
  await expect(dialog.locator('#columns-check')).toContainText('Every missing count it states agrees with the table.');
  await expect(dialog.locator('[data-column="o3_lag02_10"] legend')).toContainText('not yet accepted');
  await page.screenshot({path:'test-results/columns-dialog-proposed.png'});
  await dialog.locator('#columns-accept-all').click();
  await expect(dialog.locator('#columns-count')).toHaveText('8 of 8 described.');
  await dialog.locator('#columns-save').click();
  await expect(dialog).toHaveCount(0);
  await expect(meaning).toContainText('8 of 8 described');
  expect(downloads,'the dictionary is read from the copy on this device').toBe(1);

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('o3_lag02_10 · O3 mean over lag 0-2; divided by 10 for model scaling (10 ppb)');
  await page.screenshot({path:'test-results/regression-meanings.png'});
});
