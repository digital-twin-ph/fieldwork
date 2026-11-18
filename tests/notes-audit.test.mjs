import test from 'node:test';
import assert from 'node:assert/strict';
import {readLength,auditTarget,auditMarkup} from '../build/notes-audit.js';
import {withPart} from '../build/plan.js';

/** THE NOTES AUDIT (experiment 202; the practitioner, 2026-11-18): per target, on request; a gap is said, never refused. */
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const refs={works:2,uncited:1};

test('a declared length is read where it can be counted, in words or sentences',()=>{
  assert.deepEqual(readLength('150 to 300 words'),{unit:'words',min:150,max:300});
  assert.deepEqual(readLength('up to 20 words'),{unit:'words',min:0,max:20});
  assert.deepEqual(readLength('250 words, structured'),{unit:'words',min:0,max:250});
  assert.deepEqual(readLength('2 to 4 sentences'),{unit:'sentences',min:2,max:4});
  assert.deepEqual(readLength('one or two sentences'),{unit:'sentences',min:1,max:2});
  assert.equal(readLength('3 bullets'),null);
});

test('each slot is empty, planned or written; a short background is said to be short',()=>{
  const background={kind:'authored',id:'b',section:'Introduction',fn:'context',text:'Why this district.'};
  const plan=withPart(withPart(undefined,'background','Why here.'),'conclusion','What it means.');
  const a=auditTarget('publication',[background],{},plan,refs);
  const slot=role=>a.slots.find(s=>s.role===role);
  assert.equal(slot('background').state,'filled');
  assert.deepEqual(slot('background').measure,{count:3,unit:'words',fits:'short'});
  assert.equal(slot('conclusion').state,'planned');
  assert.equal(slot('principalFinding').state,'empty');
  assert.ok(a.plannedEmpty.length>=1);
  assert.equal(a.filled,a.slots.filter(s=>s.state==='filled').length);
});

test('written and not planned, and notes the target does not use, are listed apart',()=>{
  const finding={kind:'authored',id:'f',section:'Discussion',fn:'finding',text:'The school carried it.'};
  const stray={kind:'authored',id:'s',section:'Methods',fn:'rationale',text:'An aside.'};
  const a=auditTarget('publication',[finding,stray],{},undefined,refs);
  assert.ok(a.unplanned.length>=1);
  const sitrep=auditTarget('sitrep-who',[finding,stray],{},undefined,refs);
  assert.ok(sitrep.unplaced.length>=0);
  const html=auditMarkup(a,esc);
  assert.match(html,/parts written<\/strong> for Publication/);
  assert.doesNotMatch(html,/<li>References<\/li>/);
  assert.match(html,/role="img" aria-label="\d+ of \d+ parts written"/);
  assert.match(html,/1 named but not read/);
});
