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

  // Two workflows on one canvas: one over a table, one over a point layer. Neither reads the
  // other -- Snow's Table 1 carries no place and a death location carries no date.
  for(const label of ['A · Snow 1855 Table 1','A · Band each day by its deaths',
    'B · 250 buildings, with the deaths recorded in each','B · Band each building, and flag the worst'])
    await expect(page.locator('.react-flow__node').filter({hasText:label}).first()).toBeVisible();

  // The rules are on the node, not chosen from a list: the Inspector shows what this step
  // applies and names it as written here.
  await page.locator('.react-flow__node[data-id="day"]').click();
  await expect(page.locator('#inspector-content')).toContainText('A day, banded by how many died on it');

  // A · the table half, which a ruleset could not read at all before 2026-10-16. The judgement
  // arrives as a column beside the number it was made about.
  await page.getByRole('tab',{name:'A · Days, banded'}).click();
  const panel=page.locator('#result-panel, .result-body, main').first();
  await expect(panel).toContainText('1854-08-19');
  await expect(panel).toContainText('NoDeaths');
  await expect(panel).toContainText('Few');

  // B · the point half, through the same rule form.
  await page.getByRole('tab',{name:'B · Buildings, listed'}).click();
  await expect(panel).toContainText('Single');
  await expect(panel).toContainText('Cluster');
  expect(errors).toEqual([]);
});
