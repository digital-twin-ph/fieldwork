import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

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
  // Pinned after the ledger's own measuredAt and inside the window. It used to read 2026-10-14,
  // which began failing the moment the ledger was re-derived on 2026-10-15 -- not because a
  // blocker was stale but because the pinned clock was then BEHIND measuredAt, which the
  // validator refuses for its own reason. A date before the file was written is not a test of
  // the window.
  // Moved again on 2026-10-22, when six blockers were re-derived and the ledger's measuredAt
  // advanced with them. The pin has to sit at or after measuredAt and before the oldest standing
  // blocker's window closes -- which is a dependency on two dates inside the file under test, and
  // is why this pin has now moved twice.
  const {ok,out}=run('2026-10-23');
  assert.equal(ok,true,out);
});

// Added 2026-10-15 with the rules they lock. The clock was satisfiable by editing one date, which
// rewards the person who skipped the re-derivation with a one-character fix; and `standing` was
// being used for claims nothing was waiting on, which is how a ledger becomes an obstacle instead
// of a list of work. These assert the DATA satisfies both, so the ledger cannot drift back even
// if the validator is loosened.
test('every standing blocker records what re-deriving it found, dated as lastRevisited', async()=>{
  const ledger=JSON.parse(await readFile('widgets/blockers.json','utf8'));
  for(const blocker of ledger.blockers.filter(b=>b.status==='standing')){
    const dates=(blocker.revisits??[]).map(r=>r.date).filter(Boolean).sort();
    assert.ok(dates.length,`${blocker.id} is standing and records no revisits`);
    assert.equal(dates.at(-1),blocker.lastRevisited,
      `${blocker.id}: the date and the finding must be the same event`);
    for(const entry of blocker.revisits)
      assert.ok(entry.found?.trim(),`${blocker.id}: a revisit must say what it found`);
  }
});

test('standing means something is waiting, and a finding means nothing is', async()=>{
  const ledger=JSON.parse(await readFile('widgets/blockers.json','utf8'));
  for(const blocker of ledger.blockers){
    if(blocker.status==='standing')
      assert.ok((blocker.blocks??[]).length,
        `${blocker.id} is standing and blocks nothing -- it is a finding, which carries no clock`);
    if(blocker.status==='finding')
      assert.equal((blocker.blocks??[]).length,0,
        `${blocker.id} is a finding and lists work waiting on it -- that makes it standing`);
  }
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
