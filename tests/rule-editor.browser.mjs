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

// "Why are we using template syntax that not anyone would write?" -- the practitioner,
// 2026-10-15, on finding `{{threshold}}` in a value box. It was the compiled form reaching the
// surface: the rules a reasoner reads are text, and `bindParameters` fills `{{threshold}}` in
// them. A practitioner now picks the setting by name and never meets the braces.
test('a setting is chosen by name, and the template syntax never reaches the surface',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=rulesets');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});

  // Step 1 bands a number against the `threshold` setting, so it is the step that used to show
  // the braces -- in the Inspector and in the editor both.
  await page.locator('.react-flow__node[data-id="wait"]').click();
  await expect(page.locator('#inspector-content')).toContainText('the threshold setting below');
  expect(await page.locator('#inspector-content').innerText()).not.toContain('{{');

  await page.locator('#edit-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();
  expect(await dialog.innerText()).not.toContain('{{');
  // The setting is an option in the list of what the number is compared against, beside its own
  // unit -- which is what makes a unit mismatch legible rather than merely refused.
  const source=dialog.locator('[data-part="value-source"]').last();
  await expect(source).toHaveValue('threshold');
  await expect(source.locator('option')).toHaveText(['a number','the threshold setting']);

  // Switching to a typed number, and back, leaves the stored form intact.
  await source.selectOption('');
  await expect(dialog.locator('[data-part="value"]').last()).toBeVisible();
  await dialog.locator('[data-part="value-source"]').last().selectOption('threshold');
  await dialog.locator('#rule-editor-keep').click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const rules=w.nodes.find(n=>n.id==='wait').params.authored.rules;
    return rules[rules.length-1].any[0].all[0].value;
  })).toEqual({setting:'threshold'});
  expect(errors).toEqual([]);
});
