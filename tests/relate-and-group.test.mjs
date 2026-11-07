/** `RELATE` and `GROUP`, on the two tables the South London example already ships.
 *
 *  The oracle is not invented. The example's `contingency` workflow carries a THREE-stratum table
 *  of people by water supply and outcome, computed by hand and inlined into the project file with
 *  `bytes: 0` and `sha256: ""` -- because nothing in the application could join two tables. These
 *  tests assert that relating Table XII's `water_supply` onto Table VIII's 32 sub-districts and
 *  totalling within it reproduces those six numbers exactly, which is what makes the hand
 *  computation removable rather than merely duplicated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relateTable,relateOutcome,relateShape,gapSignature,rateMultiplier,machinedNotes} from '../build/relate-table.js';
import {groupTable} from '../build/group-table.js';
import {deriveValue,selectRows} from '../build/derive-value.js';

const DATA='../example-1855-cholera-south-london/data/';
const readCsv=name=>{
  const [head,...body]=readFileSync(DATA+name,'utf8').trim().split('\n');
  const cells=line=>line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0,-1)
    .map(c=>c.replace(/,$/,'').replace(/^"|"$/g,''));
  return {headers:cells(head),rows:body.map(cells)};
};

/** Table VIII, melted: one row per sub-district per measure. */
const tableVIII=()=>{
  const {headers,rows}=readCsv('table-viii-sub-districts-seven-weeks.csv');
  const at=name=>headers.indexOf(name);
  const out=[];
  for(const row of rows)for(const measure of ['population_1851','deaths_seven_weeks'])
    out.push({key:{sub_district:row[at('sub_district')],measure},value:Number(row[at(measure)])});
  return {kind:'data-table',keys:['sub_district','measure'],valueField:'people',unit:'people',
    rows:out,rowCount:out.length,missingValueCount:0};
};
/** Table XII, whose `water_supply` is a KEY column: it is a category, not a number. */
const tableXII=()=>{
  const {headers,rows}=readCsv('table-xii-sub-districts-1849-1854.csv');
  const at=name=>headers.indexOf(name);
  const out=rows.map(row=>({key:{sub_district:row[at('sub_district')],
    water_supply:row[at('water_supply')]},value:Number(row[at('deaths_1854')])}));
  return {kind:'data-table',keys:['sub_district','water_supply'],valueField:'deaths',
    rows:out,rowCount:out.length,missingValueCount:0};
};

/** THE PUBLISHED BOUNDARY NAMES as a right table: `subdist` and the supplier each carries.
 *
 *  The case the panel exists for, and not a constructed one. Snow's tables agree with each other
 *  exactly, because both transcribe the same book; the boundaries are a second source, and a
 *  second source spells names differently. */
const boundaryTable=()=>{
  const g=JSON.parse(readFileSync(DATA+'../geo/sub-districts-csds.geojson','utf8'));
  const rows=g.features.map(f=>({key:{sub_district:f.properties.subdist,
    supplier:String(f.properties.supplier)},value:Number(f.properties.pop1851)}));
  return {kind:'data-table',keys:['sub_district','supplier'],valueField:'people',
    rows,rowCount:rows.length,missingValueCount:0};
};

/** WHAT THE JOIN DOES TO EACH NUMERIC VARIABLE, and the exact multiplier that follows.
 *
 *  The practitioner, 2026-10-28: *"The visual aid should also enable the user to see the effects
 *  of each type of join on numeric variables."* These are the numbers the panel draws, asserted
 *  against the published figures rather than against the application's own output. */
