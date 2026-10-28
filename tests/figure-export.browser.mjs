import {test,expect} from '@playwright/test';

/** A FIGURE FOR THE PLACES THAT WILL NOT TAKE AN SVG.
 *
 *  The practitioner, 2026-10-25, on putting a figure into a slide: *"Why not export as PNG?"*
 *  PowerPoint, Word and most slide tools read a subset of SVG, and these figures use three of the
 *  constructs that subset is weakest on: a nested `<svg>` for the plot area, `<image href>` for
 *  baked tiles, and a `<mask>` on clipped rasters. A PNG has no subset.
 *
 *  Both are kept, because they answer different questions -- a journal usually wants vector line
 *  art and will reject a raster; a slide wants a file that just appears -- and both are built
 *  from the SAME markup, so they cannot come to say different things. */
// THE TILE FIXTURE ONLY APPLIES IF NOTHING STANDS BETWEEN THE PAGE AND THE ROUTE.
//
// `page.route` below stubs the tile server so this test measures the baking and the export rather
// than whether OpenStreetMap is up. On webkit it did not: this application registers a service
// worker, and a request that passes through one is not intercepted by `page.route` there, so the
// stub was bypassed and the test reached the real tile server. Measured 2026-10-28 -- three tile
// requests seen, zero routed, two cancelled, and no `<g data-basemap>` emitted because
// `basemap-tiles.ts` emits its group only where a tile resolved. With service workers blocked:
// sixteen seen, sixteen routed, sixteen baked images.
//
// It passed on chromium throughout, which is why it read as a flake for two gates: the test was
// measuring the tile server's mood on one engine and the code on the other. The project has
// recorded that failure mode twice before, which is what `openfreemap-basemap.browser.mjs` means
// by refusing "a flake that says nothing".
//
// The service worker is not what this test is about. `offline.browser.mjs` is where it belongs.
test.use({serviceWorkers:'block'});

const PNG=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f7e0000000049454e44ae426082','hex');

test('a map exports as a PNG, at a stated size, carrying its baked ground',async({page})=>{
  await page.route(/tile\.openstreetmap\.org/,route=>
    route.fulfill({status:200,contentType:'image/png',body:PNG}));

  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="access-map"]').click();
  await page.locator('#map-basemap').selectOption('osm');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map [data-basemap="osm"] image').first()).toBeAttached({timeout:20000});

  const wait=page.waitForEvent('download');
  await page.locator('#map-download-png').click();
  const file=await wait;
  expect(file.suggestedFilename()).toMatch(/\.png$/);

  // A REAL PNG, not an empty or failed canvas. The magic number is checked because a tainted
  // canvas does not throw where you can see it -- it refuses toBlob, and a handler that swallowed
  // that would hand over a plausible-looking nothing.
  const path=await file.path();
  const {readFile}=await import('node:fs/promises');
  const bytes=await readFile(path);
  expect([...bytes.subarray(0,8)]).toEqual([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  expect(bytes.length).toBeGreaterThan(2000);

  // Width is read from the PNG's own IHDR, so this asserts what was produced rather than what
  // was asked for: 850 figure units at 3x.
  const width=bytes.readUInt32BE(16);
  expect(width).toBe(2550);
  // And the size is stated rather than left to be discovered at a printer.
  await expect(page.locator('.toast')).toContainText('2550');
  await expect(page.locator('.toast')).toContainText('300 dpi');
});

test('the SVG download still works, and is a different file',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  const wait=page.waitForEvent('download');
  await page.locator('#map-download-svg').click();
  const file=await wait;
  expect(file.suggestedFilename()).toMatch(/\.svg$/);
});
