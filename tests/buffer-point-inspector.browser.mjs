import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// The tile routes below are stubbed with page.route, which a service worker would answer first on WebKit and reach
// the real tile server through (tests/stub-network notes this). Blocked so a stub is a stub on both engines.
test.use({serviceWorkers:'block'});

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

/** THE PICTURE SAYS WHAT THE SETTING SAYS (2026-11-24). Reported with a buffer around one mine set to "Combine them
 *  into one study area": the preview under it read "1 area, 7850.8 km² between them, KEPT APART". `previewBuffers`
 *  returns no dissolve where there is nothing to dissolve, and the caption read that absence as the layer setting,
 *  so the step contradicted itself on one screen. */
test('the preview says what the setting says, and never the opposite',async({page})=>{
  const errors=collectPageErrors(page);
  const dialog=await open(page,[point('m1','Kibali Mining Site',29.6833,3.1167)]);
  await dialog.locator('#bp-point').selectOption({label:'Kibali Mining Site'});
  await dialog.locator('#bp-distance').fill('50000');
  await dialog.locator('#bp-distance').dispatchEvent('change');

  // COMBINED: it becomes the study area, and the words "kept apart" must not appear under a setting that combines.
  await dialog.locator('#bp-yields').selectOption('area');
  const caption=dialog.locator('.config-preview .description, .description').last();
  await expect(caption).toContainText('study area');
  await expect(caption).not.toContainText('kept apart');
  // One area is one area: it must not be described as a total "between them".
  await expect(caption).not.toContainText('between them');

  // KEPT APART: the other setting, and the other sentence.
  await dialog.locator('#bp-yields').selectOption('polygons');
  await expect(caption).toContainText('polygon layer');
  await expect(caption).not.toContainText('study area');
  expect(errors).toEqual([]);
});

test('the preview draws the point the area is drawn around',async({page})=>{
  const errors=collectPageErrors(page);
  const dialog=await open(page,[point('m1','Kibali Mining Site',29.6833,3.1167)]);
  await dialog.locator('#bp-point').selectOption({label:'Kibali Mining Site'});
  await dialog.locator('#bp-distance').fill('50000');
  await dialog.locator('#bp-distance').dispatchEvent('change');
  const svg=dialog.locator('svg[data-buffer-frame]');
  await expect(svg).toBeVisible();
  // A radius is a claim about reach FROM something, so the thing it reaches from is in the picture.
  await expect(svg.locator('circle')).toHaveCount(1);
  // And the mark sits at the CENTRE of the area drawn around it, which is the thing the picture has to show: a
  // buffer that drifted off its own point would put the mark at an edge, which is what was reported on the map.
  const at=await svg.evaluate(el=>{
    const c=el.querySelector('circle'),box=el.querySelector('path').getBBox();
    return {cx:+c.getAttribute('cx'),cy:+c.getAttribute('cy'),
      mx:box.x+box.width/2,my:box.y+box.height/2,w:box.width,h:box.height};});
  expect(Math.abs(at.cx-at.mx)).toBeLessThan(2);
  expect(Math.abs(at.cy-at.my)).toBeLessThan(2);
  // ...and the area is drawn round, not stretched: a circle on the ground stays a circle in this frame.
  expect(Math.abs(at.w/at.h-1)).toBeLessThan(0.02);
  // The frame the ground is fetched for is the frame the areas are drawn in.
  const frame=(await svg.getAttribute('data-buffer-frame')).split(',').map(Number);
  expect(frame[0]).toBeLessThan(29.6833);expect(frame[2]).toBeGreaterThan(29.6833);
  expect(frame[1]).toBeLessThan(3.1167);expect(frame[3]).toBeGreaterThan(3.1167);
  expect(errors).toEqual([]);
});

/** GROUND IS CONTEXT, NEVER A PRECONDITION. With no network the preview keeps its plain background and says the
 *  ground is not shown; it must not fail, blank, or report an error on a figure that otherwise drew correctly. */
test('the preview still draws when the tiles cannot be fetched',async({page})=>{
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org/,route=>route.abort('failed'));
  const dialog=await open(page,[point('m1','Kibali Mining Site',29.6833,3.1167)]);
  await dialog.locator('#bp-point').selectOption({label:'Kibali Mining Site'});
  await dialog.locator('#bp-distance').fill('50000');
  await dialog.locator('#bp-distance').dispatchEvent('change');
  await expect(dialog.locator('svg[data-buffer-frame] path')).not.toHaveCount(0);
  await expect(dialog.locator('.description').last()).toContainText('the ground beneath is not shown');
  expect(errors).toEqual([]);
});

/** AND THE GROUND IS DRAWN WHERE IT CAN BE FETCHED. A stubbed tile rather than a real one: this asserts that the
 *  preview asks for ground, places what comes back in its own frame and credits it, not that OpenStreetMap is up. */
const TILE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
test('the preview puts ground under the area when the tiles arrive',async({page})=>{
  const errors=collectPageErrors(page);
  const asked=[];
  await page.route(/tile\.openstreetmap\.org/,async route=>{
    asked.push(route.request().url());
    await route.fulfill({status:200,contentType:'image/png',
      body:Buffer.from(TILE.split(',')[1],'base64')});
  });
  const dialog=await open(page,[point('m1','Kibali Mining Site',29.6833,3.1167)]);
  await dialog.locator('#bp-point').selectOption({label:'Kibali Mining Site'});
  await dialog.locator('#bp-distance').fill('50000');
  await dialog.locator('#bp-distance').dispatchEvent('change');
  const ground=dialog.locator('svg[data-buffer-frame] [data-buffer-ground] image');
  await expect(ground.first()).toBeAttached({timeout:15000});
  expect(asked.length).toBeGreaterThan(0);
  // ODbL travels with the copy, so the preview credits what it drew.
  await expect(dialog.locator('.description').last()).toContainText('OpenStreetMap');
  // The areas are still drawn, and over the ground rather than under it.
  await expect(dialog.locator('svg[data-buffer-frame] path')).not.toHaveCount(0);
  expect(errors).toEqual([]);
});
