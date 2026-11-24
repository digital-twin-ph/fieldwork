import test from 'node:test';
import assert from 'node:assert/strict';
import {mapDescriptionNote,TOO_SMALL_UNITS} from '../build/artifact-notes.js';

// Measured 2026-11-23 on a 10 km area beside country-sized polygons: drawn 2.6 units wide on the 850-unit figure,
// under an 8-unit mark. The practitioner: "The area around a point also does not show up even if I see it in the
// layers." It was drawn; it could not be seen.
const layer=(id,label,kind,index)=>({id,label,kind,origin:'port',port:id,index,drawn:true});
const layers=[layer('polygons','Polygon layer','PolygonsLayer',0),layer('area','Buffer - Mines','AreaLayer',1),
  layer('points','Mines','PointsLayer',2)];

test('a layer smaller than the marks over it is said to be so',()=>{
  const note=mapDescriptionNote(layers,'Map','map',[{id:'polygons',units:590},{id:'area',units:2.6}]);
  assert.match(note.text,/Buffer - Mines is drawn about 3 of the figure’s 850 units across/);
  assert.match(note.text,/smaller than the marks over it/);
  assert.match(note.text,/there to be found rather than read/);
});

test('a layer wider than a mark is not remarked on',()=>{
  const note=mapDescriptionNote(layers,'Map','map',[{id:'polygons',units:590},{id:'area',units:120}]);
  assert.doesNotMatch(note.text,/smaller than the marks/);
});

test('the threshold is the mark, not a chosen number',()=>{
  assert.equal(TOO_SMALL_UNITS,8,'a point mark is 8 units across at the default radius');
  const just=mapDescriptionNote(layers,'Map','map',[{id:'area',units:TOO_SMALL_UNITS}]);
  assert.doesNotMatch(just.text,/smaller than the marks/,'exactly a mark wide is not smaller than one');
  const under=mapDescriptionNote(layers,'Map','map',[{id:'area',units:TOO_SMALL_UNITS-0.1}]);
  assert.match(under.text,/smaller than the marks/);
});

test('with no measurements the note is what it always was',()=>{
  const note=mapDescriptionNote(layers,'Map','map');
  assert.match(note.text,/3 layers, bottom to top/);
  assert.doesNotMatch(note.text,/smaller than the marks/);
});

test('two tiny layers are both named',()=>{
  const note=mapDescriptionNote(layers,'Map','map',[{id:'area',units:2},{id:'polygons',units:3}]);
  assert.match(note.text,/Polygon layer is drawn about 3/);
  assert.match(note.text,/Buffer - Mines is drawn about 2/);
  assert.match(note.text,/, and /);
});
