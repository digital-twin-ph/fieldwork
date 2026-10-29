/** THE SOURCES A WORKFLOW CAN WRITE BY ITSELF.
 *
 *  Experiment 141, trying the notes design on a real write-up: *"References are the one section a
 *  workflow can write by itself."* Nine of the Notes Board prototype's fourteen cards are this
 *  kind, and none was written for the page: each is an input widget's own declaration, read back.
 *
 *  A practitioner who told a widget what its data is has already written the Methods sentence
 *  that cites it. Charging them for it twice is the friction this exists to remove.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {derivedNotes} from '../build/notes-derived.js';

const input=(id,provenance)=>({id,type:'table_input',x:0,y:0,params:{label:id,provenance}});
const snow={what:'Snow 1855, Table VIII — population and cholera deaths by sub-district',
  source:'John Snow, On the Mode of Communication of Cholera, second edition',
  licence:'CC0-1.0',represents:'1854'};

test('an input that declares its provenance cites itself, in Methods',()=>{
  const [note]=derivedNotes([input('table-viii',snow)]);
  assert.equal(note.kind,'derived');
  assert.equal(note.section,'Methods','a source is part of how the study was made');
  assert.equal(note.fn,'source');
  assert.equal(note.text,snow.what,'the practitioner’s own words for what the data is');
  assert.match(note.detail,/CC0-1\.0/,'carrying what the licence requires');
  assert.equal(note.nodeId,'table-viii');
});

test('an input with no provenance yields nothing, and nothing is invented for it',()=>{
  assert.deepEqual(derivedNotes([input('bare',undefined)]),[]);
  // A declaration with no statement of what the data IS has nothing a reader could use. The
  // attribution alone is a licence line, not a sentence in a write-up.
  assert.deepEqual(derivedNotes([input('licence-only',{licence:'CC0-1.0'})]),[]);
});

test('a source two widgets share is one citation, not two',()=>{
  const notes=derivedNotes([input('table-viii',snow),input('also-table-viii',snow)]);
  assert.equal(notes.length,1,'a write-up that says it twice reads as two sources');
  assert.equal(notes[0].nodeId,'table-viii','the first to declare it carries it');
});

test('two different sources are two citations',()=>{
  const boundaries={what:'The 32 registration sub-districts',
    source:'Koch and Denike (2006)',licence:'BSD-2-Clause',represents:'1855'};
  const notes=derivedNotes([input('table-viii',snow),input('sub-districts',boundaries)]);
  assert.equal(notes.length,2);
  assert.deepEqual(notes.map(n=>n.nodeId),['table-viii','sub-districts']);
});
