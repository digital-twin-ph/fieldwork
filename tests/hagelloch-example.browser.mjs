import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// The first worked example built on a file this project did not author, and the first where
// place, time and person meet on one record. john-snow-data-sets.md established the limit the
// cholera study hits -- "the three cannot be joined at the level of a case" -- and worked
// example 10 is shaped by it. This one joins them.
test('Hagelloch runs offline, and its awkward columns are not cleaned up',async({page,context})=>{
  const errors=collectPageErrors(page);
  // ONE VISIT. Opening "/" first, to clear storage a new context never holds, cancelled that page's registration of the
  // offline worker; on Linux WebKit in CI the second page's then never became ready, and "Available offline" never came
  // (every main run from 0.70 to 0.73).
  await page.goto('/?example=hagelloch');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // One point per child, and the curve and the map are drawn from the SAME records.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const cases=saved.nodes.find(n=>n.id==='cases');
  // Kept in the payload store by content from 0.88.1, not inline in local storage: read through the step's reference.
  const data=cases.params.data??await page.evaluate(ref=>new Promise((resolve,reject)=>{const open=indexedDB.open('fieldwork');
    open.onsuccess=()=>{const get=open.result.transaction('payloads').objectStore('payloads').get(ref);get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);};
    open.onerror=()=>reject(open.error);}),cases.params.dataRef);
  expect(data.features.length).toBe(188);
  // The curve, the day of the week, the map and the table: four views of the same 188 records.
  expect(saved.edges.filter(e=>e.from==='cases').length).toBe(4);
  // The village bounds what is reasoned within, which is what a study area is for.
  expect(saved.nodes.some(n=>n.type==='study_area')).toBe(true);

  // The absence that is an outcome: 176 children recovered, and the file still says so.
  const noDeath=data.features.filter(f=>!f.properties.date_of_death).length;
  expect(noDeath).toBe(176);
  // The constant column is still constant. A worked example that cleaned its data would teach
  // the opposite of what this one is for.
  const complications=new Set(data.features.map(f=>f.properties.complications));
  expect([...complications]).toEqual(['yes']);
  // And the original local frame is still on every record, so the georeference is reversible.
  expect(data.features.every(f=>typeof f.properties.x_loc==='number')).toBe(true);

  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Epidemic curve · by day of prodrome'}).click();
  // 1861-10-30 to 1862-01-24 is 87 days, one bin each: the curve is drawn from the same 188
  // records the map below is drawn from, which is what this example exists to show.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('87 rows');

  // BY DAY OF THE WEEK (2026-11-12): seven bars, Monday first, the file's own counts. Thursday is highest, 34 against
  // about 27 expected, which is within chance (chi-square 4.3 on 6 degrees of freedom).
  await page.getByRole('tab',{name:'Cases by day of the week'}).click();
  await expect(page.locator('#result-metrics')).toContainText('7 rows');
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const counts=days.map(d=>data.features.filter(f=>days[(new Date(f.properties.date_of_prodrome+'T00:00:00Z').getUTCDay()+6)%7]===d).length);
  expect(counts).toEqual([23,21,25,34,30,27,28]);
  await expect(page.locator('#vega-chart [aria-label^="X-axis"]').last()).toHaveAttribute('aria-label',/7 values: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday/);

  // Offline, like every other example.
  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  expect(errors).toEqual([]);
});
