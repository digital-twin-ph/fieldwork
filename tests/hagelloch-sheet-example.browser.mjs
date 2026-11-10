import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// HAGELLOCH'S 1824 SHEET, PLACED BY HAND (experiment 201): the example's own image, offered in Configure…; four street
// junctions found with the cue and typed as the manual gives them -- where the drawn streets meet on the sheet, read by
// eye, and today's junction on the map. Tiles are refused: the typed points do not need them.
test.use({serviceWorkers:'block'});

// Sheet pixels read by eye from enlargements of the scan; longitude and latitude are today's junctions (OpenStreetMap).
const POINTS=[
  ['North road, above the stream',1166,1552,9.0125918,48.542892],
  ['West entry',950,1855,9.01056,48.5410433],
  ['North fork',1191,1665,9.0127814,48.5421903],
  ['South lane',1116.5,1699,9.0121234,48.5419319],
];

test('Hagelloch: the 1824 sheet is offered, placed by four guided junctions north up, and drawn under the cases',async({page})=>{
  test.setTimeout(240_000);
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org/,route=>route.abort('failed'));
  await page.goto('/?example=hagelloch-sheet');
  await expect(page.locator('#project-select option:checked')).toHaveText('Measles in Hagelloch, 1861 · 4 workflows');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="sheet"]').click();
  await expect(page.locator('#inspector-content')).toContainText('A worked example names 4 features to find');
  await page.locator('#configure-step').click();
  const dialog=page.locator('#map-image-config');
  await expect(dialog.locator('#map-image-offered')).toContainText('flurkarte-nw-iii-3-1824.jpg');
  await expect(dialog).toContainText('Landesarchiv Baden-Württemberg');
  await dialog.locator('#map-image-offered').click();
  await expect(dialog).toContainText('flurkarte-nw-iii-3-1824.jpg: 2,200 × 2,489 pixels',{timeout:30_000});
  await expect(dialog.locator('#geo-worked')).toContainText('point 1 of 4: North road, above the stream');
  await expect(dialog.locator('[data-geo-cue="image"]')).toHaveCount(1);
  for(const [index,[name,x,y,lon,lat]] of POINTS.entries()){
    if(index>0)await dialog.locator('#geo-add-point').click();
    const row=dialog.locator(`tr[data-geo-row="${index}"]`);
    await expect(row.locator('[data-geo-field="id"]')).toHaveValue(name);
    for(const [field,value] of [['x',x],['y',y],['lon',lon],['lat',lat]]){
      await row.locator(`[data-geo-field="${field}"]`).fill(String(value));
      await row.locator(`[data-geo-field="${field}"]`).dispatchEvent('change');
    }
    // Each typed junction is inside its feature's ring, on the sheet and on the map.
    await expect(dialog.locator('#geo-found')).toContainText('On the image: on the feature. On today\'s map: on the feature.');
  }
  // North up, as the example sets it: four points, errors of a few metres, the largest at the south lane.
  await expect(dialog.locator('#geo-fit')).toContainText('Placed from 4 points: errors 3 m root mean square, largest 5 m at South lane.');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#inspector-content')).toContainText('placed by 4 matched points');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:90_000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map image[data-map-image]')).toHaveCount(1,{timeout:20_000});
  expect(errors).toEqual([]);
});
