import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const run=(today)=>{
  try{
    return {ok:true,out:execFileSync(process.execPath,['scripts/validate-blockers.mjs'],
      {env:{...process.env,FIELDWORK_TODAY:today},encoding:'utf8'})};
  }catch(error){return {ok:false,out:(error.stdout||'')+(error.stderr||'')};}
};

// The revisit window used to be measured against `measuredAt`, a field inside the file being
// checked, so a blocker could never breach it unless somebody also advanced that field -- and
// advancing it is what a person who forgot to revisit would also forget. The clock measured itself.

test('a blocker left standing past the window fails the build', ()=>{
  const {ok,out}=run('2026-11-30');
  assert.equal(ok,false,'a month of silence must not pass');
  assert.match(out,/is standing and was last revisited/);
  assert.match(out,/against a window of 7/);
});

test('a blocker revisited inside the window passes', ()=>{
  const {ok}=run('2026-10-14');
  assert.equal(ok,true);
});

test('counts dated in the future are refused', ()=>{
  // measuredAt is a record of when the counts were taken; it cannot be ahead of the clock.
  const {ok,out}=run('2026-01-01');
  assert.equal(ok,false);
  assert.match(out,/which is in the future/);
});

test('the clock is the real date unless a check pins it', ()=>{
  // No override: the window is measured against now, which is the whole point.
  const source=execFileSync('node',['-e',
    "process.stdout.write(require('fs').readFileSync('scripts/validate-blockers.mjs','utf8'))"],{encoding:'utf8'});
  assert.match(source,/new Date\(\)/,'the default clock must be the real one');
  assert.ok(!/const today=new Date\(ledger\.measuredAt\)/.test(source),
    'and must not be read back out of the file being checked');
});
