import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** WRITING A NOTE, IN THE DIALOG THAT USED TO REFUSE IT.
 *
 *  The practitioner, 2026-10-30: *"Let's build the writing in the modal dialog."*
 *
 *  Two of the four kinds said "Not built yet" and now do something, and they do two different
 *  things -- which is the whole of the rule settled on 2026-10-29: *"A machined note can also be
 *  edited but once it is, it is forked from the original and becomes an authored note with two
 *  provenances."* An authored note is rewritten where it sits. A machined note is not touched at
 *  all; the edit becomes a separate note, and the widget goes on machining its own account.
 *
 *  The other two still refuse, and the refusals are tested here too, because a surface that lets
 *  everything be edited has lost the distinction the four kinds exist to carry.
 *
 *  Driven on the published bundle, like `notes-spike.browser.mjs`. */
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
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
};
const andRun=async page=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
};

const RESULTS='.notes-part[data-section="Results"]';

test('an added note opens for writing, and what is written is what the write-up says',
  {skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  // IT OPENS FOR WRITING. Adding a note and being handed a card with nothing to do is how this
  // behaved until 2026-10-30.
  await expect(page.locator('#note-dialog')).toBeVisible();
  await expect(page.locator('#note-text')).toBeVisible();
  // Empty, not prefilled with the marker the note carries so `readNotes` will keep it.
  await expect(page.locator('#note-text')).toHaveValue('');
  await expect(page.locator('#note-why')).toContainText('What you write here is what the write-up says');
  const written='The excess among Southwark and Vauxhall customers is not explained by the '
    +'sub-districts they live in.';
  await page.locator('#note-text').fill(written);
  // The count is the note's, live, because it is what the panel reports about it.
  await expect(page.locator('#note-count')).toContainText(`${written.split(/\s+/).length} words`);
  await page.locator('#note-save').click();
  await expect(page.locator('#note-dialog')).not.toBeVisible();
  await expect(page.locator(RESULTS)).toContainText(written);
  // KEPT ON THE PROJECT, so it is still there with the workflow reopened from storage.
  await page.reload();
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
  await expect(page.locator(RESULTS)).toContainText(written);
});

test('a note with no words is refused, and says why',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  await expect(page.locator('#note-dialog')).toBeVisible();
  await page.locator('#note-save').click();
  // THE READER'S OWN RULE, said rather than enforced silently: `readNotes` drops a note carrying
  // no words, so keeping one would be a promise the application cannot hold.
  await expect(page.locator('#note-status')).toContainText('dropped when the project is reopened');
  await expect(page.locator('#note-dialog')).toBeVisible();
  await page.locator('#note-close').click();
  // The note stands, unwritten and saying so.
  await expect(page.locator(RESULTS)).toContainText('(unwritten)');
});

test('a new note is discarded, and an edit says what leaving would cost',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  // A note being written for the first time has nothing to go back to, so its exit says Discard
  // throughout -- the prototype's wording.
  await expect(page.locator('#note-close')).toHaveText('Discard');
  await page.locator('#note-text').fill('Something worth keeping.');
  await expect(page.locator('#note-close')).toHaveText('Discard');
  await page.locator('#note-close').click();
  await expect(page.locator(RESULTS)).toContainText('(unwritten)');
  await expect(page.locator(RESULTS)).not.toContainText('Something worth keeping');

  // An EXISTING note has something to go back to, so its exit changes once there is an edit to
  // lose. A dialog whose only exit is labelled Close discards one without having said so.
  const written=page.locator('.notes-note.k-authored')
    .filter({hasNotText:'(unwritten)'}).first();
  await written.locator('[data-note-open]').click();
  await expect(page.locator('#note-save')).toHaveText('Save');
  await expect(page.locator('#note-close')).toHaveText('Close');
  await page.locator('#note-text').fill('Edited, and not kept.');
  await expect(page.locator('#note-close')).toHaveText('Discard changes');
  await page.locator('#note-close').click();
  await expect(page.locator('#notes-view')).not.toContainText('Edited, and not kept');
});

