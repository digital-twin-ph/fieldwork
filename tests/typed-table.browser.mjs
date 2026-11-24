import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';

// A SHORT TABLE NOBODY PUBLISHED. The practitioner, 2026-11-23, composing a species list to join against a larger
// table: *"Can we add a table (CSV) builder as a sixth tab in Tabular input?"*, *"What if we make the CSV editor a
// free text so I can type columns and rows?"*, *"It should actually give a preview of the table as I type"*, and
// *"That sixth tab should end up with an export to CSV so it gets saved in the users laptop"*.
const openTyped=async page=>{
  await page.goto('/?example=blank');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Tabular data'}).first().click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#table-dialog, dialog[open]').first()).toBeVisible();
  await page.locator('#table-tab-typed').click();
  await expect(page.locator('#table-typed')).toBeVisible();
};
const says=page=>page.locator('#table-typed-says').innerText();

test('a short table is typed, previewed as it is read, and saved as CSV',async({page})=>{
  await openTyped(page);
  // TYPED, COMMA SEPARATED: counted as you type, and drawn as a table.
  await page.locator('#table-typed').fill('species,family\nEidolon helvum,Pteropodidae\nMops condylurus,Molossidae');
  await expect.poll(()=>says(page)).toContain('2 columns, 2 rows');
  await expect.poll(()=>says(page)).toContain('comma separated');
  const head=await page.locator('#table-typed-preview th').allInnerTexts();
  assert.deepEqual(head.map(h=>h.trim()),['species','family']);
  const first=await page.locator('#table-typed-preview tbody tr').first().locator('td').allInnerTexts();
  assert.deepEqual(first.map(c=>c.trim()),['Eidolon helvum','Pteropodidae']);

  // A RAGGED ROW IS NAMED, with the line, rather than padded.
  await page.locator('#table-typed').fill('species,family\nEidolon helvum,Pteropodidae\nMops condylurus,Molossidae,extra');
  await expect.poll(()=>says(page)).toContain('Line 3');
  await expect(page.locator('#table-typed-preview table')).toHaveCount(0);
  await expect(page.locator('#table-typed-save')).toBeDisabled();

  // PASTED FROM A SPREADSHEET IS TABS, and reads the same way.
  await page.locator('#table-typed').fill('species\tfamily\nEidolon helvum\tPteropodidae');
  await expect.poll(()=>says(page)).toContain('tab separated');
  await expect.poll(()=>says(page)).toContain('2 columns, 1 row');

  // SAVED TO THE LAPTOP, as Fieldwork read it: commas, whatever was typed.
  const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('#table-typed-save').click()]);
  const stream=await download.createReadStream();
  const text=await new Promise(done=>{let out='';stream.on('data',c=>out+=c);stream.on('end',()=>done(out));});
  assert.equal(text.trim(),'species,family\nEidolon helvum,Pteropodidae');
});

test('a typed table becomes the step’s table, through the path a file takes',async({page})=>{
  await openTyped(page);
  await page.locator('#table-typed').fill('species,records\nEidolon helvum,55\nHypsignathus monstrosus,50\nEpomops franqueti,45');
  await expect.poll(()=>says(page)).toContain('2 columns, 3 rows');
  // THE SAME DIALOG A FILE MEETS: the key columns and the value column are offered below the tabs, from the text.
  await expect(page.locator('#table-keys')).toBeVisible({timeout:15000});
  const keys=await page.locator('#table-keys label').allInnerTexts();
  assert.deepEqual(keys.map(k=>k.trim()),['species','records'],`the typed columns are offered: ${keys.join(' | ')}`);
  // Wide, as a line list reads: species is the subject, records is the variable taken.
  await page.locator('#table-keys input[value="records"]').uncheck().catch(()=>{});
  await page.locator('#table-keys input[value="species"]').check();
  await page.locator('#table-values input[value="records"]').check().catch(()=>{});
  await expect(page.locator('#table-save')).toBeEnabled({timeout:15000});
  await page.locator('#table-save').click();
  await expect(page.locator('dialog[open]')).toHaveCount(0,{timeout:15000});
  const made=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.type==='table_input').params);
  // Three records reached the workflow. The rows themselves are held by digest in the dataset store rather than
  // inline in the node, so what the node carries is the source's count.
  assert.equal(made.source.rows,3,'three records reached the workflow');
  assert.ok(made.source.sha256,'the typed rows are stored by digest, as an imported file is');
  // The subject is the practitioner's choice; `measure` beside it is the melt, which is internal and never shown.
  assert.ok(made.keys.includes('species'),`species is the subject: ${made.keys.join(', ')}`);
});

test('reopening a typed table shows the text it was made from',async({page})=>{
  await openTyped(page);
  await page.locator('#table-typed').fill('species,records\nEidolon helvum,55\nMops condylurus,23');
  await expect.poll(()=>says(page)).toContain('2 columns, 2 rows');
  await expect(page.locator('#table-keys')).toBeVisible({timeout:15000});
  await page.locator('#table-keys input[value="records"]').uncheck().catch(()=>{});
  await page.locator('#table-keys input[value="species"]').check();
  await page.locator('#table-values input[value="records"]').check().catch(()=>{});
  await expect(page.locator('#table-save')).toBeEnabled({timeout:15000});
  await page.locator('#table-save').click();
  await expect(page.locator('dialog[open]')).toHaveCount(0,{timeout:15000});
  // REOPENED: the text is there to change, not an empty box asking for it again.
  await page.locator('#configure-step').click();
  await expect(page.locator('#table-typed')).toHaveValue('species,records\nEidolon helvum,55\nMops condylurus,23');
});
