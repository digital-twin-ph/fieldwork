import test from 'node:test';
import assert from 'node:assert/strict';
import {tableDescriptionNote,mapDescriptionNote,chartDescriptionNote} from '../build/artifact-notes.js';
import {toHTML} from '../build/prose.js';

/** WHAT AN ARTIFACT DECLARES ABOUT ITSELF.
 *
 *  The practitioner, 2026-10-30: *"We need to add the tables next, then maps, then charts as
 *  machined notes."* And then the limit on it: *"Captions are the user's responsibility, unless
 *  there is a way to machine it based on table, map, chart or equation semantics."* Experiment
 *  141, amendment of 2026-10-30. */

const TABLE={kind:'data-table',keys:['water_supply','measure'],valueField:'people',
  rowCount:6,missingValueCount:0,rows:[]};
const LAYERS=[
  {id:'a',kind:'ground',origin:'port',port:'ground',label:'Snow’s Map 2, 1855',index:0,drawn:true},
  {id:'b',kind:'polygons',origin:'port',port:'polygons',label:'Registration sub-districts',
    index:1,drawn:true,parts:32},
  {id:'c',kind:'points',origin:'port',port:'points',label:'Water intakes',index:2,drawn:false},
];
const CHART={field:'value',measure:'value',caption:'deaths per 1,000 people (proportion)',
  categoryTitle:'group',unit:'per 1,000 people',total:1514,
  bins:[{key:'a',label:'A',count:5.1},{key:'b',label:'B',count:0}]};

const every=()=>[tableDescriptionNote(TABLE,'Died or survived','n1','Select rows'),
  mapDescriptionNote(LAYERS,'South London','n2'),
  chartDescriptionNote(CHART,'Ranked','n3')];

test('a description lands in Results, on the node that drew it, claiming no function',()=>{
  for(const note of every()){
    assert.equal(note.kind,'machined');
    assert.equal(note.section,'Results');
    assert.equal(note.id,`${note.nodeId}:description`);
    // NO `fn`, AND THIS IS THE ASSERTION THE PRACTITIONER'S RULE TURNED INTO A TEST. The first
    // version filed these under `fn: 'caption'`, which claimed an authorial act the module does
    // not perform. None of the seven reconciled functions describes what this does, and coining
    // an eighth to file it under is how a vocabulary gets withdrawn later.
    assert.equal(note.fn,undefined);
  }
});

test('nothing machined here claims to be the caption',()=>{
  // *"Captions are the user's responsibility, unless there is a way to machine it based on table,
  // map, chart or equation semantics."* Every sentence below is read off a declaration -- keys,
  // value field, layer index, feature count, unit, bar count -- and the caption is the author's.
  for(const note of every())
    assert.doesNotMatch(note.text,/\bcaption\b/i,`${note.nodeId} calls itself a caption`);
});

test('NOTHING MACHINED HERE NUMBERS THE ARTIFACT',()=>{
  // The rule the module is shaped around. A number is computed when a document is rendered, from
  // the note's position in the IMRaD outline and the venue's convention -- set one figure aside
  // and the ones after it move up. "Table 1" written into the text would be right when it was
  // machined and wrong the first time somebody drags a card.
  //
  // CHECKED AGAINST THE MODULE'S OWN WORDING, with the author's strings removed first. The first
  // version of this test matched the whole caption and failed on `Snow's Map 2, 1855` -- which
  // is the name of the plate, not a figure number. That is not a flaw in the test so much as the
  // argument for the rule: "Map 2" is a legitimate thing for a caption to contain, so a number
  // cannot be found or avoided by pattern, and only a generator that never writes one is safe.
  const authored=['South London','Died or survived','Ranked','Select rows',
    'Snow\u2019s Map 2, 1855','Registration sub-districts','Water intakes',
    'deaths per 1,000 people (proportion)','water_supply','measure','people','group',
    'per 1,000 people'];
  for(const note of every()){
    let mine=note.text;
    for(const text of authored)mine=mine.split(text).join(' ');
    assert.doesNotMatch(mine,/\b(table|figure|chart|map|exhibit)\s+(\d+|[ivxlc]+)\b/i,
      `${note.nodeId} numbered itself: ${mine}`);
  }
});

test('a table description names its columns as the table spells them',()=>{
  const note=tableDescriptionNote(TABLE,'Died or survived','n1','Select rows');
  assert.match(note.text,/6 rows, keyed by `water_supply` and `measure`\./);
  assert.match(note.text,/Each value is `people`\./);
  // NOT PROSE OVER ARBITRARY COLUMN NAMES. The first version wrote "${valueField} by ${keys}",
  // which on this application's own output produced "per 1,000 people by group" -- because
  // `rateTable` sets `valueField` to a unit phrase and keys a long table by the word `measure`.
  assert.doesNotMatch(note.text,/people by water_supply/);
});

