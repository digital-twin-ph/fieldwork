import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "it should have included OpenFreeMap tiles and themes as well ... OpenFreeMap has more to
// offer down the road in terms of communication stage." -- the practitioner, 2026-10-17.
// Positron, Liberty and Bright are cartographic DESIGNS, which is the right reason to want
// them: choosing one is a judgment, not a tile server preference.
//
// OpenFreeMap is VECTOR-only, so these cannot be an L.tileLayer URL. The renderer is not
// swapped: maplibre-gl-leaflet puts a MapLibre canvas under the existing Leaflet layers.
test('an OpenFreeMap vector style draws under the workflow layers, and is credited',async({page})=>{
  const errors=collectPageErrors(page);
  const requested=[];
  page.on('request',r=>{if(r.url().includes('openfreemap'))requested.push(r.url());});
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // Six basemaps: offline, two raster, three vector designs.
  await expect(page.locator('[data-basemap] option')).toHaveText([
    'None \u00b7 works offline','OpenStreetMap streets','OpenTopoMap terrain',
    'OpenFreeMap Liberty','OpenFreeMap Positron (muted)','OpenFreeMap Bright']);

  await page.locator('[data-basemap]').selectOption('ofm-positron');
  await expect(page.locator('[data-tile-status]')).toContainText('OpenFreeMap Positron',{timeout:30000});
  // The VECTOR BASEMAP's own canvas, named rather than counted: since 2026-10-20 the workflow's
  // boundary is canvas-rendered too, so "one canvas in the map" stopped meaning "the basemap
  // drew". MapLibre's canvas carries its own class.
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(1);
  expect(requested.some(u=>u.includes('/styles/positron'))).toBe(true);

  // THAT IT MOUNTED IS NOT THAT IT DREW, and the first two attempts at this assertion were both
  // wrong. Counting the canvas passed over a blank map. Reading its pixels with readPixels also
  // reported "blank" AFTER the feature was fixed, because a WebGL drawing buffer is cleared once
  // composited unless preserveDrawingBuffer is set -- an assertion that fails either way proves
  // nothing.
  //
  // What actually discriminated: TILES FETCHED. MapLibre decodes tiles in a Web Worker and
  // resolves the worker URL against its own bundle, which fails under esbuild's chunk layout:
  // "Worker failed to load." The style, the TileJSON and the sprites all loaded -- four requests,
  // all 200 -- and then ZERO tiles, so the map painted nothing while its status read "online".
  // With the worker given an explicit URL, nine tiles arrive.
  await expect.poll(()=>requested.filter(u=>u.includes('.pbf')).length,{timeout:30000})
    .toBeGreaterThan(0);

  // The workflow's own layers are untouched: only layer 0 changed.
  await expect(page.locator('.leaflet-marker-icon, .leaflet-interactive')).toHaveCount(188);

  // ATTRIBUTION IS A LICENCE TERM. The bridge does not carry it -- passing `attribution` to the
  // layer did nothing and the control read "Leaflet" alone, which is this map drawing somebody
  // else's data with no credit.
  const credit=page.locator('.leaflet-control-attribution');
  // THIS ASSERTION WAITS ON A THIRD PARTY. The credit is surfaced from the style's own TileJSON,
  // so it arrives when that fetch and parse complete, and the default ten seconds measures
  // OpenFreeMap's latency rather than this application's behaviour. Measured on WebKit
  // 2026-10-21: tiles drawing at 3 seconds, the credit appearing between 8 and 15 in one run and
  // past 30 in another, with the whole test taking 42 seconds. Given a generous bound on purpose
  // -- the alternative is a flake that says nothing, and the project has twice recorded tests
  // that measured the environment instead of the code.
  await expect(credit).toContainText('OpenFreeMap',{timeout:90000});
  await expect(credit).toContainText('OpenMapTiles');
  await expect(credit).toContainText('OpenStreetMap');

  // And a style no longer drawn is no longer credited.
  await page.locator('[data-basemap]').selectOption('none');
  await expect(credit).not.toContainText('OpenFreeMap');
  expect(errors).toEqual([]);
});
