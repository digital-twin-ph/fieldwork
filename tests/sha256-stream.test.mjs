import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {Sha256,blobDigest} from '../build/sha256-stream.js';

/** A FILE'S SHA-256 READ IN PIECES is the file's SHA-256 (2026-11-13: a 12 GB GHS-POP grid could not be read whole). */
test('the digest equals SHA-256 at every length around the block and padding edges',()=>{
  for(const n of [0,1,55,56,57,63,64,65,119,120,127,128,129,1000,4096,100_003]){
    const data=randomBytes(n);
    assert.equal(new Sha256().update(data).hex(),createHash('sha256').update(data).digest('hex'),`${n} bytes`);
  }
  assert.equal(new Sha256().update(new TextEncoder().encode('abc')).hex(),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('fed in uneven pieces, the digest is the same',()=>{
  const data=randomBytes(300_001),h=new Sha256();
  for(let at=0;at<data.length;){const step=1+((at*7919)%9973);h.update(data.subarray(at,at+step));at+=step;}
  assert.equal(h.hex(),createHash('sha256').update(data).digest('hex'));
});

test('a Blob read a slice at a time gives the file’s digest, and says how far it has got',async()=>{
  const data=randomBytes(1_000_003),seen=[];
  const digest=await blobDigest(new Blob([data]),(read,of)=>seen.push([read,of]),65_536);
  assert.equal(digest,createHash('sha256').update(data).digest('hex'));
  assert.deepEqual(seen.at(-1),[data.length,data.length]);
  assert.equal(seen.length,Math.ceil(data.length/65_536));
});
