import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('application version matches the package and stays visible beside the mark',async({page})=>{
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const lock=JSON.parse(await readFile('package-lock.json','utf8'));
  assert.equal(pkg.version,lock.packages[''].version);
  await page.goto('/?example=blank');
  const version=page.locator('#app-version');
  await expect(version).toHaveText(`v${pkg.version}`);
  await expect(version).toBeVisible();
  const icon=await page.locator('.brand img').boundingBox(),badge=await version.boundingBox();
  assert.ok(badge.x>icon.x+icon.width);
  await page.setViewportSize({width:375,height:812});
  await expect(version).toBeVisible();
  const narrow=await version.boundingBox(),right=await page.locator('.header-right').boundingBox();
  // OVERLAP is an intersection of rectangles, not an ordering of their left edges.
  //
  // This read `narrow.x+narrow.width<=right.x` until 2026-10-20, which is the same claim ONLY
  // while the badge and the controls sit on one row. It failed in CI's Linux WebKit -- twice,
  // blocking publication for half a day -- while passing in WebKit here, and a header that wraps
  // at 375px is the obvious candidate for that difference: wrapped, the two cannot overlap and
  // the old form fails anyway. The failure screenshot is not retrievable, because the workflow
  // uploads only the Pages artifact, so the rectangles are printed on failure. If the layout is
  // genuinely broken there, the next run says so in numbers rather than by a proxy.
  const area=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))
    *Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  const box=r=>`x ${r.x.toFixed(1)} y ${r.y.toFixed(1)} w ${r.width.toFixed(1)} h ${r.height.toFixed(1)}`;
  assert.equal(area(narrow,right),0,
    `version badge overlaps header controls by ${area(narrow,right).toFixed(1)}px²: badge ${box(narrow)}, controls ${box(right)}`);
  assert.ok(narrow.x+narrow.width<=375,`version badge must fit the viewport: badge ${box(narrow)}`);
  // 375px was not narrow enough to catch this. Measured 2026-10-20, the collision began at 330px
  // here and CI's Linux WebKit was already in it at 375px, so the check runs where the layout is
  // actually under pressure rather than where it happened to be comfortable.
  for(const width of [330,320,300]){
    await page.setViewportSize({width,height:812});
    const badge=await version.boundingBox(),controls=await page.locator('.header-right').boundingBox();
    assert.equal(area(badge,controls),0,
      `at ${width}px the version badge overlaps header controls by ${area(badge,controls).toFixed(1)}px²: badge ${box(badge)}, controls ${box(controls)}`);
    assert.ok(badge.x+badge.width<=width,`at ${width}px the version badge must fit the viewport: badge ${box(badge)}`);
  }
});
