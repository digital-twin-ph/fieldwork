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
  assert.ok(narrow.x+narrow.width<=right.x,'version badge must not overlap header controls');
  assert.ok(narrow.x+narrow.width<=375,'version badge must fit the viewport');
});
