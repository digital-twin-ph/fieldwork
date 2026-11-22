import {test,expect} from './fixtures.mjs';
import {inMapSettings} from './map-settings.mjs';

// BASEMAPS ON THE PERSON'S OWN KEY (experiment 222; the practitioner, 2026-11-18: "Let's use Carto and Esri"). CARTO's
// tiles are answered here with a blank image, so nothing reaches CARTO and the key is a made-up one.
test.use({serviceWorkers:'block'});
const KEY='test-carto-key-not-real';
const blank=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/58BAwAI/AL+hc2rNAAAAABJRU5ErkJggg==','base64');

async function addKey(page,provider,origin,secret){
  await page.locator('#credentials-button').click();
  if(await page.locator('#credential-new').isVisible())await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill(provider);await page.locator('#credential-provider').fill(provider);
  await page.locator('#credential-origin').fill(origin);await page.locator('#credential-secret').fill(secret);
  await page.locator('#credential-add').click();await expect(page.locator('#credential-error')).toBeHidden();
  await page.locator('#credential-close').click();
}

test('with a CARTO key unlocked, CARTO styles are offered, drawn with the key and credited; Esri, with no key, is not offered',async({page})=>{
  const asked=[];
  await page.route(/basemaps\.cartocdn\.com/,r=>{asked.push(r.request().url());return r.fulfill({status:200,contentType:'image/png',body:blank,headers:{'access-control-allow-origin':'*'}});});
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await addKey(page,'carto','https://basemaps.cartocdn.com',KEY);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="interactive"]').click();
  await inMapSettings(page,async dialog=>{
    for(const style of ['carto-positron','carto-voyager','carto-dark-matter'])
      await expect(dialog.locator(`#map-basemap option[value="${style}"]`)).toHaveCount(1);
    for(const style of ['esri-imagery','esri-streets','esri-outdoor'])
      await expect(dialog.locator(`#map-basemap option[value="${style}"]`)).toHaveCount(0);
    await dialog.locator('#map-basemap').selectOption('carto-positron');
  });
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="interactive"]').click();
  await expect(page.locator('.catchment-map-toolbar [data-basemap]')).toHaveValue('carto-positron');
  await expect.poll(()=>asked.length,{timeout:30000}).toBeGreaterThan(0);
  expect(asked.every(u=>u.includes('/rastertiles/light_all/')&&u.includes(`key=${KEY}`))).toBe(true);
  await expect(page.locator('.leaflet-control-attribution')).toContainText('CARTO');
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
  // The project keeps the choice, never the key.
  const kept=await page.evaluate(()=>JSON.stringify({...localStorage}));
  expect(kept).toContain('carto-positron');expect(kept).not.toContain(KEY);
});

test('a CARTO style chosen while the credentials are locked shows OpenStreetMap and says why',async({page})=>{
  await page.route(/basemaps\.cartocdn\.com/,r=>r.abort());
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await addKey(page,'carto','https://basemaps.cartocdn.com',KEY);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="interactive"]').click();
  await inMapSettings(page,async dialog=>{await dialog.locator('#map-basemap').selectOption('carto-voyager');});
  // Lock.
  await page.locator('#credentials-button').click();await page.locator('#credential-lock').click();
  if(await page.locator('#credential-close').isVisible())await page.locator('#credential-close').click();
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs [data-output="interactive"]').click();
  await expect(page.locator('.catchment-map-toolbar')).toContainText('needs your CARTO key',{timeout:30000});
  await expect(page.locator('.catchment-map-toolbar')).toContainText('OpenStreetMap is shown meanwhile');
});

// A KEY CARTO REFUSES (2026-11-22): the practitioner's key, locked to Fieldwork's published address, was refused with 403
// on a local server, and the map said only that CARTO "did not answer". It now says what CARTO answered.
test('a key CARTO refuses: the map says CARTO answered 403 and why, without the key',async({page})=>{
  await page.route(/basemaps\.cartocdn\.com/,r=>r.fulfill({status:403,contentType:'text/plain',headers:{'access-control-allow-origin':'*'},
    body:'Forbidden: a valid, authorized API key is required. See https://carto.com/basemaps/apikey'}));
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await addKey(page,'carto','https://basemaps.cartocdn.com',KEY);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="interactive"]').click();
  await inMapSettings(page,async dialog=>{
    await dialog.locator('#map-basemap').selectOption('carto-voyager');
    await expect(dialog).toContainText('CARTO answered 403, “Forbidden: a valid, authorized API key is required.',{timeout:20000});
    await expect(dialog).toContainText("A key locked to Fieldwork's published address is refused on any other");
    await expect(dialog).not.toContainText(KEY);
  });
});
