import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';

/** EVERY FEATURE OF APPLY RULESET, FROM AN EMPTY CANVAS, by performing example-workflows-rulesets' own manual
 *  (experiment 188, stage 5). The practitioner, 2026-11-07: *"If the new apply ruleset works then we retire derive a
 *  value. "works" means we exercise the ruleset features in a worked example (repo) with workflows using synthetic data
 *  sets."* The data are made up, so every case is present by design. The tables are fetched from
 *  raw.githubusercontent.com at a fixed commit; this test answers that URL from the checkout beside this repository.
 *  RULESETS_EXPORT saves the project for the example repository. */
test.use({serviceWorkers:'block'});

const REPO=new URL('../../example-workflows-rulesets/',import.meta.url);
const MANUAL=new URL('manual.json',REPO);
const skip=existsSync(MANUAL)?false:'example-workflows-rulesets is not checked out beside this repository.';

test('rules on synthetic data, built by following the manual',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(600_000);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-workflows-rulesets\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*','content-type':'text/plain'}});
  });
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  for(const [index,workflow] of manual.workflows.entries()){
    await performManual(page,workflow,{repo:REPO});
    await page.screenshot({path:`test-results/rulesets-${index+1}.png`});
  }
  await page.locator('[data-view="project"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Rules on synthetic data'}).first();
  await expect(block).toContainText(`${manual.workflows.length} workflow`);
  if(process.env.RULESETS_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.RULESETS_EXPORT);
  }
});
