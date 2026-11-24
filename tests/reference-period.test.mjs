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
