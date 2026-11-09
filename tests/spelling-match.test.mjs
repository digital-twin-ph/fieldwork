import test from 'node:test';
import assert from 'node:assert/strict';
import {linkKey,linkNames} from '../build/spelling-match.js';
import {relateShape,relateTable} from '../build/relate-table.js';

/** RELATE ALLOWING FOR SPELLING (experiment 193). Made-up district names, as two sources spell them. */
const left=['Bo District','Bo District','Falaba District','Western Area Urban District','Kono District','Nowhere District','','Port  Loko District'];
const right=['Bo','Fabala','Western Area Urban','Port Loko','Kono','Konu'];
const settings={dropWords:['District'],threshold:0.88,decisions:{}};

test('a name is folded and its dropped words taken out as whole words only',()=>{
  assert.equal(linkKey('Bo District',['District']),'bo');
  assert.equal(linkKey('  Port  Loko-District ',['district']),'port loko');
  assert.equal(linkKey('Districtville',['District']),'districtville','a word containing a dropped word is kept');
});

test('each outcome: exact after folding, a spelling, an ambiguous name, and none',()=>{
  const m=linkNames(left,right,settings);
  assert.deepEqual(m.get('Bo District'),{outcome:'exact',value:'Bo',score:1,candidates:[{value:'Bo',score:1}]});
  assert.equal(m.get('Falaba District').outcome,'spelling');
  assert.equal(m.get('Falaba District').value,'Fabala');
  assert.ok(m.get('Falaba District').score>=0.88&&m.get('Falaba District').score<1);
  assert.equal(m.get('Port  Loko District').outcome,'exact','spacing is not a disagreement');
  assert.equal(m.get('Kono District').outcome,'exact','an exact name is not made ambiguous by a near one');
  assert.equal(m.get('Nowhere District').outcome,'none');
  assert.equal(m.has(''),false,'a blank name is not matched');
});

test('two names equally close wait for a person, and a choice settles it',()=>{
  const m=linkNames(['Kona District'],['Kono','Konu'],settings);
  assert.equal(m.get('Kona District').outcome,'ambiguous');
  assert.equal(m.get('Kona District').candidates.length,2);
  const chosen=linkNames(['Kona District'],['Kono','Konu'],{...settings,decisions:{'Kona District':'Kono'}});
  assert.equal(chosen.get('Kona District').value,'Kono');
  assert.equal(chosen.get('Kona District').decided,true);
  const none=linkNames(['Falaba District'],['Fabala'],{...settings,decisions:{'Falaba District':'none'}});
  assert.equal(none.get('Falaba District').value,undefined);
  assert.equal(none.get('Falaba District').decided,true);
});

test('Relate matches each row on the second table\'s spelling, says how, and leaves the rest to the unmatched decision',()=>{
  const table={kind:'data-table',keys:['Residential District'],valueField:'cases',rows:left.map((d,i)=>({key:{'Residential District':d},value:i})),rowCount:left.length,missingValueCount:0};
  const other={kind:'data-table',keys:['adm2'],valueField:'people',rows:right.map((d,i)=>({key:{adm2:d},value:1000+i})),rowCount:right.length,missingValueCount:0};
  const request={on:'Residential District',rightOn:'adm2',bring:'adm2',spelling:settings};
  const shape=relateShape(table,other,request);
  // The unmatched are named as the first table spells them: a blank, and a district the second table does not hold.
  assert.deepEqual(shape.overlap.gaps.map(g=>g.key).sort(),['','Nowhere District']);
  assert.equal(shape.matches.find(m=>m.name==='Falaba District').compared,'falaba');
  assert.throws(()=>relateTable(table,other,request),/no row in the second/,'the unmatched still need a decision');
  const kept=relateTable(table,other,{...request,unmatched:{decision:'keep',label:'Not found',signature:shape.signature}});
  assert.equal(kept.table.rows.length,left.length,'every row kept under the label');
  assert.deepEqual(kept.table.keys,['Residential District','adm2','Residential District match']);
  assert.deepEqual(kept.table.rows.map(x=>x.key.adm2),['Bo','Bo','Fabala','Western Area Urban','Kono','Not found','Not found','Port Loko']);
  assert.deepEqual(kept.table.rows.map(x=>x.key['Residential District match']),['matched exactly','matched exactly',
    `matched allowing for spelling (${linkNames(['Falaba District'],right,settings).get('Falaba District').score.toFixed(2)})`,
    'matched exactly','matched exactly','not found','no name','matched exactly']);
  // The value column travels too, matched the same way.
  const people=relateTable(table,other,{...request,bring:'people',unmatched:{decision:'drop',signature:shape.signature}});
  assert.deepEqual(people.table.rows.map(x=>x.key.people),['1000','1000','1001','1002','1004','1003']);
  // Without spelling allowed, the second table's key adds nothing, and is refused as before.
  assert.throws(()=>relateTable(table,other,{on:'Residential District',rightOn:'adm2',bring:'adm2'}),/being matched on/);
  // A date within a period is not combined with it.
  assert.throws(()=>relateTable(table,other,{...request,within:{date:'d',start:'s',end:'e'}}),/turn off allowing for spelling/);
});
