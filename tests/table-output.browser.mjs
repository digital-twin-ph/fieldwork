import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const fixture=JSON.parse(await readFile(new URL('./fixtures/coverage-workflow-2026-10-05.json',import.meta.url),'utf8'));
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'table.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};
const select=async(page,id)=>{await page.locator('[data-view="workflow"]').click();await page.locator(`.react-flow__node[data-id="${id}"]`).click();};
const drag=async(page,from,to,port)=>{
  await page.locator('#fit-button').click();await page.waitForTimeout(300);
  const a=await page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`).boundingBox(),b=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
};
const receipt=async page=>{await page.locator('[data-view="rules"]').click();const next=page.waitForEvent('download');await page.locator('#download-evidence').click();return JSON.parse(await readFile(await (await next).path(),'utf8'));};

test('Table displays point attributes without a boundary, pages, searches, and reloads offline',async({page,context})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const w=structuredClone(fixture);w.nodes=w.nodes.filter(n=>n.type==='observations');w.edges=[];
  const source=w.nodes[0],sample=source.params.data.features[0];source.params.data.features=Array.from({length:105},(_,i)=>({...structuredClone(sample),id:`row${i}`,geometry:i===104?null:sample.geometry,properties:{...sample.properties,name:`Visit ${i}`,confirmed:false,count:0,...Object.fromEntries(Array.from({length:15},(_,n)=>[`field${n}`,n])),notes:i===104?'<script>needle104</script>':null}}));
  await page.goto('/?example=blank');await upload(page,w);await page.locator('[data-add="table_output"]').click();
  const tableId=(await saved(page)).nodes.find(n=>n.type==='table_output').id;
  await page.locator('#table-label').fill('Field visits table');await page.locator('#table-label').press('Tab');
  await expect(page.locator('#table-area')).toHaveCount(0);await drag(page,'observations',tableId,'points');await expect(page.locator('#table-points')).toHaveValue('observations');
  await page.locator('#add-point-input').click();await page.locator('#table-points_2').selectOption('second');await run(page);
  await page.getByRole('tab',{name:'Field visits table'}).click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(100);await expect(page.locator('#result-head')).toContainText('Longitude (°)');await expect(page.locator('#result-head')).not.toContainText('Review decision');
  await expect(page.locator('#point-table-controls')).toContainText('1–100 of 107 records');await page.getByRole('button',{name:'Next rows',exact:true}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(7);
  await page.locator('#result-search').fill('needle104');await expect(page.locator('#result-rows [data-place]')).toHaveCount(1);
  await expect(page.locator('#result-rows')).toContainText('Not supplied');
  await page.getByRole('button',{name:'Next attributes',exact:true}).click();await expect(page.locator('#result-head')).toContainText('notes');await expect(page.locator('#result-rows')).toContainText('<script>needle104</script>');await expect(page.locator('#result-rows script')).toHaveCount(0);
  await page.locator('#result-rows [data-place]').press('Enter');await expect(page.locator('#inspector-content')).toContainText('No coordinates supplied');await expect(page.locator('#inspector-content')).toContainText('false');
  const evidence=await receipt(page);assert.equal(evidence.outputs[0].rows.length,107);
  await expect(page.locator('#n3-preview')).toContainText('PRESENTATION NODE');
  const facts=evidence.receipts.find(r=>r.nodeId===tableId).facts;
  // Parse the actual Table facts and ontology with EYE, without changing the workflow's semantics.
  const ontology=await readFile(new URL('../ontology/fieldwork.ttl',import.meta.url),'utf8');
  const quads=await page.evaluate(input=>new Promise((resolve,reject)=>{const worker=new Worker('./build/reasoning-worker.js');const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Table RDF validation timed out'));},45000);worker.onmessage=({data})=>{clearTimeout(timeout);worker.terminate();data.error?reject(new Error(data.error)):resolve(data.quads);};worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(new Error(e.message));};worker.postMessage({id:1,input});}),ontology+'\n'+facts+'\n{ ?v a <urn:fieldwork:TableView>. } => { ?v <urn:fieldwork:tableFactsParsed> true. }.');
  assert.ok(quads.some(q=>q.predicate==='urn:fieldwork:tableFactsParsed'));
  await expect(page.locator('#offline-status')).toContainText('Available offline');const before=await saved(page);await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});assert.deepEqual(await saved(page),before);
  await page.getByRole('tab',{name:'Field visits table'}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(100);
  await page.screenshot({path:'test-results/point-table-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/point-table-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
});

test('Table accepts coverage by drag, preserves decisions, and does not double-count review alerts',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?example=blank');await upload(page,fixture);await page.locator('[data-add="table_output"]').click();
  const tableId=(await saved(page)).nodes.find(n=>n.type==='table_output').id;
  await page.locator('#table-points').selectOption('observations');await drag(page,'coverage',tableId,'coverage');await expect(page.locator('#table-coverage')).toHaveValue('coverage');
  assert.deepEqual((await saved(page)).edges.filter(e=>e.to===tableId).map(e=>e.port),['coverage']);
  await page.locator('#undo-button').click();await expect(page.locator('#table-points')).toHaveValue('observations');await drag(page,'coverage',tableId,'coverage');await run(page);
  await page.getByRole('tab',{name:/Point table$/}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(6);
  await expect(page.locator('#result-head')).toContainText('Review decision');await expect(page.locator('#result-head')).toContainText('household_size');
  await expect(page.locator('#coverage-alert')).toContainText('2 records');
  await page.locator('#result-search').fill('Confirmed synthetic coordinate error');await expect(page.locator('#result-rows [data-place]')).toHaveCount(1);
  await page.locator('#result-rows [data-place]').click();await expect(page.locator('#inspector-content')).toContainText('Point attributes');await expect(page.locator('#inspector-content')).toContainText('Outside example');await page.locator('#coverage-restore').click();await run(page);await expect(page.locator('#coverage-alert')).toContainText('3 records');
  await page.getByRole('tab',{name:/Point table$/}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(6);
  const download=page.waitForEvent('download');await page.locator('#export-button').click();const bytes=await readFile(await (await download).path());
  await page.locator('#new-workflow').click();await page.locator('#workflow-file').setInputFiles({name:'table-roundtrip.json',mimeType:'application/json',buffer:bytes});await run(page);
  await page.getByRole('tab',{name:/Point table$/}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(6);
  const evidence=await receipt(page),table=evidence.outputs.find(o=>o.nodeId===tableId);assert.equal(table.excludedCount,0);assert.equal(table.reviewCount,3);assert.ok(table.measurement.squareMetres>0);
  assert.deepEqual(errors,[]);
});
