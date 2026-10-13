import {test,expect} from '@playwright/test';

test('a downloaded network can be seen in the Inspector and sent to the Map',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // The Inspector shows the graph it holds, with its measurement.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  await expect(page.locator('.network-preview')).toBeVisible();
  await expect(page.locator('.inspector')).toContainText('junctions');
  await expect(page.locator('.inspector')).toContainText('directed segments');
  await expect(page.locator('.inspector')).toContainText('of street');
  // A street network has more than one segment drawn, and they are drawn in one path.
  const d=await page.locator('.network-preview path').first().getAttribute('d');
  expect(d.length).toBeGreaterThan(200);

  // And the Map can now take it, which it could not before.
  await page.locator('.react-flow__node[data-id="map"]').click();
  // A Map already in polygons mode uses the catchment mode select, which did not offer network
  // until this change -- a practitioner would have had to pass through point layers to reach it.
  const mode=page.locator('#catchment-output-mode,#output-input-mode').first();
  await mode.selectOption('network');
  // Switching mode drops the previous connector, so the source is chosen again. The port
  // selector is the generic one every Map input gets.
  await page.locator('#map-network').selectOption('network');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#result-tabs [data-output="map"]').click();
  await expect(page.locator('#map-panel')).toBeVisible();
  await expect(page.locator('#map path')).toHaveCount(1);
  await expect(page.locator('#map-note')).toContainText('junctions');
});
