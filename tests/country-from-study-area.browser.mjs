import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner, 2026-10-23: *"I should not have to type 3 letter ISO code because the study
// area should already pass on that information. And we should not make the user type 3 letter
// ISO codes, this should be a drop down."* Then: *"Study Area should have country and connecting
// study area to raster should autopopulate country."*
const workflowWith=country=>({
  schema:'fieldwork/workflow/1',name:'Country',
  nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'Gaborone',source:'drawn',
      selectionMode:'polygon',
      geometry:{type:'Polygon',coordinates:[[[25.8,-24.7],[26.0,-24.7],[26.0,-24.5],[25.8,-24.5],[25.8,-24.7]]]},
      ...(country?{country}:{})}},
    {id:'hf',type:'find_health_facilities',x:300,y:20,
      params:{label:'Find health facilities',source:'hdx-hot-export',country:'',kinds:['hospital']}},
    {id:'raster',type:'raster_input',x:300,y:200,params:{label:'Raster input'}}],
  edges:[{id:'e1',from:'area',to:'hf',port:'area'},{id:'e2',from:'area',to:'raster',port:'area'}],
});
const open=async(page,country)=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'country.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflowWith(country)))});
  await page.locator('[data-view="workflow"]').click();
};

test('a study area that states its country hands it to both widgets',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,'BWA');

  await page.locator('.react-flow__node[data-id="hf"]').click({timeout:45000});
  await page.locator('#configure-step').click();
  const facilities=page.locator('#facilities-config #hf-country');
  expect(await facilities.evaluate(el=>el.tagName)).toBe('SELECT','a list, not a three-letter box');
  await expect(facilities).toHaveValue('BWA');
  await expect(facilities.locator('option[value="BWA"]')).toContainText('Botswana');

  await page.locator('#facilities-config #config-cancel').click();
  // And the raster widget reads the same thing, which is what "autopopulate" asked for.
  await page.locator('.react-flow__node[data-id="raster"]').click();
  // Not asked again in the Inspector (the practitioner, 2026-11-10): Configure… offers WorldPop for the area's country.
  await expect(page.locator('#population-country')).toHaveCount(0);
  await page.locator('#prepare-raster').click();
  await expect(page.locator('#raster-dialog #raster-population')).toContainText('Population (WorldPop) for Botswana');
  await expect(page.locator('#raster-dialog #population-download')).toContainText('BWA');
  expect(errors).toEqual([]);
});

test('a study area that states no country leaves both unset, rather than guessing',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,null);
  // A drawn polygon states nothing, and a country inferred from coordinates is wrong exactly on
  // a border, and wrong invisibly. So it asks.
  await page.locator('.react-flow__node[data-id="raster"]').click({timeout:45000});
  await page.locator('#prepare-raster').click();
  // Asked here, never a dead end (the practitioner, 2026-11-10), and kept on the study area.
  await expect(page.locator('#raster-dialog #population-download')).toHaveCount(0);
  await page.locator('#raster-dialog #population-country').selectOption('BWA');
  await expect(page.locator('#raster-dialog #raster-population')).toContainText('Population (WorldPop) for Botswana');
  await expect(page.locator('#raster-dialog #population-download')).toContainText('BWA');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='area').params.country)).toBe('BWA');
  expect(errors).toEqual([]);
});

test('an area acquired as administrative units hands its country on, and the raster dialog asks nothing',async({page})=>{
  // The practitioner, 2026-11-10: "The study area actually used adm1 from BWA so I definitely picked a country already".
  const errors=collectPageErrors(page);
  const w=workflowWith(null);
  w.nodes[0].params.boundary={boundaryID:'BWA-ADM1-15938201',unitID:'BW-SE',unitName:'South-East',source:'geoBoundaries',licence:'CC BY 4.0'};
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'acquired.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="raster"]').click({timeout:45000});
  await page.locator('#prepare-raster').click();
  await expect(page.locator('#raster-dialog #raster-population')).toContainText('Population (WorldPop) for Botswana');
  await expect(page.locator('#raster-dialog #population-country')).toHaveCount(0);
  await expect(page.locator('#raster-dialog #population-download')).toContainText('BWA');
  expect(errors).toEqual([]);
});

test('the raster widgets carry a node label, as every other widget does',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,'BWA');
  await page.locator('.react-flow__node[data-id="raster"]').click({timeout:45000});
  await expect(page.locator('#raster-label')).toHaveValue('Raster input');
  expect(errors).toEqual([]);
});