test('a unit is said once, and only where it says something the value field does not',()=>{
  const same=tableDescriptionNote({...TABLE,valueField:'per 1,000 people',unit:'per 1,000 people'},
    'Mortality','n1');
  assert.equal(same.text.match(/per 1,000 people/g).length,1);
  const differs=tableDescriptionNote({...TABLE,valueField:'deaths',unit:'people'},'M','n1');
  assert.match(differs.text,/Each value is `deaths`, in people\./);
});

test('an empty cell is reported as unknown rather than zero',()=>{
  const note=tableDescriptionNote({...TABLE,missingValueCount:2},'T','n1');
  assert.match(note.text,/2 cells are empty: unknown rather than zero\./);
  assert.match(tableDescriptionNote({...TABLE,missingValueCount:1},'T','n1').text,/1 cell is empty/);
  assert.doesNotMatch(tableDescriptionNote(TABLE,'T','n1').text,/empty/);
});

test('a table that is not a data table machines nothing',()=>{
  // `table_output` has four modes and only one of them is a published table. Describing a
  // point view or a decision band would be describing a screen.
  assert.equal(tableDescriptionNote({kind:'point-table',rows:[]},'T','n1'),null);
  assert.equal(tableDescriptionNote(undefined,'T','n1'),null);
});

test('an upstream producer is named, unless it would repeat the title',()=>{
  assert.match(tableDescriptionNote(TABLE,'Died or survived','n1','Select rows').text,
    /Produced by Select rows\./);
  assert.doesNotMatch(tableDescriptionNote(TABLE,'Select rows','n1','Select rows').text,/Produced by/);
  assert.doesNotMatch(tableDescriptionNote(TABLE,'T','n1','').text,/Produced by/);
});

test('a map description lists its layers bottom to top, and says what was not drawn',()=>{
  const note=mapDescriptionNote(LAYERS,'South London','n2');
  assert.match(note.text,/2 layers, bottom to top: Snow’s Map 2, 1855; Registration sub-districts \(32 features\)\./);
  // `fw:layerDrawn` exists so a receipt can tell a map that showed three of five layers from one
  // only ever wired to three. A reader of the figure is owed the same distinction.
  assert.match(note.text,/1 further layer is connected and not drawn: Water intakes\./);
  // The order is the index, not the order the array happened to arrive in.
  const shuffled=mapDescriptionNote([LAYERS[1],LAYERS[0],LAYERS[2]],'S','n2');
  assert.match(shuffled.text,/bottom to top: Snow’s Map 2, 1855; Registration/);
});

test('a map with nothing drawn machines nothing',()=>{
  assert.equal(mapDescriptionNote(LAYERS.map(l=>({...l,drawn:false})),'S','n2'),null);
  assert.equal(mapDescriptionNote([],'S','n2'),null);
});

test('a chart carries the caption it already had, and does not repeat its unit',()=>{
  const note=chartDescriptionNote(CHART,'Ranked','n3');
  // `ChartSummary.caption` has existed since before this module and reached no write-up.
  assert.match(note.text,/deaths per 1,000 people \(proportion\)\./);
  // Appending the unit produced "each a value in per 1,000 people" -- two prepositions, one fact
  // twice -- because the chart's own caption already named it.
  assert.equal(note.text.match(/per 1,000 people/g).length,1);
  assert.match(note.text,/2 bars, one per `group`\./);
  const other=chartDescriptionNote({...CHART,caption:'Cases by week'},'C','n3');
  assert.match(other.text,/each a value in per 1,000 people/);
});

test('a bar at zero is reported, because a withheld value looks the same',()=>{
  const note=chartDescriptionNote(CHART,'Ranked','n3');
  assert.match(note.text,/1 bar sits at zero/);
  assert.match(note.text,/the table is where they are told apart/);
  assert.doesNotMatch(chartDescriptionNote({...CHART,bins:[{key:'a',label:'A',count:5}]},'C','n3').text,
    /sits at zero/);
});

test('an unnamed artifact is left unnamed rather than given a title',()=>{
  // Inventing "Table" would put a word in the write-up nobody chose and a reader would take for
  // the author's.
  for(const note of [tableDescriptionNote(TABLE,undefined,'n1'),mapDescriptionNote(LAYERS,'  ','n2'),
    chartDescriptionNote(CHART,undefined,'n3')])
    assert.doesNotMatch(note.text,/^\*\*/,`${note.nodeId} invented a title: ${note.text}`);
});

test('every description survives the reading the Notes panel gives it',()=>{
  for(const note of every()){
    const html=toHTML(note.text);
    assert.doesNotMatch(html,/<script|<img/);
    assert.doesNotMatch(note.text,/^\s*\|/m);
    assert.doesNotMatch(note.text,/^#{1,4}\s/m);
  }
});
