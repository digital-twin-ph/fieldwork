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

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="building"]').click();
  await page.locator('#edit-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('A building, banded by how many died in it');

  const before=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return w.nodes.find(n=>n.id==='building').params.authored.rules.length;
  });

  // Add a rule, and give it a condition and a conclusion in the practitioner's words -- no
  // prefixes typed, because the namespace is the application's business.
  await dialog.locator('#rule-editor-add').click();
  const added=dialog.locator('.rule-card').last();
  await added.locator('[data-part="field"]').selectOption({index:0});
  await added.locator('[data-part="predicate"]').fill('service');
  await added.locator('[data-part="predicate"]').press('Tab');
  await dialog.locator('.rule-card').last().locator('[data-part="conclusion"]').fill('Referral');
  await dialog.locator('.rule-card').last().locator('[data-part="conclusion"]').press('Tab');

  // Nothing is saved until the practitioner keeps it.
  expect(await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return w.nodes.find(n=>n.id==='building').params.authored.rules.length;
  })).toBe(before);

  await dialog.locator('#rule-editor-keep').click();
  await expect(dialog).toBeHidden();
  const after=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const rules=w.nodes.find(n=>n.id==='building').params.authored.rules;
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
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="day"]').click();
  // Named, and SET TO WHAT -- "does this not look like fixed on context" was the practitioner's
  // reading of `the cluster setting` on 2026-10-17: a phrase composed around the name, carrying
  // nothing the name did not. The figure the rule turns on now travels with it.
  await expect(page.locator('#inspector-content')).toContainText('busy · 20 deaths');
  expect(await page.locator('#inspector-content').innerText()).not.toContain('{{');

  await page.locator('#edit-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();
  expect(await dialog.innerText()).not.toContain('{{');
  // The setting is an option in the list of what the number is compared against, beside its own
  // unit -- which is what makes a unit mismatch legible rather than merely refused.
  const source=dialog.locator('[data-part="value-source"]').last();
  await expect(source).toHaveValue('busy');
  await expect(source.locator('option')).toHaveText(['a number','busy · 20 deaths']);

  // CLEARING the box is refused, and the refusal now names what is missing. `Number('')` is 0,
  // so an emptied setting used to be stored as zero and bounce off `busy`'s declared minimum --
  // "busy must be between 1 and 20", which is about a figure the practitioner never typed. A
  // setting declaring no minimum would have run on that zero in silence.
  await dialog.locator('#rule-editor-cancel').click();
  await expect(dialog).toBeHidden();
  await page.locator('[data-ruleset-parameter="busy"]').fill('');
  await page.locator('[data-ruleset-parameter="busy"]').dispatchEvent('change');
  await expect(page.locator('#toast')).toContainText('needs a value for busy');
  expect(await page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='day').params.parameters.busy,
  )).toBe(20,'the refused edit is rolled back, not stored as zero');
  await page.locator('#edit-rules').click();
  await expect(dialog.locator('[data-part="value-source"]').last()).toHaveValue('busy');

  // Switching to a typed number, and back, leaves the stored form intact.
  await source.selectOption('');
  await expect(dialog.locator('[data-part="value"]').last()).toBeVisible();
  await dialog.locator('[data-part="value-source"]').last().selectOption('busy');
  await dialog.locator('#rule-editor-keep').click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const rules=w.nodes.find(n=>n.id==='day').params.authored.rules;
    return rules[rules.length-1].any[0].all[0].value;
  })).toEqual({setting:'busy'});
  expect(errors).toEqual([]);
});

// "Why can't I just get a ruleset editor?" and "The pinned rules should be editable so it's
// reviewable in the editor." -- the practitioner, 2026-10-15, on example 09, whose step applies
// a published ruleset. The Inspector showed its title, its description and its basis, and never
// its rules; the only route to an editor was an option inside a dropdown, and it dropped every
// edge on the node on the way.
test('a published ruleset is read in the editor, and is not editable there',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:45000});

  const edges=()=>page.locator('.react-flow__edge').count();
  const before=await edges();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="review"]').click();
  await page.locator('#review-rules').click();
  const dialog=page.locator('#rule-editor');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Extent review 1.1.0');

  // Laid out as rules, with the published vocabulary intact and the setting named rather than
  // written as a placeholder.
  await expect(dialog.locator('.rule-card')).toHaveCount(3);
  await expect(dialog.locator('[data-part="value-source"]').first()).toHaveValue('threshold');
  expect(await dialog.innerText()).not.toContain('{{');

  // Published and pinned: every control is disabled and nothing can be added or removed.
  for(const control of await dialog.locator('.rule-editor-body input,.rule-editor-body select').all())
    await expect(control).toBeDisabled();
  await expect(dialog.locator('#rule-editor-add')).toHaveCount(0);
  await expect(dialog.locator('.rule-editor-body button[data-part]')).toHaveCount(0);

  await dialog.locator('#rule-editor-cancel').click();
  await expect(dialog).toBeHidden();
  expect(await edges(),'reading rules rewires nothing').toBe(before);
  expect(errors).toEqual([]);
});

// Converting a step to rules of its own used to disconnect it, which left the practitioner with
// an editor and nothing for it to read. It keeps the ruleset's port shape now, so the wiring
// survives and the columns the connected records carry are offered.
test('writing rules for a pinned step keeps what is wired to it',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:45000});

  const before=await page.locator('.react-flow__edge').count();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="review"]').click();
  await page.locator('#author-rules').click();
  await expect(page.locator('#rule-editor')).toBeVisible();
  await page.locator('#rule-editor-cancel').click();
  expect(await page.locator('.react-flow__edge').count()).toBe(before);
  expect(errors).toEqual([]);
});
