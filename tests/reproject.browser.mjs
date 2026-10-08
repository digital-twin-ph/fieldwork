import {test,expect} from '@playwright/test';

// Gaborone-area points in WGS84 UTM zone 35 south, with one record missing coordinates.
const csv='site_id,name,easting,northing\nA1,Clinic A,395000,7280000\nA2,Clinic B,398500,7283500\nA3,Unknown site,,\n';

test('Reproject input converts UTM metres to CRS84, records provenance and replays offline',async({page,context})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});

  await page.locator('[data-add="reproject"]').click();
  await expect(page.locator('.inspector')).toContainText('EPSG:32735');
  await expect(page.locator('.inspector')).toContainText('None (WGS84 only)');
  await expect(page.locator('.inspector')).toContainText('cannot run until points are imported');

  await page.locator('#open-reproject').click();
  await expect(page.locator('#reproject-dialog')).toBeVisible();
  await expect(page.locator('#reproject-crs')).toContainText('EPSG:32735');
  await expect(page.locator('#reproject-save')).toBeDisabled();

  await page.locator('#reproject-file').setInputFiles({name:'clinics-utm35s.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.locator('#reproject-columns')).toBeVisible();
  await expect(page.locator('#reproject-status')).toContainText('Converted 2 of 3 records');
  await expect(page.locator('#reproject-status')).toContainText('1 without coordinates');
  await expect(page.locator('#reproject-preview')).toContainText('"datumShift": "none"');

  // Gaborone latitudes come out of zone 35 south.
  await expect(page.locator('#reproject-preview')).toContainText(/"latitude": -24\./);

  // The same easting and northing are a valid location in zone 35 NORTH as well, so a
  // misdeclared hemisphere cannot be detected: it converts cleanly to northern Europe.
  // This records the limit stated in docs/experiments/40-reprojection-primitives.md.
  await page.locator('#reproject-hemisphere').selectOption('north');
  await expect(page.locator('#reproject-status')).toContainText('Converted 2 of 3 records');
  await expect(page.locator('#reproject-error')).toBeHidden();
  await expect(page.locator('#reproject-preview')).toContainText(/"latitude": 6\d\./);
  await page.locator('#reproject-hemisphere').selectOption('south');
  await expect(page.locator('#reproject-preview')).toContainText(/"latitude": -24\./);
  await expect(page.locator('#reproject-save')).toBeEnabled();

  await page.locator('#reproject-save').click();
  await expect(page.locator('#reproject-dialog')).toBeHidden();
  await expect(page.locator('.inspector')).toContainText('2 converted, 1 without coordinates');
  await expect(page.locator('.inspector')).toContainText('clinics-utm35s.csv');

  // The converted coordinates must be plausible degrees for Gaborone, not metres.
  const inspector=await page.locator('.inspector pre').first().textContent();
  expect(inspector).toContain('"sourceCRS": "EPSG:32735"');
  expect(inspector).toContain('"targetCRS": "OGC:CRS84"');

  await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#n3-preview')).toContainText('reproject');
  await page.locator('[data-view="workflow"]').click();

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.react-flow__node').filter({hasText:'Reproject input'})).toContainText('2 of 3 records converted');
  await page.screenshot({path:'test-results/reproject-input.png',fullPage:true});
});

test('a degrees file declared as projected is refused with a recoverable draft',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-add="reproject"]').click();
  await page.locator('#open-reproject').click();
  await page.locator('#reproject-file').setInputFiles({name:'degrees.csv',mimeType:'text/csv',buffer:Buffer.from('name,easting,northing\nA,25.92,-24.63\n')});
  await expect(page.locator('#reproject-error')).toContainText('outside the 100,000–900,000 m UTM range');
  await expect(page.locator('#reproject-save')).toBeDisabled();
  await page.locator('#reproject-cancel').click();
  await expect(page.locator('.inspector')).toContainText('cannot run until points are imported');
});
