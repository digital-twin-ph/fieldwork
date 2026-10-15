import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The worked example whose subject is the ruleset widget. A practitioner opens it to see how a
// rule is put together, so what matters here is that it is REACHABLE and that it RUNS -- the
// conclusions themselves are checked in tests/ruleset-example.test.mjs against the real engine.
test('the ruleset example is offered, runs, and shows each condition kind',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('#example-select')).toHaveValue('rulesets');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});

  // Three steps, one condition kind each, named so the canvas reads as a lesson.
  for(const label of ['1 · Banding a number','2 · Alternatives, and two conclusions at once','3 · Matching a category'])
    await expect(page.locator('.react-flow__node').filter({hasText:label}).first()).toBeVisible();

  // The rules are on the node, not chosen from a list: the Inspector shows what this step
  // applies and names it as written here.
  await page.locator('.react-flow__node[data-id="wait"]').click();
  await expect(page.locator('#inspector-content')).toContainText('Waiting time, in bands');

  // And the result carries the conclusion the rules reached, including the branch a reader
  // forgets: a record with no waiting time is Unrecorded, not zero.
  await page.getByRole('tab',{name:'1 · Bands'}).click();
  const panel=page.locator('#result-panel, .result-body, main').first();
  await expect(panel).toContainText('Unrecorded');
  await expect(panel).toContainText('Short');
  await expect(panel).toContainText('Long');
  expect(errors).toEqual([]);
});
