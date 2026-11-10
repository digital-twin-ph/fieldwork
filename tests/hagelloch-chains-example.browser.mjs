import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// HAGELLOCH'S SECOND WORKFLOW, AS SHIPPED (experiment 200): opened from the project, it runs as it stands and shows the
// serial intervals, the secondary cases and the transmission tree.
test('Hagelloch: who infected whom opens, runs, and shows the intervals, the secondary cases and the tree',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await page.goto('/?example=hagelloch-chains');
  // Filed under its project, beside the curve and the map, not under the first example.
  await expect(page.locator('#project-select option:checked')).toHaveText('Measles in Hagelloch, 1861 · 3 workflows');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90_000});
  await page.locator('[data-view="results"]').click();
  const tabs=page.locator('#result-tabs [data-output]');
  await expect(tabs).toHaveCount(4);
  await page.getByRole('tab',{name:'▥ Who infected whom',exact:true}).click();
  // Drawn by Vega-Lite (the practitioner, 2026-11-09): a symbol per case, and two rules per link, down then across.
  await expect(page.locator('#vega-chart g.mark-symbol.role-mark path')).toHaveCount(188,{timeout:30_000});
  await expect(page.locator('#vega-chart g.mark-rule.role-mark line')).toHaveCount(368);
  await expect(page.locator('#vega-chart svg.marks')).toContainText('No infector recorded');
  await expect(page.locator('main').first()).toContainText('188 cases in 4 chains');
  await page.getByRole('tab',{name:'Secondary cases per child'}).click();
  await expect(page.locator('main').first()).toContainText('secondary_cases');
  await page.getByRole('tab',{name:'Serial intervals'}).click();
  await expect(page.locator('main').first()).toContainText('serial_interval_days');
  // And on the map (step 4): a line from each infector's house to the case's, where they are two houses.
  await page.getByRole('tab',{name:'Who infected whom, on the map'}).click();
  await expect(page.locator('#map line.map-link')).toHaveCount(94);
  await expect(page.locator('#result-metrics')).toContainText('94 lines drawn');
  await expect(page.locator('#result-metrics')).toContainText('90 links at one place, not drawn');
  await expect(page.locator('#result-metrics')).toContainText('4 name nothing in infector');
  await expect(page.locator('#map-communication-key')).toContainText('Line into generation 3 (46)');
  await page.screenshot({path:'test-results/hagelloch-chains-example.png',fullPage:true});
  expect(errors).toEqual([]);
});
