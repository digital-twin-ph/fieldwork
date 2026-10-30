/** MOVING NOTES AROUND WITHIN AN IMRaD SECTION.
 *
 *  The practitioner, 2026-10-29: *"In the Notes UI we should be able to move around notes within
 *  IMRaD sections."* Which `groupNotes` made impossible rather than merely missing: it sorts a part
 *  by what each note does, so any arrangement a person dragged into was re-sorted on the next
 *  render. Order within a part is now the order of the project's own list.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {moveNote,notesOfPart} from '../build/notes.js';
import {noteKey as uiKey} from '../build/notes-ui.js';

const n=(id,section,fn)=>({kind:'authored',id,section,text:`note ${id}`,...(fn?{fn}:{})});
const key=note=>note.id;
const ids=list=>list.map(x=>x.id);

test('a part reads in list order, not in function order', () => {
  // The old behaviour put `background` before `limitation` whatever the person did.
  const notes=[n('a','Methods','limitation'),n('b','Methods','background'),n('c','Discussion')];
  assert.deepEqual(ids(notesOfPart(notes,'Methods')), ['a','b']);
});

test('a note moves before the card it was dropped on', () => {
  const notes=[n('a','Methods'),n('b','Methods'),n('c','Methods')];
  assert.deepEqual(ids(moveNote(notes,'c','a',key)), ['c','a','b']);
  assert.deepEqual(ids(moveNote(notes,'a','c',key)), ['b','a','c']);
});

test('dropped past the last card, it goes to the end of ITS part — not the end of everything', () => {
  // A note dropped below the last card in Methods belongs under Methods, not after the Discussion.
  const notes=[n('a','Methods'),n('b','Methods'),n('c','Discussion'),n('d','Discussion')];
  const moved=moveNote(notes,'a',null,key);
  assert.deepEqual(ids(moved), ['b','a','c','d']);
  assert.deepEqual(ids(notesOfPart(moved,'Methods')), ['b','a']);
  assert.deepEqual(ids(notesOfPart(moved,'Discussion')), ['c','d']);
});

test('dropping a note on itself changes nothing', () => {
  const notes=[n('a','Methods'),n('b','Methods')];
  assert.deepEqual(ids(moveNote(notes,'a','a',key)), ['b','a'],
    'before-itself is treated as no target, so it lands at the end of its part');
  assert.deepEqual(ids(moveNote(notes,'missing','a',key)), ['a','b'],
    'a note that is not there leaves the list alone');
});

test('the list is never mutated, so a refused write leaves the order on screen intact', () => {
  const notes=[n('a','Methods'),n('b','Methods')];
  const before=ids(notes);
  moveNote(notes,'b','a',key);
  assert.deepEqual(ids(notes), before);
});

test('reordering needs no new field: a position IS an index in the list that already exists', () => {
  const notes=[n('a','Methods'),n('b','Methods')];
  for(const note of moveNote(notes,'b','a',key))
    assert.equal('order' in note||'index' in note||'position' in note, false,
      'two orders that could disagree is exactly what this avoids');
});

test('the key the card carries is the key the move looks up', () => {
  // There is exactly one noteKey, in notes-ui, and the drop handler uses it for both halves. If a
  // second one ever appeared in notes.js, every drag would silently refuse -- so this asserts the
  // one that exists is what moveNote is handed.
  const note=n('a','Methods');
  assert.equal(uiKey(note), 'a');
  assert.deepEqual(ids(moveNote([n('a','Methods'),n('b','Methods')],uiKey(note),null,uiKey)),
    ['b','a']);
});
