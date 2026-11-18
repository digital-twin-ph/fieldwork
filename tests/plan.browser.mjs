import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE PLAN ON THE NOTES BOARD (experiment 202, the planning note; the practitioner's answers, 2026-11-18). A project
 *  writing towards a publication shows its plan: each part a template until written, one written and kept, marked
 *  complete and undone, a part kept when its target is dropped, and nothing of the plan in the publication. */
test.use({serviceWorkers:'block'});

test('a plan is written part by part, marked complete and undone, and never rendered',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in a district');
  await page.locator('input[name="project-target-new"][value="publication"]').check();
  await page.locator('#project-create').click();
  await page.locator('[data-view="notes"]').click();
  const plan=page.locator('.notes-plan');
  await expect(plan).toContainText(/0 of \d+ parts written · Not marked complete/);
  await expect(plan.locator('[data-plan-mark]')).toBeDisabled();
  // The objectives part is the objectives note's, and offers no plan box of its own.
  await expect(plan.locator('[data-plan-part="objectives"]')).toContainText('The objectives note holds this part.');
  // Write the background's part.
  await plan.locator('[data-plan-part="background"] [data-plan-role]').click();
  await page.locator('#plan-text').fill('Why this district, and why this year.');
  await page.locator('#plan-save').click();
  await expect(page.locator('#plan-dialog')).toHaveCount(0);
  await expect(plan.locator('[data-plan-part="background"]')).toContainText('Why this district, and why this year.');
  await expect(plan).toContainText(/1 of \d+ parts written/);
  // Marked complete, then changed, then undone; the version is kept.
  await plan.locator('[data-plan-mark]').click();
  await expect(plan).toContainText('Marked complete');
  await plan.locator('[data-plan-part="background"] [data-plan-role]').click();
  await page.locator('#plan-text').fill('Why this district.');
  await page.locator('#plan-save').click();
  await expect(plan).toContainText('1 part has changed since');
  await plan.locator('[data-plan-unmark]').click();
  await expect(plan).toContainText('Not marked complete');
  const versions=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1'))
    .find(p=>p.name==='Measles in a district').plan.parts[0].versions.length);
  expect(versions).toBe(1);
  // Started from the plan: a note of the part's section and function, its words copied, the link kept.
  await plan.locator('[data-plan-part="background"] [data-plan-note]').click();
  await expect(page.locator('#note-dialog')).toBeVisible();
  const started=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1'))
    .find(p=>p.name==='Measles in a district').notes.at(-1));
  expect([started.section,started.fn,started.fromPlan,started.text]).toEqual(['Introduction','context','background','Why this district.']);
  await page.keyboard.press('Escape');
  // The audit, on request: the target's parts, the background written.
  await page.locator('.notes-head [data-notes-audit]').click();
  const audit=page.locator('#notes-audit-dialog');
  await expect(audit).toContainText(/\d+ of \d+ parts written/);
  await expect(audit.locator('[data-audit-role="background"]')).toContainText('written');
  await expect(audit.locator('[data-audit-role="background"]')).toContainText('shorter than asked');
  await audit.locator('#notes-audit-close').click();
  // Never rendered: the publication carries none of it.
  await page.locator('#notes-view [data-publication]').first().click();
  await expect(page.locator('#publication-view')).toBeVisible();
  await expect(page.locator('#publication-view [data-plan-part], #publication-view .notes-plan')).toHaveCount(0);
  expect(errors).toEqual([]);
});
