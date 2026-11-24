import test from 'node:test';
import assert from 'node:assert/strict';
import {tablePoints} from '../build/table-points.js';

// THE MELT IS INTERNAL. A bat record's popup read "measure: Year" and "value: 1952" as though the file had columns
// called measure and value (the practitioner, 2026-11-23, reading a pin after joining a species list).
const rows=[{key:{Species:'Eidolon helvum',Longitude:'29.4',Latitude:'3.3',measure:'Year'},value:1952}];
const table={keys:['Species','Longitude','Latitude','measure'],valueField:'value',rows};

test('a table read wide puts the variable on the point, not the melt',()=>{
  const {points}=tablePoints({...table,wide:{measureKey:'measure'}},{x:'Longitude',y:'Latitude'});
  const p=points.features[0].properties;
  assert.equal(p.Year,'1952','the variable is named as the file names it');
  assert.equal(p.Species,'Eidolon helvum','the other columns are untouched');
  assert.ok(!('measure' in p),'the measure key is not a column of the data');
  assert.ok(!('value' in p),'and neither is the value field');
});

test('a table that was not read wide is carried as it is',()=>{
  const {points}=tablePoints(table,{x:'Longitude',y:'Latitude'});
  const p=points.features[0].properties;
  assert.equal(p.measure,'Year','without a wide declaration nothing is reinterpreted');
  assert.equal(p.value,'1952');
});

test('a row whose variable name is blank keeps the columns rather than inventing one',()=>{
  const blank=[{key:{Species:'Mops condylurus',Longitude:'29.4',Latitude:'3.3',measure:'  '},value:7}];
  const {points}=tablePoints({...table,rows:blank,wide:{measureKey:'measure'}},{x:'Longitude',y:'Latitude'});
  const p=points.features[0].properties;
  assert.equal(p.measure,'','the reader trims, so a blank variable name is empty here');
  assert.equal(p.value,'7');
});
