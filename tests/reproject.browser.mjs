import {test,expect} from './fixtures.mjs';
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
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="point_input"]').click();
  await page.locator('[data-view="workflow"]').click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(1);
  await page.locator('[data-view="workflow"]').click();
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
  // The Voronoi measures, so feeding it metres must be refused by name. Its `projected` step moved to `snow-deaths` on
  // 2026-11-12 (experiment 210), so one is added here, as a person would: from the library, wired from the pumps.
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="reproject"]').click();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const projected=(await saved()).nodes.filter(n=>n.type==='reproject').pop().id;
  await page.locator('#tidy-button').click();
  const box=async()=>JSON.stringify([await page.locator('.react-flow__node[data-id="pumps"] [data-handleid="out"]').boundingBox(),
    await page.locator(`.react-flow__node[data-id="${projected}"] [data-handleid="points"]`).boundingBox()]);
  let before='';await expect.poll(async()=>{const now=await box(),still=now===before;before=now;return still;},{intervals:[150]}).toBe(true);
  const [a,b]=JSON.parse(before);
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved()).edges.some(e=>e.from==='pumps'&&e.to===projected)).toBe(true);

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  await page.locator('#connect-sites').selectOption(projected);
  await page.locator('#run-button').click();
  await expect(page.locator('body')).toContainText('needs longitude and latitude',{timeout:45000});
  await expect(page.locator('body')).toContainText('Reproject points gives it easting and northing');
});
