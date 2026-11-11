import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

// THE VERSION BUTTON OPENS WHAT CHANGED (the practitioner, 2026-11-10: "When I click on the FW version button, can we
// show a modal dialog that describes the changelog for the version?").
test('the version opens its release notes, steps to the one before and back, and the home link still goes home',async({page})=>{
  const errors=collectPageErrors(page);
  const pkg=JSON.parse(await readFile('package.json','utf8'));
  const log=await readFile('CHANGELOG.md','utf8');
  const sections=[...log.matchAll(/^## (\d+\.\d+\.\d+) — /gm)].map(m=>m[1]);
  const before=sections[sections.indexOf(pkg.version)+1];
  await page.goto('/?example=blank');
  await page.locator('#app-version').click();
  const dialog=page.locator('#changelog-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#changelog-title')).toHaveText(`What changed in v${pkg.version}`);
  await expect(dialog).toContainText('the version you are running');
  // A bullet's wrapped lines are one item, not a bullet and a paragraph.
  await expect(dialog.locator('.manual-body p')).toHaveCount(0);
  await expect(dialog.locator('.manual-body li').first()).toBeVisible();
  await dialog.locator('#changelog-older').click();
  await expect(dialog.locator('#changelog-title')).toHaveText(`What changed in v${before}`);
  await dialog.locator('#changelog-current').click();
  await expect(dialog.locator('#changelog-title')).toHaveText(`What changed in v${pkg.version}`);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // The mark is still the way home, and the version is no longer inside it.
  await expect(page.locator('.brand #app-version')).toHaveCount(0);
  await expect(page.locator('a.brand')).toHaveAttribute('href','./');
  expect(errors).toEqual([]);
});
