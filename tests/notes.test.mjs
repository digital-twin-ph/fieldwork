/** THE NOTES A WRITE-UP IS MADE OF, read and grouped.
 *
 *  Two kinds, and the whole reason this module exists is that they have to be readable in one
 *  place: Snow's own sentences, carried verbatim, beside this application's account of what it did
 *  to his numbers. The fixture here is the nine quoted notes the South London repository ships, not
 *  a constructed set -- they are the only quoted notes that exist.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {readNotes,groupNotes,noteExtent,WRITE_UP_PARTS,MAX_NOTES} from '../build/notes.js';

const QUOTED='../example-1855-cholera-south-london/notes/snow-quotations.json';
const snowNotes=()=>JSON.parse(readFileSync(QUOTED,'utf8')).notes;
const skip=existsSync(QUOTED)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('the nine quoted notes the example ships are read as they stand',{skip},()=>{
  const {notes,unreadable}=readNotes(snowNotes());
  assert.equal(notes.length,9);
  assert.equal(unreadable,0,'the schema the example ships is the schema this reads');
  assert.ok(notes.every(n=>n.kind==='quoted'));
  // Capitalised, which is the spelling both kinds now use.
  assert.deepEqual([...new Set(notes.map(n=>n.section))].sort(),
    ['Discussion','Introduction','Methods']);
});

test('a section outside the body is dropped rather than coerced into one',()=>{
  const {notes,unreadable}=readNotes([
    {kind:'quoted',id:'a',section:'Methods',quote:'kept'},
    {kind:'quoted',id:'b',section:'Abstract',quote:'an abstract is assembled, not written here'},
    {kind:'quoted',id:'c',section:'methods',quote:'the old lowercase spelling'},
  ]);
  assert.equal(notes.length,1);
  assert.equal(notes[0].id,'a');
  assert.equal(unreadable,2,'putting a sentence under a heading nobody chose is worse than omitting it');
});

test('a note with no words is not a note',()=>{
  const {notes,unreadable}=readNotes([
    {kind:'quoted',id:'a',section:'Methods',quote:'   '},
    {kind:'machined',section:'Methods',text:''},
    {kind:'quoted',section:'Methods',quote:'no id'},
    {kind:'sung',section:'Methods',text:'not a kind this knows'},
    'not a record',
  ]);
  assert.deepEqual(notes,[]);
  assert.equal(unreadable,5);
});

test('both kinds are read, and a machined note keeps the node that made it',()=>{
  const {notes}=readNotes([
    {kind:'quoted',id:'snow-1',section:'Introduction',fn:'purpose',
      establishes:'That it was a natural experiment.',quote:'ready made before the observer'},
    {kind:'machined',section:'Methods',nodeId:'supply',text:'water_supply was brought across.'},
  ]);
  assert.equal(notes[0].kind,'quoted');
  assert.equal(notes[0].establishes,'That it was a natural experiment.');
  assert.equal(notes[1].kind,'machined');
  assert.equal(notes[1].nodeId,'supply','a note produced by a workflow links to the workflow');
});

test('more notes than a write-up can hold are not silently kept',()=>{
  const many=Array.from({length:MAX_NOTES+5},(_,i)=>
    ({kind:'quoted',id:`n${i}`,section:'Methods',quote:`note ${i}`}));
  const {notes,unreadable}=readNotes(many);
  assert.equal(notes.length,MAX_NOTES);
  assert.equal(unreadable,5,'the overflow is counted rather than dropped in silence');
});

test('every part of the body is returned, including the empty ones',{skip},()=>{
  const {notes}=readNotes(snowNotes());
  const groups=groupNotes(notes);
  assert.deepEqual(groups.map(g=>g.section),[...WRITE_UP_PARTS]);
  const counted=Object.fromEntries(groups.map(g=>[g.section,g.count]));
  assert.deepEqual(counted,{Introduction:2,Methods:5,Results:0,Discussion:2});
  // An absent Results section is a fact about the write-up and the place a practitioner adds one.
  assert.deepEqual(groups.find(g=>g.section==='Results').groups,[]);
});

test('the known functions are ordered first, and an unknown one is kept as written',()=>{
  const {notes}=readNotes([
    {kind:'quoted',id:'d',section:'Introduction',fn:'sidebar',quote:'an unknown function'},
    {kind:'quoted',id:'c',section:'Introduction',fn:'purpose',quote:'third known'},
    {kind:'quoted',id:'a',section:'Introduction',fn:'background',quote:'first known'},
  ]);
  const intro=groupNotes(notes).find(g=>g.section==='Introduction');
  assert.deepEqual(intro.groups.map(g=>g.fn),['background','purpose','sidebar'],
    'background, related literature, purpose -- the practitioner\'s own order, then the rest');
});

test('the running count is over what a reader would read',()=>{
  const {notes}=readNotes([
    {kind:'quoted',id:'a',section:'Methods',quote:'two words',
      establishes:'This reason is not part of the write-up and is not counted.'},
    {kind:'machined',section:'Methods',text:'three more words'},
  ]);
  const extent=noteExtent(notes);
  assert.equal(extent.notes,2);
  assert.equal(extent.words,5);
  assert.equal(extent.characters,'two words'.length+'three more words'.length);
});

/** A MODERN GEOMETRY STANDING IN FOR A HISTORICAL ONE is the first machined `limitation`, on the
 *  ruling that *"If it's a modern polygon, a machined note for it goes under Limitations (notes)"*.
 *  Both halves are pinned here: that it reaches Discussion under that function, and that filing it
 *  under a section called `Limitations` is refused rather than coerced. */
test('a machined limitation is a function of Discussion, and a Limitations section is refused',()=>{
  const {notes,unreadable}=readNotes([
    {kind:'machined',section:'Discussion',fn:'limitation',nodeId:'thames',
      text:'The waterway polygon is modern; the 1854 banks differ, the Victoria Embankment '
        +'narrowing the central river from 1865.'},
    {kind:'machined',section:'Limitations',text:'This one names a part the body does not have.'},
  ]);
  assert.equal(notes.length,1,'the note under a section outside the body is dropped');
  assert.equal(unreadable,1,'and the drop is counted, so a caller can say so');
  assert.equal(notes[0].fn,'limitation');

  const discussion=groupNotes(notes).find(part=>part.section==='Discussion');
  assert.equal(discussion.count,1);
  assert.deepEqual(discussion.groups.map(g=>g.fn),['limitation'],
    'grouped by the function, which needed no change to the closed set of body parts');
});
