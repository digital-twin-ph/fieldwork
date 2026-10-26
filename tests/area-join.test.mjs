import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {joinTableToAreas} from '../build/area-join.js';

/** THE JOIN THE SOUTH LONDON EXAMPLE HAS ARGUED FOR IN PROSE SINCE IT WAS PUBLISHED.
 *
 *  Its catalog entry says it plainly: *"Nothing joins a table to the parts of a study area, so
 *  the 32 mortality rates and the 32 named boundaries cannot colour one another."*
 *
 *  Exercised against the real transcription and the real boundaries rather than a fixture,
 *  because the thing being tested is whether two independently produced name lists agree, and a
 *  fixture would be me writing down my own answer. */
const BASE=new URL('../../example-1855-cholera-south-london/',import.meta.url);
const present=existsSync(new URL('geo/sub-districts-csds.geojson',BASE));
const skip=present?undefined:{skip:'example-1855-cholera-south-london is not checked out beside this repository.'};

const boundaries=()=>JSON.parse(readFileSync(new URL('geo/sub-districts-csds.geojson',BASE),'utf8'))
  .features.map((f,i)=>({id:`part-${i}`,name:f.properties.subdist}));
const table=()=>{
  const lines=readFileSync(new URL('data/table-viii-sub-districts-seven-weeks.csv',BASE),'utf8').trim().split(/\r?\n/);
  const header=lines[0].split(',');
  const rows=lines.slice(1).map(line=>{
    const cells=line.startsWith('"')?[line.slice(1,line.indexOf('"',1)),...line.slice(line.indexOf('"',1)+2).split(',')]:line.split(',');
    return {key:{sub_district:cells[0]},value:Number(cells[header.indexOf('deaths_seven_weeks')])};
  });
  return {kind:'data-table',keys:['sub_district'],valueField:'deaths_seven_weeks',
    rows,rowCount:rows.length,missingValueCount:0};
};

test('every sub-district matches, and only after normalisation',skip??{},()=>{
  const units=boundaries(),data=table();
  assert.equal(units.length,32);
  assert.equal(data.rows.length,32);

  // RAW KEYS MISHANDLE 28% OF THE ROWS. The table writes `St. George, Camberwell`; the boundary
  // writes `St. George  Camberwell`. A join on the strings as published matches 23 of 32 and
  // says nothing about the other nine.
  const exact=joinTableToAreas(units,data,{keyField:'sub_district',normalisation:'exact'});
  assert.equal(exact.counts.matchedParts,23);
  assert.equal(exact.counts.unmatchedParts,9);

  // Folding punctuation and spacing matches all of them, and invents nothing: the nine are the
  // same nine, differing only in a comma.
  const folded=joinTableToAreas(units,data,{keyField:'sub_district'});
  assert.equal(folded.counts.matchedParts,32);
  assert.equal(folded.counts.unmatchedParts,0);
  assert.equal(folded.counts.unmatchedRows,0);
  assert.equal(folded.declared.normalisation,'fuzzy');

  // AND NO TWO NAMES COLLAPSE INTO ONE. The hazard the normalisation itself creates: folding
  // punctuation could merge two genuinely different sub-districts. It does not here, and the
  // join would say so if it did.
  assert.equal(folded.diagnostics.filter(d=>d.code==='ambiguous-data-key').length,0);
  assert.equal(folded.diagnostics.filter(d=>d.code==='duplicate-boundary-key').length,0);

  // The values arrive on the parts, not merely the keys.
  const rotherhithe=folded.parts.find(p=>p.name==='Rotherhithe');
  assert.ok(rotherhithe&&typeof rotherhithe.value==='number'&&rotherhithe.value>0);
});

test('a boundary part with no row keeps its place on the map',()=>{
  // Drawn and empty, not dropped: a boundary with no data is a fact about the data, and a hole
  // in the map would be read as a different claim entirely.
  const result=joinTableToAreas(
    [{id:'a',name:'Alpha'},{id:'b',name:'Beta'}],
    {kind:'data-table',keys:['area'],valueField:'deaths',
      rows:[{key:{area:'Alpha'},value:7}],rowCount:1,missingValueCount:0},
    {keyField:'area'});
  assert.equal(result.parts.length,2);
  assert.equal(result.parts[1].value,null);
  assert.equal(result.parts[1].matched,false);
  assert.equal(result.diagnostics.filter(d=>d.code==='unmatched-boundary').length,1);
});

