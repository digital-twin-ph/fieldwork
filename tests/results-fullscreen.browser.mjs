import {test,expect} from '@playwright/test';

// The practitioner, 2026-10-20: *"One annoying UI quirk BTW is the Full Screen control - whether in
// Safari or Chrome, the full screen is not a real full screen render."* Both full-screen paths sized
// the CONTAINER and left the map at its authored height, so the map sat in a band at the top of an
// otherwise empty screen. What makes it a render rather than a container is measured here: the map
// canvas itself, not the panel around it, has to take the viewport.
test('full screen renders the map at viewport height',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="interactive"]').click();
  const canvas=page.locator('.catchment-leaflet');
  await expect(canvas).toBeVisible();

  const viewport=page.viewportSize().height;
  const before=(await canvas.boundingBox()).height;
  expect(before).toBeLessThan(viewport*0.8);

  await page.locator('#fullscreen-workbench').click();
  await expect(page.locator('#fullscreen-workbench')).toHaveText('Exit full screen');
  await expect(async()=>{
    const box=await canvas.boundingBox();
    // The map takes the room full screen gained: it grows, and it grows by most of what the
    // viewport added. Measured 2026-10-20 at a 1100px viewport: 520px before, 691px after, with
    // the remaining 312px being the panel's own content -- heading, tabs, metrics, the figure
    // title and key, the map toolbar, the method line and the source note.
    expect(box.height).toBeGreaterThan(before+120);
    expect(box.height).toBeGreaterThan(viewport*0.55);
    // And no empty band below it, which is what the report was: the panel's last content reaches
    // the bottom of the screen instead of stopping where the authored height ran out.
    const bottom=await page.locator('.results-panel').evaluate(panel=>{
      const visible=[...panel.querySelectorAll('*')].map(el=>el.getBoundingClientRect())
        .filter(r=>r.height>0&&r.width>0);
      return Math.max(...visible.map(r=>r.bottom));
    });
    expect(bottom).toBeGreaterThan(viewport-48);
  }).toPass({timeout:5000});

  // Leaflet is told about the new size, so the vector pane it draws into covers the whole canvas.
  // A map that was only stretched by CSS keeps the pane it painted at the authored height, and the
  // lower part of the canvas holds nothing.
  const grown=await canvas.boundingBox();
  const pane=await page.locator('.catchment-leaflet .leaflet-overlay-pane svg').first()
    .evaluate(svg=>svg.getBoundingClientRect().height);
  expect(pane).toBeGreaterThan(grown.height*0.9);

  await page.keyboard.press('Escape');
  await expect(page.locator('#fullscreen-workbench')).toHaveText('Full screen');
  await expect(async()=>expect((await canvas.boundingBox()).height).toBeLessThan(viewport*0.8)).toPass({timeout:5000});
});

// The map's own toolbar button uses the Fullscreen API on #map-panel. The CSS written for it named
// #catchment-map-host, an element that is never the fullscreen element, so the rule never matched.
test('the map toolbar full-screen button reports its own state',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="interactive"]').click();
  await page.locator('[data-view="results"]').click();
  const button=page.locator('.catchment-map-toolbar [data-fullscreen]');
  await expect(button).toHaveText('Full screen');
  await expect(button).toHaveAttribute('aria-pressed','false');
});
