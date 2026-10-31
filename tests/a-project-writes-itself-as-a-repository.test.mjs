import test from 'node:test';
import assert from 'node:assert/strict';
import {repositoryFiles,workflowFileName,formatDeclaration,FILENAME_CEILING}
  from '../build/project-repository.js';

/** A PROJECT AS A GIT REPOSITORY, WRITTEN BY THE APPLICATION THAT HOLDS IT.
 *
 *  Experiment 150 designed this layout, measured it and published it as
 *  `digital-twin-ph/fieldwork-project-template` — and nothing in Fieldwork could write it, which
 *  the template's own format declaration had to say. The practitioner, 2026-10-31, on why that
 *  gap mattered: *"it is a selling point of FW, to decrease friction everywhere in the
 *  epidemiologist's workflow, from designing an investigation, implementing its workflows and
 *  managing evidence generation, and publication."* */

const project=(over={})=>({id:'p-1',name:'A study',subject:'Whether x changed y',
  workflows:[],createdAt:'2026-10-01T00:00:00.000Z',changedAt:'2026-10-02T00:00:00.000Z',
  authors:[{login:'someone',name:'Someone',basis:'declared'}],...over});
const wf=(key,name)=>({key,document:{name,nodes:[],edges:[]}});

test('THE FILE NAMES REPRODUCE THE PUBLISHED CONVERSION, all eight',()=>{
  // Read from `origin/repository-layout` of the example repository on 2026-10-31. The rule is
  // not re-chosen here: a layout already published is a layout an existing clone depends on.
  const pairs=[
    ['Deaths per 1,000 people, by sub-district','deaths-per-1-000-people-by-sub-district'],
    ['The ground: an extent, its sub-districts and the river',
     'the-ground-an-extent-its-sub-districts-and-the-r'],
    ['Snow’s Map 2, 1855, as published','snow-s-map-2-1855-as-published'],
    ['Cholera in 1849 compared with 1854','cholera-in-1849-compared-with-1854'],
    ['Deaths per 1,000 people, mapped','deaths-per-1-000-people-mapped'],
    ['Deaths per house, by water company','deaths-per-house-by-water-company'],
    ['Died or survived, by water supply','died-or-survived-by-water-supply'],
    ['The river as it runs: the Thames, the sub-districts and the intakes',
     'the-river-as-it-runs-the-thames-the-sub-district'],
  ];
  for(const [name,file] of pairs)assert.equal(workflowFileName(name),file,name);
  // A truncation never leaves a name ending in punctuation.
  assert.ok(!workflowFileName('A name that runs on and on and on and on and on and on').endsWith('-'));
  assert.ok(workflowFileName('x'.repeat(200)).length<=FILENAME_CEILING);
});

test('NAMED FOR THE WORKFLOW, NEVER FOR ITS MINTED KEY',()=>{
  // `mintWorkflowKey` makes `${projectId}/w${n}` and the project id carries a dedupe counter, so
  // a key identifies nothing across a clone — it broke three validation-lab fixtures on
  // 2026-10-31. A reviewer needs the name.
  const files=repositoryFiles({project:project(),
    workflows:[wf('a-project-4/w7','Died or survived, by water supply')]});
  assert.ok(files.has('workflows/died-or-survived-by-water-supply.json'));
  for(const path of files.keys())assert.doesNotMatch(path,/w7|a-project-4/);
  // And project.json points at the FILES, because that list is what a reader follows to disk.
  assert.deepEqual(JSON.parse(files.get('project.json')).workflows,
    ['died-or-survived-by-water-supply']);
});

test('a filename clash is REFUSED, never resolved with a suffix',()=>{
  // Appending `-2` would hide, in a pull request, that two workflows cannot be told apart —
  // which is the one place it matters most.
  assert.throws(()=>repositoryFiles({project:project(),
    workflows:[wf('p/w1','Deaths, by company'),wf('p/w2','Deaths by company!')]}),
    /both make the file name/);
});

test('a workflow with no name is refused rather than filed under nothing',()=>{
  assert.throws(()=>repositoryFiles({project:project(),workflows:[wf('p/w1','   ')]}),
    /no name that makes a file name/);
});

test('one file per workflow, one per note, and the four fixed files',()=>{
  const files=repositoryFiles({project:project(),
    workflows:[wf('p/w1','First question'),wf('p/w2','Second question')],
    notes:{'snow-chloride-test':{id:'snow-chloride-test',kind:'quoted'},
           'a-machined-one':{id:'a-machined-one',kind:'machined'}}});
  assert.deepEqual([...files.keys()].sort(),[
    '.fieldwork/format.json','assets/manifest.json',
    'notes/a-machined-one.json','notes/snow-chloride-test.json',
    'project.json','workflows/first-question.json','workflows/second-question.json'].sort());
});

test('PRETTY-PRINTED, because the point of the layout is a readable diff',()=>{
  const files=repositoryFiles({project:project(),workflows:[wf('p/w1','One')]});
  for(const [path,text] of files){
    assert.match(text,/\n/,`${path} is on one line`);
    assert.ok(text.endsWith('\n'),`${path} has no trailing newline`);
    assert.doesNotThrow(()=>JSON.parse(text),`${path} is not JSON`);
  }
});

test('THE FORMAT DECLARATION DOES NOT CLAIM A ROUND TRIP IT CANNOT MAKE',()=>{
  // The template's copy said nothing in Fieldwork reads or writes this layout. Writing is now
  // true and reading is not, and a declaration that overstated it would invite somebody to
  // export a repository and expect to open it again.
  const declared=formatDeclaration();
  assert.match(declared.notYet,/WRITES THIS LAYOUT AND CANNOT YET READ IT/);
  assert.match(declared.notYet,/unbuilt/);
  assert.equal(declared.schema,'fieldwork/project-repository/1');
  // The rule that was learned rather than designed is carried in the layout itself.
  assert.match(declared.rules.naming,/never for its storage key/);
});

test('the manifest exists even with nothing in it, so a reader is not left guessing',()=>{
  const files=repositoryFiles({project:project(),workflows:[wf('p/w1','One')]});
  const manifest=JSON.parse(files.get('assets/manifest.json'));
  assert.deepEqual(manifest.assets,{});
  assert.deepEqual(manifest.acquired,{});
});
