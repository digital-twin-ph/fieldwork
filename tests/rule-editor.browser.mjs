import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "I see the ruleset widget but it's not editable." -- the practitioner, 2026-10-15, looking at
// the published ruleset example. The rules could be read and their numbers changed; a condition
// could not be added. "Perhaps the rule editor should be a modal dialog so there is enough
// space" -- which is what this opens.
test('rules can be edited in a dialog, and the edit reaches the saved workflow',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});

  await page.locator('.react-flow__node[data-id="kind"]').click();
  await page.locator('#edit-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('What each kind of service point can do');

  const before=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return w.nodes.find(n=>n.id==='kind').params.authored.rules.length;
  });

  // Add a rule, and give it a condition and a conclusion in the practitioner's words -- no
  // prefixes typed, because the namespace is the application's business.
  await dialog.locator('#rule-editor-add').click();
  const added=dialog.locator('.rule-card').last();
  await added.locator('[data-part="field"]').selectOption({index:2});
  await added.locator('[data-part="predicate"]').fill('service');
  await added.locator('[data-part="predicate"]').press('Tab');
  await dialog.locator('.rule-card').last().locator('[data-part="conclusion"]').fill('Referral');
  await dialog.locator('.rule-card').last().locator('[data-part="conclusion"]').press('Tab');

  // Nothing is saved until the practitioner keeps it.
  expect(await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return w.nodes.find(n=>n.id==='kind').params.authored.rules.length;
  })).toBe(before);

  await dialog.locator('#rule-editor-keep').click();
  await expect(dialog).toBeHidden();
  const after=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const rules=w.nodes.find(n=>n.id==='kind').params.authored.rules;
    return {count:rules.length,last:rules[rules.length-1]};
  });
  expect(after.count).toBe(before+1);
  // The namespace was added for them.
  expect(after.last.then[0].predicate).toBe('fwa:service');
  expect(after.last.then[0].value).toBe('fwa:Referral');

  // And the Inspector reads the new rule back, laid out as a rule: the name, the comparison and
  // the value in their own cells rather than in a sentence.
  const last=page.locator('#inspector-content .authored-rule').last();
  await expect(last.locator('.rule-field').last()).toHaveText('service');
  await expect(last.locator('.rule-value').last()).toHaveText('Referral');
  await expect(last.locator('.rule-keyword').last()).toHaveText('THEN');
  expect(errors).toEqual([]);
});