test('an authored note’s section and function are the author’s to choose',{skip},async({page})=>{
  await southLondon(page);
  await page.locator(RESULTS).locator('[data-add-note]').first().click();
  // FIXED FOR THE OTHER THREE, chosen here: the prototype's two drop-downs. The section one is a
  // second door to what dragging the card already does.
  await expect(page.locator('#note-section')).toHaveValue('Results');
  await page.locator('#note-section').selectOption('Discussion');
  await page.locator('#note-function').selectOption('limitation');
  // The function says what it does for a reader, because a one-word label is a filing code until
  // somebody says what it files.
  await expect(page.locator('#note-gloss')).toContainText('states what it cannot show');
  await page.locator('#note-text').fill('Nothing here separates supply from the street itself.');
  await page.locator('#note-save').click();
  await expect(page.locator('#note-dialog')).not.toBeVisible();
  // It went where it was sent, carrying the function as its chip.
  const moved=page.locator('.notes-part[data-section="Discussion"] .notes-note')
    .filter({hasText:'separates supply from the street'});
  await expect(moved).toHaveCount(1);
  await expect(moved.locator('.notes-fn')).toHaveText('limitation');
  await expect(page.locator(RESULTS)).not.toContainText('separates supply from the street');
  // RETIRED WORDS ARE NOT ON OFFER. `background` and `purpose` were this list's own and are not
  // in the vocabulary that settled on 2026-10-29; the prototype's screenshot still shows one.
  await page.locator('.notes-part[data-section="Discussion"] [data-add-note]').first().click();
  const offered=await page.locator('#note-function option').allTextContents();
  for(const retired of ['background','purpose'])expect(offered).not.toContain(retired);
  for(const kept of ['context','rationale','source','method','verification','finding','limitation'])
    expect(offered).toContain(kept);
});

test('a quotation has nothing to write',{skip},async({page})=>{
  await southLondon(page);
  await page.locator('.notes-note.k-quoted').first().locator('[data-note-open]').click();
  await expect(page.locator('#note-dialog')).toBeVisible();
  await expect(page.locator('#note-text')).toBeHidden();
  await expect(page.locator('#note-save')).toBeHidden();
  await expect(page.locator('#note-section')).toHaveCount(0);
  await expect(page.locator('#note-coords')).toContainText('fixed');
  await expect(page.locator('#note-why')).toContainText('An edited quotation is not a quotation');
});

test('a derived note is still changed at the input, not here',{skip},async({page})=>{
  await southLondon(page);
  await andRun(page);
  await page.locator('.notes-note.k-derived').first().locator('[data-note-open]').click();
  // The dialog first: `toBeHidden` is true of an element that does not exist, so an assertion
  // that the textarea is hidden passes just as well when the dialog never opened at all.
  await expect(page.locator('#note-dialog')).toBeVisible();
  await expect(page.locator('#note-text')).toBeHidden();
  await expect(page.locator('#note-save')).toBeHidden();
  await expect(page.locator('#note-why')).toContainText('Change it at the input');
});

/** THE ONLY WIDGET THAT MACHINES A NOTE is `relate`, and no example reached from the picker uses
 *  one: South London's contingency table is the one workflow that joins two of Snow's tables, and
 *  it is selected by name after the bundle is imported. Found by writing this test against the
 *  workflow the example opens on, where there is no machined note to edit. */
const contingency=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText('imported with 6 workflows',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',
    {hasText:'Died or survived, by water supply'});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
};

test('editing a machined note forks it, and leaves the machined note alone',{skip},async({page})=>{
  await contingency(page);
  const machined=page.locator('.notes-note.k-machined').first();
  await expect(machined).toBeVisible();
  const was=(await machined.locator('p').first().textContent()).trim();
  const notes=await page.locator('.notes-note').count();
  await machined.locator('[data-note-open]').click();
  // It opens on the machined wording, because an edit starts from what was written.
  await expect(page.locator('#note-text')).toBeVisible();
  await expect(page.locator('#note-text')).toHaveValue(was);
  await expect(page.locator('#note-why')).toContainText('forks it into a note of your own');
  await page.locator('#note-text').fill(was+' Rounded to whole deaths for the table.');
  await page.locator('#note-save').click();
  await expect(page.locator('#note-dialog')).not.toBeVisible();
  // ONE MORE NOTE, not one changed note.
  await expect(page.locator('.notes-note')).toHaveCount(notes+1);
  // The machined note reads exactly as it did: the widget rewrites it on the next run either way.
  await expect(page.locator('.notes-note.k-machined').first().locator('p').first()).toHaveText(was);
  // And the fork says it is one, which is the second provenance made visible.
  const fork=page.locator('.notes-note.k-authored').filter({hasText:'Rounded to whole deaths'});
  await expect(fork).toHaveCount(1);
  await expect(fork.locator('.notes-fork')).toContainText('edited from a machined note');
});
