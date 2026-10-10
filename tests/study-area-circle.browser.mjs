import {test,expect} from '@playwright/test';

// A study area from a point and a radius: navigate, click a centre, tune the radius, apply.
// This is the scope a practitioner wants when the question is "around this place" and there is
// no point layer to buffer. See TODO, "The study area is Botswana-shaped".
test('a study area can be drawn as a point with an adjustable radius',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="area"]').click();
  await page.locator('#edit-study-area').click();
  await expect(page.locator('#area-map')).toBeVisible();

  // The radius control appears only with the tool that uses it.
  await expect(page.locator('#area-radius-control')).toBeHidden();
  await page.locator('[data-draw="circle"]').click();
  await expect(page.locator('#area-radius-control')).toBeVisible();
  await expect(page.locator('#area-feedback')).toContainText('Click the centre');

  const map=page.locator('#area-map');
  const box=await map.boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  // Placing the centre draws the circle immediately, and the feedback reports validity rather
  // than repeating the instruction.
  await expect(page.locator('#area-feedback')).toContainText('Shape is valid');
  await expect(page.locator('#area-radius-value')).toContainText('5,000 m');

  // The circle follows the slider, and Apply becomes available.
  await page.locator('#area-radius').fill('10000');
  await page.locator('#area-radius').dispatchEvent('input');
  await expect(page.locator('#area-radius-value')).toContainText('10,000 m');
  await expect(page.locator('#area-apply')).toBeEnabled();
  await page.locator('#area-apply').click();

  // The node records that it was derived from a centre, not drawn by hand.
  const params=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}')
    ?.nodes?.find(n=>n.type==='area')?.params);
  expect(params.selectionMode).toBe('circle');
  expect(params.geometry.type).toBe('Polygon');
  expect(params.geometry.coordinates[0].length-1).toBe(128);
});

// A circle is a polygon, but editing it as one would deform it into something that is no longer
// a radius around a centre. It gets two handles: move, and resize.
test('a circle offers two handles, not one per vertex',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="area"]').click();
  await page.locator('#edit-study-area').click();
  await page.locator('[data-draw="circle"]').click();
  const map=page.locator('#area-map');
  const box=await map.boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);

  const handles=page.locator('#area-map .area-vertex');
  await expect(handles).toHaveCount(2);
  await expect(page.locator('#area-map .area-centre')).toHaveCount(1);
  await expect(page.locator('#area-map .area-radius-handle')).toHaveCount(1);
  await expect(page.locator('[title="Move the circle"]')).toBeVisible();
  await expect(page.locator('[title="Change the radius"]')).toBeVisible();

  // A polygon, by contrast, is edited vertex by vertex and keeps its many handles.
  await page.locator('#area-clear').click();
  await page.locator('[data-draw="polygon"]').click();
  for(const [dx,dy] of [[-60,-40],[60,-40],[60,40]])
    await page.mouse.click(box.x+box.width/2+dx,box.y+box.height/2+dy);
  await page.locator('#area-finish').click();
  await expect(page.locator('#area-map .area-vertex')).toHaveCount(3);
});
