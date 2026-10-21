import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {pointGeoPackage} from './input-fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
test("Input formats and pushpin schemas",async({page,context})=>{
const errors=collectPageErrors(page);
const done=()=>expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
const run=async()=>{await page.locator('#run-button').click();await done();await page.locator('[data-view="results"]').click();};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const row=id=>page.locator(`#result-rows [data-place="${id}"]`);
const select=async id=>{await page.locator('[data-view="workflow"]').click();await page.locator(`.react-flow__node[data-id="${id}"]`).click();};
const input=async mode=>{await select('observations');await page.locator('#edit-input-data').click();await page.locator('#input-mode').selectOption(mode);};
  await mkdir('test-results',{recursive:true});await page.goto('/?example=coverage');await done();
  // The spatial-review half of this test -- coverage alerts, excluding a record with a reason,
  // restoring it, and opening the study area from a record to widen it -- went with
  // `coverage_check` on 2026-10-21. The input half below was never about that widget: it is the
  // formats a practitioner can bring, and the typed attributes that must survive each of them.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(4);
  await page.locator('[data-view="results"]').click();
  await input('synthetic');await page.locator('#synthetic-inside').fill('3');await page.locator('#synthetic-outside').fill('1');await page.locator('#generate-input').click();await page.locator('#input-apply').click();await run();await expect(page.locator('#result-rows [data-place]')).toHaveCount(4);
  await input('csv');await page.locator('#input-file').setInputFiles({name:'points.csv',mimeType:'text/csv',buffer:Buffer.from('id,name,longitude,latitude,notes\na,"Clinic, A",25.90,-24.69,example\nb,Outside CSV,25.94,-24.69,review\n')});
  await expect(page.locator('#input-summary')).toContainText('2 draft');await page.locator('#input-apply').click();await run();
  // Both CSV records reach the map: the one with coordinates is drawn, and the one without is
  // listed as unplaceable under the id the clip carried it out with.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(2);assert.equal((await saved()).nodes.find(n=>n.id==='observations').params.data.features[0].properties.notes,'example');
  const gpkg=await pointGeoPackage();await input('gpkg');await page.locator('#input-file').setInputFiles({name:'points.gpkg',mimeType:'application/geopackage+sqlite3',buffer:Buffer.from(gpkg.bytes)});
  await expect(page.locator('#input-summary')).toContainText('2 draft');await expect(page.locator('#input-apply')).toBeEnabled();await page.locator('#input-apply').click();await run();
  // 'Review required' was the coverage check's word for a record outside the area. The map says
  // where the record stands and leaves the judgement to the reader.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows')).toContainText('Outside study area');assert.equal((await saved()).nodes.find(n=>n.id==='observations').params.data.features[0].properties.case_count,3);
  await input('pins');await page.locator('#pins-online').uncheck();const map=await page.locator('#pin-map').boundingBox();await page.mouse.click(map.x+map.width*.7,map.y+map.height*.7);
  await page.locator('#pin-name').fill('Field pin');await page.locator('#pin-longitude').fill('25.9');await page.locator('#pin-latitude').fill('-24.69');await page.locator('#pin-attr-0').fill('Community visit');await page.locator('[data-pin-key="notes"]').fill('First line\nSecond line');
  await page.getByText('Add a form field',{exact:true}).click();await page.locator('#pin-field-key').fill('household_size');await page.locator('#pin-field-label').fill('Household size');await page.locator('#pin-field-type').selectOption('number');await page.locator('#pin-field-default').fill('1');await page.locator('#pin-add-field').click();
  await page.locator('[data-pin-key="household_size"]').fill('5');await page.locator('#pin-save').click();
  await page.locator('#pin-pair-key').fill('visit_status');await page.locator('#pin-pair-value').fill('Planned');await page.locator('#pin-add-pair').click();
  await page.locator('[data-pin-rename="visit_status"]').fill('visit_outcome');await page.locator('[data-pin-key="visit_status"]').fill('Completed');await page.locator('#pin-save').click();
  await page.locator('#pin-pair-key').fill('visit_outcome');await page.locator('#pin-pair-value').fill('Duplicate');await page.locator('#pin-add-pair').click();await expect(page.locator('#input-error')).toContainText('"visit_outcome" already exists on this pin');
  await page.locator('#pin-pair-key').fill('temporary');await page.locator('#pin-pair-type').selectOption('number');await page.locator('#pin-pair-value').fill('2');await page.locator('#pin-add-pair').click();await page.locator('[data-remove-pair="temporary"]').click();
  await expect(page.locator('[data-pin-key="temporary"]')).toHaveCount(0);await expect(page.locator('[data-pin-key="visit_outcome"]')).toHaveValue('Completed');
  await page.locator('#pin-pair-key').fill('visit_phase');await page.locator('#pin-pair-type').selectOption('text');await page.locator('#pin-pair-values').fill('Planned\nCompleted\nFollow-up');await page.locator('#pin-pair-value').fill('Invalid choice');await page.locator('#pin-add-pair').click();await expect(page.locator('#input-error')).toContainText('allowed set');
  await page.locator('#pin-pair-value').fill('Planned');await page.locator('#pin-add-pair').click();await expect(page.locator('select[data-pin-key="visit_phase"]')).toHaveValue('Planned');await page.locator('[data-pin-key="visit_phase"]').selectOption('Completed');
  await page.locator('#pin-pair-key').fill('visit_date');await page.locator('#pin-pair-type').selectOption('date');await page.locator('#pin-pair-value').fill('2026-10-05');await page.locator('#pin-add-pair').click();await expect(page.locator('[data-pin-key="visit_date"]')).toHaveAttribute('type','date');
  await page.locator('#pin-field-key').fill('priority');await page.locator('#pin-field-label').fill('Priority');await page.locator('#pin-field-type').selectOption('integer');await page.locator('#pin-field-values').fill('1\n2\n3');await page.locator('#pin-field-default').fill('1');await page.locator('#pin-add-field').click();await page.locator('[data-pin-key="priority"]').selectOption('2');
  await page.screenshot({path:'test-results/pushpin-form.png',fullPage:true});await page.locator('#input-apply').click();await run();
  const pin=(await saved()).nodes.find(n=>n.id==='observations').params.data.features.find(f=>f.properties.name==='Field pin');assert.equal(pin.properties.household_size,5);assert.equal(pin.properties.category,'Community visit');assert.match(pin.properties.capturedAt,/^\d{4}-\d{2}-\d{2}T/);assert.deepEqual(pin.geometry.coordinates,[25.9,-24.69]);
  // The pin reached the output under its own id; which rows are SHOWN depends on the tab and any
  // search in force, which is not what this test is about.
  await expect(row(pin.id)).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Map'}).click();await page.screenshot({path:'test-results/coverage-map.png',fullPage:true});
  assert.equal(pin.properties.notes,'First line\nSecond line');
  assert.equal(pin.properties.visit_outcome,'Completed');assert.equal(pin.properties.visit_status,undefined);assert.equal(pin.properties.temporary,undefined);assert.equal((await saved()).nodes.find(n=>n.id==='observations').params.data.features[0].properties.visit_outcome,undefined);
  assert.equal(pin.properties.visit_phase,'Completed');assert.equal(pin.properties.priority,2);assert.equal(pin.properties.visit_date,'2026-10-05');
  await page.locator('[data-view="rules"]').click();await expect(page.locator('#n3-preview')).toContainText('household_size');
  const receiptDownload=page.waitForEvent('download');await page.locator('#download-evidence').click();const receipt=JSON.parse(await readFile(await (await receiptDownload).path(),'utf8'));assert.equal(receipt.outputs[0].rows.length,3);
  const typed=[receipt.provenanceN3,...receipt.receipts.map(r=>r.input||'')].join('\n');
  assert.match(typed,/XMLSchema#date/);assert.match(typed,/XMLSchema#integer/);
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await done();await input('gpkg');await page.locator('#input-file').setInputFiles({name:'offline.gpkg',mimeType:'application/geopackage+sqlite3',buffer:Buffer.from(gpkg.bytes)});await expect(page.locator('#input-summary')).toContainText('2 draft');await expect(page.locator('#input-apply')).toBeEnabled();await page.locator('#input-cancel').click();await page.locator('#input-discard-edits').click();
  assert.equal((await saved()).nodes.find(n=>n.id==='observations').params.data.features.length,3);
  await input('pins');await page.locator('#pin-record').selectOption(pin.id);await expect(page.locator('select[data-pin-key="visit_phase"]')).toHaveValue('Completed');await expect(page.locator('[data-pin-key="visit_date"]')).toHaveValue('2026-10-05');await expect(page.locator('[data-pin-key="priority"]')).toHaveValue('2');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#input-dialog').evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:'test-results/input-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: synthetic/CSV/GeoPackage/pushpin input, attributes, EYE rules, offline GeoPackage, cancel and mobile layout.');
});
