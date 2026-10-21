import {test,expect} from '@playwright/test';

// "The Find Health Facilities widget label cannot be changed like Study Area, Street Network and
// Map. Let's move to standardize the labeling with 'Apply Label' button."
//
// Three controls existed -- the study area's form, the catchment inspector's shared field, and a
// plain input on the input widgets -- and one widget had none. The gesture is learned once, so it
// has to be the same gesture.
test('every widget that can be labelled is labelled the same way',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // The widget that had no control at all.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="find_health_facilities"]').click();
  await expect(page.locator('#hf-label')).toHaveValue('Find health facilities');
  await page.locator('#hf-label').fill('Facilities in North Kivu');
  await page.locator('[data-label-form="hf-label"] button[type="submit"]').click();
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node.selected')).toContainText('Facilities in North Kivu');

  // And it survives a reload, because it is the node's label and not a caption on screen.
  await page.reload();
  await expect(page.locator('#workflow-state')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toContainText(['Facilities in North Kivu'].concat([]),{timeout:30000});
});

test('an empty label is refused rather than written onto the canvas',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="find_health_facilities"]').click();
  await page.locator('#hf-label').fill('   ');
  await page.locator('[data-label-form="hf-label"] button[type="submit"]').click();
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node.selected')).toContainText('Find health facilities');
});
