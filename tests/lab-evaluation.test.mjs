/** A lab evaluation pass (experiment 184): findings only, read back tolerantly, written as Markdown to read. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {HEURISTICS,readPass,toMarkdown,fileStem} from '../build/lab-evaluation.js';

const pass={schema:'fieldwork/lab-evaluation/1',evaluator:'Herman',screen:'Notes tab › Note dialog',
  widget:{type:'chart_output',version:'0.11.0'},appVersion:'v0.43.0',at:'2026-11-07T10:20:30.000Z',
  findings:[{heuristic:'H3',happens:'Discard keeps the note | as unwritten',costs:'Notes pile up',textKind:'instruction'},
    {heuristic:'H8',happens:'',costs:''}],works:'Counts update as you type.'};

test('the ten heuristics, in Nielsen’s order, each with a question',()=>{
  assert.deepEqual(HEURISTICS.map(h=>h.id),['H1','H2','H3','H4','H5','H6','H7','H8','H9','H10']);
  for(const h of HEURISTICS)assert.match(h.ask,/\?$/);
});

test('a blank finding is a blank row, not a finding; anything else is kept',()=>{
  const read=readPass(pass);
  assert.equal(read.findings.length,1);
  assert.equal(read.findings[0].textKind,'instruction');
  assert.deepEqual(read.widget,{type:'chart_output',version:'0.11.0'});
  assert.equal(readPass({schema:'something else'}),null);
});

test('the Markdown names the screen, the evaluator and the version, and holds no severity',()=>{
  const md=toMarkdown(pass);
  assert.match(md,/# Lab evaluation: Notes tab › Note dialog/);
  assert.match(md,/- Evaluator: Herman/);
  assert.match(md,/- Widget: chart_output 0\.11\.0/);
  assert.match(md,/\| 1 \| H3 User control and freedom \| Discard keeps the note \\\| as unwritten \| Notes pile up \| instruction \|/);
  assert.match(md,/## Findings \(1\)/);
  assert.doesNotMatch(md,/[Ss]everity:|\| Severity/);
});

test('the file name sorts by screen, evaluator and moment',()=>{
  assert.equal(fileStem(pass),'fieldwork-evaluation-notes-tab-note-dialog-herman-2026-11-07T102030');
});
