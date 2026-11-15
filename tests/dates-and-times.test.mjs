import test from 'node:test';
import assert from 'node:assert/strict';
const {assembleDateTime,minuteNumber}=await import('../build/authored-application.js');
const {evaluateAuthored}=await import('../build/rule-evaluation.js');
const {unitProblems}=await import('../build/authored-rules.js').catch(()=>({}));

// Experiment 188, 2026-11-15: a date and time written from its parts, never guessed; hours between two of them.
test('a date and time is written from its parts, in their declared forms',()=>{
  assert.deepEqual(assembleDateTime('4/19','month/day',1940,'12:30 AM','12-hour'),{iso:'1940-04-19T00:30'});
  assert.deepEqual(assembleDateTime('4/19','month/day',1940,'12:00 PM','12-hour'),{iso:'1940-04-19T12:00'});
  assert.deepEqual(assembleDateTime('4/18','month/day',1940,'8:00 PM','12-hour'),{iso:'1940-04-18T20:00'});
  assert.deepEqual(assembleDateTime('19/4/1940','day/month/year',undefined,'20:15','24-hour'),{iso:'1940-04-19T20:15'});
  assert.deepEqual(assembleDateTime('4/19','month/day',1940),{iso:'1940-04-19'});
});
test('what does not fit is unreadable, and says what it saw',()=>{
  assert.match(assembleDateTime('4/31','month/day',1940).unreadable,/not a day of 1940/);
  assert.match(assembleDateTime('4/19','month/day',1940,'13:00 PM','12-hour').unreadable,/not a 12-hour time/);
  assert.match(assembleDateTime('4/19','month/day',undefined).unreadable,/no year/);
  assert.match(assembleDateTime('unk','month/day',1940).unreadable,/"unk" is not month\/day/);
  assert.match(assembleDateTime('4/19','month/day',1940,'unk','12-hour').unreadable,/"unk" is not a 12-hour time/);
  assert.match(assembleDateTime('4/19/40','month/day/year',undefined).unreadable,/two-digit year/);
});
test('a date and time read as minutes, and a malformed one is not',()=>{
  assert.equal(minuteNumber('1940-04-19T00:30')-minuteNumber('1940-04-18T20:00'),270);
  assert.equal(minuteNumber('1940-04-19T24:00'),undefined);
  assert.equal(minuteNumber('1940-04-19'),undefined);
});

test('a rule writes onset and meal as dates and times, and another takes hours between them',()=>{
  const bindings=[{attribute:'onset_date',predicate:'fwa:onsetDate',kind:'term'},{attribute:'onset_time',predicate:'fwa:onsetTime',kind:'term'},
    {attribute:'meal_time',predicate:'fwa:mealTime',kind:'term'},{attribute:'ill',predicate:'fwa:ill',kind:'term'}];
  const rules=[
    {any:[{all:[{field:'fwa:ill',comparator:'equals',value:'fwa:Y'}]}],then:[
      {predicate:'fwa:onsetAt',column:'onset_at',datetime:{date:'fwa:onsetDate',form:'month/day',year:{setting:'year'},time:'fwa:onsetTime',clock:'12-hour'}},
      {predicate:'fwa:mealAt',column:'meal_at',datetime:{date:'fwa:mealDate',form:'month/day',year:{setting:'year'},time:'fwa:mealTime',clock:'12-hour'}}]},
    {any:[{all:[{field:'fwa:ill',comparator:'equals',value:'fwa:Y'}]}],then:[
      {predicate:'fwa:incubation',column:'incubation_hours',compute:{left:{field:'fwa:onsetAt'},operator:'minus',right:{field:'fwa:mealAt'},per:'hours'}}]}];
  bindings.push({attribute:'meal_date',predicate:'fwa:mealDate',kind:'term'});
  const records=[
    {id:'2',properties:{ill:'Y',onset_date:'4/19',onset_time:'12:30 AM',meal_date:'4/18',meal_time:'8:00 PM'}},
    {id:'3',properties:{ill:'Y',onset_date:'4/19',onset_time:'12:30 AM',meal_date:'4/18',meal_time:'6:30 PM'}},
    {id:'9',properties:{ill:'Y',onset_date:'4/19',onset_time:'unk',meal_date:'4/18',meal_time:'7:00 PM'}}];
  const e=evaluateAuthored(records,bindings,rules,{year:1940});
  assert.equal(e.records[0].values.onset_at,'1940-04-19T00:30');
  assert.equal(e.records[0].values.incubation_hours,4.5);
  assert.equal(e.records[1].values.incubation_hours,6);
  assert.equal(e.records[2].values.onset_at,undefined);
  assert.match(e.records[2].unreadable[0].saw,/"unk" is not a 12-hour time/);
  assert.equal(e.records[2].values.incubation_hours,undefined);
  assert.equal(e.computedMeta.incubation_hours.unit,'hours');
  assert.deepEqual(e.writtenColumns.sort(),['meal_at','onset_at']);
});

