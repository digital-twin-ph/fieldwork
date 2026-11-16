import test from 'node:test';
import assert from 'node:assert/strict';
const {projectOutline,outlineMarkup,noteFills,TARGETS}=await import('../build/outline.js');
const {readNotes,readNoteItems,UNWRITTEN}=await import('../build/notes.js');
const {validateProject}=await import('../build/project.js');

/** THE OUTLINE OF WHAT A PROJECT WRITES TOWARDS (experiment 202, Stage A, 2026-11-15): a note's role is its section and
 *  its function; a target's outline is slots of roles; the board shows each slot's state and coverage per target. */
const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const notes=[
  {kind:'quoted',id:'q1',section:'Introduction',fn:'rationale',quote:'As there is no difference whatever…'},
  {kind:'authored',id:'o1',section:'Introduction',fn:'objective',text:'Our objectives were to:',items:[
    {id:'a',text:'reproduce the comparison per house'},{id:'b',text:'recompute it per person'},{id:'c',text:'compare 1854 with 1849'}]},
  {kind:'authored',id:'m1',section:'Methods',fn:'verification',text:'The four tables were transcribed and checked.'},
  {kind:'machined',id:'s:description',section:'Methods',fn:'source',text:'Snow 1855, Table VIII.'},
  {kind:'machined',id:'r:description',section:'Results',text:'**Deaths per house.** 3 rows.'},
  {kind:'authored',id:'l1',section:'Discussion',fn:'limitation',text:'One company per sub-district is wrong where pipes mix.'},
];

test('every target can be named, and a project keeps only targets that exist, each once',()=>{
  assert.deepEqual(TARGETS.map(t=>t.id),['publication','sitrep-who','sitrep-ocha','surveillance-ecdc','surveillance-mmwr','mmwr-report']);
  const raw={schema:'fieldwork/project/2',id:'p',name:'P',subject:'S',workflows:[],targets:['publication','poster','sitrep-who','publication',7]};
  assert.deepEqual(validateProject(raw).targets,['publication','sitrep-who']);
  assert.equal(validateProject({...raw,targets:['poster']}).targets,undefined,'none known: not chosen yet');
});

test('a note fills a role by its section and function; a limitation fills only limitations',()=>{
  const role={source:'notes',part:'Methods',fns:['verification'],label:'Data checks'};
  assert.equal(noteFills(notes[2],role),true);
  assert.equal(noteFills(notes[3],role),false);
  assert.equal(noteFills(notes[5],{source:'limitations',label:'Limitations'}),true);
  assert.equal(noteFills(notes[5],{source:'notes',part:'Discussion',label:'Interpretation'}),false);
  assert.equal(noteFills({kind:'authored',id:'x',section:'Methods',fn:'verification',text:UNWRITTEN},role),false,'a note not yet written fills nothing');
});

test('one outline for two targets: the union of their slots, which target uses each, coverage per target',()=>{
  const o=projectOutline(['publication','sitrep-who'],notes,{title:'Cholera and the water supply'},2);
  const slot=r=>o.slots.find(s=>s.role===r);
  assert.equal(slot('objectives').filled,3,'three objectives, as items of one note');
  assert.equal(slot('dataChecks').filled,1);
  assert.equal(slot('dataSources').filled,1);
  assert.equal(slot('situation').filled,1);
  assert.equal(slot('limitations').filled,1);
  assert.equal(slot('title').filled,1,'written in the draft');
  assert.equal(slot('keyMessages').filled,0);
  assert.deepEqual(Object.keys(slot('highlights').byTarget),['sitrep-who'],'only the sit rep uses highlights');
  assert.deepEqual(Object.keys(slot('background').byTarget),['publication','sitrep-who']);
  assert.equal(slot('background').byTarget['sitrep-who'].length,'1 or 2 sentences');
  const pub=o.coverage.find(c=>c.target==='publication');
  assert.equal(pub.of,15);
  assert.ok(pub.filled>=7&&pub.filled<pub.of);
});

test('the board shows each slot, its state and what each target wants; an empty notes slot offers a note of its role',()=>{
  const html=outlineMarkup(projectOutline(['publication'],notes,{},0),esc,true);
  assert.match(html,/<strong>Publication<\/strong>: \d+ of 15 filled/);
  assert.match(html,/data-outline-role="objectives"[\s\S]*?3 objectives/);
  assert.match(html,/data-outline-role="principalFinding"[\s\S]*?empty[\s\S]*?data-add-note="Discussion" data-add-fn="finding"/);
  assert.match(html,/data-outline-role="keyMessages"[\s\S]*?Write it in the draft/);
  assert.doesNotMatch(outlineMarkup(projectOutline(['publication'],notes,{},0),esc,false),/data-add-note|Write it/,'nowhere to keep it, nothing offered');
  assert.equal(outlineMarkup(projectOutline([],notes,{},0),esc,true),'','no target named, no outline');
});

test('an enumerating note keeps its items, each with its own id, once',()=>{
  assert.deepEqual(readNoteItems([{id:'a',text:' one '},{id:'a',text:'two'},{id:'',text:'x'},{id:'b',text:'three',question:'p/w2'}]),
    [{id:'a',text:'one'},{id:'b',text:'three',question:'p/w2'}]);
  const [back]=readNotes([notes[1]]).notes??readNotes([notes[1]]);
  assert.equal(back.items.length,3);
});

test('a note\'s dialog says what its section and function become in each target',async()=>{
  const {slotsForNote}=await import('../build/outline.js');
  assert.deepEqual(slotsForNote(['publication','sitrep-who'],'Discussion','finding'),
    [{target:'publication',label:'Publication',heading:'Discussion: principal finding',length:'one paragraph'}]);
  const limits=slotsForNote(['publication','sitrep-who'],'Methods','limitation').map(s=>s.heading);
  assert.deepEqual(limits,['Discussion: limitations','Data notes: limits'],'a limitation is a limitation wherever it sits');
  assert.deepEqual(slotsForNote([],'Methods','source'),[],'no target, nothing to say');
});
