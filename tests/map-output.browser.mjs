import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {clipExercise} from '../build/clip-points.js';
import {collectPageErrors} from './page-errors.mjs';
test("Map connectors, layer identity, review and persistence",async({page,context})=>{
const errors=collectPageErrors(page);
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const run=async()=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});await page.locator('[data-view="results"]').click();};
const select=async id=>{await page.locator('[data-view="workflow"]').click();await page.locator(`.react-flow__node[data-id="${id}"] .node-heading`).click();};
// A map shows the layers it draws and ONE port to add another, so a layer that is not yet
// connected is dropped on `layer` and bound to its real port by what the source emits.
// 2026-10-15: "Instead of cluttering the side of the map widget with input ports, the Inspector
// UI should offer 1 configurable port but also enable addition of more input ports."
const connect=async(from,to,port)=>{
  const existing=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const handle=existing?port:'layer';
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`),target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${handle}"]`);
  await expect(source).toBeVisible();await expect(target).toBeVisible();
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
};
const receipt=async()=>{await page.locator('[data-view="rules"]').click();const pending=page.waitForEvent('download');await page.locator('#download-evidence').click();return JSON.parse(await readFile(await (await pending).path(),'utf8'));};
  await mkdir('test-results',{recursive:true});await page.goto('/?example=blank');
  const w=clipExercise();w.exampleId='blank';w.name='Map widget experiment';w.nodes=w.nodes.slice(0,2);w.edges=[];
  await page.locator('#workflow-file').setInputFiles({name:'map-start.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="map_output"]').click();
  await page.locator('#map-label').fill('Boundary and observations');await page.locator('#map-label').press('Tab');
  // A new map draws nothing, so it has no per-layer pickers yet -- it has the configurable one.
  // Each choice binds to the port its type belongs to and then gets a picker of its own.
  await expect(page.locator('#map-area')).toHaveCount(0);
  await page.locator('#map-add-layer').selectOption('scope');
  await expect(page.locator('#map-area')).toHaveValue('scope');
  await page.locator('#map-add-layer').selectOption('observations');
  await expect(page.locator('#map-points')).toHaveValue('observations');
  const mapId=(await saved()).nodes.find(n=>n.type==='map_output').id;
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="scope"] .node')).toHaveCSS('background-color','rgb(237, 240, 242)');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator(`.react-flow__node[data-id="${mapId}"] .node`)).toHaveCSS('background-color','rgb(229, 243, 229)');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__handle.target').first()).toHaveCSS('background-color','rgb(37, 99, 235)');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__handle.source').first()).toHaveCSS('background-color','rgb(220, 38, 38)');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);await run();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab',{name:'Boundary and observations'})).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map [data-place]')).toHaveCount(3);await expect(page.locator('#map path[fill-rule="evenodd"]')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  // The notice no longer names outside points: the counts above the map say that, and hue stopped
  // meaning the relation. What it carries is the thing the counts do not -- a record nobody could
  // place is not on the map at all.
  await expect(page.locator('#map-spatial-notice')).toContainText('1 record has no usable location');
  const outside=page.locator('#map [data-place="outside"]');await expect(outside).toHaveAttribute('aria-label',/Outside/);
  // THE DECLARED ENCODING, which this asserted the absence of until 2026-10-25: hue and mark say
  // which source a point came from, and fill says whether it is inside the study area. The
  // legend has drawn one entry per layer in that layer's hue and mark since layer symbols
  // existed; this renderer drew every mark as a circle coloured by STATUS and so disagreed with
  // its own key. `SPATIAL_RELATION_FILL` gives Outside the value `hollow`, so an outside point is
  // an outline in its layer's colour rather than a filled orange dot.
  const outsideMark=outside.locator('path');
  await expect(outsideMark).toHaveAttribute('fill','none');
  const inside=page.locator('#map [data-place]').filter({hasNot:page.locator('[fill="none"]')}).first();
  expect(await inside.locator('path').getAttribute('fill')).not.toBe('none');
  // Every mark stays inside the frame. Marks are paths now, so this reads the path geometry: the
  // same check against `circle` would have found nothing and passed by looping over nothing,
  // which is a worse outcome than failing.
  const marks=await page.locator('#map [data-place] path').all();
  expect(marks.length).toBeGreaterThan(0);
  for(const mark of marks){
    const d=await mark.getAttribute('d');
    for(const [x,y] of [...d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]))
      assert.ok(x>=-20&&x<=870&&y>=-20&&y<=315,`mark at ${x},${y} is outside the frame`);
  }
  await outside.focus();await outside.press('Enter');await expect(page.locator('#inspector-content')).toContainText('Outside study area');
  await page.locator('[data-view="results"]').click();
  await page.locator('[data-map-record="missing"]').click();await expect(page.locator('#inspector-content')).toContainText('cannot be plotted');
  await select(mapId);await page.screenshot({path:'test-results/map-output-desktop.png',fullPage:true});
  const raw=await receipt();assert.equal(raw.outputs[0].kind,'spatial-map');assert.equal(raw.outputs[0].rows.length,4);assert.match(raw.receipts.find(r=>r.nodeId===mapId).facts,/geo:sfDisjoint/);
  // A block stood here exercising the coverage check's connectors and its record review: adding
  // the widget, dragging it clear, wiring it to the map's `coverage` port, undoing, and excluding
  // a record with a reason. `coverage_check` was retired on 2026-10-21 and the map's `coverage`
  // port went with it. What survives is the persistence half, which was never about that widget.
  await run();
  const exported=page.waitForEvent('download');await page.locator('#backup-button').click();await page.locator('#export-button').click();
  const bytes=await readFile(await (await exported).path());
  await page.locator('#new-workflow').click();
  await page.locator('#workflow-file').setInputFiles({name:'map-saved.json',mimeType:'application/json',buffer:bytes});
  await run();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Boundary and observations'}).click();
  // Three drawn, not four: the fourth record has no coordinates, so it is listed rather than
  // plotted -- which the inspection above has already checked.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map [data-place]')).toHaveCount(3);
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Boundary and observations'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(3);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/map-output-mobile.png',fullPage:true});
  await context.setOffline(false);await page.setViewportSize({width:1600,height:1100});
  const multi=clipExercise(),second=structuredClone(multi.nodes[1]);second.id='second';second.params.label='Second dataset';second.x=40;second.y=400;multi.nodes.push(second);
  await page.locator('#workflow-file').setInputFiles({name:'layers.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(multi))});
  await expect(page.locator('#run-button')).toBeEnabled();await page.locator('[data-view="workflow"]').click();await page.locator('[data-add="map_output"]').click();
  // The clip exercise ships with a map of its own, so the one just added is the LAST one. It was
  // `find` while the exercise had none.
  const multiMapId=(await saved()).nodes.filter(n=>n.type==='map_output').at(-1).id;
  await page.locator('#map-label').fill('Layer comparison');await page.locator('#map-label').press('Tab');
  await page.locator('#map-add-layer').selectOption('scope');await page.locator('#map-add-layer').selectOption('observations');
  // A second point source needs no "add point input" click: the configurable port sees that
  // `points` is taken and opens the next slot itself.
  await page.locator('#map-add-layer').selectOption('second');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator(`.react-flow__node[data-id="${multiMapId}"] [data-handleid="points_2"]`)).toHaveCount(1);
  await expect(page.locator('#map-points_2')).toHaveValue('second');await run();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Layer comparison'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(6);await expect(page.locator('#map-layer-list input')).toHaveCount(2);await expect(page.locator('#map-missing-records button')).toHaveCount(2);
  await page.locator('[data-view="results"]').click();
  await page.locator('[data-map-layer="second"]').uncheck();await expect(page.locator('#map [data-layer="second"]:visible')).toHaveCount(0);await expect(page.locator('#map [data-layer="observations"]:visible')).toHaveCount(3);await page.locator('[data-map-layer="second"]').check();
  await select(multiMapId);await page.locator('#remove-point-input').click();assert.equal((await saved()).edges.filter(e=>e.to===multiMapId).length,2);await page.locator('#undo-button').click();await expect(page.locator('#map-points_2')).toHaveValue('second');
  // The coverage result was added here as a third layer and a record excluded by clicking it.
  // Both went with the widget on 2026-10-21; what the map does with several point layers is
  // below and is unaffected.
  await page.locator('[data-view="results"]').click();
  await run();await page.getByRole('tab',{name:'Layer comparison'}).click();
  const multiReceipt=await receipt(),multiView=multiReceipt.outputs.find(o=>o.nodeId===multiMapId);assert.equal(multiView.rows.length,8);
  // Two layers of four records each, kept apart by their source. `reviewCount` and
  // `retainedLayers` were the coverage check's, and went with it.
  assert.deepEqual(multiView.pointLayers.map(l=>l.count),[4,4]);
  await select(multiMapId);await page.screenshot({path:'test-results/map-multiple-layers.png',fullPage:true});
  const savedMulti=await saved();await page.locator('#new-workflow').click();await page.locator('#workflow-file').setInputFiles({name:'multiple-layers.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(savedMulti))});await run();
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Layer comparison'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(6);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS: Map node, polygon/point connections, visible outside and missing records, keyboard inspection, saved workflow, offline reload and mobile layout.');
});

