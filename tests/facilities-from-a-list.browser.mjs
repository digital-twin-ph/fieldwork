import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** FIND HEALTH FACILITIES FROM A LIST (experiment 190). The practitioner, 2026-11-08: *"We planned for find health
 *  facilities to take a list and either geocode it or match it with OSM's."* Six names of Sierra Leone's line list,
 *  one per outcome, against GRID3's register (CC BY 4.0), which this test answers from its fixture by the service's own
 *  query, so nothing is downloaded. */
test.use({serviceWorkers:'block'});
const fixture=JSON.parse(readFileSync(new URL('fixtures/grid3-sle-facilities.json',import.meta.url),'utf8'));
const names=['Koya Town CHC','Hangah CHC','Sanya MCHP','Arab (Makeni City) Clinic','Yoni Mabanta Communities','Nowhere Special CHP'];
const rows=names.map(n=>({key:{facility:n},value:1}));
const data={kind:'data-table',keys:['facility'],valueField:'cases',rows,rowCount:rows.length,missingValueCount:0};
const workflow={schema:'fieldwork/workflow/1',name:'Cases by facility',exampleId:'blank',nodes:[
  {id:'t',type:'table_input',x:40,y:40,params:{label:'Line list',keys:['facility'],valueField:'cases',data}},
  {id:'hf',type:'find_health_facilities',x:340,y:40,params:{label:'Find health facilities',source:'openstreetmap-live',
    kinds:['hospital','clinic'],requireName:true,country:'',minConfidence:0.7,data:null,retrieved:null}},
  {id:'o',type:'table_output',x:640,y:40,params:{label:'Facilities found',inputMode:'spatial'}}],
  edges:[{id:'e2',from:'hf',to:'o',port:'points'}]};

test('a list of names finds its facilities in a register, every row marked, the ambiguous ones decided',async({page})=>{
  const errors=collectPageErrors(page);
  let queries=0;
  await page.route(/services3\.arcgis\.com\/.*sle_htlfac_grid3_v01\/FeatureServer\/0\/query/,route=>{queries++;
    route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({features:fixture.records.map(attributes=>({attributes})),exceededTransferLimit:false})});});
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('.react-flow__node[data-id="hf"]').click();
  // FROM A LIST: the way in is a setting, and the input follows it.
  await page.locator('#configure-step').click();
  const dialog=page.locator('#facilities-config');
  await dialog.locator('#hf-mode').selectOption('list');
  await dialog.locator('#config-apply').click();
  await page.locator('#connect-list').selectOption('t');
  await page.locator('#configure-step').click();
  await dialog.locator('#hf-name-column').selectOption('facility');
  await dialog.locator('[data-hf-register="urn:fieldwork:Grid3SierraLeoneHealthFacilitiesV1"]').check();
  await expect(dialog.locator('[data-hf-register="urn:fieldwork:Grid3ZambiaHealthFacilitiesV01Beta"]')).toBeDisabled();
  await dialog.locator('#config-apply').click();
  await expect(page.locator('.inspector .standard-sentence')).toContainText('in GRID3 SLE - Health Facilities v1.0');
  // The register, fetched once, kept on the step.
  await page.locator('#hf-fetch-registers').click();
  await expect(page.locator('#toast')).toContainText('1,616 facilities from GRID3 SLE - Health Facilities v1.0');
  expect(queries).toBe(1);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="hf"]').click();
  await expect(page.locator('[data-standard-section="result"]')).toContainText('Matched 6 rows by facility');
  // THE PREVIEW counts every outcome; the ambiguous name and the type that differs wait for a decision.
  await page.locator('#configure-step').click();
  const preview=dialog.locator('[data-config-section="preview"]');
  for(const [outcome,n] of [['matched exactly',1],['matched allowing for spelling',1],['type differs',1],['ambiguous',1],['an area, not a facility',1],['not found',1]])
    await expect(preview.locator('tr').filter({hasText:outcome})).toContainText(String(n));
  const arab=dialog.locator('[data-hf-decide="Arab (Makeni City) Clinic"]');
  await expect(arab.locator('option')).toHaveCount(5);
  await arab.selectOption({index:2});
  await dialog.screenshot({path:'test-results/facilities-list.png'});
  await dialog.locator('#config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  // Exact, spelling and the decided name are points; the rest are counted, not dropped.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='hf').params.list.decisions);
  expect(Object.keys(saved)).toEqual(['Arab (Makeni City) Clinic']);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('Koya Town CHC');
  await expect(page.locator('main').first()).toContainText('by the practitioner');
  expect(errors).toEqual([]);
});

