import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceList,referenceCount} from '../build/references.js';
import {WRITE_UP_PARTS} from '../build/notes.js';

/** THE WORKS A WRITE-UP CITES.
 *
 *  The practitioner, 2026-10-30: *"There is no aggregate References section."* Placed as a fifth
 *  part of the outline on their ruling, rather than as a panel beside it. Experiment 141. */

const machined=(cites)=>({kind:'machined',id:'n:equation',section:'Methods',text:'x',cites});
const derived=(detail)=>({kind:'derived',id:'d',section:'Methods',text:'x',detail});

test('References is a part of the outline, and it is the last one',()=>{
  assert.equal(WRITE_UP_PARTS.at(-1),'References');
  assert.deepEqual([...WRITE_UP_PARTS],
    ['Introduction','Methods','Results','Discussion','References']);
});

test('a method with a source is listed as that source',()=>{
  const list=referenceList([{workflowName:'Died or survived',
    machined:[machined(['Katz log'])],derived:[]}]);
  assert.equal(list.length,1);
  assert.match(list[0].text,/Katz D, Baptista J, Azen SP, Pike MC\./);
  assert.match(list[0].text,/doi:10\.2307\/2530610/);
  assert.equal(list[0].kind,'method');
  assert.equal(list[0].uncited,undefined);
  assert.deepEqual(list[0].citedBy,['Died or survived']);
});

test('A METHOD WITH NO SOURCE IS LISTED AS HAVING NONE, not left out',()=>{
  // A reader meeting a short list cannot tell a method nobody has looked up from a method with
  // nothing to look up. `conventionalLabelSource`'s distinction, on the surface a reader acts on.
  const list=referenceList([{workflowName:'W',machined:[machined(['Wald unpooled'])],derived:[]}]);
  assert.equal(list.length,1);
  assert.equal(list[0].uncited,true);
  assert.match(list[0].text,/^Wald unpooled: /);
  assert.match(list[0].text,/No primary source has been read for it/);
});

test('a work cited by several workflows is listed once and names them all',()=>{
  const list=referenceList([
    {workflowName:'Per house',machined:[machined(['Katz log'])],derived:[]},
    {workflowName:'Died or survived',machined:[machined(['Katz log','Wald log'])],derived:[]},
  ]);
  assert.equal(list.filter(r=>/Katz/.test(r.text)).length,1);
  assert.deepEqual(list.find(r=>/Katz/.test(r.text)).citedBy,['Per house','Died or survived']);
  assert.equal(list.length,2);
});

test('a source an input declares is a reference, and a source declaring nothing is not',()=>{
  // 144's rule: a gap refuses the whole citation, because a half-rendered reference looks
  // checkable and is not. A derived note with no attribution is a gap in the INPUT, which the
  // input's own surface reports; it is not a reference with a piece missing.
  const list=referenceList([{workflowName:'The ground',
    derived:[derived('Snow J. On the Mode of Communication of Cholera. 1855.'),
      derived('   '),derived(undefined)],machined:[]}]);
  assert.equal(list.length,1);
  assert.equal(list[0].kind,'source');
  assert.match(list[0].text,/Snow J\./);
});

test('sources come before methods, in the order the workflows introduced them',()=>{
  // NOT ALPHABETISED. An alphabetical list is a convention a venue imposes at the end, and
  // imposing it here would reorder the part when a dataset is renamed — 141's rule about
  // numbering, one field over.
  const list=referenceList([
    {workflowName:'W1',machined:[machined(['Katz log'])],derived:[derived('Zed source.')]},
    {workflowName:'W2',machined:[],derived:[derived('Alpha source.')]},
  ]);
  assert.deepEqual(list.map(r=>r.kind),['source','source','method']);
  assert.deepEqual(list.map(r=>r.text),
    ['Zed source.','Alpha source.',list[2].text]);
});

test('the count reports works and stated absences separately',()=>{
  const list=referenceList([{workflowName:'W',
    machined:[machined(['Katz log','Wald unpooled'])],derived:[derived('A source.')]}]);
  assert.deepEqual(referenceCount(list),{works:2,uncited:1});
  assert.deepEqual(referenceCount([]),{works:0,uncited:0});
});

test('a write-up that cites nothing produces no list rather than an empty one',()=>{
  assert.deepEqual(referenceList([]),[]);
  assert.deepEqual(referenceList([{workflowName:'W',machined:[],derived:[]}]),[]);
  assert.deepEqual(referenceList([{workflowName:'W',machined:[machined([])],derived:[]}]),[]);
});

test('an input whose licence is absent is credited, not credited to "undefined"',async()=>{
  // Found on 2026-10-30 in the References part on South London, the day the part was built:
  // "Derived in Fieldwork from the sub-district layer · undefined". `attributionFor` guarded the
  // two licence values that mean "no obligation" and interpolated anything else, including a
  // record that carries no licence at all. The part is the first surface that puts attributions
  // in front of a reader as references, which is why six weeks of the same string went unread.
  const {attributionFor}=await import('../build/input-provenance.js');
  assert.equal(attributionFor({source:'Derived in Fieldwork from the sub-district layer'}),
    'Derived in Fieldwork from the sub-district layer');
  assert.doesNotMatch(attributionFor({source:'X',licence:undefined}),/undefined/);
  assert.equal(attributionFor({source:'X',licence:'   '}),'X');
  // Unchanged where a licence IS stated.
  assert.equal(attributionFor({source:'X',licence:'CC0-1.0'}),'X · CC0-1.0');
});
