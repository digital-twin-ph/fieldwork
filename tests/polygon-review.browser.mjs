import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** CHOOSE FEATURES: SEE THEM, THEN KEEP THE ONES YOU CAME FOR.
 *
 *  The practitioner, 2026-10-29, after a read of Greater London's water areas returned 606
 *  features where two were wanted: *"Perhaps the polygon input can have a polygon viewer that has
 *  polygons in view and the rows associated with them. If I click on the row the polygon is
 *  highlighted. And then I can hide it."*
 *
 *  It replaced a design that filtered at read time by a named property and a list of values. You
 *  cannot name values you have not seen, and a read of OpenStreetMap water areas returns ponds
 *  and basins whose names nobody knows in advance -- so a typed predicate asks the practitioner
 *  to already have the answer they came for.
 *
 *  Driven on the published sub-districts rather than a fixture: 32 real features, named by their
 *  own property, which is the shape a practitioner meets. */
test.use({serviceWorkers:'block'});

const FILE=fileURLToPath(new URL('../../example-1855-cholera-south-london/geo/sub-districts-csds.geojson',import.meta.url));
const skip=existsSync(FILE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const layer=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="polygon_input"]').click();
  const id=(await saved(page)).nodes.find(n=>n.type==='polygon_input').id;
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#polygon-file').setInputFiles(FILE);
  await page.locator('#polygon-name-field').fill('subdist');
  await page.locator('#polygon-name-field').press('Tab');
  return id;
};
const open=async page=>{
  await page.locator('[data-review-polygons]').click();
  await expect(page.locator('#polygon-dialog')).toBeVisible();
};

test('every feature the read returned is a row, named by its own property',{skip},async({page})=>{
  await layer(page);
  await open(page);
  await expect(page.locator('.polygon-review-row')).toHaveCount(32);
  // Named by the property the practitioner chose, never guessed: the panel asked for `subdist`.
  await expect(page.locator('.polygon-review-row').first()).not.toContainText('undefined');
  await expect(page.locator('#polygon-review-status')).toContainText('32 of 32 features kept');
});

test('selecting a row marks it, so one feature can be found among many',{skip},async({page})=>{
  await layer(page);
  await open(page);
  const third=page.locator('.polygon-review-row').nth(2);
  await third.locator('.polygon-review-name').click();
  await expect(third).toHaveClass(/is-picked/);
  // One at a time: the mark is a pointer, and two pointers point at nothing.
  await expect(page.locator('.polygon-review-row.is-picked')).toHaveCount(1);
});

test('a feature set aside leaves the layer, and the read is untouched',{skip},async({page})=>{
  const id=await layer(page);
  await open(page);
  await page.locator('[data-keep]').nth(0).uncheck();
  await page.locator('[data-keep]').nth(1).uncheck();
  await expect(page.locator('#polygon-review-status')).toContainText('30 of 32 features kept, 2 set aside');
  await page.locator('#polygon-review-apply').click();
  await expect(page.locator('#polygon-dialog')).not.toBeVisible();

  const node=(await saved(page)).nodes.find(n=>n.id===id);
  expect(node.params.hidden.length).toBe(2);
  await expect(page.locator('[data-review-polygons]')).toContainText('2 set aside');
  // NOTHING IS DELETED, and the check is the one a practitioner can make: reopen the viewer and
  // all 32 are still listed, two of them unticked. Asserted here rather than on the saved
  // params, which carry a `dataRef` instead of the features -- the payload store keeps a 5 MB
  // read out of an 800 kB workflow.
  await open(page);
  await expect(page.locator('.polygon-review-row')).toHaveCount(32);
  await expect(page.locator('#polygon-review-status')).toContainText('30 of 32 features kept');
});

test('a feature comes back by ticking it again',{skip},async({page})=>{
  const id=await layer(page);
  await open(page);
  await page.locator('[data-keep]').nth(0).uncheck();
  await page.locator('#polygon-review-apply').click();
  await open(page);
  await page.locator('#polygon-review-all').click();
  await expect(page.locator('#polygon-review-status')).toContainText('32 of 32 features kept');
  await page.locator('#polygon-review-apply').click();
  expect((await saved(page)).nodes.find(n=>n.id===id).params.hidden).toBe(undefined);
});

test('setting every feature aside is refused, because the layer would hold nothing',{skip},async({page})=>{
  await layer(page);
  await open(page);
  for(const box of await page.locator('[data-keep]').all())await box.uncheck();
  await expect(page.locator('#polygon-review-status')).toContainText('would hold nothing');
  await expect(page.locator('#polygon-review-apply')).toBeDisabled();
});

test('cancel keeps what was there before',{skip},async({page})=>{
  const id=await layer(page);
  await open(page);
  await page.locator('[data-keep]').nth(0).uncheck();
  await page.locator('#polygon-review-cancel').click();
  await expect(page.locator('#polygon-dialog')).not.toBeVisible();
  expect((await saved(page)).nodes.find(n=>n.id===id).params.hidden).toBe(undefined);
});
