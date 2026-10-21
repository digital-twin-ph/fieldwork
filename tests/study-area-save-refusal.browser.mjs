import {test,expect} from '@playwright/test';

// A refused save used to say only "Study area could not be saved. Retry Apply." Reported
// 2026-10-21 on an Ituri area applied into a device already holding North Kivu: retrying fails
// identically when the cause is a full store, so the refusal has to name the cause.
test('a study area refused for want of room says the store is full, and keeps the outline',async({page})=>{
  await page.goto('/?example=blank');
  await page.evaluate(()=>{
    // Fill in two passes: large blocks to the cap, then small ones so no headroom is left for
    // the workflow the Apply is about to write.
    try{const big='x'.repeat(256*1024);for(let i=0;i<64;i++)localStorage.setItem(`ballast-${i}`,big);}catch{/* full is the point */}
    try{const small='x'.repeat(2048);for(let i=0;i<4096;i++)localStorage.setItem(`fine-${i}`,small);}catch{/* no headroom is the point */}
  });
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.locator('#edit-study-area').click();
  await page.getByText('Enter bounding coordinates',{exact:true}).click();
  await page.locator('#area-west').fill('29.0');await page.locator('#area-south').fill('-1.8');
  await page.locator('#area-east').fill('29.5');await page.locator('#area-north').fill('-1.2');
  await page.locator('#area-use-bounds').click();
  await page.locator('#area-apply').click();
  await expect(page.locator('#area-dialog')).toContainText('workflow store is full');
  await expect(page.locator('#area-dialog')).toBeVisible();
  // The outline is still in the editor, so the work is not lost with the refusal.
  await expect(page.locator('#area-north')).toHaveValue(/^-1\.2/);
});
