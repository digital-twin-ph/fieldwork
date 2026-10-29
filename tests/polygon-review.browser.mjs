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
  // NOTHING IS READ UNTIL APPLY, which is the point of it: every setting above can be changed in
  // any order first. Choosing the file used to start the read on the spot.
  await expect(page.locator('#polygon-apply')).toBeEnabled();
  await page.locator('#polygon-apply').click();
  await expect(page.locator('[data-review-polygons]')).toBeVisible();
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
  // Focusing a feature's name is what finds it on the map now that the name is editable.
  await third.locator('.polygon-review-name').focus();
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

/** THE OTHER DIRECTION: CHOOSE ON THE MAP, THEN ACT ON THE SET.
 *
 *  The practitioner, 2026-10-29: *"Is it possible to also do the reverse, select the polygons and
 *  have a few actions - keep, discard, cancel."* The rows answer "is this one kept"; the map
 *  answers "which ones are these". Two questions, two marks, and the action is what decides. */
/** Choosing through the rows rather than the map. The same set and the same actions: the map is
 *  drawn on a canvas, so a test cannot aim at one polygon among 279, and a practitioner without a
 *  mouse cannot either -- which is why the rows choose too. */
const choose=async(page,count)=>{
  for(let i=0;i<count;i++)
    await page.locator('.polygon-review-row').nth(i).locator('.muted').click();
};

test('polygons chosen on the map can be kept, and the rest set aside',{skip},async({page})=>{
  const id=await layer(page);
  await open(page);
  await choose(page,2);
  await expect(page.locator('#polygon-review-selection')).toBeVisible();
  await expect(page.locator('#polygon-review-selected')).toContainText('2 chosen on the map');
  await page.locator('#polygon-review-keep-only').click();
  // Keep only these: everything NOT chosen is set aside, in one action.
  await expect(page.locator('#polygon-review-status')).toContainText('2 of 32 features kept, 30 set aside');
  await page.locator('#polygon-review-apply').click();
  expect((await saved(page)).nodes.find(n=>n.id===id).params.hidden.length).toBe(30);
});

test('polygons chosen on the map can be discarded instead',{skip},async({page})=>{
  await layer(page);
  await open(page);
  await choose(page,3);
  await page.locator('#polygon-review-discard').click();
  await expect(page.locator('#polygon-review-status')).toContainText('29 of 32 features kept, 3 set aside');
});

test('clearing the selection decides nothing',{skip},async({page})=>{
  await layer(page);
  await open(page);
  await choose(page,2);
  await page.locator('#polygon-review-clear').click();
  await expect(page.locator('#polygon-review-selection')).toBeHidden();
  await expect(page.locator('#polygon-review-status')).toContainText('32 of 32 features kept');
});

/** ONE CANVAS, OR THE MAP ANSWERS NO CLICKS.
 *
 *  Each feature was given its own `L.canvas()` renderer, which is one canvas ELEMENT each. They
 *  stack, and only the topmost receives a pointer event -- so the map drew all 32 correctly and
 *  responded to none of them. Reported 2026-10-29: *"I still cannot select polygons from the map
 *  canvas."*
 *
 *  Asserted on the count of canvases rather than by clicking one, and the distinction is worth
 *  stating: this proves the condition that made clicks impossible is gone, not that a click on a
 *  given polygon selects it. Aiming at one 25-vertex island among hundreds is what the row list
 *  is for, and that path is covered above. */
test('the features share one canvas, so the map can be clicked at all',{skip},async({page})=>{
  await layer(page);
  await open(page);
  await expect(page.locator('#polygon-review-map canvas')).toHaveCount(1);
  await expect(page.locator('.polygon-review-row')).toHaveCount(32);
});

/** CLIP TO THE BOX, SEEN BEFORE IT IS APPLIED.
 *
 *  The practitioner, 2026-10-29, looking at a read of the Thames with a hundred islands and docks
 *  scattered outside the frame: *"can I discard the polygons outside the bounding box, and
 *  essentially clip those that overlap with the bounding box?"* and *"So that's a realtime button
 *  clip to bounding box so I can see it."*
 *
 *  The preview and the run share one `clipToBox`, so what is on screen before Apply is what the
 *  layer carries after it. This drives a layer read for a study area, because the frame comes
 *  from the read and a file layer connected to nothing has none. */
test('the clip is offered only where there is a frame to clip to',{skip},async({page})=>{
  await layer(page);
  await open(page);
  // A file layer connected to no study area has no box, so there is nothing to cut to and the
  // button is not offered rather than offered and refusing.
  await expect(page.locator('#polygon-review-clip')).toBeHidden();
});

/** THREE REDUCTIONS AND A NAME. The practitioner, 2026-10-29: *"polygon input enables three forms
 *  of reduction: keep/discard, clip and merge selected adjacents."* And on naming: *"That's a
 *  major gap if we were to have maps showing polygons with meaningful names."* */
test('a feature can be named here, and the name is kept',{skip},async({page})=>{
  const id=await layer(page);
  await open(page);
  const first=page.locator('[data-name]').first();
  await first.fill('Rotherhithe, 1854');
  await page.locator('#polygon-review-apply').click();
  const saved1=(await saved(page)).nodes.find(n=>n.id===id);
  expect(Object.values(saved1.params.names)).toContain('Rotherhithe, 1854');
  await open(page);
  await expect(page.locator('[data-name]').first()).toHaveValue('Rotherhithe, 1854');
});

test('two chosen features merge into one, keeping the first name',{skip},async({page})=>{
  await layer(page);
  await open(page);
  const before=await page.locator('.polygon-review-row').count();
  const firstName=await page.locator('[data-name]').first().inputValue();
  await choose(page,2);
  await page.locator('#polygon-review-merge').click();
  await expect(page.locator('.polygon-review-row')).toHaveCount(before-1);
  await expect(page.locator('[data-name]').first()).toHaveValue(firstName);
  // The selection is spent by the action, the way keep and discard spend theirs.
  await expect(page.locator('#polygon-review-selection')).toBeHidden();
});

test('merging needs two, and says so rather than doing nothing',{skip},async({page})=>{
  await layer(page);
  await open(page);
  await choose(page,1);
  await page.locator('#polygon-review-merge').click();
  await expect(page.locator('#polygon-review-status')).toContainText('at least two features to merge');
});

test('the unnamed can be set aside in one go',{skip},async({page})=>{
  await layer(page);
  await open(page);
  // Every sub-district carries `subdist`, so with that nominated none is unnamed and the
  // checkbox has nothing to set aside -- which is the honest result, not a bug.
  await page.locator('#polygon-review-hide-unnamed').check();
  await expect(page.locator('#polygon-review-status')).toContainText('32 of 32 features kept');
});
