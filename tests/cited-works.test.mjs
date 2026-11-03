import test from 'node:test';
import assert from 'node:assert/strict';
import {readNotes} from '../build/notes.js';
import {referenceList,workKey} from '../build/references.js';
import {renderCitation} from '../build/input-provenance.js';

/** A WORK IS CITED FROM ITS NOTE, and References is assembled from what is cited. The practitioner,
 *  2026-11-02: *"There should be no References notes. A Reference entry is there because there is an
 *  entry in the main body ... where provenance is known."* */
const vaccine={citation:{type:'article',title:'Mapping the distribution of zero-dose children',
  authors:[{family:'Utazi',given:'C. Edson'}],container:'Vaccine',doi:'https://doi.org/10.1016/j.vaccine.2022.11.026'},published:'2022'};
const guide={citation:{type:'book',title:'Guide to DHS Statistics',etAl:true,publisher:'ICF',place:'Rockville',
  authors:[{family:'Croft',given:'Trevor N.'},{family:'Allen',given:'Courtney K.'}]},published:'2023'};
const note=(id,section,works)=>({kind:'authored',id,section,text:'A sentence.',works});

test('a work cited by two notes is one reference, numbered where it is first met',()=>{
  const notes=[note('a','Methods',[guide,vaccine]),note('b','Discussion',[vaccine])];
  const list=referenceList([],notes);
  assert.deepEqual(list.map(r=>r.kind),['work','work']);
  assert.equal(list[1].workKey,workKey(vaccine));
  assert.equal(workKey(vaccine),'doi:10.1016/j.vaccine.2022.11.026','a pasted doi.org link is the same work');
});

test('et al. ends the author list in every style, rather than presenting the listed authors as all',()=>{
  const p={licence:'unstated',citation:guide.citation,published:'2023'};
  assert.match(renderCitation(p,'vancouver'),/^Croft TN, Allen CK, et al\./);
  assert.match(renderCitation(p,'apa-7'),/^Croft, T\. N\., Allen, C\. K\., et al\./);
  assert.match(renderCitation(p,'chicago-author-date'),/^Croft, Trevor N\., Courtney K\. Allen, et al\./);
});

test('works survive reading back, and one that no style could print is dropped',()=>{
  const {notes}=readNotes([note('a','Methods',[vaccine,{citation:{type:'article',title:'',authors:[]},published:''}])]);
  assert.equal(notes[0].works.length,1);
  assert.equal(notes[0].works[0].citation.container,'Vaccine');
});
