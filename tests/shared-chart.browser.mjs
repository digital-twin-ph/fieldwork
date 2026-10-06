import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {exampleWorkflow} from '../build/core.js';

test('shared Chart supports migration, source selection, view switching, evidence and offline reload',async({page,context})=>{
  const w=exampleWorkflow();w.nodes.push({id:'chart',type:'output',x:850,y:420,params:{label:'Legacy counts',view:'bars'}});
  w.edges.push({id:'chart-edge',from:'criteria',to:'chart',port:'decisions'});
  await page.goto('/?example=blank');await page.locator('#workflow-file').setInputFiles({name:'chart.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  const run=async()=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});};
  await run();await expect(page.locator('[data-add="chart_output"]')).toBeVisible();await expect(page.locator('[data-add="output"]')).toHaveCount(0);
  await expect(page.locator('.react-flow__node[data-id="chart"]')).toContainText('Reasoning result');
  await expect(page.locator('.react-flow__node[data-id="map"]')).toContainText('Reasoning result');
  await page.getByRole('tab',{name:'Legacy counts'}).click();await expect(page.locator('#bars-panel .bar-row').filter({hasText:'Review'}).locator('b')).toHaveText('5');
  await page.locator('.react-flow__node[data-id="chart"]').click();await expect(page.locator('#chart-decisions')).toHaveValue('criteria');
  await page.locator('#output-label').fill('Decision counts');await page.locator('#output-label').press('Tab');
  await page.locator('#chart-decisions').selectOption('');await page.locator('#chart-decisions').selectOption('criteria');
  await page.locator('#output-view').selectOption('table');await expect(page.locator('#table-decisions')).toHaveValue('criteria');
  await page.locator('#output-view').selectOption('bars');await expect(page.locator('#chart-decisions')).toHaveValue('criteria');await run();
  await page.getByRole('tab',{name:'Decision counts'}).click();await expect(page.locator('#bars-panel')).toContainText('8 records');
  await page.locator('[data-view="rules"]').click();const pending=page.waitForEvent('download');await page.locator('#download-evidence').click();
  const receipt=JSON.parse(await readFile(await (await pending).path(),'utf8'));
  assert.equal(receipt.workflow.nodes.find(n=>n.id==='chart').type,'chart_output');
  const output=receipt.outputs.find(o=>o.nodeId==='chart');assert.equal(output.chart.bins.reduce((n,b)=>n+b.count,0),8);
  assert.match(receipt.receipts.find(r=>r.nodeId==='chart').facts,/CategoricalCount/);
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.getByRole('tab',{name:'Decision counts'}).click();await expect(page.locator('#bars-panel')).toContainText('8 records');
});
