import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

const AREA={type:'Polygon',coordinates:[[[120.95,14.55],[121.00,14.55],[121.00,14.60],[120.95,14.60],[120.95,14.55]]]};
const workflow=()=>({schema:'fieldwork/workflow/1',id:'facilities-trial',name:'Facility retrieval trial',
  exampleId:'blank',
  nodes:[{id:'area',type:'study_area',x:40,y:40,
      params:{label:'Study area',source:'drawn',selectionMode:'polygon',geometry:AREA}},
    {id:'hf',type:'find_health_facilities',x:320,y:40,
      params:{label:'Find health facilities',source:'openstreetmap-live',kinds:['hospital','clinic'],
        requireName:true,country:'PHL',minConfidence:0.7,data:null,retrieved:null}},
    {id:'map',type:'map_output',x:600,y:40,params:{label:'Facilities',inputMode:'spatial'}}],
  edges:[{id:'e1',from:'area',to:'hf',port:'area'},{id:'e2',from:'area',to:'map',port:'area'},
    {id:'e3',from:'hf',to:'map',port:'points'}]});

const OVERPASS_REPLY={elements:[
  {type:'node',id:11,lat:14.57,lon:120.98,tags:{name:'Ospital ng Maynila',amenity:'hospital'}},
  {type:'node',id:12,lat:14.58,lon:120.99,tags:{name:'Sampaloc Health Center',healthcare:'clinic'}},
  {type:'node',id:13,lat:14.56,lon:120.97,tags:{name:'Mercury Drug',amenity:'pharmacy'}},
  {type:'node',id:14,lat:14.59,lon:120.96,tags:{amenity:'hospital'}}]};

const load=async page=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'facilities.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow()))});
  await expect(page.locator('.react-flow__node[data-id="hf"]')).toBeVisible();
};

test('the node is a source of points and admits it holds none',async({page})=>{
  await load(page);
  const node=page.locator('.react-flow__node[data-id="hf"]');
  await expect(node.locator('[data-handleid="out"]')).toHaveCount(1);
  await node.click();
  await expect(page.locator('#inspector-content')).toContainText(/Holds no facilities until you retrieve/);
  // Both sources must be offered, and the licence must be reachable before anything is downloaded.
  await expect(page.locator('#hf-source option')).toHaveCount(3);
  await expect(page.locator('#inspector-content a[href="https://opendatacommons.org/licenses/odbl/1-0/"]')).toHaveCount(1);
  await expect(page.locator('#inspector-content')).toContainText(/not the facilities that exist/);
});

test('the country code field appears only for the source that needs one',async({page})=>{
  await load(page);
  await page.locator('.react-flow__node[data-id="hf"]').click();
  await expect(page.locator('#hf-country')).toHaveCount(0);
  await page.locator('#hf-source').selectOption('hdx-hot-export');
  await expect(page.locator('#hf-country')).toHaveValue('PHL');
  await expect(page.locator('#inspector-content')).toContainText(/Humanitarian Data Exchange/);
});

test('Overture offers a confidence threshold and states its own, different licence',async({page})=>{
  await load(page);
  await page.locator('.react-flow__node[data-id="hf"]').click();
  await expect(page.locator('#hf-source option')).toHaveCount(3);
  await expect(page.locator('#hf-confidence')).toHaveCount(0,
    {message:'the threshold belongs to the one source that states a confidence'});

  await page.locator('#hf-source').selectOption('overture-places');
  await expect(page.locator('#hf-confidence')).toHaveValue('0.7');
  await expect(page.locator('#hf-country')).toHaveCount(0,'no country is needed, the area is the scope');
  // A different licence, and not share-alike: the interface must not imply ODbL here.
  await expect(page.locator('#inspector-content a[href="https://cdla.dev/permissive-2-0/"]')).toHaveCount(1);
  await expect(page.locator('#inspector-content a[href="https://opendatacommons.org/licenses/odbl/1-0/"]')).toHaveCount(0);
  await expect(page.locator('#inspector-content')).toContainText(/broader than a facility register/);

  const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')));
  assert.equal(saved.nodes.find(n=>n.id==='hf').params.source,'overture-places');
});

