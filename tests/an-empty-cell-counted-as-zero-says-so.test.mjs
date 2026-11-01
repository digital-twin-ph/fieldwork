import test from 'node:test';
import assert from 'node:assert/strict';
import {groupTable} from '../build/group-table.js';

/** COUNTING AN EMPTY CELL AS ZERO, DECLARED AND NEVER ASSUMED.
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
  assert.equal(out.missingAsZero,undefined,
    'nothing was overridden, and that is different from the field not existing');
  assert.equal(out.gaps.length,1);
});

test('ON, the total is reached and SNOW’S OWN ARITHMETIC is what it reaches',()=>{
  const out=groupTable(snow(),{by:['water_supply','measure'],missingAsZero:true});
  // 10 + 15 + 12 = 37, which is the figure Snow printed for those four sub-districts.
  assert.equal(totals(out)['Lambeth only/deaths 1854'],37);
  assert.equal(totals(out)['S&V only/deaths 1854'],500,'groups with no empty cell are unchanged');
});

test('THE OVERRIDE IS COUNTED, so a surface can say how much it covered',()=>{
  const out=groupTable(snow(),{by:['water_supply','measure'],missingAsZero:true});
  assert.deepEqual(out.missingAsZero,{cells:1,groups:1});
});

test('it changes the TOTAL and never what was in the table',()=>{
  // `gaps` keeps reporting the empty cell either way: the override is an assumption ABOUT a gap,
  // not a claim that there was none. A surface that lost this could not tell a reader where the
  // assumption was applied.
  const out=groupTable(snow(),{by:['water_supply','measure'],missingAsZero:true});
  assert.equal(out.gaps.length,1);
  assert.equal(out.gaps[0].rowsEmpty,1);
  assert.match(out.gaps[0].group,/Lambeth only/);
});

test('a group with NO empty cell is identical either way',()=>{
  const off=groupTable(snow(),{by:['water_supply','measure']});
  const on=groupTable(snow(),{by:['water_supply','measure'],missingAsZero:true});
  for(const key of ['S&V only/deaths 1854','S&V only/deaths 1849','Lambeth only/deaths 1849'])
    assert.equal(totals(on)[key],totals(off)[key],`${key} changed when nothing was empty`);
});

test('every cell empty still totals to zero under the override, not to unknown',()=>{
  // The edge the arithmetic has to be right about: an override that only applied when SOME value
  // was present would silently leave the all-empty group unknown while claiming to be on.
  const allEmpty={kind:'data-table',keys:['g','measure'],valueField:'count',rowCount:2,
    missingValueCount:2,rows:[
      {key:{g:'x',measure:'m'},value:null},{key:{g:'x',measure:'n'},value:null}]};
  const out=groupTable(allEmpty,{by:['g'],missingAsZero:true});
  assert.equal(out.table.rows[0].value,0);
  assert.deepEqual(out.missingAsZero,{cells:2,groups:1});
});
