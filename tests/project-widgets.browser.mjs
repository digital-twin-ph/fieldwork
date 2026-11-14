import {test,expect} from './fixtures.mjs';

/** A PROJECT'S WIDGETS TAB (2026-11-14): each widget its workflows use, as which steps, with its manual one press away,
 *  and each workflow one press away. Snow's London, built in: six workflows. */
test('the Widgets tab names each widget the project uses, its workflows and steps, and opens a manual and a workflow',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-deaths');
  await page.locator('[data-view="widgets"]').click();
  // A workflow is not opened while one runs: its buttons say so, as the selector does, until the run is done.
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await expect(page.locator('#widgets-view [data-open-workflow]').first()).toBeEnabled();
  const view=page.locator('#widgets-view');
  await expect(view).toContainText('Widgets in 1854 Cholera Outbreak in London');
  await expect(view).toContainText('across 6 workflows');
  const network=view.locator('tr[data-widget="network_input"]');
  await expect(network).toContainText('Street network');
  await expect(network.locator('[data-open-workflow]').first()).toBeVisible();
  // The manual, from here as from the Inspector.
  const withManual=view.locator('[data-widget-manual]').first();
  const type=await withManual.getAttribute('data-widget-manual');
  await withManual.click();
  await expect(page.locator('#manual-dialog')).toBeVisible();
  await page.locator('#manual-close').click();
  // A workflow, opened on its canvas.
  const open=network.locator('[data-open-workflow]').first(),name=(await open.textContent()).trim();
  await open.click();
  await expect(page.locator('#workflow-view')).toBeVisible();
  await expect(page.locator('#workflow-select option:checked')).toContainText(name.replace(/^\d+ · /,'').slice(0,20));
  expect(type).toBeTruthy();
});
