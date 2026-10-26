import {test,expect} from '@playwright/test';
import {exampleWorkflow} from '../build/core.js';
import {mkdir} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';
test("Independent result branches, tabs and offline inference",async({page,context})=>{
const errors=collectPageErrors(page);
const done=()=>expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
const run=async()=>{await page.locator('#run-button').click();await done();await page.locator('[data-view="results"]').click();};
  await page.goto('/');await done();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map-panel')).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Decision table'}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows tr')).toHaveCount(8);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#table-panel')).toBeVisible();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Decision table'}).press('ArrowLeft');
  // No tab click between the keypress and the assertion: clicking the view tab takes the focus
  // this is about.
  await expect(page.getByRole('tab',{name:'Outreach map'})).toBeFocused();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map-panel')).toBeVisible();

  // Actual EYE inference on two independent branches, with shared geography.
  const w=exampleWorkflow();
  // A second branch built the way the example's own first one is. It was a `policy` node with a
  // thresholdKm and an edge from an `alert` widget; `policy` was retired on 2026-10-12 and
  // `alert` on 2026-10-25, so the branch now pins the same ruleset at a different threshold and
  // states the condition on the node, which is where a declared fact lives.
  const criteria=w.nodes.find(n=>n.id==='criteria');
  w.nodes.push({...structuredClone(criteria),id:'criteria2',x:600,y:360,
    params:{...structuredClone(criteria.params),label:'Outreach criteria at 100 km',
      parameters:{threshold:100}}});
  w.edges.find(e=>e.to==='table').from='criteria2';
  w.edges.push({id:'e7',from:'nearest',to:'criteria2',port:'distances'});
  await page.locator('#workflow-file').setInputFiles({name:'branches.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await run();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Decision table'}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics .review b')).toHaveText('0');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-rows tr').first().click();
  await expect(page.locator('#inspector-content')).toContainText('100 km');

  // Configure the output through the inspector, rerun, and remove it.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="table"]').click();
  await page.locator('#table-label').fill('Second map');await page.locator('#table-label').press('Tab');
  await page.locator('#output-view').selectOption('map');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#run-summary')).toContainText('Previous run');
  await run();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab',{name:'Second map'})).toHaveAttribute('aria-selected','true');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map-panel')).toBeVisible();
  await page.locator('#delete-node').click();await run();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab',{name:'Outreach map'})).toHaveAttribute('aria-selected','true');

  await expect(page.locator('#offline-status')).toContainText('Available offline');
  await context.setOffline(true);await page.reload();await done();
  await page.locator('[data-view="results"]').click();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await context.setOffline(false);
  await page.locator('#reset-button').click();await run();
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/output-tabs-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Decision table'}).click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#table-panel')).toBeVisible();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile horizontal overflow');
  await page.screenshot({path:'test-results/output-tabs-mobile.png',fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('PASS: multi-output EYE execution, independent branch evidence, output settings/removal, keyboard tabs, offline reload, mobile layout.');
});
