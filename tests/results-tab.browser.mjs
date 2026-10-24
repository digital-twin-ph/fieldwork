import {test,expect} from '@playwright/test';

// The practitioner, 2026-10-21: *"can we make the Results Panel a tab alongside Workflow, and N3
// Evidence ... It would be easier to see the whole workflow or the whole Result panel than to see
// half of each."* The split had a divider, a remembered height and an Expand button that toggled
// which half won -- three controls managing a compromise a tab removes.
test('project, workflow, results and N3 are four tabs, and only one is on screen',async({page})=>{
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // In that order: build it, read it, then inspect how it was derived.
  // Project joined these on 2026-10-23, as experiment 131's route to the project level: the
  // practitioner's question that opened this test -- "can we make the Results Panel a tab
  // alongside Workflow, and N3" -- turned out to have a fourth answer.
  // Project comes FIRST, at the practitioner's direction on 2026-10-23: setting up precedes
  // analysing, and the order of the tabs should say so.
  await expect(page.locator('[data-view]')).toHaveText([/^Project/,/^Workflow/,/^Results/,/N3/]);

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


// "note how the map still does not use available real estate for the results panel" -- 2026-10-22,
// the second time. The map was pinned to a 2.9:1 letterbox whatever the window offered, which was
// right when the results shared the height with the canvas and wrong once the tab owned it.
test('the results map takes the height the tab gives it',async({page})=>{
  await page.setViewportSize({width:1600,height:1200});
  await page.goto('/?example=heat');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  const map=page.locator('#map');
  await expect(map).toBeVisible();
  const box=await map.boundingBox();
  // Not a strip: at least half the window's height, where it used to be about a third.
  expect(box.height).toBeGreaterThan(500);
  // And the panel below it is not mostly blank: the map reaches into the lower half.
  expect(box.y+box.height).toBeGreaterThan(700);
});
