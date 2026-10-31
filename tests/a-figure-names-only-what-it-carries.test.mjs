/** A STATIC FIGURE NAMES ONLY WHAT IT CARRIES.
 *
 *  Measured on 2026-10-31, on the write-up figure for Snow's plate: a map wired to a study area
 *  and a georeferenced plate and nothing else was headed STUDY AREA · SPATIAL COVERAGE and
 *  captioned "Select a point to review its relation to the study boundary". There was no point
 *  on it, no coverage under review, and -- in a write-up -- nobody to select anything.
 *
 *  The same rule `polygonSvg`'s key already keeps, one renderer over: a figure that names marks
 *  it does not draw is worse than one with no key, because the key is the part a reader trusts
 *  without checking.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {oldMap} from '../build/old-naledi-ui.js';

const esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AREA={type:'Polygon',coordinates:[[[-0.24,51.41],[-0.01,51.41],[-0.01,51.52],[-0.24,51.52],[-0.24,51.41]]]};
const map=rows=>oldMap({kind:'spatial-map',boundary:AREA,rows,centers:[]},undefined,esc,s=>s||'');
const POINT={id:'p1',name:'Battersea intake',coordinates:[-0.18,51.47],relation:'Inside',status:'NoFlag'};

test('a map with no point on it says neither SPATIAL COVERAGE nor select a point',()=>{
  const svg=map([]);
  assert.ok(svg.includes('STUDY AREA'),'the figure no longer says what it is');
  assert.ok(!svg.includes('SPATIAL COVERAGE'));
  assert.ok(!svg.includes('Select a point'));
});

test('a record with no usable location is not a point to select either',()=>{
  // Counted as a row and drawn nowhere: an instruction to select it would be an instruction
  // nobody can follow.
  assert.ok(!map([{...POINT,coordinates:null,relation:'MissingLocation'}]).includes('Select a point'));
});

test('a map that DOES carry points keeps both, because both are then true',()=>{
  const svg=map([POINT]);
  assert.match(svg,/STUDY AREA · SPATIAL COVERAGE/);
  assert.match(svg,/Select a point to review its relation to the study boundary/);
});

test('the north arrow is drawn whatever is on the map',()=>{
  // The one annotation that is a property of the figure rather than of its contents.
  for(const svg of [map([]),map([POINT])])assert.match(svg,/N ↑/);
});
