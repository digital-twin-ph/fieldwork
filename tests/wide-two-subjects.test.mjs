/** TWO SUBJECTS, THREE MEASURES: the shape a reviewer reported against 0.195.0 (e3611a3f) — "Import two districts
 *  with columns for eligible, vaccinated, and missed, and Data quality shows six rows instead of two."
 *
 *  The melt records WHICH key holds the measure (`declaredWide`), and `wideFrame` honoured that record only when
 *  `asDeclared` was also set — which the melt does not set. So it fell back to a heuristic that takes the key with
 *  the most distinct values as the subject: three measures beat two districts, and the table came back transposed
 *  or not at all. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {wideFrame,wideCells} from '../build/data-table-ui.js';

const melted=()=>({kind:'data-table',keys:['district','measure'],valueField:'value',
  wide:{measureKey:'measure',subjectKeys:['district']},
  rows:[
    {key:{district:'Kumbotso',measure:'eligible'},value:120},
    {key:{district:'Kumbotso',measure:'vaccinated'},value:90},
    {key:{district:'Kumbotso',measure:'missed'},value:30},
    {key:{district:'Kunchi',measure:'eligible'},value:80},
    {key:{district:'Kunchi',measure:'vaccinated'},value:55},
    {key:{district:'Kunchi',measure:'missed'},value:25},
  ],rowCount:6,missingValueCount:0});

test('a melted table is read back on the key the melt recorded, not on whichever key varies most',()=>{
  const frame=wideFrame(melted());
  assert.ok(frame,'the table should be readable wide at all');
  // THE SUBJECT IS THE DISTRICT. Measures outnumber districts, so a heuristic that takes the most distinct key
  // picks `measure` and transposes the table -- the file says districts are the records.
  assert.equal(frame.subject,'district');
  assert.equal(frame.measureKey,'measure');
  assert.deepEqual(frame.columns,['eligible','vaccinated','missed']);
  assert.equal(frame.rows.length,2,'two districts, two records');
  assert.deepEqual(frame.rows.map(r=>r.label),['Kumbotso','Kunchi']);
  assert.deepEqual(frame.rows[0].cells,[120,90,30]);
});

test('a subject cell carries every stored row it came from, so renaming a district reaches all three counts',()=>{
  const frame=wideFrame(melted());
  // The reviewer: "Correcting a district name there changes only one of its three counts, splitting the record
  // across two names." A subject's correction must reach every row of that subject.
  assert.deepEqual(frame.rows[0].from.rows,[0,1,2]);
  assert.deepEqual(frame.rows[1].from.rows,[3,4,5]);
});

/** LONG → WIDE → LONG (the practitioner, 2026-11-25: *"So we need a regression test that does back translation:
 *  long > wide > long?"*).
 *
 *  The example assertions above only catch the shape somebody thought of. A round trip states the property instead:
 *  widening a table and unwidening it must give back exactly the rows that were stored — no row lost, none invented,
 *  none moved to another subject. A transposition fails it, because the subject and the measure swap places and the
 *  keys come back on the wrong columns. */
const shapes={
  'two subjects, three measures':melted(),
  'three subjects, two measures':{kind:'data-table',keys:['district','measure'],valueField:'value',
    wide:{measureKey:'measure',subjectKeys:['district']},
    rows:[['A','eligible',1],['A','missed',2],['B','eligible',3],['B','missed',4],['C','eligible',5],['C','missed',6]]
      .map(([district,measure,value])=>({key:{district,measure},value})),rowCount:6,missingValueCount:0},
  // RAGGED: a subject with a measure nobody recorded. The cell is absent, and absent is not zero.
  'a subject missing one measure':{kind:'data-table',keys:['district','measure'],valueField:'value',
    wide:{measureKey:'measure',subjectKeys:['district']},
    rows:[['A','eligible',1],['A','missed',2],['B','eligible',3]]
      .map(([district,measure,value])=>({key:{district,measure},value})),rowCount:3,missingValueCount:0},
};

