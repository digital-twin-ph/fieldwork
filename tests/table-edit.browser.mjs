import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** EDITING A TABLE'S VALUES INLINE, IN DATA QUALITY (experiment 214). A misspelled district corrected and an empty count
 *  filled, each recorded on the step with the value it replaced, applied when the rows are handed on, stated in the run,
 *  and taken back by Remove. The file is not changed. */
test.use({serviceWorkers:'block'});
const csv='district,cases\nBo Distrct,12\nKenema,\nKailahun,7\n';

test('a value corrected and an empty one filled in Data quality: recorded, applied, stated, and removable',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const id=(await saved()).nodes.find(n=>n.type==='table_input').id;
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles({name:'districts.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('cases');
  await page.locator('#table-keys input[value="district"]').check();
  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toHaveCount(0);

  await page.locator('#table-quality').click();
  const quality=page.locator('#data-quality');
  await quality.getByRole('tab',{name:'Records'}).click();
  const cell=(record,column)=>quality.locator(`[data-edit-record="${record}"][data-edit-column="${column}"]`);
  await expect(cell('row 1','district')).toHaveValue('Bo Distrct');
  await cell('row 1','district').fill('Bo District');await cell('row 1','district').press('Enter');
  await expect(cell('row 1','district')).toHaveValue('Bo District');
  await expect(cell('row 2','cases')).toHaveValue('');
  await cell('row 2','cases').fill('9');await cell('row 2','cases').press('Enter');
  await quality.getByRole('tab',{name:'Edits (2)'}).click();
  await expect(quality.locator('[data-quality-edits]')).toContainText('“Bo Distrct” → “Bo District”');
  await expect(quality).toContainText('2 values edited by hand on this step, 1 of them filling an empty cell');
  const node=(await saved()).nodes.find(n=>n.id===id);
  expect(node.params.edits.map(e=>[e.version,e.record,e.column,e.from,e.to])).toEqual([[1,'row 1','district','Bo Distrct','Bo District'],[2,'row 2','cases',null,'9']]);
  await quality.locator('#data-quality-close').click();

  // HANDED ON EDITED, AND SAID.
  await page.locator('#node-library [data-add="table_output"]').click();
  const out=(await saved()).nodes.find(n=>n.type==='table_output').id;
  await page.locator(`.react-flow__node[data-id="${out}"]`).click();
  await page.locator('[data-map-port="table"],#table-add-input,#map-add-layer').first().selectOption(id);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('Bo District');
  // EDITED CELLS ARE MARKED where the rows are shown (the practitioner, 2026-11-13: "Can edited cells show up differently
  // when viewing tables?"), with what they were on hover; the others are not.
  const marked=page.locator('#data-table-view td[data-cell-edited]');
  await expect(marked).toHaveCount(2);
  await expect(marked.first()).toHaveAttribute('title','Edited by hand, version 1: was \u201cBo Distrct\u201d');
  await expect(marked.nth(1)).toHaveAttribute('title','Edited by hand, version 2: was not recorded');
  await page.locator('[data-view="rules"]').click();
  const n3=page.locator('#n3-preview');
  await expect(n3).toContainText('fw:CellEdit');
  await expect(n3).toContainText('fw:valueBefore "Bo Distrct"; fw:valueAfter "Bo District"');
  await expect(n3).toContainText('fw:filledEmptyCell "true"');
  await expect(n3).toContainText('fw:editVersion "2"');

  // TAKEN BACK, AS A VERSION: the value read is back, and the history keeps both edits (the practitioner, 2026-11-13:
  // "The edit should be reversible and also versioned").
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#table-quality').click();
  await quality.getByRole('tab',{name:'Edits (2)'}).click();
  await quality.locator('[data-remove-edit="1"]').click();
  await quality.getByRole('tab',{name:'Records'}).click();
  await expect(cell('row 1','district')).toHaveValue('Bo Distrct');
  await quality.getByRole('tab',{name:'Edits (1)'}).click();
  const history=quality.locator('[data-edit-history]');
  await expect(history).toContainText('Version 3: took back version 1');
  await expect(history).toContainText('Version 1: district of row 1');
  // RESTORED: version 2's values, the misspelling corrected again, as version 4.
  await history.locator('[data-restore-version="2"]').click();
  await expect(quality.locator('[data-edit-history]')).toContainText('Version 4: restored version 2');
  await quality.getByRole('tab',{name:'Records'}).click();
  await expect(cell('row 1','district')).toHaveValue('Bo District');
  // AND AS IMPORTED, version 0, as version 5.
  await quality.getByRole('tab',{name:'Edits (2)'}).click();
  await quality.locator('[data-restore-version="0"]').click();
  await quality.getByRole('tab',{name:'Records'}).click();
  await expect(cell('row 1','district')).toHaveValue('Bo Distrct');
  await expect(cell('row 2','cases')).toHaveValue('');
  expect((await saved()).nodes.find(n=>n.id===id).params.edits.length).toBe(5);
  expect(errors).toEqual([]);
});
