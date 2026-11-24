import test from 'node:test';
import assert from 'node:assert/strict';
import {termsOf,outcomeFor,searchWikidata,narrowCandidates,linkTerms,WIKIDATA_ENTITY}
  from '../build/vocabulary-map.js';

/** A COLUMN'S TERMS LINKED TO WIKIDATA (experiment 232). The run applies what a person chose and asks nobody
 *  anything, so every check here is offline by construction, and the one that reaches a network is given its
 *  answers. */
const table=(terms)=>({kind:'data-table',keys:['lga'],valueField:'cases',
  rows:terms.map((t,i)=>({key:{lga:t},value:String(i+1)})),rowCount:terms.length,missingValueCount:0});
const node=(params)=>({id:'wd',type:'map_terms_to_vocabulary',x:0,y:0,
  params:{label:'Map to a vocabulary',column:'lga',decisions:{},...params}});
const AT='2026-11-24T10:00:00.000Z';
const chose=(qid,label,ofCandidates=6)=>({qid,label,decidedAt:AT,ofCandidates});

test('the distinct terms are what a person is asked about: trimmed, deduplicated, blanks left out',()=>{
  assert.deepEqual(termsOf(table(['Kano','Ungogo',' Kano ','','Kunchi']),'lga'),['Kano','Kunchi','Ungogo']);
});

test('looked and chose none is not the same as not looked up',()=>{
  const decisions={'Kano':chose('Q682571','Kano State'),'Ungogo':null};
  assert.equal(outcomeFor('Kano',decisions),'linked');
  assert.equal(outcomeFor('Ungogo',decisions),'none chosen','a deliberate decision not to link');
  assert.equal(outcomeFor('Kunchi',decisions),'not looked up','nobody has been asked yet');
  assert.equal(outcomeFor('   ',decisions),'no term');
});

test('each row gains the link a person chose, and nothing is guessed for the rest',()=>{
  const {value,receipt}=linkTerms(table(['Kano','Ungogo','Kunchi']),
    node({decisions:{'Kano':chose('Q682571','Kano State'),'Ungogo':null}}),'r','src');
  assert.ok(value.keys.includes('lga_wikidata'),'the link column is added');
  const link=t=>value.rows.find(r=>r.key.lga===t).key.lga_wikidata;
  assert.equal(link('Kano'),`${WIKIDATA_ENTITY}Q682571`);
  assert.equal(link('Ungogo'),'','a term left unlinked on purpose carries no link');
  assert.equal(link('Kunchi'),'','and neither does one nobody has looked up');
  // The two are told apart in words, because one is a finding and the other is unfinished work.
  assert.match(receipt.method,/deliberately left unlinked/);
  assert.match(receipt.method,/nobody has looked up yet/);
  assert.match(receipt.facts,/fw:linkedTermCount 1/);
  assert.match(receipt.facts,/fw:distinctTermCount 3/);
  assert.match(receipt.facts,/fw:unlinkedTermCount 2/);
});

test('the receipt says a link is a judgement and not an identity, and that Wikidata moves',()=>{
  const {receipt}=linkTerms(table(['Kano']),node({decisions:{'Kano':chose('Q682571','Kano State')}}),'r','src');
  assert.match(receipt.method,/NOT A CLAIM THAT THE ROW IS THAT ENTITY/);
  assert.match(receipt.method,/wrong one about once in four/,'why nothing was chosen by rank');
  assert.match(receipt.method,/edited by anyone and changes/);
  // The chosen entity is a subject an outside reader can follow, which is the point of linking.
  assert.match(receipt.facts,new RegExp(`<${WIKIDATA_ENTITY}Q682571> fw:namedByTerm "Kano"`));
});

test('the QID and the matched label are offered beside the link, and are not forced on the table',()=>{
  const plain=linkTerms(table(['Kano']),node({decisions:{'Kano':chose('Q682571','Kano State')}}),'r','src').value;
  assert.deepEqual(plain.keys,['lga','lga_wikidata'],'one column by default, as asked for');
  const more=linkTerms(table(['Kano']),
    node({alsoQid:true,alsoLabel:true,decisions:{'Kano':chose('Q682571','Kano State')}}),'r','src').value;
  assert.deepEqual(more.keys,['lga','lga_wikidata','lga_qid','lga_wikidata_label']);
  assert.equal(more.rows[0].key.lga_qid,'Q682571');
  assert.equal(more.rows[0].key.lga_wikidata_label,'Kano State');
});

test('a column that is not there, and a link column that would overwrite one, are refused in words',()=>{
  assert.throws(()=>linkTerms(table(['Kano']),node({column:'district'}),'r','src'),/has no "district" column/);
  assert.throws(()=>linkTerms(table(['Kano']),node({linkColumn:'lga'}),'r','src'),/already has a "lga" column/);
  assert.throws(()=>linkTerms(table(['Kano']),node({column:''}),'r','src'),/Choose the column/);
});

test('the search reads Wikidata’s answer and keeps only entities',async()=>{
  let asked='';
  const body={search:[
    {id:'Q182984',label:'Kano',description:'city in Nigeria'},
    {id:'Q682571',label:'Kano State',description:'state of Nigeria'},
    {id:'P31',label:'instance of',description:'a property, not an entity'},
    {label:'no id at all'}]};
  const got=await searchWikidata(' Kano ',{language:'en',limit:4,fetchJson:async url=>{asked=url;return body;}});
  assert.match(asked,/wbsearchentities/);
  assert.match(asked,/search=Kano/,'the term is trimmed and escaped');
  assert.match(asked,/language=en/);
  assert.deepEqual(got.map(c=>c.qid),['Q182984','Q682571'],'a property and a row with no id are not candidates');
  assert.equal(got[1].description,'state of Nigeria');
  assert.deepEqual(await searchWikidata('  ',{fetchJson:async()=>{throw new Error('must not be asked');}}),[],
    'a blank term asks nobody anything');
});

/** THE MEASUREMENT THAT DECIDED THE DESIGN, kept as a check so the reason survives the decision. Wikidata's own
 *  ranking for "Kano", recorded 2026-11-24: the city first, the state fourth. A step that took the top hit would
 *  put the wrong entity on every row of a Nigerian LGA table. */
test('narrowing by what the reader is looking for reorders, and hides nothing',()=>{
  const asRanked=[
    {qid:'Q182984',label:'Kano',description:'city in Nigeria'},
    {qid:'Q444224',label:'Kano',description:'English rapper, songwriter and actor'},
    {qid:'Q1654156',label:'Kano',description:'player character from the Mortal Kombat fighting game'},
    {qid:'Q682571',label:'Kano State',description:'state of Nigeria'}];
  const narrowed=narrowCandidates(asRanked,'state');
  assert.equal(narrowed[0].qid,'Q682571','what the reader asked for comes first');
  assert.equal(narrowed.length,asRanked.length,'and nothing is removed, so a filter cannot hide the right answer');
  assert.deepEqual(narrowCandidates(asRanked,'   ').map(c=>c.qid),asRanked.map(c=>c.qid),
    'no filter leaves Wikidata’s own order alone');
});
