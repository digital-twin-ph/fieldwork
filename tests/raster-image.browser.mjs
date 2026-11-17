import {test,expect} from './fixtures.mjs';

/** A LARGE WINDOW IS DRAWN AT NO MORE THAN 2048 PIXELS A SIDE (2026-11-17). Botswana's WorldPop window, about 11,000 cells
 *  a side, was drawn one pixel a cell and Chrome on Windows ran out of memory. Each drawn pixel is the mean of the cells
 *  with data in its block; a block with none stays clear. A small window is still drawn a pixel a cell. */
test('a large raster is drawn reduced, each pixel the mean of its block, and a small one cell for cell',async({page})=>{
  await page.goto('/');
  const r=await page.evaluate(async()=>{
    const {rasterImage,rasterImageFactor}=await import('/build/raster-image.js');
    const size=async src=>{const img=new Image();img.src=src;await img.decode();
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);
      return {w:img.naturalWidth,h:img.naturalHeight,px:(i,j)=>[...x.getImageData(i,j,1,1).data]};};
    // 5000 x 3000: factor 3. The first block of 3 x 3 holds 0 and 8 others at 1, mean 8/9; a block of NaN only is clear.
    const width=5000,height=3000,values=new Float32Array(width*height).fill(1);values[0]=0;values[1]=10;
    for(let y=0;y<3;y++)for(let x=3;x<6;x++)values[y*width+x]=NaN;
    const big=await size(rasterImage({metadata:{width,height},values}));
    const small=await size(rasterImage({metadata:{width:7,height:5},values:new Float32Array(35).fill(2)}));
    return {factor:rasterImageFactor({width,height}),w:big.w,h:big.h,clear:big.px(1,0)[3],first:big.px(0,0),plain:big.px(2,0),small:[small.w,small.h]};
  });
  expect(r.factor).toBe(3);
  expect([r.w,r.h]).toEqual([1667,1000]);
  expect(r.clear).toBe(0);
  // Mean of the first block, (0+10+7)/9 = 1.89, against 1 elsewhere: darker than a plain block, by the same ramp.
  expect(r.first[0]).toBeLessThan(r.plain[0]);
  expect(r.small).toEqual([7,5]);
});
