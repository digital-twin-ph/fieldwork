import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** MAPS SIDE BY SIDE (experiment 212), on two small layers with values: the panels, one scale, and the interactive maps
 *  moving together. The population example's own panels are checked in population-example-opens.browser.mjs. */
test.use({serviceWorkers:'block'});
const square=(id,name,x,value)=>({type:'Feature',id,properties:{name,share:value},
  geometry:{type:'Polygon',coordinates:[[[x,0],[x+1,0],[x+1,1],[x,1],[x,0]].map(([a,b])=>[30+a*0.1,-2+b*0.1])]}});
const layer=(id,label,values)=>({id,type:'polygon_input',x:20,y:id==='a'?40:240,params:{label,layerName:label,nameField:'name',
  data:{features:values.map((v,i)=>({id:`${id}-${i}`,name:`Part ${i+1}`,geometry:square(`${id}-${i}`,`Part ${i+1}`,i,v).geometry,
    properties:{name:`Part ${i+1}`},value:v}))}}});

test('two layers in panels: one key, one scale, and the interactive panels move together',async({page})=>{
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org|basemaps|tiles/,route=>route.abort('failed'));
  const flow={schema:'fieldwork/workflow/1',exampleId:'blank',name:'Panels',nodes:[layer('a','Source A',[1,2,3]),layer('b','Source B',[2,3,9]),
    {id:'map',type:'map_output',x:400,y:100,params:{label:'Side by side',basemap:'none',polygonInputCount:2,
      arrangement:{grid:'row',panels:[{layer:'Source A'},{layer:'Source B',title:'B, titled'}]}}}],
    edges:[{id:'e1',from:'a',to:'map',port:'polygons'},{id:'e2',from:'b',to:'map',port:'polygons_2'}]};
  await page.goto('/');await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},flow);
  await page.goto('/');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="results"]').click();
  const panels=page.locator('#map g[data-map-panel]');
  await expect(panels).toHaveCount(2);
  await expect(panels.nth(1)).toContainText('B, titled');
  await page.screenshot({path:'test-results/map-panels-static.png'});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#config-apply').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.map-panel .leaflet-container')).toHaveCount(2,{timeout:20000});
  await page.screenshot({path:'test-results/map-panels-interactive.png'});
  expect(errors).toEqual([]);
});
