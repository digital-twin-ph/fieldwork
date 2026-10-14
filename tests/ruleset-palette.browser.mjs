import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

// A ruleset nobody can choose is invisible -- the widget rule of src/palette.ts, one layer down.
// Until 2026-10-14 the palette showed a single generic "Apply ruleset" entry, which adds a node
// with no ruleset, no ports and no way to run. palette.ts said that must not happen while the
// palette did it, and four bundled rulesets could only be reached by loading an example.
const identities=()=>{
  const ids=new Map();
  for(const dir of readdirSync(new URL('../rulesets',import.meta.url),{withFileTypes:true})){
    if(!dir.isDirectory())continue;
    for(const file of readdirSync(new URL(`../rulesets/${dir.name}`,import.meta.url))){
      if(!file.endsWith('.json'))continue;
      const r=JSON.parse(readFileSync(new URL(`../rulesets/${dir.name}/${file}`,import.meta.url),'utf8'));
      const held=ids.get(r.id);
      if(!held||held.version.localeCompare(r.version,undefined,{numeric:true})<0)ids.set(r.id,r);
    }
  }
  return ids;
};

test('every bundled ruleset can be added from the palette, at its current version',async({page})=>{
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});

  // The generic entry must be gone: it adds a node that cannot run.
  await expect(page.locator('#node-library [data-add="apply_ruleset"]')).toHaveCount(0);

  const expected=identities();
  const offered=await page.locator('#node-library [data-ruleset]')
    .evaluateAll(els=>els.map(e=>e.dataset.ruleset));
  assert.deepEqual(offered.sort(),[...expected.values()].map(r=>`${r.id}@${r.version}`).sort(),
    'the palette must offer each ruleset identity once, at its current version');

  // The basis belongs where the choice is made. An illustrative ruleset is offered and says so.
  const extent=page.locator('#node-library [data-ruleset^="urn:fieldwork:ruleset:extent-review"]');
  await expect(extent).toContainText('illustrative, no source');
  // polygons in, polygons out: from 1.1.0 the judgement travels on the shape it is about, so
  // the ports say the ruleset hands back what it was given. Experiment 113.
  await expect(extent).toContainText('polygons → polygons');
});

test('adding one pins that ruleset, its ports and its declared defaults',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-library [data-ruleset^="urn:fieldwork:ruleset:extent-review"]').click();

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const node=saved.nodes.find(n=>n.type==='apply_ruleset');
  assert.ok(node,'clicking a ruleset must add an apply_ruleset node');
  assert.equal(node.params.ruleset.id,'urn:fieldwork:ruleset:extent-review');
  assert.deepEqual(node.params.ruleset.inputs,[['polygons','polygons']],'the ports come from the ruleset');
  assert.equal(node.params.ruleset.output,'polygons');
  assert.equal(node.params.parameters.threshold,1000000,'the declared default is pinned');

  // And the Inspector shows what was pinned rather than an empty node.
  await expect(page.locator('.inspector')).toContainText('Extent review');
  await expect(page.locator('.inspector')).toContainText('Illustrative');
});
