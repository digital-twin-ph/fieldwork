import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relateTable,relateShape} from '../build/relate-table.js';
import {pointsAsTable,portAccepts} from '../build/core.js';
import {authoredSubjects,dayNumber,readValue} from '../build/authored-application.js';
import {evaluateAuthored,evaluatedTable} from '../build/rule-evaluation.js';
import {authoredUnitProblems} from '../build/authored-rules.js';

// WHO INFECTED WHOM, IN HAGELLOCH (experiment 200): the cases related to themselves on `infector`, and the serial
// interval as one date taken from another. Three extensions, each tested here on the real file: a table port reads a
// point layer; Relate writes what it brings under a declared name; the rules read dates and give days.
const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));

const related=()=>{
  const t=pointsAsTable(cases);
  const request={on:'infector',rightOn:'case_ID',bring:'date_of_prodrome',bringAs:'infector_prodrome',normalisation:'exact'};
  const signature=relateShape(t,t,request).signature;
  return relateTable(t,t,{...request,unmatched:{decision:'keep',label:'no infector recorded',signature}}).table;
};
const fields=[{attribute:'date_of_prodrome',predicate:'fwa:prodrome',kind:'date'},
  {attribute:'infector_prodrome',predicate:'fwa:infectorProdrome',kind:'date'}];
const serial=[{any:[{all:[]}],then:[{predicate:'fwa:serial',column:'serial_interval_days',
  compute:{left:{field:'fwa:prodrome'},operator:'minus',right:{field:'fwa:infectorProdrome'}}}]}];

test('a table port reads a point layer as a table: one row per point, its attributes as columns, no geometry',()=>{
  assert.equal(portAccepts('table','points'),true);
  const t=pointsAsTable(cases);
  assert.equal(t.rowCount,188);
  assert.deepEqual(t.keys.slice(0,3),['id','name','case_ID']);
  assert.equal(t.valueField,'');
  assert.ok(!t.keys.includes('geometry'));
  assert.equal(t.numericKeys.age,'','a column of numbers is declared numeric');
  assert.equal(t.rows[0].key.date_of_prodrome,'1861-11-21');
});

test('Relate brings a column the first table already has, under the name it is given, and refuses without one',()=>{
  const t=pointsAsTable(cases);
  assert.throws(()=>relateTable(t,t,{on:'infector',rightOn:'case_ID',bring:'date_of_prodrome',normalisation:'exact'}),
    /already has a "date_of_prodrome" column[\s\S]*Name what it is brought in as/);
  const out=related();
  assert.equal(out.rows.length,188);
  assert.equal(out.rows.filter(r=>/^\d{4}-/.test(r.key.infector_prodrome)).length,184);
  assert.equal(out.rows.filter(r=>r.key.infector_prodrome==='no infector recorded').length,4);
  const first=out.rows.find(r=>r.key.case_ID==='1');
  assert.equal(first.key.date_of_prodrome,'1861-11-21','the case keeps its own date');
  assert.equal(first.key.infector_prodrome,'1861-11-11','and gains its infector\'s, case 45\'s');
});

test('a date is read only as year-month-day, and only a day that exists',()=>{
  assert.equal(dayNumber('1970-01-02'),1);
  assert.equal(dayNumber('1861-11-21')-dayNumber('1861-11-11'),10);
  assert.equal(dayNumber('1861-02-30'),undefined);
  assert.equal(dayNumber('21/11/1861'),undefined);
  assert.deepEqual(readValue('21/11/1861','date'),{known:false,why:'unreadable',saw:'21/11/1861'});
});

test('one date minus another is the serial interval, in days; a case with no infector has none, and is counted',()=>{
  assert.deepEqual(authoredUnitProblems({fields,rules:serial,parameters:[]}),[]);
  const rel=related();
  const evaluation=evaluateAuthored(authoredSubjects(rel),fields,serial);
  const out=evaluatedTable(rel,evaluation);
  assert.equal(out.numericKeys.serial_interval_days,'days','stated, because a difference of dates is days');
  const days=out.rows.map(r=>r.key.serial_interval_days).filter(v=>v!=='').map(Number).sort((a,b)=>a-b);
  assert.equal(days.length,184);
  assert.equal(out.rows.find(r=>r.key.case_ID==='1').key.serial_interval_days,'10');
  assert.equal(days[Math.floor(days.length/2)],10);
});

test('a date anywhere else in arithmetic, or compared with a number, is refused while the rule is written',()=>{
  const plus=[{any:[{all:[]}],then:[{predicate:'fwa:x',compute:{left:{field:'fwa:prodrome'},operator:'plus',right:3}}]}];
  assert.match(authoredUnitProblems({fields,rules:plus,parameters:[]})[0].says,/a date can only be taken from another date/);
  const compared=[{any:[{all:[{field:'fwa:prodrome',comparator:'greaterThan',value:5}]}],then:[{predicate:'fwa:y',value:'fwa:late'}]}];
  assert.match(authoredUnitProblems({fields,rules:compared,parameters:[]})[0].says,/is a date, so it cannot be more or less than a number/);
});
