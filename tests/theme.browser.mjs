import {test,expect} from '@playwright/test';

// A custom property reads back as its declared text, which for an alias is "var(--surface-1)".
// Asserting the rendered colour tests what a reader actually sees.
const LIGHT_SURFACE='rgb(246, 247, 243)',DARK_SURFACE='rgb(19, 25, 23)';
const resolved=page=>page.evaluate(()=>({
  attribute:document.documentElement.getAttribute('data-theme'),
  surface:getComputedStyle(document.body).backgroundColor,
  text:getComputedStyle(document.body).color}));

test('a first visit follows the device, in both directions',async({browser})=>{
  for(const [scheme,expected] of [['dark',DARK_SURFACE],['light',LIGHT_SURFACE]]){
    const context=await browser.newContext({colorScheme:scheme});
    const page=await context.newPage();
    await page.goto('/?example=blank');
    await expect(page.locator('#theme-select')).toHaveValue('device');
    const state=await resolved(page);
    expect(state.attribute).toBe('device');
    expect(state.surface).toBe(expected);
    await context.close();
  }
});

test('an explicit choice wins over the device, persists, and survives an offline reload',async({browser})=>{
  const context=await browser.newContext({colorScheme:'dark'});
  const page=await context.newPage();
  await page.goto('/?example=blank');
  expect((await resolved(page)).surface).toBe(DARK_SURFACE);

  await page.locator('#theme-select').selectOption('light');
  const light=await resolved(page);
  expect(light.attribute).toBe('light');
  expect(light.surface,'an explicit light choice must beat a dark device').toBe(LIGHT_SURFACE);

  await page.reload();
  await expect(page.locator('#theme-select')).toHaveValue('light');
  expect((await resolved(page)).surface).toBe(LIGHT_SURFACE);

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#theme-select')).toHaveValue('light');
  expect((await resolved(page)).surface).toBe(LIGHT_SURFACE);
  await context.close();
});

test('node colours stay distinguishable in dark, and are not the light values',async({browser})=>{
  const context=await browser.newContext({colorScheme:'light'});
  const page=await context.newPage();
  await page.goto('/?example=blank');
  const tones=async()=>page.evaluate(()=>['blue','teal','purple','amber','green'].map(name=>{
    const probe=document.createElement('span');probe.className=name;document.body.append(probe);
    const tone=getComputedStyle(probe).getPropertyValue('--tone').trim();probe.remove();return tone;}));
  const lightTones=await tones();
  await page.locator('#theme-select').selectOption('dark');
  const darkTones=await tones();
  expect(new Set(darkTones).size).toBe(5,'the five node roles must stay told apart in dark');
  for(let i=0;i<5;i++)expect(darkTones[i]).not.toBe(lightTones[i],'dark must not reuse a light tone');
  await page.screenshot({path:'test-results/theme-dark.png',fullPage:false});
  await page.locator('#theme-select').selectOption('light');
  await page.screenshot({path:'test-results/theme-light.png',fullPage:false});
  await context.close();
});

test('a storage failure still applies the theme for this session',async({browser})=>{
  const context=await browser.newContext({colorScheme:'light'});
  const page=await context.newPage();
  await page.addInitScript(()=>{const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==='fieldwork.theme.v1')throw new Error('Storage unavailable');return set.call(this,k,v);};});
  await page.goto('/?example=blank');
  await page.locator('#theme-select').selectOption('dark');
  expect((await resolved(page)).surface,'the choice applies even when it cannot be stored').toBe(DARK_SURFACE);
  await expect(page.locator('.toast')).toContainText('would not store the theme');
  await context.close();
});
