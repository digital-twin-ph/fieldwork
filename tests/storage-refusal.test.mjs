import test from 'node:test';
import assert from 'node:assert/strict';
import {storageRefusal,STORAGE_QUOTA_BYTES} from '../build/study-area.js';

// The practitioner downloaded Bunia on 2026-10-20 and was told "Storage is full -- export the
// workflow to a file, or open fewer worked examples". The second half was wrong: a Bunia walking
// graph is several times the whole quota, so clearing every other example would not have helped.
test('a workflow too large for an empty store says so instead of advising a clear-out',()=>{
  const message=storageRefusal(14_200_000);
  assert.match(message,/14\.2 MB/);
  assert.match(message,/will not fit however much else you clear/);
  assert.match(message,/Export it to a file/);
  assert.doesNotMatch(message,/open fewer worked examples/);
});

test('a workflow that would fit beside less company still gets the advice that works',()=>{
  const message=storageRefusal(Math.round(STORAGE_QUOTA_BYTES/4));
  assert.match(message,/open fewer worked examples/);
  assert.doesNotMatch(message,/will not fit/);
});

test('the junction figure it quotes is under the graph limit the widget offers',()=>{
  const quoted=Number(storageRefusal(20_000_000).match(/roughly ([\d,]+) junctions/)[1].replace(/,/g,''));
  assert.ok(quoted>5000&&quoted<10000,`quoted ${quoted}`);
  assert.ok(quoted<50000,'the graph limit knob offers 50,000, which this device cannot keep');
});
