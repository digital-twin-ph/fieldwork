import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** RELATE, SHOWN ON A MADE-UP EXAMPLE (experiment 223), from its Configure… dialog, with the choices made there and not
 *  yet applied. Stepped to the end with the keyboard's buttons, then again after choosing one row per match and to
 *  keep unmatched rows: the last step is the table Relate makes. Nothing is applied by watching it. */
test('Show me how it works steps through a made-up join with the dialog\'s own choices, and applies nothing',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  // The library offers Relate once there is a table for it to read.
  await page.locator('[data-add="table_input"]').click();
  await page.keyboard.press('Escape');
  await page.locator('[data-add="relate_table"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='relate_table').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#relate-config');
  await dialog.locator('#relate-show-me').click();
  const walk=page.locator('#table-walkthrough');
  await expect(walk.locator('.walk-made-up')).toHaveText('Made-up example');
  await expect(walk.locator('.walk-say')).toContainText('Step 1 of 7.');
  await expect(walk.locator('.walk-say')).toContainText('compared folding punctuation and case, as you have chosen');
  await expect(walk.locator('[data-walk-back]')).toBeDisabled();
  for(let i=0;i<6;i++)await walk.locator('[data-walk-step]').click();
  // As the dialog stands: every row checked, then it stops in its own words, and no table comes out.
  await expect(walk.locator('.walk-say')).toContainText('Every row checked, the step stops and passes nothing on');
  await expect(walk.locator('.walk-result')).toContainText('No table: the step stops here');
  await expect(walk.locator('[data-walk-step]')).toBeDisabled();
  await walk.locator('[data-walk-close]').click();
  await expect(walk).toHaveCount(0);
  await expect(dialog.locator('#relate-show-me')).toBeFocused();

  // One row per match, chosen in the dialog and not applied: the walkthrough follows it.
  await dialog.locator('#relate-several').selectOption('each');
  await dialog.locator('#relate-show-me').click();
  await walk.locator('[data-walk-step]').click();await walk.locator('[data-walk-step]').click();
  await expect(walk.locator('.walk-result tbody tr')).toHaveCount(2);
  await expect(walk.locator('tr[data-walk-state="matched"]')).toHaveCount(2);
  await expect(walk.locator('tr[data-walk-state="matched"] .walk-word').first()).toContainText('matched');
  await walk.locator('[data-walk-back]').click();
  await expect(walk.locator('.walk-result tbody tr')).toHaveCount(1);
  await walk.locator('[data-walk-close]').click();
  await dialog.locator('#config-cancel').click();
  const params=await page.evaluate(id=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id===id).params,id);
  expect(params.several).toBeUndefined();
  expect(errors).toEqual([]);
});
