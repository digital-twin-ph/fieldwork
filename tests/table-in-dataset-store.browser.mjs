import {test,expect} from '@playwright/test';

/** A TABLE'S ROWS ARE KEPT IN THE DATASET STORE, not inside the saved workflow (experiment 175). The practitioner,
 *  2026-11-04: *"We need to move tables to IndexedDB"*, before raising the 20,000-row cap: inline, NYC's 92-column wide
 *  read had already failed to save. */
test.use({serviceWorkers:'block'});

const ROWS=5000;
const CSV='date,site,visits\n'+Array.from({length:ROWS},(_,i)=>`2020-01-${String(i%28+1).padStart(2,'0')},s${i},${i%50}`).join('\n')+'\n';

test('a table is saved by reference, comes back whole after a reload, and runs',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles({name:'many.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)});
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('visits');
  await page.locator('#table-save').click();
  await expect(page.locator('#table-save')).toBeHidden();

  // Saved: a reference, no rows, and a small stored workflow.
  const stored=await page.evaluate(()=>{const raw=localStorage.getItem('fieldwork-workflow-v1');
    const node=JSON.parse(raw).nodes.find(n=>n.type==='table_input');
    return {ref:node.params.dataRef,inline:node.params.data!==undefined,bytes:raw.length};});
  expect(stored.ref).toMatch(new RegExp(`^table-${ROWS}-[0-9a-f]{16}$`));
  expect(stored.inline,'the rows are not inside the saved workflow').toBe(false);
  expect(stored.bytes).toBeLessThan(20_000);

  // Back after a reload, whole.
  await page.reload();
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await expect(page.locator('.inspector')).toContainText(`${ROWS.toLocaleString('en-US')} rows`);
  await page.locator('#node-library [data-add="table_output"]').click();
  const shown=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_output').id);
  await page.locator(`.react-flow__node[data-id="${shown}"]`).click();
  await page.locator('#table-table').selectOption(id);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
});
