import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';

/** SEA-LEVEL RISE AT MANILA'S HEALTH FACILITIES, FROM AN EMPTY CANVAS, by performing
 *  example-2026-sea-level-rise-philippines' own manual. The projections are fetched from raw.githubusercontent.com at a
 *  fixed commit, and this test answers that URL from the checkout beside this repository. SEA_LEVEL_EXPORT saves the
 *  project for the example repository. */
test.use({serviceWorkers:'block'});

const REPO=new URL('../../example-2026-sea-level-rise-philippines/',import.meta.url);
const MANUAL=new URL('manual.json',REPO);
const skip=existsSync(MANUAL)?false:'example-2026-sea-level-rise-philippines is not checked out beside this repository.';

test('sea-level rise at Manila’s health facilities, built by following the manual',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(600_000);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2026-sea-level-rise-philippines\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*','content-type':'text/plain'}});
  });
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  for(const [index,workflow] of manual.workflows.entries()){
    await performManual(page,workflow,{repo:REPO});
    await page.screenshot({path:`test-results/sea-level-${index+1}.png`});
  }
  await page.locator('[data-view="project"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Sea-level rise at Manila'}).first();
  await expect(block).toContainText(`${manual.workflows.length} workflow`);
  if(process.env.SEA_LEVEL_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.SEA_LEVEL_EXPORT);
  }
});
