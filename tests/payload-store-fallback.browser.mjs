import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

// The practitioner, 2026-10-20: "Store fallback is dangerous especially when the primary mode
// keeps on failing." The first version of the payload store proved the point on itself: a
// database that OPENED and then refused every write fell back to the small store, counted that as
// a successful move, and deleted the small store's copy -- the only copy. These two cases are the
// ones where a fallback is a hazard rather than a convenience, and both must be loud.
const LEGACY='fieldwork-datasets-v1';
const seed=digest=>`(()=>{try{localStorage.setItem('${LEGACY}',JSON.stringify({'${digest}':{nodes:[],edges:[],source:'a saved payload'}}));}catch{}})()`;
// Toasts are transient and the workflow runs on load, so the one that matters can be replaced
// before an assertion reaches it. Every toast is recorded instead of raced for.
const recordToasts=()=>{
  const seen=[];Object.defineProperty(window,'__toasts',{get:()=>seen});
  const watch=()=>{const element=document.querySelector('#toast');if(!element)return setTimeout(watch,20);
    new MutationObserver(()=>seen.push(element.textContent||'')).observe(element,{childList:true,subtree:true,characterData:true});};
  watch();
};
const toasts=page=>page.evaluate(()=>window.__toasts.join(' | '));

test('a database that opens and then refuses every write keeps the small store it could not replace',async({page})=>{
  const digest='a'.repeat(64);
  await page.addInitScript(seed(digest));
  await page.addInitScript(()=>{
    const put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(...args){put.apply(this,args);throw new Error('refused for the test');};
  });
  await page.addInitScript(recordToasts);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  // Said once, in the failure tone, rather than left to a status line nobody reads.
  assert.match(await toasts(page),/back to the small one/);
  // And the payload is still where it was. Deleting it is the bug this pins.
  const kept=await page.evaluate(key=>localStorage.getItem(key),LEGACY);
  assert.ok(kept&&kept.includes(digest),'the only copy of the payload must survive a failed move');
  assert.ok(JSON.parse(kept)[digest].source==='a saved payload');
});

test('a browser with no large store says so on the widget, before a download rather than after',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get:()=>undefined});});
  await page.addInitScript(recordToasts);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  assert.match(await toasts(page),/would not open the large store/);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  await page.locator('#network-input-method').selectOption('osm');
  await expect(page.locator('#network-store-warning')).toContainText('about 5 MB in all');
  await expect(page.locator('#network-store-warning')).toBeVisible();
});

test('the warning is absent where the large store works, so it means something when it appears',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="network"]').click();
  await page.locator('#network-input-method').selectOption('osm');
  await expect(page.locator('#network-store-warning')).toHaveCount(0);
});
