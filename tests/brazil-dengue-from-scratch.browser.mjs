import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';

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
  test.setTimeout(600_000);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2024-brazil-dengue\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*','content-type':'text/plain'}});
  });
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  for(const [index,workflow] of manual.workflows.entries()){
    await performManual(page,workflow);
    await page.screenshot({path:`test-results/brazil-${index+1}.png`});
    await page.locator('[data-view="workflow"]').click();await page.locator('#tidy-button').click();
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
