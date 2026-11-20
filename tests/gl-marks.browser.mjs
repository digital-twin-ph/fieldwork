import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A LARGE POINT LAYER ON THE INTERACTIVE MAP (src/gl-marks.ts): over MERGED_MARKS_FROM marks it is drawn on the graphics
 *  card, not as one marker each. A click still opens a mark's popup, and its row in the layer control still hides it.
 *  Online-only renderer, so the service worker is blocked as for every stubbed-network test. */
test.use({serviceWorkers:'block'});

const N=2_500;
// Every record at the centre of the area, so a click at the centre of the map is on a mark.
const records=Array.from({length:N},(_,i)=>({type:'Feature',id:`r${i}`,properties:{name:`Record ${i}`},
  geometry:{type:'Point',coordinates:[29.2,-1.65]}}));
const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Many records',nodes:[
  {id:'area',type:'study_area',x:0,y:200,params:{label:'Around them',source:'drawn',selectionMode:'bbox',
    geometry:{type:'Polygon',coordinates:[[[29.1,-1.75],[29.3,-1.75],[29.3,-1.55],[29.1,-1.55],[29.1,-1.75]]]}}},
  {id:'records',type:'point_input',x:0,y:0,params:{label:'Records',data:{type:'FeatureCollection',features:records}}},
  {id:'map',type:'map_output',x:400,y:0,params:{label:'Records map',presentation:'interactive'}},
  {id:'static',type:'map_output',x:400,y:200,params:{label:'Records figure',presentation:'plot'}},
],edges:[
  {id:'e1',from:'area',to:'map',port:'area'},{id:'e2',from:'records',to:'map',port:'points'},
  {id:'e3',from:'area',to:'static',port:'area'},{id:'e4',from:'records',to:'static',port:'points'},
]};

test(`a layer of ${N.toLocaleString('en')} records is drawn on the graphics card, opens a popup and hides from the layer list`,async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'many.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tab-map').click();
  const map=page.locator('.catchment-leaflet');
  await expect(map).toHaveAttribute('data-marks-drawn','gpu',{timeout:60000});
  // No marker per record.
  await expect(page.locator('.catchment-point-mark')).toHaveCount(0);
  const box=await map.boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect(page.locator('.leaflet-popup-content')).toContainText(/Record \d+/);
  await page.keyboard.press('Escape');
  // The layer's row in the layer list turns it off: a click at the centre then opens nothing.
  const row=page.locator('.leaflet-control-layers-overlays label').filter({hasText:'Records'}).locator('input');
  await row.uncheck();
  await page.locator('.leaflet-popup-close-button').click().catch(()=>{});
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect(page.locator('.leaflet-popup-content')).toHaveCount(0);
  // THE STATIC FIGURE: one shape per style, not one element per record, labelled with how many.
  await page.locator('#result-tab-static').click();
  const layer=page.locator('#map-panel svg .location-layer');
  await expect(layer).toHaveAttribute('aria-label',`Records: ${N.toLocaleString('en')} marks`);
  await expect(page.locator('#map-panel svg .location')).toHaveCount(0);
  expect(errors).toEqual([]);
});
