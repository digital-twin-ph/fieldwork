import test from 'node:test';
import assert from 'node:assert/strict';
import {drawnBounds,tilesIn,packTiles,unpackTile} from '../build/tile-extract.js';

test('the boundary is everything a map drew, a study area as much as polygons',()=>{
  const area={nodeId:'m',boundary:{type:'Polygon',coordinates:[[[121,14],[121.2,14],[121.2,14.3],[121,14]]]}};
  assert.deepEqual(drawnBounds(area),[121,14,121.2,14.3]);
  const points={features:[{geometry:{type:'Point',coordinates:[3,7]}},{geometry:{type:'Point',coordinates:[4,8]}}]};
  assert.deepEqual(drawnBounds(points),[3,7,4,8]);
  assert.equal(drawnBounds({nodeId:'m',label:'nothing drawn'}),null);
  assert.equal(drawnBounds({values:[1,2,3]}),null,'numbers outside a coordinates array are not a place');
});

test('tiles are counted from the boundary, and the packed file gives each one back',()=>{
  assert.deepEqual(tilesIn([121,14,121.2,14.3],0,1),[[0,0,0],[1,1,0]]);
  const packed=packTiles(new Map([['0/0/0',new Uint8Array([1,2])],['1/1/0',new Uint8Array([3])]]));
  assert.deepEqual([...unpackTile(packed,'1/1/0')],[3]);
  assert.equal(unpackTile(packed,'2/0/0'),null);
});
