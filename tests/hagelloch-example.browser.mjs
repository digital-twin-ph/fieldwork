import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The first worked example built on a file this project did not author, and the first where
// place, time and person meet on one record. john-snow-data-sets.md established the limit the
// cholera study hits -- "the three cannot be joined at the level of a case" -- and worked
// example 10 is shaped by it. This one joins them.
test('Hagelloch runs offline, and its awkward columns are not cleaned up',async({page,context})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // One point per child, and the curve and the map are drawn from the SAME records.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const cases=saved.nodes.find(n=>n.id==='cases');
  expect(cases.params.data.features.length).toBe(188);
  expect(saved.edges.filter(e=>e.from==='cases').length).toBe(3);
  // The village bounds what is reasoned within, which is what a study area is for.
  expect(saved.nodes.some(n=>n.type==='study_area')).toBe(true);

  // The absence that is an outcome: 176 children recovered, and the file still says so.
  const noDeath=cases.params.data.features.filter(f=>!f.properties.date_of_death).length;
  expect(noDeath).toBe(176);
  // The constant column is still constant. A worked example that cleaned its data would teach
  // the opposite of what this one is for.
  const complications=new Set(cases.params.data.features.map(f=>f.properties.complications));
  expect([...complications]).toEqual(['yes']);
  // And the original local frame is still on every record, so the georeference is reversible.
  expect(cases.params.data.features.every(f=>typeof f.properties.x_loc==='number')).toBe(true);

  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Epidemic curve · by day of prodrome'}).click();
  // 1861-10-30 to 1862-01-24 is 87 days, one bin each: the curve is drawn from the same 188
  // records the map below is drawn from, which is what this example exists to show.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('87 rows');

  // Offline, like every other example.
  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  expect(errors).toEqual([]);
});
