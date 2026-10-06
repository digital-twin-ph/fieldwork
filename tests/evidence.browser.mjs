import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {coverageExercise} from '../build/spatial-coverage.js';

const pdf=Buffer.from('%PDF-1.4\nSynthetic census reference for testing\n%%EOF');
const hash=createHash('sha256').update(pdf).digest('hex');
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const refs=async(page,id='observations')=>(await saved(page)).nodes.find(n=>n.id===id).references||[];
const upload=(page,buffer)=>page.locator('#workflow-file').setInputFiles({name:'workflow.json',mimeType:'application/json',buffer});
const open=async(page,id='observations')=>{await page.locator('[data-view="workflow"]').click();await page.locator(`.react-flow__node[data-id="${id}"]`).click();await page.locator('#manage-references').click();};
const download=async(page,selector)=>{const event=page.waitForEvent('download');await page.locator(selector).click();return readFile(await (await event).path());};
async function addPDF(page){await open(page);await page.locator('#reference-kind').selectOption('pdf');await page.locator('#reference-pdf').setInputFiles({name:'annual-census.pdf',mimeType:'application/pdf',buffer:pdf});await page.locator('#reference-title').fill('Annual census 2022');await page.locator('#reference-authors').fill('Census office');await page.locator('#reference-published').fill('2022');await page.locator('#reference-locator').fill('Table 4, page 27');await page.locator('#reference-notes').fill('Denominator for the population model.');await page.locator('#reference-save').click();await expect(page.locator('#evidence-status')).toContainText('Reference saved');}
test.beforeEach(async({page})=>{await page.goto('/?example=blank');const w=coverageExercise();w.exampleId='blank';await upload(page,Buffer.from(JSON.stringify(w)));await expect(page.locator('.react-flow__node[data-id="observations"]')).toBeVisible();});

test('input PDFs and processing URLs appear in run snapshots and parse as provenance with EYE',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await addPDF(page);
  await page.locator('#evidence-dialog').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'test-results/evidence-editor.png'});
  const source=(await refs(page))[0];assert.equal(source.sha256,hash);assert.equal(source.bytes,pdf.length);assert.equal(source.locator,'Table 4, page 27');
  assert.deepEqual(await download(page,'[data-download]'),pdf);await page.locator('#evidence-close').click();
  await open(page,'coverage');await expect(page.locator('#reference-role')).toHaveValue('method');
  await page.locator('#reference-title').fill('Boundary inclusion policy');await page.locator('#reference-url').fill('https://example.org/methods/coverage');await page.locator('#reference-notes').fill('Include points on the boundary.');await page.locator('#reference-save').click();await expect(page.locator('#evidence-status')).toContainText('Reference saved');await page.locator('#evidence-close').click();
  await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#n3-preview')).toContainText('REFERENCE PROVENANCE');await expect(page.locator('#n3-preview')).toContainText('Annual census 2022');
  const receipt=JSON.parse(await download(page,'#download-evidence'));assert.equal(receipt.evidence.length,2);assert.equal(receipt.attachments[0].sha256,hash);assert.equal(receipt.workflow.nodes.find(n=>n.id==='observations').references[0].sha256,hash);
  assert.deepEqual(Buffer.from(receipt.attachments[0].dataBase64,'base64'),pdf);assert.ok(receipt.receipts.every(r=>!r.input.includes('Boundary inclusion policy')));
  const ontology=await readFile('ontology/fieldwork.ttl','utf8');
  const quads=await page.evaluate(input=>new Promise((resolve,reject)=>{const worker=new Worker('./build/reasoning-worker.js');worker.onmessage=({data})=>{worker.terminate();data.error?reject(new Error(data.error)):resolve(data.quads);};worker.onerror=e=>{worker.terminate();reject(new Error(e.message));};worker.postMessage({id:1,input});}),ontology+'\n'+receipt.provenanceN3+'\n{ ?plan <http://purl.org/dc/terms/references> ?ref. } => { ?ref <urn:test:citationParsed> true. }.');
  assert.equal(quads.filter(q=>q.predicate==='urn:test:citationParsed').length,2);assert.deepEqual(errors,[]);
});

test('workflow bundles transfer PDF bytes to a fresh browser and retrieve them offline',async({page,browser,baseURL})=>{
  await addPDF(page);await page.locator('#evidence-close').click();const bytes=await download(page,'#export-button'),bundle=JSON.parse(bytes);
  assert.equal(bundle.schema,'fieldwork/bundle/1');assert.equal(bundle.attachments.length,1);
  const fresh=await browser.newContext({baseURL});
  try{const other=await fresh.newPage();await other.goto('/?example=blank');await expect(other.locator('#offline-status')).toContainText('Available offline');await upload(other,bytes);await expect(other.locator('.react-flow__node[data-id="observations"]')).toBeVisible();
    // Import must fit the newly measured graph before its nodes are selected.
    await expect.poll(()=>other.evaluate(()=>{const c=document.querySelector('#canvas').getBoundingClientRect();return [...document.querySelectorAll('.react-flow__node')].every(n=>{const b=n.getBoundingClientRect();return b.left>=c.left&&b.right<=c.right&&b.top>=c.top&&b.bottom<=c.bottom;});})).toBe(true);
    await open(other);await expect(other.locator('[data-file-status]')).toContainText('available on this device');assert.deepEqual(await download(other,'[data-download]'),pdf);await other.locator('#evidence-close').click();
    await fresh.setOffline(true);await other.reload();await expect(other.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});await open(other);await expect(other.locator('[data-file-status]')).toContainText('offline');assert.deepEqual(await download(other,'[data-download]'),pdf);
  }finally{await fresh.close();}
});

