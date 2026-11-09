import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

/** SELECT ROWS BY VALUE, OVER A COLUMN WITH 60 DATES. The practitioner, 2026-11-03, ticking fourteen days
 *  out of 3,653 for the NYC smoke workflow: *"this is not frictionless"*. A range keeps from and to; a long
 *  list can be searched, and the search survives the re-render a tick causes. */
test.use({serviceWorkers:'block'});

const DAYS=Array.from({length:60},(_,i)=>new Date(Date.UTC(2023,4,1)+i*86_400_000).toISOString().slice(0,10));
const CSV='date,visits\n'+DAYS.map((day,i)=>`${day},${20+i}`).join('\n')+'\n';

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const newest=async(page,type)=>(await saved(page)).nodes.filter(n=>n.type===type).at(-1).id;
const select=async(page,node)=>page.locator(`.react-flow__node[data-id="${node}"]`).click();
const wire=async(page,from,to,port)=>{
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  // A port a Map or Table does not draw is reached through its one "add" port, as a practitioner would.
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to)).toBe(true);
};
const node=async(page,id)=>(await saved(page)).nodes.find(n=>n.id===id);

test('a range of dates is two fields, and a long list of values can be searched',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Sixty days');
  await page.locator('#project-create').click();

  await add(page,'table_input');const table=await newest(page,'table_input');
  await select(page,table);
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles({name:'days.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)});
  await expect(page.locator('#table-keys')).toBeVisible();
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('visits');
  await page.locator('#table-save').click();
  await add(page,'select_rows');const days=await newest(page,'select_rows');
  await page.locator('#tidy-button').click();await page.waitForTimeout(400);
  await page.locator('.react-flow__controls-fitview, [aria-label="fit view"]').first().click().catch(()=>{});
  await page.waitForTimeout(250);
  await wire(page,table,days,'records');
  await select(page,days);
  // THE SETTINGS ARE IN THE STANDARD DIALOG (experiment 186): nothing reaches the step until Apply.
  await page.locator('#configure-step').click();
  const dialog=page.locator('#select-config');
  await expect(dialog).toBeVisible();
  await dialog.locator('#select-key').selectOption('date');

  // THE LIST, searched. Sixty boxes, narrowed to June's first ten by typing.
  await expect(dialog.locator('[data-select-value]')).toHaveCount(60);
  await dialog.locator('#select-filter').fill('2023-06-0');
  await expect(dialog.locator('label.check:visible [data-select-value]')).toHaveCount(9);
  await dialog.locator('[data-select-value="2023-06-03"]').check();
  // The tick rebuilt the dialog's body; the search is still what was typed, and still applied.
  await expect(dialog.locator('#select-filter')).toHaveValue('2023-06-0');
  await expect(dialog.locator('label.check:visible [data-select-value]')).toHaveCount(9);
  await expect(dialog.locator('.select-preview-count')).toContainText('Keeps 1 of 60 rows; 59 left out.');
  await dialog.locator('#select-filter').fill('');
  await dialog.locator('#select-ticked-only').check();
  await expect(dialog.locator('label.check:visible [data-select-value]')).toHaveCount(1);
  // Nothing is written before Apply.
  expect((await node(page,days)).params.values).toEqual([]);
  await dialog.locator('#config-apply').click();
  await expect(dialog).toBeHidden();
  await expect.poll(async()=>(await node(page,days)).params.values).toEqual(['2023-06-03']);
  await expect(page.locator('#inspector-content .standard-sentence')).toHaveText('Keeps the rows whose date is 2023-06-03.');

  // THE RANGE. Offered because every value is a date, and two fields replace fourteen ticks.
  await page.locator('#configure-step').click();
  await dialog.locator('#select-mode').selectOption('range');
  await expect(dialog.locator('#select-from')).toHaveAttribute('type','date');
  await expect(dialog.locator('#select-from')).toHaveAttribute('min','2023-05-01');
  await dialog.locator('#select-from').fill('2023-06-01');await dialog.locator('#select-from').press('Tab');
  await dialog.locator('#select-to').fill('2023-06-14');await dialog.locator('#select-to').press('Tab');
  await expect(dialog.locator('.select-preview-count')).toContainText('Keeps 14 of 60 rows');
  await dialog.locator('#config-apply').click();
  await expect.poll(async()=>(await node(page,days)).params.range).toEqual({from:'2023-06-01',to:'2023-06-14'});
  // The ticked values are kept, so going back loses nothing.
  expect((await node(page,days)).params.values).toEqual(['2023-06-03']);
  await expect(page.locator('#inspector-content .standard-sentence')).toHaveText('Keeps the rows with date from 2023-06-01 to 2023-06-14, both ends included.');

  await add(page,'table_output');const shown=await newest(page,'table_output');
  await select(page,shown);
  await page.locator('#table-add-input').selectOption(days);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  const text=await page.locator('main').first().innerText();
  expect(text).toContain('2023-06-14');
  expect(text).not.toContain('2023-06-15');
  expect(text).not.toContain('2023-05-31');
  // The receipt says what was kept, as a range, with both ends included.
  await page.locator('[data-view="rules"]').click();
  const download=page.waitForEvent('download');await page.locator('#download-evidence').click();
  const evidence=JSON.parse(await readFile(await (await download).path(),'utf8'));
  const receipt=evidence.receipts.find(r=>r.nodeId===days);
  expect(receipt.method).toBe('kept date from 2023-06-01 to 2023-06-14, both ends included');
  expect([receipt.kept,receipt.dropped]).toEqual([14,46]);
  // The Inspector's Result says the same, in one line.
  await page.locator('[data-view="workflow"]').click();
  await select(page,days);
  await expect(page.locator('[data-standard-section="result"] .standard-result')).toHaveText('14 of 60 rows kept; 46 left out.');

});
