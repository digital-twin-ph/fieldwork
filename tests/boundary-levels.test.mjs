import test from 'node:test';
import assert from 'node:assert/strict';
import {levelCheck} from '../build/boundary-levels.js';

/** WHAT A BOUNDARY LEVEL HOLDS (2026-11-20): its own name where geoBoundaries states one, and its units set beside the
 *  census's levels as printed, so a level whose count matches none says so before a census is related to it. */
test('a level whose count matches a census level says which',()=>{
  const said=levelCheck('RWA',{level:'ADM2',units:30,canonical:'Unknown'});
  assert.match(said,/does not name what ADM2's units are/);
  assert.match(said,/counts 5 province and 30 district/);
  assert.match(said,/as many as its district and the rows of “Its 30 districts/);
});
test('two census levels together are a match',()=>{
  assert.match(levelCheck('MWI',{level:'ADM2',units:32,canonical:'District'}),/as many as its district and city together/);
});
test('a level matching no census level says so',()=>{
  const said=levelCheck('KEN',{level:'ADM2',units:290,canonical:'Constituencies'});
  assert.match(said,/calls ADM2's units “Constituencies”/);
  assert.match(said,/No level of the census has this level's 290 units/);
});
test('a country without a census table says only the name',()=>{
  assert.equal(levelCheck('FRA',{level:'ADM1',units:13,canonical:'Regions'}),'geoBoundaries calls ADM1\'s units “Regions”.');
});
