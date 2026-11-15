import test from 'node:test';
import assert from 'node:assert/strict';
import {partsTable,sortedRows,partsTableMarkup} from '../build/map-parts-table.js';

/** THE TABLE UNDER THE MAP: one row per place, not per part; every attribute as spelled; numbers sorted as numbers. */
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const features=[
  {id:'DE-BW',name:'DE-BW',properties:{shapeName:'Baden-Württemberg',cases:11}},
  {id:'DE-HB',name:'DE-HB',properties:{shapeName:'Bremen',cases:0}},
  {id:'DE-HB',name:'DE-HB',properties:{shapeName:'Bremen',cases:0}},   // Bremerhaven, a second part of Bremen
  {id:'DE-BE',name:'DE-BE',properties:{shapeName:'Berlin',cases:1,note:null}},
];

test('one row per place, every attribute in the order it first appears',()=>{
  const t=partsTable(features);
  assert.deepEqual(t.rows.map(r=>r.id),['DE-BW','DE-HB','DE-BE']);
  assert.deepEqual(t.columns,['shapeName','cases','note']);
});
test('numbers sort as numbers, an empty cell last',()=>{
  const t=partsTable([...features,{id:'DE-SL',name:'DE-SL',properties:{shapeName:'Saarland',cases:null}}]);
  assert.deepEqual(sortedRows(t,'cases','descending').map(r=>r.id),['DE-BW','DE-BE','DE-HB','DE-SL']);
  assert.deepEqual(sortedRows(t,'cases','ascending').map(r=>r.id),['DE-HB','DE-BE','DE-BW','DE-SL']);
});
test('a layer with no attributes has no table, and the markup names each row by its place',()=>{
  assert.equal(partsTable([{id:'a',name:'a'},{id:'b',name:'b',properties:{}}]),null);
  const html=partsTableMarkup(partsTable(features),esc,{chosen:'DE-BE'});
  assert.match(html,/Attributes of the 3 places/);
  assert.match(html,/<tr data-map-part="DE-BE" tabindex="0" aria-selected="true"/);
  assert.match(html,/<td class="number">11<\/td>/);
});
