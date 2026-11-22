/** A STEP'S SETTINGS SET THROUGH ITS CONFIGURE… DIALOG, as a person sets them: open it, change each control, Apply.
 *  `fields` maps a control's id to the value: a string fills an input or chooses an option, a boolean ticks a box. */
import {expect} from '@playwright/test';
export async function configureStep(page,fields={},{apply=true}={}){
  await page.locator('#inspector-content #configure-step').click();
  const dialog=page.locator('dialog[open]');await expect(dialog).toBeVisible();
  for(const [id,value] of Object.entries(fields)){
    const control=dialog.locator(`#${id}`);
    if(typeof value==='boolean')await control.setChecked(value);
    else if(await control.evaluate(el=>el.tagName==='SELECT'))await control.selectOption(value);
    else{await control.fill(String(value));await control.dispatchEvent('change');}
  }
  if(!apply)return dialog;
  await dialog.locator('#config-apply').click();await expect(dialog).toHaveCount(0);
  return dialog;
}
