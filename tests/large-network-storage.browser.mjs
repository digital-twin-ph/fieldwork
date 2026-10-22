import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {payload} from './payload-store.mjs';

// The case this exists for, 2026-10-20: the practitioner downloaded Bunia and was told "This could
// not be saved on this device, so it was not kept." The download had worked and the SAVE had not,
// and because a network is kept only if it persists, the graph was rolled back. localStorage
// accepts 5,226,496 bytes measured in both engines and a workflow is written twice per save; Bunia
// is an estimated 14.2 MB. See docs/experiments/121-storage-beyond-local-storage.md.
//
// So this builds a graph that provably could not have been kept before -- larger than the WHOLE
// localStorage quota -- and requires that it survives a reload.
// The service worker serves this application's fetches, and a routed stub does not reach them in
// WebKit -- so without this the download went to the REAL overpass-api.de and the test measured
// central London. The other download test blocks the worker for the same reason.
test.use({serviceWorkers:'block'});
const QUOTA=5226496,NODES=40000;
const chain=()=>{
  const elements=[];
  // INSIDE THE STUDY AREA IT CLAIMS TO BE IN. The Soho rectangle is -.142..-.128 by
  // 51.509..51.517; this chain used a step that carried it to -0.06, five kilometres past the
  // eastern edge. That was harmless while a download kept whatever the bounding box returned,
  // and stopped being harmless on 2026-10-22 when a downloaded network began to be clipped to
  // the study area plus its download margin. The test is about STORAGE -- a graph larger than
  // the whole localStorage quota -- so the geography only has to be plausible, and now is.
  for(let i=0;i<NODES;i++)elements.push({type:'node',id:i+1,lon:-0.141+i*0.00000025,lat:51.5095+i*0.0000001});
  for(let i=1;i<NODES;i++)elements.push({type:'way',id:1000000+i,nodes:[i,i+1],tags:{highway:'residential'}});
  return {version:0.6,elements};
};

test('a street network larger than the whole localStorage quota is kept and survives a reload',async({page})=>{
  test.slow();
  const body=JSON.stringify(chain());
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  // A catch-all refusal FIRST, so that a stub which fails to match can never reach a donated
  // public service. It caught exactly that here. Playwright matches the most recently registered
  // route first, so the specific stubs below still win.
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

  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const node=stored.nodes.find(n=>n.type==='network_input');
  assert.equal(node.params.data,undefined,'the graph is not in the workflow');
  const graph=await payload(page,node.params.dataRef);
  const bytes=JSON.stringify(graph).length;
  assert.ok(bytes>QUOTA,`the graph is ${bytes} bytes, which must exceed the ${QUOTA}-byte store it used to live in`);
  assert.equal(graph.nodes.length,NODES);

  // The workflow itself stays small, which is the whole point: localStorage holds a workflow and
  // not a street network.
  const workflowBytes=await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1').length);
  // Measured 2026-10-20 in Chromium: an 8,096,643-byte graph beside a 64,924-byte workflow.
  assert.ok(workflowBytes<400000,`the saved workflow is ${workflowBytes} bytes`);

  // And the reference resolves: a reload hydrates the graph back out of the large store.
  await page.reload();
  // WHAT SURVIVED THE RELOAD, not what the machine could compute afterwards.
  //
  // This waited for "Run complete" until 2026-10-20, on the reasoning that a reference whose
  // payload is missing is a refusal, so a completed run proves hydration. True, and it made the
  // test depend on an ISOCHRONE OVER FORTY THOUSAND JUNCTIONS finishing -- which it does here and
  // does not on a two-core CI runner, where the same workflow takes 4.4 minutes and ends in "Run
  // failed". That is a measurement of the runner, and it blocked publication for forty minutes.
  //
  // The claim is that the graph came back, and the store and the workflow can be read directly.
  // Boot is still the real test of hydration: a missing payload is refused there, which would
  // take the network node out of the workflow this then reads.
  await expect(page.locator('#workflow-state')).toContainText(/Run|Ready/,{timeout:120000});
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  assert.ok(after.nodes.some(n=>n.id==='network'),'the workflow survived the reload');
  assert.equal(after.nodes.find(n=>n.type==='network_input').params.dataRef,node.params.dataRef);
  const rehydrated=await payload(page,node.params.dataRef);
  assert.equal(rehydrated.nodes.length,NODES,'and the graph is still in the store after a reload');
});
