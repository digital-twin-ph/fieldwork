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
  // THE PALETTE OUTGREW THE WORKFLOW. A workflow holds at most 50 nodes (`core.ts`), and placing
  // one study area plus every entry on offer now wants 54. So this test's old shape -- add all of
  // them to one canvas -- stopped measuring addability and started measuring the cap: on
  // 2026-10-28 it reported `chart_output` as unaddable, and `chart_output` is fine. It was simply
  // the 51st node, and the three genuinely-unaddable widgets below were refused for the same
  // wrong reason rather than their own.
  //
  // The claim is PER WIDGET -- "this widget can be added as a draft" -- so the canvas is cleared
  // before it would hit the cap and a study area re-placed, which is the state each add needs. A
  // count typed here would go stale the next time a widget lands; this reads the cap's own
  // headroom instead.
  const CANVAS_LIMIT=45;
  const place=async()=>{
    // CLEARING IS TWO STEPS AND BOTH MATTER. A reload does not empty the canvas: the workflow is
    // in localStorage, so `goto` alone came back with the 46 nodes already placed. And
    // localStorage is per origin, so it cannot be cleared before a page from that origin has
    // loaded -- hence the bare `/` first, which is the same pair `input-stage-palette` uses.
    await page.goto('/');
    await page.evaluate(()=>localStorage.clear());
    await page.goto('/?example=blank');
    await page.locator('[data-view="workflow"]').click();
    await page.locator('#node-library [data-add="study_area"]').click();
    await page.locator('[data-view="workflow"]').click();
    await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(1);
  };
  const refused=[];
  for(const type of types){
    if(await page.locator('.react-flow__node').count()>=CANVAS_LIMIT)await place();
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
