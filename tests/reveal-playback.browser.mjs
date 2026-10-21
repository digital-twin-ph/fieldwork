import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// Progressive reveal, played back over a worked example one widget at a time -- the practitioner's
// own description: like running a notebook from the first cell, except that everything happens on
// a highly abstracted canvas. Experiment 112, and the stage between proposing a rule and
// enforcing it.
test('a worked example replays widget by widget, and the palette follows',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-extent&playback=1');
  await expect(page.locator('#playback-bar')).toBeVisible({timeout:45000});
  // The example auto-runs on load. Every canvas draw goes through the playback filter now, so a
  // run underneath it is harmless -- but waiting for it makes a failure here mean what it says
  // rather than meaning the run was still going. This failed in CI and nowhere else until the
  // run's own canvas updates were routed through the same filter.
  await expect(page.locator('body')).toContainText('Complete in',{timeout:45000});

  // Step 0: an empty canvas. Only the widgets that need no input are offered.
  await expect(page.locator('#playback-step')).toHaveText('Step 0 of 9');
  await expect(page.locator('#playback-reason')).toContainText('offers only the widgets that need no input');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  const atStart=await page.locator('.palette-node:not(.unrevealed)').count();
  expect(atStart,'something must be addable on an empty canvas').toBeGreaterThan(0);
  expect(await page.locator('.palette-node.unrevealed').count(),
    'and most of the palette must not be').toBeGreaterThan(atStart);

  // Step 1 places the death locations, which emit points.
  await page.locator('#playback-next').click();
  await expect(page.locator('#playback-step')).toHaveText('Step 1 of 9');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.locator('#playback-reason')).toContainText('emits points');
  const afterPoints=await page.locator('.palette-node:not(.unrevealed)').count();
  expect(afterPoints,'points reveal more than an empty canvas').toBeGreaterThan(atStart);

  // The count in the library heading says how far through the palette the rule has got.
  await expect(page.locator('#library-count')).toContainText(' of ');

  // Stepping back puts it exactly where it was: the playback is a view, not an edit.
  await page.locator('#playback-back').click();
  await expect(page.locator('#playback-step')).toHaveText('Step 0 of 9');
  expect(await page.locator('.palette-node:not(.unrevealed)').count()).toBe(atStart);

  // Run it forward to the end: every node of the example arrives, in an order the rule allows.
  for(let step=0;step<9;step++)await page.locator('#playback-next').click();
  await expect(page.locator('#playback-step')).toHaveText('Step 9 of 9');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await expect(page.locator('#playback-next')).toBeDisabled();

  // Leaving restores the canvas and the ordinary palette, with nothing dimmed.
  await page.locator('#playback-exit').click();
  await expect(page.locator('#playback-bar')).toBeHidden();
  await expect(page.locator('.palette-node.unrevealed')).toHaveCount(0);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  expect(errors).toEqual([]);
});

test('the playback changes nothing that is saved',async({page})=>{
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const before=await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'));
  await page.goto('/?example=snow-extent&playback=1');
  await expect(page.locator('#playback-bar')).toBeVisible({timeout:45000});
  for(let step=0;step<4;step++)await page.locator('#playback-next').click();
  await expect(page.locator('#playback-step')).toHaveText('Step 4 of 9');
  const during=await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'));
  expect(JSON.parse(during).nodes.length,'the saved workflow keeps every node').toBe(JSON.parse(before).nodes.length);
});

// "I thought we implemented progressive reveal in worked examples" -- the practitioner,
// 2026-10-15, having asked for it twice. It was implemented, and only reachable by typing
// ?playback=1, which is the same failure in a smaller form: the instrument that refines the rule
// existed and nobody could find it. It is in the workspace bar now, and it still changes nothing
// about the ordinary palette, because the rule is not adopted.
test('the playback is reachable without typing a query parameter',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#playback-bar')).toBeHidden();
  // The ordinary palette is untouched until it is asked for.
  const dimmed=()=>page.locator('#node-library [data-add].unrevealed').count();
  expect(await dimmed()).toBe(0);

  await page.locator('#playback-start').click();
  await expect(page.locator('#playback-bar')).toBeVisible();
  await expect(page.locator('#playback-step')).toContainText('Step 0 of');
  expect(await dimmed()).toBeGreaterThan(0);

  // And the same button leaves, restoring the canvas and the palette.
  await page.locator('#playback-start').click();
  await expect(page.locator('#playback-bar')).toBeHidden();
  expect(await dimmed()).toBe(0);
});
