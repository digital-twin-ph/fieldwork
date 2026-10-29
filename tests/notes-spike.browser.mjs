import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** THE NOTES SPIKE, ON THE SOUTH LONDON EXAMPLE.
 *
 *  The practitioner, 2026-10-29: *"Let's do a Notes spike"* and *"let's test it on the South
 *  London example."*
 *
 *  `notes.ts` has existed since 2026-10-28 and `app.ts` never imported it: notes were defined,
 *  produced, stored, grouped and counted where no practitioner could see one. The example shipped
 *  nine of Snow's own sentences in `notes/snow-quotations.json` and the project bundle carried
 *  none of them, so there was also nothing to look at.
 *
 *  Driven on the published bundle, because a spike tested against a fixture answers a question
 *  nobody asked. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);

const southLondon=async page=>{
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:20000});
  await page.locator('[data-view="project"]').click();
};

test('Snow’s own sentences are readable, in the order a reader meets them',{skip},async({page})=>{
  await southLondon(page);
  await expect(page.locator('#project-notes')).toContainText('9 notes');
  // The body in IMRAD order, every part shown -- an absent Results section is a fact about the
  // write-up, not something to hide.
  const parts=await page.locator('.notes-part h3').allTextContents();
  expect(parts.map(p=>p.split(' ')[0])).toEqual(['Introduction','Methods','Results','Discussion']);
  await expect(page.locator('.notes-part').nth(2)).toHaveClass(/is-empty/);
});

test('each note says what it is and what it does',{skip},async({page})=>{
  await southLondon(page);
  // Snow's words are quoted, with the claim they support -- which is the reason for the quote and
  // not part of the write-up, so it is shown apart from it.
  await expect(page.locator('.notes-kind-quoted').first()).toBeVisible();
  await expect(page.locator('#project-notes')).toContainText('Establishes:');
  const functions=await page.locator('.notes-fn').allTextContents();
  // Read off the notes, never invented: these are the four the example carries.
  for(const fn of ['purpose','background','method','source'])expect(functions).toContain(fn);
});

test('the spike says where it stops',{skip},async({page})=>{
  await southLondon(page);
  // A surface that looks finished and is not is worse than one that says so.
  await expect(page.locator('#project-notes .notice'))
    .toContainText('not yet written, edited or added');
});
