import {expect} from '@playwright/test';

/** Switches a chart node to the classic HTML bars and re-runs.
 *
 *  Vega-Lite became the default renderer on 2026-10-13, because the classic bars ignore every
 *  presentation field and cannot be exported. The classic bars still ship and still have to agree
 *  about the numbers, so the checks that read their markup -- `.bar-column`, `.bar-row` and the
 *  "N records" caption -- select them explicitly rather than relying on a default that moved. */
export async function useClassicBars(page,nodeId){
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${nodeId}"]`).click();
  await expect(page.locator('#chart-renderer')).toBeVisible();
  await page.locator('#chart-renderer').selectOption('html');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
}
