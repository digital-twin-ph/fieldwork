import {test,expect} from '@playwright/test';

// EXPERIMENT 131'S OWN TEST, in its own words:
//
//   "from a cold start, with a project open, can the backup for that project be reached without
//    being told where it is?"
//
// It failed on 2026-10-22. The path it failed on: notice the storage readout is a button, open
// it, find the project block, find a text link between two separators. Nothing on screen said
// whether a copy existed, and `#save-status` said "Saved on this device" throughout -- true
// about this browser, and silent on the question being asked.
test('a stored project says whether a copy exists, and that is the way to make one',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#save-status')).toContainText('Saved on this device');

  // A project this application tracks, which is the only kind whose state can be satisfied.
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri health zones');
  await page.locator('#project-subject-input').fill('Ebola response denominators');
  await page.locator('#project-create').click();
  await expect(page.locator('#project-dialog')).toBeHidden();

  // Said where the practitioner already looks, without opening anything.
  const safety=page.locator('#project-safety');
  await expect(safety).toBeVisible();
  await expect(safety).toHaveText('Not backed up');
  await expect(safety).toHaveAttribute('data-safety','at-risk');
  await expect(page.locator('#save-status')).toContainText('Saved on this device');

  // Reached by pressing the thing that states the problem, not by knowing a pill is a button.
  await safety.click();
  await expect(page.locator('#project-view')).toBeVisible();

  // AND THE STATE IS A FACT, NOT A LABEL. exportedAt is written when the export COMPLETES, so a
  // status reading "Backed up" over a download that failed is not reachable by construction.
  const download=page.waitForEvent('download');
  await page.locator('.project-view-block [data-export-project]').first().click();
  await download;
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#project-safety')).toHaveText('Backed up');
  await expect(page.locator('#project-safety')).toHaveAttribute('data-safety','backed-up');
});

// A worked example is not a stored project: `touchProject` returns early for it and the dialog
// offers it no project export, so "Not backed up" there would be a warning no action could
// clear. A status that cries wolf on every demonstration canvas is one a practitioner stops
// reading before the day they need it.
test('a canvas with no stored project is not told it is at risk',async({page})=>{
  for(const example of ['blank','old-naledi']){
    await page.goto(`/?example=${example}`);
    await expect(page.locator('#save-status')).toContainText('Saved on this device');
    await expect(page.locator('#project-safety')).toHaveCount(0);
  }
});
