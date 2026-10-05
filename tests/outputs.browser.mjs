import {chromium,expect} from '@playwright/test';
import {exampleWorkflow} from '../core.js';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const done=()=>expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
const run=async()=>{await page.locator('#run-button').click();await done();};
try{
  await page.goto('http://127.0.0.1:4173');await done();
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.locator('#map-panel')).toBeVisible();
  await page.getByRole('tab',{name:'Decision table'}).click();
  await expect(page.locator('#result-rows tr')).toHaveCount(8);
  await expect(page.locator('#table-panel')).toBeVisible();
  await page.getByRole('tab',{name:'Decision table'}).press('ArrowLeft');
  await expect(page.getByRole('tab',{name:'Outreach map'})).toBeFocused();
  await expect(page.locator('#map-panel')).toBeVisible();

  // Actual EYE inference on two independent branches, with shared geography.
  const w=exampleWorkflow();
  w.nodes.push({id:'criteria2',type:'policy',x:600,y:360,params:{thresholdKm:100}});
  w.edges.find(e=>e.to==='table').from='criteria2';
  w.edges.push({id:'e7',from:'nearest',to:'criteria2',port:'distances'},{id:'e8',from:'alert',to:'criteria2',port:'alert'});
  await page.locator('#workflow-file').setInputFiles({name:'branches.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await run();
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await page.getByRole('tab',{name:'Decision table'}).click();
  await expect(page.locator('#result-metrics .review b')).toHaveText('0');
  await page.locator('#result-rows tr').first().click();
  await expect(page.locator('#inspector-content')).toContainText('100 km');

  // Configure the output through the inspector, rerun, and remove it.
  await page.locator('.react-flow__node[data-id="table"]').click();
  await page.locator('#output-label').fill('Second map');await page.locator('#output-label').press('Tab');
  await page.locator('#output-view').selectOption('map');
  await expect(page.locator('#run-summary')).toContainText('Previous run');
  await run();
  await expect(page.getByRole('tab',{name:'Second map'})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#map-panel')).toBeVisible();
  await page.locator('#delete-node').click();await run();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByRole('tab',{name:'Outreach map'})).toHaveAttribute('aria-selected','true');

  await expect(page.locator('#offline-status')).toContainText('Available offline');
  await context.setOffline(true);await page.reload();await done();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await context.setOffline(false);
  await page.locator('#reset-button').click();await run();
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/output-tabs-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('tab',{name:'Decision table'}).click();
  await expect(page.locator('#table-panel')).toBeVisible();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile horizontal overflow');
  await page.screenshot({path:'test-results/output-tabs-mobile.png',fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('PASS: multi-output EYE execution, independent branch evidence, output settings/removal, keyboard tabs, offline reload, mobile layout.');
}finally{await browser.close();}
