import test from 'node:test';
import assert from 'node:assert/strict';
import {computeTwoByTwo,twoByTwoGrid,twoByTwoEstimateRows} from '../build/two-by-two.js';
import {twoByTwoMarkup,twoByTwoTableMarkup,twoByTwoEstimatesMarkup}
  from '../build/two-by-two-view.js';

/** A TWO-BY-TWO IS AN INSTRUMENT, NOT AN ARRANGEMENT OF NUMBERS.
 *
 *  The practitioner, 2026-10-31, over four messages: *"This 2x2 table claims it has the risk ratio
 *  but it does not"*; *"The margin totals are also missing ... the equations map these labels, and
 *  in fact should come as a unit"*; *"And confidence intervals are reported where needed"*; and
 *  then the one that named the cause — *"a 2x2 table is not a table in the data sense, but a table
 *  to represent an epidemiology tool complete with its standard formatting that epidemiologists
 *  understand."* Experiment 153. */

const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');

/** Snow's Table IX as the example carries it: three strata, two of them compared. */
const snow=()=>computeTwoByTwo({kind:'data-table',
  keys:['water_supply','outcome'],valueField:'people',unit:'people',rowCount:6,
  missingValueCount:0,rows:[
    {key:{water_supply:'Southwark and Vauxhall Company only',outcome:'deaths_seven_weeks'},value:844},
    {key:{water_supply:'Southwark and Vauxhall Company only',outcome:'survived'},value:166810},
    {key:{water_supply:'Lambeth Company only',outcome:'deaths_seven_weeks'},value:18},
    {key:{water_supply:'Lambeth Company only',outcome:'survived'},value:19115},
    {key:{water_supply:'Both companies',outcome:'deaths_seven_weeks'},value:652},
    {key:{water_supply:'Both companies',outcome:'survived'},value:299497},
  ]},{exposureColumn:'water_supply',outcomeColumn:'outcome',
  exposed:'Southwark and Vauxhall Company only',unexposed:'Lambeth Company only',
  caseValue:'deaths_seven_weeks',nonCaseValue:'survived',level:95});

test('the four cells carry the letters every formula is written in',()=>{
  const g=twoByTwoGrid(snow());
  assert.deepEqual(g.cells.map(row=>row.map(c=>[c.letter,c.value])),
    [[['a',844],['b',166810]],[['c',18],['d',19115]]]);
  assert.deepEqual(g.rowLabels,
    ['Southwark and Vauxhall Company only','Lambeth Company only']);
  assert.deepEqual(g.columnLabels,['deaths_seven_weeks','survived']);
});

test('EVERY MARGIN IS PRESENT, and carries the expression it was computed from',()=>{
  // Three of these reached no surface in the application at all before 2026-10-31: a+c, b+d and
  // N were computed by `computeTwoByTwo` and read by nothing.
  const g=twoByTwoGrid(snow());
  assert.deepEqual(g.rowTotals,[{expression:'a+b',value:167654},{expression:'c+d',value:19133}]);
  assert.deepEqual(g.columnTotals,
    [{expression:'a+c',value:862},{expression:'b+d',value:185925}]);
  assert.deepEqual(g.total,{expression:'N',value:186787});
  // A MARGIN IS DERIVED AND SAYS SO. Carrying `a+b` rather than a bare number is what stops a
  // total being read as a fifth observed count.
  for(const margin of [...g.rowTotals,...g.columnTotals,g.total])
    assert.match(margin.expression,/^(a\+b|c\+d|a\+c|b\+d|N)$/);
});

test('N IS THE TWO NAMED GROUPS AND NOT THE TABLE, which is the number most often misread',()=>{
  const result=snow();
  const grid=twoByTwoGrid(result);
  // The source table holds 486,936 people across three strata. The comparison is of two.
  assert.equal(grid.total.value,186787);
  assert.notEqual(grid.total.value,486936);
  // And the reason is reported rather than left to be noticed.
  assert.deepEqual(result.strataLeftOut,['Both companies']);
  assert.match(twoByTwoMarkup(result,esc),/Both companies/);
});