test('a date and time is declared: its form, its year, its clock, and a difference its unit',async()=>{
  const {authoredUnitProblems}=await import('../build/authored-rules.js');
  const fields=[{attribute:'onset_date',predicate:'fwa:d',kind:'term'},{attribute:'onset_time',predicate:'fwa:t',kind:'term'},
    {attribute:'report',predicate:'fwa:r',kind:'date'},{attribute:'seen',predicate:'fwa:s',kind:'datetime'}];
  const says=then=>authoredUnitProblems({fields,rules:[{any:[],then}]}).map(p=>p.says).join(' | ');
  assert.match(says([{predicate:'fwa:a',datetime:{date:'fwa:d',form:'month/day'}}]),/no year\. Give the year as a setting/);
  assert.match(says([{predicate:'fwa:a',datetime:{date:'fwa:d',form:'month/day',year:1940,time:'fwa:t'}}]),/12-hour or a 24-hour clock/);
  assert.equal(says([{predicate:'fwa:a',datetime:{date:'fwa:d',form:'month/day',year:1940,time:'fwa:t',clock:'12-hour'}}]),'');
  assert.match(says([{predicate:'fwa:x',compute:{left:{field:'fwa:s'},operator:'minus',right:{field:'fwa:s'}}}]),/names its unit/);
  assert.match(says([{predicate:'fwa:x',compute:{left:{field:'fwa:s'},operator:'minus',right:{field:'fwa:r'}}}]),/not\s+taken as midnight/);
  assert.equal(says([{predicate:'fwa:x',compute:{left:{field:'fwa:s'},operator:'minus',right:{field:'fwa:s'},per:'hours'}}]),'');
  // Two dates still give days, as before.
  assert.equal(says([{predicate:'fwa:x',compute:{left:{field:'fwa:r'},operator:'minus',right:{field:'fwa:r'}}}]),'');
});

test('Cases by period counts by the hour, every hour kept, a date without a time listed and not put at midnight',async()=>{
  const {caseSeries}=await import('../build/case-series.js');
  const f=(id,t)=>({type:'Feature',id,properties:{name:id,onset_at:t},geometry:null});
  const s=caseSeries({type:'FeatureCollection',features:[f('a','1940-04-18T22:15'),f('b','1940-04-19T00:30'),f('c','1940-04-19T00:45'),f('d','1940-04-19')]},
    {dateField:'onset_at',dateKind:'onset',period:'hour'});
  assert.deepEqual(s.bins.map(b=>[b.key,b.count]),[['1940-04-18T22',1],['1940-04-18T23',0],['1940-04-19T00',2]]);
  assert.equal(s.bins[0].label,'1940-04-18 22:00');
  assert.equal(s.undatedRecords,1);assert.equal(s.undated[0].value,'1940-04-19');
});

test('one date for every record, as the source gives it, with each record’s own time',()=>{
  const bindings=[{attribute:'meal',predicate:'fwa:meal',kind:'term'}];
  const rules=[{any:[{all:[]}],then:[{predicate:'fwa:mealAt',column:'meal_at',datetime:{date:'',on:'1940-04-18',form:'month/day',time:'fwa:meal',clock:'12-hour'}}]}];
  const e=evaluateAuthored([{id:'1',properties:{meal:'8:00 PM'}},{id:'2',properties:{meal:'unk'}}],bindings,rules,{});
  assert.equal(e.records[0].values.meal_at,'1940-04-18T20:00');
  assert.match(e.records[1].unreadable[0].saw,/"unk" is not a 12-hour time/);
});
