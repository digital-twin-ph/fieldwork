import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const identities=async()=>{
  // One entry per ruleset IDENTITY at its current version, which is what the Inspector offers.
  const files=JSON.parse(await readFile('widgets/parity.json','utf8'));
  void files;
  const {bundledRulesets}=await import('../build/rulesets.js');
  const current=new Map();
  for(const r of bundledRulesets()){
    const held=current.get(r.id);
    if(!held||held.version.localeCompare(r.version,undefined,{numeric:true})<0)current.set(r.id,r);
  }
  return current;
};

// The palette offers ONE rule-application widget, and the ruleset is chosen on the node.
// Before 2026-10-14 it offered one entry per bundled ruleset, which grew with every ruleset and
// again with every version of one -- four rulesets were showing as seven entries, because a
// superseded version stays bundled so saved workflows can still resolve their pins. The
// practitioner's decision: "when we offer instances of rulesets as widgets, that's the recipe for
// exponential clutter."
test('the palette offers one rule-application widget, not one per ruleset',async({page})=>{
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await expect(page.locator('#node-library [data-add="apply_ruleset"]')).toHaveCount(1);
  await expect(page.locator('#node-library [data-ruleset]')).toHaveCount(0);
  const expected=await identities();
  expect(expected.size,'four identities, seven documents').toBe(4);
});

test('adding one gives a node that says it has nothing to apply yet',async({page})=>{
  // On the worked example, because a blank canvas offers only the starter widgets.
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-library [data-add="apply_ruleset"]').click();

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const node=saved.nodes.find(n=>n.type==='apply_ruleset'&&!n.params.ruleset);
  assert.ok(node,'the widget adds a node with nothing pinned');

  // It is allowed to sit there, and the run refuses it by name rather than silently.
  await expect(page.locator('.inspector')).toContainText('nothing to apply yet');
  await page.locator('#run-button').click();
  await expect(page.locator('.toast')).toContainText('Choose a ruleset',{timeout:45000});
});

test('choosing a ruleset pins it, takes its defaults, and names the step',async({page})=>{
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-library [data-add="apply_ruleset"]').click();

  // Only current versions are offered: a superseded rule is resolvable for a saved pin and is
  // not somewhere to start new work.
  const offered=await page.locator('#ruleset-choice option').evaluateAll(els=>
    els.map(e=>e.value).filter(v=>v&&v!=='authored'));
  expect(offered.length,'one per identity, not one per document').toBe(4);
  // And one more entry that is not a ruleset at all: writing rules here rather than choosing
  // somebody else's. Added 2026-10-15, when the editor turned out to have no entry point.
  expect(await page.locator('#ruleset-choice option[value="authored"]').count()).toBe(1);
  expect(offered.some(v=>v.endsWith('@1.0.0')&&v.includes('extent-review')),
    'the superseded extent review is not offered').toBe(false);

  await page.locator('#ruleset-choice').selectOption(
    offered.find(v=>v.includes('extent-review')));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const node=saved.nodes.filter(n=>n.type==='apply_ruleset').at(-1);
  assert.equal(node.params.ruleset.id,'urn:fieldwork:ruleset:extent-review');
  assert.equal(node.params.ruleset.version,'1.1.0');
  assert.deepEqual(node.params.ruleset.inputs,[['polygons','polygons']],'the ports come from the ruleset');
  assert.equal(node.params.ruleset.output,'polygons');
  assert.equal(node.params.parameters.threshold,1000000,'the declared default is pinned');
  assert.equal(node.params.label,'Extent review','and the step is named after what it does');

  await expect(page.locator('.inspector')).toContainText('Extent review');
  await expect(page.locator('.inspector')).toContainText('Illustrative');
});
