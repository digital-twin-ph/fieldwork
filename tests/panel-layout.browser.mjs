import {test,expect} from '@playwright/test';

const size=async(page,selector,axis='width')=>(await page.locator(selector).boundingBox())[axis];
async function drag(page,id,dx,dy){const box=await page.locator(id).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:8});await page.mouse.up();}

test('panel dividers resize independently, persist offline, reset and preserve workflow results',async({page,context})=>{
  await page.goto('/');await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const library=await size(page,'.library'),inspector=await size(page,'.inspector'),results=await size(page,'.results-panel','height');
  await drag(page,'#resize-library',60,0);expect(await size(page,'.library')).toBeCloseTo(library+60,0);
  await drag(page,'#resize-inspector',-70,0);expect(await size(page,'.inspector')).toBeCloseTo(inspector+70,0);
  await drag(page,'#resize-results',0,-60);expect(await size(page,'.results-panel','height')).toBeCloseTo(results+60,0);
  await page.locator('#resize-results').press('ArrowDown');expect(await size(page,'.results-panel','height')).toBeCloseTo(results+50,0);
  await page.locator('[data-view="rules"]').click();expect(await size(page,'.results-panel','height')).toBeCloseTo(results+50,0);
  await page.locator('#expand-results').click();await expect(page.locator('#resize-results')).toBeHidden();await page.locator('#expand-results').click();
  expect(await size(page,'.results-panel','height')).toBeCloseTo(results+50,0);
  await expect(page.locator('#workflow-state')).toContainText('Run complete');await expect(page.locator('#result-metrics .review b')).toHaveText('5');
  await expect(page.locator('#offline-status')).toContainText('Available offline');await context.setOffline(true);await page.reload();
  expect(await size(page,'.library')).toBeCloseTo(library+60,0);expect(await size(page,'.inspector')).toBeCloseTo(inspector+70,0);
  expect(await size(page,'.results-panel','height')).toBeCloseTo(results+50,0);
  await page.locator('#reset-layout').click();expect(await size(page,'.library')).toBeCloseTo(library,0);expect(await size(page,'.results-panel','height')).toBeCloseTo(results,0);
  await page.locator('#resize-library').press('End');await page.locator('#resize-inspector').press('End');
  await page.setViewportSize({width:900,height:800});expect(await size(page,'.work-area')).toBeGreaterThanOrEqual(359);
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#resize-library')).toBeHidden();await expect(page.locator('#resize-results')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({width:1600,height:1100});await page.locator('#reset-layout').click();
  await page.screenshot({path:'test-results/resizable-panels.png',fullPage:true});
});

test('malformed preferences and unavailable storage do not block resizing; cancel restores size',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('fieldwork.panel-layout.v1','{"library":"bad","inspector":-999,"results":100000}');const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='fieldwork.panel-layout.v1')throw new Error('Storage unavailable');return set.call(this,k,v);};});
  await page.goto('/?example=blank');await page.locator('#reset-layout').click();
  const before=await size(page,'.library');await page.locator('#resize-library').press('ArrowRight');expect(await size(page,'.library')).toBeCloseTo(before+10,0);
  const box=await page.locator('#resize-library').boundingBox();await page.mouse.move(box.x+4,box.y+50);await page.mouse.down();await page.mouse.move(box.x+70,box.y+50);await page.keyboard.press('Escape');await page.mouse.up();
  expect(await size(page,'.library')).toBeCloseTo(before+10,0);await page.locator('#resize-library').dblclick();expect(await size(page,'.library')).toBeCloseTo(before,0);
});

test('widget panel collapses and workbench and Results each fill the viewport',async({page})=>{
  await page.goto('/?example=blank');
  const initial=await size(page,'.work-area');
  await page.locator('#toggle-library').click();
  await expect(page.locator('.library')).toBeHidden();
  await expect(page.locator('#toggle-library')).toHaveAttribute('aria-expanded','false');
  expect(await size(page,'.work-area')).toBeGreaterThan(initial);
  await page.locator('#toggle-library').click();
  await expect(page.locator('.library')).toBeVisible();
  await page.locator('#fullscreen-workbench').click();
  await expect(page.locator('#fullscreen-workbench')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.results-panel')).toBeHidden();
  expect(await size(page,'.work-area')).toBeCloseTo(page.viewportSize().width,0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.results-panel')).toBeVisible();
  await page.locator('#fullscreen-results').click();
  await expect(page.locator('#fullscreen-results')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.canvas-toolbar')).toBeHidden();
  expect(await size(page,'.results-panel')).toBeCloseTo(page.viewportSize().width,0);
  await page.locator('#fullscreen-results').click();
  await expect(page.locator('.canvas-toolbar')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#toggle-library').click();await expect(page.locator('.library')).toBeHidden();
  await page.locator('#fullscreen-results').click();expect(await size(page,'.results-panel')).toBeCloseTo(390,0);
  await page.keyboard.press('Escape');
});
