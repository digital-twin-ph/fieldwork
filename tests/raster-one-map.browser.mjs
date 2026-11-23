import {test,expect} from './fixtures.mjs';
import {encodeRaster} from '../build/raster.js';
import {collectPageErrors} from './page-errors.mjs';

/** RASTERS ON ONE MAP (Map's manual, History: rasters on one map, 2026-11-22). The practitioner, of four countries' WorldPop
 *  rasters drawn as four panels: "What if I wanted to have the rasters all in one map not 4?" Arrange's "One map" now
 *  means it for rasters too; panels when chosen. And the Configure… preview draws the cells (the practitioner: "On the Map
 *  configure dialog, the other layers and raster do not show up"). */
test.use({serviceWorkers:'block'});
const AREA={type:'Polygon',coordinates:[[[25.880,-24.730],[25.970,-24.730],[25.970,-24.670],[25.880,-24.670],[25.880,-24.730]]]};
// Two windows of 60 x 60 cells of 0.001°, the second 30 cells east of the first: half of each overlaps the other.
const raster=(west,values)=>Buffer.from(encodeRaster({metadata:{width:60,height:60,origin:[west,-24.67],resolution:[.001,-.001]},values}));

test('two count rasters on one map, the overlap said; the preview draws them; panels when chosen',async({page})=>{
  const errors=collectPageErrors(page);
  const w={schema:'fieldwork/workflow/1',name:'One map',nodes:[
    {id:'area',type:'study_area',x:20,y:40,params:{label:'Area',source:'drawn',selectionMode:'polygon',geometry:AREA}},
    {id:'west',type:'raster_input',x:310,y:40,params:{label:'West'}},
    {id:'east',type:'raster_input',x:310,y:240,params:{label:'East'}},
    {id:'pin',type:'point_input',x:20,y:300,params:{label:'Clinic pin',data:{type:'FeatureCollection',features:[
      {type:'Feature',id:'c1',properties:{name:'Clinic'},geometry:{type:'Point',coordinates:[25.92,-24.70]}}]}}},
    {id:'map',type:'map_output',x:620,y:40,params:{label:'Map',inputMode:'raster',rasterInputCount:2}}],
    edges:[{id:'a',from:'area',to:'west',port:'area'},{id:'b',from:'area',to:'east',port:'area'},
      {id:'c',from:'west',to:'map',port:'raster'},{id:'d',from:'east',to:'map',port:'raster_2'},
      {id:'e',from:'pin',to:'map',port:'points'},{id:'f',from:'area',to:'map',port:'area'}]};
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('#workflow-file').setInputFiles({name:'one.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  const prepare=async(id,west,values)=>{
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();await page.locator('#prepare-raster').click();
    await page.locator('#raster-file').setInputFiles({name:`${id}.tif`,mimeType:'image/tiff',buffer:raster(west,values)});
    await page.locator('#raster-source-units').fill('people per pixel');
    await expect(page.locator('#raster-dialog #config-apply')).toBeEnabled();await page.locator('#raster-dialog #config-apply').click();
    await expect(page.locator('#raster-dialog')).toHaveCount(0);
  };
  await prepare('west',25.88,Array.from({length:3600},(_,i)=>1+i%5));
  await prepare('east',25.91,Array.from({length:3600},(_,i)=>2+i%3));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();

  // THE STATIC FIGURE: one frame, both rasters, the later over the earlier, one key, the overlap counted.
  await expect(page.locator('#result-metrics')).toContainText('2 rasters on one map',{timeout:20000});
  await expect(page.locator('svg [data-map-raster]')).toHaveCount(2);
  await expect(page.locator('svg [data-map-panel]')).toHaveCount(0);
  expect(await page.locator('svg [data-map-raster]').evaluateAll(g=>g.map(x=>x.dataset.mapRaster))).toEqual(['West','East']);
  await expect(page.locator('svg [data-scale-key]')).toHaveCount(1);
  await expect(page.locator('svg [data-scale-key]')).toContainText('Cell shade: people per km² (West, East)');
  await expect(page.locator('svg [data-raster-overlap]')).toContainText('the later is drawn over the earlier: East over West');
  // THE PIN, over the cells, named (the practitioner: "I also have one push pin and it does not show up on the map").
  await expect(page.locator('svg [data-raster-points] circle')).toHaveCount(1);
  await expect(page.locator('svg [data-raster-points]')).toContainText('Clinic');
  await expect(page.locator('svg [data-map-area]')).toHaveCount(1);

  // INTERACTIVE: one map, each raster a layer that can be switched off.
  await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('#map-config');
  // THE PREVIEW DRAWS THE CELLS, both rasters, as Results does.
  await expect(dialog.locator('#map-config-preview .raster-panel-image')).toHaveCount(2,{timeout:15000});
  await expect(dialog.locator('#map-config-preview .leaflet-control-layers')).toContainText('West');
  await expect(dialog.locator('#map-config-preview .leaflet-control-layers')).toContainText('East');
  await dialog.locator('#polygon-presentation').selectOption('interactive');
  await dialog.locator('#config-apply').click();await expect(dialog).toHaveCount(0);
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('[data-raster-one-map] .raster-panel-image')).toHaveCount(2,{timeout:15000});
  await expect(page.locator('.map-panel')).toHaveCount(0);
  const east=page.locator('[data-raster-one-map] .leaflet-control-layers label',{hasText:'East'}).locator('input');
  await east.uncheck();
  await expect(page.locator('[data-raster-one-map] .raster-panel-image')).toHaveCount(1);
  await expect(page.locator('p.muted',{hasText:'East over West'})).toBeVisible();
  await expect(page.locator('[data-raster-one-map] .raster-point')).toHaveCount(1);

  // MANAGE LAYERS GOVERNS IT: the two rasters grouped as one entry, the study area hidden.
  await page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')),m=w.nodes.find(n=>n.id==='map');
    m.params.layerGroups=[{id:'g1',label:'Rasters',index:0}];
    m.params.layers={raster:{group:'g1'},raster_2:{group:'g1'},area:{drawn:false}};
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));});
  await page.reload();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  const control=page.locator('[data-raster-one-map] .leaflet-control-layers-overlays label');
  await expect(control).toHaveCount(2,{timeout:15000});
  await expect(control.nth(0)).toContainText('Rasters');await expect(control.nth(1)).toContainText('Clinic pin');
  await expect(page.locator('[data-raster-one-map] .raster-map-area')).toHaveCount(0);
  await control.nth(0).locator('input').uncheck();
  await expect(page.locator('[data-raster-one-map] .raster-panel-image')).toHaveCount(0);

  // PANELS WHEN CHOSEN.
  await page.locator('[data-view="workflow"]').click();await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#inspector-content #configure-step').click();
  await page.locator('#map-config #map-arrange').selectOption('row');
  await page.locator('#map-config #config-apply').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.map-panel')).toHaveCount(2,{timeout:15000});
  await expect(page.locator('#result-metrics')).toContainText('2 rasters side by side');
  expect(errors).toEqual([]);
});
