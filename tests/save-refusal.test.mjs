import test from 'node:test';
import assert from 'node:assert/strict';
import {saveRefusalMessage} from '../build/save-refusal.js';

const quota=bytes=>`This workspace needs ${bytes} bytes and the store refused them.`;
const FALLBACK='Study area could not be saved. Retry Apply.';

/** A RUN IN FLIGHT IS NOT A STORAGE PROBLEM.
 *
 *  Found 2026-10-24: applying a study area during the example's own auto-run reported "Study area
 *  could not be saved. Retry Apply." over a workspace holding 169 KB. `change()` returns false
 *  while busy WITHOUT attempting a save, so nothing was recorded and the caller's sentence --
 *  written for a store that refused -- was shown for a condition that never reached the store.
 *  Retrying would have failed identically until the run ended, so the advice was wrong too. */
test('a run in flight is reported as a run, not as a failed save',()=>{
  const message=saveRefusalMessage(FALLBACK,true,null,quota);
  assert.match(message,/run is in progress/);
  assert.doesNotMatch(message,/could not be saved/);
  // AND EVEN WITH A STALE FAILURE RECORDED. An earlier refusal must not describe this event:
  // busy is checked first precisely so a leftover fact cannot answer a different question.
  assert.match(saveRefusalMessage(FALLBACK,true,{name:'QuotaExceededError',bytes:9e6},quota),
    /run is in progress/);
});

test('a full store says so, with the size, rather than saying retry',()=>{
  const message=saveRefusalMessage(FALLBACK,false,{name:'QuotaExceededError',bytes:5_226_496},quota);
  assert.match(message,/5226496/);
  // "Retry Apply" is not advice when the store is full: the retry fails identically.
  assert.doesNotMatch(message,/Retry Apply/);
});

test('another device error names itself and keeps the caller\'s sentence',()=>{
  const message=saveRefusalMessage(FALLBACK,false,{name:'SecurityError',bytes:100},quota);
  assert.match(message,/Retry Apply/);
  assert.match(message,/SecurityError/);
});

test('nothing recorded leaves the caller\'s sentence alone',()=>{
  // Inventing a cause is worse than naming none.
  assert.equal(saveRefusalMessage(FALLBACK,false,null,quota),FALLBACK);
});
