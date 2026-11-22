import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TiffHeader} from '../build/tiff-header.js';
import {openRaster,readCells} from '../build/terrio.js';
import {pictureOrValues} from '../build/geotiff-picture.js';

/** A JPEG-COMPRESSED YCbCr PICTURE GEOTIFF (experiment 221, the last kind of picture not yet read through terrio). The
 *  fixture is 384 by 256 cells of three gradients, written by GDAL 3.12.2 through rasterio 1.5.2 with PHOTOMETRIC=YCBCR,
 *  COMPRESS=JPEG, quality 95, 128-cell tiles. GDAL decoded it back to red, green and blue; the digest of those bytes, one
 *  byte each, pixel by pixel, is the reference. terrio must give the same bytes: JPEG and the YCbCr conversion are lossy,
 *  so a different decoder could differ by a level and still be right, but these two do not differ at all. */
const GDAL_RGB_SHA256='64ef941c8eb8777eea00298d3882f2ba3260acda6569821c91eb12f49da61bf9';

test('a JPEG-compressed YCbCr picture GeoTIFF reads as a picture, and terrio decodes it to the bytes GDAL does',async()=>{
  const blob=new Blob([readFileSync(new URL('./fixtures/picture-ycbcr-jpeg.tif',import.meta.url))]);
  const h=await TiffHeader.open(blob);
  assert.equal(h.photometric,6);
  assert.equal(pictureOrValues({samplesPerPixel:h.samplesPerPixel,bitsPerSample:h.bitsPerSample,photometric:h.photometric,sampleFormat:h.sampleFormat}).kind,'picture');
  const dataset=await openRaster(blob);
  try{
    const n=h.width*h.height,rgb=new Uint8Array(n*3);
    for(let b=0;b<3;b++){const band=await readCells(dataset,[0,0,h.width,h.height],b+1);for(let i=0;i<n;i++)rgb[i*3+b]=band[i];}
    assert.equal(createHash('sha256').update(rgb).digest('hex'),GDAL_RGB_SHA256);
  }finally{dataset.free();}
});