test('each variable carries its retained share, and the rate multiplier is exact',()=>{
  const left=tableVIII();
  const base={on:'sub_district',bring:'supplier',measureKey:'measure'};
  const strict=relateShape(left,boundaryTable(),{...base,normalisation:'exact'});

  // 23 of 32, confirming the figure `area-join.ts` recorded on 2026-10-25 from the other side.
  assert.equal(strict.overlap.matched,23);
  assert.equal(strict.overlap.leftOnly,9);
  assert.equal(strict.overlap.rightOnly,9);

  const pop=strict.shares.find(s=>s.measure==='population_1851');
  const deaths=strict.shares.find(s=>s.measure==='deaths_seven_weeks');
  assert.equal(pop.all,486936);
  assert.equal(pop.related,332266);
  assert.equal(deaths.all,1514);
  assert.equal(deaths.related,926);

  // THE TWO SHARES DIFFER, which is the epidemiological content: deaths fall further than
  // population does, so the unmatched rows are not a random sample with respect to mortality.
  assert.equal((pop.share*100).toFixed(1),'68.2');
  assert.equal((deaths.share*100).toFixed(1),'61.2');

  // And the multiplier is arithmetic rather than an estimate: share(numerator)/share(denominator)
  // is exactly what an inner join does to a rate of one variable over the other.
  const multiplier=rateMultiplier(strict.shares,'deaths_seven_weeks','population_1851');
  const rateAll=deaths.all/pop.all*1000;
  const rateInner=deaths.related/pop.related*1000;
  assert.equal(multiplier.toFixed(4),'0.8963');
  assert.equal(rateAll.toFixed(3),'3.109');
  assert.equal(rateInner.toFixed(3),'2.787');
  assert.ok(Math.abs(rateAll*multiplier-rateInner)<1e-9,
    'the multiplier reproduces the rate exactly, so the panel states it without hedging');

  // FOLDING PUNCTUATION CLOSES THE WHOLE GAP, which is why the stricter comparison being the
  // default here was the asymmetry worth fixing: nine rows would have been dropped next to a
  // widget that matches all 32.
  const folded=relateShape(left,boundaryTable(),{...base,normalisation:'fuzzy'});
  assert.equal(folded.overlap.matched,32);
  assert.deepEqual(folded.overlap.gaps,[]);
  assert.equal(folded.shares.find(s=>s.measure==='population_1851').share,1);
});

/** WHICH COLUMN NAMES THE VARIABLES is defaulted, not demanded: `wideDataTable` writes a key
 *  column called `measure`, so a table this application melted already says. A table with no such
 *  column gets the same statement with one variable in it. */
test('the melt\'s own measure column is picked up without being named',()=>{
  const named=relateShape(tableVIII(),boundaryTable(),
    {on:'sub_district',bring:'supplier',normalisation:'exact'});
  assert.deepEqual(named.shares.map(s=>s.measure),
    ['population_1851','deaths_seven_weeks'],'read from the `measure` column unasked');
});

test('a table with no measure column reports the share of its one value field',()=>{
  // Keyed by sub-district alone, which is what a long file with a single variable looks like.
  const rows=tableVIII().rows.filter(r=>r.key.measure==='population_1851')
    .map(r=>({key:{sub_district:r.key.sub_district},value:r.value}));
  const flat={kind:'data-table',keys:['sub_district'],valueField:'people',unit:'people',
    rows,rowCount:rows.length,missingValueCount:0};
  const shape=relateShape(flat,boundaryTable(),
    {on:'sub_district',bring:'supplier',normalisation:'exact'});
  assert.equal(shape.shares.length,1);
  assert.equal(shape.shares[0].measure,'people','the value field, since nothing else names one');
  assert.equal(shape.shares[0].all,486936);
  assert.equal(shape.shares[0].related,332266);
});

test('a category is related across on a shared key, and the row count does not change',()=>{
  const left=tableVIII();
  const {table,related,dropped,gaps,values}=relateTable(left,tableXII(),
    {on:'sub_district',bring:'water_supply'});
  assert.equal(related,64,'32 sub-districts, two measures each');
  assert.equal(dropped,0);
  assert.deepEqual(gaps,[]);
  assert.equal(table.rows.length,left.rows.length,'relating a category adds a column, not rows');
  assert.deepEqual(table.keys,['sub_district','measure','water_supply']);
  assert.deepEqual([...values].sort(),['Lambeth Company and Southwark and Vauxhall Company',
    'Lambeth Company only','Southwark and Vauxhall Company only']);
});

test('the hand-computed contingency table is reproduced exactly',()=>{
  const related=relateTable(tableVIII(),tableXII(),{on:'sub_district',bring:'water_supply'}).table;
  const {table:grouped,groups,collapsedFrom,dropped}=groupTable(related,
    {by:['water_supply','measure']});
  assert.equal(groups,6,'three supply categories, two measures');
  assert.equal(collapsedFrom,64);
  assert.deepEqual(dropped,['sub_district']);

  const {table:derived}=deriveValue(grouped,{keyColumn:'measure',left:'population_1851',
    operator:'minus',right:'deaths_seven_weeks',name:'survived'});
  const {table}=selectRows(derived,'measure',['deaths_seven_weeks','survived']);

  const cell=(supply,measure)=>table.rows.find(r=>r.key.water_supply===supply
    &&r.key.measure===measure).value;
  // The six numbers inlined in the example project, which nothing in the application could derive.
  assert.equal(cell('Southwark and Vauxhall Company only','deaths_seven_weeks'),844);
  assert.equal(cell('Southwark and Vauxhall Company only','survived'),166810);
  assert.equal(cell('Lambeth Company and Southwark and Vauxhall Company','deaths_seven_weeks'),652);
  assert.equal(cell('Lambeth Company and Southwark and Vauxhall Company','survived'),299497);
  assert.equal(cell('Lambeth Company only','deaths_seven_weeks'),18);
  assert.equal(cell('Lambeth Company only','survived'),19115);
  assert.equal(table.rows.length,6);
});

