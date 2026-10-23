import {test,expect} from '@playwright/test';
import {encodeRaster} from '../build/raster.js';

// A RASTER IS A LAYER, NOT A MODE.
//
// The practitioner, 2026-10-23, looking at a map carrying a study area, a street network, 17
// health facilities and a clipped WorldPop window, of which the raster alone did not appear:
// *"So WorldPop raster does not show up on a map"* ... *"There is still no raster on the map"*
// ... *"That must be another unwanted cap"*.
//
// It is one: `drawnMode` returns a single renderer and checks `network` before `raster`, so a map
// with both drew the streets and discarded the raster -- silently, while the Inspector said "4
// layer sources connected; the map draws what it is given, ground first". The same cap took the
// study area on 2026-10-20 and the facilities on 2026-10-22, each paid off one layer at a time.
//
// This exercises the combination the practitioner had: a network AND a raster on one interactive
// map. It is an expensive test because it has to be a whole workflow -- there is no runner to
// call -- and it is worth it, because every cheaper raster test reaches its map through the Clip
// raster node's button and would have passed throughout.
test('a map draws a raster under a street network, not instead of it',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();

  // A synthetic raster covering the Soho reporting rectangle, -0.155,51.502 to -0.119,51.525.
  const metadata={width:160,height:120,origin:[-0.18,51.55],resolution:[0.0005,-0.0005]};
  const values=Array.from({length:19200},(_,i)=>i%13===0?null:i);
  await page.locator('[data-add="raster_input"]').click();
  await page.locator('#raster-area').selectOption('study');
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'soho.tif',mimeType:'image/tiff',
    buffer:Buffer.from(encodeRaster({metadata,values}))});
  await expect(page.locator('#raster-save')).toBeEnabled();
  await page.locator('#raster-source-sourceURL').fill('https://example.org/raster');
  await page.locator('#raster-source-citation').fill('Synthetic raster citation');
  await page.locator('#raster-source-units').fill('people per cell');
  await page.locator('#raster-save').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0);

  const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')));
  const source=saved.nodes.find(n=>n.type==='raster_input');
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-add-layer').selectOption(source.id);
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-add-layer').selectOption('network');
  await page.locator('#polygon-presentation').selectOption('interactive');

  // Both are wired, so the map is being asked for both.
  const edges=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')))
    .edges.filter(e=>e.to==='map').map(e=>e.port);
  expect(edges).toContain('raster');
  expect(edges).toContain('network');

  await page.locator('[data-view="results"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // The claim is a drawn raster, not a stored edge: every test that asserted the edge passed
  // while nothing was drawn.
  await expect(page.locator('img.raster-result-image')).toHaveCount(1);
  await expect(page.locator('.leaflet-control-layers-overlays')).toContainText('Population raster');
  await expect(page.locator('.leaflet-control-layers-overlays')).toContainText('Street network');
  await page.screenshot({path:'test-results/map-raster-under-network.png'});
});

// THE PRACTITIONER'S OWN WIRING, which the test above does not reach. A map carrying a study
// area, a point layer, a street network AND a raster takes a different branch: when point layers
// and an area are both wired the map is built as the spatial map it is and the network joins it,
// where the test above exercises the network-only value. Both branches dropped the raster, and
// each had to be paid separately -- which is how the first fix for this went out incomplete.
// Confirmed working in the application by the practitioner on 2026-10-23 before this existed;
// this is that confirmation written down so it cannot quietly stop being true.
test('a map draws a raster with an area, points and a network all wired',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();

  const metadata={width:160,height:120,origin:[-0.18,51.55],resolution:[0.0005,-0.0005]};
  const values=Array.from({length:19200},(_,i)=>i%11===0?null:i);
  await page.locator('[data-add="raster_input"]').click();
  await page.locator('#raster-area').selectOption('study');
  await page.locator('#prepare-raster').click();
  await page.locator('#raster-file').setInputFiles({name:'soho.tif',mimeType:'image/tiff',
    buffer:Buffer.from(encodeRaster({metadata,values}))});
  await expect(page.locator('#raster-save')).toBeEnabled();
  await page.locator('#raster-source-sourceURL').fill('https://example.org/raster');
  await page.locator('#raster-source-citation').fill('Synthetic raster citation');
  await page.locator('#raster-source-units').fill('people per cell');
  await page.locator('#raster-save').click();
  await expect(page.locator('#raster-dialog')).toHaveCount(0);
  const source=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')))
    .nodes.find(n=>n.type==='raster_input');

  // A map of its own, so this is an area and points and a network and a raster, not polygons.
  await page.locator('[data-add="map_output"]').click();
  const map=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')))
    .nodes.filter(n=>n.type==='map_output').at(-1);
  for(const layer of ['study','locations','network',source.id]){
    await page.locator(`.react-flow__node[data-id="${map.id}"]`).click();
    await page.locator('#map-add-layer').selectOption(layer);
  }
  await page.locator(`.react-flow__node[data-id="${map.id}"]`).click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  const ports=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')))
    .edges.filter(e=>e.to===map.id).map(e=>e.port);
  expect(ports).toContain('area');
  expect(ports).toContain('network');
  expect(ports).toContain('raster');

  await page.locator('[data-view="results"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  // TWO maps exist now, so the assertions must be about THIS one: the results panel opens on
  // whichever output it opened on, and reading the wrong tab is how the first run of this test
  // reported a raster that was drawn perfectly well on a map nobody had selected.
  await page.locator(`[data-output="${map.id}"]`).click();
  await expect(page.locator('img.raster-result-image')).toHaveCount(1);
  await expect(page.locator('.leaflet-control-layers-overlays')).toContainText('Population raster');
  await expect(page.locator('.leaflet-control-layers-overlays')).toContainText('Study area');
});
