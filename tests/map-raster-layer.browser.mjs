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

// AND THE STATIC PLOT, which neither test above reaches: both select the interactive
// presentation and assert against Leaflet's layer control. The static SVG took the same cap for
// a fourth time and kept it after the interactive map was fixed -- `renderMap` drew the cells and
// returned, so a map carrying a study area, a clipped raster, 17 facilities and a street network
// showed the raster alone. Reported by the practitioner on 2026-10-25 from a Gaborone map, with
// the layer list underneath still offering a checkbox for marks that were never drawn.
//
// The checkbox is the sharpest part of it: the control promised a composition the renderer did
// not do, and three places had to agree before it could -- the value (core.ts kept rows:[]), the
// key (map-communication stopped at the raster's own two entries) and the renderer.
test('the static plot draws points on the raster, and the key names them',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();

  const metadata={width:160,height:120,origin:[-0.18,51.55],resolution:[0.0005,-0.0005]};
  const values=Array.from({length:19200},(_,i)=>i%7===0?null:i);
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

  await page.locator('[data-add="map_output"]').click();
  const map=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')))
    .nodes.filter(n=>n.type==='map_output').at(-1);
  // An area, points and a raster, left on the STATIC presentation this time.
  for(const layer of ['study','locations',source.id]){
    await page.locator(`.react-flow__node[data-id="${map.id}"]`).click();
    await page.locator('#map-add-layer').selectOption(layer);
  }

  await page.locator('[data-view="results"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator(`[data-output="${map.id}"]`).click();

  // The raster is drawn, as it always was.
  await expect(page.locator('#map image')).toHaveCount(1);
  // And the points are on it now. Tagged by layer, because that is what the checkbox acts on.
  const marks=page.locator('#map .location[data-place]');
  expect(await marks.count()).toBeGreaterThan(0);
  await expect(marks.first()).toHaveAttribute('data-layer',/.+/);
  // The key names them, so no mark on this map is unexplained. The raster's own two entries stay
  // and the layer is appended after them, which is the ordering a reader meets: ground, then what
  // is on it. The label is the layer's own, so this asserts the text the application composes
  // rather than a wording chosen here.
  const key=page.locator('#map-communication-key');
  await expect(key).toContainText('Relative cell value');
  await expect(key).toContainText('death locations');

  // The study area outline is drawn, and always was: `loadRaster` attaches the area to every
  // grid it returns, masked or not, so `rasterSvg` has a boundary to draw whether or not the
  // raster was clipped. Asserted because an attempt to "fix" a missing area outline here is what
  // established that -- the branch added for it was unreachable, and this is what made it so.
  await expect(page.locator('#map path[stroke="#193d33"]')).toHaveCount(1);

  // Taken while everything is still shown: this image is the record of what the fix produces.
  await page.screenshot({path:'test-results/map-raster-static-with-points.png'});

  // The checkbox now acts on marks that exist: unticking hides them rather than hiding nothing.
  const before=await marks.count();
  await page.locator('#map-layer-list input[type="checkbox"]').first().uncheck();
  await expect(page.locator('#map .location[data-place]:visible')).toHaveCount(0);
  expect(before).toBeGreaterThan(0);
});

// THE DOWNLOAD BELONGS TO THE NODE THAT MAKES THE ARTEFACT.
//
// The practitioner, 2026-10-25: *"The download GeoTiff should probably be in the Inspector panels
// of both the Raster widget (full raster) and the clipper raster widget (clipped raster)."*
//
// It was in the Results heading, bound to whatever output tab was on screen. With a prepared
// window and a clipped grid in one workflow -- the only case where the distinction matters --
// the full window could not be reached while the clipped map was displayed. The filenames had
// told them apart all along; the control had not.
//
// Neither download needs a run, which is the part worth asserting: both are produced from the
// stored input by the same resolver the clip preview uses.
test('each raster node offers its own GeoTIFF, without running the workflow',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();

  const metadata={width:160,height:120,origin:[-0.18,51.55],resolution:[0.0005,-0.0005]};
  const values=Array.from({length:19200},(_,i)=>i%5===0?null:i);
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

  // The full window, from the Raster input's own Inspector.
  await page.locator(`.react-flow__node[data-id="${source.id}"]`).click();
  await expect(page.locator('#download-node-raster')).toBeVisible();
  const windowFile=await (async()=>{
    const wait=page.waitForEvent('download');
    await page.locator('#download-node-raster').click();
    return wait;
  })();
  expect(windowFile.suggestedFilename()).toBe('fieldwork-raster-window.tif');

  // A clip of it, and its Inspector offers the masked grid under its own name.
  await page.locator('[data-add="clip_raster"]').click();
  const clip=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')))
    .nodes.filter(n=>n.type==='clip_raster').at(-1);
  await page.locator(`.react-flow__node[data-id="${clip.id}"]`).click();
  // Wired to the window above: an unwired clip has no grid to offer and says so rather than
  // producing an empty file, which is what the first run of this test established.
  await page.locator('#raster-raster').selectOption(source.id);
  await page.locator(`.react-flow__node[data-id="${clip.id}"]`).click();
  await expect(page.locator('#download-node-raster')).toBeVisible();
  const clipped=await (async()=>{
    const wait=page.waitForEvent('download');
    await page.locator('#download-node-raster').click();
    return wait;
  })();
  // The distinction the Results-level control could not make: two nodes, two artefacts, and the
  // workflow has not been run since either was added.
  expect(clipped.suggestedFilename()).toBe('fieldwork-clipped.tif');
  expect(clipped.suggestedFilename()).not.toBe(windowFile.suggestedFilename());
});
