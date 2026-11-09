import {test,expect} from '@playwright/test';
import {openFixture} from './open-fixture.mjs';
import {collectPageErrors} from './page-errors.mjs';

// "#2 there is no editor" -- the practitioner, 2026-10-15, looking at a ruleset step. The editor
// shipped that morning and appeared only on a step that ALREADY carried authored rules, which
// meant the one worked example it was written for. A practitioner adding a ruleset step was
// offered four published rulesets and no way to write their own: an editor with no entry point.
test('a ruleset step can be given rules written here, from a standing start',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await openFixture(page,'rulesets-workflow.json');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:40000});

  // Add a ruleset step to a canvas that already has records on it.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="apply_ruleset"]').click();
  // ONE SENTENCE, then Configure… (experiment 186), where writing rules is offered beside the published rulesets.
  await expect(page.locator('.inspector .standard-sentence')).toContainText('Nothing to apply yet');
  await page.locator('#configure-step').click();
  const chooser=page.locator('#ruleset-choice');
  await expect(chooser).toBeVisible();
  await expect(chooser.locator('option[value="authored"]')).toHaveText('Write rules for this step');
  await chooser.selectOption('authored');
  await page.locator('#ruleset-config #config-apply').click();
  // The rules dialog opens, and says what it needs before it can read anything.
  const editor=page.locator('#rule-editor');
  await expect(editor).toContainText('Connect the records these rules read');
  await editor.locator('#config-cancel').click();
  await expect(editor).toBeHidden();

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

  // The columns the connected records carry are the rules' columns, in the dialog.
  await page.locator('#configure-step').click();
  await expect(editor.locator('.inspector-table')).toContainText('DEATHS');

  // Declared, and a numeric column is asked for its unit, because a number without one is not a
  // measurement and the rules will not run until it has one.
  await expect(editor).toContainText('A numeric column the rules read needs its unit');
  const unit=editor.locator('[data-field-unit]').first();
  await expect(unit).toBeVisible();
  await unit.fill('m');
  await unit.press('Tab');
  await editor.locator('#config-apply').click();
  await expect.poll(async()=>await page.evaluate(id=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const f=w.nodes.find(n=>n.id===id).params.authored.fields.find(x=>x.kind==='number');
    return f?.unit;
  },added)).toBe('http://qudt.org/vocab/unit/M');

  // And the editor opens on a step that had no rules at all a moment ago.
  await page.locator('#configure-step').click();
  await expect(editor).toBeVisible();
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
  await openProjectionContract(page);

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
  });
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  const id=await page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='apply_ruleset').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();

  // The declared value field, which is the column any rule about this table would read, offered in the rules dialog.
  await page.locator('#configure-step').click();
  await expect(page.locator('#rule-editor .inspector-table')).toContainText(/value_mm/i);
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
  await openProjectionContract(page);
  await page.locator('[data-view="workflow"]').click();
  const id=await page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='apply_ruleset').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();

  // The rules are ON the panel, not behind a button: extract-contract declares two.
  const inspector=page.locator('#inspector-content');
  await expect(inspector.locator('.authored-rule')).toHaveCount(2);
  // Named as the file spells the column, which is what a reader checks against their data.
  await expect(inspector.locator('.authored-rules')).toContainText('value_mm');

  // This ruleset reads columns through declared bindings, so a copy is fed identically and Configure… offers one.
  await page.locator('#configure-step').click();
  await expect(page.locator('#ruleset-choice option[value="authored"]')).toHaveText('Edit a copy of these rules on this step');
  await page.locator('#ruleset-choice').selectOption('authored');
  await page.locator('#ruleset-config #config-apply').click();

  // The copy opens on the published rules rather than on nothing.
  await expect(page.locator('#rule-editor')).toBeVisible();
  await expect(page.locator('#rule-editor .rule-card')).toHaveCount(2);
  await page.locator('#rule-editor #config-apply').click();

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

/** A TABLE AND THE PUBLISHED RULESET THAT CONTRACTS FOR IT: four AR6 projections at Manila's gauge, and extract-contract
 *  1.0.0. These tests read the sea-level worked example until 2026-11-09, when it moved to its own repository
 *  (example-2026-sea-level-rise-philippines); they used only this pair of its steps. */
async function openProjectionContract(page){
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.evaluate(()=>{
    const keys=['site_id','scenario','basis','family','year','quantile'];
    const rows=[['ssp245','with_vlm','0.5',1124],['ssp245','without_vlm','0.5',602],['ssp585','with_vlm','0.5',1329],['ssp585','without_vlm','0.5',806]]
      .map(([scenario,family,quantile,value])=>({key:{site_id:'145',scenario,basis:'medium',family,year:'2100',quantile},value}));
    const data={kind:'data-table',keys,valueField:'value_mm',unit:'millimetre',rows,rowCount:rows.length,missingValueCount:0};
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    w.nodes=[
      {id:'projections',type:'table_input',x:20,y:40,params:{label:'AR6 projections at Manila',keys,valueField:'value_mm',unit:'millimetre',data,distinctValuesFor:['site_id']}},
      {id:'extract',type:'apply_ruleset',x:420,y:40,params:{label:'Published projection extract',
        ruleset:{id:'urn:fieldwork:ruleset:extract-contract',version:'1.0.0',title:'Published projection extract',inputs:[['projections','table']],output:'table'},parameters:{}}},
      {id:'table',type:'table_output',x:760,y:40,params:{label:'Projections',inputMode:'table'}}];
    w.edges=[{id:'e-projections',from:'projections',to:'extract',port:'projections'},{id:'e-table',from:'extract',to:'table',port:'table'}];
    delete w.manifest;
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
  });
  await page.reload();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
}