// The receipts answer how many layers a map draws and of what kinds, asserted rather than left
// to be joined out of prov:used and fw:portType -- a join that returned four sources for a
// two-layer map, because a node appears under two IRI forms and the activity uses itself.
// See docs/widgets/map_output.md.
test('a map receipt counts the layers it draws, not the ports it has',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="rules"]').click();
  const n3=await page.locator('#n3-preview').textContent();

  // Two ports, four layers. Ports receive or transmit; layers are displayed.
  expect(n3).toContain('fw:layerCount 4');
  expect(n3).toContain('fw:layerKind <urn:fieldwork:AreaLayer>');
  expect(n3).toContain('fw:layerKind <urn:fieldwork:PolygonsLayer>');
  expect(n3).toContain('fw:layerKind <urn:fieldwork:PointsLayer>');

  // The 250 death locations are displayed and arrived at no port of their own: summarize_polygons
  // keeps the points it counted on the value it returns. The receipt says so rather than omitting
  // the layer a reader most wants to find.
  expect(n3).toContain('fw:layerFeatureCount 250');
  expect(n3).toContain('fw:layerRole "observations"');
  expect(n3).toContain('fw:layerWithin "polygons"');

  // And the pumps, which did arrive at a port, and are context in this map's reading.
  expect(n3).toContain('fw:layerRole "context"');
  expect(n3).toContain('fw:layerPort "context"');
  for(const index of [0,1,2,3])expect(n3).toContain(`fw:layerIndex ${index}`);
});