test('an ambiguous key is refused rather than resolved',()=>{
  const right={...tableXII()};
  right.rows=[...right.rows,{key:{sub_district:right.rows[0].key.sub_district,
    water_supply:'Lambeth Company only'},value:1}];
  assert.throws(()=>relateTable(tableVIII(),right,{on:'sub_district',bring:'water_supply'}),
    /more than one "water_supply"/);
});

/** A gap is now a DECISION, not a default. From 0.3.0 the run refuses until the practitioner says
 *  what to do with the rows that did not match, because the two answers give different totals and
 *  the result cannot be read for which one you got. */
const withheld=()=>{
  const right=tableXII();
  const missing=right.rows[0].key.sub_district;
  right.rows=right.rows.slice(1);
  return {right,missing};
};
const declare=(gaps,decision,extra={})=>
  ({decision,signature:gapSignature(gaps,'fuzzy'),...extra});

test('a left key the right table lacks is refused until the practitioner decides',()=>{
  const {right}=withheld();
  assert.throws(()=>relateTable(tableVIII(),right,{on:'sub_district',bring:'water_supply'}),
    /no row in the second/,
    'the run does not pick between dropping and keeping on the practitioner\'s behalf');
});

test('a left key the right table lacks is reported, not defaulted, once dropping is declared',()=>{
  const {right,missing}=withheld();
  const request={on:'sub_district',bring:'water_supply'};
  const gaps=relateShape(tableVIII(),right,request).overlap.gaps;
  const {gaps:reported,dropped,kept,table}=relateTable(tableVIII(),right,
    {...request,unmatched:declare(gaps,'drop')});
  assert.deepEqual(reported,[{key:missing,rows:2}]);
  assert.equal(dropped,2);
  assert.equal(kept,0);
  assert.equal(table.rows.length,62);
  assert.ok(!table.rows.some(r=>r.key.water_supply===undefined),
    'no row carries an invented category');
});

test('keeping the unmatched rows puts them under the practitioner\'s own label',()=>{
  const {right,missing}=withheld();
  const request={on:'sub_district',bring:'water_supply'};
  const gaps=relateShape(tableVIII(),right,request).overlap.gaps;
  const {table,dropped,kept,values}=relateTable(tableVIII(),right,
    {...request,unmatched:declare(gaps,'keep',{label:'Supply not recorded'})});
  assert.equal(table.rows.length,64,'the row count is the left table\'s again');
  assert.equal(dropped,0);
  assert.equal(kept,2);
  assert.ok(values.includes('Supply not recorded'));
  const theirs=table.rows.filter(r=>r.key.sub_district===missing);
  assert.equal(theirs.length,2);
  assert.ok(theirs.every(r=>r.key.water_supply==='Supply not recorded'));
  // The values are the ones the table held: keeping a row does not make its numbers unknown.
  assert.ok(theirs.every(r=>typeof r.value==='number'));
});

test('keeping needs a label, and will not reuse one the second table measured',()=>{
  const {right}=withheld();
  const request={on:'sub_district',bring:'water_supply'};
  const gaps=relateShape(tableVIII(),right,request).overlap.gaps;
  assert.throws(()=>relateTable(tableVIII(),right,
    {...request,unmatched:declare(gaps,'keep')}),/needs a name/,
    'nothing invents a stratum the data never measured');
  assert.throws(()=>relateTable(tableVIII(),right,
    {...request,unmatched:declare(gaps,'keep',{label:'Lambeth Company only'})}),
    /already a "water_supply" the second table measured/,
    'a declared stratum must not merge into an observed one');
});

test('a decision lapses when the data changes under it',()=>{
  const {right}=withheld();
  const request={on:'sub_district',bring:'water_supply'};
  const settled=declare(relateShape(tableVIII(),right,request).overlap.gaps,'drop');
  // A second sub-district withheld: the same decision no longer describes this gap.
  right.rows=right.rows.slice(1);
  assert.throws(()=>relateTable(tableVIII(),right,{...request,unmatched:settled}),
    /no longer describes this gap/);
});

