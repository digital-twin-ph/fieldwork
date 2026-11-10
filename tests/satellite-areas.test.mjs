import test from 'node:test';
import assert from 'node:assert/strict';
import {sinusoidal,projectBoundary,cellsIn,modisPasses,sumWindow,addSums,emptySums,bitsSet,MODIS_SPHERE}
  from '../build/satellite-areas.js';

/** SATELLITE FILES OVER AREAS (experiment 180): the projection, which cells count, the MODIS quality rules, clear days
 *  as bits, and sums that add across tiles. Expected values are worked by hand, not taken from the code. */

test('the MODIS sinusoidal projection: x scales with the cosine of latitude, y does not',()=>{
  const [x,y]=sinusoidal(-43,-22.9);
  assert.ok(Math.abs(x-MODIS_SPHERE*(-43*Math.PI/180)*Math.cos(-22.9*Math.PI/180))<1e-6);
  assert.ok(Math.abs(y-MODIS_SPHERE*(-22.9*Math.PI/180))<1e-6);
  assert.deepEqual(sinusoidal(0,0),[0,0]);
});

test('a cell counts when its centre is inside the area, not when the area merely touches it',()=>{
  // A 4 x 4 grid of unit cells from (0,4) down to (4,0), and an area covering cells (0,0), (1,0) and half of (2,0).
  const grid={origin:[0,4],resolution:[1,-1],width:4,height:4};
  const area={type:'Polygon',coordinates:[[[0,3],[2.4,3],[2.4,4],[0,4],[0,3]]]};
  const got=cellsIn(area,grid);
  assert.deepEqual(got.window,[0,0,3,1]);
  // The third cell's centre (2.5, 3.5) is outside: half a cell touched is not a cell.
  assert.deepEqual([...got.mask],[1,1,0]);
  // An area off the grid has no window at all, which the caller reports as a gap.
  assert.equal(cellsIn({type:'Polygon',coordinates:[[[9,9],[10,9],[10,10],[9,10],[9,9]]]},grid),null);
});

test('projecting densifies, so a long edge in degrees follows the projection',()=>{
  const b=projectBoundary({type:'Polygon',coordinates:[[[-44,-23],[-43,-23],[-43,-22],[-44,-22],[-44,-23]]]},
    (x,y)=>sinusoidal(x,y),0.25);
  assert.equal(b.coordinates[0].length,17);
});

test('the three quality rules read the bits the practitioner chose them by',()=>{
  // bits 0-1 mandatory QA, bits 6-7 average LST error.
  const qc=(mandatory,error)=>mandatory|(error<<6);
  assert.equal(modisPasses(qc(0,0),'good'),true);
  assert.equal(modisPasses(qc(1,0),'good'),false);
  assert.equal(modisPasses(qc(1,1),'produced-2k'),true);
  assert.equal(modisPasses(qc(1,2),'produced-2k'),false);
  assert.equal(modisPasses(qc(1,3),'produced'),true);
  // Not produced, for cloud or otherwise, never passes.
  for(const rule of ['good','produced-2k','produced'])for(const m of [2,3])assert.equal(modisPasses(qc(m,0),rule),false);
});

test('clear days are bits: 121 is five days, not 121',()=>{
  assert.equal(bitsSet(121),5);
  assert.equal(bitsSet(0),0);
  assert.equal(bitsSet(255),8);
});

test('sums keep every count, and two tiles add before anything is divided',()=>{
  const mask=Uint8Array.from([1,1,1,0]);
  // Cell 0 passes; cell 1 has the fill; cell 2 has a value its QC fails; cell 3 is outside.
  const a=sumWindow(mask,[15000,0,15500,99],[0,0,2,0],[3,0,7,0],0,q=>modisPasses(q,'produced'));
  assert.deepEqual(a,{cells:3,withValue:2,passing:1,sum:15000,min:15000,max:15000,clearSum:2,clearCells:1});
  const b=sumWindow(Uint8Array.from([1]),[16000],[0],[255],0,()=>true);
  const both=addSums(a,b);
  assert.deepEqual([both.cells,both.passing,both.sum,both.min,both.max,both.clearSum],[4,2,31000,15000,16000,10]);
  assert.deepEqual(addSums(emptySums(),emptySums()).min,null);
});

