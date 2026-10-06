import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exampleWorkflow} from '../build/core.js';
test('shared output modes migrate legacy views, recover with Undo and preserve evidence offline',async({page,context})=>{
  const w=exampleWorkflow();for(const n of w.nodes.filter(n=>['map_output','table_output'].includes(n.type))){const view=n.type==='map_output'?'map':'table';n.type='output';n.params={label:n.params.label,view};}
  await page.goto('/?example=blank');await page.locator('#workflow-file').setInputFiles({name:'legacy-output.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  const run=async()=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});};
  await run();await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await page.locator('.react-flow__node[data-id="map"]').click();
  await expect(page.locator('#output-input-mode')).toHaveValue('decisions');await expect(page.locator('#map-decisions')).toHaveValue('criteria');await expect(page.locator('#add-point-input')).toHaveCount(0);
  await page.locator('#output-input-mode').selectOption('spatial');await expect(page.locator('#map-area')).toHaveValue('');await expect(page.locator('#add-point-input')).toBeVisible();
  await page.locator('#undo-button').click();await expect(page.locator('#map-decisions')).toHaveValue('criteria');
  await page.locator('#output-view').selectOption('table');await expect(page.locator('#table-decisions')).toHaveValue('criteria');
  await page.locator('#output-view').selectOption('map');await expect(page.locator('#map-decisions')).toHaveValue('criteria');await run();
  await page.locator('[data-view="rules"]').click();const pending=page.waitForEvent('download');await page.locator('#download-evidence').click();const receipt=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  assert.equal(receipt.workflow.nodes.find(n=>n.id==='map').type,'map_output');assert.equal(receipt.workflow.nodes.find(n=>n.id==='table').type,'table_output');
  assert.deepEqual(receipt.outputs[0].rows,receipt.outputs[1].rows);
  assert.equal(receipt.receipts.filter(r=>r.kind==='presentation').length,2);
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
});