test('a decision lapses when the key comparison changes the gap under it',()=>{
  // Two different faults in the right table, which is what separates the two comparisons: one
  // sub-district is absent outright, and one is spelled without its comma. Folding punctuation
  // fixes the second and cannot fix the first, so the gap is two keys compared exactly and one
  // compared folded -- and a decision made about one of those is not a decision about the other.
  const right=tableXII();
  right.rows=right.rows.filter(r=>r.key.sub_district!=='St. Saviour, Southwark');
  right.rows=right.rows.map(r=>r.key.sub_district==='St. Olave, Southwark'
    ?{...r,key:{...r.key,sub_district:'St. Olave Southwark'}}:r);
  const request={on:'sub_district',bring:'water_supply'};
  const strict=relateShape(tableVIII(),right,{...request,normalisation:'exact'});
  const folded=relateShape(tableVIII(),right,{...request,normalisation:'fuzzy'});
  assert.equal(strict.overlap.gaps.length,2,'absent, and spelled without its comma');
  assert.equal(folded.overlap.gaps.length,1,'folding fixes the comma and not the absence');
  // Decided under the folded comparison, then run under the exact one: refused.
  const settled={decision:'drop',signature:folded.signature};
  assert.throws(()=>relateTable(tableVIII(),right,
    {...request,normalisation:'exact',unmatched:settled}),/no longer describes this gap/);
  // And the decision that was made about the exact gap is honoured there.
  const underExact=relateTable(tableVIII(),right,
    {...request,normalisation:'exact',unmatched:{decision:'drop',signature:strict.signature}});
  assert.equal(underExact.dropped,4,'two sub-districts, two measures each');
  assert.equal(underExact.normalisation,'exact');
});

test('a stale decision with nothing unmatched is ignored rather than refused',()=>{
  // Nothing to decide, so there is no decision to be stale. Snow's two tables agree exactly, so
  // this is the state the South London example is in.
  const request={on:'sub_district',bring:'water_supply',
    unmatched:{decision:'drop',signature:'from-some-earlier-gap'}};
  const {dropped,kept,gaps}=relateTable(tableVIII(),tableXII(),request);
  assert.deepEqual(gaps,[]);
  assert.equal(dropped,0);
  assert.equal(kept,0);
});

test('relating a column the left table already has is refused',()=>{
  const left=relateTable(tableVIII(),tableXII(),{on:'sub_district',bring:'water_supply'}).table;
  assert.throws(()=>relateTable(left,tableXII(),{on:'sub_district',bring:'water_supply'}),
    /already has a "water_supply" column/);
});

test('a group holding an empty cell totals to null and is named',()=>{
  const related=relateTable(tableVIII(),tableXII(),{on:'sub_district',bring:'water_supply'}).table;
  const holed={...related,rows:related.rows.map((row,i)=>
    i===related.rows.findIndex(r=>r.key.water_supply==='Lambeth Company only')
      ?{...row,value:null}:row)};
  const {table,gaps}=groupTable(holed,{by:['water_supply','measure']});
  assert.equal(gaps.length,1,'one group held the empty cell');
  assert.equal(gaps[0].rowsEmpty,1);
  const affected=table.rows.find(r=>r.key.water_supply==='Lambeth Company only'
    &&r.key.measure===gaps[0].group.split(' · ')[1]);
  assert.equal(affected.value,null,'an unknown total is null, not a smaller number');
});

test('grouping by every column is refused as a no-op',()=>{
  assert.throws(()=>groupTable(tableVIII(),{by:['sub_district','measure']}),
    /every row is already its own group/);
});

/** THE OUTCOME, which is the part of a relate that the table it produces cannot tell you.
 *
 *  A dropped row is absent from the result, so `table.rowCount` agrees with itself whether the
 *  second table carried every key or two thirds of them. These assert that the number a reader
 *  needs -- the denominator the result is a part of -- survives to the run object. */
test('the outcome carries the denominator the result is a part of',()=>{
  const left=tableVIII();
  const request={on:'sub_district',bring:'water_supply'};
  const outcome=relateOutcome(left,request,relateTable(left,tableXII(),request));
  assert.equal(outcome.offered,64);
  assert.equal(outcome.related,64);
  assert.equal(outcome.dropped,0);
  assert.equal(outcome.offered,outcome.related+outcome.dropped);
  assert.deepEqual(outcome.gaps,[]);
  assert.deepEqual(outcome.carried,['sub_district','measure'],
    "the left table's own columns, in its order, so the brought one is identifiable");
  assert.equal(outcome.bring,'water_supply');
  assert.equal(outcome.on,'sub_district');
  assert.equal(outcome.values.length,3);
});

test('the outcome names the keys that did not match, not only how many',()=>{
  const {right,missing}=withheld();
  const left=tableVIII();
  const base={on:'sub_district',bring:'water_supply'};
  const request={...base,unmatched:declare(relateShape(left,right,base).overlap.gaps,'drop')};
  const outcome=relateOutcome(left,request,relateTable(left,right,request));
  // 62 of 64 is the whole finding: the table that travels on holds 62 rows and says nothing
  // about the 64 it was made from.
  assert.equal(outcome.offered,64);
  assert.equal(outcome.related,62);
  assert.equal(outcome.dropped,2);
  assert.deepEqual(outcome.gaps,[{key:missing,rows:2}]);
});

