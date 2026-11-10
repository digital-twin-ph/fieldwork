import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// PLACING A MAP IMAGE BY MATCHED POINTS (experiment 201): typed, as a manual says them, so the fit and its errors are
// exactly the ones the manual states. Tiles are refused: the map pane must work without them.
test.use({serviceWorkers:'block'});

const workflow={schema:'fieldwork/workflow/1',name:'A plan placed by points',
  nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'Hagelloch',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[9.0603,48.5406],[9.0647,48.5406],[9.0647,48.5433],[9.0603,48.5433],[9.0603,48.5406]]]}}},
    {id:'plan',type:'map_image_input',x:20,y:300,params:{label:'A plan',
      image:{width:0,height:0,bytes:0,sha256:''},bounds:[0,0,0,0]}},
    {id:'map',type:'map_output',x:400,y:20,params:{label:'Map',presentation:'plot'}}],
  edges:[{id:'e1',from:'area',to:'map',port:'area'},{id:'e2',from:'plan',to:'map',port:'ground'}]};

// Turned 20 degrees: pixel (x, y) to longitude and latitude.
const t=20*Math.PI/180,s=1e-5;
const at=(x,y)=>[9.0605+s*(Math.cos(t)*x+Math.sin(t)*y),48.5431+s*0.66*(Math.sin(t)*x-Math.cos(t)*y)];
const POINTS=[['Church',40,30],['Mill',360,40],['Bridge',350,270],['Well',60,260],['Crossroads',200,150]];

test('a plan is placed by typed points: each error shown, a doubtful pair marked, and drawn turned',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org/,route=>route.abort('failed'));
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'plan.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="plan"]').click();
  // The standard Inspector: no file pickers on the panel.
  await expect(page.locator('#inspector-content #map-image-file')).toHaveCount(0);
  await page.locator('#configure-step').click();
  const dialog=page.locator('#map-image-config');
  await expect(dialog).toBeVisible();
  // The image is chosen here, as a person would: a 400 by 300 PNG drawn in the page.
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;
    const g=c.getContext('2d');g.fillStyle='#ddd';g.fillRect(0,0,400,300);g.fillStyle='#333';g.fillRect(180,130,40,40);
    return c.toDataURL('image/png').split(',')[1];});
  await dialog.locator('#map-image-file').setInputFiles({name:'plan.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(dialog).toContainText('plan.png: 400 × 300 pixels');
  await dialog.locator('#map-image-placement').selectOption('points');
  await expect(dialog).toContainText('Good pairs');
  await expect(dialog.locator('#config-apply')).toBeDisabled();
  for(const [index,[name,x,y]] of POINTS.entries()){
    await dialog.locator('#geo-add-point').click();
    const row=dialog.locator(`tr[data-geo-row="${index}"]`);
    // The last point is off by about 60 m on purpose: the pair the fit should doubt.
    const [lon,lat]=at(x,y),off=index===POINTS.length-1?0.0008:0;
    for(const [field,value] of [['id',name],['x',x],['y',y],['lon',lon+off],['lat',lat]]){
      await row.locator(`[data-geo-field="${field}"]`).fill(String(value));
      await row.locator(`[data-geo-field="${field}"]`).dispatchEvent('change');
    }
  }
  await expect(dialog.locator('#geo-fit')).toContainText('Placed from 5 points');
  await expect(dialog.locator('tr[data-geo-row="4"]')).toContainText('check this pair');
  await expect(dialog.locator('#config-apply')).toBeEnabled();
  await dialog.locator('#config-apply').click();
  await expect(dialog).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}'),p=w.nodes.find(n=>n.id==='plan').params;
    return `${p.placement}/${p.controlPoints?.length}/${p.world&&p.world.xSkew!==0}`;})).toBe('points/5/true');
  await expect(page.locator('#inspector-content')).toContainText('placed by 5 matched points');
  // Drawn turned, on the static figure.
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60_000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map image[data-map-image]')).toHaveAttribute('transform',/matrix\(/,{timeout:20_000});
  expect(errors).toEqual([]);
});
