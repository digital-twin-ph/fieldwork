import {test,expect} from './fixtures.mjs';
import {openFixture} from './open-fixture.mjs';
import {collectPageErrors} from './page-errors.mjs';

// "I cannot make sense of the green error dialog because I cannot see the columns against which
// rules are made." -- the practitioner, 2026-10-15. An input's Inspector listed twelve record
// NAMES and nothing else, while the ruleset next door asked which column meant which field.
test('an input shows its records as columns and rows, and as the JSON they are',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await openFixture(page,'rulesets-workflow.json');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:45000});

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="buildings"]').click();
  const table=page.locator('.record-table');
  await expect(table).toBeVisible();
  // Every column a rule could read, named as the records name it.
  await expect(table.locator('th')).toHaveText(['#','name','DEATHS','FID']);
  await expect(table.locator('tbody tr')).toHaveCount(10);

  // How many rows to show is a control, not a fixed twelve.
  await page.selectOption('[data-records-rows]','50');
  await expect(table.locator('tbody tr')).toHaveCount(50);

  // And the JSON, because a rule reads what is actually there: a null, a number written as
  // text, a key nobody expected. Snow's locations happen to carry none of those -- the example
  // invents no records -- so this asserts the view, not a defect in his data.
  await page.locator('[data-records-view="json"]').click();
  await expect(page.locator('.record-json')).toContainText('"DEATHS"');
  await expect(page.locator('.record-table')).toHaveCount(0);

  // None of this is part of the workflow: it is how somebody is looking, not what is computed.
  const saved=await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1'));
  expect(saved).not.toContain('records-view');
  expect(errors).toEqual([]);
});

// A stopped run used to arrive in the same green as "Complete in 280 ms", and faded after five
// seconds whether or not it had been read.
test('a stopped run is reported as a failure, and stays until it is closed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await openFixture(page,'rulesets-workflow.json');
  // The run state, not the toast's text: the toast says "Complete in" the moment it appears,
  // which is before the canvas has settled, and clicking a node then races the layout.
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const toast=page.locator('#toast');
  await expect(toast).not.toHaveClass(/failure/);
  // This example's first run reports records it could not read, and that notice stays until it
  // is closed -- which is what it is for, and it sits over the canvas. Close it before reaching
  // past it, the way a practitioner would.
  if(await toast.locator('button').count())await toast.locator('button').click();
  await expect(toast).not.toHaveClass(/visible/);

  // Take the unit off a field the rules compare, which the run refuses by name.
  await page.locator('[data-view="workflow"]').click();
  // The rules dialog refuses to apply a number without its unit (experiment 186), so the unit is taken off the saved
  // workflow, as an older file or another tool could leave it, and the run must refuse it by name.
  await page.evaluate(()=>{const key='fieldwork-workflow-v1',w=JSON.parse(localStorage.getItem(key));
    const f=w.nodes.find(n=>n.id==='gap-day').params.authored.fields.find(x=>x.kind==='number');delete f.unit;delete f.unitLabel;
    delete w.manifest;localStorage.setItem(key,JSON.stringify(w));});
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText(/Run (complete|failed)/,{timeout:45000});
  if(await toast.locator('button').count())await toast.locator('button').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await expect(toast).toHaveClass(/failure/,{timeout:20000});
  await expect(toast).toContainText('states no unit');
  await expect(page.locator('#workflow-state')).toHaveText('Run failed');

  // Still there well after a success would have gone.
  await page.waitForTimeout(6000);
  await expect(toast).toHaveClass(/visible/);
  await toast.locator('button').click();
  await expect(toast).not.toHaveClass(/visible/);
  expect(errors).toEqual([]);
});

