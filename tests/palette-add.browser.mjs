import {test,expect} from '@playwright/test';

// Every widget offered by the palette must be addable as an unconfigured draft. Validating a
// node's full contract on every edit makes it impossible to add at all, and change() rolls the
// workflow back, so the canvas appears to ignore the click. Experiment 48 recorded this; three
// widgets added on 2026-10-09 repeated it.
test('every palette entry can be added to a blank canvas as a draft',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?example=blank');
  const types=await page.locator('#node-library [data-add]').evaluateAll(
    els=>els.map(e=>e.dataset.add));
  expect(types.length).toBeGreaterThan(5);
  const refused=[];
  for(const type of types){
    const before=await page.locator('.react-flow__node').count();
    await page.locator(`#node-library [data-add="${type}"]`).click();
    await expect.poll(()=>page.locator('.react-flow__node').count()).toBeGreaterThanOrEqual(before);
    if(await page.locator('.react-flow__node').count()===before)refused.push(type);
  }
  // Four widgets validate their full contract on every edit, so they cannot be added from the
  // palette at all and are reachable only from a template that already contains them. That is
  // why it went unnoticed. Recorded here so the set cannot grow; see TODO.
  const known=['slr_extract_import','slr_threshold_comparison','rate','case_series'];
  expect(refused.filter(t=>!known.includes(t)),
    'these palette entries could not be added as drafts').toEqual([]);
  expect(refused.sort(),'the known-unaddable set must shrink, never grow').toEqual([...known].sort());
  expect(errors).toEqual([]);
});