test('the margins sum, which is the one arithmetic a reader checks by eye',()=>{
  const g=twoByTwoGrid(snow());
  const [[a,b],[c,d]]=g.cells.map(row=>row.map(x=>x.value));
  assert.equal(g.rowTotals[0].value,a+b);
  assert.equal(g.rowTotals[1].value,c+d);
  assert.equal(g.columnTotals[0].value,a+c);
  assert.equal(g.columnTotals[1].value,b+d);
  assert.equal(g.total.value,a+b+c+d);
});

test('EVERY ESTIMATE REPORTS ITS INTERVAL, ITS LEVEL AND ITS METHOD',()=>{
  // *"Certain journals will even require them."* Reported, never recomputed: these are the
  // numbers `computeTwoByTwo` already returned.
  const rows=twoByTwoEstimateRows(snow());
  assert.deepEqual(rows.map(r=>r.name),['risk ratio','odds ratio','risk difference']);
  for(const row of rows){
    assert.equal(row.unavailable,null,`${row.name} should be computable on Snow's cells`);
    assert.ok(row.interval,`${row.name} carries no interval`);
    assert.equal(row.interval.level,95);
    assert.ok(row.interval.lower<row.value&&row.value<row.interval.upper,
      `${row.name}: the point estimate is not inside its own interval`);
    assert.ok(row.method,`${row.name} does not name its interval method`);
  }
  assert.deepEqual(rows.map(r=>r.method),['Katz log','Wald log','Wald unpooled']);
});

test('an estimate with no interval says why, rather than printing a blank',()=>{
  // A zero cell leaves the log interval undefined. Printing nothing there would read as "no
  // effect" when it means "not computable" -- two different claims.
  const zero=computeTwoByTwo({kind:'data-table',keys:['g','o'],valueField:'n',rowCount:4,
    missingValueCount:0,rows:[
      {key:{g:'exposed',o:'case'},value:10},{key:{g:'exposed',o:'well'},value:90},
      {key:{g:'unexposed',o:'case'},value:0},{key:{g:'unexposed',o:'well'},value:100}]},
    {exposureColumn:'g',outcomeColumn:'o',exposed:'exposed',unexposed:'unexposed',
     caseValue:'case',nonCaseValue:'well',level:95});
  const missing=twoByTwoEstimateRows(zero).filter(r=>!r.interval);
  assert.ok(missing.length,'a zero cell should leave at least one interval undefined');
  for(const row of missing){
    assert.ok(row.unavailable,`${row.name} has no interval and no reason`);
    assert.match(twoByTwoEstimatesMarkup(zero,esc),/tbt-absent/);
  }
  // The method is still named, so a reader can tell "not computed" from "computed differently".
  for(const row of twoByTwoEstimateRows(zero))assert.ok(row.method);
});

test('the drawn table carries the letters, the margins and the total',()=>{
  const markup=twoByTwoTableMarkup(snow(),esc);
  for(const letter of ['a','b','c','d','a+b','c+d','a+c','b+d','N'])
    assert.match(markup,new RegExp(`<span class="tbt-letter">${letter.replace('+','\\+')}</span>`),
      `the drawn table does not carry ${letter}`);
  for(const value of ['844','166,810','18','19,115','167,654','19,133','862','185,925','186,787'])
    assert.ok(markup.includes(`>${value}</span>`),`the drawn table does not carry ${value}`);
});

test('A LETTER IS NEVER GUESSED FROM POSITION ALONE: the row labels come from the request',()=>{
  // Reversing exposed and unexposed must move the letters with the groups, not leave c and d
  // under whichever row happens to be second.
  const reversed=computeTwoByTwo({kind:'data-table',keys:['g','o'],valueField:'n',rowCount:4,
    missingValueCount:0,rows:[
      {key:{g:'A',o:'case'},value:1},{key:{g:'A',o:'well'},value:2},
      {key:{g:'B',o:'case'},value:3},{key:{g:'B',o:'well'},value:4}]},
    {exposureColumn:'g',outcomeColumn:'o',exposed:'B',unexposed:'A',
     caseValue:'case',nonCaseValue:'well',level:95});
  const g=twoByTwoGrid(reversed);
  assert.deepEqual(g.rowLabels,['B','A']);
  assert.equal(g.cells[0][0].value,3,'a must be the EXPOSED group\u2019s cases');
  assert.equal(g.cells[1][0].value,1,'c must be the UNEXPOSED group\u2019s cases');
});
