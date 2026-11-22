import test from 'node:test';
import assert from 'node:assert/strict';
import {exifPosition,readPinPhotos,metresApart,withoutMetadata} from '../build/pin-photos.js';
import {exifSegment,withExif} from './exif-fixture.mjs';

/** A PIN'S PHOTO (experiment 09, 2026-11-22): where a phone said it was taken is read from its EXIF, before anything is
 *  re-encoded; a file with none, or not a JPEG, has no position. */
const jpeg=Buffer.from([0xff,0xd8,0xff,0xd9]);
test('a photo\'s GPS position is read from its EXIF, south and east signed',()=>{
  const [lon,lat]=exifPosition(withExif(jpeg,exifSegment([[25,54,31],'E'],[[24,39,16],'S'])));
  assert.ok(Math.abs(lon-25.908611)<1e-5);assert.ok(Math.abs(lat-(-24.654444))<1e-5);
  const [w]=exifPosition(withExif(jpeg,exifSegment([[1,30,0],'W'],[[51,30,0],'N'])));assert.equal(w,-1.5);
});
test('no EXIF, no GPS, or not a JPEG: no position',()=>{
  assert.equal(exifPosition(jpeg),null);
  assert.equal(exifPosition(Buffer.from('not a picture')),null);
  assert.equal(exifPosition(withExif(jpeg,exifSegment([[0,0,0],'E'],[[0,0,0],'N']))),null,'0, 0 is a phone with no fix');
});
test('photos read back keep only what they can be, at most ten a pin',()=>{
  const p={sha256:'a'.repeat(64),mime:'image/jpeg',bytes:10,width:4,height:3,addedAt:'2026-11-22T00:00:00Z',caption:' Clinic front '};
  assert.deepEqual(readPinPhotos({pin1:[p,{sha256:'nope'},{...p,mime:'image/png'}]}),{pin1:[{...p,caption:'Clinic front'}]});
  assert.equal(readPinPhotos({pin1:Array(12).fill(p)}).pin1.length,10);
  assert.equal(readPinPhotos({pin1:[]}),undefined);assert.equal(readPinPhotos('x'),undefined);
  assert.ok(Math.abs(metresApart([0,0],[0,1])-111195)<5);
});

test('a kept photo carries no metadata segment: EXIF and comments go, the image data stays',()=>{
  const body=Buffer.from([0xff,0xdb,0,4,1,2,0xff,0xda,0,2,9,9,9,0xff,0xd9]);
  const comment=Buffer.from([0xff,0xfe,0,5,0x68,0x69,0x21]);
  const jfif=Buffer.from([0xff,0xe0,0,4,7,7]);
  const photo=Buffer.concat([Buffer.from([0xff,0xd8]),jfif,exifSegment([[25,54,31],'E'],[[24,39,16],'S']),comment,body]);
  const clean=Buffer.from(withoutMetadata(photo));
  assert.deepEqual(clean,Buffer.concat([Buffer.from([0xff,0xd8]),jfif,body]));
  assert.equal(exifPosition(clean),null);
});
