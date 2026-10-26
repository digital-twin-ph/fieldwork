import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// Every widget offered by the palette must be addable as an unconfigured draft. Validating a
// node's full contract on every edit makes it impossible to add at all, and change() rolls the
// workflow back, so the canvas appears to ignore the click. Experiment 48 recorded this; three
// widgets added on 2026-10-09 repeated it.
test('every palette entry can be added to a blank canvas as a draft',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  // A canvas with no input offers the input stage alone, from 2026-10-15. Place one, which is
  // what the rule asks of a practitioner, and then every entry on offer must be addable -- which
  // is what this test is about.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.locator('[data-view="workflow"]').click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(1);
  const types=await page.locator('#node-library [data-add]').evaluateAll(
    els=>els.map(e=>e.dataset.add));
  expect(types.length).toBeGreaterThan(5);
  const refused=[];
  for(const type of types){
    const before=await page.locator('.react-flow__node').count();
  await page.locator('[data-view="workflow"]').click();
    await page.locator(`#node-library [data-add="${type}"]`).click();
  await page.locator('[data-view="workflow"]').click();
    await expect.poll(()=>page.locator('.react-flow__node').count()).toBeGreaterThanOrEqual(before);
    if(await page.locator('.react-flow__node').count()===before)refused.push(type);
  }
  // Widgets that validate their full contract on every edit cannot be added from the palette at
  // all, and are reachable only from a template that already contains them. That is why it went
  // unnoticed. Recorded here so the set cannot grow; see TODO.md.
  //
  // THREE SINCE 2026-10-26, down from four: slr_extract_import retired into apply_ruleset with
  // the extract-contract ruleset. The first time this list has shrunk, and it shrank because a
  // widget left rather than because one was fixed -- which still counts, since a widget nobody
  // can add is one nobody can use.
  const known=['slr_threshold_comparison','rate','case_series'];
  expect(refused.filter(t=>!known.includes(t)),
    'these palette entries could not be added as drafts').toEqual([]);
  expect(refused.sort(),'the known-unaddable set must shrink, never grow').toEqual([...known].sort());
  expect(errors).toEqual([]);
});
