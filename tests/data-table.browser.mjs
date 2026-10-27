import {test,expect} from '@playwright/test';

// A projection-shaped extract: one row per site, scenario, year and quantile, keyed on the
// official PSGC code rather than a place name, with one value absent from the source.
const csv='psgc_code,scenario,year,quantile,value_m\n'
  +'1380100000,ssp126,2050,0.5,0.21\n'
  +'1380100000,ssp126,2100,0.5,0.52\n'
  +'1380100000,ssp585,2050,0.5,0.24\n'
  +'1380100000,ssp585,2100,0.5,0.77\n'
  +'0303500000,ssp126,2050,0.5,0.19\n'
  +'0303500000,ssp585,2100,0.5,\n';

test('Tabular data imports a long-format extract, displays it and replays offline',async({page,context})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});

  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="table_input"]').click();
  await expect(page.locator('.inspector')).toContainText('none chosen');
  await expect(page.locator('.inspector')).toContainText('None; a table is not a point set');
  await expect(page.locator('.inspector')).toContainText('cannot run until a table is imported');

  await page.locator('#open-table').click();
  await expect(page.locator('#table-dialog')).toBeVisible();
  await expect(page.locator('#table-save')).toBeDisabled();

  await page.locator('#table-file').setInputFiles({name:'ph-slr-psgc.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.locator('#table-keys')).toBeVisible();

  // THE IMPORT ASSUMES WIDE from 2026-10-27 -- "we have to assume wide in as default, that's the
  // epidemiology mindset" -- and this extract is long. It is detected and reported rather than
  // converted: a wide table has a column per variable, and only `value_m` is left to be one here.
  // Nothing is read in the other shape until the button is pressed.
  await expect(page.locator('#table-shape-alert')).toBeVisible();
  await expect(page.locator('#table-shape-says')).toContainText('already in LONG format');
  await expect(page.locator('#table-save')).toBeDisabled();
  await page.locator('#table-shape-accept').click();
  await expect(page.locator('#table-shape-alert')).toBeHidden();

  // The value column is proposed, not assumed: the remaining columns become the key.
  await expect(page.locator('#table-value')).toHaveValue('value_m');
  await expect(page.locator('#table-status')).toContainText('6 rows, 4 key columns, 1 values absent');

  // WHAT THE PRACTITIONER SEES IS THEIR OWN DATA, before and after, not a description of the
  // reading. These assertions stood on `#table-preview`, a collapsed <details> holding
  // `JSON.stringify({sourceFile, readAs, subjectKeys, ...})`, and passed for as long as the blob
  // contained the right words. "Epidemiologists will not open a JSON blob, that's friction for
  // them" -- 2026-10-27.
  await expect(page.locator('#table-check')).toBeVisible();
  // Before: the file's own headers and its own cells.
  await expect(page.locator('#table-before')).toContainText('ph-slr-psgc.csv');
  await expect(page.locator('#table-before')).toContainText('psgc_code');
  await expect(page.locator('#table-before')).toContainText('value_m');
  // After: the table that will be imported.
  await expect(page.locator('#table-after table')).toBeVisible();
  // And the reconciliation, in numbers a reader can check against the two panes.
  await expect(page.locator('#table-reconcile')).toContainText('6 rows');
  await expect(page.locator('#table-reconcile')).toContainText('already long');
  await expect(page.locator('#table-reconcile')).toContainText('No unit stated');

  // Dropping a key column makes the remaining key repeat, which is refused rather than
  // collapsed: two different projections would otherwise share one row.
  await page.locator('#table-keys input[value="year"]').uncheck();
  await expect(page.locator('#table-error')).toContainText('share the key');
  await expect(page.locator('#table-save')).toBeDisabled();
  await page.locator('#table-keys input[value="year"]').check();
  await expect(page.locator('#table-save')).toBeEnabled();

  await page.locator('#table-unit').fill('metre');
  await page.locator('#table-unit').blur();
  await expect(page.locator('#table-reconcile')).toContainText('in metre, as you stated it');

  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toBeHidden();
  await expect(page.locator('.inspector')).toContainText('ph-slr-psgc.csv');
  await expect(page.locator('.inspector')).toContainText('6 rows, 1 values absent and kept as unknown');
  const shape=await page.locator('.inspector pre').first().textContent();
  expect(shape).toContain('"valueField": "value_m"');
  expect(shape).toContain('"unit": "metre"');

  await page.locator('#add-table-view').click();
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-tabs')).toContainText('Imported table',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('6 rows');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('1 values absent');
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('value in metre');

  const grid=page.locator('#data-table-view');
  await expect(grid).toBeVisible();
  await expect(grid.locator('thead')).toContainText('psgc_code');
  await expect(grid.locator('thead')).toContainText('value_m');
  await expect(grid.locator('tbody tr')).toHaveCount(6);
  // The absent value is shown as unknown in its own cell, never as zero.
  await expect(grid.locator('tbody tr').last().locator('td').last()).toHaveText('unknown');
  await expect(grid.locator('tbody tr').nth(0).locator('td').last()).toHaveText('0.21');

  await page.locator('[data-view="results"]').click();
  await page.locator('#result-search').fill('0303500000');
  await expect(grid.locator('tbody tr')).toHaveCount(2);
  await expect(grid.locator('.table-meta')).toContainText('2 of 6 rows');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-search').fill('');
  await expect(grid.locator('tbody tr')).toHaveCount(6);

  // The displayed table is a presentation of an imported table, with no geometry claimed.
  await page.locator('[data-view="rules"]').click();
  await expect(page.locator('#n3-preview')).toContainText('fw:TabularInput');
  await expect(page.locator('#n3-preview')).toContainText('fw:valueUnitStatus "stated"');
  await expect(page.locator('#n3-preview')).toContainText('fw:TableView');
  await page.locator('[data-view="workflow"]').click();

  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:45000});
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node').filter({hasText:'Tabular data'})).toContainText('6 rows');
  await page.screenshot({path:'test-results/table-input.png',fullPage:true});
});

