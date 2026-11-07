/** THE GUIDE QUESTIONS ARE THE SAME WHERE A NOTE IS WRITTEN AND IN THE MANUAL.
 *
 *  The Add note dialog shows `GUIDE_QUESTIONS` for the part a note is in; the Notes page of the manual prints them
 *  under that part's heading. Experiment 183 closes on the manual carrying them, so a question changed in one place
 *  and not the other is a defect, found here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUIDE_QUESTIONS} from '../build/imrad-guide.js';

const page=readFileSync(new URL('../docs/surfaces/notes.md',import.meta.url),'utf8');
const sectionOf=part=>{
  const start=page.indexOf(`\n### ${part}\n`);
  assert.ok(start>=0,`the manual has a "### ${part}" entry`);
  const rest=page.slice(start+1);
  const next=rest.slice(4).search(/\n#{2,3} /);
  return next<0?rest:rest.slice(0,next+4);
};

test('each part with questions has them, word for word, in its own manual entry',()=>{
  for(const [part,questions] of Object.entries(GUIDE_QUESTIONS)){
    const entry=sectionOf(part);
    for(const q of questions)assert.ok(entry.includes(`- ${q}\n`),`${part}: "${q}" is in its manual entry`);
    const listed=entry.split('\n').filter(line=>line.startsWith('- ')&&line.endsWith('?'));
    assert.equal(listed.length,questions.length,`${part}: the manual lists no question the dialog lacks`);
  }
});

test('the four parts of the body each have questions, and References none',()=>{
  assert.deepEqual(Object.keys(GUIDE_QUESTIONS),['Introduction','Methods','Results','Discussion']);
  for(const qs of Object.values(GUIDE_QUESTIONS))for(const q of qs)assert.match(q,/\?$/,'a guide question is a question');
});
