import {test,expect} from './fixtures.mjs';

/** A LONG COLUMN LIST IS CHOSEN IN ITS OWN DIALOG. The practitioner, 2026-11-04, on 92 key column checkboxes: *"This is
 *  choice overload"*, and *"I think the table column filtering should be another dialog."* */
test.use({serviceWorkers:'block'});

const headers=['date',...Array.from({length:18},(_,i)=>`lag${i}`),'count'];
const CSV=headers.join(',')+'\n'+['2023-06-01',...headers.slice(1).map((_,i)=>String(i))].join(',')+'\n';
const SHORT='date,site,count\n2023-06-01,a,3\n';

const openImport=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#open-table').click();
};

test('twenty columns: a summary in the import dialog, the list in its own, chosen by pasting names',async({page})=>{
  await openImport(page);
  await page.locator('#table-file').setInputFiles({name:'wide.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)});
  await page.locator('#table-shape').selectOption('long');
  // Nothing ticked to start with, and no checkbox in the import dialog itself.
  await expect(page.locator('#table-keys-summary')).toHaveText('0 of 20 ticked');
  // Value columns are a wide read's, so a long read shows no summary for them.
  await expect(page.locator('#table-values-summary-row')).toBeHidden();
  await expect(page.locator('dialog[open] #table-title').locator('xpath=..').locator('#table-keys input[type=checkbox]')).toHaveCount(0);

  await page.locator('#table-keys-choose').click();
  const columns=page.locator('#table-keys-dialog');
  await expect(columns).toBeVisible();
  await expect(columns.locator('h2')).toHaveText('Key columns');
  await columns.locator('#table-keys-paste').fill('date, lag3, lag7, nonsense');
  await columns.locator('#table-keys-keep').click();
  await expect(columns.locator('#table-keys-count')).toHaveText('3 of 20 ticked. Not in this file: nonsense.');
  // Find narrows; Ticked only shows what is kept.
  await columns.locator('#table-keys-find').fill('lag1');
  await expect(columns.locator('#table-keys label:visible input[type=checkbox]')).toHaveCount(9);
  await columns.locator('#table-keys-find').fill('');
  await columns.locator('#table-keys-ticked').check();
  await expect(columns.locator('#table-keys label:visible input[type=checkbox]')).toHaveCount(3);
  await page.screenshot({path:'test-results/column-dialog.png'});
  await columns.locator('#table-keys-done').click();
  await expect(columns).toBeHidden();
  await expect(page.locator('#table-keys-summary')).toHaveText('3 of 20: date, lag3, lag7');
  // Untick all, from the dialog again.
  await page.locator('#table-keys-choose').click();
  await columns.locator('#table-keys-none').click();
  await columns.locator('#table-keys-done').click();
  await expect(page.locator('#table-keys-summary')).toHaveText('0 of 20 ticked');

  // A short file keeps its checkboxes inline, and the dialog is gone.
  await page.locator('#table-file').setInputFiles({name:'short.csv',mimeType:'text/csv',buffer:Buffer.from(SHORT)});
  await expect(page.locator('#table-keys-summary')).toHaveCount(0);
  await expect(page.locator('dialog[open] #table-keys input[type=checkbox]')).toHaveCount(3);
  await expect(page.locator('#table-keys-dialog')).toHaveCount(1);
  await page.locator('#table-cancel').click();
  await expect(page.locator('#table-keys-dialog')).toHaveCount(0);
});