test('two parts of one name both take the value, and it is reported',()=>{
  // Streatham is two polygons in Snow's South London -- the parish and its detached part. A RATE
  // is an intensity and is true of both; a COUNT would be double-counted by the same move, which
  // is why this is reported rather than passed over in silence.
  const result=joinTableToAreas(
    [{id:'a',name:'Streatham'},{id:'b',name:'Streatham'},{id:'c',name:'Brixton'}],
    {kind:'data-table',keys:['area'],valueField:'rate',
      rows:[{key:{area:'Streatham'},value:12},{key:{area:'Brixton'},value:5}],
      rowCount:2,missingValueCount:0},
    {keyField:'area'});
  assert.equal(result.counts.matchedParts,3);
  assert.equal(result.counts.sharedParts,2);
  assert.deepEqual(result.parts.filter(p=>p.shared).map(p=>p.value),[12,12]);
  const shared=result.diagnostics.find(d=>d.code==='duplicate-boundary-key');
  assert.ok(shared);
  assert.match(shared.says,/true of a rate and is not true of a count/);
});

test('two keys that collapse into one are refused, not silently merged',()=>{
  const result=joinTableToAreas(
    [{id:'a',name:'St. Mary Newington'}],
    {kind:'data-table',keys:['area'],valueField:'deaths',
      rows:[{key:{area:'St. Mary, Newington'},value:3},{key:{area:'St Mary Newington'},value:9}],
      rowCount:2,missingValueCount:0},
    {keyField:'area'});
  const ambiguous=result.diagnostics.find(d=>d.code==='ambiguous-data-key');
  assert.ok(ambiguous,'two raw keys folding together must be named');
  assert.match(ambiguous.says,/cannot tell which one/);
});

test('a key column the table does not have is refused by name',()=>{
  assert.throws(()=>joinTableToAreas([{id:'a',name:'Alpha'}],
    {kind:'data-table',keys:['area'],valueField:'deaths',rows:[],rowCount:0,missingValueCount:0},
    {keyField:'district'}),/no column "district".*keyed by area/s);
});

test('the joined area becomes polygons a map can draw, one per part',skip??{},async()=>{
  const {joinedPolygons}=await import('../build/area-join.js');
  const units=boundaries(),data=table();
  const geo=JSON.parse(readFileSync(new URL('geo/sub-districts-csds.geojson',BASE),'utf8'));
  // The boundary as the study area holds it: every part of every sub-district, undissolved.
  const boundary={type:'MultiPolygon',coordinates:geo.features.flatMap(f=>
    f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates])};
  const result=joinTableToAreas(units,data,{keyField:'sub_district'});
  const polygons=joinedPolygons(boundary,result,"Snow 1855, Table VIII");

  assert.equal(polygons.features.length,32);
  // THE VALUE IS ON THE FEATURE, which is the thing that was missing: `Catchment` had ten named
  // slots owned by other operations and no open bag, so a rate had nowhere to go.
  const first=polygons.features[0];
  assert.equal(typeof first.value,'number');
  assert.equal(first.properties.deaths_seven_weeks,first.value);
  assert.equal(first.properties.sub_district,first.name);
  // The method line states the join rather than leaving a reader to infer it.
  assert.match(polygons.method,/Keyed join on sub_district, fuzzy normalisation: 32 of 32 parts/);
  // Diagnostics travel with the figure, so a reader sees what the join could not do.
  assert.ok(polygons.notes[0].includes('drawn and left empty rather than omitted'));
});

test('a part with no row is drawn, and carries a null rather than a number',async()=>{
  const {joinedPolygons}=await import('../build/area-join.js');
  const square=c=>[[[c,0],[c+1,0],[c+1,1],[c,1],[c,0]]];
  const result=joinTableToAreas(
    [{id:'a',name:'Alpha'},{id:'b',name:'Beta'}],
    {kind:'data-table',keys:['area'],valueField:'deaths',
      rows:[{key:{area:'Alpha'},value:7}],rowCount:1,missingValueCount:0},
    {keyField:'area'});
  const polygons=joinedPolygons({type:'MultiPolygon',coordinates:[square(0),square(2)]},result,'x');
  assert.equal(polygons.features.length,2);
  assert.equal(polygons.features[0].value,7);
  // Drawn, and empty. A hole in the map would read as a different claim than "no data here".
  assert.equal(polygons.features[1].value,undefined);
  assert.equal(polygons.features[1].properties.deaths,null);
  assert.ok(polygons.notes.some(n=>n.startsWith('unmatched-boundary:')));
});
