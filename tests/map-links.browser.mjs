import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';
import {inMapSettings} from './map-settings.mjs';

// LINES BETWEEN RECORDS, chosen in Map's own dialog (experiment 200, step 4): on Hagelloch's first map, which draws the
// cases and nothing between them, the practitioner names the infector column and the column it is found by.
test('Map: a line from each case to its infector, chosen in Configure…, on the plot and the interactive map',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await page.goto('/?example=hagelloch');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  // "Found by" alone draws nothing, and a column without it is refused at Run with what to choose.
  await inMapSettings(page,async dialog=>{
    await dialog.locator('#link-column-cases').selectOption('infector');
    await expect(dialog).toContainText('Choose the column the ids in infector are found in');
  });
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run failed',{timeout:60_000});
  await expect(page.locator('body')).toContainText('choose, in Configure…, the column those ids are found in');
  await inMapSettings(page,async dialog=>{await dialog.locator('#link-matches-cases').selectOption('case_ID');});
  await expect(page.locator('#inspector-content')).toContainText('with a line to each record named in infector');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Where the cases were'}).click();
  await expect(page.locator('#map line.map-link')).toHaveCount(94);
  await expect(page.locator('#result-metrics')).toContainText('90 links at one place, not drawn');

  // Hiding the layer hides its lines with it.
  await page.locator('#map-layer-list input[data-map-layer="cases"]').uncheck();
  await expect(page.locator('#map line.map-link').first()).toBeHidden();
  await page.locator('#map-layer-list input[data-map-layer="cases"]').check();

  // The interactive map: the same 94, each with its arrow, in a layer of their own.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await inMapSettings(page,async dialog=>{await dialog.locator('#polygon-presentation').selectOption('interactive');});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Where the cases were'}).click();
  await expect(page.locator('#catchment-map-host .map-link-arrow')).toHaveCount(94,{timeout:30_000});
  await expect(page.locator('#catchment-map-host .leaflet-control-layers')).toContainText('Lines');
  expect(errors).toEqual([]);
});
