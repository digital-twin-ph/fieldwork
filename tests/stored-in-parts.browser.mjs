import {test,expect} from './fixtures.mjs';

// Measured 2026-11-12 in Chromium: IndexedDB refuses one value over 133,169,152 bytes, which refused a kept raster window
// of 67 million cells. A file past 64 MiB is now kept in parts; it must come back whole, and a small one as before.
test('a file larger than one stored value is kept in parts and read back whole',async({page})=>{
  await page.goto('/?example=blank');
  const result=await page.evaluate(async()=>{
    const {keepBytes,readPDF}=await import('/build/evidence-storage.js');
    const large=new Uint8Array(150*1024*1024+7);for(let i=0;i<large.length;i+=4093)large[i]=i%251;
    const small=new Uint8Array([1,2,3,4,5]);
    await keepBytes(new Map([['parts-test-large',large],['parts-test-small',small]]));
    const back=await readPDF('parts-test-large'),again=await readPDF('parts-test-small');
    let same=back?.length===large.length;for(let i=0;same&&i<large.length;i+=4093)same=back[i]===large[i];
    return {same,last:back?.[back.length-1]===large[large.length-1],small:[...(again??[])].join(',')};
  });
  expect(result).toEqual({same:true,last:true,small:'1,2,3,4,5'});
});
