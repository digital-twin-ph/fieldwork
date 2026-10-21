import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditRuntimeRun} from '../scripts/audit-runtime-n3.mjs';
import {collectPageErrors} from './page-errors.mjs';

test('geoprivacy canvas shows before/after maps and tables with editable parameters and derived export',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [role="tab"]')).toHaveCount(7);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="original-center"]')).toHaveCount(1);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="moved-center"]')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#run-summary')).toContainText('Private project');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-before-table').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('250');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#release-download')).toBeHidden();
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-after-move-table').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows')).toContainText('Moved location');
  const downloadEvent=page.waitForEvent('download');await page.locator('#release-download').click();const download=await downloadEvent;
  const payload=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(payload.features.length,250);assert.ok(payload.features.every(f=>f.id.startsWith('moved-')&&!('DEATHS' in f.properties)));
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-comparison-map').click();
  await expect(page.locator('#comparison-map-host .comparison-card')).toHaveCount(3);
  await expect(page.locator('#comparison-map-host [data-original-point]')).toHaveCount(250);
  await expect(page.locator('#comparison-map-host [data-moved-point]')).toHaveCount(250);
  await expect(page.locator('#comparison-map-host [data-pump]')).toHaveCount(16);
  await expect(page.locator('#comparison-map-host [data-mean]')).toHaveCount(2);
  await expect(page.locator('#comparison-map-host')).toContainText('Nearest pump:');

  // Representative donuts. The point of the card is that the original and the moved position of
  // the SAME record are visible together inside the annulus, which is the only way the mechanism
  // is legible -- the before and after maps show two clouds and no pairing.
  const donuts=page.locator('#comparison-map-host [data-donut-card]');
  await expect(donuts).toHaveCount(1);
  await expect(donuts.locator('[data-donut-original]')).toHaveCount(8);
  await expect(donuts.locator('[data-donut-moved]')).toHaveCount(8);
  await expect(donuts.locator('[data-donut-link]')).toHaveCount(8);
  // Two rings per donut: the inner edge of the observed band and the outer.
  await expect(donuts.locator('[data-donut] circle')).toHaveCount(16);
  // The band is measured from the pairing, not read from the widget's parameters.
  //
  // It is NOT expected to sit exactly inside the declared 50-125 m donut, and the first version
  // of this test wrongly required that: it failed at 125.2 m.
  //
  // The cause was then also stated wrongly, as the UTM scale factor. That is 1.000081 at Soho --
  // 0.008%, twenty-five times too small. The real mechanism is the one check 17 found in
  // buffer_point: moveDonut converts metres to an angle on a sphere of radius 6,371,008.8 m,
  // while the WGS84 ellipsoid at 51.5N has local radii of 6,374,604 m along the meridian and
  // 6,391,253 m across it. The same angle therefore covers 0.06% more ground north-south and
  // 0.32% more east-west, and the measured ratios run 1.000651 to 1.003263 -- bracketed by
  // exactly those two numbers, which is what identifies the cause. Measured on that sphere the
  // displacements are 50.64-124.95 m, inside the donut.
  //
  // So the criterion is the declared bounds widened by the larger of the two ratios.
  const band=await donuts.locator('p').first().textContent();
  const [,minimum,maximum]=band.match(/between ([\d.]+) m.*?and ([\d.]+) m/s).map(Number);
  const ellipsoidStretch=1.0032;   // N/R at 51.5N, the east-west worst case
  assert.ok(minimum>=50&&maximum<=125*ellipsoidStretch,
    `observed band ${minimum}-${maximum} m is outside a 50-125 m donut even allowing the ellipsoid ratio`);
  assert.ok(maximum>125,'the band no longer exceeds 125 m, so the ellipsoid caveat on the card is stale');
  assert.ok(maximum-minimum>10,'a band this narrow suggests the pairing is wrong');
  await expect(donuts).toContainText('6,371,008.8 m');
  await expect(donuts).toContainText('observed band');
  await expect(donuts).toContainText('8 of 250 pairs shown');
  // Still private, and the caveat now names the donut card specifically.
  await expect(page.locator('#comparison-map-host .comparison-caveat')).toContainText('teaching view, not a shareable one');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#release-download')).toBeHidden();
  await page.locator('[data-view="results"]').click();
  await page.locator('#map-panel').screenshot({path:'test-results/geoprivacy-comparison.png'});
  const centerBefore=await page.locator('.comparison-summary strong').innerText();
  // The Expand button went with the split on 2026-10-21: the results tab is the whole view.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();await expect(page.locator('#mean-center-zone')).toHaveValue('30');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="compare"]').click();await expect(page.locator('#comparison-zone')).toHaveValue('30');await expect(page.locator('#comparison-hemisphere')).toHaveValue('north');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="move"]').click();await page.locator('#privacy-seed').fill('43');await page.locator('#privacy-seed').press('Tab');
  await expect(page.locator('#privacy-seed')).toHaveValue('43');await expect(page.locator('#workflow-state')).toContainText('Changed');await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-comparison-map').click();
  assert.notEqual(await page.locator('.comparison-summary strong').innerText(),centerBefore);
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-after-group-map').click();await expect(page.locator('#map [data-hex-cell]')).toHaveCount(5);
  const hexDownloadEvent=page.waitForEvent('download');await page.locator('#release-download').click();const hexDownload=await hexDownloadEvent;
  const hexPayload=JSON.parse(await readFile(await hexDownload.path(),'utf8'));
  assert.equal(hexPayload.features.length,5);assert.ok(hexPayload.features.every(f=>f.geometry.type==='Polygon'&&Number.isInteger(f.properties.count)&&!('DEATHS' in f.properties)));
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="group"]').click();await expect(page.locator('#privacy-resolution')).toHaveValue('9');
  await page.locator('#privacy-minOccupancy').fill('3');await page.locator('#privacy-minOccupancy').dispatchEvent('change');
  await expect(page.locator('#workflow-state')).toContainText('Changed');await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-after-group-map').click();await expect(page.locator('#map [data-hex-cell]')).not.toHaveCount(0);
  await page.locator('[data-view="rules"]').click();await expect(page.locator('#n3-preview')).toContainText('fw:DonutGeomasking');await expect(page.locator('#n3-preview')).toContainText('fw:MeanCenterComputation');await expect(page.locator('#n3-preview')).toContainText('fw:PointSetComparison');await expect(page.locator('#n3-preview')).toContainText('fw:HexAggregation');
  const runEvent=page.waitForEvent('download');await page.locator('#download-evidence').click();const privateRun=JSON.parse(await readFile(await (await runEvent).path(),'utf8'));
  const audit=await auditRuntimeRun(privateRun);assert.equal(audit.summary.conforms,true,JSON.stringify(audit.summary));
  assert.deepEqual(errors,[]);
});
