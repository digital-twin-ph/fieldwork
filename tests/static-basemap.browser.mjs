import {test,expect} from '@playwright/test';

/** GROUND UNDER A STATIC FIGURE. Experiment 137.
 *
 *  The practitioner, 2026-10-25: *"There is no default basemap"*, and after re-importing South
 *  London, *"I still don't see the static map basemap"*. It was not a defect: choosing a basemap
 *  switched the map to the interactive presentation, which `catchment-map.ts` calls "the only one
 *  that draws tiles". So the figure this project most wants to publish was the one that could
 *  never have context under it.
 *
 *  The tiles are stubbed. A test that fetched tile.openstreetmap.org would be measuring somebody
 *  else's uptime, would break their usage policy by running on every gate, and would fail offline
 *  -- which is the condition this application is built for. */
const PNG=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415478'
  +'9c6360000002000154a24f7e0000000049454e44ae426082','hex');

test.use({serviceWorkers:'block'});

test('a static map bakes raster tiles in, and credits them in the figure',async({page})=>{
  let requests=0;
  await page.route(/tile\.openstreetmap\.org/,route=>{requests++;
    route.fulfill({status:200,contentType:'image/png',body:PNG});});

  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();

  // NOTHING IS FETCHED UNTIL A BASEMAP IS CHOSEN, which is the privacy condition: a tile request
  // carries no records, but its z/x/y IS the viewed extent, so it must never happen by default.
  expect(requests).toBe(0);

  const mapNode=page.locator('.react-flow__node[data-id="access-map"]');
  await mapNode.click();
  await page.locator('#map-basemap').selectOption('osm');
  await page.locator('[data-view="results"]').click();

  // The tiles are IN the figure, as data URIs, so the exported SVG carries its own ground.
  const tiles=page.locator('#map [data-basemap="osm"] image');
  await expect(tiles.first()).toBeAttached({timeout:20000});
  expect(await tiles.count()).toBeGreaterThan(0);
  expect(requests).toBeGreaterThan(0);
  expect(await tiles.first().getAttribute('href')).toMatch(/^data:image\/png;base64,/);

  // GROUND IS ABOVE THE BLANK BACKGROUND AND BELOW THE DATA, which "first child" is not. This
  // asserted `firstElementChild` and passed while the tiles were in exactly the wrong place:
  // `oldMap` opens by painting an opaque rect across the whole frame, so being first meant being
  // painted over. The practitioner saw a sliver above the plot and nothing inside it.
  const order=await page.locator('#map').evaluate(el=>
    [...el.children].map(c=>c.tagName.toLowerCase()+(c.getAttribute('data-basemap')?':basemap':'')));
  const background=order.findIndex(tag=>tag==='rect');
  const ground=order.findIndex(tag=>tag.endsWith(':basemap'));
  const firstMark=order.findIndex(tag=>tag==='g'&&!tag.endsWith(':basemap'));
  expect(background).toBeGreaterThanOrEqual(0);
  expect(ground).toBeGreaterThan(background);
  if(firstMark>=0)expect(ground).toBeLessThan(firstMark);

  // AND CREDITED. ODbL attaches to the copy, and a figure is exactly the artefact that travels
  // away from the application that drew it.
  await expect(page.locator('#map-note')).toContainText('OpenStreetMap contributors');
  await expect(page.locator('#map-note')).toContainText('ODbL');
});

test('a vector style says why it cannot be baked, rather than drawing nothing',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="access-map"]').click();
  await page.locator('#map-basemap').selectOption('ofm-positron');
  // Choosing a vector style MOVES the map to the interactive presentation, which can draw it, so
  // there is no static figure left to refuse. The reachable case is a workflow that holds a
  // vector basemap and a static plot together -- which a practitioner reaches by putting the
  // presentation back, and a saved workflow can simply carry.
  await page.evaluate(()=>{
    const stored=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const map=stored.nodes.find(n=>n.id==='access-map');
    map.params.presentation='plot';
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();

  // Refused by name. A control that silently does nothing reads as broken, and "nothing drawn"
  // is indistinguishable from "tiles could not be fetched" unless the figure says which.
  await expect(page.locator('#map-note')).toContainText('vector tiles',{timeout:20000});
  await expect(page.locator('#map [data-basemap]')).toHaveCount(0);
});

/** THE CHOICE HAS TO REACH THE FIGURE THE PRACTITIONER IS LOOKING AT.
 *
 *  `change` calls `render`, which redraws the library, the project bar and the Inspector — and
 *  not the map. So choosing a basemap did nothing visible until something else happened to
 *  re-render the results.
 *
 *  The practitioner met it twice on 2026-10-25 and the two reports separate the causes. On a John
 *  Snow map with six output tabs the ground appeared once they clicked between tabs, because the
 *  tab click re-renders; on South London, which has ONE output and nothing to click, it never
 *  appeared at all. The test above hid this by selecting the basemap in the Workflow view and
 *  then switching to Results, where the view switch did the redraw for it.
 *
 *  So this one never leaves the Results tab, and the example it uses has a single output. */