// Mocking Overpass needs request interception, which a controlling service worker hides from the
// harness in WebKit. Blocking it keeps this test running in both engines rather than passing
// vacuously in one. See docs/experiments/70-webkit-parity.md.
test.describe('retrieval',()=>{
  test.use({serviceWorkers:'block'});

  test('retrieving stores the facilities, states what it dropped, and feeds the map',async({page})=>{
    let asked=0,body='';
    await page.route('https://overpass-api.de/api/interpreter',async route=>{
      asked++;body=route.request().postData()||'';
      await route.fulfill({json:OVERPASS_REPLY});
    });
    await load(page);
    await page.locator('.react-flow__node[data-id="hf"]').click();
    assert.equal(asked,0,'nothing is requested until the practitioner asks for it');

    await page.locator('#hf-retrieve').click();
    await expect(page.locator('#inspector-content')).toContainText(/2 facilities/,{timeout:20000});
    assert.equal(asked,1);
    // The study area bounds the query, in Overpass's own south,west,north,east order.
    assert.match(decodeURIComponent(body),/14\.550000,120\.950000,14\.600000,121\.000000/);
    await expect(page.locator('#inspector-content')).toContainText(/Dropped 1 of an unrequested kind/);
    await expect(page.locator('#inspector-content')).toContainText(/1 without a name/);
    await expect(page.locator('#inspector-content')).toContainText(/OpenStreetMap contributors/);

    // Stored in the workflow, which is what makes the later run independent of the network.
    const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')));
    const stored=saved.nodes.find(n=>n.id==='hf');
    assert.equal(stored.params.data.features.length,2);
    assert.equal(stored.params.retrieved.source,'openstreetmap-live');
    assert.equal(stored.params.retrieved.licence,'ODbL-1.0');

    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
    await expect(page.locator('#map [data-place]')).toHaveCount(2,
      {message:'both retained facilities reach the map as places'});
  });

  test('a refusal leaves the node as it was, with the reason shown',async({page})=>{
    await page.route('https://overpass-api.de/api/interpreter',route=>
      route.fulfill({status:429,headers:{'retry-after':'1'},body:'Rate limited'}));
    await load(page);
    await page.locator('.react-flow__node[data-id="hf"]').click();
    await page.locator('#hf-retrieve').click();
    await expect(page.locator('#hf-status')).toContainText(/busy \(HTTP 429\)/,{timeout:20000});
    await expect(page.locator('#inspector-content')).toContainText(/Holds no facilities until you retrieve/);
    await expect(page.locator('#hf-retrieve')).toBeEnabled();
  });
});

// Deliberately outside the service-worker-blocking group. The offline replay depends on the
// service worker serving the application shell and its workers from cache, so blocking it to gain
// request interception would remove the very thing under test. Nothing needs mocking here: the
// facilities are already stored, which is the state this is about.
test('a stored retrieval replays with the network off, and asks no source for anything',async({page,context})=>{
  const stored=workflow();
  const target=stored.nodes.find(n=>n.id==='hf');
  target.params.data={type:'FeatureCollection',features:[
    {type:'Feature',id:'node-11',properties:{name:'Ospital ng Maynila',kind:'hospital'},
     geometry:{type:'Point',coordinates:[120.98,14.57]}},
    {type:'Feature',id:'node-12',properties:{name:'Sampaloc Health Center',kind:'clinic'},
     geometry:{type:'Point',coordinates:[120.99,14.58]}}]};
  target.params.retrieved={source:'openstreetmap-live',sourceLabel:'OpenStreetMap, live query',
    licence:'ODbL-1.0',attribution:'\u00a9 OpenStreetMap contributors, Open Database License (ODbL) 1.0',
    origin:'https://overpass-api.de',kept:2,dropped:{kind:1,coordinates:0,name:1},
    at:'2026-10-09T00:00:00.000Z',scope:'study area'};

  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'stored.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(stored))});
  await expect(page.locator('.react-flow__node[data-id="hf"]')).toBeVisible();
  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:60000});

  const reached=[];
  page.on('request',request=>{
    if(/overpass-api\.de|amazonaws\.com|healthsites/.test(request.url()))reached.push(request.url());
  });
  await context.setOffline(true);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(page.locator('#map [data-place]')).toHaveCount(2);
  assert.deepEqual(reached,[],'the run used stored facilities and reached no source');

  // And the receipt still carries the licence, because a shareable record of an offline run must
  // state the obligations that came with the data.
  await page.locator('.react-flow__node[data-id="hf"]').click();
  await expect(page.locator('#inspector-content')).toContainText(/2 facilities/);
});
