/** WKB beyond a point.
 *
 *  One decoder serves GeoPackage and GeoParquet, which both carry geometry as WKB. The bytes
 *  below are built by hand rather than taken from a file, so a failure says which field of the
 *  encoding is misread rather than that some file no longer opens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeWkb,readWkb} from '../build/wkb.js';

/** A tiny WKB writer, so the tests state the bytes they mean. */
function wkb(parts,little=true){
  const chunks=[];
  const push=(fn,size,value)=>{const b=new DataView(new ArrayBuffer(size));b[fn](0,value,little);
    chunks.push(new Uint8Array(b.buffer));};
  for(const [kind,value] of parts){
    if(kind==='u8')chunks.push(Uint8Array.of(value));
    else if(kind==='u32')push('setUint32',4,value);
    else push('setFloat64',8,value);
  }
  return Uint8Array.from(chunks.flatMap(c=>[...c]));
}
const header=(type,little=true)=>[['u8',little?1:0],['u32',type]];
const xy=(x,y)=>[['f64',x],['f64',y]];

test('a point reads in either byte order, and the orders agree',()=>{
  const little=decodeWkb(wkb([...header(1,true),...xy(-0.1268,51.4875)],true));
  const big=decodeWkb(wkb([...header(1,false),...xy(-0.1268,51.4875)],false));
  assert.deepEqual(little,{type:'Point',coordinates:[-0.1268,51.4875]});
  assert.deepEqual(big,little,'byte order changes the bytes, never the coordinates');
});

test('a polygon reads its rings, outer first',()=>{
  const square=[[0,0],[1,0],[1,1],[0,1],[0,0]];
  const hole=[[.4,.4],[.6,.4],[.6,.6],[.4,.6],[.4,.4]];
  const geometry=decodeWkb(wkb([...header(3),['u32',2],
    ['u32',square.length],...square.flatMap(([x,y])=>xy(x,y)),
    ['u32',hole.length],...hole.flatMap(([x,y])=>xy(x,y))]));
  assert.equal(geometry.type,'Polygon');
  assert.equal(geometry.coordinates.length,2);
  assert.deepEqual(geometry.coordinates[0],square);
  assert.deepEqual(geometry.coordinates[1],hole);
});

test('a multipolygon member may use the OTHER byte order, which is legal and is the classic bug',()=>{
  const ring=[[0,0],[1,0],[1,1],[0,0]];
  const member=little=>[...header(3,little),['u32',1],['u32',ring.length]];
  // Outer little-endian, first member big-endian: assuming the outer order corrupts this.
  const outer=wkb([...header(6,true),['u32',1]],true);
  const inner=wkb([...member(false),...ring.flatMap(([x,y])=>xy(x,y))],false);
  const geometry=decodeWkb(Uint8Array.from([...outer,...inner]));
  assert.equal(geometry.type,'MultiPolygon');
  assert.deepEqual(geometry.coordinates[0][0],ring);
});

test('Z and M ordinates are refused by name, never read as coordinates',()=>{
  for(const [type,says] of [[1001,/Z ordinate/],[2001,/M ordinate/],[3001,/Z and M/]])
    assert.throws(()=>decodeWkb(wkb([...header(type),...xy(1,2),['f64',3]])),says);
  // EWKB flags them in the high bits instead.
  assert.throws(()=>decodeWkb(wkb([...header(0x80000001),...xy(1,2),['f64',3]])),/EWKB/);
});

test('a geometry collection is refused rather than silently reduced to its first member',()=>{
  assert.throws(()=>decodeWkb(wkb([...header(7),['u32',2]])),/geometry collection/i);
});

test('a corrupt count cannot ask for more than the bytes allow',()=>{
  assert.throws(()=>decodeWkb(wkb([...header(2),['u32',4294967295]])),/more than the geometry has bytes for/);
});

test('bytes after the geometry are refused, because they mean a disagreement about the shape',()=>{
  const point=wkb([...header(1),...xy(1,2)]);
  assert.throws(()=>decodeWkb(Uint8Array.from([...point,0,0,0])),/3 bytes follow/);
  // But a reader walking a sequence is told where the next one starts.
  const view=new DataView(point.buffer,point.byteOffset,point.byteLength);
  assert.equal(readWkb(view,0).next,21,'1 order byte + 4 type + 16 coordinate');
});

test('a truncated geometry says so rather than reading past the end',()=>{
  assert.throws(()=>decodeWkb(wkb([...header(1),['f64',1]])),/Truncated/);
  assert.throws(()=>decodeWkb(Uint8Array.of(1,1,0)),/Truncated/);
});

test('an unknown type word is named with its number',()=>{
  assert.throws(()=>decodeWkb(wkb([...header(42)])),/type 42 is not read/);
});
