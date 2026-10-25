import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** THE CATALOG HAS A SURFACE, and refusing is part of it.
 *
 *  The practitioner, 2026-10-24: *"How do I load South London in FW? Is it in manifest?"* It was
 *  pinned in `widgets/examples.json` by commit, per-file digest and licence, and nothing read any
 *  of it -- the only way in was a URL you had to know. These check both halves of what the
 *  governance promises: fetched only on an explicit action, and refused rather than partly loaded
 *  when the bytes are not the bytes that were pinned.
 *
 *  The network is stubbed. A test that reached raw.githubusercontent.com would be measuring
 *  GitHub's uptime, and would stop working the moment the example is re-pinned. */
test.use({serviceWorkers:'block'});

// The bytes come from the example repository beside this one, so the stub serves what the
// catalog actually pins rather than a fixture that could drift from it. Checked out or not is
// said plainly, on the same terms as the validation lab: a link verified against nothing is the
// defect, and a test that silently passes without its subject is the same defect wearing green.
const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository, so the bytes the catalog pins are not here to serve.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);

const openProjects=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-examples')).toBeVisible();
};

test('a curated example is listed with its terms, and is not fetched until asked',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  let requests=0;
  await page.route(/raw\.githubusercontent\.com/,route=>{requests++;
    route.fulfill({status:200,body:bundle});});
  await openProjects(page);

  const row=page.locator('#project-examples-list');
  await expect(row).toContainText("Snow's South London");
  await expect(row).toContainText('Not fetched yet');
  await expect(row).toContainText('CC0-1.0');
  // NOTHING IS FETCHED ON LOAD. The catalog's own fetch policy, which an interface can break
  // silently: listing an example must cost nothing until the practitioner asks for it.
  expect(requests).toBe(0);

  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  expect(requests).toBe(1);
  // It opened: the workflow is on the canvas and is the one the example publishes.
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="mortality"]')).toBeVisible();
  // And it is marked as held on this device, which is the FETCHABLE/AVAILABLE distinction the
  // governance requires the interface to make.
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-examples-list')).toContainText('Fetched on this device');
  expect(errors).toEqual([]);
});

test('bytes that do not match the pinned digest are refused, not loaded',{skip},async({page})=>{
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({
    // Right size, wrong bytes: this is the case a length check alone would wave through.
    status:200,body:Buffer.alloc(bundle.length,7)}));
  await openProjects(page);
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('does not match the digest',{timeout:20000});
  // REFUSED, NOT PARTLY LOADED: the canvas is still the blank one.
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="mortality"]')).toHaveCount(0);
});

/** AN INVESTIGATION IS A PROJECT, AND ITS QUESTIONS ARE ITS WORKFLOWS.
 *
 *  The practitioner, 2026-10-24: *"when we import South London, we import a project and its
 *  workflows. Right now it just one workflow."* It was, and it landed under "-- No project --". */
test('a curated example opens as a project with its workflows',{skip},async({page})=>{
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await openProjects(page);
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  // A PROJECT, named, with all three questions under it -- not a loose canvas.
  await expect(page.locator('#project-select')).toContainText("Snow's South London");
  await expect(page.locator('#project-select')).toContainText('3 workflows');
  const workflows=await page.locator('#workflow-select option').allTextContents();
  expect(workflows).toContain('Deaths per 1,000 people, by sub-district');
  expect(workflows).toContain('The ground: 32 sub-districts');
  expect(workflows).toContain('Cholera in 1849 compared with 1854');
});

/** RESET REACHES AN IMPORTED EXAMPLE TOO.
 *
 *  The practitioner, 2026-10-24: *"Imported examples should also be resettable."* Reset reloaded a
 *  workflow compiled into the application, and an imported one has no such template, so the
 *  control hid itself and an edit to published work had no way back.
 *
 *  Three things are checked here, and the second is the one worth the test: that the reset is
 *  SERVED FROM THE CACHE -- the request counter does not move -- so a device that has gone offline
 *  can still reset; and that the workflow is still the practitioner's afterwards, because a reset
 *  that restored the published identity along with the published content would have made it
 *  undeletable again, which is the defect this pair of controls already had once. */
test('an imported example is resettable, from the bytes already verified',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  let requests=0;
  await page.route(/raw\.githubusercontent\.com/,route=>{requests++;
    route.fulfill({status:200,body:bundle});});
  page.on('dialog',dialog=>dialog.accept());
  await openProjects(page);
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="workflow"]').click();
  const node=page.locator('.react-flow__node[data-id="mortality"]');
  await expect(node).toBeVisible();
  // The control is offered at all, which it was not before: an imported example has an origin
  // even though it has no template.
  await expect(page.locator('#reset-example')).toBeVisible();

  // Edit it: remove a widget the example publishes.
  await node.click();
  await page.locator('#delete-node').click();
  await expect(node).toHaveCount(0);

  await page.locator('#reset-example').click();
  await expect(node).toBeVisible({timeout:20000});
  // NOT A SECOND FETCH. The bytes verified at import were kept under the digest the catalog pins,
  // so the reset reads those and the network is not touched again.
  expect(requests).toBe(1);
  // Still theirs: in the project it was imported into, and still deletable.
  await expect(page.locator('#project-select')).toContainText("Snow's South London");
  await expect(page.locator('#delete-workflow')).toBeEnabled();
  expect(errors).toEqual([]);
});
