import {test,expect} from '@playwright/test';

// The practitioner, twice: "The text 'Experiment 01 · draw → inspect facts → run the rule' before
// the Reset Layout button seems to be stale content." ... "And I am still seeing this text."
test('a canvas built on an example stops being described as that example',async({page})=>{
  await page.goto('/?example=blank');
  // As published, the recipe is true of it and is said.
  await expect(page.locator('#example-note')).toContainText('Experiment 01');

  // Build something that is not Experiment 01.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="network_input"]').click();
  await page.locator('[data-add="raster_input"]').click();

  await expect(page.locator('#example-note')).not.toContainText('Experiment 01');
  await expect(page.locator('#example-note')).toContainText('changed since');
  await expect(page.locator('#canvas-example')).not.toContainText('EXPERIMENT 01');
});
