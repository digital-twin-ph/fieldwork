import {test,expect} from './fixtures.mjs';

// The practitioner, twice: "The text 'Experiment 01 · draw → inspect facts → run the rule' before
// the Reset Layout button seems to be stale content." ... "And I am still seeing this text."
test('a canvas built on an example stops being described as that example',async({page})=>{
  await page.goto('/?example=blank');
  // No recipe is printed for any example since 2026-11-11 (commentary belongs in design documents, not the UI).
  await expect(page.locator('#example-note')).toHaveText('');

  // Build something that is not Experiment 01.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="network_input"]').click();
  await page.locator('[data-add="raster_input"]').click();

  await expect(page.locator('#example-note')).not.toContainText('Experiment 01');
  await expect(page.locator('#example-note')).toContainText('changed since');
  await expect(page.locator('#canvas-example')).not.toContainText('EXPERIMENT 01');
  // Nor does the line under the title describe the blank canvas's first exercise (2026-11-09).
  await expect(page.locator('#project-description')).toHaveText('');
});
