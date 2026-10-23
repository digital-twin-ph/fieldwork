import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner, 2026-10-22, with Chrome refusing to load the application after a province
// download: *"I need to clean up Chrome because it won't allow me to load FW. Is there a way to
// load it with a cleanup URL?"* There was not, and the only route was Chrome's own settings,
// which deletes everything this application has ever saved.
test('a cleanup URL drops the stored datasets and keeps the workflows',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  // Something in the payload store, and something in localStorage.
  await page.evaluate(async()=>{
    localStorage.setItem('fieldwork-datasets-v1',JSON.stringify({abc:{nodes:[],edges:[]}}));
    await new Promise(resolve=>{
      const open=indexedDB.open('fieldwork',1);
      open.onupgradeneeded=()=>{try{open.result.createObjectStore('payloads');}catch{/* present */}};
      open.onsuccess=()=>{
        const database=open.result;
        if(!database.objectStoreNames.contains('payloads')){database.close();resolve(null);return;}
        const put=database.transaction('payloads','readwrite').objectStore('payloads')
          .put({planted:true},'zz-planted-dataset');
        put.onsuccess=put.onerror=()=>{database.close();resolve(null);};
      };
      open.onerror=()=>resolve(null);
    });
  });
  const before=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('fieldwork')).length);
  expect(before).toBeGreaterThan(1);

  await page.goto('/?forget-datasets');
  await expect(page).toHaveURL(/\/$|index\.html$/,{timeout:30000});
  const after=await page.evaluate(async()=>({
    legacy:localStorage.getItem('fieldwork-datasets-v1'),
    keys:Object.keys(localStorage).filter(k=>k.startsWith('fieldwork')).length,
    databases:(await indexedDB.databases?.()??[]).map(d=>d.name),
  }));
  // The service worker re-registers across these reloads and WebKit reports that as an access
  // control error. It is the browser talking about itself, not the application failing.
  const faults=errors.filter(message=>!/sw\.js|service ?worker|access control/i.test(message));
  expect(faults).toEqual([]);
  expect(after.legacy).toBeNull();
  expect(after.keys,'the workflows are the work and are kept').toBeGreaterThan(0);
  // The database comes back, empty, because the application opens it again on the reload. What
  // matters is that nothing it held survived: the payloads are what would not load.
  // The store comes back and the open workflow writes its own data into it again, so an empty
  // store is the wrong thing to ask for. What matters is that what was held before is gone.
  const planted=await page.evaluate(()=>new Promise(resolve=>{
    const open=indexedDB.open('fieldwork',1);
    open.onupgradeneeded=()=>{try{open.result.createObjectStore('payloads');}catch{/* present */}};
    open.onsuccess=()=>{
      const database=open.result;
      if(!database.objectStoreNames.contains('payloads')){database.close();resolve(null);return;}
      const read=database.transaction('payloads').objectStore('payloads').get('zz-planted-dataset');
      read.onsuccess=()=>{database.close();resolve(read.result??null);};
      read.onerror=()=>{database.close();resolve('unreadable');};
    };
    open.onerror=()=>resolve('unopenable');
  }));
  expect(planted,'the dataset held before is gone').toBeNull();
});

// "That is where I least expect it" -- of the project export, which lived behind the storage
// readout in the header and nowhere else.
test('Projects is a button in the header, and a project exports from a button',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  // A worked example is not deletable and so carries no export; a project somebody made does.
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri response');
  await page.locator('#project-subject-input').fill('Ebola, health zones');
  await page.locator('#project-create').click();
  await page.locator('#projects-button').click();
  await expect(page.locator('#projects-dialog')).toBeVisible();
  const exportButton=page.locator('#projects-list button[data-export-project]').first();
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toContainText('Export project');
  // The storage readout still opens it, because somebody has learned that by now.
  await page.locator('#projects-dialog-close').click();
  await page.locator('#storage-status').click();
  await expect(page.locator('#projects-dialog')).toBeVisible();
  expect(errors).toEqual([]);
});
