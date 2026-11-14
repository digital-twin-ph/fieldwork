import {test,expect} from './fixtures.mjs';

/** A WIDGET'S MANUAL PAGE, DETACHED (2026-11-14: "Can the Manual be detached?"): not modal, so the step's Configure… can be
 *  opened beside it; kept through a reload; closed only by Close. And its italics render, not their asterisks. */
test('a widget’s manual page detaches, stays beside a dialog and through a reload, and closes',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch-people');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="apply_ruleset"]').click();
  await page.locator('#open-manual').click();
  const dialog=page.locator('#manual-dialog');
  await expect(dialog.locator('em').first()).toHaveText('if');
  await expect(dialog).not.toContainText('*if*');
  await dialog.locator('#manual-detach-page').click();
  await expect(dialog).toHaveCount(0);
  const panel=page.locator('#widget-manual-float');
  await expect(panel).toContainText('Manual · Apply ruleset');
  // Not modal: the step's own dialog opens with the page still readable.
  await page.locator('#configure-step').click();
  await expect(page.locator('#ruleset-config')).toBeVisible();
  await expect(panel).toBeVisible();
  await page.locator('#ruleset-config #config-cancel').click();
  await page.reload();
  await expect(page.locator('#widget-manual-float')).toContainText('Apply ruleset',{timeout:30000});
  await page.locator('#widget-manual-float-close').click();
  await expect(page.locator('#widget-manual-float')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#widget-manual-float')).toHaveCount(0);
});
