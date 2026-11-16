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

test('a finding becomes a GitHub issue in the repository\'s own form, each field filled from it',async()=>{
  const {findingIssueUrl}=await import('../build/lab-evaluation.js');
  const {readFileSync}=await import('node:fs');
  const pass={schema:'fieldwork/lab-evaluation/1',evaluator:'Lab tester',screen:'Notes › Note dialog',
    widget:{type:'map_output',version:'0.33.2'},appVersion:'0.128.0',at:'2026-11-15T00:00:00Z',findings:[],works:''};
  const url=new URL(findingIssueUrl(pass,{heuristic:'H4',happens:'Two words for one thing.',costs:'A reader thinks they differ.'}));
  const p=url.searchParams;
  assert.equal(p.get('template'),'lab-evaluation.yml');
  assert.equal(p.get('title'),'[Evaluation] Notes › Note dialog: Consistency and standards');
  assert.equal(p.get('heuristic'),'H4 Consistency and standards');
  assert.equal(p.get('widget'),'map_output 0.33.2');
  assert.equal(p.get('text-kind'),'not about text');
  // Every field the link fills is a field of the form, and every dropdown value one of its options.
  const form=readFileSync(new URL('../.github/ISSUE_TEMPLATE/lab-evaluation.yml',import.meta.url),'utf8');
  for(const key of [...p.keys()].filter(k=>!['template','title'].includes(k)))assert.match(form,new RegExp(`id: ${key}\\n`),key);
  assert.ok(form.includes(`"${p.get('heuristic')}"`),'the heuristic is one of the form\'s options');
  assert.ok(form.includes(`"${p.get('text-kind')}"`));
});
