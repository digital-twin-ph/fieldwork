import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {readUnits,unitOptions} from '../build/boundary-source.js';

/** A REPEATED NAME IS OFFERED WITH WHERE IT IS. Found 2026-11-05 choosing New York City's boroughs from geoBoundaries'
 *  US counties: 444 of 3,233 names repeat, five Richmonds among them, and a unit carries no state. */

const square=(x,y)=>({type:'Polygon',coordinates:[[[x,y],[x+0.1,y],[x+0.1,y+0.1],[x,y+0.1],[x,y]]]});
const units=[{id:'A',name:'Richmond',geometry:square(-74.22,40.53)},{id:'B',name:'Queens',geometry:square(-73.9,40.65)},
  {id:'C',name:'Richmond',geometry:square(-77.52,37.49)}];

test('a unique name is offered as it is, a repeated one with its position, and the value is the unit id',()=>{
  assert.deepEqual(unitOptions(units),[
    {value:'A',label:'Richmond · 40.57° N, 74.18° W'},
    {value:'B',label:'Queens'},
    {value:'C',label:'Richmond · 37.53° N, 77.48° W'}]);
});

test('where ids repeat, the value falls back to the position in the list',()=>{
  assert.deepEqual(unitOptions([{...units[0],id:'x'},{...units[1],id:'x'}]).map(o=>o.value),['0','1']);
});

// The real level, where a copy is named: geoBoundaries gbOpen USA ADM2, release 9469f09.
const file=process.env.GB_USA_ADM2;
test('NYC: the five boroughs can be told apart from their namesakes',{skip:!(file&&existsSync(file))&&'Set GB_USA_ADM2 to a copy of geoBoundaries-USA-ADM2.geojson.'},()=>{
  const read=readUnits({boundaryID:'USA-ADM2',iso:'USA',level:'ADM2'},JSON.parse(readFileSync(file,'utf8')));
  const options=unitOptions(read);
  assert.equal(new Set(options.map(o=>o.label)).size,options.length,'every option reads differently');
  for(const label of ['New York','Queens','Bronx','Kings · 40.65° N, 73.96° W','Richmond · 40.58° N, 74.17° W'])
    assert.ok(options.some(o=>o.label===label),label);
});
