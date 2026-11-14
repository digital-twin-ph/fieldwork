import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE PUBLICATION, laid out from Hagelloch's Notes after its workflows ran (experiment 202). The practitioner,
 *  2026-11-14: "let's advance the Notes UI one more level ... beginning with publication", and of the daily-scan map,
 *  "we can leave it out of the notes". */
test.use({serviceWorkers:'block'});

test('Notes lays out a publication: clean IMRaD, numbered figures, an Appendix, and the day-by-day map left out',async({page})=>{
  test.setTimeout(240000);
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90000});
  await page.locator('[data-view="notes"]').click();
  const pending=page.locator('[data-run-pending]');
  if(await pending.count()){await pending.click();
    await expect(page.locator('.toast').last()).toContainText('ran',{timeout:180000});}
  const notes=page.locator('#notes-view');
  // Left out: the day-by-day map is in Results and not in the write-up.
  await expect(notes).not.toContainText('The outbreak, day by day');

  await notes.locator('[data-publication]').click();
  const view=page.locator('#publication-view');
  await expect(view).toBeVisible();
  const paper=view.locator('.publication-page');
  await expect(paper.locator('h1')).toContainText('Hagelloch');
  for(const heading of ['Abstract','1. Introduction','2. Methods','3. Results','4. Discussion','Data availability','References'])
    await expect(paper.locator('h2',{hasText:heading})).toHaveCount(1);
  await expect(paper.locator('.pub-figure').first()).toContainText('Figure 1.');
  await expect(paper).toContainText('Appendix: equations');
  await expect(paper.locator('.pub-eqref').first()).toContainText('Equation A1');
  // The parts the person writes are prompts; nothing of the Notes tab comes through.
  await expect(paper.locator('.pub-prompt-label',{hasText:'Background'})).toHaveCount(1);
  expect(await paper.locator('.notes-kind,[data-note],[data-add-note]').count()).toBe(0);
  await expect(paper).not.toContainText('The outbreak, day by day');
  // Its own source cited (Point input 0.9.0), a map's title only in its caption, and a shipped example offers no Write.
  await expect(paper.locator('.pub-references')).toContainText('Pfeilsticker A.');
  expect(await paper.locator('.pub-figure svg [data-figure-heading]').count()).toBe(0);
  expect(await paper.locator('[data-pub-write]').count()).toBe(0);
  // Every sentence once.
  const texts=await paper.locator('.pub-note').allTextContents();
  expect(texts.length).toBe(new Set(texts).size);
  // Printing prints the publication alone.
  await page.emulateMedia({media:'print'});
  await expect(page.locator('#workflow-view, header').first()).toBeHidden();
  await expect(paper).toBeVisible();
  await page.emulateMedia({media:'screen'});
  await page.screenshot({path:'test-results/publication.png'});
  await view.locator('[data-publication-back]').click();
  await expect(view).toBeHidden();
  expect(errors).toEqual([]);
});

test('the parts the person writes are kept with the project, and nothing is drafted for them',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles, Ward 4');
  await page.locator('#project-create').click();
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-add-note="Methods"]').first().click();
  await page.locator('#note-text').fill('Cases were counted by week of rash onset.');
  await page.locator('#note-save').click();
  await page.locator('[data-publication]').click();
  const paper=page.locator('#publication-view .publication-page');
  await expect(paper.locator('h1')).toHaveText('Measles, Ward 4');
  // An empty box, never a draft.
  await paper.locator('[data-pub-write="background"]').click();
  await expect(paper.locator('#pub-text')).toHaveValue('');
  await paper.locator('#pub-text').fill('Measles returned to Ward 4 after two years without a case.');
  await expect(paper.locator('.pub-count')).toHaveText('11 words');
  await paper.locator('[data-pub-save]').click();
  await expect(paper.locator('[data-pub-part="background"]')).toContainText('Background. Measles returned to Ward 4');
  await paper.locator('[data-pub-write="title"]').click();
  await paper.locator('#pub-text').fill('Measles in Ward 4, 2026');
  await paper.locator('[data-pub-save]').click();
  await expect(paper.locator('h1')).toHaveText('Measles in Ward 4, 2026');
  // Kept: read back after the page is loaded again.
  await page.reload();
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-publication]').click();
  await expect(paper.locator('h1')).toHaveText('Measles in Ward 4, 2026');
  await expect(paper.locator('[data-pub-part="background"]')).toContainText('two years without a case');
  await expect(paper.locator('[data-pub-part="methods"].pub-prompt')).toHaveCount(1);
  expect(errors).toEqual([]);
});
