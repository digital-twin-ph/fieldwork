import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {payload} from './payload-store.mjs';

const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
  .nodes.find(n=>n.type==='network_input').params.dataRef);

// The cap this exists to measure: a package could carry 5 MB, set when a workflow could not hold
// much more, and a town-sized street network is several times that. The practitioner, 2026-10-20:
// "we are setting caps that have not met reality yet and this is a DE project to test the limits
// of browser based field operations."
//
// So this carries a graph LARGER THAN THE WHOLE OLD CAP through the encrypted round trip, on a
// real browser, and prints what it cost. The numbers in the source comments come from here.
test.use({serviceWorkers:'block'});
test.describe.configure({timeout:300_000});
const password='test-only long passphrase for a large project';
const NODES=40000;

test('a project holding a graph larger than the old 5 MB cap packages, opens and survives a reload',async({page,browser})=>{
  const elements=[];
  for(let i=0;i<NODES;i++)elements.push({type:'node',id:i+1,lon:-0.14+i*0.000002,lat:51.5134+i*0.0000005});
  for(let i=1;i<NODES;i++)elements.push({type:'way',id:1000000+i,nodes:[i,i+1],tags:{highway:'residential'}});
  const body=JSON.stringify({version:0.6,elements});

  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.route(/^https:\/\//,route=>route.abort());
  for(const host of ['overpass-api.de','overpass.kumi.systems','overpass.private.coffee'])
    await page.route(`https://${host}/api/status`,route=>
      route.fulfill({body:'Rate limit: 2\n2 slots available now.\n',contentType:'text/plain'}));
  await page.route('https://overpass-api.de/api/interpreter',route=>
    (route.request().postData()||'').includes('node%281%29')
      ?route.fulfill({json:{version:0.6,elements:[]}})
      :route.fulfill({body,contentType:'application/json'}));

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  await page.locator('#network-input-method').selectOption('osm');
  await page.locator('#download-network').click();
  await expect(page.locator('#inspector-content')).toContainText(`${NODES} nodes`,{timeout:120000});

  const started=Date.now();
  const pending=page.waitForEvent('download');
  await page.locator('#encrypted-export').click();
  await page.locator('#package-password').fill(password);
  await page.locator('#package-confirm').fill(password);
  await page.locator('#package-submit').click();
  const zip=await readFile(await (await pending).path());
  const exportMs=Date.now()-started;
  // Measured 2026-10-20 in Chromium: an 8.17 MB package written in 2.4 s, and opened, verified
  // and saved on a clean device in 1.5 s. The old cap refused this at 5 MB.
  console.log(`MEASURED export: ${(zip.length/1e6).toFixed(2)} MB package in ${(exportMs/1000).toFixed(1)} s`);
  assert.ok(zip.length>5_000_000,`the package is ${zip.length} bytes, which must exceed the cap this replaces`);

  const fresh=await browser.newContext({viewport:{width:1280,height:900}});
  const target=await fresh.newPage();
  try{
    await target.goto('http://127.0.0.1:4174/?example=blank');
    await expect(target.locator('#workflow-state')).toBeVisible({timeout:45000});
    const opened=Date.now();
    await target.locator('#workflow-file').setInputFiles({name:'project.zip',mimeType:'application/zip',buffer:zip});
    await target.locator('#package-password').fill(password);
    await target.locator('#package-submit').click();
    await expect(target.locator('#package-dialog')).toHaveCount(0,{timeout:180000});
    console.log(`MEASURED import: ${((Date.now()-opened)/1000).toFixed(1)} s to decrypt, verify and save`);

    // Read the state rather than clicking the canvas: forty thousand junctions keep WebKit's
    // renderer busy long enough that a click cannot land, and how fast a canvas draws is not what
    // this test is about. What matters is that the graph arrived, is referenced, and survives.
    const landed=await payload(target,await stored(target));
    assert.equal(landed.nodes.length,NODES,'the graph arrived with the package');

    await target.reload();
    await expect(target.locator('#workflow-state')).toBeVisible({timeout:60000});
    const after=await stored(target);
    assert.match(after,/^[0-9a-f]{16,}$/,'the workflow still references its graph after a reload');
    assert.equal((await payload(target,after)).nodes.length,NODES,'and the store still holds it');
  }finally{await fresh.close();}
});
