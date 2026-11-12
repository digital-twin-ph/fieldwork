import {test,expect} from './fixtures.mjs';
import {mkdir} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';
// On Hagelloch since 2026-11-11: this ran on the heat example, whose decision outputs and second outreach branch retired
// with it (docs/audits/old-naledi-audit.md). What stays tested is general: one tab per output, keyboard tabs, removing an
// output, an offline reload, and the phone layout.
test("Independent result tabs, removal and offline reload",async({page,context})=>{
const errors=collectPageErrors(page);
const done=()=>expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
const run=async()=>{await page.locator('#run-button').click();await done();await page.locator('[data-view="results"]').click();};
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');await done();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await page.getByRole('tab',{name:'Where the cases were'}).click();
  await expect(page.locator('#map-panel')).toBeVisible();
  await page.getByRole('tab',{name:'Every case, as recorded'}).click();
  await expect(page.locator('#table-panel')).toBeVisible();
  await expect(page.locator('#result-rows tr')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'Every case, as recorded'}).press('ArrowLeft');
  // No tab click between the keypress and the assertion: clicking the view tab takes the focus this is about.
  await expect(page.getByRole('tab',{name:'Where the cases were'})).toBeFocused();

  // Remove an output, rerun: its tab goes and the others stay.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="table"]').click();
  await page.locator('#delete-node').click();await run();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByRole('tab',{name:'Every case, as recorded'})).toHaveCount(0);

  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready',{timeout:45000});
  await context.setOffline(true);await page.reload();await done();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab')).toHaveCount(3);
  await context.setOffline(false);
  await page.locator('#reset-button').click();await run();
  await expect(page.getByRole('tab')).toHaveCount(4);
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/output-tabs-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Every case, as recorded'}).click();
  await expect(page.locator('#table-panel')).toBeVisible();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile horizontal overflow');
  await page.screenshot({path:'test-results/output-tabs-mobile.png',fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
});
