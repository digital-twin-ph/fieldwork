import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

// `reproject` was a Source that imported a UTM file and converted it (0.1.0). From 0.2.0 it is a
// transform: points in, points out, CRS84 projected into a declared zone. The acquisition half of
// the old tests moved to tests/utm-ingest.browser.mjs, where the behaviour now lives; what is
// tested here is the contract that replaced it. Experiment 111.

test('Reproject points is a transform: it declares its target frame and takes a points input',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  // A process widget is offered once the canvas holds an input, from 2026-10-15. Reproject takes
  // points, so points are what a practitioner would place first anyway.
  await page.locator('[data-add="point_input"]').click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(1);
  await page.locator('[data-add="reproject"]').click();

  const inspector=page.locator('.inspector');
  await expect(inspector).toContainText('Reproject points');
  // The direction is forward now: CRS84 in, UTM out. The old widget said the opposite.
  await expect(inspector).toContainText('OGC:CRS84 degrees');
  await expect(inspector).toContainText('EPSG:32735');  // the default is zone 35 south
  await expect(inspector).toContainText('easting/northing, metres');
  await expect(inspector).toContainText('None (WGS84 only)');
  // No file dialog: acquisition belongs to the sources.
  await expect(page.locator('#open-reproject')).toHaveCount(0);
  await expect(inspector.locator('select[data-map-port="points"]')).toHaveCount(1);
  await page.screenshot({path:'test-results/reproject-transform.png',fullPage:true});
});

test('a projected result is refused by a widget that measures, in the application',async({page})=>{
  // From 2026-10-14 the example ships its own `projected` node, so this rewires that one rather
  // than adding a second. The Voronoi measures, so feeding it metres must be refused by name.
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await expect(page.locator('.react-flow__node[data-id="projected"]')).toHaveCount(1);

  await page.locator('.react-flow__node[data-id="catchments"]').click();
  await page.locator('.inspector select[data-map-port="sites"]').selectOption('projected');
  await page.locator('#run-button').click();
  await expect(page.locator('body')).toContainText('needs longitude and latitude',{timeout:45000});
  await expect(page.locator('body')).toContainText('Reproject points gives it easting and northing');
});
