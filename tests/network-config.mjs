import {expect} from './fixtures.mjs';

/** Street network's settings are in its Configure… dialog since 2026-11-23: open it on the selected step, choose, Apply. */
export async function configureNetwork(page,{method,mode}={}){
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('#network-config');
  await expect(dialog).toBeVisible();
  if(method)await dialog.locator('#network-input-method').selectOption(method);
  if(mode)await dialog.locator('#network-travel-mode').selectOption(mode);
  // AN APPLY DURING A RUN is held, the draft kept, until pressed again once the run is done (0.171.0).
  await expect(async()=>{
    if(await dialog.isVisible())await dialog.locator('#config-apply').click();
    await expect(dialog).toBeHidden({timeout:1000});
  }).toPass({timeout:90000});
}