test('the satellite comes from the item, or from the product name where the item leaves it out',async()=>{
  const {platformOf}=await import('../build/satellite-grid-sample.js');
  assert.equal(platformOf({id:'MOD11A2.A2024345.h14v11.061.2024354',platform:null}),'terra');
  assert.equal(platformOf({id:'MYD11A2.A2024345.h14v11.061.2024354',platform:null}),'aqua');
  assert.equal(platformOf({id:'MYD11A2.x',platform:'aqua'}),'aqua');
  assert.equal(platformOf({id:'other',platform:null}),'');
});

test("a temperature is reported in °C by default, or °F or K; the file's kelvin and the conversion stated; the receipt conforms",async()=>{
  const {gridFacts,reportUnit}=await import('../build/satellite-grid-sample.js');
  const {gridReaderFor}=await import('../build/satellite-grid-sample.js');
  const {productFor}=await import('../build/satellite-products.js');
  const {validateGraph}=await import('../scripts/validate-ontology.mjs');
  const {Parser,Store}=await import('n3');
  const product=productFor('heat','pc-modis-lst-8day'),reader=gridReaderFor(product);
  assert.equal(reportUnit(reader,undefined),'°C');assert.equal(reportUnit(reader,'K'),'K');
  const counts={files:1,places:2,periods:1,rows:2,passing:1,belowQuality:0,noRetrieval:1,noCell:0};
  const celsius=gridFacts('<urn:fieldwork:run:r:output:n>',counts,reader,'day','produced-2k',product,'area');
  assert.match(celsius,/fw:satelliteValueUnit "°C";\n  fw:unitAsStated "K";\n  fw:unitConversion "°C = K − 273.15";/);
  assert.equal((await validateGraph(new Store(new Parser().parse(celsius)))).conforms,true);
  const kelvin=gridFacts('<urn:fieldwork:run:r:output:n>',counts,reader,'day','produced-2k',product,'area','K');
  assert.doesNotMatch(kelvin,/unitConversion/);
  const fahrenheit=gridFacts('<urn:fieldwork:run:r:output:n>',counts,reader,'day','produced-2k',product,'area','°F');
  assert.match(fahrenheit,/fw:unitConversion "°F = K × 9\/5 − 459.67";/);
  assert.equal((await validateGraph(new Store(new Parser().parse(fahrenheit)))).conforms,true);
  assert.equal((await validateGraph(new Store(new Parser().parse(kelvin)))).conforms,true);
});

test('the table converts every temperature it shows: 301 K is 27.85 °C and 82.13 °F',async()=>{
  const {gridTable,gridReaderFor}=await import('../build/satellite-grid-sample.js');
  const {productFor}=await import('../build/satellite-products.js');
  const reader=gridReaderFor(productFor('heat','pc-modis-lst-8day'));
  const places=[{id:'a',name:'A',kind:'area',boundary:{type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}}];
  // Two passing cells of 15000 and 15100, as stored: a mean of 15050 x 0.02 = 301 K.
  const readings=[{placeId:'a',period:'2024-02-18',end:'2024-02-25',platform:'terra',
    sums:{cells:2,withValue:2,passing:2,sum:30100,min:15000,max:15100,clearSum:4,clearCells:2}}];
  const row=unit=>gridTable(places,readings,reader,'day','produced-2k','municipio',unit).table.rows[0];
  assert.equal(row('K').value,301);assert.equal(row('°C').value,27.85);assert.equal(row('°F').value,82.13);
  assert.equal(row(undefined).value,27.85);
  assert.deepEqual([row('°F').key.value_min,row('°F').key.value_max],['80.33','83.93']);
  assert.equal(gridTable(places,readings,reader,'day','produced-2k','municipio','°F').table.unit,'°F');
});

