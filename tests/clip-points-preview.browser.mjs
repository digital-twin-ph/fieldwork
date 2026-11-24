import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';

// The practitioner, 2026-11-23, of a Preview section holding only a generic walkthrough: *"This one still does not
// have a preview."* The counts ARE this step's result, and the checkbox above them moves records between kept and
// set aside, so the preview is the one place that setting can be judged before a run.
const ring=[[0,0],[4,0],[4,4],[0,4],[0,0]];
const point=(id,x,y)=>({type:'Feature',id,properties:{name:id},geometry:{type:'Point',coordinates:[x,y]}});
const workflow=()=>({schema:'fieldwork/workflow/1',id:'c',label:'Clip',exampleId:'blank',nodes:[
  {id:'area',type:'study_area',x:20,y:20,params:{label:'Square',source:'drawn',selectionMode:'polygon',
    geometry:{type:'Polygon',coordinates:[ring]}}},
  {id:'pts',type:'point_input',x:20,y:160,params:{label:'Records',fields:[],
    // two inside, one exactly on the outline, one outside
    data:{type:'FeatureCollection',features:[point('a',1,1),point('b',2,2),point('edge',4,2),point('far',9,9)]}}},
  {id:'clip',type:'clip_points_to_area',x:320,y:80,params:{label:'Points inside the area',keepBoundary:true,showExcluded:true}},
],edges:[{id:'e1',from:'area',to:'clip',port:'area'},{id:'e2',from:'pts',to:'clip',port:'points'}]});

test('the clip says what it will keep, and the outline setting changes it',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'clip.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow()))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="clip"]').click();
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('#clip-points-dialog');
  await expect(dialog).toBeVisible();

  // Counted before anything runs, from the area the study area holds and the points the source holds.
  await expect(dialog).toContainText('3 of 4 kept');
  await expect(dialog).toContainText('2 inside');
  await expect(dialog).toContainText('1 exactly on the outline (kept)');
  await expect(dialog).toContainText('1 outside');

  // THE SETTING MOVES A RECORD, and the preview says so immediately.
  await dialog.locator('#clip-points-boundary').uncheck();
  await expect(dialog).toContainText('2 of 4 kept');
  await expect(dialog).toContainText('1 exactly on the outline (set aside)');
  await dialog.locator('#clip-points-boundary').check();
  await expect(dialog).toContainText('3 of 4 kept');
  assert.ok(true);
});
