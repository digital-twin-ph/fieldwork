import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyValues,ORDERED_PALETTE,polygonShading,shadedValues} from '../build/presentation.js';

/** THE CLASS METHOD CHANGES WHAT A READER CONCLUDES, so it is chosen and stated, never implied.
 *
 *  Quantile classes hold equal numbers of areas: they show rank and exaggerate a narrow spread.
 *  Equal intervals preserve magnitude and leave classes empty on a skewed distribution, which
 *  most disease rates are. Neither is correct in general. */

test('quantile classes split the areas evenly; equal intervals split the range',()=>{
  // One extreme value, which is the case that separates the methods. Nine small, one huge.
  const values=[1,1,2,2,3,3,4,4,5,100];
  const quantile=classifyValues(values,{method:'quantile',classes:5});
  const interval=classifyValues(values,{method:'equal-interval',classes:5});

  // Quantile: two areas per class, and the outlier is just "the top fifth".
  assert.deepEqual(quantile.counts,[2,2,2,2,2]);
  // Equal interval: nine areas in the lowest class and the outlier alone at the top, which is
  // what the data actually looks like.
  assert.equal(interval.counts[0],9);
  assert.equal(interval.counts[interval.counts.length-1],1);
  assert.equal(interval.counts.reduce((a,b)=>a+b,0),10);
});

test('a quantile break is a value that occurs, so a reader can find it in the table',()=>{
  const values=[3,7,11,19];
  const {breaks}=classifyValues(values,{method:'quantile',classes:4});
  for(const brk of breaks)assert.ok(values.includes(brk),`${brk} is not a value in the data`);
});

test('absent is not a class',()=>{
  const classed=classifyValues([1,2,3,null,undefined],{classes:3});
  assert.equal(classed.classOf(null),null);
  assert.equal(classed.classOf(undefined),null);
  assert.equal(classed.classOf(Number.NaN),null);
  // A boundary with no row must not be drawn as if it were the lowest class, which would read
  // as a finding of low incidence rather than as an absence of data.
  assert.notEqual(classed.classOf(1),null);
});

test('the colours come from the declared sequential scheme, darkest last',()=>{
  const classed=classifyValues([1,2,3,4,5],{classes:5});
  assert.deepEqual(classed.colours,[...ORDERED_PALETTE]);
  assert.equal(classed.colours[classed.colours.length-1],'#253494');
});

test('classes never exceed the values available, and nothing to class is null',()=>{
  // Three areas cannot carry five classes without an empty one, and an empty class in a
  // sequential key is a step a reader cannot rank.
  assert.equal(classifyValues([5,6,7],{classes:5}).classes,3);
  assert.equal(classifyValues([],{classes:5}),null);
  assert.equal(classifyValues([null,null]),null);
});

test('every value lands in a class, including the extremes',()=>{
  const values=[0,0.5,1,2,3,5,8,13,21,34];
  for(const method of ['quantile','equal-interval']){
    const classed=classifyValues(values,{method,classes:5});
    for(const value of values){
      const at=classed.classOf(value);
      assert.ok(at!==null&&at>=0&&at<classed.classes,`${value} fell outside the classes under ${method}`);
    }
    assert.equal(classed.counts.reduce((a,b)=>a+b,0),values.length,`${method} lost a value`);
  }
});

test('a unit drawn in many parts is classed once, as Bonthe is in Sierra Leone',()=>{
  // Sixteen districts, one of them 83 islands and coast, each part carrying the district's id and rate.
  // Classed by part, Bonthe's 6.72 filled half the values, two breaks fell on it, and the key read
  // "6.72 to 6.72" over an empty class (2026-11-09).
  const rates=[1.86,2.72,3,4.49,6.2,6.72,10.09,10.17,12.13,12.2,12.89,23.08,45.16,66.66,84.31,115.73];
  const features=rates.flatMap((value,i)=>Array.from({length:value===6.72?83:1},()=>({id:`SL${i}`,value})));
  assert.equal(features.length,98);
  assert.deepEqual(shadedValues(features),rates);
  const {classed}=polygonShading(features);
  assert.equal(new Set(classed.breaks).size,classed.breaks.length,'no two breaks equal');
  assert.ok(classed.counts.every(n=>n>0),'no empty class');
  assert.deepEqual(classed.breaks,classifyValues(rates).breaks);
  // Every part is still coloured, by its unit's class.
  assert.equal(features.filter(f=>classed.classOf(f.value)===null).length,0);
});

test('two units sharing a name are two units, and a part with no id is its own',()=>{
  // Streatham is two parishes' worth of polygon under one name, two ids, and the join gives both the rate.
  assert.deepEqual(shadedValues([{id:'a',value:5},{id:'a',value:5},{id:'b',value:5},{value:7},{value:7}]),[5,5,7,7]);
  // Frames are taken once per unit too.
  assert.deepEqual(shadedValues([{id:'a',frames:{y1:1,y2:2}},{id:'a',frames:{y1:1,y2:2}}]),[1,2]);
});