test('editing and removing references preserves old run evidence, and Undo restores local PDF access',async({page})=>{
  await addPDF(page);const original=(await refs(page))[0];await page.locator('#evidence-close').click();await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});await open(page);
  await page.locator('[data-edit-reference]').click();await page.locator('#reference-title').fill('Revised citation title');await page.locator('#reference-save').click();await expect(page.locator('#evidence-status')).toContainText('Reference saved');const edited=(await refs(page))[0];assert.equal(edited.id,original.id);assert.equal(edited.addedAt,original.addedAt);assert.equal(edited.sha256,original.sha256);assert.equal(edited.title,'Revised citation title');
  await page.locator('[data-remove-reference]').click();await expect(page.locator('#evidence-list')).toContainText('No references');assert.deepEqual(await refs(page),[]);await page.locator('#evidence-close').click();
  await page.locator('[data-view="rules"]').click();const oldRun=JSON.parse(await download(page,'#download-evidence'));assert.equal(oldRun.evidence[0].references[0].title,'Annual census 2022');assert.deepEqual(Buffer.from(oldRun.attachments[0].dataBase64,'base64'),pdf);
  await page.locator('[data-view="workflow"]').click();await page.locator('#undo-button').click();await open(page);await expect(page.locator('#evidence-list')).toContainText('Revised citation title');assert.deepEqual(await download(page,'[data-download]'),pdf);
});

test('invalid uploads, unsafe URLs and persistence failure leave an obvious recoverable draft',async({page})=>{
  await page.setViewportSize({width:620,height:680});await open(page);
  await page.locator('#reference-title').fill('Bad URL');await page.locator('#reference-url').fill('https://user:password@example.org');await page.locator('#reference-save').click();await expect(page.locator('#evidence-error')).toContainText('credentials');assert.deepEqual(await refs(page),[]);
  const errorBox=await page.locator('#evidence-error').boundingBox(),saveBox=await page.locator('#reference-save').boundingBox();assert.ok(errorBox.y>=0&&errorBox.y+errorBox.height<=680);assert.ok(saveBox.y>=0&&saveBox.y+saveBox.height<=680);
  await page.locator('#reference-kind').selectOption('pdf');await page.locator('#reference-pdf').setInputFiles({name:'fake.pdf',mimeType:'application/pdf',buffer:Buffer.from('not PDF')});await page.locator('#reference-save').click();await expect(page.locator('#evidence-error')).toContainText('PDF header');assert.deepEqual(await refs(page),[]);
  await page.locator('#reference-kind').selectOption('url');await page.locator('#reference-url').fill('https://example.org/source');
  await page.evaluate(()=>{window.originalEvidenceSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='fieldwork-workflow-v1')throw new DOMException('Quota','QuotaExceededError');return window.originalEvidenceSetItem.call(this,key,value);};});
  await page.locator('#reference-save').click();await expect(page.locator('#evidence-error')).toContainText('draft is still open');assert.deepEqual(await refs(page),[]);
  await page.evaluate(()=>Storage.prototype.setItem=window.originalEvidenceSetItem);await page.locator('#reference-save').click();await expect(page.locator('#evidence-status')).toContainText('Reference saved');assert.equal((await refs(page)).length,1);
  await page.locator('#reference-title').fill('Unsaved title');await page.locator('#evidence-close').click();await expect(page.locator('#reference-discard')).toBeVisible();await page.locator('#reference-discard-confirm').click();await expect(page.locator('#evidence-dialog')).not.toBeVisible();assert.equal((await refs(page)).length,1);
});

test('tampered bundles and incomplete reference-only imports preserve the current workflow',async({page,browser,baseURL})=>{
  await addPDF(page);await page.locator('#evidence-close').click();const bundle=JSON.parse(await download(page,'#export-button')),before=await saved(page);
  const changed=Buffer.from(bundle.attachments[0].dataBase64,'base64');changed[15]^=1;bundle.attachments[0].dataBase64=changed.toString('base64');await upload(page,Buffer.from(JSON.stringify(bundle)));await expect(page.locator('#toast')).toContainText('checksum');assert.deepEqual(await saved(page),before);
  const fresh=await browser.newContext({baseURL});try{const other=await fresh.newPage();await other.goto('/?example=blank');const original=await saved(other);await upload(other,Buffer.from(JSON.stringify(bundle.workflow)));await expect(other.locator('#toast')).toContainText('PDF unavailable');assert.deepEqual(await saved(other),original);}finally{await fresh.close();}
});
