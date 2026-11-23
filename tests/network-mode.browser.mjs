import {test,expect} from './fixtures.mjs';
import {configureNetwork} from './network-config.mjs';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner, 2026-10-20: "So before I download Bunia again, I want to be able to set
// driving mode on the street network." Since 2026-11-23 the mode is in Configure…, beside the way in:
// switch to a download, choose the mode, Apply, and have it survive a reload. No request is made to OpenStreetMap.
test('a street network download can be set to driving, and the choice is saved',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  // The example ships a prepared file, so the mode control is not offered until a download is.
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('#network-config');
  await expect(dialog.locator('#network-travel-mode')).toHaveCount(0);

  await dialog.locator('#network-input-method').selectOption('osm');
  await expect(dialog.locator('#network-travel-mode')).toHaveValue('walking');
  await expect(dialog).toContainText('Walking keeps footways, paths and steps');
  await dialog.locator('#network-travel-mode').selectOption('driving');
  // Keyboard-reachable and named, like every other control in the dialog.
  await expect(dialog.locator('label[for="network-travel-mode"]')).toHaveText('Travel mode to download for');
  await dialog.locator('#network-travel-mode').focus();
  await expect(dialog.locator('#network-travel-mode')).toBeFocused();
  await dialog.locator('#config-apply').click();
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('A street network for driving, downloaded from OpenStreetMap');

  // A saved parameter, not a session choice: the next download must use what was chosen here.
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  await page.locator('#inspector-content #configure-step').click();
  await expect(dialog.locator('#network-travel-mode')).toHaveValue('driving');
  expect(errors).toEqual([]);
});

// "No Overpass instance answered. 3 were answering a moment ago and were tried twice, the last
// reporting HTTP 504." The practitioner's study area spanned the DRC-Uganda border, some 600 km
// across; a 504 is the service saying it gave up computing the answer. Since 2026-10-20 the
// widget asks `out count;` first -- the service's own answer to how much is there -- so an area
// it will not serve is refused after ONE request instead of six.
test.use({serviceWorkers:'block'});
test('an area the service will not answer for is refused before it is downloaded',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.route(/^https:\/\//,route=>route.abort());
  for(const host of ['overpass-api.de','overpass.kumi.systems','overpass.private.coffee'])
    await page.route(`https://${host}/api/status`,route=>
      route.fulfill({body:'Rate limit: 2\n2 slots available now.\n',contentType:'text/plain'}));
  let downloads=0,counts=0;
  await page.route(/\/api\/interpreter/,route=>{
    const sent=route.request().postData()||'';
    if(sent.includes('node%281%29'))return route.fulfill({json:{version:0.6,elements:[]}});
    if(sent.includes('out+count')||sent.includes('out%20count')){counts++;
      return route.fulfill({json:{version:0.6,elements:[{type:'count',id:0,tags:{ways:'1840000',total:'1840000'}}]}});}
    downloads++;return route.fulfill({json:{elements:[]}});
  });

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  await configureNetwork(page,{method:'osm'});
  await page.locator('#download-network').click();
  await expect(page.locator('#toast')).toContainText('1,840,000 street ways',{timeout:60000});
  await expect(page.locator('#toast')).toContainText('draw a smaller study area');
  // Two counts and no download: the area's own, and the other travel mode's, which the refusal
  // reports so a province is not re-attempted in the mode that will never fit. 2026-10-21.
  expect(counts).toBe(2);
  expect(downloads).toBe(0);
});