// WHAT THIS TEST USED TO SAY, kept because it dates the change: until 2026-10-27 it was called
// "a table that is not long format is refused with a recoverable draft", and its comment read
// "a wide table carries one column per year -- nothing can detect that from the file alone".
// Both are now false. The import assumes wide, reads it, and the CSV below is the very shape it
// used to refuse. What survives unchanged is the second half: the refusals the contract CAN
// state, and that a cancelled dialog leaves a draft rather than a broken node.
test('a wide table imports, and the refusals each shape can state still hold',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="table_input"]').click();
  await page.locator('#open-table').click();

  // One column per year: two value columns, so it is wide and is read as wide with no alert.
  await page.locator('#table-file').setInputFiles({name:'wide.csv',mimeType:'text/csv',
    buffer:Buffer.from('psgc_code,y2050,y2100\n1380100000,0.21,0.52\n0303500000,0.19,0.44\n')});
  await expect(page.locator('#table-keys')).toBeVisible();
  await expect(page.locator('#table-shape-alert')).toBeHidden();
  await expect(page.locator('#table-status')).toContainText('2 subjects');
  await expect(page.locator('#table-status')).toContainText('4 rows');
  await expect(page.locator('#table-save')).toBeEnabled();

  // A column cannot be both the subject and a variable of it. Reflected in the controls -- the
  // value box for a key column is disabled -- and refused underneath either way.
  await expect(page.locator('#table-values input[value="y2050"]')).toBeEnabled();
  await page.locator('#table-keys input[value="y2050"]').check();
  await expect(page.locator('#table-values input[value="y2050"]')).toBeDisabled();
  await page.locator('#table-keys input[value="y2050"]').uncheck();

  // In LONG mode the old refusal is unchanged: one value column, and it cannot also be a key.
  await page.locator('#table-shape').selectOption('long');
  await expect(page.locator('#table-value')).toBeVisible();
  await page.locator('#table-value').selectOption('psgc_code');
  await expect(page.locator('#table-error')).toContainText('cannot also be a key');
  await expect(page.locator('#table-save')).toBeDisabled();

  // A value that is not a number is not read as one, in either shape.
  await page.locator('#table-file').setInputFiles({name:'text.csv',mimeType:'text/csv',
    buffer:Buffer.from('psgc_code,scenario,value_m,value_b\n1380100000,ssp126,high,2\n')});
  await expect(page.locator('#table-keys')).toBeVisible();
  await expect(page.locator('#table-error')).toContainText('nonnumeric value "high"');
  await page.locator('#table-cancel').click();
  await expect(page.locator('.inspector')).toContainText('cannot run until a table is imported');
});