/** OPENSTREETMAP AFTER GRID3 (0.61.0): the any-country register from the Humanitarian OpenStreetMap Team's country
 *  export (ODbL), answered from a zip of its fixture, so nothing is downloaded. Its country starts as GRID3's; its exact
 *  name is a point, its spelling is held for review until chosen. */
test('OpenStreetMap after GRID3: the country is the register\'s, an exact name is a point, a spelling is held for review',async({page})=>{
  const errors=collectPageErrors(page);
  const {ZipWriter,BlobWriter,TextReader}=await import('@zip.js/zip.js');
  const writer=new ZipWriter(new BlobWriter('application/zip'));
  await writer.add('hotosm_sle_health_facilities_points_geojson.geojson',
    new TextReader(readFileSync(new URL('fixtures/osm-sle-health-facilities.json',import.meta.url),'utf8')));
  const zip=Buffer.from(await (await writer.close()).arrayBuffer());
  const asked=[];
  await page.route(/services3\.arcgis\.com\/.*sle_htlfac_grid3_v01\/FeatureServer\/0\/query/,route=>
    route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({features:fixture.records.map(attributes=>({attributes})),exceededTransferLimit:false})}));
  await page.route(/production-raw-data-api\/ISO3\/[A-Z]{3}\/health_facilities/,route=>{asked.push(route.request().url());
    route.fulfill({status:200,contentType:'application/zip',headers:{'access-control-allow-origin':'*'},body:zip});});
  const three=['Koya Town CHC','Magbenteh Community Hospital','Asheha Clinic'].map(n=>({key:{facility:n},value:1}));
  const w=structuredClone(workflow);
  w.nodes[0].params.data={...data,rows:three,rowCount:3};
  w.nodes[1].params={...w.nodes[1].params,mode:'list',list:{nameColumn:'facility',registers:['urn:fieldwork:Grid3SierraLeoneHealthFacilitiesV1'],
    threshold:0.88,areaMarkers:['Communities'],decisions:{}}};
  w.edges.push({id:'e1',from:'t',to:'hf',port:'list'});
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('.react-flow__node[data-id="hf"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#facilities-config');
  await dialog.locator('[data-hf-register="urn:fieldwork:OpenStreetMapHealthFacilitiesCountryExport"]').check();
  await expect(dialog.locator('#hf-list-country')).toHaveValue('SLE');
  await expect(dialog).toContainText('matched by name only');
  await dialog.locator('#config-apply').click();
  await expect(page.locator('.inspector .standard-sentence')).toContainText('then OpenStreetMap health facilities (HDX country export) for SLE');
  await page.locator('#hf-fetch-registers').click();
  await expect(page.locator('#toast')).toContainText('375 facilities from OpenStreetMap health facilities (HDX country export), SLE');
  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain('/ISO3/SLE/');
  await expect(page.locator('[data-standard-section="result"]')).toContainText('© OpenStreetMap contributors');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="hf"]').click();
  const result=page.locator('[data-standard-section="result"]');
  await expect(result).toContainText('Matched 3 rows by facility');
  await page.locator('#configure-step').click();
  await expect(dialog.locator('[data-config-section="preview"]')).toContainText('1 name was matched allowing for spelling by a register with no facility types');
  const held=dialog.locator('[data-hf-decide="Asheha Clinic"]');
  await expect(held.locator('option').nth(2)).toContainText('Asheeha clinic');
  await dialog.screenshot({path:'test-results/facilities-osm.png'});
  await dialog.locator('#config-cancel').click();
  const points=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));return r.nodes.find(n=>n.id==='hf').params.registerRetrieved.registers.map(x=>[x.title,x.country??'']);});
  expect(points).toEqual([['GRID3 SLE - Health Facilities v1.0',''],['OpenStreetMap health facilities (HDX country export), SLE','SLE']]);
  expect(errors).toEqual([]);
});
