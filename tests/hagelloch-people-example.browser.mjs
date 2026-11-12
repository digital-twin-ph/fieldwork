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
  // A POPULATION PYRAMID (experiment 210, 2026-11-12): the girls and boys back to back, the ages 0 to 15 up the middle
  // with the youngest at the bottom, and the children with no gender recorded said, not drawn.
  await page.getByRole('tab',{name:'Age and gender pyramid'}).click();
  await expect(page.locator('#vega-chart svg.marks')).toBeVisible({timeout:30_000});
  await expect(page.locator('#vega-chart [aria-label^="Y-axis"]').first()).toHaveAttribute('aria-label',/16 values: 15, 14, 13, 12, 11, ending with 0/);
  await expect(page.locator('#vega-chart svg.marks')).toContainText('11 with gender blank are not drawn.');
  await expect(page.locator('#vega-chart svg.marks')).toContainText('f ← count → m');
  await page.screenshot({path:'test-results/hagelloch-people-example.png',fullPage:true});
  expect(errors).toEqual([]);
});