// "we must surface the issue on the widget as a toast message that I can then read and close.
// This not only tests the boundary cases but also how the widget surfaces the issue for the
// user to act on." -- the practitioner, 2026-10-16. So this asserts the surfacing, not the
// conclusions: those are checked against the real engine in tests/ruleset-example.test.mjs.
test('records the rules cannot read are surfaced, and the notice can be read and closed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await openFixture(page,'rulesets-workflow.json');

  // The run SUCCEEDED, so this is not a failure and must not be dressed as one. It is also not
  // the success line: what matters is not that it finished.
  const toast=page.locator('#toast');
  await expect(toast).toHaveClass(/warning/,{timeout:45000});
  await expect(toast).not.toHaveClass(/failure/);
  await expect(toast).toContainText('63 records could not be read as declared, and 3 records have no value');
  // It names the steps, because opening one is the next thing to do.
  await expect(toast).toContainText('over a table with gaps');
  await expect(toast).toContainText('over counts it cannot read');

  // Still there well after a success toast would have faded: a notice you are given five
  // seconds to read is a notice somebody decided you did not need.
  await page.waitForTimeout(6000);
  await expect(toast).toHaveClass(/visible/);
  await toast.locator('button').click();
  await expect(toast).not.toHaveClass(/visible/);

  // And the step carries the same finding, with the detail the toast has no room for.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="text-building"]').click();
  await expect(page.locator('.inspector-alert').first()).toContainText('Read as not recorded');
  await expect(page.locator('.inspector-alert').first()).toContainText('63 records the rules could not read');
  // The whole warning, in its dialog (2026-11-12): the columns fell off the Inspector.
  await page.locator('#alert-details').click();
  const alert=page.locator('#alert-dialog');
  await expect(alert.locator('thead')).toContainText('Column');
  // Which column, and that this is NOT the same as a value nobody collected.
  await expect(alert).toContainText('DEATHS');
  await expect(alert).toContainText('Not the declared kind');
  // Advice that fits what was found: the catchment advice used to be appended to every alert.
  await expect(alert).toContainText('Correct the column at its source');
  await expect(alert).not.toContainText('street network');
  await alert.locator('#config-cancel').click();

  // The other step reports the other problem, in its own terms.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="gap-day"]').click();
  await page.locator('#alert-details').click();
  await expect(page.locator('#alert-dialog')).toContainText('No value');
  expect(errors).toEqual([]);
});

// "For a failing widget do we get a red glow for it to draw attention aside from the toast?" --
// the practitioner, 2026-10-16. The honest answer was no, and worse: the step that failed kept
// the RUNNING state for ever, because `onProgress(id,'done')` is the last line of the loop body
// and a throw skips it. The canvas showed the one widget that had stopped as the one still
// working.
test('a failing widget glows red, and is told apart from one that merely found something',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await openFixture(page,'rulesets-workflow.json');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const toast=page.locator('#toast');
  if(await toast.locator('button').count())await toast.locator('button').click();

  const node=id=>page.locator(`.react-flow__node[data-id="${id}"] .node`);
  // A step that found something on a run that COMPLETED is amber, not red: there is a result,
  // and part of it needs reading differently.
  await expect(node('text-building')).toHaveClass(/alerting/);
  await expect(node('text-building')).not.toHaveClass(/failed/);

  // WHILE ITS PULSE RUNS, an alerting step is amber, not red: the keyframes once carried one colour for both states, so
  // an alerting node rendered red for four seconds. Measured now, on the run that completed, while it pulses.
  const ring=id=>node(id).evaluate(e=>getComputedStyle(e).boxShadow);
  expect(await ring('text-building')).toMatch(/rgb\(177, 118, 55\)/);
  const amber=await node('text-building').evaluate(e=>getComputedStyle(e).borderColor);

  // Break one step: take the unit off the field its rules compare. The rules dialog refuses to apply that (experiment
  // 186), so it is taken off the saved workflow, as an older file could leave it, and the run must refuse it by name.
  await page.evaluate(()=>{const key='fieldwork-workflow-v1',w=JSON.parse(localStorage.getItem(key));
    const f=w.nodes.find(n=>n.id==='gap-day').params.authored.fields.find(x=>x.kind==='number');delete f.unit;delete f.unitLabel;
    delete w.manifest;localStorage.setItem(key,JSON.stringify(w));});
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#workflow-state')).toHaveText('Run failed',{timeout:30000});

  // Red, and NOT still running.
  await expect(node('gap-day')).toHaveClass(/failed/);
  await expect(node('gap-day')).not.toHaveClass(/running/);
  // A step that ran cleanly carries neither.
  await expect(node('day')).not.toHaveClass(/failed|alerting/);

  // The two states are different colours, not one colour for "something is up": "your answer
  // has a caveat" must not look like "you have no answer".
  const border=id=>node(id).evaluate(e=>getComputedStyle(e).borderColor);
  expect(await border('gap-day')).not.toBe(amber);
  // And the failed step's pulse is red while it runs.
  expect(await ring('gap-day')).toMatch(/rgb\(165, 43, 35\)/);
  expect(errors).toEqual([]);
});
