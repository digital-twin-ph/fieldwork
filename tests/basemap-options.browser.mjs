import {test,expect} from '@playwright/test';

// The practitioner, 2026-10-20: "I also still do not see why we do not yet have OpenFreeMap as a
// Basemap option in the Map widget." It was there since 2026-10-17 -- in the MAP'S OWN TOOLBAR.
// The Inspector carried a separate hand-written list of three options, written before the vector
// styles existed, so the widget's settings offered less than the map did.
test('the Inspector offers every basemap the map itself can draw',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="interactive"]').click();

  const inspector=page.locator('#map-basemap option');
  await expect(inspector).toHaveCount(6);
  for(const style of ['ofm-liberty','ofm-positron','ofm-bright'])
    await expect(page.locator(`#map-basemap option[value="${style}"]`)).toHaveCount(1);

  // Same values AND same labels as the toolbar inside the map, because both read one list.
  const fromInspector=await inspector.evaluateAll(o=>o.map(x=>`${x.value}=${x.textContent.trim()}`));
  await page.locator('#map-basemap').selectOption('ofm-positron');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#result-tabs [data-output="interactive"]').click();
  const toolbar=page.locator('.catchment-map-toolbar [data-basemap] option');
  const fromToolbar=await toolbar.evaluateAll(o=>o.map(x=>`${x.value}=${x.textContent.trim()}`));
  expect(fromToolbar).toEqual(fromInspector);
  // And the choice made in the Inspector is the one the map opens with.
  await expect(page.locator('.catchment-map-toolbar [data-basemap]')).toHaveValue('ofm-positron');
});
