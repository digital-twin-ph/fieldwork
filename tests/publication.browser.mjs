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
