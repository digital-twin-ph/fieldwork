import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/coverage-workflow-2026-10-05.json',import.meta.url),'utf8'));
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'table.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};
const select=async(page,id)=>{await page.locator('[data-view="workflow"]').click();await page.locator(`.react-flow__node[data-id="${id}"]`).click();};
const drag=async(page,from,to,port)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#fit-button').click();await page.waitForTimeout(300);
  const a=await page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`).boundingBox(),b=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
};
const receipt=async page=>{await page.locator('[data-view="rules"]').click();const next=page.waitForEvent('download');await page.locator('#download-evidence').click();return JSON.parse(await readFile(await (await next).path(),'utf8'));};

test('Table displays point attributes without a boundary, pages, searches, and reloads offline',async({page,context})=>{
  const errors=collectPageErrors(page);
  // The fixture was saved before `observations` was renamed to `point_input`, and keeps its own
  // value: it is the frozen record the rename adapter exists for. The application migrates it on
  // load; this line reads the file, so it reads the name the file contains.
  const w=structuredClone(fixture);w.nodes=w.nodes.filter(n=>n.type==='observations');w.edges=[];
  const source=w.nodes[0],sample=source.params.data.features[0];source.params.data.features=Array.from({length:105},(_,i)=>({...structuredClone(sample),id:`row${i}`,geometry:i===104?null:sample.geometry,properties:{...sample.properties,name:`Visit ${i}`,confirmed:false,count:0,...Object.fromEntries(Array.from({length:15},(_,n)=>[`field${n}`,n])),notes:i===104?'<script>needle104</script>':null}}));
  await page.goto('/?example=blank');await upload(page,w);await page.locator('[data-add="table_output"]').click();
  const tableId=(await saved(page)).nodes.find(n=>n.type==='table_output').id;
  await page.locator('#table-label').fill('Field visits table');await page.locator('#table-label').press('Tab');
  await expect(page.locator('#table-area')).toHaveCount(0);await drag(page,'observations',tableId,'points');await expect(page.locator('#table-points')).toHaveValue('observations');
  await page.locator('#add-point-input').click();await page.locator('#table-points_2').selectOption('second');await run(page);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Field visits table'}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(100);await expect(page.locator('#result-head')).toContainText('Longitude (°)');await expect(page.locator('#result-head')).not.toContainText('Review decision');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#point-table-controls')).toContainText('1–100 of 107 records');await page.getByRole('button',{name:'Next rows',exact:true}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(7);
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-search').fill('needle104');await expect(page.locator('#result-rows [data-place]')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  // An absent cell reads as absent since 2026-10-21, not as the words "Not supplied": it is not
  // a value, so it does not sort as one and the row filter does not match it.
  await expect(page.locator('#result-rows')).not.toContainText('Not supplied');
  await expect(page.locator('#result-rows td[data-absent]').first()).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('button',{name:'Next attributes',exact:true}).click();await expect(page.locator('#result-head')).toContainText('notes');await expect(page.locator('#result-rows')).toContainText('<script>needle104</script>');await expect(page.locator('#result-rows script')).toHaveCount(0);
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-rows [data-place]').press('Enter');await expect(page.locator('#inspector-content')).toContainText('No coordinates supplied');await expect(page.locator('#inspector-content')).toContainText('false');
  const evidence=await receipt(page);assert.equal(evidence.outputs[0].rows.length,107);
  await expect(page.locator('#n3-preview')).toContainText('PRESENTATION NODE');
  const facts=evidence.receipts.find(r=>r.nodeId===tableId).facts;
  // Parse the actual Table facts and ontology with EYE, without changing the workflow's semantics.
  const ontology=await readFile(new URL('../ontology/fieldwork.ttl',import.meta.url),'utf8');
  const quads=await page.evaluate(input=>new Promise((resolve,reject)=>{const worker=new Worker('./build/reasoning-worker.js');const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Table RDF validation timed out'));},45000);worker.onmessage=({data})=>{clearTimeout(timeout);worker.terminate();data.error?reject(new Error(data.error)):resolve(data.quads);};worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(new Error(e.message));};worker.postMessage({id:1,input});}),ontology+'\n'+facts+'\n{ ?v a <urn:fieldwork:TableView>. } => { ?v <urn:fieldwork:tableFactsParsed> true. }.');
  assert.ok(quads.some(q=>q.predicate==='urn:fieldwork:tableFactsParsed'));
  await expect(page.locator('#offline-status')).toContainText('Available offline');const before=await saved(page);await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});assert.deepEqual(await saved(page),before);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Field visits table'}).click();await expect(page.locator('#result-rows [data-place]')).toHaveCount(100);
  await page.screenshot({path:'test-results/point-table-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/point-table-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
});

test('a table takes point layers directly, searches them and survives a round trip',async({page})=>{
  // Until 2026-10-21 this test dragged a `coverage_check` into the table's `coverage` port and
  // checked that review decisions and exclusion reasons came through. That widget is retired and
  // the port is gone; a table takes point layers like everything else. The round trip, the search
  // and the attribute columns were never about the check and are what remains under test.
  const errors=collectPageErrors(page);
  const w=structuredClone(fixture);
  w.edges=w.edges.filter(e=>e.port!=='points_2');
  w.nodes=w.nodes.filter(n=>n.id!=='second');
  delete w.nodes.find(n=>n.id==='coverage').params.pointInputCount;
  await page.goto('/?example=blank');await upload(page,w);await page.locator('[data-add="table_output"]').click();
  const tableId=(await saved(page)).nodes.find(n=>n.type==='table_output').id;
  await page.locator('#table-points').selectOption('observations');
  assert.deepEqual((await saved(page)).edges.filter(e=>e.to===tableId).map(e=>e.port),['points']);
  await run(page);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:/Point table$/}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(4);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-head')).toContainText('household_size');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-search').fill('Outside example');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-rows [data-place]').click();
  await expect(page.locator('#inspector-content')).toContainText('Attributes as the source gave them');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:/Point table$/}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(4);
  const download=page.waitForEvent('download');await page.locator('#backup-button').click();await page.locator('#export-button').click();
  const bytes=await readFile(await (await download).path());
  await page.locator('#new-workflow').click();
  await page.locator('#workflow-file').setInputFiles({name:'table-roundtrip.json',mimeType:'application/json',buffer:bytes});
  await run(page);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:/Point table$/}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(4);
  assert.deepEqual(errors,[]);
});

/** Ranking a result table, which until 2026-10-17 nothing in this application could do.
 *
 *  `snap_to_network` had claimed since 2026-10-14 that its displacement was "a point attribute a
 *  practitioner can map, sort and argue with", and the practitioner's decomposition of "which
 *  clinic is furthest from a road" showed the sort was never built. This is the click that
 *  answers it, and the assertion that an unmeasured record does not win. */
test('A result table ranks by a column, and a record with no value never answers "farthest"',async({page})=>{
  const errors=collectPageErrors(page);
  const w=structuredClone(fixture);w.nodes=w.nodes.filter(n=>n.type==='observations');w.edges=[];
  const source=w.nodes[0],sample=source.params.data.features[0];
  const metres=[120,7,45,null,1000];
  source.params.data.features=metres.map((m,i)=>({...structuredClone(sample),id:`clinic${i}`,
    properties:{...sample.properties,name:`Clinic ${i}`,metresToRoad:m}}));
  await page.goto('/?example=blank');await upload(page,w);await page.locator('[data-add="table_output"]').click();
  const tableId=(await saved(page)).nodes.find(n=>n.type==='table_output').id;
  await drag(page,'observations',tableId,'points');await run(page);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Point table'}).click();
  await page.locator('[data-view="results"]').click();
  const names=()=>page.locator('#result-rows [data-place] td:nth-child(3)').allTextContents();
  assert.deepEqual(await names(),['Clinic 0','Clinic 1','Clinic 2','Clinic 3','Clinic 4'],'unsorted is input order');

  await page.locator('[data-view="results"]').click();
  const header=page.locator('#result-head button[data-table-sort="attribute:metresToRoad"]');
  await header.click();                                      // ascending: nearest the road first
  assert.deepEqual(await names(),['Clinic 1','Clinic 2','Clinic 0','Clinic 4','Clinic 3']);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-head th[aria-sort="ascending"]')).toHaveCount(1);

  await header.click();                                      // descending: the question asked
  assert.deepEqual(await names(),['Clinic 4','Clinic 0','Clinic 2','Clinic 1','Clinic 3'],
    'Clinic 3 was never measured and must stay last in both directions');
  await expect(page.locator('#point-table-controls')).toContainText('Ordered by metresToRoad, highest first');
  await expect(page.locator('#point-table-controls')).toContainText('1 record with no value for this column held at the end');
  assert.deepEqual(errors,[]);
});
