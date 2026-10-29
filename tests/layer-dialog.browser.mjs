import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** MANAGE LAYERS, EXERCISED ON THE WORKED EXAMPLE.
 *
 *  The practitioner, 2026-10-29: *"We can exercise those features on the South London example."*
 *  So these drive the real bundle rather than a fixture built to suit them -- the same bytes the
 *  catalog pins, through the same import a practitioner uses.
 *
 *  `south-london/ground` is the workflow for it: a study extent, 32 sub-districts and the Thames
 *  collected into one polygon port, and the water intakes beside them. Four layers, three ports,
 *  and two of the four arrive inside a collected value -- which is the case the whole layer list
 *  exists to handle, and the one that produced "Map only shows tidal and non-tidal waterway
 *  polygons" on 2026-10-28. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository, so the bytes the catalog pins are not here to serve.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);

/** The ground workflow, imported from the published bundle and run. */
const ground=async page=>{
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  await page.locator('#workflow-select').selectOption({label:'The ground: an extent, its sub-districts and the river'});
  await page.locator('#run-button').click();
  await expect(page.locator('#run-summary')).toContainText('ran in',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="where"]').click();
};
const openDialog=async page=>{
  await page.locator('[data-manage-layers]').click();
  await expect(page.locator('#layer-dialog')).toBeVisible();
};
const rows=page=>page.locator('#layer-dialog-rows .layer-row');
/** The value of every matched field. `inputValues` is not a locator method; this is the
 *  equivalent for a set of them. */
const values=locator=>locator.evaluateAll(cells=>cells.map(cell=>cell.textContent.trim()));

test('every connected input is listed, and a collection is listed as its parts',{skip},async({page})=>{
  await ground(page);
  await openDialog(page);
  // Four layers from three ports: the extent, the two layers inside the collection, the intakes.
  // The collected pair is the point -- before `stack_polygons` carried a layer name they were one
  // anonymous feature list, and a reader could not tell the sub-districts from the river.
  await expect(rows(page)).toHaveCount(4);
  const listed=await values(page.locator('[data-layer-label]'));
  expect(listed).toContain('South London, the study extent');
  expect(listed).toContain('Registration sub-districts');
  expect(listed).toContain('Thames reaches');
  expect(listed).toContain('Where the water came from, and the tidal limit');
  // Said plainly, in drawing order, rather than left to be inferred from the picture.
  await expect(page.locator('#layer-dialog-note')).toContainText('Drawn bottom to top');
});

test('a layer\u2019s name is inherited and cannot be forked here',{skip},async({page})=>{
  await ground(page);
  await openDialog(page);
  // The practitioner, 2026-10-29: *"this form allow me to edit the inherited label of the polygon
  // layer. It should not be editable."* A second place to type a name is a second name for one
  // thing, free to disagree with the first.
  await expect(page.locator('#layer-dialog-rows input[data-layer-label]')).toHaveCount(0);
  await expect(page.locator('span[data-layer-label]').first()).toBeVisible();
  // And it says where the name came from, so it is clear where to change it.
  await expect(page.locator('.layer-row-origin').first()).toContainText(/named by the (widget|data)/);
});

test('a group is declared first and layers are added to it afterwards',{skip},async({page})=>{
  await ground(page);
  await openDialog(page);
  // Nothing to join until something is declared: the practitioner's own order of operations.
  await expect(page.locator('.layer-row-group option')).toHaveCount(4);
  await page.locator('#layer-group-name').fill('Water');
  await page.locator('#layer-dialog-declare').click();
  // One declaration, offered to every layer -- not a word retyped on each one.
  await expect(page.locator('.layer-row-group option')).toHaveCount(8);
  const labels=await values(page.locator('[data-layer-label]'));
  const river=labels.indexOf('Thames reaches');
  await page.locator('[data-layer-group]').nth(river).selectOption({label:'Water'});
  // THE ROW MOVES, because a group is drawn as a block and this one sits at the bottom of the
  // stack. So the layer is found by its name again rather than by where it used to be -- which
  // is the behaviour being asserted, not an inconvenience around it.
  const joined=(await values(page.locator('[data-layer-label]'))).indexOf('Thames reaches');
  await expect(page.locator('[data-layer-group]').nth(joined)).toHaveValue(/group-/);
  await expect(page.locator('#layer-dialog-note')).toContainText('Thames reaches');
});

test('a group needs a name before anything can be added to it',{skip},async({page})=>{
  await ground(page);
  await openDialog(page);
  await page.locator('#layer-dialog-declare').click();
  await expect(page.locator('#layer-dialog-note')).toContainText('A group needs a name');
  await expect(page.locator('.layer-row-group option')).toHaveCount(4);
});

test('a layer switched off stays connected, and switching all of them off is refused',{skip},async({page})=>{
  await ground(page);
  await openDialog(page);
  for(const box of await page.locator('[data-layer-visible]').all())await box.uncheck();
  await expect(page.locator('#layer-dialog-note')).toContainText('nothing to draw');
  // Still four layers: switched off is not disconnected, which is the distinction the receipt
  // records with fw:layerDrawn.
  await expect(rows(page)).toHaveCount(4);
});

test('the stack can be reordered, and the order is the workflow’s not the view’s',{skip},async({page})=>{
  await ground(page);
  await openDialog(page);
  const before=await values(page.locator('[data-layer-label]'));
  await page.locator('[data-layer-move][data-direction="down"]').first().click();
  const after=await values(page.locator('[data-layer-label]'));
  expect(after[0]).toBe(before[1]);
  expect(after[1]).toBe(before[0]);
  await page.locator('#layer-dialog-done').click();
  await openDialog(page);
  expect(await values(page.locator('[data-layer-label]'))).toEqual(after);
});
