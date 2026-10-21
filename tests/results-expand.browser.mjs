import {test,expect} from '@playwright/test';

// This file tested the SPLIT: a `results-expanded` class, an Expand button that decided which
// half won, and a comparison run that took the lower half over once. Results became a tab on
// 2026-10-21 and all three went with it. What survives is the property they were protecting --
// selecting a node shows its result and does not move the practitioner -- which is now the
// ordinary behaviour of a tab rather than an exception a comparison had to be given.
test('selecting a comparison node marks its result, and does not change the view',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // The click was aimed at a node, not at the window: the canvas is still what is on screen.
  await page.locator('.react-flow__node[data-id="comparison-map"]').click();
  await expect(page.locator('#workflow-view')).toBeVisible();
  await expect(page.locator('.results-panel')).toBeHidden();

  // And the result it selected is the one the Results tab opens on.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output="comparison-map"]')).toHaveAttribute('aria-selected','true');

  // Selecting away and back behaves the same, from either side.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="before-map"]').click();
  await expect(page.locator('#workflow-view')).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output="before-map"]')).toHaveAttribute('aria-selected','true');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="comparison-map"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output="comparison-map"]')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#workflow-view')).toBeHidden();
});

test('a fresh run leaves the practitioner where they are',async({page})=>{
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="comparison-map"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  // Still on the results, because that is where they were. A comparison used to take the screen
  // over for one run, which is the kind of exception a whole-view tab makes unnecessary.
  await expect(page.locator('.results-panel')).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [data-output="comparison-map"]')).toHaveAttribute('aria-selected','true');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await expect(page.locator('#workflow-view')).toBeVisible();
});
