/** THE PERIOD VALUES REFER TO, compared on the year (experiment 230).
 *
 *  The cases here are the ones the inventory found in the application, not invented ones: Census tables states its
 *  reference dates at four precisions, GHS-POP states projected epochs, and DR Congo's census is of 1984. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {yearsOf,yearGap,sameYear,periodWords,periodDifference} from '../build/reference-period.js';

const period=(stated,kind='enumerated')=>({stated,kind});

test('a stated period is read at whatever precision the source gave it',()=>{
  // The four precisions Census tables actually holds, 2026-11-24.
  assert.deepEqual(yearsOf('2022'),{from:2022,to:2022},'Botswana');
  assert.deepEqual(yearsOf('2022-08'),{from:2022,to:2022},'Rwanda');
  assert.deepEqual(yearsOf('2022-07-31'),{from:2022,to:2022},'Brazil');
  assert.deepEqual(yearsOf('1984-07-01'),{from:1984,to:1984},'DR Congo');
  // A range, as ISO 8601 writes one.
  assert.deepEqual(yearsOf('2015/2030'),{from:2015,to:2030});
  assert.deepEqual(yearsOf('2022-01/2022-12'),{from:2022,to:2022});
});

test('a source that states no period has none, and none is not this year',()=>{
  assert.equal(yearsOf(''),null);
  assert.equal(yearsOf(undefined),null);
  assert.equal(yearsOf('   '),null);
  assert.equal(yearsOf('the 2022 census'),null,'prose is not a period');
  assert.equal(yearsOf('22'),null);
  // AND AN UNKNOWN DISTANCE IS NOT A DISTANCE OF ZERO.
  assert.equal(yearGap('2022',''),null);
  assert.equal(sameYear('2022',''),false,'unreadable is not agreement');
});

test('THE DEFECT: a census of 2022-08 and cases of 2022 are one year, not two vintages',()=>{
  // rate.ts compared `numeratorPeriod === denominatorVintage` as text until 2026-11-24, so Rwanda's census against
  // cases of the same year was reported as two vintages. The practitioner chose: carry what is stated, compare on
  // the year.
  assert.equal(sameYear('2022-08','2022'),true);
  assert.equal(yearGap('2022-08','2022'),0);
  assert.equal(sameYear('2022-07-31','2022-08'),true,'one year, two months');
});

test('a gap is counted in years, from the nearest years each period covers',()=>{
  assert.equal(yearGap('2022','2025'),3,'the census and the models in the population example');
  assert.equal(yearGap('2025','2022'),3,'and the same either way round');
  assert.equal(yearGap('1984-07-01','2025'),41,'DR Congo, which nothing said before');
  assert.equal(yearGap('2022','2023'),1);
  // A RANGE IS SPANNED, so a period covering the other's year is not apart from it.
  assert.equal(yearGap('2015/2030','2022'),0);
  assert.equal(yearGap('2015/2020','2025'),5,'from the nearest year, not the midpoint');
});

test('a period is said with its kind, except where the kind tells a reader nothing',()=>{
  assert.equal(periodWords(period('2022')),'2022','a census is enumerated and saying so adds nothing');
  assert.equal(periodWords(period('2025','projected')),'2025, projected','GHS-POP 2025');
  assert.equal(periodWords(period('2025','estimated')),'2025, estimated');
  assert.equal(periodWords(period('2015/2030','projected')),'2015 to 2030, projected');
  assert.equal(periodWords(period('','not-stated')),'no period stated');
  assert.equal(periodWords(undefined),'no period stated');
});

test('a difference is said; one year and one kind has nothing to say',()=>{
  const census={label:'the census',period:period('2022')};
  const model={label:'WorldPop',period:period('2025','estimated')};
  assert.match(periodDifference(census,model),/3 years apart/);
  assert.match(periodDifference(census,model),/2025, estimated/);
  // SILENT WHERE THERE IS NOTHING TO SAY: the same year, the same kind.
  assert.equal(periodDifference(census,{label:'another census',period:period('2022-08')}),null);
  // BUT NOT WHERE THE KIND DIFFERS. A projection of 2022 and an enumeration of 2022 are two claims about one year,
  // which is the distinction this exists to keep.
  assert.match(periodDifference(census,{label:'GHS-POP',period:period('2022','projected')}),
    /the same year, counted differently/);
});

test('a period nobody stated is said to be unstated, naming which side',()=>{
  const census={label:'the census',period:period('2022')};
  const silent={label:'a hand-given raster',period:period('','not-stated')};
  const said=periodDifference(census,silent);
  assert.match(said,/a hand-given raster states no period/);
  assert.doesNotMatch(said,/the census states no period/,'only the side that is silent');
  assert.match(periodDifference(silent,{label:'another',period:period('','not-stated')}),
    /a hand-given raster and another state no period/);
});

/** THE YEARS BEING STACKED (experiment 230). Append rows is where the practitioner met this: the population example
 *  stacks a 2025 model under a 2022 census, and nothing said they were three years apart. */