test('every file is read for its own unit and scale: one stating another unit stops the run, naming it',async()=>{
  const {readGridFiles,gridReaderFor}=await import('../build/satellite-grid-sample.js');
  const {productFor}=await import('../build/satellite-products.js');
  const reader=gridReaderFor(productFor('heat','pc-modis-lst-8day'));
  const fetcher=async()=>({ok:true,json:async()=>({token:'t','msft:expiry':'2099-01-01T00:00:00Z'})});
  const image=tags=>({getOrigin:()=>[0,0],getResolution:()=>[1,-1],getWidth:()=>2,getHeight:()=>2,
    readRasters:async()=>[[15000,15000,15000,15000]],getGDALMetadata:async()=>tags});
  const item=(id)=>({id,datetime:'2024-02-18T00:00:00Z',platform:'terra',files:['LST_Day_1km','QC_Day','Clear_sky_days'].map(key=>({key,href:`https://x/${id}_${key}.tif`}))});
  const places=[{id:'p',name:'P',kind:'point',lon:0,lat:0}];
  const tags={files:0,stated:0};
  await readGridFiles([item('MOD.ok')],reader,'day','produced-2k',places,async()=>image({units:'K',scale_factor:'0.02'}),fetcher,()=>{},tags);
  assert.deepEqual(tags,{files:1,stated:1});
  await assert.rejects(readGridFiles([item('MOD.celsius')],reader,'day','produced-2k',places,async()=>image({units:'C',scale_factor:'0.02'}),fetcher),
    /MOD\.celsius states its unit as "C", not K\. Nothing was converted/);
  await assert.rejects(readGridFiles([item('MOD.scale')],reader,'day','produced-2k',places,async()=>image({units:'K',scale_factor:'0.1'}),fetcher),
    /MOD\.scale states a scale factor of 0\.1, not 0\.02/);
});

/** READING FASTER WITHOUT READING DIFFERENTLY (experiment 182): several files in flight, a failed file tried again and
 *  then named, and each file read once per session. */
test('several files at once give the same table as one at a time; a file is read once per session',async()=>{
  const {readGridFiles,gridReaderFor,clearGridCache}=await import('../build/satellite-grid-sample.js');
  const {productFor}=await import('../build/satellite-products.js');
  const reader=gridReaderFor(productFor('heat','pc-modis-lst-8day'));
  const fetcher=async()=>({ok:true,json:async()=>({token:'t','msft:expiry':'2099-01-01T00:00:00Z'})});
  let opened=0;
  // Each file a 2 x 2 grid whose value depends on the period, answered after a delay that reverses the order.
  const open=async url=>{opened++;const i=Number(/p(\d+)_/.exec(url)[1]);await new Promise(r=>setTimeout(r,(10-i)*3));
    return {getOrigin:()=>[0,0],getResolution:()=>[1,-1],getWidth:()=>2,getHeight:()=>2,getGDALMetadata:async()=>({units:'K',scale_factor:'0.02'}),
      readRasters:async()=>[url.includes('LST')?[15000+i,15000+i,15000+i,15000+i]:url.includes('QC')?[0,0,0,0]:[255,255,255,255]]};};
  const items=Array.from({length:10},(_,i)=>({id:`MOD.p${i}`,datetime:`2024-01-${String(i+1).padStart(2,'0')}T00:00:00Z`,platform:'terra',
    files:['LST_Day_1km','QC_Day','Clear_sky_days'].map(key=>({key,href:`https://x/p${i}_${key}.tif`}))}));
  const places=[{id:'p',name:'P',kind:'point',lon:0,lat:0}];
  clearGridCache();
  const one=await readGridFiles(items,reader,'day','produced-2k',places,open,fetcher,()=>{},{files:0,stated:0},{concurrency:1});
  clearGridCache();
  const progress=[];
  const six=await readGridFiles(items,reader,'day','produced-2k',places,open,fetcher,(d,of)=>progress.push(`${d}/${of}`),{files:0,stated:0},{concurrency:6});
  assert.deepEqual(six,one,'the same rows in the same order');
  assert.deepEqual(progress.at(-1),'10/10');assert.equal(progress.length,10);
  const before=opened;
  const tags={files:0,stated:0};
  const again=await readGridFiles(items,reader,'day','produced-2k',places,open,fetcher,()=>{},tags,{concurrency:6});
  assert.equal(opened,before,'nothing opened the second time');
  assert.deepEqual(again,one);assert.deepEqual(tags,{files:10,stated:10},'the unit check is still counted');
  const other=[{id:'q',name:'Q',kind:'point',lon:1,lat:-1}];
  await readGridFiles(items,reader,'day','produced-2k',other,open,fetcher,()=>{},undefined,{concurrency:6});
  assert.ok(opened>before,'other places read the files again');
});

