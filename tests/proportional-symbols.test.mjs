import test from 'node:test';
import assert from 'node:assert/strict';
import {proportionalRadius,sizedLargest} from '../build/point-layers.js';

/** PROPORTIONAL SYMBOLS (experiment 210, 2026-11-12): a mark's AREA is in proportion to its value, so its radius goes
 *  with the square root; the largest value takes three times the layer's radius. */
test('area in proportion: four times the value, twice the radius; the largest three times the layer radius',()=>{
  assert.equal(proportionalRadius(16,16,4),12);
  assert.equal(proportionalRadius(4,16,4),6);
  assert.equal(proportionalRadius(1,16,4),3);
  assert.equal(proportionalRadius(0,16,4),1.5,'nothing to show takes the smallest mark');
  assert.equal(proportionalRadius('not a number',16,4),1.5);
});

test('each sized layer finds its own largest value, and an unsized layer none',()=>{
  const rows=[{id:'a',sourceNodeId:'deaths',attributes:{DEATHS:3}},{id:'b',sourceNodeId:'deaths',attributes:{DEATHS:15}},
    {id:'c',sourceNodeId:'pumps',attributes:{DEATHS:99}}];
  const largest=sizedLargest(rows,{deaths:{colour:'#000',shape:'circle',sizeBy:'DEATHS'},pumps:{colour:'#000',shape:'square'}});
  assert.deepEqual([...largest],[['deaths',15]]);
});