const table=(rows,extra={})=>({kind:'data-table',keys:['name'],valueField:'population',
  rows:rows.map(name=>({key:{name},value:1})),rowCount:rows.length,missingValueCount:0,...extra});
const withPeriod=(rows,stated,kind='enumerated')=>table(rows,{period:{stated,kind}});

test('a stack whose tables all state no period says nothing about years',async()=>{
  const {periodsAcross}=await import('../build/append-rows.js');
  // SILENCE IS THE NORM HERE, not a gap: the sentence would appear on every run of every stack and would mean only
  // that nobody has told Fieldwork anything.
  const {periods,said}=periodsAcross([table(['a']),table(['b'])]);
  assert.deepEqual(periods,[]);
  assert.equal(said,null);
});

test('one year counted one way has nothing to say either',async()=>{
  const {periodsAcross}=await import('../build/append-rows.js');
  const {said}=periodsAcross([withPeriod(['a'],'2022'),withPeriod(['b'],'2022-08')],['census','another census']);
  assert.equal(said,null,'2022 and 2022-08 are one year');
});

test('THE POPULATION EXAMPLE: a 2025 model stacked under a 2022 census is said to be three years apart',async()=>{
  const {periodsAcross}=await import('../build/append-rows.js');
  const {said,periods}=periodsAcross(
    [withPeriod(['a'],'2022'),withPeriod(['b'],'2025','estimated')],['2022 census','WorldPop 2025']);
  assert.match(said,/3 years apart/);
  assert.match(said,/2022 \(2022 census\)/);
  assert.match(said,/2025, estimated \(WorldPop 2025\)/);
  // AND CARRIED, one per source, labelled as the source column labels each row.
  assert.deepEqual(periods.map(p=>p.source),['2022 census','WorldPop 2025']);
});

test('the widest gap is the one reported, not a gap between some pair',async()=>{
  const {periodsAcross}=await import('../build/append-rows.js');
  // Three tables of 1984, 2022 and 2025: saying "3 years apart" would be true of a pair and false of the stack.
  const {said}=periodsAcross([withPeriod(['a'],'1984-07-01'),withPeriod(['b'],'2022'),
    withPeriod(['c'],'2025','projected')],['DR Congo 1984','a census','GHS-POP']);
  assert.match(said,/41 years apart/);
  assert.match(said,/3 periods/);
});

test('tables of the same year counted differently are two periods, not one',async()=>{
  const {periodsAcross}=await import('../build/append-rows.js');
  const {said}=periodsAcross([withPeriod(['a'],'2022'),withPeriod(['b'],'2022','projected')],['census','GHS-POP']);
  assert.match(said,/2 periods/);
  assert.match(said,/the same year/);
  assert.match(said,/2022, projected/);
});

test('where some tables state a period, the ones that do not are named',async()=>{
  const {periodsAcross}=await import('../build/append-rows.js');
  const {said}=periodsAcross([withPeriod(['a'],'2022'),table(['b'])],['census','a typed table']);
  assert.match(said,/a typed table states no period/,'now the silence is a gap, not the norm');
});

test('the stacked table carries one period per source, and the step says so',async()=>{
  const {appendTables,appendSentence}=await import('../build/append-rows.js');
  const params={nameSource:true,sourceColumn:'source',labels:['2022 census','WorldPop 2025']};
  const result=appendTables([withPeriod(['Kano'],'2022'),withPeriod(['Kano'],'2025','estimated')],
    params,['2022 census','WorldPop 2025']);
  assert.equal(result.table.periods.length,2);
  assert.deepEqual(result.table.periods.map(p=>p.period.stated),['2022','2025']);
  assert.match(appendSentence(result,params),/3 years apart/,'and it reaches the step’s own sentence');
});
