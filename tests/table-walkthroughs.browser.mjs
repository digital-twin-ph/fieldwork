import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** APPEND ROWS, SELECT ROWS AND TOTAL WITHIN GROUPS, each shown on a made-up example from its Configure… dialog
 *  (experiment 223), stepped to the end, ending on the step's own table, and closed with focus back on the button. */
const CASES=[
  {type:'append_rows',button:'#append-show-me',steps:4,last:'The result: 4 rows'},
  {type:'select_rows',button:'#select-show-me',steps:8,last:'The result: 3 rows'},
  {type:'group_table',button:'#group-show-me',steps:4,last:'The result: 2 rows, one per region'},
];
for(const c of CASES)test(`${c.type}: Show me how it works steps through a made-up example to the step's own result`,async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  // The library offers a table step once there is a table for it to read.
  await page.locator('[data-add="table_input"]').click();
  await page.keyboard.press('Escape');
  await page.locator(`[data-add="${c.type}"]`).click();
  const id=await page.evaluate(type=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type===type).id,c.type);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#configure-step').click();
  await page.locator(c.button).click();
  const walk=page.locator('#table-walkthrough');
  await expect(walk.locator('.walk-made-up')).toHaveText('Made-up example');
  await expect(walk.locator('.walk-say')).toContainText(`Step 1 of ${c.steps}.`);
  for(let i=1;i<c.steps;i++)await walk.locator('[data-walk-step]').click();
  await expect(walk.locator('.walk-say')).toContainText(c.last);
  await expect(walk.locator('.walk-result figcaption')).toHaveText('The result');
  await walk.locator('[data-walk-close]').click();
  await expect(walk).toHaveCount(0);
  await expect(page.locator(c.button)).toBeFocused();
  expect(errors).toEqual([]);
});
