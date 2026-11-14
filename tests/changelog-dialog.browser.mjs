import {test,expect} from './fixtures.mjs';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

// THE VERSION BUTTON OPENS WHAT CHANGED (the practitioner, 2026-11-10: "When I click on the FW version button, can we
// show a modal dialog that describes the changelog for the version?").
test('the version opens its release notes, steps to the one before and back, and the home link still goes home',async({page})=>{
  const errors=collectPageErrors(page);
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const log=await readFile('CHANGELOG.md','utf8');
  const versions=[...log.matchAll(/^## (\d+\.\d+\.\d+) — /gm)].map(m=>m[1]);
  const series=v=>v.split('.').slice(0,2).join('.');
  const mine=series(pkg.version),inMine=versions.filter(v=>series(v)===mine);
  const before=[...new Set(versions.map(series))].find((s,i,all)=>all[i-1]===mine);
  await page.goto('/?example=blank');
  await page.locator('#app-version').click();
  const dialog=page.locator('#changelog-dialog');
  await expect(dialog).toBeVisible();
  // The series, x.y, with every x.y.z in it, newest first (the practitioner, 2026-11-10).
  await expect(dialog.locator('#changelog-title')).toHaveText(`What changed in v${mine}`);
  await expect(dialog.locator('.changelog-release')).toHaveCount(inMine.length);
  await expect(dialog.locator(`.changelog-release[data-version="${pkg.version}"] h3`)).toContainText('the version you are running');
  // A bullet's wrapped lines are one item, not a bullet and a paragraph.
  await expect(dialog.locator('.manual-body p')).toHaveCount(0);
  await expect(dialog.locator('.manual-body li').first()).toBeVisible();
  // CLOSE STAYS IN REACH (2026-11-13): scrolled to the end of a long series, Close is still in view at the top.
  await dialog.evaluate(d=>{d.scrollTop=d.scrollHeight;});
  await expect(dialog.locator('#changelog-close')).toBeInViewport();
  const head=await dialog.locator('.manual-head').boundingBox(),box=await dialog.boundingBox();
  expect(Math.abs(head.y-box.y)).toBeLessThan(4);
  await dialog.evaluate(d=>{d.scrollTop=0;});
  await dialog.locator('#changelog-older').click();
  await expect(dialog.locator('#changelog-title')).toHaveText(`What changed in v${before}`);
  await dialog.locator('#changelog-current').click();
  await expect(dialog.locator('#changelog-title')).toHaveText(`What changed in v${mine}`);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // The mark is still the way home, and the version is no longer inside it.
  await expect(page.locator('.brand #app-version')).toHaveCount(0);
  await expect(page.locator('a.brand')).toHaveAttribute('href','./');
  expect(errors).toEqual([]);
});
