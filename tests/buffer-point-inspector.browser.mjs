import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// THE STEP KNOWS WHICH POINTS IT MAY BE GIVEN. The practitioner, 2026-11-23, with a Mines layer wired to Area
// around a point and the dialog still asking for a name against a placeholder of MANILA: *"the widget does not
// identify the incoming point layer when the mines layer is connected already to its input port... This should
// not be guess work as the input port is connected."*
const point=(id,name,x,y)=>({type:'Feature',id,properties:{name},geometry:{type:'Point',coordinates:[x,y]}});
const workflowWith=(features)=>({schema:'fieldwork/workflow/1',id:'bp',label:'Around a mine',
  nodes:[
    {id:'mines',type:'point_input',x:40,y:40,params:{label:'Mines',fields:[],
      data:{type:'FeatureCollection',features}}},
    {id:'around',type:'buffer_point',x:40,y:240,params:{label:'Area around a point',pointId:'',distanceM:5000}},
  ],
  edges:[{id:'e1',from:'mines',to:'around',port:'points'}]});

const open=async(page,features)=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  // Written before the application loads, so it reads this workflow at startup rather than being edited under.
  await page.evaluate(w=>localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w)),workflowWith(features));
  await page.goto('/');
  await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Area around a point'}).first().click();
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('#buffer-point-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
  .nodes.find(x=>x.type==='buffer_point').params);

test('the points on the connected port are offered by name, and the only one is the answer',async({page})=>{
  const errors=collectPageErrors(page);
  // ONE MINE, which is the practitioner's case: there is nothing to choose, so there is nothing to type.
  let dialog=await open(page,[point('m1','Kibali Mining Site',29.6,3.1)]);
  await expect(dialog.locator('input#bp-point')).toHaveCount(0);
  await expect(dialog.locator('select#bp-point')).toHaveValue('Kibali Mining Site');
  // The label names the layer, so it is clear which set is being chosen within.
  await expect(dialog.locator('label[for="bp-point"]')).toContainText('Point in Mines');
  // And the refusal is gone before anything is typed.
  await expect(dialog).not.toContainText('Name the point the area is drawn around');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0);
  expect((await saved(page)).pointId).toBe('Kibali Mining Site');

  // SEVERAL, each offered, and the one chosen is what the step records and says.
  dialog=await open(page,[point('m1','Kibali Mining Site',29.6,3.1),
    point('m2','Durba',29.5,3.2),point('m3','Watsa',29.5,3.0)]);
  const offered=await dialog.locator('select#bp-point option').allInnerTexts();
  // Nothing chosen yet, so the first entry says so and carries no value: a select showing a name the step does
  // not hold would read as an answer while the dialog refuses.
  expect(offered.map(t=>t.trim())).toEqual(['Choose a point\u2026','Kibali Mining Site','Durba','Watsa']);
  await expect(dialog.locator('select#bp-point')).toHaveValue('');
  await expect(dialog).toContainText('Name the point the area is drawn around');
  await dialog.locator('select#bp-point').selectOption('Durba');
  await dialog.locator('select#bp-point').dispatchEvent('change');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0);
  expect((await saved(page)).pointId).toBe('Durba');
  await expect(page.locator('#inspector-content [data-standard-section="settings"]')).toContainText('Durba');

  // NOTHING TO OFFER YET -- a source that holds no records of its own and has not run. The name is typed in, as
  // it always was, rather than the step pretending to a list it does not have.
  dialog=await open(page,[]);
  await expect(dialog.locator('select#bp-point')).toHaveCount(0);
  await expect(dialog.locator('input#bp-point')).toBeVisible();
  await expect(dialog).toContainText('Run the workflow once');
  expect(errors).toEqual([]);
});