// "Manual for Map is not readable for some words" -- the practitioner, 2026-10-15, with a
// screenshot of the Map manual in dark mode: every inline `code` span and the table header were
// near-white chips under light text. `--tint` is defined on the node colour classes and nowhere
// else, so inside the dialog it was undefined and the rule fell back to #f4f4f4 in BOTH themes.
//
// The same screenshot showed the page still explaining the Input mode selector that had been
// deleted the day before, because the manual a practitioner reads is compiled into
// widgets/manual-pages.json and nothing compared it to its source. validate-manual.mjs does now.
test('the manual is legible in dark mode and is the page on disk',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto('/?example=snow-extent');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#open-manual').click();
  const dialog=page.locator('#manual-dialog');
  await expect(dialog).toBeVisible();

  // The compiled page is the current one, and it is a MANUAL: what the widget is, what it does,
  // how to use it, which examples exercise it. The record it used to carry moved to
  // docs/widget-specs/ on 2026-10-15 -- "It's for the human user, not developers or agents."
  await expect(dialog).toContainText('An output widget');
  await expect(dialog).toContainText('How to use it');
  await expect(dialog).toContainText('Worked examples that use it');
  await expect(dialog).not.toContainText('Input mode');
  // No revision stamp, no dated change notes, no link into the experiment record.
  await expect(dialog).not.toContainText('Created 2026');
  await expect(dialog).not.toContainText('2026-10-');
  await expect(dialog).not.toContainText('docs/experiments');

  // Measured on the table header, which carried the same defect as the code chips and is still
  // on the page -- the rewritten manual has no inline code at all, which is what plain language
  // looks like.
  const contrast=await dialog.locator('.manual-body th').first().evaluate(el=>{
    const parse=v=>v.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);
    const L=c=>{const [r,g,b]=c.map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});
      return .2126*r+.7152*g+.0722*b;};
    const style=getComputedStyle(el);
    const a=L(parse(style.color)),b=L(parse(style.backgroundColor));
    return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  // WCAG AA for small text. It measured 1.08 before the fix -- indistinguishable.
  expect(contrast).toBeGreaterThan(4.5);
});
