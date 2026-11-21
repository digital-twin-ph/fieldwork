import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeKeyColumn,joinSentence,joinDraftOf,joinTableWalkthrough} from '../build/area-join-ui.js';
import {keyColumnForRun} from '../build/area-join.js';

/** JOIN'S COLUMN PROPOSED FROM THE NAMES (2026-11-20), and its Show me how ending on what the join itself makes. */
const table={kind:'data-table',keys:['unit','geoboundaries_name'],valueField:'total',rowCount:3,missingValueCount:0,
  rows:[{key:{unit:'Kivu',geoboundaries_name:'Nord-Kivu'},value:1},{key:{unit:'Kivu',geoboundaries_name:'Sud-Kivu'},value:2},{key:{unit:'Shaba',geoboundaries_name:'Haut-Katanga'},value:3}]};
const parts=[{id:'a',name:'Nord-Kivu'},{id:'b',name:'Sud-Kivu'},{id:'c',name:'Maniema'}];
test('the column naming the most parts is proposed, with how many it names',()=>{
  assert.deepEqual(proposeKeyColumn(table,parts,table.keys,'fuzzy'),{column:'geoboundaries_name',named:2,rows:2});
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

/** A RUN WITH NO COLUMN CHOSEN (2026-11-21: Nigeria's LGAs joined to its states stopped on 'The table has no column ""'). */
test('a run with no column chosen joins on the proposal when it names each part once',()=>{
  assert.equal(keyColumnForRun(table,parts,'fuzzy'),'geoboundaries_name');
});
test('a table finer than the study area is said to be, not joined on its first rows',()=>{
  const lgas={...table,keys:['state_geoboundaries','geoboundaries_name'],rows:[
    {key:{state_geoboundaries:'Kano',geoboundaries_name:'Ajingi'},value:1},{key:{state_geoboundaries:'Kano',geoboundaries_name:'Albasu'},value:2},
    {key:{state_geoboundaries:'Lagos',geoboundaries_name:'Ikeja'},value:3},{key:{state_geoboundaries:'Lagos',geoboundaries_name:'Epe'},value:4}]};
  const states=[{id:'k',name:'Kano'},{id:'l',name:'Lagos'}];
  assert.deepEqual(proposeKeyColumn(lgas,states,lgas.keys,'fuzzy'),{column:'state_geoboundaries',named:2,rows:4});
  assert.throws(()=>keyColumnForRun(lgas,states,'fuzzy'),/"state_geoboundaries" \(2 of 2\), but in 4 rows, about 2 each.*finer than the study area/);
});
test('a table naming no part says what its columns and the parts are called',()=>{
  assert.throws(()=>keyColumnForRun(table,[{id:'x',name:'Elsewhere'}],'fuzzy'),/columns are unit, geoboundaries_name, and the parts are called Elsewhere\. Choose/);
});

/** THE LEVELS, SAID BEFORE A RUN, AND IDS JOINED ON (the practitioner, 2026-11-21: Nigeria's LGAs joined to its states,
 *  "How can we alert the user that the admin levels are different?", then "yes" to a warning and a join on IDs). */
import {levelMismatch,censusTableLevel} from '../build/boundary-levels.js';
import {joinTableToAreas} from '../build/area-join.js';
const RAW='https://raw.githubusercontent.com/digital-twin-ph/census-tables/e688e90a7fb7df7c880a185b61b7e7371d3bd1ec/';
test("a census table's level is read from its address, and a study area at another level is said to be",()=>{
  assert.deepEqual(censusTableLevel(RAW+'NGA/lgas.csv'),{iso3:'NGA',country:'Nigeria',level:'ADM2',rows:774});
  assert.equal(censusTableLevel('https://example.org/NGA/lgas.csv'),undefined);
  assert.equal(levelMismatch(RAW+'NGA/lgas.csv','NGA-ADM2-27671186'),undefined);
  assert.match(levelMismatch(RAW+'NGA/lgas.csv','NGA-ADM1-27671186'),/census at ADM2, 774 rows; the study area is at ADM1\. The table is finer .*Choose “Its 37 states/);
  assert.match(levelMismatch(RAW+'NGA/states.csv','NGA-ADM2-27671186'),/coarser than the study area/);
  assert.match(levelMismatch(RAW+'NGA/states.csv','KEN-ADM1-1'),/in KEN: no part will be named/);
  assert.equal(levelMismatch(undefined,'NGA-ADM1-1'),undefined);
});
test('two parts with one name each take their own row when the column gives their IDs',()=>{
  const lgas={kind:'data-table',keys:['geoboundaries_name','geoboundaries_id'],valueField:'total',rowCount:3,missingValueCount:0,rows:[
    {key:{geoboundaries_name:'Obi',geoboundaries_id:'B1'},value:100},{key:{geoboundaries_name:'Obi',geoboundaries_id:'N1'},value:200},
    {key:{geoboundaries_name:'Makurdi',geoboundaries_id:'B2'},value:300}]};
  const parts=[{id:'B1',name:'Obi'},{id:'N1',name:'Obi'},{id:'B2',name:'Makurdi'}];
  assert.deepEqual(proposeKeyColumn(lgas,parts,lgas.keys,'fuzzy'),{column:'geoboundaries_id',named:3,rows:3});
  const j=joinTableToAreas(parts,lgas,{keyField:'geoboundaries_id'});
  assert.deepEqual(j.parts.map(p=>p.value),[100,200,300]);assert.equal(j.declared.matchedOn,'id');
  assert.equal(j.diagnostics.length,0);
  const byName=joinTableToAreas(parts,lgas,{keyField:'geoboundaries_name'});
  assert.equal(byName.declared.matchedOn,'name');assert.ok(byName.diagnostics.some(d=>d.code==='multiple-data-rows'));
});
