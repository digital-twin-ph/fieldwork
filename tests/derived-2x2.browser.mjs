/** The 2x2 South London argues from, computed in the application rather than imported as an answer.
 *
 *  Until 2026-10-26 nothing here could derive a value from two others, so the contingency table
 *  was prepared somewhere else and read in. That was recorded as a validation limit of 0.12.0
 *  rather than fixed, which is the thing a worked example cannot carry: the table that holds the
 *  argument was not reproducible in the tool that draws it.
 *
 *  Two steps do it on the Table IX already on that canvas -- derive `houses without a death`,
 *  then keep it beside `deaths` and drop `houses`, which is the total the pair partitions. The
 *  row totals are the check: they must come out as the published house counts.
 */
import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('the water-company 2x2 is derived from Table IX rather than imported as an answer',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText('imported with 6 workflows',{timeout:30000});

  await page.locator('[data-view="workflow"]').click();
  const water=page.locator('#workflow-select option',{hasText:'Deaths per house, by water company'});
  await page.locator('#workflow-select').selectOption(await water.getAttribute('value'));

  // The assumption travels on the node, where a reader meets it, not in a footnote.
  await expect(page.locator('.react-flow__node[data-id="survivors"]'))
    .toContainText('at most one per house');

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  await page.locator('[data-view="results"]').click();
  await page.locator('#result-tabs').getByText('Houses with and without a cholera death').click();

  // A grid, because both axes are categories: three suppliers against two outcomes.
  const grid=page.getByRole('table').filter({hasText:'houses without a death'});
  await expect(grid).toContainText('1263');
  await expect(grid).toContainText('38783');  // 40,046 houses less 1,263 deaths
  await expect(grid).toContainText('26009');  // 26,107 less 98
  // `houses` was the total the pair partitions, and selecting the two outcomes dropped it as a
  // COLUMN -- 40,046 reappears below as a row total, which is the arithmetic working.
  // supplier | deaths | houses without a death | Total -- and no bare `houses` column.
  await expect(grid.locator('thead th')).toHaveCount(4);

  // THE MARGINS, which is what an epidemiologist reads first. Table IX states no unit -- as
  // imported it mixes houses with deaths -- so the output carries the claim that these two
  // measures count the same thing, and the figure says underneath that somebody asserted it.
  await expect(grid).toContainText('Total');
  await expect(grid).toContainText('40046');  // 1,263 + 38,783, the published house count
  await expect(grid).toContainText('26107');  // 98 + 26,009
  await expect(page.locator('#data-table-view'))
    .toContainText('told these values count the same thing');
  expect(errors).toEqual([]);
});
