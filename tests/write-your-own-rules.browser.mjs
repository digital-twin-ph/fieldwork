import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "#2 there is no editor" -- the practitioner, 2026-10-15, looking at a ruleset step. The editor
// shipped that morning and appeared only on a step that ALREADY carried authored rules, which
// meant the one worked example it was written for. A practitioner adding a ruleset step was
// offered four published rulesets and no way to write their own: an editor with no entry point.
test('a ruleset step can be given rules written here, from a standing start',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});

  // Add a ruleset step to a canvas that already has records on it.
  await page.locator('#node-library [data-add="apply_ruleset"]').click();
  const chooser=page.locator('#ruleset-choice');
  await expect(chooser).toBeVisible();
  await expect(chooser.locator('option[value="authored"]')).toHaveText('Write rules for this step…');

  await chooser.selectOption('authored');
  // The step now takes records, and says what it needs before it can read them.
  await expect(page.locator('#inspector-content')).toContainText('Connect the records this step should classify');
  await expect(page.locator('#edit-rules')).toBeVisible();

  // Wire the records, and the columns they carry are offered.
  const added=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return w.nodes.filter(n=>n.type==='apply_ruleset').pop().id;
  });
  await page.evaluate(id=>{
    const key='fieldwork-workflow-v1';
    const w=JSON.parse(localStorage.getItem(key));
    w.edges.push({id:'wire',from:'buildings',to:id,port:'subjects'});
    delete w.manifest;
    localStorage.setItem(key,JSON.stringify(w));
    const ws=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    ws.rulesets=w;localStorage.setItem('fieldwork-examples-v1',JSON.stringify(ws));
  },added);
  await page.reload();
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});
  await page.locator(`.react-flow__node[data-id="${added}"]`).click();

  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('These are the columns the connected records carry');
  await expect(inspector).toContainText('DEATHS');
  await page.locator('#use-columns').click();

  // Declared, and a numeric column is asked for its unit, because a number without one is not a
  // measurement and the rules will not run until it has one.
  await expect(inspector).toContainText('A numeric column needs its unit');
  const unit=page.locator('[data-field-unit]').first();
  await expect(unit).toBeVisible();
  await unit.fill('m');
  await unit.press('Tab');
  await expect.poll(async()=>await page.evaluate(id=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const f=w.nodes.find(n=>n.id===id).params.authored.fields.find(x=>x.kind==='number');
    return f?.unit;
  },added)).toBe('http://qudt.org/vocab/unit/M');

  // And the editor opens on a step that had no rules at all a moment ago.
  await page.locator('#edit-rules').click();
  await expect(page.locator('#rule-editor')).toBeVisible();
  await page.locator('#rule-editor-add').click();
  await expect(page.locator('#rule-editor .rule-card')).toHaveCount(1);
  expect(errors).toEqual([]);
});
