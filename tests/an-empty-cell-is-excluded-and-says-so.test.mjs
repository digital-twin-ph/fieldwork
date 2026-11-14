import test from 'node:test';
import assert from 'node:assert/strict';
import {groupTable,AGGREGATES} from '../build/group-table.js';

/** EXCLUDING AN EMPTY CELL, DECLARED AND NEVER ASSUMED.
 *
 *  The practitioner, 2026-10-31: *"We should add a checkbox for overriding nulls."* And then the
 *  condition that makes it safe: *"Once we check that override box, it automatically adds the
 *  caveat in the machined note."*
 *
 *  The case that produced it is unusually well evidenced. Snow's Table XII leaves Dulwich's 1854
 *  cell BLANK — checked against Project Gutenberg #72894 on 2026-10-31, where it is not a zero,
 *  not a dash, but nothing printed — and Dulwich is one of four sub-districts supplied by the
 *  Lambeth Company alone, the group carrying his strongest contrast. His own summary row totals
 *  those four at 37, and 10 + 15 + 12 = 37, so the blank is a nothing rather than a gap. The
 *  warrant for the override is the source's own arithmetic. */

const snow=()=>({kind:'data-table',keys:['water_supply','sub_district','measure'],
  valueField:'count',unit:'deaths',rowCount:8,missingValueCount:1,rows:[
    {key:{water_supply:'Lambeth only',sub_district:'Norwood',measure:'deaths 1854'},value:10},
    {key:{water_supply:'Lambeth only',sub_district:'Streatham',measure:'deaths 1854'},value:15},
    {key:{water_supply:'Lambeth only',sub_district:'Dulwich',measure:'deaths 1854'},value:null},
    {key:{water_supply:'Lambeth only',sub_district:'Sydenham',measure:'deaths 1854'},value:12},
    {key:{water_supply:'S&V only',sub_district:'Battersea',measure:'deaths 1854'},value:300},
    {key:{water_supply:'S&V only',sub_district:'Camberwell',measure:'deaths 1854'},value:200},
    {key:{water_supply:'Lambeth only',sub_district:'Norwood',measure:'deaths 1849'},value:2},
    {key:{water_supply:'S&V only',sub_district:'Battersea',measure:'deaths 1849'},value:50},
  ]});

const totals=result=>Object.fromEntries(result.table.rows
  .map(r=>[`${r.key.water_supply}/${r.key.measure}`,r.value]));

test('OFF BY DEFAULT, and a group holding an empty cell totals to nothing known',()=>{
  const out=groupTable(snow(),{by:['water_supply','measure']});
  assert.equal(totals(out)['Lambeth only/deaths 1854'],null,
    'a group with an unrecorded cell must not report a smaller total');
  assert.equal(totals(out)['S&V only/deaths 1854'],500);
  assert.equal(out.excluded,undefined,
    'nothing was overridden, and that is different from the field not existing');
  assert.equal(out.gaps.length,1);
});

test('ON, the total is of what was RECORDED, and reaches Snow’s own figure',()=>{
  const out=groupTable(snow(),{by:['water_supply','measure'],excludeMissing:true});
  // 10 + 15 + 12 = 37, which is what Snow printed for those four sub-districts -- reached by
  // totalling the three that are recorded, not by deciding what the blank meant.
  assert.equal(totals(out)['Lambeth only/deaths 1854'],37);
  assert.equal(totals(out)['S&V only/deaths 1854'],500,'groups with no empty cell are unchanged');
});

test('THE OVERRIDE IS COUNTED, so a surface can say "3 of 4" rather than infer it',()=>{
  const out=groupTable(snow(),{by:['water_supply','measure'],excludeMissing:true});
  assert.equal(out.excluded.cells,1);
  assert.equal(out.excluded.groups,1);
  assert.deepEqual(out.excluded.of,
    [{group:'Lambeth only \u00b7 deaths 1854',rowsSummed:3,rowsEmpty:1}]);
});

