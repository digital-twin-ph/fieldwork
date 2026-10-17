import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "The study area versions should be selectable in the study area inspector so investigators can
// go back to previous assumptions." -- the practitioner, 2026-10-17. The case behind it is an
// outbreak crossing a border: the area widens to catch it, and finding it did not after all
// should narrow it back WITHOUT losing the record that it was once wider.
const bounds=async(page,east)=>{
  await page.locator('#edit-study-area').click();
  await page.locator('#area-online').uncheck();
  await page.getByText('Enter bounding coordinates',{exact:true}).click();
  await page.locator('#area-west').fill('25.80');
  await page.locator('#area-south').fill('-24.70');
  await page.locator('#area-east').fill(east);
  await page.locator('#area-north').fill('-24.60');
  await page.locator('#area-use-bounds').click();
  await page.locator('#area-apply').click();
};
const history=page=>page.evaluate(()=>{
  const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
  const area=w.nodes.find(n=>n.type==='study_area');
  return (area.params.revisions||[]).map(r=>({at:r.at,east:r.geometry.coordinates[0][1][0],from:r.restoredFrom}));
});

test('a study area keeps every extent, and an earlier one can be restored',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-add="study_area"]').click();

  await bounds(page,'25.90');
  await expect.poll(async()=>(await history(page)).length).toBe(1);
  // One extent is not a history: nothing to choose between, so nothing is offered.
  await expect(page.locator('[data-restore-extent]')).toHaveCount(0);

  // The area widens, the way it would when cases turn up across a border.
  await bounds(page,'26.40');
  const widened=await history(page);
  expect(widened.length).toBe(2);
  expect(widened[1].east).toBeGreaterThan(widened[0].east);

  // Both extents are offered, newest marked current.
  await expect(page.locator('#inspector-content')).toContainText('Extent history');
  await expect(page.locator('#inspector-content')).toContainText('2 extents kept');
  await expect(page.locator('[data-restore-extent]')).toHaveCount(1);

  // Go back to the first assumption.
  await page.locator('[data-restore-extent="0"]').click();
  const restored=await history(page);
  expect(restored.length).toBe(3,'restoring APPENDS; the wider extent is still on the record');
  expect(restored[2].east).toBeCloseTo(restored[0].east,6);
  expect(restored[2].from).toBe(1);
  // And the wider extent it replaced is still there to go back to.
  expect(restored[1].east).toBeGreaterThan(restored[2].east);
  await expect(page.locator('#inspector-content')).toContainText('restored v1');
  await expect(page.locator('[data-restore-extent]')).toHaveCount(2);

  expect(errors).toEqual([]);
});
