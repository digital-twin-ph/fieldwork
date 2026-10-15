import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {coverageExercise} from '../build/spatial-coverage.js';
test("Map connectors, layer identity, review and persistence",async({page,context})=>{
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const run=async()=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};
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
  const w=coverageExercise();w.exampleId='blank';w.name='Map widget experiment';w.nodes=w.nodes.slice(0,2);w.edges=[];
  await page.locator('#workflow-file').setInputFiles({name:'map-start.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
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
  await expect(page.locator('.react-flow__node[data-id="scope"] .node')).toHaveCSS('background-color','rgb(237, 240, 242)');
  await expect(page.locator(`.react-flow__node[data-id="${mapId}"] .node`)).toHaveCSS('background-color','rgb(229, 243, 229)');
  await expect(page.locator('.react-flow__handle.target').first()).toHaveCSS('background-color','rgb(37, 99, 235)');
  await expect(page.locator('.react-flow__handle.source').first()).toHaveCSS('background-color','rgb(220, 38, 38)');
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);await run();
  await expect(page.getByRole('tab',{name:'Boundary and observations'})).toBeVisible();
  await expect(page.locator('#map [data-place]')).toHaveCount(3);await expect(page.locator('#map path[fill-rule="evenodd"]')).toHaveCount(1);
  await expect(page.locator('#map-spatial-notice')).toContainText('1 outside point');await expect(page.locator('#map-spatial-notice')).toContainText('1 record has no coordinates');
  const outside=page.locator('#map [data-place="outside"]');await expect(outside).toHaveAttribute('aria-label',/Outside/);
  await expect(outside.locator('circle')).toHaveAttribute('fill','#c18b4f');
  for(const circle of await page.locator('#map [data-place] circle').all()){const x=Number(await circle.getAttribute('cx')),y=Number(await circle.getAttribute('cy'));assert.ok(x>=0&&x<=850&&y>=0&&y<=295);}
  await outside.focus();await outside.press('Enter');await expect(page.locator('#inspector-content')).toContainText('Outside study area');
  await page.locator('[data-map-record="missing"]').click();await expect(page.locator('#inspector-content')).toContainText('cannot be plotted');
  await select(mapId);await page.screenshot({path:'test-results/map-output-desktop.png',fullPage:true});
  const raw=await receipt();assert.equal(raw.outputs[0].kind,'spatial-map');assert.equal(raw.outputs[0].rows.length,4);assert.match(raw.receipts.find(r=>r.nodeId===mapId).facts,/geo:sfDisjoint/);
  await select(mapId);await page.locator('[data-add="coverage_check"]').click();
  const checkId=(await saved()).nodes.find(n=>n.type==='coverage_check').id;
  await expect(page.locator(`.react-flow__node[data-id="${checkId}"] .node`)).toHaveCSS('background-color','rgb(255, 240, 221)');
  // Separate the newly added node from Map before exercising visible connectors.
  const heading=page.locator(`.react-flow__node[data-id="${checkId}"] .node-heading`);
  await heading.hover();const box=await heading.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+220,box.y+box.height/2-30,{steps:15});await page.mouse.up();
  await page.locator('#fit-button').click();
  await page.locator('#coverage-area').selectOption('scope');await page.locator('#coverage-points').selectOption('observations');
  await select(mapId);await page.locator('#fit-button').click();await page.waitForTimeout(300);
  await connect(checkId,mapId,'coverage');
  await expect(page.locator('#map-coverage')).toHaveValue(checkId);
  assert.deepEqual((await saved()).edges.filter(e=>e.to===mapId).map(e=>e.port),['coverage']);
  await expect(page.locator(`.react-flow__node[data-id="${mapId}"] .alternative-input`)).toHaveText('Or: Coverage result');
  await page.locator('#undo-button').click();
  assert.deepEqual((await saved()).edges.filter(e=>e.to===mapId).map(e=>e.port),['area','points']);
  await connect(checkId,mapId,'coverage');await expect(page.locator('#map-coverage')).toHaveValue(checkId);
  // Also exercise the reported empty Map. There is no wrong socket to reject any more: the one
  // configurable port takes anything the map can draw and binds it to the port its TYPE belongs
  // to, so a coverage result aimed anywhere on the node lands on `coverage`. This used to assert
  // that the same drop changed nothing, which was true when a practitioner had to pick the socket
  // themselves and could pick the wrong one.
  await page.locator('#map-coverage').selectOption('');
  assert.equal((await saved()).edges.filter(e=>e.to===mapId).length,0);
  await connect(checkId,mapId,'area');
  assert.deepEqual((await saved()).edges.filter(e=>e.to===mapId).map(e=>e.port),['coverage']);
  await page.locator('#map-coverage').selectOption('');
  await connect(checkId,mapId,'coverage');await expect(page.locator('#map-coverage')).toHaveValue(checkId);
  // Switching back to direct inputs uses the same replacement rule; Undo restores the reviewed result.
  await connect('scope',mapId,'area');await expect(page.locator('#map-area')).toHaveValue('scope');
  assert.deepEqual((await saved()).edges.filter(e=>e.to===mapId).map(e=>e.port),['area']);
  await page.locator('#undo-button').click();await expect(page.locator('#map-coverage')).toHaveValue(checkId);
  await page.screenshot({path:'test-results/coverage-map-connectors.png',fullPage:true});await run();
  await page.getByRole('tab',{name:'Boundary and observations'}).click();await outside.click();
  await page.locator('#exclusion-reason').fill('Verified test coordinate error');await page.locator('#coverage-exclude-form button').click();await run();
  await expect(outside).toHaveAttribute('aria-label',/Excluded/);await expect(page.locator('#map [data-place]')).toHaveCount(3);
  const reviewed=await receipt();assert.equal(reviewed.outputs.find(o=>o.nodeId===mapId).rows.find(r=>r.id==='outside').excluded,true);
  const download=page.waitForEvent('download');await page.locator('#export-button').click();const bytes=await readFile(await (await download).path());
  await page.locator('#new-workflow').click();await page.locator('#workflow-file').setInputFiles({name:'map-saved.json',mimeType:'application/json',buffer:bytes});await run();
  await page.getByRole('tab',{name:'Boundary and observations'}).click();await expect(outside).toHaveAttribute('aria-label',/Excluded/);
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.getByRole('tab',{name:'Boundary and observations'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(3);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/map-output-mobile.png',fullPage:true});
  await context.setOffline(false);await page.setViewportSize({width:1600,height:1100});
  const multi=coverageExercise(),second=structuredClone(multi.nodes[1]);second.id='second';second.params.label='Second dataset';second.x=40;second.y=400;multi.nodes.push(second);
  await page.locator('#workflow-file').setInputFiles({name:'layers.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(multi))});
  await expect(page.locator('#run-button')).toBeEnabled();await page.locator('[data-view="workflow"]').click();await page.locator('[data-add="map_output"]').click();
  const multiMapId=(await saved()).nodes.find(n=>n.type==='map_output').id;
  await page.locator('#map-label').fill('Layer comparison');await page.locator('#map-label').press('Tab');
  await page.locator('#map-add-layer').selectOption('scope');await page.locator('#map-add-layer').selectOption('observations');
  // A second point source needs no "add point input" click: the configurable port sees that
  // `points` is taken and opens the next slot itself.
  await page.locator('#map-add-layer').selectOption('second');
  await expect(page.locator(`.react-flow__node[data-id="${multiMapId}"] [data-handleid="points_2"]`)).toHaveCount(1);
  await expect(page.locator('#map-points_2')).toHaveValue('second');await run();
  await page.getByRole('tab',{name:'Layer comparison'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(6);await expect(page.locator('#map-layer-list input')).toHaveCount(2);await expect(page.locator('#map-missing-records button')).toHaveCount(2);
  await page.locator('[data-map-layer="second"]').uncheck();await expect(page.locator('#map [data-layer="second"]:visible')).toHaveCount(0);await expect(page.locator('#map [data-layer="observations"]:visible')).toHaveCount(3);await page.locator('[data-map-layer="second"]').check();
  await select(multiMapId);await page.locator('#remove-point-input').click();assert.equal((await saved()).edges.filter(e=>e.to===multiMapId).length,2);await page.locator('#undo-button').click();await expect(page.locator('#map-points_2')).toHaveValue('second');
  await select('coverage');await page.locator('#add-point-input').click();await page.locator('#coverage-points_2').selectOption('second');
  // Not drawn yet, so the coverage result is added through the configurable picker.
  await select(multiMapId);await page.locator('#map-add-layer').selectOption('coverage');
  await expect(page.locator('#map-coverage')).toHaveValue('coverage');await run();await page.getByRole('tab',{name:'Layer comparison'}).click();
  // Coincident points from the two datasets can be inspected by toggling layers.
  await page.locator('[data-map-layer="second"]').uncheck();await page.locator('#map [data-layer="observations"][aria-label^="Outside example"]').click();await page.locator('#exclusion-reason').fill('Error in first dataset only');await page.locator('#coverage-exclude-form button').click();await run();await page.locator('[data-map-layer="second"]').check();
  await expect(page.locator('#map [data-layer="observations"][aria-label^="Outside example"]')).toHaveAttribute('aria-label',/Excluded/);await expect(page.locator('#map [data-layer="second"][aria-label^="Outside example"]')).toHaveAttribute('aria-label',/Outside/);
  const multiReceipt=await receipt(),multiView=multiReceipt.outputs.find(o=>o.nodeId===multiMapId);assert.equal(multiView.rows.length,8);assert.equal(multiView.excludedCount,1);assert.equal(multiView.reviewCount,3);assert.equal(multiView.retainedLayers[1].data.features.length,4);
  await select(multiMapId);await page.screenshot({path:'test-results/map-multiple-layers.png',fullPage:true});
  const savedMulti=await saved();await page.locator('#new-workflow').click();await page.locator('#workflow-file').setInputFiles({name:'multiple-layers.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(savedMulti))});await run();
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await select('coverage');await expect(page.locator('#coverage-points_2')).toHaveValue('second');await page.getByRole('tab',{name:'Layer comparison'}).click();await expect(page.locator('#map [data-place]')).toHaveCount(6);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS: Map node, polygon/point connections, visible outside and missing records, keyboard inspection, coverage/exclusions, saved workflow, offline reload and mobile layout.');
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
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#open-manual').click();
  const dialog=page.locator('#manual-dialog');
  await expect(dialog).toBeVisible();

  // The compiled page is the current one.
  await expect(dialog).toContainText('There is no input mode');
  await expect(dialog).not.toContainText('depends on its Input mode');

  // Every code chip reads against its own background, in the theme actually rendered.
  const contrast=await dialog.locator('.manual-body code').first().evaluate(el=>{
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
