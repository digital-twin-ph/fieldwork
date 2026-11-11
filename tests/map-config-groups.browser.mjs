import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// THE MAP'S CONFIGURE…, 2026-11-10. The practitioner: "This left side needs subsections, it's hard to distinguish which
// control the label is describing"; "The default should be OSM"; and, of the preview's own basemap picker offering
// PMTiles for a static plot, that there was no way to import them there.
test('Configure… groups its settings, defaults to OpenStreetMap, and the preview follows the setting',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120_000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#map-config');
  // One bordered group per heading, Basemap second.
  const titles=await dialog.locator('.config-group-title').allTextContents();
  expect(titles.slice(0,3)).toEqual(['Presentation','Basemap','Layers']);
  expect(titles).toContain('Title, key and note');
  // A map that stated no basemap draws OpenStreetMap.
  const basemap=dialog.locator('.config-group',{has:page.locator('.config-group-title',{hasText:'Basemap'})}).locator('#map-basemap');
  await expect(basemap).toHaveValue('osm');
  // The preview says what Settings chose, and offers no second picker.
  await expect(dialog.locator('[data-basemap-said]')).toContainText('as set under Basemap');
  await expect(dialog.locator('#map-config-preview select[data-basemap]')).toBeHidden();
  // None, chosen, is kept.
  await basemap.selectOption('none');
  await dialog.locator('#config-apply').click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='map').params.basemap)).toBe('none');
  expect(errors).toEqual([]);
});
