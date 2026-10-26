import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/sea-level-workflow-2026-10-09.json',import.meta.url),'utf8'));
const upload=(page,w)=>page.locator('#workflow-file').setInputFiles({name:'sea-level.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});};

test('the sea-level workflow runs, states its refusals and replays offline',async({page,context})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await upload(page,fixture);
  await run(page);

  // Clinic A: 0.77 m projected against 0.90 m supplied, so it stays below. Clinic B: 0.58 against
  // 0.40, so it reaches. The unlocated clinic has no site and therefore no comparison.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('1 flagged for review');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('1 no flag');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('1 insufficient data');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows')).toContainText('Clinic A');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows')).toContainText('Clinic B');

  // The inspector states what the comparison is and is not.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Compare level to elevation'}).click();
  await expect(page.locator('.inspector')).toContainText('comparison of two numbers');
  await expect(page.locator('.inspector')).toContainText('never be presented as a flood extent');
  await expect(page.locator('#slr-datum')).toHaveValue('MSL 1995-2014 (synthetic)');
  await expect(page.locator('#slr-elevation')).toHaveValue('elevation_m');

  // THE EXTRACT'S OBLIGATIONS ARE STILL VISIBLE ON ITS OWN NODE, which is the claim this test
  // has always made. What changed on 2026-10-26 is which node: `slr_extract_import` was retired
  // into `apply_ruleset` with the extract-contract ruleset, so the obligation is declared data
  // carried by the ruleset rather than parameters typed into a widget named for one dataset.
  // The three citations are the dataset authors' requirement of a user, and experiment 140 makes
  // telling the user how to meet it an obligation on whoever shares the ruleset.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Published projection extract'}).click();
  await expect(page.locator('.inspector')).toContainText('What this obliges you to');
  await expect(page.locator('.inspector')).toContainText('citing three sources');
  // How to meet it, and what happens otherwise -- both stated before the error rather than by it.
  await expect(page.locator('.inspector')).toContainText('How to acknowledge it');
  await expect(page.locator('.inspector')).toContainText('no output');

  // Receipts carry the pack's vocabulary, with the family and datum stated.
  await page.locator('[data-view="rules"]').click();
  const n3=await page.locator('#n3-preview').textContent();
  // THE DATASET'S PROVENANCE MOVED, AND IMPROVED. It was `slr:ProjectionExtract` with
  // `slr:baselinePeriod`, emitted by a widget named for one dataset from parameters somebody
  // typed. It is now the ruleset's own basis: standard vocabulary, pinned by id AND version, and
  // every citation a DOI a reader can open rather than a string they must take on trust. That is
  // the whole claim of experiment 140 -- "the citations are also DOIs, so when transmitted and
  // embedded in the output they are independently verifiable".
  assert.match(n3,/<urn:fieldwork:ruleset:extract-contract> a fw:Ruleset, prov:Plan/);
  assert.match(n3,/dcterms:hasVersion "1\.0\.0"/);
  assert.match(n3,/dcterms:source <https:\/\/doi\.org\/10\.1017\/9781009157896\.011>/);
  assert.match(n3,/dcterms:source <https:\/\/doi\.org\/10\.5281\/zenodo\.5914709>/);
  assert.match(n3,/slr:assignmentDistance/);
  assert.match(n3,/slr:datasetFamily slr:WithVerticalLandMotion/);
  assert.match(n3,/slr:elevationDatum "MSL 1995-2014 \(synthetic\)"/);
  // All three the licence obliges, each resolvable. `dcterms:bibliographicCitation` stood here
  // and was emitted by the retired extract widget as free text a reader could only read, never
  // follow; three DOIs is the stronger claim and the one the authors' requirement actually asks
  // for -- an audience can check them without trusting this application or the practitioner.
  assert.equal((n3.match(/dcterms:source <https:\/\/doi\.org\//g)||[]).length,3);
  await page.locator('[data-view="workflow"]').click();

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
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