for(const [name,table] of Object.entries(shapes))
  test(`long to wide to long gives back the stored rows: ${name}`,()=>{
    const frame=wideFrame(table);
    assert.ok(frame,`${name}: should be readable wide`);
    // UNWIDENED by the frame's own account of itself: each cell is one stored row, keyed by its subject and the
    // column it sits under.
    const back=[];
    for(const row of frame.rows)
      frame.columns.forEach((column,i)=>{
        if(row.cells[i]===undefined)return;
        back.push({key:{[frame.subject]:row.label,[frame.measureKey]:column},value:row.cells[i]});
      });
    const order=rows=>[...rows].map(r=>JSON.stringify([r.key,r.value])).sort();
    assert.deepEqual(order(back),order(table.rows),`${name}: the same rows, neither lost nor invented`);
  });

test('every cell names the stored row it came from',()=>{
  // The provenance is what an edit is recorded against, so a round trip that agreed on values while pointing at the
  // wrong rows would still corrupt an edit.
  const table=melted(),frame=wideFrame(table);
  for(const row of frame.rows)
    frame.columns.forEach((column,i)=>{
      const at=row.from.cells[i];
      if(row.cells[i]===undefined){assert.equal(at,undefined);return;}
      const stored=table.rows[at];
      assert.ok(stored,`column ${column} should name a stored row`);
      assert.equal(stored.key[frame.subject],row.label);
      assert.equal(stored.key[frame.measureKey],column);
      assert.equal(stored.value,row.cells[i]);
    });
});

/** A GENUINELY LONG TABLE IS NOT PIVOTED WHERE NOBODY ASKED (2026-11-25). The data quality dialog widens only a
 *  table that carries a reading; `wideCells`, which draws the Join and Detect previews, widened every table it was
 *  given. An outside review found the gap: a file whose columns really are `column` and `class` -- a data
 *  dictionary -- had its class names pivoted into headings there, the same defect the gate caught in the quality
 *  dialog. The rule for every user-facing view is now the one rule: widen what the table says is wide. */
const dictionary=()=>({kind:'data-table',keys:['column','class'],valueField:'count',
  rows:[
    {key:{column:'age',class:'numeric'},value:1},
    {key:{column:'sex',class:'categorical'},value:1},
    {key:{column:'onset',class:'date'},value:1},
  ],rowCount:3,missingValueCount:0});

test('a long table with no declared reading keeps its own columns in the Join and Detect previews',()=>{
  const cells=wideCells(dictionary());
  assert.deepEqual(cells.columns,['column','class','count'],'the file\'s columns, as the file spells them');
  assert.equal(cells.rows.length,3,'one row per record');
  assert.deepEqual(cells.rows[1],['sex','categorical','1']);
  // AND THE CLASS NAMES ARE NOT HEADINGS. This is the shape of the defect, named rather than implied.
  assert.ok(!cells.columns.includes('categorical'),'a column of class names must not become headings');
});

test('declaring the reading cascades into those same previews',()=>{
  // The practitioner: the decision to view a natively long table wide "should cascade downstream for user facing
  // views of that table". The declaration rides on the table, so `wideCells` honours it without being told again.
  const declared={...dictionary(),wide:{measureKey:'class',subjectKeys:['column']}};
  const cells=wideCells(declared);
  assert.deepEqual(cells.columns,['column','numeric','categorical','date']);
  assert.deepEqual(cells.rows.map(r=>r[0]),['age','sex','onset']);
});

/** A KEY THE RECORD DOES NOT NAME, AND A RECORD THAT ARRIVES TWICE (gate, 2026-11-25). Both found by following the
 *  gate's two red tests rather than re-baselining their numbers: Relate's preview had lost the column it brought
 *  across, and the dengue example's note counted 92 greyed rows where the file says 184. */
const brought=()=>({kind:'data-table',keys:['sub_district','water_supply','measure'],valueField:'value',
  wide:{measureKey:'measure',subjectKeys:['sub_district']},
  rows:[
    {key:{sub_district:'Rotherhithe',water_supply:'Southwark and Vauxhall Company only',measure:'deaths'},value:103},
    {key:{sub_district:'Rotherhithe',water_supply:'Southwark and Vauxhall Company only',measure:'population'},value:17805},
    {key:{sub_district:'Brixton',water_supply:'Lambeth Company only',measure:'deaths'},value:9},
    {key:{sub_district:'Brixton',water_supply:'Lambeth Company only',measure:'population'},value:14610},
  ],rowCount:4,missingValueCount:0});

