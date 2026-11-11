import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** NEXT ROWS TURNS THE PAGE, wherever a table is drawn in a dialog. The practitioner, 2026-11-08, importing South
 *  London's table: *"the Next button to go the next page of rows does not work."* Only the Results view listened for
 *  it; the import dialog's After table, Relate's preview and Select rows' preview drew the buttons and nothing else. */
test.use({serviceWorkers:'block'});
const DAYS=Array.from({length:60},(_,i)=>new Date(Date.UTC(2023,4,1)+i*86_400_000).toISOString().slice(0,10));
const CSV='date,visits\n'+DAYS.map((d,i)=>`${d},${20+i}`).join('\n')+'\n';
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));

test('the import dialog and Select rows turn their pages',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles({name:'days.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)});
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('visits');
  // AFTER, 60 rows at 40 a page.
  const after=page.locator('#table-after');
  await expect(after).toContainText('Page 1 of 2');
  await expect(after).not.toContainText('2023-06-15');
  await after.getByRole('button',{name:'Next rows'}).click();
  await expect(after).toContainText('Page 2 of 2');
  await expect(after).toContainText('2023-06-15');
  await after.getByRole('button',{name:'Previous rows'}).click();
  await expect(after).toContainText('Page 1 of 2');
  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toBeHidden();

  // SELECT ROWS' PREVIEW, 30 days at 12 a page.
  const table=(await saved(page)).nodes.find(n=>n.type==='table_input').id;
  await page.locator('#node-library [data-add="select_rows"]').click();
  await page.locator('#connect-records').selectOption(table);
  await page.locator('#configure-step').click();
  const dialog=page.locator('#select-config');
  await dialog.locator('#select-key').selectOption('date');
  await dialog.locator('#select-mode').selectOption('range');
  await dialog.locator('#select-from').fill('2023-06-01');await dialog.locator('#select-from').press('Tab');
  await dialog.locator('#select-to').fill('2023-06-30');await dialog.locator('#select-to').press('Tab');
  const preview=dialog.locator('.relate-preview');
  await expect(preview).toContainText('Page 1 of 3');
  await preview.getByRole('button',{name:'Next rows'}).click();
  await expect(preview).toContainText('Page 2 of 3');
  await expect(preview).toContainText('2023-06-13');
  expect(errors).toEqual([]);
});
