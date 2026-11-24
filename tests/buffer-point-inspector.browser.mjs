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
    {id:'around',type:'buffer_point',x:40,y:240,params:{label:'Geometry buffer',pointId:'',distanceM:5000}},
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
  await page.locator('.react-flow__node').filter({hasText:'Geometry buffer'}).first().click();
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('#buffer-point-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
  .nodes.find(x=>x.type==='buffer_point').params);

test('the connected features are offered by name, with the picture and the combine choice',async({page})=>{
  const errors=collectPageErrors(page);
  // ONE MINE, which is the practitioner's case: there is nothing to choose, so there is nothing to type.
  let dialog=await open(page,[point('m1','Kibali Mining Site',29.6,3.1)]);
  await expect(dialog.locator('input#bp-point')).toHaveCount(0);
  await expect(dialog.locator('select#bp-point')).toHaveValue('Kibali Mining Site');
  await expect(dialog.locator('label[for="bp-point"]')).toContainText('in Mines');
  await expect(dialog).not.toContainText('Name the point the area is drawn around');
  // THE PICTURE, to scale, which is the reason the Preview section exists.
  await expect(dialog.locator('svg[aria-label="The areas this step draws"]')).toBeVisible();
  // THE RADIUS GOES TO THE RULE'S OWN CEILING, not the 5,000 m the dialog used to allow: a 50 km question about a
  // mine could not be typed (2026-11-23).
  await expect(dialog.locator('#bp-distance')).toHaveAttribute('max','50000');
  await dialog.locator('#bp-distance').fill('50000');
  await dialog.locator('#bp-distance').dispatchEvent('change');
  await expect(dialog).not.toContainText('Give a radius above 0');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0);
  let saved_=await saved(page);
  expect(saved_.pointId).toBe('Kibali Mining Site');
  expect(saved_.distanceM).toBe(50000);
  expect(saved_.yields).toBe('area');

  // SEVERAL. Every one of them is the default, and each is offered by name.
  dialog=await open(page,[point('m1','Kibali Mining Site',29.60,3.10),
    point('m2','Durba',29.62,3.11),point('m3','Watsa',29.64,3.09)]);
  const offered=(await dialog.locator('select#bp-point option').allInnerTexts()).map(t=>t.trim());
  expect(offered[0]).toMatch(/^Every one of them \(3\)$/);
  expect(offered.slice(1)).toEqual(['Kibali Mining Site','Durba','Watsa']);
  await expect(dialog.locator('select#bp-point')).toHaveValue('');
  // Nothing named is an answer now, not a refusal: it means draw around all of them.
  await expect(dialog).not.toContainText('Name the point the area is drawn around');

  // KEPT APART OR COMBINED, chosen here, and the picture says what combining costs.
  await expect(dialog.locator('#bp-yields')).toHaveValue('area');
  await expect(dialog).toContainText('covered more than once');
  await dialog.locator('#bp-yields').selectOption('polygons');
  await dialog.locator('#bp-yields').dispatchEvent('change');
  await expect(dialog).toContainText('kept apart');
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0);
  saved_=await saved(page);
  expect(saved_.pointId).toBe('');
  expect(saved_.yields).toBe('polygons');

  // NOTHING CONNECTED: there is nothing to offer and nothing to draw, and the dialog says so rather than pretending.
  dialog=await open(page,[]);
  await expect(dialog.locator('select#bp-point')).toHaveCount(0);
  await expect(dialog.locator('input#bp-point')).toBeVisible();
  await expect(dialog).toContainText('Run the workflow once');
  expect(errors).toEqual([]);
});
