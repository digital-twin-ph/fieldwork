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
const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-workflow.json.gz',import.meta.url);
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
