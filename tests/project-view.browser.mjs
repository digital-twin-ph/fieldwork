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

  // A canvas filed under nothing selects nothing, and the tab says so rather than listing
  // every project on the device.
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-view')).toBeVisible();
  await expect(page.locator('#project-view-title')).toHaveText('No project selected');
  await expect(page.locator('.project-view-block')).toHaveCount(0);
  await expect(page.locator('#project-unfiled')).toBeVisible();

  await page.locator('[data-view="workflow"]').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri health zones');
  await page.locator('#project-subject-input').fill('Ebola response denominators');
  await page.locator('#project-create').click();
  await expect(page.locator('#project-dialog')).toBeHidden();

  await page.locator('[data-view="project"]').click();
  const block=page.locator('.project-view-block');
  await expect(page.locator('#project-view-title')).toHaveText('Ituri health zones');
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
  const state=page.locator('.project-view-block .project-view-state');
  await expect(state).toHaveText('Not backed up');
  const download=page.waitForEvent('download');
  await page.locator('.project-view-block [data-export-project]').click();
  await download;
  await expect(state).toHaveText('Backed up');
});

// ONE PLACE TO SELECT, ONE PLACE TO MANAGE. The practitioner, 2026-10-23, after counting the
// surfaces that showed project information: *"There are too many controls that display project
// information - tab, drop down. It looks messy."* ... *"Four locations for projects is four
// locations to remember, friction and cognitive overload."* ... *"I need one location to select
// projects that's the project drop down top left. then view project info, manage a project and
// its workflows, and to import projects, export projects, this is the Projects tab."*
//
// The breadcrumb this replaces was added the same day and lasted hours: it named the project the
// dropdown beside it already named.
test('the project is selected in one place and managed in one place',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#project-new').click().catch(async()=>{
    await page.locator('[data-view="project"]').click();
    await page.locator('#project-new').click();
  });
  await page.locator('#project-name-input').fill('Facilities and networks');
  await page.locator('#project-subject-input').fill('Ituri');
  await page.locator('#project-create').click();
  await expect(page.locator('#project-dialog')).toBeHidden();

  // Selected in the dropdown.
  await expect(page.locator('#project-select')).toHaveValue(/.+/);
  // Managed in the tab, and nowhere else: the old doors are gone.
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-view-title')).toHaveText('Facilities and networks');
  await expect(page.locator('#project-import')).toBeVisible();
  await expect(page.locator('#project-name-edit')).toHaveValue('Facilities and networks');
  await expect(page.locator('#storage-meter')).toBeVisible();

  await expect(page.locator('#projects-button')).toHaveCount(0);
  await expect(page.locator('#projects-dialog')).toHaveCount(0);
  await expect(page.locator('#assign-project')).toHaveCount(0);
  await expect(page.locator('#project-name')).toHaveCount(0);
});

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

// THE TAB WAS EMPTY WHERE IT MATTERED MOST. The practitioner, on the Project tab of a canvas
// whose own breadcrumb read "1854 CHOLERA OUTBREAK IN LONDON" and whose selector read "4
// workflows": "This is the Projects tab, really nothing to see." It said "No projects yet" over a
// project the rest of the interface was naming, because the view listed only STORED projects --
// the restriction the header's safety state needs, applied to a view that answers a different
// question.
test('the Project view shows the selected project, and does not call a worked example unbacked',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="project"]').click();

  // ONLY the selected project: the dropdown selects, the tab shows what was selected.
  await expect(page.locator('.project-view-block')).toHaveCount(1);
  await expect(page.locator('#project-view-title')).toHaveText('1854 Cholera Outbreak in London');
  const block=page.locator('.project-view-block');
  await expect(block).toContainText('4 workflows');
  // "0 widgets" would be true about storage and false about the project, so an unopened
  // workflow says which question is being answered.
  await expect(block).toContainText('not opened');

  // A worked example ships with the application, so "Not backed up" would be a warning no action
  // could clear -- and the project export it would point at does not render for one.
  const state=block.locator('.project-view-state');
  await expect(state).toHaveText('Ships with the application');
  await expect(state).toHaveAttribute('data-safety','built-in');
  await expect(block.locator('[data-export-project]')).toHaveCount(0);
  await expect(block.locator('[data-delete-project]')).toHaveCount(0);

  // The workflow you have open is still marked, and its siblings are still reachable.
  await expect(block.locator('.project-view-row')).toHaveCount(4);
  await expect(block).toContainText('open');
});

// THE EXPECTATION, REVERSED BY THE PRACTITIONER. First: *"I deleted Raster Project but the
// workflow persisted."* The behaviour was deliberate and announced twice, so the first fix was to
// make the announcement verifiable -- an "In no project" list, which this test asserted. Then:
// *"I deleted a project but it's workflow did not get deleted. I expect to have all workflows
// under that project deleted as well."*
//
// That settles it the other way and it is theirs to settle: a project is the investigation and
// its workflows are the questions asked inside it, so deleting the one without the others leaves
// a practitioner tidying twice. This test is inverted rather than deleted, because what it was
// checking -- that the promise the dialog makes is the thing that happens -- is still the point.
test('deleting a project deletes the workflows under it',async({page})=>{
  const asked=[];
  page.on('dialog',d=>{asked.push(d.message());d.accept();});
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('#project-new').click();
  await page.locator('#project-name-input').fill('Raster Project');
  await page.locator('#project-subject-input').fill('A raster, clipped');
  await page.locator('#project-create').click();
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-view-title')).toHaveText('Raster Project');
  // Scoped to the project: the unfiled list uses the same row class, which is one reason the
  // earlier class collision was worth separating.
  await expect(page.locator('.project-view-block .project-view-row')).toHaveCount(1);

  await page.locator('.project-view-block [data-delete-project]').click();

  // What is about to be destroyed is named before it is: how many, what they weigh, and that no
  // copy exists -- which this application could not answer before 2026-10-23.
  expect(asked.join(' ')).toContain('and its 1 workflow');
  expect(asked.join(' ')).toContain('cannot be undone');
  expect(asked.join(' ')).toContain('NOT BACKED UP');

  await expect(page.locator('#project-view-title')).toHaveText('No project selected');
  // Gone, not relocated: the workflow is not waiting in "In no project".
  await expect(page.locator('#project-unfiled-rows')).not.toContainText('Raster Project · first question');
});
