import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {coverageExercise} from '../build/spatial-coverage.js';

const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const source=w=>w.nodes.find(n=>n.id==='observations').params;
const open=async page=>{
  await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="observations"]').click();await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('pins');await page.locator('#pins-online').uncheck();await page.locator('#pin-record').selectOption('inside');
};
test.beforeEach(async({page})=>{
  await page.goto('/?example=blank');const w=coverageExercise();w.exampleId='blank';
  await page.locator('#workflow-file').setInputFiles({name:'pin-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});await open(page);
});

test('Save Edits includes a pending typed key/value pair without requiring Add pair',async({page,context})=>{
  await page.locator('#pin-pair-key').fill('visit_status');await page.locator('#pin-pair-values').fill('Planned\nCompleted');await page.locator('#pin-pair-value').fill('Completed');
  await page.locator('#input-apply').click();
  const params=source(await saved(page));assert.equal(params.data.features[0].properties.visit_status,'Completed');
  assert.deepEqual(params.attributeRules.find(r=>r.key==='visit_status'),{key:'visit_status',type:'text',allowedValues:['Planned','Completed']});
  await expect(page.locator('#input-dialog')).not.toBeVisible();await expect(page.locator('#toast')).toContainText('Input edits saved');
  await open(page);await expect(page.locator('[data-pin-key="visit_status"]')).toHaveValue('Completed');
  await page.locator('[data-pin-key="visit_status"]').selectOption('Planned');await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});await open(page);await expect(page.locator('[data-pin-key="visit_status"]')).toHaveValue('Planned');
});

test('invalid pending values stay editable and close/escape cannot silently discard them',async({page})=>{
  const before=await saved(page);
  await page.locator('#pin-pair-key').fill('priority');await page.locator('#pin-pair-type').selectOption('integer');await page.locator('#pin-pair-values').fill('1\n2\n3');await page.locator('#pin-pair-value').fill('4');
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();await expect(page.locator('#input-error')).toContainText('allowed set');assert.deepEqual(await saved(page),before);
  await page.locator('#input-close').click();await expect(page.locator('#input-discard-prompt')).toBeVisible();await page.locator('#input-keep-editing').click();await expect(page.locator('#pin-pair-value')).toHaveValue('4');
  await page.keyboard.press('Escape');await expect(page.locator('#input-dialog')).toBeVisible();await expect(page.locator('#input-discard-prompt')).toBeVisible();await page.locator('#input-keep-editing').click();
  await page.locator('#pin-pair-value').fill('2');await page.getByRole('button',{name:'Save Edits',exact:true}).click();assert.equal(source(await saved(page)).data.features[0].properties.priority,2);
  await open(page);await page.locator('[data-pin-key="priority"]').selectOption('3');await page.locator('#input-cancel').click();await page.locator('#input-discard-edits').click();assert.equal(source(await saved(page)).data.features[0].properties.priority,2);
});

test('record switches retain pending pairs and Save Edits includes an unfinished shared field',async({page})=>{
  await page.locator('#pin-pair-key').fill('household_size');await page.locator('#pin-pair-type').selectOption('integer');await page.locator('#pin-pair-value').fill('5');await page.locator('#pin-record').selectOption('edge');
  await page.getByText('Add a form field',{exact:true}).click();await page.locator('#pin-field-key').fill('follow_up');await page.locator('#pin-field-label').fill('Follow up');await page.locator('#pin-field-type').selectOption('boolean');await page.locator('#pin-field-default').fill('false');
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  const params=source(await saved(page));assert.equal(params.data.features.find(f=>f.id==='inside').properties.household_size,5);assert.equal(params.data.features.find(f=>f.id==='edge').properties.household_size,undefined);
  assert.deepEqual(params.fields.find(f=>f.key==='follow_up'),{key:'follow_up',label:'Follow up',type:'boolean',defaultValue:false});
  await open(page);await expect(page.locator('[data-pin-key="household_size"]')).toHaveValue('5');await expect(page.locator('[data-pin-key="follow_up"]')).toHaveValue('false');
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Save Edits',exact:true})).toBeInViewport();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
});

