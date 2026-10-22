import {test,expect} from '@playwright/test';
import {blankWorkflow,newStudyArea} from '../build/study-area.js';

// "At the province level we are not even looking at walking mode. It will be driving mode." Then:
// "Change the default to driving at ADM1 level." -- 2026-10-21.
const workflowWith=boundaryID=>{
  const w=blankWorkflow();
  const area={...newStudyArea(),id:'area',x:40,y:60};
  area.params={...area.params,label:'Ituri Province',selectionMode:'polygon',
    geometry:{type:'Polygon',coordinates:[[[29,1],[30,1],[30,2],[29,2],[29,1]]]},
    ...(boundaryID?{boundary:{boundaryID,unitID:'COD-ADM1-1',unitName:'Ituri',source:'OCHA',
      licence:'CC BY 4.0',licenceSource:'https://example.invalid',yearRepresented:'2020',
      canonical:'province',retrievedFrom:'https://example.invalid',retrievedAt:'2026-10-21',
      vertices:5,publishedHash:'0'.repeat(64)}}:{})};
  w.nodes=[area,{id:'net',type:'network_input',x:260,y:60,
    params:{label:'Street network',inputMethod:'osm',data:{nodes:[],edges:[],source:'none'}}}];
  w.edges=[{id:'e1',from:'area',to:'net',port:'area'}];
  return w;
};
const open=async(page,boundaryID)=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflowWith(boundaryID)))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#canvas .node').filter({hasText:'Street network'}).click();
};

test('a province defaults to driving, and says why',async({page})=>{
  await open(page,'COD-ADM1-63176286');
  await expect(page.locator('#network-travel-mode')).toHaveValue('driving');
  await expect(page.locator('.inspector-body')).toContainText('Default for a published ADM1 unit');
});

test('a territory, and a boundary nobody published, stay on walking',async({page})=>{
  await open(page,'COD-ADM2-63176286');
  await expect(page.locator('#network-travel-mode')).toHaveValue('walking');
  await open(page,undefined);
  await expect(page.locator('#network-travel-mode')).toHaveValue('walking');
  await expect(page.locator('.inspector-body')).not.toContainText('default here');
});

test('and a choice, once made, is not overridden',async({page})=>{
  await open(page,'COD-ADM1-63176286');
  await page.locator('#network-travel-mode').selectOption('walking');
  await expect(page.locator('#network-travel-mode')).toHaveValue('walking');
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.node',{hasText:'Street network'}).click();
  await expect(page.locator('#network-travel-mode')).toHaveValue('walking');
  await expect(page.locator('.inspector-body')).not.toContainText('default here');
});
