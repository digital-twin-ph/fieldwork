import {expect} from './fixtures.mjs';
/** JOIN A TABLE TO THE STUDY AREA'S SETTINGS, in its configuration dialog since 2026-11-20: Configure…, the choices, Apply.
 *  The step must be selected first. */
export async function configureJoin(page,{key,normalisation,frames,category}={}){
  await page.locator('#configure-step').click();
  const dialog=page.locator('#join-config');await expect(dialog).toBeVisible();
  if(key)await dialog.locator('#join-key').selectOption(key);
  if(normalisation)await dialog.locator('#join-normalisation').selectOption(normalisation);
  if(frames)await dialog.locator('#join-frames').selectOption(frames);
  if(category)await dialog.locator('#join-category').selectOption(category);
  await dialog.locator('#config-apply').click();await expect(dialog).toHaveCount(0);
}
