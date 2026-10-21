import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLayerSymbol,layerSymbol,LAYER_SHAPES,MARK_VOCABULARY,orderedSteps,ORDERED_PALETTE,FIGURE_PALETTE} from '../build/presentation.js';

// "They are both rendered same color when inside the polygon and there is no layer to check or
// uncheck to assess which points come from which source." Hue had been spent on the spatial
// relation, leaving provenance with no channel at all.
test('hue and mark both carry the layer, so neither has to be read alone',()=>{
  const first=layerSymbol(0),second=layerSymbol(1);
  assert.notEqual(first.colour,second.colour,'two sources are two hues');
  assert.equal(first.shape,second.shape,'and the mark only changes once the hues run out');
  // Six hues before a mark repeats, so twenty-four layers are distinguishable and the map refuses
  // more than eight.
  assert.equal(layerSymbol(FIGURE_PALETTE.length).colour,first.colour);
  assert.notEqual(layerSymbol(FIGURE_PALETTE.length).shape,first.shape);
});

test('the marks are the standard’s names, not ours',()=>{
  assert.deepEqual([...LAYER_SHAPES],['circle','square','triangle','star','cross','x']);
  assert.match(MARK_VOCABULARY,/opengis\.net\/se\/1\.1\/WellKnownName/);
  assert.ok(!LAYER_SHAPES.includes('diamond'),'diamond is a common extension and not an SE WellKnownName');
});

test('a chosen symbol wins, and says that it was chosen',()=>{
  const derived=resolveLayerSymbol(2);
  assert.deepEqual(derived.chosen,{colour:false,shape:false});
  const picked=resolveLayerSymbol(2,{mark:'star'});
  assert.equal(picked.shape,'star');
  assert.equal(picked.colour,derived.colour,'what was not chosen keeps its derived value');
  assert.deepEqual(picked.chosen,{colour:false,shape:true},
    'because "a star because somebody chose one" and "a star because it is the seventh layer" are different claims');
});

// ColorBrewer, where the variable has an order. The isochrone bands were six hand-written hex
// literals -- a categorical set standing in for a sequence, which a reader cannot rank.
test('an ordered quantity gets an ordered ramp, spread across the scheme',()=>{
  assert.deepEqual(orderedSteps(0),[]);
  assert.deepEqual(orderedSteps(1),[ORDERED_PALETTE[4]],'one band takes the darkest, not the palest');
  const three=orderedSteps(3);
  assert.deepEqual(three,[ORDERED_PALETTE[0],ORDERED_PALETTE[2],ORDERED_PALETTE[4]],
    'three bands use light, middle and dark rather than three pale neighbours');
  assert.equal(orderedSteps(5).length,5);
  const many=orderedSteps(8);
  assert.equal(many.length,8);
  assert.equal(many[7],ORDERED_PALETTE[4],'past the scheme the tail shares the darkest class');
});

test('the ordered palette is not the categorical one',()=>{
  for(const hue of ORDERED_PALETTE)assert.ok(!FIGURE_PALETTE.includes(hue),
    'a sequence and a set of categories are different jobs and must not share hues');
});
