import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const legacy=JSON.parse(await readFile(new URL('./fixtures/old-naledi-source-2026-10-06.json',import.meta.url),'utf8'));
test('Old Naledi migration exposes editable source and selection consumes saved changes offline',async({page,context})=>{
  // Loads the CURRENT example rather than the 2026-10-06 legacy file this test used to upload.
  // That file holds an `access` node, which was retired on 2026-10-12 and cannot be replaced by one
  // widget, so the workflow now refuses to open naming the widget -- which is the practitioner's own
  // rule and is asserted at tests/facility-inputs.test.mjs. What this test is actually about -- an
  // editable shared source, and a selection consuming saved changes offline -- is unchanged and is
  // exercised here against the example that ships.
  await page.goto('/?example=old-naledi');
  const run=async()=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});};
  await run();await expect(page.locator('#result-metrics .review b')).toHaveText('21');
  const w=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const source=w.nodes.find(n=>n.type==='observations');
  const marina=source.params.data.features.find(f=>f.properties.name==='Princess Marina Hospital');
  assert.equal(source.params.data.features.length,214);
  await page.locator(`.react-flow__node[data-id="${source.id}"]`).click();await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('pins');await page.locator('#pins-online').uncheck();
  await page.locator('#pin-record').selectOption(marina.id);await page.locator('#pin-delete').click();await page.locator('#input-apply').click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();
  // `access` was decomposed on 2026-10-12; the eligibility narrowing is a filter condition on
  // the nearest search now, authored as a value set over the candidates' own attributes.
  await page.locator('.react-flow__node[data-id="access"]').click();
  await page.locator('#filter-values-0').fill('Direct');await page.locator('#filter-values-0').press('Tab');
  await run();await expect(page.locator('#result-metrics .unknown b')).toHaveText('21');
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});await expect(page.locator('#result-metrics .unknown b')).toHaveText('21');
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  assert.equal(after.nodes.find(n=>n.id===source.id).params.data.features.length,213);
  assert.equal(after.nodes.filter(n=>n.type==='observations').length,1);
});
