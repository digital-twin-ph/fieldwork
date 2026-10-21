import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The practitioner, 2026-10-20: "We should try to also export an encrypted project." And: "load an
// encrypted project from a clean slate FW where only the worked examples remain."
//
// The case that matters is a project carrying a DOWNLOADED NETWORK, because since this morning a
// network lives in the payload store and the workflow keeps only a digest. An imported project
// arrives with both the data and the reference, and its payload has never been seen on that
// device -- so dehydrating it on the first save wrote a reference pointing at nothing, and the
// next reload refused the workflow. An imported project looked like it had vanished.
test.use({serviceWorkers:'block'});
const password='test-only long passphrase for the round trip';

test('an encrypted project carrying a downloaded network opens on a clean device and survives a reload',async({page,browser})=>{
  await page.route(/^https:\/\//,route=>route.abort());
  for(const host of ['overpass-api.de','overpass.kumi.systems','overpass.private.coffee'])
    await page.route(`https://${host}/api/status`,route=>
      route.fulfill({body:'Rate limit: 2\n2 slots available now.\n',contentType:'text/plain'}));
  await page.route('https://overpass-api.de/api/interpreter',route=>
    (route.request().postData()||'').includes('node%281%29')
      ?route.fulfill({json:{version:0.6,elements:[]}})
      :route.fulfill({json:{elements:[
          {type:'node',id:1,lon:-0.136668,lat:51.513341},{type:'node',id:2,lon:-0.135,lat:51.513341},
          {type:'node',id:3,lon:-0.134,lat:51.5135},
          {type:'way',id:10,nodes:[1,2],tags:{highway:'residential'}},
          {type:'way',id:11,nodes:[2,3],tags:{highway:'residential'}}]}}));

  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('.react-flow__node[data-id="network"]').click();
  await page.locator('#network-input-method').selectOption('osm');
  await page.locator('#download-network').click();
  await expect(page.locator('#inspector-content')).toContainText('3 nodes',{timeout:60000});
  // The workflow holds a reference, which is the thing the package has to carry data for.
  const digest=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.type==='network_input').params.dataRef);
  assert.match(digest,/^[0-9a-f]{16,}$/);

  // Export, encrypted.
  const pending=page.waitForEvent('download');
  await page.locator('#encrypted-export').click();
  await page.locator('#package-password').fill(password);
  await page.locator('#package-confirm').fill(password);
  await page.locator('#package-submit').click();
  const zip=await readFile(await (await pending).path());
  assert.ok(zip.length>0,'the package has bytes');

  // A clean slate: a browser that has never seen this project, holding only the worked examples.
  const fresh=await browser.newContext({viewport:{width:1280,height:900}});
  const target=await fresh.newPage();
  try{
    await target.goto('http://127.0.0.1:4174/?example=blank');
    await expect(target.locator('#workflow-state')).toBeVisible({timeout:45000});
    await target.locator('#workflow-file').setInputFiles({name:'project.zip',mimeType:'application/zip',buffer:zip});
    await target.locator('#package-password').fill(password);
    await target.locator('#package-submit').click();
    await expect(target.locator('#package-dialog')).toHaveCount(0,{timeout:45000});

    await target.locator('.react-flow__node[data-id="network"]').click();
    await expect(target.locator('#inspector-content')).toContainText('3 nodes');

    // THE RELOAD IS THE TEST. Before 2026-10-20 the payload was stripped on the first save and
    // the reference resolved to nothing, so this is where an imported project disappeared.
    await target.reload();
    await expect(target.locator('#workflow-state')).toBeVisible({timeout:45000});
    await target.locator('.react-flow__node[data-id="network"]').click();
    await expect(target.locator('#inspector-content')).toContainText('3 nodes');
    await expect(target.locator('#toast')).not.toContainText('Shared input data');
  }finally{await fresh.close();}
});
