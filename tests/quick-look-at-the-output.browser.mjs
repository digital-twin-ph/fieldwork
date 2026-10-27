/** QUICK LOOK AT WHAT A STEP PRODUCED, for every widget that emits a table.
 *
 *  The practitioner, 2026-10-27: *"Any widget that works on a table and outputs a table should
 *  enable Quick Look at the output table."*
 *
 *  THE OBSTACLE WAS NOT THE BUTTON. Only an output widget produces a result tab, so a step in
 *  the middle of a chain had no surface at all -- its table existed for the length of
 *  `executeWorkflow` and was then dropped. `curve` here is exactly that case: a `case_series`
 *  that emits a table, feeds a chart and a map, and owns no tab of its own. On Snow's contingency
 *  workflow it is four of the nine steps.
 *
 *  So the run keeps the tables it passed between steps, and the Inspector offers the one this
 *  node produced. Derived from `TYPES[type].output==='table'`, so relate, group, derive and
 *  select rows are covered without being named.
 */
import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

const openHagelloch=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
};

test('a step with no result tab of its own still offers a look at its table',async({page})=>{
  const errors=collectPageErrors(page);
  await openHagelloch(page);

  // The premise: this step owns no result tab. If that stops being true the test is testing
  // something easier than it means to, so it is asserted rather than assumed.
  const tabs=await page.locator('#result-tabs [data-output]').evaluateAll(bs=>bs.map(b=>b.dataset.output));
  expect(tabs).not.toContain('curve');

  await page.locator('.react-flow__node[data-id="curve"]').click();
  const quickLook=page.locator('#output-quick-look');
  await expect(quickLook).toBeVisible();
  await quickLook.click();

  const viewer=page.locator('#table-viewer');
  await expect(viewer).toBeVisible();
  // THIS step's table, named for it, and with its own columns: a case series is keyed by period
  // and counts cases, which is what tells it apart from the two tables either side of it.
  await expect(viewer).toContainText('output');
  await expect(viewer).toContainText('period');
  await expect(viewer).toContainText('cases');
  expect(await viewer.locator('table tbody tr').count()).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  expect(errors).toEqual([]);
});

test('a step that emits no table is offered no look at one',async({page})=>{
  const errors=collectPageErrors(page);
  await openHagelloch(page);
  // The study area emits a boundary, not a table.
  await page.locator('.react-flow__node[data-id="village"]').click();
  await expect(page.locator('#inspector-content')).toBeVisible();
  await expect(page.locator('#output-quick-look')).toHaveCount(0);
  await expect(page.locator('#inspector-content')).not.toContainText('This step emits a table');
  expect(errors).toEqual([]);
});

test('the table the viewer shows is the one this step produced, not a neighbour\'s',async({page})=>{
  const errors=collectPageErrors(page);
  await openHagelloch(page);
  await page.locator('.react-flow__node[data-id="curve"]').click();
  await page.locator('#output-quick-look').click();
  const viewer=page.locator('#table-viewer');
  await expect(viewer).toBeVisible();
  const rows=await viewer.locator('table tbody tr').count();
  // The case series bins 188 cases by day of prodrome, so it has fewer rows than the 188-row
  // case table that sits downstream of it. Reading the wrong table would show that one.
  expect(rows).toBeLessThan(188);
  expect(rows).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
