import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** AN IMPORT MUST NOT LEAVE THE LAST WORKFLOW'S ANSWER ON SCREEN.
 *
 *  The practitioner, 2026-10-24, having fetched South London from the catalog: *"Loaded South
 *  London successfully, but it not clear the results panel. The Geoprivacy results are still
 *  there."* They were -- 250 death locations and a private-source map, tabbed under a workflow
 *  about water companies, with Results counting seven. Opening a new empty canvas already
 *  cleared the previous run; importing did not, on either path. */
const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-workflow.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('importing a workflow clears the previous run',{skip},async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  // A worked example that produces results, run to completion so there is something to be stale.
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="results"]').click();
  const tabs=page.locator('#result-tabs button');
  expect(await tabs.count()).toBeGreaterThan(0);
  await expect(page.locator('#result-tabs')).toContainText('private source');

  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="mortality"]')).toBeVisible({timeout:20000});

  // The panel no longer offers another workflow's answer.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs')).not.toContainText('private source');
  await expect(page.locator('#result-tabs')).not.toContainText('moved points');
  expect(await tabs.count()).toBe(0);
  // And it says there is nothing yet, rather than showing nothing and explaining nothing.
  await expect(page.locator('#results-empty')).toBeVisible();
});
