import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE EMPTY CANVAS KNOWS WHETHER A PROJECT IS OPEN (2026-11-17). Just after Create project it offered Create a project
 *  again, as step 1 of 2. In a project of one's own it is step 2, the study area; either way it points to a finished
 *  project to look at first. */
test('the empty canvas asks for a project before there is one, and for a study area after',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  const card=page.locator('#blank-canvas');
  await expect(card).toBeVisible();
  await expect(card).toContainText('STEP 1 OF 2');await expect(page.locator('#blank-project')).toBeVisible();
  await expect(card).not.toContainText('1854');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Test Raster Project');
  await page.locator('#project-create').click();
  await page.locator('[data-view="workflow"]').click();
  await expect(card).toContainText('STEP 2 OF 2');
  await expect(card).toContainText('Test Raster Project is open');
  await expect(page.locator('#blank-project')).toBeHidden();
  await page.locator('#blank-area').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);await expect(card).toBeHidden();
  await page.locator('#undo-button').click();await expect(card).toBeVisible();
  await page.locator('#blank-examples').click();
  await expect(page.locator('#project-tab-examples')).toBeVisible();
  expect(errors).toEqual([]);
});
