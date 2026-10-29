/** EDITING A MACHINED NOTE FORKS IT, and the fork carries two provenances.
 *
 *  The practitioner, 2026-10-29: *"A machined note can also be edited but once it is, it is
 *  forked from the original and becomes an authored note with two provenances."*
 *
 *  Which answers a question this module had been circling since the spike -- whether a machined
 *  note is editable at all. It is, and editing one destroys nothing: the widget goes on machining
 *  its own account every run, and the edit becomes a note of a different kind that says a
 *  computation produced the wording and a person changed it. Two warrants, and a reader needs
 *  both.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {forkMachinedNote,forkHasDrifted,readNotes}
  from '../build/notes.js';

const machined={kind:'machined',section:'Results',fn:'finding',nodeId:'two-by-two',
  text:'rate ratio 8.40 (95% interval 6.84 to 10.32)'};

test('forking a machined note keeps both warrants and leaves the original alone',()=>{
  const fork=forkMachinedNote(machined,'f1','The ratio is 8.4, and the interval is wide.','2026-10-29');
  assert.equal(fork.kind,'authored');
  assert.equal(fork.section,'Results');
  assert.equal(fork.fn,'finding','the function survives the fork');
  assert.equal(fork.forkedFrom.nodeId,'two-by-two','the computation that produced the wording');
  assert.equal(fork.forkedFrom.text,machined.text,'and the wording it was forked from');
  assert.equal(machined.text,'rate ratio 8.40 (95% interval 6.84 to 10.32)','untouched');
});

test('drift is reported when the run re-machines different numbers',()=>{
  const fork=forkMachinedNote(machined,'f1','The ratio is 8.4.','2026-10-29');
  assert.equal(forkHasDrifted(fork,[machined]),false,'same run, no drift');
  const moved={...machined,text:'rate ratio 8.51 (95% interval 6.90 to 10.49)'};
  assert.equal(forkHasDrifted(fork,[moved]),true,'the numbers moved under the edit');
  assert.equal(forkHasDrifted({kind:'authored',id:'a',section:'Results',text:'mine'},[moved]),false,
    'a note written from nothing cannot drift');
});

test('a fork claiming a second provenance with nothing to check it against is refused',()=>{
  const {notes}=readNotes([{kind:'authored',id:'a',section:'Results',text:'mine',
    forkedFrom:{nodeId:'two-by-two'}}]);
  assert.equal(notes.length,1,'the note is kept');
  assert.equal(notes[0].forkedFrom,undefined,'the unprovable claim is not');
});
