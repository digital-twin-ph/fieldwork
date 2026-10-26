import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAMPLE_TEMPLATES,WORKED_EXAMPLE_KEYS} from '../build/example-templates.js';
import {addableTypes,RETIRED_FROM_PALETTE,ADDABLE_VIA_COMPOSITION,ADDABLE_VIA_RULESET} from '../build/palette.js';
import {bundledRulesets} from '../build/rulesets.js';

/** NO WORKED EXAMPLE MAY USE A WIDGET SOMEBODY ELSE COULD NOT HAVE CONFIGURED BY HAND.
 *
 *  The practitioner, 2026-10-26: *"we have to develop the worked example that uses a widget that
 *  could also otherwise have been configured by hand by someone else. It should be no different
 *  than other ruleset widgets. No variants."*
 *
 *  The widget-level counterpart of the rule that no shipped ruleset may be one the rule builder
 *  could not produce (tests/rulesets-are-reproducible.test.mjs). An example is a teaching
 *  artifact and a regression fixture at once; one built from something a practitioner cannot
 *  reach teaches a workflow the application cannot actually perform, and it is how a general
 *  widget acquires a domain-shaped variant nobody noticed. */

const nodesOf=template=>{
  const w=typeof template==='function'?template():template;
  const flows=w?.workflows?.map(x=>x.document)??[w];
  return flows.filter(Boolean).flatMap(f=>f.nodes??[]);
};

test('every node a worked example places is one the palette offers',()=>{
  // The palette once a canvas holds an input, which is every widget that is not retired.
  const offered=addableTypes({workflowTypes:['point_input','study_area','table_input']});
  const unreachable=[];
  for(const key of WORKED_EXAMPLE_KEYS)
    for(const node of nodesOf(EXAMPLE_TEMPLATES[key]))
      if(!offered.has(node.type)
        &&!ADDABLE_VIA_COMPOSITION.includes(node.type)
        &&!ADDABLE_VIA_RULESET.includes(node.type))
        unreachable.push(`${key}:${node.type}`);
  assert.deepEqual([...new Set(unreachable)],[],
    'these examples place a node a practitioner could not add themselves');
});

test('no worked example places a retired widget',()=>{
  const placed=[];
  for(const key of WORKED_EXAMPLE_KEYS)
    for(const node of nodesOf(EXAMPLE_TEMPLATES[key]))
      if(RETIRED_FROM_PALETTE.includes(node.type))placed.push(`${key}:${node.type}`);
  assert.deepEqual([...new Set(placed)],[],
    'a retired widget never runs, so an example holding one teaches a workflow that cannot be built');
});

/** NO VARIANTS. A ruleset node must pin a ruleset the chooser offers, not a bespoke artefact
 *  shipped for one example. The pin is what makes `apply_ruleset` an interpreter rather than a
 *  family of near-identical widgets, which is what experiment 65 admitted it for. */
test('every ruleset an example pins is one the chooser offers',()=>{
  const bundled=new Set(bundledRulesets().map(r=>`${r.id}@${r.version}`));
  const bespoke=[];
  for(const key of WORKED_EXAMPLE_KEYS)
    for(const node of nodesOf(EXAMPLE_TEMPLATES[key])){
      const pin=node.params?.ruleset;
      if(!pin)continue;
      if(!bundled.has(`${pin.id}@${pin.version}`))bespoke.push(`${key}: ${pin.id}@${pin.version}`);
    }
  assert.deepEqual([...new Set(bespoke)],[],
    'an example pins a ruleset nobody else can choose, which is a variant wearing a pin');
});
