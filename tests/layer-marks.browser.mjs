import {test,expect} from '@playwright/test';

// The mark was NAMED and not DRAWN. After one overlay per source arrived, the layer control said
// "Find health facilities (square)", the receipt asserted fw:mark "square", and every point on the
// map was still a Leaflet circleMarker: the channel existed in the label and in the N3 and nowhere
// a reader could see it. The legend had the matching fault -- it listed three spatial relations in
// three hues, which is the encoding hue carried BEFORE it was given to the layer.
test('a chosen mark is drawn on the map and shown in the legend',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  await page.locator('[data-view="results"]').click();
  const drawn=page.locator('.leaflet-marker-icon, .leaflet-interactive');
  const asCircles=await drawn.count();
  expect(asCircles).toBeGreaterThan(0);

  // The first layer's default mark is a circle, and it is drawn as a mark like every other one:
  // a circleMarker has a single stroke, which cannot be both the dark halo and the layer hue.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-leaflet .leaflet-control-layers-list')).toContainText('(circle)');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-point-mark')).toHaveCount(asCircles);
  // Every mark carries the halo: a dark path drawn first and wider than the coloured one, so the
  // symbol reads over a terrain basemap.
  await page.locator('[data-view="results"]').click();
  const halo=page.locator('.catchment-point-mark svg path').first();
  expect(await halo.getAttribute('stroke')).toBe('#1A1A1A');
  expect(Number(await halo.getAttribute('stroke-width'))).toBeGreaterThan(2);
  // And it can be switched off, for a pale ground or a printed figure.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-halo-toggle').uncheck();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  const bare=page.locator('.catchment-point-mark svg path').first();
  expect(await bare.getAttribute('stroke')).not.toBe('#1A1A1A');
  await page.locator('[data-view="results"]').click();
  expect(await page.locator('.catchment-point-mark').first().locator('path').count()).toBe(1);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-halo-toggle').check();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  const mark=page.locator('[data-layer-mark]').first();
  await expect(mark).toHaveCount(1);
  await mark.selectOption('star');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // Every point that was a circle is now a star: the same points, drawn with the chosen mark.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-point-mark')).toHaveCount(asCircles);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.catchment-leaflet .leaflet-control-layers-list')).toContainText('(star)');
  await page.locator('[data-view="results"]').click();
  const path=await page.locator('.catchment-point-mark svg path').first().getAttribute('d');
  expect(path.split('L').length).toBeGreaterThan(8); // ten points, not an arc

  // And the legend says what the map does: one entry per layer, with that layer's mark, and the
  // spatial relation in the fill channel rather than in a hue of its own.
  const key=page.locator('#map-communication-header-key');
  await expect(key).toContainText('188 measles cases, one per child (188)');
  await expect(key).toContainText('Inside the study area (filled)');
  // Every case in this example is inside, so the legend says only that. It lists the values the
  // map DREW, not every value the vocabulary allows -- a legend naming points a clip set aside,
  // on a map where nothing was clipped, tells the reader something untrue.
  await expect(key).not.toContainText('hollow');
  await expect(key).not.toContainText('Set aside by a clip');
  // And the old encoding, where hue carried the relation, is gone.
  await expect(key).not.toContainText('Outside boundary');
  await page.locator('[data-view="results"]').click();
  const marks=key.locator('.map-key-mark path');
  expect(await marks.count()).toBe(2); // one layer, one fill value
});
