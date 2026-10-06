import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {exampleWorkflow} from '../build/core.js';
const password='test-only long passphrase',pdf=Buffer.from('%PDF-1.4\nSynthetic project evidence\n%%EOF'),hash=createHash('sha256').update(pdf).digest('hex');
const saved=page=>page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'));
async function source(page){const workflow=exampleWorkflow();workflow.name='Encrypted project trial';workflow.nodes[0].references=[{id:'census',kind:'pdf',filename:'census-private.pdf',sha256:hash,bytes:pdf.length,mediaType:'application/pdf',title:'Census reference',role:'data',authors:'',published:'',locator:'',notes:'',addedAt:'2026-10-06T00:00:00.000Z',modifiedAt:'2026-10-06T00:00:00.000Z'}];await page.goto('/?example=blank');await page.locator('#workflow-file').setInputFiles({name:'source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'fieldwork/bundle/1',workflow,attachments:[{sha256:hash,bytes:pdf.length,dataBase64:pdf.toString('base64')}]}))});await expect(page.locator('#project-title')).toHaveText(workflow.name);}
async function exportZip(page){await page.locator('#encrypted-export').click();await expect(page.locator('#package-dialog')).toContainText('1 unique PDFs');await page.locator('#package-password').fill(password);await page.locator('#package-confirm').fill(password);const pending=page.waitForEvent('download');await page.locator('#package-submit').click();const file=await pending;assert.equal(file.suggestedFilename(),'fieldwork-project.zip');await expect(page.locator('#package-dialog')).toHaveCount(0);return readFile(await file.path());}
async function importZip(page,bytes){await page.locator('#workflow-file').setInputFiles({name:'project.zip',mimeType:'application/zip',buffer:bytes});await expect(page.locator('#package-dialog')).toBeVisible();}

test('encrypted ZIP transfers binary PDFs offline, retries wrong passwords and keeps JSON compatibility',async({page,browser})=>{
  await source(page);await expect(page.locator('#offline-status')).toContainText('Available offline');await page.context().setOffline(true);
  const zip=await exportZip(page);assert.ok(!zip.includes(Buffer.from('census-private.pdf')));
  assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage}))).includes(password));
  const fresh=await browser.newContext({viewport:{width:1280,height:900}}),target=await fresh.newPage();
  try{await target.goto('http://127.0.0.1:4174/?example=blank');await expect(target.locator('#offline-status')).toContainText('Available offline');await fresh.setOffline(true);const before=await saved(target);
    await importZip(target,zip);await target.locator('#package-password').fill('wrong password');await target.locator('#package-submit').click();await expect(target.locator('#package-error')).toContainText('Check the passphrase');assert.equal(await saved(target),before);
    await target.locator('#package-password').fill(password);await target.locator('#package-submit').click();await expect(target.locator('#package-dialog')).toHaveCount(0);await expect(target.locator('#project-title')).toHaveText('Encrypted project trial');
    const pending=target.waitForEvent('download');await target.locator('#export-button').click();const bundle=JSON.parse(await readFile(await (await pending).path(),'utf8'));assert.deepEqual(Buffer.from(bundle.attachments[0].dataBase64,'base64'),pdf);
    await target.locator('#run-button').click();await expect(target.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});await expect(target.locator('#result-metrics .review b')).toHaveText('5');
  }finally{await fresh.close();}
});

test('package dialog validates confirmation, supports cancel, reports corruption and protects existing work on storage failure',async({page})=>{
  await source(page);await page.setViewportSize({width:620,height:700});await page.locator('#encrypted-export').click();await page.locator('#package-password').fill(password);await page.locator('#package-confirm').fill('different test password');await page.locator('#package-submit').click();await expect(page.locator('#package-error')).toContainText('do not match');
  await page.screenshot({path:'test-results/encrypted-package-dialog.png'});await page.locator('#package-cancel').click();await expect(page.locator('#package-dialog')).toHaveCount(0);
  const zip=await exportZip(page),before=await saved(page);await importZip(page,zip.subarray(0,zip.length-25));await page.locator('#package-password').fill(password);await page.locator('#package-submit').click();await expect(page.locator('#package-error')).toBeVisible();assert.equal(await saved(page),before);await page.locator('#package-cancel').click();
  await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='fieldwork-workflow-v1')throw new Error('Storage unavailable');return original.call(this,k,v);};});
  await importZip(page,zip);await page.locator('#package-password').fill(password);await page.locator('#package-submit').click();await expect(page.locator('#package-error')).toBeVisible();assert.equal(await saved(page),before);await page.locator('#package-cancel').click();
});

test('saved manifest updates with edits and survives export while incomplete inventories are rejected',async({page})=>{
  await source(page);const initial=JSON.parse(await saved(page));assert.equal(initial.manifest.inventory.assets.length,1);assert.equal(initial.manifest.inventory.assets[0].sha256,hash);
  await page.locator('[data-add="chart_output"]').click();await page.locator('#chart-decisions').selectOption('criteria');
  const updated=JSON.parse(await saved(page));assert.ok(updated.manifest.revision>initial.manifest.revision);assert.equal(updated.manifest.inventory.nodes.length,initial.nodes.length+1);assert.equal(updated.manifest.inventory.connections.length,initial.edges.length+1);
  const pending=page.waitForEvent('download');await page.locator('#export-button').click();const bundle=JSON.parse(await readFile(await (await pending).path(),'utf8'));assert.deepEqual(bundle.workflow.manifest,updated.manifest);
  const incomplete=structuredClone(bundle);incomplete.workflow.manifest.inventory.assets=[];const before=await saved(page);
  await page.locator('#workflow-file').setInputFiles({name:'incomplete.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incomplete))});await expect(page.locator('#toast')).toContainText('manifest');assert.equal(await saved(page),before);
  await page.reload();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});assert.deepEqual(JSON.parse(await saved(page)).manifest,updated.manifest);
});
