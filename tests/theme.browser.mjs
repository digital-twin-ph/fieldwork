import {test,expect} from './fixtures.mjs';

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

  await expect(page.locator('#offline-status')).toHaveAttribute('data-state','ready',{timeout:45000});
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
  // Polled, not read once: WebKit in CI read the light surface in the instant after choosing (0.166.0).
  await expect.poll(async()=>(await resolved(page)).surface,{message:'the choice applies even when it cannot be stored'}).toBe(DARK_SURFACE);
  await expect(page.locator('.toast')).toContainText('would not store the theme');
  await context.close();
});

/** HIGH CONTRAST (2026-11-26): black on white whatever the device, kept across a reload; Match device takes it on a light
 *  device asking for more contrast, and a dark device asking for more keeps Dark. */
test('high contrast is black on white, kept, and taken by Match device on a light device asking for more contrast',async({browser})=>{
  const WHITE='rgb(255, 255, 255)',BLACK='rgb(0, 0, 0)';
  const context=await browser.newContext({colorScheme:'dark'});
  const page=await context.newPage();
  await page.goto('/?example=blank');
  await expect(page.locator('#theme-select option[value="contrast"]')).toHaveText('High contrast');
  await page.locator('#theme-select').selectOption('contrast');
  expect(await resolved(page)).toEqual({attribute:'contrast',surface:WHITE,text:BLACK});
  await page.reload();
  await expect(page.locator('#theme-select')).toHaveValue('contrast');
  expect((await resolved(page)).surface,'a dark device does not take over an explicit choice').toBe(WHITE);
  await context.close();
  for(const [scheme,expected] of [['light',WHITE],['dark',DARK_SURFACE]]){
    const asks=await browser.newContext({colorScheme:scheme,contrast:'more'});
    const p=await asks.newPage();
    await p.goto('/?example=blank');
    await expect(p.locator('#theme-select')).toHaveValue('device');
    expect((await resolved(p)).surface,`${scheme} device asking for more contrast`).toBe(expected);
    // THE PALETTE'S TONES TOO (PR 6's review, 2026-11-26): Street network's icon stayed blue on a tint, at 3.64:1.
    if(scheme==='light'){
      const icon=async()=>p.locator('.palette-node.blue .palette-icon').first().evaluate(e=>{const s=getComputedStyle(e);return [s.color,s.backgroundColor];});
      await expect(p.locator('.palette-node.blue .palette-icon').first()).toBeAttached();
      const matched=await icon();
      await p.locator('#theme-select').selectOption('contrast');
      expect(matched,'Match device colours a palette icon as High contrast does').toEqual(await icon());
      expect(matched[1]).toBe(WHITE);
    }
    await asks.close();
  }
});
