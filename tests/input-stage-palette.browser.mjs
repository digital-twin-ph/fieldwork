import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "On a blank canvas, all widgets are active, does not start with Study Area." -- the
// practitioner, 2026-10-15, reporting the absence of progressive reveal. Experiment 112 had
// dismissed two forms of it on the premise that the first placement was already handled by
// STARTER_TYPES; measured that day, a blank canvas offered 41 of 53, because addableTypes added
// ALWAYS_ADDABLE and the catchment types two lines after applying the starter set.
//
// The rule adopted is the practitioner's own, as they revised it: start with an input, and once
// an input exists everything is sensible. "Let's start with that assumption 7 and then reassess."
test('a canvas with no input offers the input stage, and everything after one is placed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');

  const entries=page.locator('#node-library [data-add]');
  await expect(entries).toHaveCount(5);
  // The input stage is seven by contract; `places` and `centers` are retired from the palette,
  // which is a separate decision and is applied after this one.
  for(const name of ['Study area','Point data','Tabular data','Street network','Heat alert'])
    await expect(page.locator('#node-library [data-add]').filter({hasText:name})).toHaveCount(1);
  // Nothing that needs something is offered yet.
  for(const name of ['Map','Buffer','Reproject'])
    await expect(page.locator('#node-library [data-add]').filter({hasText:name})).toHaveCount(0);

  // Place one input and the palette opens. The gate is "start with an input", not a running
  // filter: after that, judging what is sensible is the practitioner's.
  await page.locator('#node-library [data-add="study_area"]').click();
  await expect.poll(()=>entries.count(),{timeout:15000}).toBeGreaterThan(30);
  await expect(page.locator('#node-library [data-add="map_output"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('an example that already has inputs is not restricted',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect.poll(()=>page.locator('#node-library [data-add]').count(),{timeout:20000}).toBeGreaterThan(30);
  expect(errors).toEqual([]);
});