test('storage failure keeps the editor open for retry and does not claim a successful save',async({page})=>{
  const before=await saved(page);await page.locator('#pin-name').fill('Persist this edit');
  await page.evaluate(()=>{window.restoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Test quota exceeded','QuotaExceededError');};});
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();await expect(page.locator('#input-dialog')).toBeVisible();await expect(page.locator('#input-error')).toContainText('could not be saved');assert.deepEqual(await saved(page),before);
  await page.evaluate(()=>{Storage.prototype.setItem=window.restoreStorage;delete window.restoreStorage;});
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();await expect(page.locator('#input-dialog')).not.toBeVisible();assert.equal(source(await saved(page)).data.features[0].properties.name,'Persist this edit');
});

test('switching from a rejected import to pushpins allows saving existing pin edits',async({page})=>{
  await page.locator('#input-mode').selectOption('geojson');
  await page.locator('#input-file').setInputFiles({name:'invalid.geojson',mimeType:'application/json',buffer:Buffer.from('{')});
  await expect(page.locator('#input-error')).toBeVisible();
  await expect(page.locator('#input-error-message')).not.toBeEmpty();
  await page.locator('#input-mode').selectOption('pins');
  await page.locator('#pin-name').fill('Saved after rejected import');
  await expect(page.getByRole('button',{name:'Save Edits',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();
  assert.equal(source(await saved(page)).data.features[0].properties.name,'Saved after rejected import');
});

test('save validation errors remain visible beside Save Edits on a short screen',async({page})=>{
  await page.setViewportSize({width:1100,height:720});
  await page.locator('#pin-pair-key').fill('household size');
  await page.locator('#pin-pair-value').fill('5');
  await page.locator('#input-dialog').evaluate(el=>el.scrollTop=0);
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-dialog')).toBeVisible();
  await expect(page.locator('#input-error')).toContainText('"household size" is not a valid attribute name');
  await expect(page.locator('#input-error')).toBeInViewport();
  await expect(page.locator('#input-error strong')).toHaveText('Action needed');
  await expect(page.locator('#input-error')).toHaveCSS('border-left-width','6px');
  await page.screenshot({path:'test-results/pushpin-visible-error.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  for(const end of ['top','bottom']){
    await page.locator('#input-dialog').evaluate((el,end)=>el.scrollTop=end==='top'?0:el.scrollHeight,end);
    await expect(page.locator('#input-error')).toBeInViewport({ratio:1});
    await expect(page.getByRole('button',{name:'Save Edits',exact:true})).toBeInViewport({ratio:1});
  }
  await page.screenshot({path:'test-results/pushpin-visible-error-mobile.png',fullPage:true});
  await page.locator('#pin-pair-key').fill('household_size');
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();
  assert.equal(source(await saved(page)).data.features[0].properties.household_size,'5');
});

test('an unused type selection does not block saving and duplicate names explain how to recover',async({page})=>{
  await page.locator('#pin-pair-type').selectOption('integer');
  await page.locator('#pin-name').fill('Save without a new attribute');
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();
  assert.equal(source(await saved(page)).data.features[0].properties.name,'Save without a new attribute');
  await open(page);
  await page.locator('#pin-pair-key').fill('category');await page.locator('#pin-pair-value').fill('Clinic');
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-error')).toContainText('"category" already exists on this pin');
  await page.locator('#pin-pair-key').fill('');await page.locator('#pin-pair-value').fill('');
  await page.locator('[data-pin-key="category"]').fill('Clinic');
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();
  assert.equal(source(await saved(page)).data.features[0].properties.category,'Clinic');
});

test('partial storage failure rolls back the workflow so discarding still preserves the original input',async({page})=>{
  const before=await saved(page);await page.locator('#pin-name').fill('Uncommitted edit');
  await page.evaluate(()=>{window.restoreStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='fieldwork-examples-v1')throw new DOMException('Test quota exceeded','QuotaExceededError');return window.restoreStorage.call(this,key,value);};});
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();await expect(page.locator('#input-error')).toContainText('could not be saved');assert.deepEqual(await saved(page),before);
  await page.evaluate(()=>{Storage.prototype.setItem=window.restoreStorage;delete window.restoreStorage;});
  await page.locator('#input-cancel').click();await page.locator('#input-discard-edits').click();
  const download=page.waitForEvent('download');await page.locator('#export-button').click();const exported=JSON.parse(await readFile(await (await download).path(),'utf8'));assert.deepEqual(exported,before);
});

test('UUID option persists, new pin IDs stay stable, and Delete Pin is saved or discarded explicitly',async({page,context})=>{
  await expect(page.locator('#pin-form')).toContainText('Optional label for this location');await expect(page.locator('#pin-form')).toContainText('Optional free-text observations');await expect(page.locator('#pin-form')).not.toContainText('Key: category');
  await expect(page.locator('#pin-id')).toHaveValue('inside');await expect(page.locator('#pin-use-uuid')).not.toBeChecked();await page.locator('#pin-use-uuid').check();
  const add=async x=>{await page.locator('#pin-map').scrollIntoViewIfNeeded();const box=await page.locator('#pin-map').boundingBox();await page.mouse.click(box.x+box.width*x,box.y+box.height*.55);return page.locator('#pin-record').inputValue();};
  const first=await add(.65);await page.locator('#pin-name').fill('UUID location');const second=await add(.8);assert.notEqual(first,second);
  for(const id of [first,second])assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  const original=source(await saved(page));assert.equal(original.pinIdStrategy,'uuid');assert.equal(original.data.features[0].id,'inside');assert.equal(original.data.features.find(f=>f.id===first).properties.name,'UUID location');
  assert.ok(original.data.features.find(f=>f.id===first).properties.capturedAt);
  await open(page);await expect(page.locator('#pin-use-uuid')).toBeChecked();await page.locator('#pin-record').selectOption(first);await page.getByRole('button',{name:'Delete Pin',exact:true}).click();await expect(page.locator('#pin-record option')).toHaveCount(6);
  assert.equal(source(await saved(page)).data.features.length,6);await page.locator('#input-cancel').click();await page.locator('#input-discard-edits').click();assert.deepEqual(source(await saved(page)),original);
  await open(page);await page.locator('#pin-record').selectOption(first);await page.getByRole('button',{name:'Delete Pin',exact:true}).click();await page.getByRole('button',{name:'Save Edits',exact:true}).click();assert.equal(source(await saved(page)).data.features.some(f=>f.id===first),false);
  await page.locator('#undo-button').click();assert.equal(source(await saved(page)).data.features.some(f=>f.id===first),true);
  await open(page);await page.locator('#pin-record').selectOption(second);await page.locator('#pin-name').fill('Renamed stable UUID');await page.locator('#pin-longitude').fill('25.9');await page.locator('#pin-latitude').fill('-24.69');await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});await open(page);await page.locator('#pin-record').selectOption(second);await expect(page.locator('#pin-id')).toHaveValue(second);await expect(page.locator('#pin-name')).toHaveValue('Renamed stable UUID');await expect(page.locator('#pin-use-uuid')).toBeChecked();
  await page.screenshot({path:'test-results/pin-save-delete-uuid.png',fullPage:true});
});
