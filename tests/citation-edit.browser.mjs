import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// A CITATION ENTERED WRONG CAN BE CORRECTED in its note, not only removed and retyped. The
// practitioner, 2026-11-03: "there should be an edit button in addition to remove".
test.use({serviceWorkers:'block'});

test('a citation is edited in place, and the correction is what the note keeps',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Citations');
  await page.locator('#project-create').click();
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-add-note="Methods"]').first().click();
  await page.locator('#note-text').fill('Vaccination status comes from a card or the caregiver.');
  await page.locator('[data-note-tab="cite"]').click();
  await page.locator('#cite-type').selectOption('book');
  await page.locator('#cite-authors').fill('Croft, Trevor N.');
  await page.locator('#cite-title').fill('Guide to DHS Statistcs');
  await page.locator('#cite-published').fill('2023');
  await page.locator('#cite-publisher').fill('ICF');
  await page.locator('#cite-add').click();
  await expect(page.locator('.note-works li')).toContainText('Statistcs');

  await page.locator('[data-edit-work="0"]').click();
  await expect(page.locator('#cite-title')).toHaveValue('Guide to DHS Statistcs');
  await expect(page.locator('#cite-add')).toHaveText('Update citation');
  await page.locator('#cite-title').fill('Guide to DHS Statistics');
  await page.locator('#cite-add').click();
  await expect(page.locator('.note-works li')).toHaveCount(1);
  await expect(page.locator('.note-works li')).toContainText('Guide to DHS Statistics');
  await expect(page.locator('#cite-add')).toHaveText('Add citation');
  await page.locator('#note-save').click();

  await expect(page.locator('[data-section="References"] .notes-reference.r-work')).toContainText('Guide to DHS Statistics');
  await page.locator('.notes-note.k-authored [data-note-open]').first().click();
  await page.locator('[data-note-tab="cite"]').click();
  await expect(page.locator('.note-works li')).toContainText('Guide to DHS Statistics');
  expect(errors).toEqual([]);
});
