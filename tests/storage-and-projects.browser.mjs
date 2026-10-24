import {test,expect} from '@playwright/test';

/** The practitioner, 2026-10-21, after a study area that could not be saved: *"I think we need a
 *  storage status indicator to also tell us to off load projects from the browser (export) if
 *  needed. I am not sure we have a clear FW projects button."* */

test('the header says how full the store is, and the figure moves with what is saved',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#storage-status')).toContainText('/ 5.2 MB');
  const before=await page.locator('#storage-status').textContent();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await expect.poll(()=>page.locator('#storage-status').textContent()).not.toBe(before);
});

test('the indicator warns before a save is refused, not after',async({page})=>{
  await page.goto('/?example=blank');
  await page.evaluate(()=>{
    try{const big='x'.repeat(256*1024);for(let i=0;i<16;i++)localStorage.setItem(`ballast-${i}`,big);}catch{/* enough is enough */}
  });
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await expect(page.locator('#storage-status')).toHaveClass(/tight|full/);
  await expect(page.locator('#storage-status')).toHaveAttribute('title',/Export what you want to keep/);
});

test('the storage figure opens one list of everything on this device, with its cost',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Kivu');
  await page.locator('#project-create').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.locator('#storage-status').click();
  await expect(page.locator('#project-view')).toBeVisible();
  await expect(page.locator('#storage-meter')).toContainText('of 5.2 MB used');
  const kivu=page.locator('.project-view-block').filter({hasText:'Kivu'}).first();
  await expect(kivu.locator('.project-view-row').first()).toContainText('open');
  await expect(kivu.locator('.project-view-row').first()).toContainText('KB');
  // A worked example nobody has opened is not listed: this is what IS on the device.
  await expect(page.locator('.project-view-block h3').filter({hasText:'Hagelloch'})).toHaveCount(0);
});

test('a workflow can be deleted from the list without being opened first',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Kivu');
  await page.locator('#project-create').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  const open=await page.locator('#project-title').textContent();
  await page.locator('#storage-status').click();
  page.on('dialog',d=>d.accept());
  const other=page.locator('.project-view-row').filter({hasText:'first question'}).first();
  await other.locator('button',{hasText:'Delete'}).click();
  await expect(page.locator('.project-view-row').filter({hasText:'first question'})).toHaveCount(0);
  // The canvas is where it was: deleting a row is tidying, not navigating.
  await expect(page.locator('#project-title')).toHaveText(open);
});

test('both stores are reported, because only one of them refuses a save',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#storage-status').click();
  const meter=page.locator('#storage-meter');
  await expect(meter).toContainText('Workspace store');
  await expect(meter).toContainText('Data store');
  // The data store is named, so a fallback to the small one cannot pass unnoticed.
  await expect(meter).toContainText(/IndexedDB|small store on this device/);
  // And the browser's own estimate is labelled as the browser's, not as this application's count.
  await expect(meter).toContainText(/browser reports this site using|does not report a storage estimate/);
});

test('the figure does not push the header off a phone',async({page})=>{
  await page.goto('/?example=blank');
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#storage-status .storage-short')).toBeVisible();
  await expect(page.locator('#storage-status .storage-long')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  // And it still opens the list it opens at any other width.
  await page.locator('#storage-status').click();
  await expect(page.locator('#project-view')).toBeVisible();
});

// A payload is written to the store before the workflow is asked to accept it, so every refusal
// after that point left bytes behind that nothing referred to: "data 416.2 MB" beside a Street
// network widget reading "0 nodes · 0 directed edges", 2026-10-21.
test('payloads no workflow refers to are reported and can be removed',async({page})=>{
  await page.goto('/?example=blank');
  // Written straight into the store the application keeps payloads in, which is how one gets
  // there without a workflow: a refusal after the write.
  await page.evaluate(async()=>{
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('fieldwork');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('payloads','readwrite');
      tx.objectStore('payloads').put({nodes:[{id:'n1',coordinates:[0,0]}],edges:[],source:'orphan'},'a'.repeat(64));
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
  });
  await page.reload();
  await page.locator('#storage-status').click();
  const meter=page.locator('#storage-meter');
  await expect(meter).toContainText('referred to by no workflow');
  page.on('dialog',d=>d.accept());
  await meter.locator('#drop-unreferenced').click();
  await expect(meter).not.toContainText('referred to by no workflow');
  await expect(page.locator('#toast')).toContainText('unreferenced payload');
});
