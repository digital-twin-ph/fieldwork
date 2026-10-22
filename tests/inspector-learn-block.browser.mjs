import {test,expect} from '@playwright/test';

// "In an Inspector panel, it seems we do not have a standardized, user friendly interface because
// we crammed so many things into it. The buttons for Deeper Dive and Manual are very tiny when
// they are the most important links for users and learners." -- 2026-10-21.
test('every panel opens with the same block, and its links are controls rather than small print',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  const block=page.locator('#inspector-content .learn-block');
  await expect(block).toBeVisible();
  // Directly under the title and its one line, before any control.
  const before=await page.evaluate(()=>{
    const body=document.querySelector('#inspector-content');
    const learn=body.querySelector('.learn-block');
    const control=body.querySelector('input,select,textarea,button:not(.learn-link)');
    if(!learn||!control)return null;
    // DOCUMENT_POSITION_FOLLOWING: the control comes after the block.
    return !!(learn.compareDocumentPosition(control)&Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(before).toBe(true);
  // At the size of a control: the manual used to be 10px text.
  for(const link of await block.locator('.learn-link').all()){
    const box=await link.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(30);
    expect(box.width).toBeGreaterThanOrEqual(90);
  }
  await expect(block.locator('#open-manual')).toHaveText(/Manual/);
  await block.locator('#open-manual').click();
  await expect(page.locator('#manual-dialog')).toBeVisible();
});

test('a widget with neither a page nor a notebook shows no empty frame',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="alert"]').click();
  const block=page.locator('#inspector-content .learn-block');
  if(await block.count()){
    // If it is there at all, it carries at least one real link.
    await expect(block.locator('.learn-link')).not.toHaveCount(0);
  }
});
