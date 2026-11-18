import {test,expect} from './fixtures.mjs';
import {encodeRaster} from '../build/raster.js';

/** RASTER PANELS SHOWN BY THEIR UNIT (2026-11-17). The practitioner: "I can't seem to find how Map output enables rendering
 *  of pop density as YlOrRd hues". It did so for every raster. Now a raster whose stated unit is a count per cell is shown
 *  per km² in yellow to red; one in any other unit, such as NDVI, as its value, in viridis, on its own scale and key. */
test.use({serviceWorkers:'block'});
const AREA={type:'Polygon',coordinates:[[[25.900,-24.690],[25.915,-24.690],[25.915,-24.678],[25.900,-24.678],[25.900,-24.690]]]};
const metadata={width:60,height:60,origin:[25.88,-24.67],resolution:[.001,-.001]};

test('a count per pixel and an NDVI raster: two scales, each in its own colours and words; Configure can show both as values',async({page})=>{
  const w={schema:'fieldwork/workflow/1',name:'Units',nodes:[
    {id:'area',type:'study_area',x:20,y:40,params:{label:'Area',source:'drawn',selectionMode:'polygon',geometry:AREA}},
    {id:'people',type:'raster_input',x:310,y:40,params:{label:'People'}},
    {id:'ndvi',type:'raster_input',x:310,y:240,params:{label:'NDVI'}},
    {id:'map',type:'map_output',x:620,y:40,params:{label:'Map',inputMode:'raster',rasterInputCount:2}}],
    edges:[{id:'a',from:'area',to:'people',port:'area'},{id:'b',from:'area',to:'ndvi',port:'area'},
      {id:'c',from:'people',to:'map',port:'raster'},{id:'d',from:'ndvi',to:'map',port:'raster_2'}]};
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('#workflow-file').setInputFiles({name:'units.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  const prepare=async(id,name,values,units)=>{
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();await page.locator('#prepare-raster').click();
    await page.locator('#raster-file').setInputFiles({name,mimeType:'image/tiff',buffer:Buffer.from(encodeRaster({metadata,values}))});
    await page.locator('#raster-source-units').fill(units);
    await expect(page.locator('#raster-dialog #config-apply')).toBeEnabled();await page.locator('#raster-dialog #config-apply').click();
    await expect(page.locator('#raster-dialog')).toHaveCount(0);
  };
  await prepare('people','people.tif',Array.from({length:3600},(_,i)=>i%7),'people per pixel');
  await prepare('ndvi','ndvi.tif',Array.from({length:3600},(_,i)=>-0.2+(i%50)/50),'NDVI');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  // The static figure (a Map's default): one key per scale.
  await expect(page.locator('#result-metrics')).toContainText('people per km² for People; NDVI for NDVI',{timeout:20000});
  const keys=page.locator('svg [data-scale-key]');
  await expect(keys).toHaveCount(2);
  await expect(keys.nth(0)).toContainText('Cell shade: people per km² (People)');
  await expect(keys.nth(1)).toContainText('Cell shade: NDVI (NDVI)');
  await expect(keys.nth(1)).toContainText('of the cells with a value; clear: no value');
  // Yellow to red's first colour on the people key; viridis's on the NDVI key.
  expect(await keys.nth(0).locator('rect').first().getAttribute('fill')).toBe('#ffffb2');
  expect(await keys.nth(1).locator('rect').first().getAttribute('fill')).toBe('#440154');
  // NDVI below zero is a value, not nothing: its lowest edge is below zero.
  expect(Number((await keys.nth(1).locator('text').first().textContent()).replace(/[^\d.-]/g,''))).toBeLessThan(0);

  // Configure: every cell as its value. The people raster is then shown in its own unit, per pixel, not per km².
  await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#inspector #configure-step, #inspector [data-configure]').first().click().catch(async()=>{await page.locator('#inspector button',{hasText:'Configure'}).first().click();});
  await page.locator('#raster-show').selectOption('cell-value');
  await page.locator('#map-config #config-apply').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('people per pixel for People; NDVI for NDVI',{timeout:20000});
  await expect(page.locator('svg [data-scale-key]').nth(0)).toContainText('Cell shade: people per pixel (People)');
});
