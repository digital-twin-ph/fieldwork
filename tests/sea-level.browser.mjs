import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const fixture=JSON.parse(await readFile(new URL('./fixtures/sea-level-workflow-2026-10-09.json',import.meta.url),'utf8'));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'sea-level.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};

test('the sea-level workflow runs, states its refusals and replays offline',async({page,context})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await upload(page,fixture);
  await run(page);

  // Clinic A: 0.77 m projected against 0.90 m supplied, so it stays below. Clinic B: 0.58 against
  // 0.40, so it reaches. The unlocated clinic has no site and therefore no comparison.
  await expect(page.locator('#result-metrics')).toContainText('1 flagged for review');
  await expect(page.locator('#result-metrics')).toContainText('1 no flag');
  await expect(page.locator('#result-metrics')).toContainText('1 insufficient data');
  await expect(page.locator('#result-rows')).toContainText('Clinic A');
  await expect(page.locator('#result-rows')).toContainText('Clinic B');

  // The inspector states what the comparison is and is not.
  await page.locator('.react-flow__node').filter({hasText:'Compare level to elevation'}).click();
  await expect(page.locator('.inspector')).toContainText('comparison of two numbers');
  await expect(page.locator('.inspector')).toContainText('never be presented as a flood extent');
  await expect(page.locator('#slr-datum')).toHaveValue('MSL 1995-2014 (synthetic)');
  await expect(page.locator('#slr-elevation')).toHaveValue('elevation_m');

  // The extract's obligations are visible on its own node.
  await page.locator('.react-flow__node').filter({hasText:'AR6 extract'}).click();
  await expect(page.locator('.inspector')).toContainText('three citations obligatory');
  await expect(page.locator('#slr-baseline')).toHaveValue('1995-2014');

  // Receipts carry the pack's vocabulary, with the family and datum stated.
  await page.locator('[data-view="rules"]').click();
  const n3=await page.locator('#n3-preview').textContent();
  assert.match(n3,/slr:ProjectionExtract/);
  assert.match(n3,/slr:baselinePeriod "1995-2014"/);
  assert.match(n3,/slr:assignmentDistance/);
  assert.match(n3,/slr:datasetFamily slr:WithVerticalLandMotion/);
  assert.match(n3,/slr:elevationDatum "MSL 1995-2014 \(synthetic\)"/);
  assert.equal(/dcterms:bibliographicCitation/g.test(n3),true);
  await page.locator('[data-view="workflow"]').click();

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await expect(page.locator('#result-metrics')).toContainText('1 flagged for review');
  await page.screenshot({path:'test-results/sea-level-comparison.png',fullPage:true});
  assert.deepEqual(errors,[]);
});

test('the comparison refuses an unstated datum and a partial key',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  const noDatum=structuredClone(fixture);
  noDatum.nodes.find(n=>n.type==='slr_threshold_comparison').params.verticalDatum='';
  await upload(page,noDatum);
  await expect(page.locator('#toast')).toContainText('vertical datum');

  // A partial key is refused outright rather than quietly compared against nothing.
  const partialKey=structuredClone(fixture);
  partialKey.nodes.find(n=>n.type==='slr_threshold_comparison').params.family='';
  await upload(page,partialKey);
  await page.locator('#run-button').click().catch(()=>{});
  await expect(page.getByText(/Choose one family/)).toBeVisible({timeout:45000});
});
