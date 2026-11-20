import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** APPEND ROWS' COLUMNS, AS A GRID (2026-11-20). The practitioner: *"what matters more is column sync and alignment than
 *  summarization."* After a run, the dialog shows every stacked column with the column of each table filling it, each
 *  table as read, and the stacked table; renaming a stacked column renames it for every table. Played on the Salmonella
 *  example, whose cases and matched panel controls are stacked. */
const SALMONELLA=new URL('../../example-2021-salmonella-germany/fieldwork-project.json.gz',import.meta.url);
test('Append rows shows its columns as a grid, each table before, and the stacked table after',async({page})=>{
  test.skip(!existsSync(SALMONELLA),'example-2021-salmonella-germany is not checked out beside this repository.');
  const errors=collectPageErrors(page);
  const bytes=readFileSync(SALMONELLA);
  await page.route(/raw\.githubusercontent\.com/,route=>route.fulfill({status:200,body:bytes}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:salmonella-germany-2021"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:salmonella-germany-2021"]')).toContainText('digest matched',{timeout:30000});
  const withAppend=await page.locator('#workflow-select option').evaluateAll(os=>os.map(o=>({value:o.value,text:o.textContent})));
  const key=withAppend.find(o=>/matched panel/i.test(o.text))?.value;
  expect(key,'a workflow stacking the matched panel controls').toBeTruthy();
  await page.locator('#workflow-select').selectOption(key);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="workflow"]').click();
  const append=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='append_rows').id);
  await page.locator(`.react-flow__node[data-id="${append}"]`).click();
  await page.locator('#configure-step').click();
  const ap=page.locator('#append-config');
  await expect(ap.locator('.append-grid')).toBeVisible();
  await expect(ap.locator('.append-before details')).toHaveCount(2);
  await expect(ap).toContainText('After: the stacked table.');
  if(process.env.SHOT)await ap.screenshot({path:process.env.SHOT});
  // A stacked column renamed: every table's column is stacked under the new name.
  const first=ap.locator('[data-grid-name]').first();
  const was=await first.inputValue();
  await first.fill(`${was}_stacked`);await first.press('Tab');
  await expect(ap.locator('[data-grid-name]').first()).toHaveValue(`${was}_stacked`);
  await expect(ap.locator('.append-before')).toContainText(`stacked as ${was}_stacked`);
  await ap.locator('#config-apply').click();
  const params=await page.evaluate(id=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id===id).params,append);
  expect(params.stackUnder.length).toBeGreaterThan(0);
  expect(params.stackUnder.every(m=>m.as===`${was}_stacked`)).toBe(true);
  expect(errors).toEqual([]);
});
