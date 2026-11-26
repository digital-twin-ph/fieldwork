import test from 'node:test';
import assert from 'node:assert/strict';
import {TYPES} from '../build/core.js';
import {STEP_RUNNERS} from '../build/step-runners.js';
import classification from '../widgets/classification.json' with {type:'json'};

// A STEP WITH A DEFINITION AND NO FUNCTION can be added, wired and saved, and then refuses to run: "This build carries
// no step of type ...". The executor looked each type up in a switch of 1,400 lines until 2026-11-25 (code review),
// where a missing case was invisible; it is a table now, so the gap is a set difference.
const retired=new Set(classification.widgets.filter(w=>w.retired).map(w=>w.nodeType));

test('every step that can be added has a function to run it',()=>{
  const missing=Object.keys(TYPES).filter(type=>!retired.has(type)&&typeof STEP_RUNNERS[type]!=='function');
  assert.deepEqual(missing,[],'add the step to a src/run-*.ts module and to src/step-runners.ts');
});

test('no function is kept for a step that is retired or not defined',()=>{
  const stray=Object.keys(STEP_RUNNERS).filter(type=>!(type in TYPES)||retired.has(type));
  assert.deepEqual(stray,[],'a retired widget goes in one pass: its function too');
});
