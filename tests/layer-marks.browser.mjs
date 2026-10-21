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
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  const drawn=page.locator('.leaflet-marker-icon, .leaflet-interactive');
  const asCircles=await drawn.count();
  expect(asCircles).toBeGreaterThan(0);

  // The first layer's default mark is a circle, so the control says so and nothing is a divIcon.
  await expect(page.locator('.catchment-leaflet .leaflet-control-layers-list')).toContainText('(circle)');
  await expect(page.locator('.catchment-point-mark')).toHaveCount(0);

  const mark=page.locator('[data-layer-mark]').first();
  await expect(mark).toHaveCount(1);
  await mark.selectOption('star');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // Every point that was a circle is now a star: the same points, drawn with the chosen mark.
  await expect(page.locator('.catchment-point-mark')).toHaveCount(asCircles);
  await expect(page.locator('.catchment-leaflet .leaflet-control-layers-list')).toContainText('(star)');
  const path=await page.locator('.catchment-point-mark svg path').first().getAttribute('d');
  expect(path.split('L').length).toBeGreaterThan(8); // ten points, not an arc

  // And the legend says what the map does: one entry per layer, with that layer's mark, and the
  // spatial relation in the fill channel rather than in a hue of its own.
  const key=page.locator('#map-communication-header-key');
  await expect(key).toContainText('Inside / on the boundary (filled)');
  await expect(key).toContainText('Outside the boundary (hollow)');
  await expect(key).not.toContainText('Outside boundary');
  const marks=key.locator('.map-key-mark path');
  expect(await marks.count()).toBeGreaterThan(2);
  const fills=await marks.evaluateAll(p=>p.map(x=>x.getAttribute('fill')));
  expect(fills).toContain('none'); // the hollow entry is actually hollow
});
