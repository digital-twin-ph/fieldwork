import {test,expect} from './fixtures.mjs';
import {configureStep} from './configure-step.mjs';
import {collectPageErrors} from './page-errors.mjs';

// Reproject points retired into Table output on 0.169.0 (docs/audits/reproject-retired.md): no step computed with its
// metres, so showing coordinates in metres is a choice where the coordinates are shown, a Table's.
test('a Table shows coordinates in metres, in a zone the data suggests, and back in degrees',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-deaths');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(page.locator('#node-library [data-add="reproject"]')).toHaveCount(0);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="projected-table"]').click();
  const settings=page.locator('#inspector-content .standard-sentence');
  await expect(settings).toContainText('easting and northing in UTM zone 30N');

  const dialog=await configureStep(page,{},{apply:false});
  await expect(dialog.locator('#output-coordinates')).toHaveValue('metres');
  await expect(dialog.locator('[data-utm-advice]')).toContainText('Zone 30N fits');
  await dialog.locator('#output-coordinates').selectOption('degrees');
  await expect(dialog.locator('#output-zone')).toHaveCount(0);
  await dialog.locator('#config-apply').click();await expect(dialog).toHaveCount(0);
  await expect(settings).toContainText('their longitude and latitude');
  await expect(page.locator('#workflow-state')).toContainText('Changed');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='projected-table').params);
  expect(saved.coordinates).toBeUndefined();

  await configureStep(page,{'output-coordinates':'metres'});
  await expect(settings).toContainText('UTM zone 30N');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  expect(errors).toEqual([]);
});
