import {expect} from '@playwright/test';

/** MAP'S SETTINGS ARE IN ITS DIALOG (experiment 186, 2026-11-09): Configure… on the selected map, act inside it, then
 *  Apply -- or Cancel, where the test only reads what is offered. */
export async function inMapSettings(page,act,{apply=true}={}){
  await page.locator('#configure-step').click();
  const dialog=page.locator('#map-config');
  await expect(dialog).toBeVisible();
  const out=await act(dialog);
  await dialog.locator(apply?'#config-apply':'#config-cancel').click();
  if(!apply&&await page.locator('#config-discard').count())await page.locator('#config-discard').click();
  await expect(dialog).toBeHidden();
  return out;
}

/** TABLE'S SETTINGS ARE IN ITS DIALOG too (experiment 186, 2026-11-09): how a reasoning result is shown, and the totals. */
export async function inTableSettings(page,act,{apply=true}={}){
  await page.locator('#configure-step').click();
  const dialog=page.locator('#table-config');
  await expect(dialog).toBeVisible();
  const out=await act(dialog);
  await dialog.locator(apply?'#config-apply':'#config-cancel').click();
  if(!apply&&await page.locator('#config-discard').count())await page.locator('#config-discard').click();
  await expect(dialog).toBeHidden();
  return out;
}

/** CHART'S SETTINGS ARE IN ITS DIALOG too (experiment 186, 2026-11-09, touched for the transmission tree): what is
 *  drawn, the axis and panels, the renderer, the figure's words. */
export async function inChartSettings(page,act,{apply=true}={}){
  await page.locator('#configure-step').click();
  const dialog=page.locator('#chart-config');
  await expect(dialog).toBeVisible();
  const out=await act(dialog);
  await dialog.locator(apply?'#config-apply':'#config-cancel').click();
  if(!apply&&await page.locator('#config-discard').count())await page.locator('#config-discard').click();
  await expect(dialog).toBeHidden();
  return out;
}
