import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Sha256,sha256OfText} from '../build/sha256-stream.js';
const sha256Hex=b=>new Sha256().update(b).hex();

// THE TEXT DIGEST (2026-11-20) a receipt names a shape by, checked against Node's own: FIPS 180-4's examples, the
// lengths either side of a block boundary, a long text with characters past ASCII, and DR Congo's provinces' size.
const node=bytes=>createHash('sha256').update(bytes).digest('hex');
test('agrees with Node on the standard examples and every length around a block boundary',()=>{
  assert.equal(sha256OfText('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256OfText(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  for(let n=0;n<=200;n++){const b=new Uint8Array(n).map((_,i)=>(i*31+n)&255);assert.equal(sha256Hex(b),node(b),`length ${n}`);}
});
test('agrees with Node on 4.5 MB of GeoJSON-like text with accents',()=>{
  const text=JSON.stringify({type:'MultiPolygon',name:'Équateur, Kasaï',coordinates:Array.from({length:60000},(_,i)=>[i/7,-i/13])});
  assert.equal(sha256OfText(text),node(Buffer.from(text,'utf8')));
});
