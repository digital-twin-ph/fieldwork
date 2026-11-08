import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {evaluateAuthored,evaluatedTable,evaluationSentence} from '../build/rule-evaluation.js';
import {authoredSubjects} from '../build/authored-application.js';

/** NEW CASES FROM A CUMULATIVE COUNT, which reads the previous row (experiment 188, stage 4). The synthetic file of
 *  example-workflows-rulesets, out of date order on purpose, against its answers worked by hand under both meanings of
 *  "previous": the row recorded before, and the week before. North is clean; East has no row for week 5; South's count
 *  falls at week 7; West has week 4 twice. Where that repository is not beside this one, the same rows are here. */
const REPO=new URL('../../example-workflows-rulesets/',import.meta.url);
const read=name=>readFileSync(new URL(name,REPO),'utf8');
const parse=text=>{const [head,...lines]=text.trim().split('\n');const h=head.split(',');
  return lines.map(l=>{const v=l.split(',');return Object.fromEntries(h.map((x,i)=>[x,v[i]??'']));});};
const here=existsSync(new URL('data/cumulative-cases-by-week.csv',REPO));
const skip=here?false:'example-workflows-rulesets is not checked out beside this repository.';

const tableOf=rows=>({kind:'data-table',keys:['place','week_start'],valueField:'cumulative_cases',unit:'cases',
  rows:rows.map(r=>({key:{place:r.place,week_start:r.week_start},value:Number(r.cumulative_cases)})),
  rowCount:rows.length,missingValueCount:0});
const fields=[{attribute:'cumulative_cases',predicate:'fwa:cumulative_cases',kind:'number',unit:'unit:NUM'}];
const newCases=[{any:[{all:[]}],then:[{predicate:'fwa:new_cases',column:'new cases',
  compute:{left:{field:'fwa:cumulative_cases'},operator:'minus',right:{field:'fwa:cumulative_cases',previous:true}}}]}];

for(const previous of ['row','week'])test(`new cases, the previous ${previous}: every row as worked by hand`,{skip},()=>{
  const table=tableOf(parse(read('data/cumulative-cases-by-week.csv')));
  const expected=parse(read('expected/new-cases.csv'));
  const records=authoredSubjects(table);
  const order={by:'week_start',within:['place'],previous};
  const evaluation=evaluateAuthored(records,fields,newCases,{},order);
  const out=evaluatedTable(table,evaluation);
  // SORTED, as the hand-worked file is: by place in the order places arrived, then by week.
  assert.deepEqual(out.rows.map(r=>[r.key.place,r.key.week_start,r.value]),
    expected.map(e=>[e.place,e.week_start,Number(e.cumulative_cases)]),'the rows in the step\'s order');
  const column=previous==='row'?'new_cases_previous_row':'new_cases_previous_week';
  assert.deepEqual(out.rows.map(r=>r.key['new cases']),expected.map(e=>e[column]),`new cases, previous ${previous}`);
  // EACH ROW THAT IS NOT PLAIN SAYS WHY, as the file's "says" column does.
  const said={'first':'first week','period-missing':'previous week missing','repeated':'week recorded twice',
    'after-repeated':'after a week recorded twice'};
  const says=evaluation.sequence.map(i=>{const o=evaluation.records[i];
    return o.noPrevious.length?said[o.noPrevious[0].why]:o.fell.length?'cumulative fell':'';});
  assert.deepEqual(says,expected.map(e=>previous==='row'&&e.says==='previous week missing'?'':e.says));
});

test('the run says what had no previous row and what fell, and names them',{skip},()=>{
  const table=tableOf(parse(read('data/cumulative-cases-by-week.csv')));
  const records=authoredSubjects(table);
  const evaluation=evaluateAuthored(records,fields,newCases,{},{by:'week_start',within:['place'],previous:'week'});
  const sentence=evaluationSentence(evaluation,records.map(r=>r.label));
  assert.match(sentence,/Sorted by week_start within each place; the previous row is the previous week's\./);
  assert.match(sentence,/4 the first of their place: /);
  assert.match(sentence,/1 no row for the previous week: East · 2025-02-10/);
  assert.match(sentence,/2 one week_start recorded twice in their place/);
  assert.match(sentence,/6 after a week_start recorded twice/);
  assert.match(sentence,/1 record fell below the previous row, and is kept as computed: South · 2025-02-17\./);
});

test('a rule reading the previous row does not run until the records have an order',()=>{
  const table=tableOf([{place:'North',week_start:'2025-01-13',cumulative_cases:'7'},{place:'North',week_start:'2025-01-06',cumulative_cases:'3'}]);
  assert.throws(()=>evaluateAuthored(authoredSubjects(table),fields,newCases),
    /A rule reads the previous row, so the records need an order: choose the column to sort them by\./);
  // "Previous week" needs dates; the previous row does not.
  assert.throws(()=>evaluateAuthored(authoredSubjects(table),fields,newCases,{},{by:'place',within:[],previous:'week'}),
    /needs place to hold dates/);
  const sorted=evaluateAuthored(authoredSubjects(table),fields,newCases,{},{by:'week_start',within:['place'],previous:'row'});
  assert.deepEqual(sorted.sequence,[1,0]);
  assert.equal(sorted.records[0].values['new cases'],4);
});

test('the month before 31 March is the end of February, not 3 March',async()=>{
  const rows=[['2025-02-28',10],['2025-03-31',16]].map(([d,c])=>({place:'A',week_start:d,cumulative_cases:String(c)}));
  const table=tableOf(rows);
  const e=evaluateAuthored(authoredSubjects(table),fields,newCases,{},{by:'week_start',within:['place'],previous:'month'});
  assert.equal(e.records[1].values['new cases'],6);
});
