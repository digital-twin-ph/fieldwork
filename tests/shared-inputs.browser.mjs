import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {exampleWorkflow} from '../build/core.js';
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
test('legacy heat inputs use shared editors, preserve labels and save attributes offline',async({page,context})=>{
  await page.goto('/?example=blank');
  const legacy=exampleWorkflow();legacy.nodes[0].type='places';legacy.nodes[1].type='centers';
  await page.locator('#workflow-file').setInputFiles({name:'legacy-heat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await expect(page.locator('[data-add="places"]')).toHaveCount(0);
  await expect(page.locator('[data-add="centers"]')).toHaveCount(0);
  await expect(page.locator('[data-add="observations"]')).toHaveCount(1);
  for(const [id,record] of [['neighborhoods','oakwood'],['centers','library']]){
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await page.locator('#edit-input-data').click();
    await expect(page.locator('#input-mode option')).toHaveCount(5);
    await page.locator('#input-mode').selectOption('pins');
    await page.locator('#pins-online').uncheck();
    await page.locator('#pin-record').selectOption(record);
    await page.locator('#pin-pair-key').fill('review_note');
    await page.locator('#pin-pair-value').fill('Retained');
    await page.locator('#input-apply').click();
    await expect(page.locator('#input-dialog')).not.toBeVisible();
  }
  const w=await saved(page);
  assert.deepEqual(w.nodes.slice(0,2).map(n=>[n.type,n.params.label,n.params.data.features[0].properties.review_note]),[['observations','Neighborhoods','Retained'],['observations','Cooling centers','Retained']]);
  assert.deepEqual(w.edges,legacy.edges);
  await expect(page.locator('#offline-status')).toContainText('Available offline');
  await context.setOffline(true);await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  assert.deepEqual((await saved(page)).nodes,w.nodes);
});
