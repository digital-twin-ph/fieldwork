import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A TABLE WITH COORDINATES REACHES POINT DATA (2026-11-23). The practitioner, of a spreadsheet read into Tabular data
 *  and connected to Point data: *"Latitude and Longitude does not show up on the point table so it cannot be picked."*
 *  They did not: both are numeric, so both were proposed as variables and melted into `measure` and `value`, leaving the
 *  table with no coordinates to offer. A coordinate locates the subject; it is a key, and the picker proposes it. */
const CSV='site,Latitude,Longitude,cases,deaths\nAlpha,-24.69,25.90,4,1\nBravo,-24.61,25.95,7,2\nAlpha,-24.69,25.90,3,0\n';
const open=async page=>{
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles({name:'sites.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)});
  await expect(page.locator('dialog[open]')).toContainText('Key columns',{timeout:60000});
};

test('a coordinate column is read as a key, not melted into a variable',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page);
  const dialog=page.locator('dialog[open]');
  for(const column of ['Latitude','Longitude'])
    await expect(dialog.locator(`#table-keys input[value="${column}"]`)).toBeChecked();
  for(const column of ['cases','deaths'])
    await expect(dialog.locator(`#table-values input[value="${column}"]`)).toBeChecked();
  // THE COUNT ITS READER COUNTS: three records, not the six rows two variables make of them.
  await page.locator('#table-save').click();
  await expect(dialog).toHaveCount(0,{timeout:60000});
  await expect(page.locator('#inspector-content')).toContainText('3 records');
  await expect(page.locator('#inspector-content')).not.toContainText('6 rows');
  expect(errors).toEqual([]);
});

test('Point data proposes the table’s longitude and latitude, and places every row',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page);
  await page.locator('#table-save').click();
  await expect(page.locator('dialog[open]')).toHaveCount(0,{timeout:60000});
  await page.locator('#node-library [data-add="point_input"]').click();
  // Connected on the table port, which is what makes Configure… ask which columns hold the position.
  await page.locator('#inspector-content select[data-connect-port="records"]')
    .selectOption({index:1});
  await page.locator('#configure-step').click();
  const dialog=page.locator('#points-config');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#from-table-x')).toHaveValue('Longitude');
  await expect(dialog.locator('#from-table-y')).toHaveValue('Latitude');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0,{timeout:30000});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Not ready|Nothing/,{timeout:60000});
  expect(errors).toEqual([]);
});
