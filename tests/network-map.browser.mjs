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
  // No mode to switch. A map declares every layer port it can draw from 2026-10-15, so the
  // network is wired straight to the network port -- where this test used to have to change the
  // map's mode first, and a practitioner reaching for a street map had to pass through point
  // layers to find the option.
  await expect(page.locator('#catchment-output-mode')).toHaveCount(0);
  await expect(page.locator('#output-input-mode')).toHaveCount(0);
  await page.locator('#map-add-layer').selectOption('network');
  await expect(page.locator('#map-network')).toHaveValue('network');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#result-tabs [data-output="map"]').click();
  await expect(page.locator('#map-panel')).toBeVisible();
  await expect(page.locator('#map path')).toHaveCount(1);
  await expect(page.locator('#map-note')).toContainText('junctions');

  // And the map's own settings apply to it. The practitioner, 2026-10-20: "Map widget settings
  // (e.g., interactive and basemap) not being implemented ... That looks like a regression." The
  // static branch returned before the interactive one was reached, so a Map showing a network
  // could be set to Interactive and stayed an SVG, with the basemap control unreachable.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#result-tabs [data-output="map"]').click();
  await expect(page.locator('#catchment-map-host')).toBeVisible();
  await expect(page.locator('.catchment-leaflet')).toBeVisible();
  // The streets are one canvas-rendered multi-polyline, not a layer per segment: a town-sized
  // graph is tens of thousands of them.
  await expect(page.locator('.catchment-leaflet canvas')).toHaveCount(1);
  await expect(page.locator('#map-note')).toContainText('junctions');
  // The basemap control is reachable, which is the half of the report that was unreachable.
  await expect(page.locator('.catchment-map-toolbar [data-basemap]')).toBeVisible();
  // Static is still static.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('plot');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#result-tabs [data-output="map"]').click();
  await expect(page.locator('#catchment-map-host')).toHaveCount(0);
  await expect(page.locator('#map path')).toHaveCount(1);
});
