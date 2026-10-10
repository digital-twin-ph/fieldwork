import test from 'node:test';
import assert from 'node:assert/strict';
import {addableTypes,PALETTE_GROUPS,RETIRED_FROM_PALETTE} from '../build/palette.js';
import {TYPES,exampleWorkflow} from '../build/core.js';
import {oldNalediWorkflow} from '../build/old-naledi.js';
import {johnSnowExample} from '../build/john-snow.js';
import {geoprivacyExample} from '../build/geoprivacy-example.js';
import {blankWorkflow} from '../build/study-area.js';
import {coverageExercise} from '../build/spatial-coverage.js';

const CATCHMENTS=['voronoi','isochrone','network_input','clip_polygons','summarize_polygons'];
const EXAMPLES=[
  ['heat',exampleWorkflow()],['old-naledi',oldNalediWorkflow()],['blank',blankWorkflow()],
  ['coverage',coverageExercise()],['snow-voronoi',johnSnowExample('snow-voronoi')],
  ['snow-isochrone',johnSnowExample('snow-isochrone')],['snow-geoprivacy',geoprivacyExample()],
];

// A node type reachable from no example is a widget nobody can add. It will still build,
// validate, register and pass its own tests, so only this check catches it.
const reachable=()=>{
  const all=new Set();
  for(const [exampleKey,workflow] of EXAMPLES)
    for(const type of addableTypes({exampleKey,templateTypes:workflow.nodes.map(n=>n.type),
      workflowTypes:workflow.nodes.map(n=>n.type),catchmentTypes:CATCHMENTS})) all.add(type);
  return all;
};

test('every node type is addable from some example, or deliberately is not',()=>{
  // Legacy identities that normalise through the experiment 18 adapter, plus the superseded
  // generic output. Each stays executable so saved work still runs; none is offered again.
  const deliberate=new Set([...RETIRED_FROM_PALETTE,'places','centers']);
  const unreachable=Object.keys(TYPES).filter(type=>!reachable().has(type)&&!deliberate.has(type));
  assert.deepEqual(unreachable,[],
    `these node types are registered but cannot be added from any example: ${unreachable.join(', ')}`);
  for(const type of deliberate)
    assert.ok(type in TYPES,`${type} is listed as deliberately unreachable but is not a node type`);
});

test('every palette group has a place in the ordering',()=>{
  const groups=[...new Set(Object.values(TYPES).map(t=>t.group))];
  const missing=groups.filter(g=>!PALETTE_GROUPS.includes(g));
  assert.deepEqual(missing,[],
    `these groups would sort to the front because they are absent from PALETTE_GROUPS: ${missing.join(', ')}`);
});

test('the starter canvases stay small, and the retired output is never offered',()=>{
  const blank=addableTypes({exampleKey:'blank',templateTypes:[],workflowTypes:[],catchmentTypes:[]});
  assert.ok(blank.has('area'),'a blank canvas must offer a study area');
  assert.ok(!blank.has('xpert'),'a blank canvas does not offer one example\'s evidence hierarchy');
  for(const [exampleKey,workflow] of EXAMPLES)
    assert.ok(!addableTypes({exampleKey,templateTypes:workflow.nodes.map(n=>n.type),
      workflowTypes:workflow.nodes.map(n=>n.type),catchmentTypes:CATCHMENTS}).has('output'),
      `${exampleKey} must not offer the superseded output node`);
});
