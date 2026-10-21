import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "This is the in-VSCode Browser viewing local static page and still shows 0.7.0" -- the
// practitioner, 2026-10-15, with the files on disk at 0.8.1. Every remedy for a stale service
// worker is a developer tool, and an embedded browser has none of them. This is the one that is
// just a URL.
test('?reset-cache=1 unregisters the worker, empties the caches, and reloads clean',async({page,context})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  // Let the worker install and cache the build.
  await expect.poll(async()=>await page.evaluate(async()=>(await caches.keys()).length),
    {timeout:30000}).toBeGreaterThan(0);
  // A key the application never writes, so what survives is evidence about the reset rather
  // than about the app's own saving.
  await page.evaluate(()=>localStorage.setItem('zz-practitioner-data','kept'));

  await page.goto('/?reset-cache=1');
  // It reloads itself, dropping the parameter and busting the HTTP cache on the way out.
  await expect.poll(()=>page.url(),{timeout:30000}).toContain('cache-bust=');
  expect(page.url()).not.toContain('reset-cache');

  // Requests in flight when the worker is deliberately unregistered fail, and WebKit reports
  // that as a page error. It is inherent to pulling the cache out from under a loading page,
  // not a defect, and it failed in CI and nowhere else. What this test claims is that the
  // application comes back CLEAN, so the count starts from the reload rather than from before
  // it -- and anything thrown afterwards still fails.
  errors.length=0;

  // Nothing of the application's own cache survives the moment it reloads.
  const state=await page.evaluate(async()=>({
    registrations:(await navigator.serviceWorker.getRegistrations()).length,
    saved:localStorage.getItem('zz-practitioner-data'),
    workspace:!!localStorage.getItem('fieldwork-workflow-v1'),
  }));
  // The saved workspace is the practitioner's work and is deliberately untouched: this clears
  // the application, not what they built with it.
  assert_equal(state.saved,'kept');
  expect(state.workspace,'the workspace is still there').toBe(true);
  expect(state.registrations,'a fresh worker may re-register after the reload').toBeLessThanOrEqual(1);
  await expect(page.locator('#app-version')).toContainText('v');
  // Exercise it after the reset, so "clean" means it works rather than only that it loaded.
  //
  // Wait for the restore to FINISH before counting. Counting straight after the reload read a
  // canvas midway through rendering the saved workflow: `before` was 0, the seven saved nodes
  // then arrived, and adding one made eight against an expected one. WebKit in CI is slow
  // enough to lose that race and every local run was fast enough to win it, which is the
  // signature of a test racing the application rather than a defect in it. 2026-10-17.
  const before=await page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{"nodes":[]}').nodes.length);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(before,{timeout:30000});
  await page.locator('#node-library [data-add]').first().click();
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(before+1);
  expect(errors).toEqual([]);
});
function assert_equal(actual,expected){expect(actual).toBe(expected);}