test('the outcome is unaffected by a request whose column names carry whitespace',()=>{
  const left=tableVIII();
  const request={on:' sub_district ',bring:' water_supply '};
  const outcome=relateOutcome(left,request,relateTable(left,tableXII(),request));
  // The panel prints `on` and `bring` in a sentence and the Quick Look matches `bring` against
  // a column name, so an untrimmed value here would read as a typo and annotate nothing.
  assert.equal(outcome.on,'sub_district');
  assert.equal(outcome.bring,'water_supply');
});

/** THE NOTE THE WIDGET MACHINES, which is prose for a Methods section and not panel text.
 *
 *  The practitioner, 2026-10-28: transparency about a join *"should be in fact a machined note
 *  from the widget"*, and *"The table join will produce notes that map to Methods."* */
test('the machined note maps to Methods and states what the join did',()=>{
  const left=tableVIII();
  const request={on:'sub_district',bring:'supplier',normalisation:'exact'};
  const shape=relateShape(left,boundaryTable(),request);
  const notes=machinedNotes({...request,overlap:shape.overlap,shares:shape.shares,
    declared:{decision:'drop',reason:'the boundary file spells nine of these without their comma'}},
    {left:'Table VIII',right:'the published boundaries'});
  assert.ok(notes.length>=1);
  assert.ok(notes.every(n=>n.section==='Methods'),'a join is a method, not a limitation');
  assert.ok(notes.every(n=>n.kind==='machined'),'the sibling of a quoted note');

  const all=notes.map(n=>n.text).join(' ');
  assert.match(all,/comparing keys exactly/);
  assert.match(all,/23 sub_district values appeared in both/);
  assert.match(all,/were excluded \(the boundary file spells nine/);
  // The shares, in the practitioner's units, with the totals to check them against.
  assert.match(all,/68\.2% of population_1851 \(332,266 of 486,936\)/);
  assert.match(all,/61\.2% of deaths_seven_weeks \(926 of 1,514\)/);

  // EVERY KEY QUOTED, because a key can contain a comma and here all nine do: a comma-joined
  // list reads as eighteen keys and the reader cannot tell where one ends.
  assert.match(all,/\u201cSt\. Saviour, Southwark\u201d, \u201cSt\. Olave, Southwark\u201d/);

  // BOTH DIRECTIONS of the rate, because nothing here knows which variable is the numerator.
  // Stating only the first pairing would have offered 1.1157 where the figure anybody reads is
  // the mortality rate, 0.8963.
  assert.match(all,/0\.8963 times its value/);
  assert.match(all,/1\.1157 times its value/);
});

test('a join that dropped nothing machines one note and claims no exclusion',()=>{
  const left=tableVIII();
  const request={on:'sub_district',bring:'water_supply'};
  const result=relateTable(left,tableXII(),request);
  const notes=machinedNotes(relateOutcome(left,request,result),
    {left:'Table VIII',right:'Table XII'});
  assert.equal(notes.length,1,'no exclusion sentence where nothing was excluded');
  assert.match(notes[0].text,/No row was excluded\./);
  assert.ok(!/retained/.test(notes[0].text),
    'a share of 100% stated at all would train a reader to skip the sentence');
});

test('keeping the rows machines a note that names the declared category, not an exclusion',()=>{
  const {right}=withheld();
  const base={on:'sub_district',bring:'water_supply'};
  const request={...base,unmatched:declare(relateShape(tableVIII(),right,base).overlap.gaps,
    'keep',{label:'Supply not recorded',reason:'absent from Table XII'})};
  const left=tableVIII();
  const notes=machinedNotes(relateOutcome(left,request,relateTable(left,right,request)),
    {left:'Table VIII',right:'Table XII'});
  assert.equal(notes.length,1);
  assert.match(notes[0].text,/retained and recorded as \u201cSupply not recorded\u201d/);
  assert.match(notes[0].text,/a category Table XII does not measure/);
  assert.ok(!/absent from this analysis/.test(notes[0].text),
    'nothing left, so there is no exclusion to report');
});

// SEVERAL KEYS, AND THE VALUE BROUGHT ACROSS (2026-11-05, experiment 179). A satellite reading and a ground reading are
// the same observation only for the same monitor on the same day; the ground reading is its table's value.
test('rows relate on several keys together, and the second table\'s value column can be brought across',async()=>{
  const {relateReceiptFacts}=await import('../build/relate-table.js');
  const row=(key,value)=>({key,value});
  const satellite={kind:'data-table',keys:['point_id','date','measure'],valueField:'nitrogendioxide_tropospheric_column',
    rows:[row({point_id:'5-110',date:'2023-06-07',measure:'no2'},4.2e-5),row({point_id:'5-110',date:'2023-06-08',measure:'no2'},3.1e-5),
      row({point_id:'81-124',date:'2023-06-07',measure:'no2'},2.5e-5)],rowCount:3,missingValueCount:0};
  const ground={kind:'data-table',keys:['point_id','date'],valueField:'value',
    rows:[row({point_id:'5-110',date:'2023-06-07'},21.4),row({point_id:'5-110',date:'2023-06-08'},18),
      row({point_id:'81-124',date:'2023-06-07'},null),row({point_id:'81-124',date:'2023-06-08'},15)],rowCount:4,missingValueCount:1};
  const request={on:'point_id',alsoOn:['date'],bring:'value',unmatched:undefined};
  // Two monitor-days have a ground reading; the third's is empty, so it does not relate.
  const shape=relateShape(satellite,ground,request);
  assert.equal(shape.overlap.matched,2);
  const kept={...request,unmatched:{decision:'keep',label:'no ground reading',signature:shape.signature}};
  const result=relateTable(satellite,ground,kept);
  assert.deepEqual(result.table.keys,['point_id','date','measure','value']);
  assert.deepEqual(result.table.rows.map(r=>r.key.value),['21.4','18','no ground reading']);
  // Matched on the first key alone, one monitor's two days would make the second table ambiguous.
  assert.throws(()=>relateTable(satellite,ground,{on:'point_id',bring:'value'}),/more than one "value"/);
  const outcome=relateOutcome(satellite,kept,result);
  assert.equal(outcome.on,'point_id and date');
  const facts=relateReceiptFacts(outcome,[],{runId:'r',nodeId:'n'});
  assert.match(facts,/fw:matchedOn "point_id";\n\s+fw:matchedOn "date";/);
  assert.throws(()=>relateTable(satellite,ground,{on:'point_id',alsoOn:['date'],bring:'date'}),/being matched on/);
});

// A DATE WITHIN A PERIOD, AND A LAG (experiment 180): Brazil's epidemiological weeks against MODIS's 8-day periods.
test('a week relates to the 8-day period containing its Wednesday, shifted back k weeks for a lag',async()=>{
  const {relateTable,relateOutcome,relateReceiptFacts}=await import('../build/relate-table.js');
  const weeks={kind:'data-table',keys:['municipio','data_iniSE'],valueField:'casos',rowCount:3,missingValueCount:0,
    rows:[['Rio','2024-02-18',100],['Rio','2024-02-25',120],['Niteroi','2024-02-18',30]].map(([m,d,v])=>({key:{municipio:m,data_iniSE:d},value:v}))};
  const lst={kind:'data-table',keys:['municipio','period_start','period_end'],valueField:'LST_Day_1km',rowCount:6,missingValueCount:0,
    rows:[['Rio','2024-02-02','2024-02-09',30.1],['Rio','2024-02-10','2024-02-17',30.5],['Rio','2024-02-18','2024-02-25',31.0],['Rio','2024-02-26','2024-03-04',29.0],
      ['Niteroi','2024-02-10','2024-02-17',28.0],['Niteroi','2024-02-18','2024-02-25',28.5]]
      .map(([m,a,b,v])=>({key:{municipio:m,period_start:a,period_end:b},value:v}))};
  const within={date:'data_iniSE',start:'period_start',end:'period_end'};
  // Lag 0: Sunday + 3 days = Wednesday. 2024-02-21 is in 18-25 Feb; 2024-02-28 is in 26 Feb-4 Mar.
  const now=relateTable(weeks,lst,{on:'municipio',bring:'LST_Day_1km',within,shiftDays:3});
  assert.deepEqual(now.table.rows.map(r=>[r.key.municipio,r.key.data_iniSE_shifted,r.key.period_start,r.key.LST_Day_1km]),
    [['Rio','2024-02-21','2024-02-18','31'],['Rio','2024-02-28','2024-02-26','29'],['Niteroi','2024-02-21','2024-02-18','28.5']]);
  // Lag 2 weeks: 3 - 14 = -11 days. 2024-02-07 is in 2-9 Feb; 2024-02-14 in 10-17 Feb; Niteroi has no period holding 7 Feb.
  const two={on:'municipio',bring:'LST_Day_1km',within,shiftDays:-11,unmatched:undefined};
  assert.throws(()=>relateTable(weeks,lst,two),/1 key in the first table has no row in the second/);
  const {relateShape}=await import('../build/relate-table.js');
  const shape=relateShape(weeks,lst,two);
  assert.deepEqual(shape.previews.drop.rows.map(r=>[r.key.municipio,r.key.period_start,r.key.LST_Day_1km]),
    [['Rio','2024-02-02','30.1'],['Rio','2024-02-10','30.5']]);
  // The receipt states the period match and the shift; the outcome names the start as a key.
  const dropped=relateTable(weeks,lst,{...two,unmatched:{decision:'drop',signature:shape.signature}});
  const outcome=relateOutcome(weeks,two,dropped);
  assert.deepEqual(outcome.keys,['municipio','period_start']);
  const facts=relateReceiptFacts(outcome,[],{runId:'r',nodeId:'n'});
  assert.match(facts,/fw:matchedWithinPeriod "data_iniSE between period_start and period_end";\n  fw:dateShiftDays "-11"\^\^xsd:integer;/);
  // A date inside two periods is refused by name: two satellites' rows for one period, kept together.
  const twice={...lst,rows:[...lst.rows,{key:{municipio:'Rio',period_start:'2024-02-19',period_end:'2024-02-26'},value:33}]};
  assert.throws(()=>relateTable(weeks,twice,{on:'municipio',bring:'LST_Day_1km',within,shiftDays:3}),
    /2024-02-21 falls inside 2 periods of the second table for Rio: 2024-02-18 and 2024-02-19/);
});

/** A WEEKLY TABLE RELATED TO ITSELF, SHIFTED (experiment 182): rainfall two weeks before each case week. The week's
 *  own start is both the date and the period, so the matched start is written as data_iniSE_matched and the first
 *  table's data_iniSE is kept as it was. */
test('a table relates to itself shifted by whole weeks; its own date column is kept, the match named _matched',async()=>{
  const {relateTable,relateOutcome}=await import('../build/relate-table.js');
  const cases={kind:'data-table',keys:['municipio','data_iniSE'],valueField:'casos',rowCount:3,missingValueCount:0,
    rows:[['Rio','2024-02-18',100],['Rio','2024-02-25',120],['Rio','2024-03-03',90]].map(([m,d,v])=>({key:{municipio:m,data_iniSE:d},value:v}))};
  const rain={kind:'data-table',keys:['municipio','data_iniSE'],valueField:'precip_total_semana',rowCount:4,missingValueCount:0,
    rows:[['Rio','2024-02-04',10],['Rio','2024-02-11',20],['Rio','2024-02-18',30],['Rio','2024-02-25',40]]
      .map(([m,d,v])=>({key:{municipio:m,data_iniSE:d},value:v}))};
  const request={on:'municipio',bring:'precip_total_semana',within:{date:'data_iniSE',start:'data_iniSE',end:'data_iniSE'},shiftDays:-14};
  const r=relateTable(cases,rain,request);
  assert.deepEqual(r.table.rows.map(x=>[x.key.data_iniSE,x.key.data_iniSE_shifted,x.key.data_iniSE_matched,x.key.precip_total_semana]),
    [['2024-02-18','2024-02-04','2024-02-04','10'],['2024-02-25','2024-02-11','2024-02-11','20'],['2024-03-03','2024-02-18','2024-02-18','30']]);
  assert.deepEqual(relateOutcome(cases,request,r).keys,['municipio','data_iniSE_matched']);
});

test('a second shifted relate on one table keeps both shifted dates, the second as _shifted_2',async()=>{
  const {relateTable,relateOutcome}=await import('../build/relate-table.js');
  const cases={kind:'data-table',keys:['municipio','data_iniSE','data_iniSE_shifted','period_start'],valueField:'casos',rowCount:1,missingValueCount:0,
    rows:[{key:{municipio:'Rio',data_iniSE:'2024-02-18',data_iniSE_shifted:'2024-02-07',period_start:'2024-02-02'},value:100}]};
  const rain={kind:'data-table',keys:['municipio','data_iniSE'],valueField:'precip_total_semana',rowCount:1,missingValueCount:0,
    rows:[{key:{municipio:'Rio',data_iniSE:'2024-02-04'},value:10}]};
  const request={on:'municipio',bring:'precip_total_semana',within:{date:'data_iniSE',start:'data_iniSE',end:'data_iniSE'},shiftDays:-14};
  const r=relateTable(cases,rain,request);
  assert.deepEqual([r.table.rows[0].key.data_iniSE_shifted,r.table.rows[0].key.data_iniSE_shifted_2,r.table.rows[0].key.precip_total_semana],
    ['2024-02-07','2024-02-04','10']);
  assert.ok(relateOutcome(cases,request,r).carried.includes('data_iniSE_shifted_2'));
});

test('a join decision is signed with a short digest, and one saved in the old written-out form still holds',async()=>{
  const {relateTable,relateShape,legacyGapSignature}=await import('../build/relate-table.js');
  const left={kind:'data-table',keys:['k'],valueField:'n',rowCount:3,missingValueCount:0,
    rows:['a','b','c'].map(k=>({key:{k},value:1}))};
  const right={kind:'data-table',keys:['k','cat'],valueField:'m',rowCount:1,missingValueCount:0,rows:[{key:{k:'a',cat:'x'},value:1}]};
  const shape=relateShape(left,right,{on:'k',bring:'cat'});
  assert.match(shape.signature,/^gap:\d+:[0-9a-f]{16}$/);
  const drop=sig=>relateTable(left,right,{on:'k',bring:'cat',unmatched:{decision:'drop',signature:sig}});
  assert.equal(drop(shape.signature).table.rows.length,1);
  const legacy=legacyGapSignature(shape.overlap.gaps,'fuzzy');
  assert.equal(drop(legacy).table.rows.length,1,'a decision saved before 0.41.0');
  assert.throws(()=>drop('gap:1:0000000000000000'),/no longer describes this gap/);
  assert.throws(()=>drop('something else entirely'),/no longer describes this gap/);
});

/** ONE RELATE, SEVERAL SHIFTS (experiment 185): one column per shift, every row kept, a shift with no value left
 *  EMPTY and counted. The same fixture as the shifted self-relate above, so each column can be held against it. */
test('several shifts bring one column each, keep every row, and count what is empty at each shift',async()=>{
  const {relateAtShifts,relateTable,shiftColumnName,MAX_SHIFTS}=await import('../build/relate-table.js');
  const cases={kind:'data-table',keys:['municipio','data_iniSE'],valueField:'casos',rowCount:3,missingValueCount:0,
    rows:[['Rio','2024-02-18',100],['Rio','2024-02-25',120],['Rio','2024-03-03',90]].map(([m,d,v])=>({key:{municipio:m,data_iniSE:d},value:v}))};
  const rain={kind:'data-table',keys:['municipio','data_iniSE'],valueField:'precip_total_semana',rowCount:4,missingValueCount:0,
    rows:[['Rio','2024-02-04',10],['Rio','2024-02-11',20],['Rio','2024-02-18',30],['Rio','2024-02-25',40]]
      .map(([m,d,v])=>({key:{municipio:m,data_iniSE:d},value:v}))};
  const request={on:'municipio',bring:'precip_total_semana',within:{date:'data_iniSE',start:'data_iniSE',end:'data_iniSE'}};
  const {table,columns}=relateAtShifts(cases,rain,request,[0,-7,-14]);
  assert.deepEqual(table.keys,['municipio','data_iniSE','precip_total_semana_0d','precip_total_semana_-7d','precip_total_semana_-14d'],
    'one column per shift, and none of the single shift’s helper columns');
  assert.equal(table.rows.length,3,'every row kept');
  assert.deepEqual(table.rows.map(r=>[r.key['precip_total_semana_0d'],r.key['precip_total_semana_-7d'],r.key['precip_total_semana_-14d']]),
    [['30','20','10'],['40','30','20'],['','40','30']]);
  assert.deepEqual(columns.map(c=>[c.shiftDays,c.matched,c.empty]),[[0,2,1],[-7,3,0],[-14,3,0]]);
  assert.deepEqual(table.columnShifts,{'precip_total_semana_0d':0,'precip_total_semana_-7d':-7,'precip_total_semana_-14d':-14});
  // EACH COLUMN IS WHAT ONE SHIFTED RELATE GIVES, on the rows that one keeps.
  const one=relateTable(cases,rain,{...request,shiftDays:-14});
  assert.deepEqual(one.table.rows.map(r=>r.key.precip_total_semana),table.rows.map(r=>r.key['precip_total_semana_-14d']));
  assert.equal(shiftColumnName('LST_Day_1km',14),'LST_Day_1km_+14d');
  // BOUNDED, checked whole before anything is matched.
  assert.throws(()=>relateAtShifts(cases,rain,request,[]),/at least one shift/);
  assert.throws(()=>relateAtShifts(cases,rain,request,[-7,-7]),/listed twice/);
  assert.throws(()=>relateAtShifts(cases,rain,request,[-3.5]),/whole number of days/);
  assert.throws(()=>relateAtShifts(cases,rain,request,Array.from({length:MAX_SHIFTS+1},(_,i)=>-i)),/At most/);
  assert.throws(()=>relateAtShifts(cases,rain,{on:'municipio',bring:'precip_total_semana'},[0,-7]),/matched to a period/);
});