test('it changes the TOTAL and never what was in the table',()=>{
  // `gaps` keeps reporting the empty cell either way: the override is an assumption ABOUT a gap,
  // not a claim that there was none. A surface that lost this could not tell a reader where the
  // assumption was applied.
  const out=groupTable(snow(),{by:['water_supply','measure'],excludeMissing:true});
  assert.equal(out.gaps.length,1);
  assert.equal(out.gaps[0].rowsEmpty,1);
  assert.match(out.gaps[0].group,/Lambeth only/);
});

test('a group with NO empty cell is identical either way',()=>{
  const off=groupTable(snow(),{by:['water_supply','measure']});
  const on=groupTable(snow(),{by:['water_supply','measure'],excludeMissing:true});
  for(const key of ['S&V only/deaths 1854','S&V only/deaths 1849','Lambeth only/deaths 1849'])
    assert.equal(totals(on)[key],totals(off)[key],`${key} changed when nothing was empty`);
});

test('a group where EVERY cell is empty totals to zero rows of data, not to unknown',()=>{
  // The edge the arithmetic has to be right about: an override that only applied when SOME value
  // was present would silently leave the all-empty group unknown while claiming to be on.
  const allEmpty={kind:'data-table',keys:['g','measure'],valueField:'count',rowCount:2,
    missingValueCount:2,rows:[
      {key:{g:'x',measure:'m'},value:null},{key:{g:'x',measure:'n'},value:null}]};
  const out=groupTable(allEmpty,{by:['g'],excludeMissing:true});
  // Nothing was recorded, so the total is of nothing: 0 over 0 rows. The note says 0 of 2, which
  // is the one case where a reader most needs the denominator.
  assert.equal(out.table.rows[0].value,0);
  assert.equal(out.excluded.cells,2);
  assert.deepEqual(out.excluded.of,[{group:'x',rowsSummed:0,rowsEmpty:2}]);
});

test('IT EXCLUDES, IT DOES NOT ZERO, and the difference is the claim rather than the number',()=>{
  // For a SUM the two give the same figure, which is exactly why the difference is easy to miss
  // and worth a test. What differs is what is ASSERTED -- zeroing says there were none, and
  // excluding says only that what was totalled is what was recorded -- and it stops being
  // invisible the moment anything divides, because the denominator is the rows that contributed.
  const out=groupTable(snow(),{by:['water_supply','measure'],excludeMissing:true});
  const lambeth=out.excluded.of.find(g=>/Lambeth only/.test(g.group));
  assert.equal(lambeth.rowsSummed,3,'three sub-districts contributed a value');
  assert.equal(lambeth.rowsEmpty,1,'the fourth did not, and is not counted as a contributor');
  assert.equal(lambeth.rowsSummed+lambeth.rowsEmpty,4,'the group still holds four rows');
  // A zeroing override would have reported four contributors for the same total of 37.
  assert.equal(out.table.rows.find(r=>r.key.water_supply==='Lambeth only'
    &&r.key.measure==='deaths 1854').value,37);
});

/** SUMMARIZE: an aggregate within the key columns you keep.
 *
 *  Established by the by-hand test rather than by argument — the practitioner, 2026-10-31: *"The
 *  test is whether we would be able to do the Dulwich assumptions by hand from an empty canvas."*
 *  It could not be, because nothing in the application returned an extremum. Experiment 157. */

const rates=()=>({kind:'data-table',keys:['company','sub_district'],valueField:'rate',
  unit:'per 1,000 people',rowCount:5,missingValueCount:1,rows:[
    {key:{company:'Lambeth only',sub_district:'Norwood'},value:6.1},
    {key:{company:'Lambeth only',sub_district:'Streatham'},value:1.662},
    {key:{company:'Lambeth only',sub_district:'Dulwich'},value:null},
    {key:{company:'S&V only',sub_district:'St. Olave'},value:20.087},
    {key:{company:'S&V only',sub_district:'Battersea'},value:5.114},
  ]});
const byCompany=(over={})=>groupTable(rates(),{by:['company'],...over});

test('SUM IS THE DEFAULT, so every workflow saved before this keeps its meaning',()=>{
  const out=byCompany();
  assert.equal(out.aggregate,'sum');
  assert.equal(out.table.rows.find(r=>r.key.company==='S&V only').value,25.201);
});