test('choosing a basemap redraws the figure on screen, with one output and no tab to click',async({page})=>{
  let requests=0;
  await page.route(/tile\.openstreetmap\.org/,route=>{requests++;
    route.fulfill({status:200,contentType:'image/png',body:PNG});});

  // `old-naledi` rather than a polygon map: ground is wired into the renderer that draws a study
  // area with points, and the polygon renderers do not have it yet. Recorded as a gap rather
  // than worked around -- a basemap under a catchment map is the same request.
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  // Select the map node so the Inspector shows its settings, THEN go to the results and stay
  // there. The view switch happens before the choice, so it cannot be what draws the tiles.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="access-map"]').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map-basemap')).toBeVisible();
  expect(requests).toBe(0);

  await page.locator('#map-basemap').selectOption('osm');

  // No tab click, no view switch: the figure updates where it stands.
  await expect(page.locator('#map [data-basemap="osm"] image').first()).toBeAttached({timeout:20000});
  expect(requests).toBeGreaterThan(0);

  // And the run is not falsely marked stale: a basemap alters no number the run computed.
  await expect(page.locator('#workflow-state')).toContainText('Run complete');
});

/** AND UNDER A CATCHMENT MAP, which had no ground at all.
 *
 *  The basemap was wired into the renderer that draws a study area with points and into no other,
 *  so the catchment, isochrone and extent maps -- most of the maps in the worked examples -- could
 *  not have one. Found 2026-10-25 by a test that reached for a basemap on `snow-extent` and got
 *  nothing back.
 *
 *  Both plots are checked because they project different frames: the travel-time plot is 850x650
 *  and the rest are 850x295, and a basemap computed from the wrong frame is a basemap in the
 *  wrong place. */
for(const [example,label] of [['snow-extent','a polygon plot'],['snow-isochrone','a travel-time plot']])
test(`ground is drawn under ${label}`,async({page})=>{
  let requests=0;
  await page.route(/tile\.openstreetmap\.org/,route=>{requests++;
    route.fulfill({status:200,contentType:'image/png',body:PNG});});

  await page.goto(`/?example=${example}`);
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-basemap').selectOption('osm');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="map"]').click();

  const ground=page.locator('#map [data-basemap="osm"] image');
  await expect(ground.first()).toBeAttached({timeout:20000});
  expect(requests).toBeGreaterThan(0);

  // Above the plot's own background and below what the workflow drew.
  const order=await page.locator('#map').evaluate(el=>
    [...el.children].map(c=>c.getAttribute('data-basemap')?'basemap':c.tagName.toLowerCase()));
  expect(order.indexOf('basemap')).toBeGreaterThan(order.indexOf('rect'));
  expect(order.indexOf('basemap')).toBeLessThan(order.lastIndexOf('path'));
  await expect(page.locator('#map-note')).toContainText('OpenStreetMap contributors');
});

/** A FILL THAT ENCODES NOTHING MUST NOT HIDE WHAT IS UNDER IT.
 *
 *  The practitioner, 2026-10-25: *"If the shade carries value, then make the shade translucent but
 *  discernible. If not, e.g., just a boundary, it should be transparent, only the border shows."*
 *
 *  It is the objection `UnknownIsNotAHue` already makes about hue, one channel over: a study area
 *  polygon is a boundary, it encodes no measurement, and its wash was spending a visual variable
 *  on nothing. The evidence was that the ONE polygon carrying no value was the only one drawn
 *  opaque -- catchments, travel-time bands and hex counts are all translucent at about a fifth.
 *
 *  Withdrawn when ground is drawn rather than never drawn, because the cases differ: on a blank
 *  page the wash separates figure from ground and earns its place. */
test('a boundary shows only its border once there is ground beneath it',async({page})=>{
  await page.route(/tile\.openstreetmap\.org/,route=>
    route.fulfill({status:200,contentType:'image/png',body:PNG}));

  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();

  // With no basemap the wash is there, doing the job it is for.
  const boundary=page.locator('#map [data-fill-role="context"]').first();
  await expect(boundary).toBeAttached({timeout:20000});
  expect(await boundary.getAttribute('fill')).not.toBe('none');

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="access-map"]').click();
  await page.locator('#map-basemap').selectOption('osm');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map [data-basemap="osm"] image').first()).toBeAttached({timeout:20000});

  // With ground beneath, the border alone. The boundary is still drawn -- this is about the fill
  // channel, not about hiding the study area.
  await expect.poll(async()=>await page.locator('#map [data-fill-role="context"]').first().getAttribute('fill')).toBe('none');
  expect(await page.locator('#map [data-fill-role="context"]').first().getAttribute('stroke')).toBeTruthy();
});
