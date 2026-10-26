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
  await page.locator('[data-view="workflow"]').click();
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
  await page.locator('[data-view="workflow"]').click();
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

// "When I click Edit Ruleset in Inspector, I do not see any rules that can be edited" -- the
// practitioner, 2026-10-26, on the Manila extract step. Two things were wrong and only one of
// them was the editor. The step is fed by a TABLE, and the columns on offer were read from a
// point layer's `properties` alone, so a table-fed step was told to connect the records it
// already had and no rule could be written on it at all. The run has treated the two alike
// since 2026-10-16: "points or a table, the rules do not know the difference."
test('a step fed by a table is offered that table\'s columns',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=sea-level');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // Fork the extract step onto its own rules, which is what the Inspector's own button does.
  // Its ports are kept, so it still takes the projections table it always took.
  await page.evaluate(()=>{
    const key='fieldwork-workflow-v1';
    const w=JSON.parse(localStorage.getItem(key));
    const step=w.nodes.find(n=>n.type==='apply_ruleset');
    step.params.authored={title:'Rules for this step',mustNotBeReadAs:'',
      fields:[],parameters:[],rules:[]};
    delete w.manifest;
    localStorage.setItem(key,JSON.stringify(w));
    const ws=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    ws['sea-level']=w;localStorage.setItem('fieldwork-examples-v1',JSON.stringify(ws));
  });
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  const id=await page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='apply_ruleset').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();

  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('These are the columns the connected records carry');
  // The declared value field, which is the column any rule about this table would read.
  await expect(inspector).toContainText(/value_mm/i);
  expect(errors).toEqual([]);
});

// "How do we demonstrate the use of a ruleset widget when we cannot even provide the view of how
// it's used? Defeats the purpose of a worked example." -- the practitioner, 2026-10-26. A worked
// example is a teaching artifact and a regression fixture at once, and the step the sea-level
// example is built around showed its title, version, settings and obligations and never what it
// decides. Forking it opened a blank editor, so a learner could neither read the rules nor start
// from them.
test('the worked example\'s ruleset step shows its rules, and a copy starts from them',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=sea-level');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  const id=await page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='apply_ruleset').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();

  // The rules are ON the panel, not behind a button: extract-contract declares two.
  const inspector=page.locator('#inspector-content');
  await expect(inspector.locator('.authored-rule')).toHaveCount(2);
  // Named as the file spells the column, which is what a reader checks against their data.
  await expect(inspector.locator('.authored-rules')).toContainText('value_mm');

  // This ruleset reads columns through declared bindings, so a copy is fed identically and the
  // panel offers one. The four with bespoke fact generators still refuse, and say why.
  await expect(inspector).toContainText('A copy is fed exactly what these rules are fed');
  await page.locator('#author-rules').click();

  // The copy opens on the published rules rather than on nothing.
  await expect(page.locator('#rule-editor')).toBeVisible();
  await expect(page.locator('#rule-editor .rule-card')).toHaveCount(2);
  await page.locator('#rule-editor-keep').click();

  const seeded=await page.evaluate(nodeId=>{
    const node=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id===nodeId);
    return {rules:node.params.authored.rules.length,
      attribute:node.params.authored.fields[0]?.attribute,
      unit:node.params.authored.fields[0]?.unit};
  },id);
  assertSeeded(seeded);
  expect(errors).toEqual([]);
});

// The declared binding states `mm`, and the unit check compares IRIs -- so a seeded fork that
// carried the label alone would refuse to run for want of a unit it had been given.
function assertSeeded(seeded){
  expect(seeded.rules).toBe(2);
  expect(seeded.attribute).toBe('value_mm');
  expect(seeded.unit).toBe('http://qudt.org/vocab/unit/MilliM');
}
