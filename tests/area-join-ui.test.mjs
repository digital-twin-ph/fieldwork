import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeKeyColumn,joinSentence,joinDraftOf,joinTableWalkthrough} from '../build/area-join-ui.js';

/** JOIN'S COLUMN PROPOSED FROM THE NAMES (2026-11-20), and its Show me how ending on what the join itself makes. */
const table={kind:'data-table',keys:['unit','geoboundaries_name'],valueField:'total',rowCount:3,missingValueCount:0,
  rows:[{key:{unit:'Kivu',geoboundaries_name:'Nord-Kivu'},value:1},{key:{unit:'Kivu',geoboundaries_name:'Sud-Kivu'},value:2},{key:{unit:'Shaba',geoboundaries_name:'Haut-Katanga'},value:3}]};
const parts=[{id:'a',name:'Nord-Kivu'},{id:'b',name:'Sud-Kivu'},{id:'c',name:'Maniema'}];
test('the column naming the most parts is proposed, with how many it names',()=>{
  assert.deepEqual(proposeKeyColumn(table,parts,table.keys,'fuzzy'),{column:'geoboundaries_name',named:2});
  assert.equal(proposeKeyColumn(table,[{id:'x',name:'Elsewhere'}],table.keys,'fuzzy'),undefined);
});
test('a chosen column is kept; none chosen, the proposal fills the draft',()=>{
  assert.equal(joinDraftOf({label:'j',keyField:'unit',normalisation:'fuzzy'},table,parts,table.keys).keyField,'unit');
  const d=joinDraftOf({label:'j',keyField:'',normalisation:'fuzzy'},table,parts,table.keys);
  assert.equal(d.keyField,'geoboundaries_name');assert.equal(d.proposed,2);
});
test('the sentence says what is missing, then what the step will do',()=>{
  assert.match(joinSentence({label:'j',keyField:'',normalisation:'fuzzy'},'Census','Provinces'),/once the column naming each part is chosen/);
  assert.match(joinSentence({label:'j',keyField:'name',normalisation:'exact'},'Census','Provinces'),/"name".*exactly/);
});
test('Show me how ends on the join’s own result, under the matching chosen',()=>{
  const fuzzy=joinTableWalkthrough('fuzzy'),exact=joinTableWalkthrough('exact');
  assert.match(fuzzy.steps.at(-1).text,/2 of 3 parts with a value, 1 row naming no part/);
  assert.match(exact.steps.at(-1).text,/1 of 3 parts with a value, 2 row naming no part/);
  assert.ok(fuzzy.steps.at(-1).final);
});
