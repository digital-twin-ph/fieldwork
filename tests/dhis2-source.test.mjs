import test from 'node:test';
import assert from 'node:assert/strict';
import {serverBase} from '../build/dhis2-source.js';

/** THE SERVER'S ADDRESS, SAID PLAINLY (2026-11-20): an empty box reported "Failed to construct 'URL': Invalid URL". */
test('an empty or partial address is named, and a whole one is kept to its base',()=>{
  assert.throws(()=>serverBase('  '),/Type the server’s address/);
  assert.throws(()=>serverBase('127.0.0.1:8080'),/not a whole address|starting https/);
  assert.throws(()=>serverBase('dhis2.example.org'),/not a whole address/);
  assert.equal(serverBase('http://127.0.0.1:8080/'),'http://127.0.0.1:8080');
  assert.equal(serverBase('https://play.dhis2.org/40/api'),'https://play.dhis2.org/40');
});
