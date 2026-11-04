import {expect} from '@playwright/test';

/** KEEP THESE COLUMNS, as a person does now: in the column dialog when the file has many (pasting their names, as a
 *  manual's Copy gives them), ticked inline when it has few. 2026-11-04: *"I think the table column filtering should
 *  be another dialog."* `prefix` is `table-keys` or `table-values`. */
export async function keepColumns(page,prefix,names){
  const choose=page.locator(`#${prefix}-choose`);
  if(await choose.count()&&await choose.isVisible()){
    await choose.click();
    await page.locator(`#${prefix}-paste`).fill(names.join(', '));
    await page.locator(`#${prefix}-keep`).click();
    await page.locator(`#${prefix}-done`).click();
    await expect(page.locator(`#${prefix}-dialog`)).toBeHidden();
    return;
  }
  const boxes=page.locator(`#${prefix} input[type=checkbox]`);
  for(let i=0;i<await boxes.count();i++){
    const box=boxes.nth(i),name=await box.getAttribute('value');
    if(await box.isDisabled())continue;
    await box.setChecked(names.includes(name));
  }
}
/** The key columns are offered, inline or behind Choose key columns. */
export const columnsOffered=page=>expect(page.locator('#table-keys-choose:visible, #table-keys:visible').first()).toBeVisible();
