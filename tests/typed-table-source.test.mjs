import test from 'node:test';
import assert from 'node:assert/strict';
import {tableDescriptionNote} from '../build/artifact-notes.js';
import {tableReceipt} from '../build/data-table.js';

// A TABLE NOBODY PUBLISHED. The Type or paste tab stores no file, and the surfaces that name a source were saying
// `typed.csv` -- a filename that does not exist -- in a machined note and in fw:sourceFile.
const table=(source)=>({kind:'data-table',keys:['species'],valueField:'value',columns:['species','value'],
  rows:[{key:{species:'Eidolon helvum'},value:55}],rowCount:1,missingValueCount:0,source});
const typed={filename:'typed.csv',bytes:40,sha256:'abcdef0123456789',rows:1,typed:true};
const read={filename:'nga-lga-2024.csv',bytes:40,sha256:'abcdef0123456789',rows:1};

test('a typed table is not said to be read from a file',()=>{
  const note=tableDescriptionNote(table(typed),'Species','n');
  assert.match(note.text,/Typed into this step/);
  assert.doesNotMatch(note.text,/typed\.csv/);
  assert.match(note.text,/sha256/,'the digest still stands: it is the rows as read');
});

test('the receipt claims no source file for a typed table, and keeps the digest',()=>{
  const node={id:'n',params:{label:'Species'}};
  const {receipt:{facts}}=tableReceipt(node,table(typed),'r');
  assert.doesNotMatch(facts,/sourceFile/);
  assert.match(facts,/enteredByHand true/);
  assert.match(facts,/sourceDigest/);
});

test('a table read from a file still names the file',()=>{
  const node={id:'n',params:{label:'Species'}};
  const {receipt:{facts}}=tableReceipt(node,table(read),'r');
  assert.match(facts,/sourceFile "nga-lga-2024\.csv"/);
  assert.doesNotMatch(facts,/enteredByHand/);
});
