import {test,expect} from '@playwright/test';

// The practitioner, 2026-10-21: *"can we make the Results Panel a tab alongside Workflow, and N3
// Evidence ... It would be easier to see the whole workflow or the whole Result panel than to see
// half of each."* The split had a divider, a remembered height and an Expand button that toggled
// which half won -- three controls managing a compromise a tab removes.
test('workflow, results and N3 are three tabs, and only one is on screen',async({page})=>{
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // In that order: build it, read it, then inspect how it was derived.
  await expect(page.locator('[data-view]')).toHaveText([/^Workflow/,/^Results/,/N3/]);

  // A finished run does not move you: the canvas is still what is on screen, and the tab says
  // how many outputs are waiting -- read from the run rather than announced.
  await expect(page.locator('#workflow-view')).toBeVisible();
  await expect(page.locator('.results-panel')).toBeHidden();
  await expect(page.locator('#result-count')).toHaveText('3');

  const viewport=page.viewportSize().height;
  const whole=async locator=>(await locator.boundingBox()).height;
  const canvas=await whole(page.locator('#workflow-view'));
  expect(canvas).toBeGreaterThan(viewport*0.6);

  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#workflow-view')).toBeHidden();
  await expect(page.locator('[data-view="results"]')).toHaveAttribute('aria-selected','true');
  // The results get the room the canvas had, not what was left over.
  expect(await whole(page.locator('.results-panel'))).toBeGreaterThan(canvas-8);

  await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#rules-view')).toBeVisible();
  await expect(page.locator('#workflow-view')).toBeHidden();
  await expect(page.locator('.results-panel')).toBeHidden();

  // The split's controls are gone with it: nothing to expand, and no divider to drag.
  await expect(page.locator('#expand-results')).toHaveCount(0);
  await expect(page.locator('#resize-results')).toHaveCount(0);
});