test('a key the melt never heard of stays a column of the table',()=>{
  // Relate brings `water_supply` onto a table keyed by sub_district and measure. The record names neither, and
  // dropping it left the preview without the one variable a reader checks before grouping by it.
  const frame=wideFrame(brought());
  assert.deepEqual(frame.attributes,['water_supply']);
  assert.deepEqual(frame.rows.map(r=>r.attributes[0]),
    ['Southwark and Vauxhall Company only','Lambeth Company only']);
  assert.deepEqual(wideCells(brought()).columns,['sub_district','water_supply','deaths','population']);
});

const doubled=()=>({kind:'data-table',keys:['municipio','data_iniSE','measure'],valueField:'value',
  wide:{measureKey:'measure',subjectKeys:['municipio']},
  rows:[
    {key:{municipio:'Angra dos Reis',data_iniSE:'2024-12-22',measure:'casos'},value:31},
    {key:{municipio:'Angra dos Reis',data_iniSE:'2024-12-22',measure:'pop'},value:181228},
    {key:{municipio:'Angra dos Reis',data_iniSE:'2024-12-29',measure:'casos'},value:24},
    {key:{municipio:'Angra dos Reis',data_iniSE:'2024-12-29',measure:'pop'},value:181228},
    // THE SAME WEEK AGAIN, byte for byte, as the Rio file really holds it for all 92 municipalities.
    {key:{municipio:'Angra dos Reis',data_iniSE:'2024-12-29',measure:'casos'},value:24},
    {key:{municipio:'Angra dos Reis',data_iniSE:'2024-12-29',measure:'pop'},value:181228},
  ],rowCount:6,missingValueCount:0});

test('a record that arrives twice is drawn twice, so a duplicate is not absorbed into the pivot',()=>{
  const frame=wideFrame(doubled());
  // A key that VARIES WITHIN the subject identifies the record, so the week is not an attribute of the municipality.
  assert.deepEqual(frame.subjectKeys,['municipio','data_iniSE']);
  assert.equal(frame.rows.length,3,'three rows for three stored records, not two for two distinct weeks');
  assert.deepEqual(frame.rows.map(r=>r.cells[0]),[31,24,24]);
  // AND NO VALUE WAS OVERWRITTEN: every stored row is accounted for exactly once.
  assert.deepEqual(frame.rows.flatMap(r=>r.from.rows).sort((a,b)=>a-b),[0,1,2,3,4,5]);
});

/** A KEY THAT IS GROUPED BY IS ALSO SHOWN (2026-11-25, review of 0.197.0). `declaredFrame` put a key that varies
 *  within a subject into the row's identity — correctly, so two records are not merged — and left it out of the
 *  columns drawn. Two years of counts for one district then appeared as two rows, neither saying its year: right in
 *  number, useless to read, and indistinguishable from a duplicate. */
const twoYears=()=>({kind:'data-table',keys:['district','year','measure'],valueField:'value',
  wide:{measureKey:'measure',subjectKeys:['district']},
  rows:[
    {key:{district:'Kumbotso',year:'2024',measure:'eligible'},value:120},
    {key:{district:'Kumbotso',year:'2024',measure:'vaccinated'},value:90},
    {key:{district:'Kumbotso',year:'2025',measure:'eligible'},value:131},
    {key:{district:'Kumbotso',year:'2025',measure:'vaccinated'},value:102},
  ],rowCount:4,missingValueCount:0});

test('a key that distinguishes two records is drawn, not only grouped by',()=>{
  const frame=wideFrame(twoYears());
  assert.equal(frame.rows.length,2,'two years, two rows');
  assert.deepEqual(frame.subjectKeys,['district','year'],'the year identifies the record');
  assert.deepEqual(frame.attributes,['year'],'and the year is shown');
  assert.deepEqual(frame.rows.map(r=>r.attributes[0]),['2024','2025']);
  assert.deepEqual(wideCells(twoYears()).columns,['district','year','eligible','vaccinated']);
  assert.deepEqual(wideCells(twoYears()).rows[1],['Kumbotso','2025','131','102']);
});
