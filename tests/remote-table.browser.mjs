import {test,expect} from '@playwright/test';
import {zipSync,strToU8} from 'fflate';
import {collectPageErrors} from './page-errors.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

// A TABLE FETCHED FROM WHERE IT IS PUBLISHED, and fetched again where the project arrives without its rows.
// Experiment 170. The archive is served here; nothing reaches the network.
test.use({serviceWorkers:'block'});
const csv='date,count,o3\n2016-01-01,31,20.5\n2016-01-02,28,22\n';
const archive=content=>Buffer.from(zipSync({'pkg/README.md':strToU8('read me'),'pkg/Data/master.csv':strToU8(content)}));
const URL='https://data.example.test/pkg.zip';
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').params);

test('fetched from a zip, kept as a spec, fetched again by digest, and refused when the file has changed',async({page})=>{
  const errors=collectPageErrors(page);
  // ONE ARCHIVE, built once: a zip records when it was made, so building it again gives another digest.
  const original=archive(csv);
  let served=original;
  await page.route(URL,route=>route.fulfill({status:200,body:served,headers:{'access-control-allow-origin':'*'}}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#open-table').click();
  await page.locator('#table-remote summary').click();
  await page.locator('#table-url').fill(URL);
  await page.locator('#table-fetch').click();
  await expect(page.locator('#table-entry')).toBeVisible();
  await page.locator('#table-entry').selectOption('pkg/Data/master.csv');
  await expect(page.locator('#table-keys')).toBeVisible();
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('count');
  for(const name of ['date','count','o3'])await page.locator(`#table-keys input[value="${name}"]`).setChecked(name==='date');
  await page.locator('#table-save').click();
  await expect.poll(async()=>(await stored(page)).remote?.entry).toBe('pkg/Data/master.csv');
  const params=await stored(page);
  expect(params.data.rows.length).toBe(2);
  expect(params.remote.url).toBe(URL);
  expect(params.remote.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(params.remote.archiveSha256).toMatch(/^[0-9a-f]{64}$/);
  await expect(page.locator('[data-table-remote]')).toContainText('not the rows');

  // THE WORKFLOW AS IT LEAVES THE DEVICE: exported, it carries the spec and no rows.
  const node=await stored(page);
  const download=page.waitForEvent('download');
  await page.locator('#backup-button').click();
  await page.locator('#export-button').click();
  const file=await (await download).path();
  const exported=JSON.parse(gunzipSync(readFileSync(file)).toString());
  const sent=(exported.workflow??exported).nodes.find(n=>n.type==='table_input').params;
  expect(sent.data.rows).toEqual([]);
  expect(sent.remote.sha256).toBe(node.remote.sha256);

  // AND ARRIVES ON ANOTHER: imported into a fresh workspace, it says its rows are not kept. Another device holds no copy
  // of the file either, so the byte store is emptied too: a cleared localStorage alone left the copy in IndexedDB.
  await page.evaluate(()=>new Promise(resolve=>{const tx=indexedDB.open('fieldwork-evidence-v1');
    tx.onsuccess=()=>{const db=tx.result,clear=db.transaction('pdfs','readwrite');clear.objectStore('pdfs').clear();
      clear.oncomplete=()=>{db.close();resolve();};};}));
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(file);
  await page.locator('[data-view="workflow"]').click();
  const tableId=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${tableId}"]`).click();
  await expect(page.locator('[data-table-remote]')).toContainText('Its rows are not kept in the project');

  // A CHANGED FILE IS REFUSED, and nothing is read.
  served=archive(csv.replace('31','99'));
  await page.locator('#table-fetch-remote').click();
  await expect(page.locator('#table-fetch-status')).toContainText('is not the one this table was read from');
  expect((await stored(page)).data.rows.length).toBe(0);

  // THE SAME FILE IS READ, with the settings it was first read with.
  served=original;
  await page.locator('#table-fetch-remote').click();
  await expect.poll(async()=>(await stored(page)).data.rows.length).toBe(2);
  expect((await stored(page)).data.rows.map(r=>[r.key.date,r.value])).toEqual([['2016-01-01',31],['2016-01-02',28]]);
  expect(node.remote.sha256).toBe((await stored(page)).remote.sha256);

  // AND NOW THE DEVICE HAS IT: fetched again, it is read from the device's copy, checked by digest, with the source
  // serving something else entirely. One download per file, not one per workflow (2026-11-04).
  // The same export opened again, as another project on this device would: its rows are not kept, the device's copy is.
  served=archive(csv.replace('31','77'));
  let requests=0;page.on('request',request=>{if(request.url()===URL)requests++;});
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(file);
  await page.locator('[data-view="workflow"]').click();
  const reopened=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${reopened}"]`).click();
  await page.locator('#table-fetch-remote').click();
  await expect.poll(async()=>(await stored(page)).data.rows.map(r=>r.value)).toEqual([31,28]);
  expect(requests,'requests to the source').toBe(0);
  expect(errors).toEqual([]);
});
