import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE DRAFTS OFFERED ARE THE TARGETS CHOSEN (the practitioner, 2026-11-18: MERS with its sit rep unticked still offered
 *  "Publication"). One button per target, opening as that target; none chosen, a plain Draft; Draft as lists the targets
 *  first. */
test.use({serviceWorkers:'block'});

test('Notes offers a draft per target chosen, and a plain Draft when none is',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in a district');
  await page.locator('input[name="project-target-new"][value="sitrep-who"]').check();
  await page.locator('#project-create').click();
  // A note, so the board offers a draft at all.
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-add-note="Introduction"]').first().click();
  await page.locator('#note-dialog textarea').first().fill('Why this district.');
  await page.locator('#note-save').click();
  const head=page.locator('.notes-head');
  await expect(head.locator('[data-publication]')).toHaveText(['Draft: Situation report, WHO style']);
  await head.locator('[data-publication]').click();
  await expect(page.locator('[data-publication-kind]')).toHaveValue('sitrep-who');
  await expect(page.locator('[data-publication-kind] optgroup[label="Writing towards"] option')).toHaveText(['Situation report, WHO style']);
  await page.locator('[data-publication-back]').click();
  // Unticked: no target, one plain Draft.
  await page.locator('[data-view="project"]').click();
  await page.locator('input[name="project-target-edit"][value="sitrep-who"]').uncheck();
  await page.locator('#project-apply').click();
  await page.locator('[data-view="notes"]').click();
  await expect(head.locator('[data-publication]')).toHaveText(['Draft']);
  await expect(page.locator('.notes-head')).not.toContainText('Publication');
  expect(errors).toEqual([]);
});
