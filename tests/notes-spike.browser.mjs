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
  // THE WRITE-UP IS ITS OWN TAB. The practitioner, 2026-10-29: *"It should be a tab."*
  await page.locator('[data-view="notes"]').click();
};
/** Derived notes come from a RUN, because they are read back off the inputs a run resolved. */
const andRun=async page=>{
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="notes"]').click();
};

test('Snow’s own sentences are readable, in the order a reader meets them',{skip},async({page})=>{
  await southLondon(page);
  await expect(page.locator('#notes-view')).toContainText('9 notes');
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
  await expect(page.locator('#notes-view')).toContainText('Establishes:');
  const functions=await page.locator('.notes-fn').allTextContents();
  // Read off the notes, never invented: these are the four the example carries, in the
  // vocabulary reconciled towards the prototype on 2026-10-29. `purpose` and `background` were
  // this list's own words and are not in the design that settled it.
  for(const fn of ['rationale','context','method','source'])expect(functions).toContain(fn);
  for(const retired of ['purpose','background'])expect(functions).not.toContain(retired);
});

test('the tab counts what it holds',{skip},async({page})=>{
  await southLondon(page);
  await expect(page.locator('#notes-view-count')).toHaveText('9');
});

test('an empty section says why it is empty, and offers a note',{skip},async({page})=>{
  await southLondon(page);
  const results=page.locator('.notes-part').nth(2);
  await expect(results).toContainText('Results');
  // NOT "no notes yet". A results section is mostly figures and tables, which this application
  // makes as artifacts -- so what belongs here is what the figures do not say, and telling a
  // practitioner only that it is empty leaves them wondering whether something failed.
  await expect(results).toContainText('what the figures do not say');
  await expect(results.locator('[data-add-note]').first()).toBeEnabled();
});

test('a note can be added to a section, and it is yours',{skip},async({page})=>{
  await southLondon(page);
  const before=await page.locator('.notes-note').count();
  await page.locator('.notes-part').nth(2).locator('[data-add-note]').first().click();
  await expect(page.locator('.notes-note')).toHaveCount(before+1);
  // Added as authored, because that is the only kind a person writes here.
  await expect(page.locator('.notes-part').nth(2).locator('.notes-kind-authored')).toHaveCount(1);
});

test('a note opens in a modal, and says why it may not be edited',{skip},async({page})=>{
  await southLondon(page);
  await page.locator('.notes-note').first().locator('[data-note-open]').click();
  await expect(page.locator('#note-dialog')).toBeVisible();
  // The section and the function are FIXED for a quotation: both follow from what it establishes.
  await expect(page.locator('#note-coords')).toContainText('fixed');
  // And the reason is this kind's reason, not one apology for every kind.
  await expect(page.locator('#note-why'))
    .toContainText('An edited quotation is not a quotation');
  await expect(page.locator('#note-count')).toContainText('words');
  await page.locator('#note-close').click();
  await expect(page.locator('#note-dialog')).not.toBeVisible();
});

test('a derived note is sent to the input that declares it',{skip},async({page})=>{
  await southLondon(page);
  await andRun(page);
  await page.locator('.notes-note.k-derived').first().locator('[data-note-open]').click();
  await expect(page.locator('#note-why'))
    .toContainText('restates what');
  await expect(page.locator('#note-why')).toContainText('Change it at the input');
});

/** THE SOURCES A WORKFLOW WRITES BY ITSELF.
 *
 *  Experiment 141, trying the design on a real write-up: *"References are the one section a
 *  workflow can write by itself."* Nine of the Notes Board prototype's fourteen cards are this
 *  kind -- each table's source, the boundaries' licence, the plate's terms -- and none of them
 *  was written for the page.
 *
 *  A practitioner who told an input what its data is has already written the Methods sentence
 *  that cites it. */
test('the inputs cite themselves, without being asked twice',{skip},async({page})=>{
  await southLondon(page);
  await andRun(page);
  const derived=page.locator('.notes-kind-derived');
  expect(await derived.count()).toBeGreaterThan(0);
  // DERIVED NOTES ARE THIS RUN'S, which is what makes them honest and also what limits them: the
  // workflow open after an import is `mortality`, and its one declared input is Table VIII. The
  // sub-districts' BSD-2 licence belongs to `ground` and `choropleth` and is cited when those
  // run. A reference list spanning all six workflows is a project-level question, not this one.
  await expect(page.locator('#notes-view')).toContainText('CC0-1.0');
  // AND IT LINKS THE INPUT THAT DECLARES IT. The practitioner asked this of the prototype:
  // "if produced by a workflow it should link to the workflow".
  await expect(page.locator('.notes-note.k-derived [data-open-node]').first()).toBeVisible();
  // The citation is read back, never composed here: these are the practitioner's own words for
  // what the data is, and the attribution the licence requires.
  await expect(page.locator('#notes-view'))
    .toContainText('Snow 1855, Table VIII \u2014 population and cholera deaths by sub-district');
  // A source two workflows share is one citation. A write-up that says it twice reads as two.
  const texts=await page.locator('.notes-kind-derived').evaluateAll(
    nodes=>nodes.map(n=>n.closest('.notes-note').textContent.trim()));
  expect(new Set(texts).size).toBe(texts.length);
});
