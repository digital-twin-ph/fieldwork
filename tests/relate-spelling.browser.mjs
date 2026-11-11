/** RELATE ALLOWS FOR SPELLING (experiment 193).
 *
 *  Sierra Leone's line list writes "Bo District" in a column called Residential District; OCHA's districts write
 *  "Bo", and for Falaba "Fabala", in a column called district. Relate matched only a column both tables name alike,
 *  after folding case and punctuation, so none met. The practitioner, 2026-11-09, on extending Relate rather than
 *  adding a link step: *"Maybe that's the one we need to extend because the output and outcome desired is the
 *  same"*; and *"We can make .88 the default but adjustable."* Made-up names here, spelled as the two sources do.
 */
import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

const importTable=async (page,name,csv)=>{
  await page.locator('[data-add="table_input"]').click();
  await page.locator('#open-table').click();
  await expect(page.locator('#table-dialog')).toBeVisible();
  await page.locator('#table-file').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.locator('#table-keys')).toBeVisible();
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toBeHidden();
};

test('names spelled differently are matched, shown, decided, and the threshold is adjustable',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await importTable(page,'cases.csv','Residential District,cases,deaths\nBo District,4,0\nFalaba District,2,1\n'
    +'Kona District,3,0\nNowhere District,1,0\n');
  await importTable(page,'population.csv','district,people,households\nBo,1000,200\nFabala,800,150\nKono,900,170\nKonu,500,90\n');
  await page.locator('[data-add="relate_table"]').click();
  await page.locator('#connect-records').selectOption({index:1});
  await page.locator('#connect-related').selectOption({index:2});
  await page.locator('#configure-step').click();
  const dialog=page.locator('#relate-config');

  // THE SECOND TABLE'S COLUMN, named differently, and the comparison that allows for spelling.
  await dialog.locator('#relate-on').selectOption('Residential District');
  await dialog.locator('#relate-right-on').selectOption('district');
  await dialog.locator('#relate-compare').selectOption('spelling');
  await expect(dialog.locator('#relate-threshold')).toHaveValue('0.88');
  await dialog.locator('#relate-drop-words').fill('District');
  await dialog.locator('#relate-drop-words').press('Tab');
  // With spelling allowed, the second table's own spelling can be brought across.
  await dialog.locator('#relate-bring').selectOption('district');

  // EACH NAME, AND HOW IT MATCHED.
  const names=dialog.locator('#relate-spellings');
  const row=name=>names.locator('tr',{has:page.locator('th',{hasText:name})});
  await expect(row('Bo District')).toContainText('matched exactly');
  await expect(row('Bo District').locator('td').first()).toHaveText('bo');
  await expect(row('Falaba District')).toContainText('Fabala');
  await expect(row('Falaba District')).toContainText('matched allowing for spelling (0.');
  await expect(row('Kona District')).toContainText('ambiguous');
  await expect(row('Nowhere District')).toContainText('not found');

  // TWO EQUALLY CLOSE wait for a person; the one not found is an unmatched row, decided as any is.
  const decisions=dialog.locator('[data-config-section="decisions"]');
  await expect(decisions).toContainText('Names matching could not settle');
  await decisions.locator('[data-spelling-decide="Kona District"]').selectOption('Kono');
  await expect(row('Kona District')).toContainText('decided');
  await expect(decisions).toContainText('has no row in');
  await decisions.locator('[name="relate-decision"][value="drop"]').check();
  await dialog.locator('#config-apply').click();
  await expect(dialog).toBeHidden();

  const inspector=page.locator('#inspector-content');
  await expect(inspector.locator('.standard-sentence')).toContainText('matched on Residential District to district');
  await expect(inspector.locator('.standard-sentence')).toContainText('allowing for spelling to 0.88 with “District” dropped');
  await page.locator('[data-add="table_output"]').click();
  const relateId=await page.locator('#table-add-input option').filter({hasText:'Relate a column'}).first().getAttribute('value');
  await page.locator('#table-add-input').selectOption(relateId);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // ADJUSTABLE: at 0.99 the spelling no longer passes, and Falaba is not found.
  await page.locator('.react-flow__node[data-id^="relate_table-"]').dispatchEvent('click');
  await page.locator('#configure-step').click();
  await expect(dialog.locator('#relate-compare')).toHaveValue('spelling');
  await dialog.locator('#relate-threshold').fill('0.99');
  await dialog.locator('#relate-threshold').press('Tab');
  await expect(row('Falaba District')).toContainText('not found');
  // A threshold that is not one is refused, by name.
  await dialog.locator('#relate-threshold').fill('2');
  await dialog.locator('#relate-threshold').press('Tab');
  await expect(dialog).toContainText('a similarity from 0.5 to 1');
  await dialog.locator('#config-cancel').click();
  if(await page.locator('#config-discard').count())await page.locator('#config-discard').click();
  expect(errors).toEqual([]);
});
