import {test,expect} from './fixtures.mjs';
import {configureStep} from './configure-step.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditRuntimeRun} from '../scripts/audit-runtime-n3.mjs';
import {collectPageErrors} from './page-errors.mjs';

test('geoprivacy canvas shows before/after maps and tables with editable parameters and derived export',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-geoprivacy');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs [role="tab"]')).toHaveCount(8);
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
  // COMPARISON MAP RETIRED INTO MAP (2026-11-20): the comparison is a Map of the original and moved points, both mean
  // centres and the pumps, and a Table of the distances Compare point sets measured.
  await page.locator('#result-tab-comparison-map').click();
  await expect(page.locator('#result-metrics')).toContainText('510');
  await page.locator('#result-tab-comparison-distances').click();
  const distances=page.locator('#data-table-view');
  await expect(distances).toContainText('mean centre moved');
  await expect(distances).toContainText('original mean centre to its nearest pump');
  // The band is measured from the pairing, not read from the widget's parameters. It is NOT expected to sit exactly
  // inside the declared 50-125 m donut: moveDonut converts metres to an angle on a sphere of radius 6,371,008.8 m, while
  // the WGS84 ellipsoid at 51.5N has local radii of 6,374,604 m along the meridian and 6,391,253 m across it, so the
  // same angle covers up to 0.32% more ground. The criterion is the declared bounds widened by that ratio.
  const metres=async measure=>Number((await distances.locator('tr',{hasText:measure}).first().locator('td').last().innerText()).replace(/[^\d.]/g,''));
  const minimum=await metres('a point moved, least'),maximum=await metres('a point moved, most');
  const ellipsoidStretch=1.0032;
  assert.ok(minimum>=50&&maximum<=125*ellipsoidStretch,`observed band ${minimum}-${maximum} m is outside a 50-125 m donut even allowing the ellipsoid ratio`);
  assert.ok(maximum-minimum>10,'a band this narrow suggests the pairing is wrong');
  const centerBefore=await metres('mean centre moved');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="original-center"]').click();await expect(page.locator('#inspector-content .standard-sentence')).toContainText('UTM zone 30N');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="compare"]').click();
  await expect(page.locator('#inspector-content .standard-result')).toContainText('The mean centre moved');
  await page.locator('#configure-step').click();
  await expect(page.locator('#compare-config #comparison-zone')).toHaveValue('30');await expect(page.locator('#compare-config #comparison-hemisphere')).toHaveValue('north');
  await page.locator('#compare-config #config-cancel').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="move"]').click();await configureStep(page,{'donut-seed':'43'});
 await expect(page.locator('#workflow-state')).toContainText('Changed');await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-comparison-distances').click();
  await expect(distances).toContainText('mean centre moved');
  assert.notEqual(await metres('mean centre moved'),centerBefore);
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-after-group-map').click();await expect(page.locator('#map [data-hex-cell]')).toHaveCount(5);
  const hexDownloadEvent=page.waitForEvent('download');await page.locator('#release-download').click();const hexDownload=await hexDownloadEvent;
  const hexPayload=JSON.parse(await readFile(await hexDownload.path(),'utf8'));
  assert.equal(hexPayload.features.length,5);assert.ok(hexPayload.features.every(f=>f.geometry.type==='Polygon'&&Number.isInteger(f.properties.count)&&!('DEATHS' in f.properties)));
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="group"]').click();await expect(page.locator('#inspector-content .standard-sentence')).toContainText('resolution 9');
  await configureStep(page,{'h3-min':'3'});
  await expect(page.locator('#workflow-state')).toContainText('Changed');await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-after-group-map').click();await expect(page.locator('#map [data-hex-cell]')).not.toHaveCount(0);
  await page.locator('[data-view="rules"]').click();await expect(page.locator('#n3-preview')).toContainText('fw:DonutGeomasking');await expect(page.locator('#n3-preview')).toContainText('fw:MeanCenterComputation');await expect(page.locator('#n3-preview')).toContainText('fw:PointSetComparison');await expect(page.locator('#n3-preview')).toContainText('fw:HexAggregation');
  const runEvent=page.waitForEvent('download');await page.locator('#download-evidence').click();const privateRun=JSON.parse(await readFile(await (await runEvent).path(),'utf8'));
  const audit=await auditRuntimeRun(privateRun);assert.equal(audit.summary.conforms,true,JSON.stringify(audit.summary));
  assert.deepEqual(errors,[]);
});
