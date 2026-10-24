import {test,expect} from '@playwright/test';

// EXPERIMENT 131: the project level is a ROUTE, not a dialog.
//
// It lived behind a storage readout that had to be recognised as a button, which is why the
// practitioner could not find their own backup. A dialog here would inherit the problem it
// exists to end, so this is a tab beside Workflow and Results.
//
// NO PROGRESS COLUMN, at the practitioner's direction: "Project does not ship with a project
// column, only workflow and widget count." Draft, Run and Stale are known for the open workflow
// and for no other -- a saved document records nothing about having run -- so this counts what
// is there and claims nothing about what was done to it.
test('the Project view is a tab, and counts what each project holds',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('[data-view="project"]')).toBeVisible();

  // Empty before anything is filed, and says what filing would do.
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-view')).toBeVisible();
  await expect(page.locator('#project-view-list')).toContainText('No projects yet');

  await page.locator('[data-view="workflow"]').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri health zones');
  await page.locator('#project-subject-input').fill('Ebola response denominators');
  await page.locator('#project-create').click();
  await expect(page.locator('#project-dialog')).toBeHidden();

  await page.locator('[data-view="project"]').click();
  const block=page.locator('.project-view-block').first();
  await expect(block).toContainText('Ituri health zones');
  await expect(block).toContainText('Ebola response denominators');
  await expect(block).toContainText('1 workflow');
  // The widget count is the canvas's own, and the blank canvas carries widgets.
  await expect(block.locator('p.muted').first()).toContainText('widget');
  // The state the practitioner could not find, said here too.
  await expect(block.locator('.project-view-state')).toHaveText('Not backed up');
  await expect(block.locator('.project-view-state')).toHaveAttribute('data-safety','at-risk');
  // The open workflow is marked and cannot be reopened onto itself.
  await expect(block.locator('.project-view-row')).toContainText('open');
  await expect(block.locator('[data-open-workflow]')).toBeDisabled();
  // No progress column anywhere in it.
  await expect(block).not.toContainText('Draft');
  await expect(block).not.toContainText('Stale');
});

// Backing up is reachable from the route, and changes what the route says.
test('a project can be backed up from the Project view, and says so afterwards',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Facilities and networks');
  await page.locator('#project-subject-input').fill('Ituri');
  await page.locator('#project-create').click();
  await page.locator('[data-view="project"]').click();
  const state=page.locator('.project-view-block .project-view-state').first();
  await expect(state).toHaveText('Not backed up');
  const download=page.waitForEvent('download');
  await page.locator('.project-view-block [data-export-project]').first().click();
  await download;
  await expect(state).toHaveText('Backed up');
});

// EXPERIMENT 131: the breadcrumb is the shift between the two places, and the first thing in the
// application to say that a workflow is INSIDE a project. It read `PROJECT NAME / 1 workflow`
// until 2026-10-23 -- a count where the second crumb should be, and neither half leading
// anywhere, which is the discoverability fault this whole experiment is about.
test('the breadcrumb names the project and the workflow, and the project leads to its view',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Facilities and networks');
  await page.locator('#project-subject-input').fill('Ituri');
  await page.locator('#project-create').click();
  await expect(page.locator('#project-dialog')).toBeHidden();

  await expect(page.locator('#project-name')).toHaveText('FACILITIES AND NETWORKS');
  await expect(page.locator('#workflow-crumb')).not.toBeEmpty();
  // A crumb that leads nowhere is a label.
  await page.locator('#project-name').click();
  await expect(page.locator('#project-view')).toBeVisible();
  await expect(page.locator('.project-view-block').first()).toContainText('Facilities and networks');
});

// EXPERIMENT 131's last control row: `↓ Export`, `Encrypted ZIP` and, in a dialog elsewhere,
// `Export project` -- three controls for one act, each named for a FILE FORMAT rather than for
// what a practitioner is trying to do, which is to not lose their work.
//
// Consolidating them also makes a gap visible that three separate buttons hid. The practitioner,
// 2026-10-22, having gone looking for it: "Where is the export to zip for projects?" and "So
// encrypted zip description is misleading." There are three real combinations, not four.
test('Back up is one control, and says which combination does not exist',async({page})=>{
  await page.goto('/?example=blank');
  // The header carries one, not three.
  await expect(page.locator('#backup-button')).toBeVisible();
  await expect(page.locator('#backup-button')).toHaveText('↓ Back up');

  await page.locator('#backup-button').click();
  await expect(page.locator('#backup-dialog')).toBeVisible();
  await expect(page.locator('#export-button')).toBeVisible();
  await expect(page.locator('#encrypted-export')).toBeVisible();

  // With no project, backing one up is refused with the reason rather than offered and failing.
  await expect(page.locator('#backup-project')).toBeDisabled();
  await expect(page.locator('#backup-project-note')).toContainText('filed under no project');
  await expect(page.locator('#backup-gap')).toBeHidden();
  await page.locator('#backup-dialog-close').click();

  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri health zones');
  await page.locator('#project-subject-input').fill('Ebola response denominators');
  await page.locator('#project-create').click();

  await page.locator('#backup-button').click();
  await expect(page.locator('#backup-project')).toBeEnabled();
  await expect(page.locator('#backup-project-note')).toContainText('Ituri health zones');
  // The combination that does not exist is stated, not hunted for.
  await expect(page.locator('#backup-gap')).toContainText('cannot yet be backed up encrypted');

  const download=page.waitForEvent('download');
  await page.locator('#backup-project').click();
  await download;
  await expect(page.locator('#backup-dialog')).toBeHidden();
  await expect(page.locator('#project-safety')).toHaveText('Backed up');
});