test('MINIMUM AND MAXIMUM, which is what a sensitivity bound needs',()=>{
  const lo=byCompany({aggregate:'minimum',excludeMissing:true});
  const hi=byCompany({aggregate:'maximum',excludeMissing:true});
  assert.equal(lo.table.rows.find(r=>r.key.company==='S&V only').value,5.114);
  assert.equal(hi.table.rows.find(r=>r.key.company==='S&V only').value,20.087);
  // And across the Lambeth group, excluding the cell Snow left blank.
  assert.equal(lo.table.rows.find(r=>r.key.company==='Lambeth only').value,1.662);
  assert.equal(hi.table.rows.find(r=>r.key.company==='Lambeth only').value,6.1);
  assert.equal(hi.aggregate,'maximum');
});

test('AN EXTREMUM OF NOTHING IS NOT ZERO, which is where it differs from a sum',()=>{
  // The error this whole module is about, in its one new shape. A group whose every cell was
  // excluded adds up to 0 -- nothing added to nothing -- and has NO minimum, because there is no
  // value to be the smallest. Returning 0 would invent an observation.
  const empty={kind:'data-table',keys:['g','measure'],valueField:'v',rowCount:2,
    missingValueCount:2,
    rows:[{key:{g:'x',measure:'a'},value:null},{key:{g:'x',measure:'b'},value:null}]};
  assert.equal(groupTable(empty,{by:['g'],excludeMissing:true}).table.rows[0].value,0);
  for(const aggregate of ['minimum','maximum'])
    assert.equal(groupTable(empty,{by:['g'],aggregate,excludeMissing:true}).table.rows[0].value,
      null,`an ${aggregate} over no values must be unknown, not zero`);
});

test('an empty cell still makes the group unknown unless it is excluded',()=>{
  // The default refusal is not weakened by the new aggregates.
  for(const aggregate of ['sum','minimum','maximum'])
    assert.equal(byCompany({aggregate}).table.rows.find(r=>r.key.company==='Lambeth only').value,
      null,`${aggregate} ignored an unrecorded cell`);
});

test('THE VOCABULARY IS BOUNDED, and the absences are an argument',()=>{
  // A SUMMARIZE command can offer AVG COUNT FIRST LAST MAX MIN STDEV STDEVP SUM VAR VARP.
  // Four are admitted. AVG has the referent problem that kept this step sum-only -- rates do
  // not average meaningfully when the groups differ in size -- STDEVP and VARP are population
  // variants this step cannot tell it has, and FIRST and LAST depend on a row order a long table
  // does not promise.
  // 2026-11-14: MEAN AND MEDIAN ADMITTED, for an incubation period and a serial interval, which are summarised by their
  // median (the practitioner: "For MERS if there are any more epi computations that can be included let's do that").
  // The referent problem stands, and is why neither is offered with a share. The rest stay absent for the reasons above.
  assert.deepEqual([...AGGREGATES],['sum','minimum','maximum','count','mean','median']);
});
test('COUNT READS NO VALUE: a line list reaches its four cells, and a blank is still a row',()=>{
  const person=(ill,ate,value)=>({key:{id:String(person.n=(person.n||0)+1),ill,ate,measure:'Age'},value});
  const table={kind:'data-table',keys:['id','ill','ate','measure'],valueField:'Age',unit:'years',
    rows:[person('Y','Y',11),person('Y','Y',null),person('Y','N',30),person('N','N',52)],
    rowCount:4,missingValueCount:1};
  const out=groupTable(table,{by:['ill','ate'],aggregate:'count'});
  assert.deepEqual(out.table.rows.map(r=>[r.key.ill,r.key.ate,r.value]),
    [['Y','Y',2],['Y','N',1],['N','N',1]]);
  // The result measures rows, so it must not go on calling itself years of age.
  assert.equal(out.table.valueField,'rows');
  assert.equal(out.table.unit,undefined);
  assert.equal(out.table.missingValueCount,0);
  assert.deepEqual(out.gaps,[],'a count has no unknown total to report');
});
