import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// HAGELLOCH'S FIFTH WORKFLOW (the practitioner, 2026-11-12): who fell ill, by age and gender and by school class, from
// the 188 cases as the file has them; the 11 with no gender recorded are counted as a group of their own.
test('Hagelloch: who fell ill opens, runs, and counts the children by age, gender and school class',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await page.goto('/?example=hagelloch-people');
  await expect(page.locator('#project-select option:checked')).toHaveText('Measles in Hagelloch, 1861 · 5 workflows');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90_000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output]')).toHaveCount(3);
  await page.getByRole('tab',{name:'Cases by school class'}).click();
  const main=page.locator('main').first();
  for(const [code,count] of [['0','90'],['1','30'],['2','68']])
    await expect(main.locator('tr',{has:page.locator('td',{hasText:new RegExp(`^${code}$`)})}).first()).toContainText(count);
  await page.getByRole('tab',{name:'Cases by age, one panel per gender'}).click();
  await expect(page.locator('#vega-chart svg.marks')).toBeVisible({timeout:30_000});
  // Ages as numbers, 0 to 15, not in the order the rows came; and the blank gender drawn, in a panel named as blank.
  await expect(page.locator('#vega-chart [aria-label^="X-axis"]').last()).toHaveAttribute('aria-label',/16 values: 0, 1, 2, 3, 4, ending with 15/);
  await expect(page.locator('#vega-chart svg.marks')).toContainText('gender blank');
  await expect(page.locator('#vega-chart g.mark-rect.role-mark path')).toHaveCount(38);
  await page.screenshot({path:'test-results/hagelloch-people-example.png',fullPage:true});
  expect(errors).toEqual([]);
});