test('a failed file is tried again; one that keeps failing is named; a wrong unit is not retried',async()=>{
  const {readGridFiles,gridReaderFor,clearGridCache}=await import('../build/satellite-grid-sample.js');
  const {productFor}=await import('../build/satellite-products.js');
  const reader=gridReaderFor(productFor('heat','pc-modis-lst-8day'));
  const fetcher=async()=>({ok:true,json:async()=>({token:'t','msft:expiry':'2099-01-01T00:00:00Z'})});
  const image=units=>({getOrigin:()=>[0,0],getResolution:()=>[1,-1],getWidth:()=>2,getHeight:()=>2,getGDALMetadata:async()=>({units,scale_factor:'0.02'}),
    readRasters:async()=>[[15000,15000,15000,15000]]});
  const item=id=>({id,datetime:'2024-02-18T00:00:00Z',platform:'terra',files:['LST_Day_1km','QC_Day','Clear_sky_days'].map(key=>({key,href:`https://x/${id}_${key}.tif`}))});
  const places=[{id:'p',name:'P',kind:'point',lon:0,lat:0}];
  clearGridCache();
  let tries=0;
  const flaky=async()=>{if(++tries<=3)throw new TypeError('Failed to fetch');return image('K');};
  const read=await readGridFiles([item('MOD.flaky')],reader,'day','produced-2k',places,flaky,fetcher,()=>{},undefined,{retryMs:1});
  assert.equal(read.length,1);
  const down=async()=>{throw new TypeError('Failed to fetch');};
  await assert.rejects(readGridFiles([item('MOD.ok2'),item('MOD.down')],reader,'day','produced-2k',places,
    async url=>url.includes('down')?down():image('K'),fetcher,()=>{},undefined,{retryMs:1}),
    /MOD\.down could not be read after 3 attempts: Failed to fetch\. The other files were read; run again to retry\./);
  let opens=0;
  await assert.rejects(readGridFiles([item('MOD.celsius2')],reader,'day','produced-2k',places,async()=>{opens++;return image('C');},fetcher,()=>{},undefined,{retryMs:1}),
    /states its unit as "C"/);
  assert.equal(opens,3,'opened once: three layers, no retry');
});

/** KEPT ON THIS DEVICE (2026-11-09): a reading saved by an earlier session is used without opening the file, counted,
 *  and read again when asked. Keyed by the file, layer, rule and places, so another rule reads the file. */
test('a reading saved on this device is used, counted, and read again when asked',async()=>{
  const {readGridFiles,gridReaderFor,clearGridCache}=await import('../build/satellite-grid-sample.js');
  const {productFor}=await import('../build/satellite-products.js');
  const reader=gridReaderFor(productFor('heat','pc-modis-lst-8day'));
  const fetcher=async()=>({ok:true,json:async()=>({token:'t','msft:expiry':'2099-01-01T00:00:00Z'})});
  let opened=0;
  const open=async()=>{opened++;return {getOrigin:()=>[0,0],getResolution:()=>[1,-1],getWidth:()=>2,getHeight:()=>2,
    getGDALMetadata:async()=>({units:'K',scale_factor:'0.02'}),readRasters:async()=>[[15000,15000,15000,15000]]};};
  const items=[{id:'MOD.a',datetime:'2024-01-01T00:00:00Z',platform:'terra',
    files:['LST_Day_1km','QC_Day','Clear_sky_days'].map(key=>({key,href:`https://x/a_${key}.tif`}))}];
  const places=[{id:'p',name:'P',kind:'point',lon:0.5,lat:-0.5}];
  const kept=new Map(),saved={get:async k=>kept.get(k),put:async(k,v)=>{kept.set(k,structuredClone(v));}};
  clearGridCache();
  const first={files:0,stated:0};
  const read=await readGridFiles(items,reader,'day','produced-2k',places,open,fetcher,()=>{},first,{saved});
  assert.equal(opened,3);assert.equal(first.saved,0);assert.equal(kept.size,1);
  clearGridCache();// a new session: nothing in the page, the device's readings still there
  const second={files:0,stated:0};
  assert.deepEqual(await readGridFiles(items,reader,'day','produced-2k',places,open,fetcher,()=>{},second,{saved}),read);
  assert.equal(opened,3,'nothing opened');assert.equal(second.saved,1);
  await readGridFiles(items,reader,'day','good',places,open,fetcher,()=>{},{files:0,stated:0},{saved});
  assert.equal(opened,6,'another quality rule reads the file');
  const third={files:0,stated:0};
  await readGridFiles(items,reader,'day','produced-2k',places,open,fetcher,()=>{},third,{saved,reread:true});
  assert.equal(opened,9,'read again when asked');assert.equal(third.saved,0);
});
