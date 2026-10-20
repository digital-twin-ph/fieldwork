import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner, 2026-10-20, looking at a red failure toast over a canvas holding a study area
// and a street network: "There is an error toast which does not seem to be an error. The lack of
// an output is not an error, it's an incomplete workflow."
//
// A failure says something broke. A workflow halfway through being built has not broken, and the
// difference shows in three places: the toast's tone, the state line, and whether a trace is
// written to the console as though there were a defect to report.
test('a workflow with nothing to display is unfinished, not failed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#workflow-state')).toBeVisible({timeout:45000});
  await page.locator('[data-add="network_input"]').click();
  await page.locator('#run-button').click();

  const toast=page.locator('#toast');
  await expect(toast).toContainText('Nothing here displays a result',{timeout:20000});
  await expect(toast).not.toHaveClass(/failure/);
  await expect(page.locator('#workflow-state')).toHaveText('Not ready to run');

  // It still says what to do about it, and names what is on the canvas rather than advising a
  // step already taken.
  await expect(toast).toContainText('Add a Map, Table or Chart output');
  await expect(toast).toContainText('Street network');
  expect(errors).toEqual([]);
});

test('an empty canvas cannot be run at all, so its refusal is not reachable here',async({page})=>{
  // The other half of the same refusal -- "This canvas is empty" -- is covered in the unit tests
  // rather than here, because the Run button is disabled while the canvas holds no nodes. Pinned
  // so that enabling the button has to come with a decision about what pressing it should say.
  await page.goto('/?example=blank');
  await expect(page.locator('#workflow-state')).toBeVisible({timeout:45000});
  await expect(page.locator('#run-button')).toBeDisabled();
});
