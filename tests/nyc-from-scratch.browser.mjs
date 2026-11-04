import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';

/** NYC CHILD ASTHMA AND OZONE, 2016–2025, FROM AN EMPTY CANVAS, with the table fetched from where it is published.
 *
 *  The counts belong to NYC DOHMH and are not redistributed, so the example's repository holds no rows: the table
 *  is fetched from the authors' Zenodo package (experiment 170). This test answers that URL from a local copy of
 *  the package named by NYC_PKG, and is skipped without one, because the package cannot be shipped beside the
 *  tests either. NYC_REAL fetches from Zenodo itself, for the export the example repository takes. */
test.use({serviceWorkers:'block'});

const ZENODO='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
const ENTRY='NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0/Data/Core/Derived/analysis_master_raw_rebuild.csv';
const local=process.env.NYC_PKG;
const skip=process.env.NYC_REAL||(local&&existsSync(local))?false:'Set NYC_PKG to a local copy of the Zenodo package, or NYC_REAL=1.';
const JUNE=Array.from({length:14},(_,i)=>`2023-06-${String(i+1).padStart(2,'0')}`);

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const newest=async(page,type)=>(await saved(page)).nodes.filter(n=>n.type===type).at(-1).id;
const named=async(page,name)=>{
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill(name);
  await page.locator('#workflow-name-edit').press('Enter');
  await page.locator('[data-view="workflow"]').click();
};
const select=async(page,node)=>page.locator(`.react-flow__node[data-id="${node}"]`).click();
const wire=async(page,from,to,port)=>{
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to)).toBe(true);
};
/** The daily table, fetched from the package rather than chosen from a disk. */
const fetchTable=async page=>{
  await add(page,'table_input');
  const table=await newest(page,'table_input');
  await select(page,table);
  await page.locator('#open-table').click();
  await page.locator('#table-remote summary').click();
  await page.locator('#table-url').fill(ZENODO);
  await page.locator('#table-fetch').click();
  await expect(page.locator('#table-entry')).toBeVisible({timeout:120000});
  await page.locator('#table-entry').selectOption(ENTRY);
  await expect(page.locator('#table-keys')).toBeVisible({timeout:30000});
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('count');
  // ABOUT 100 COLUMNS, MOSTLY LAGS, all ticked by default, and each untick rebuilds a 3,653-row preview: seconds a
  // column. Set in one go with one rebuild, and recorded in TODO as friction a practitioner meets too.
  await page.evaluate(keep=>{
    const boxes=[...document.querySelectorAll('#table-keys input[type=checkbox]')];
    for(const box of boxes)if(!box.disabled)box.checked=keep.includes(box.value);
    boxes.find(box=>!box.disabled)?.dispatchEvent(new Event('change',{bubbles:true}));
  },['date','o3','pm25','no2','tmean']);
  await page.locator('[data-key-role="date"]').selectOption('primary');
  await page.locator('#table-save').click();
  await expect.poll(async()=>(await saved(page)).nodes.find(n=>n.id===table).params.remote?.entry,{timeout:30000}).toBe(ENTRY);
  return table;
};
const run=async page=>{
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="results"]').click();
};

test('two questions about child asthma visits in New York City, the table fetched from Zenodo',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(600_000);
  if(!process.env.NYC_REAL){
    const bytes=readFileSync(local);
    await page.route(ZENODO,route=>route.fulfill({status:200,body:bytes,headers:{'access-control-allow-origin':'*'}}));
  }
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ozone and child asthma emergency visits, New York City');
  await page.locator('#project-subject-input').fill('Daily counts, ages 5 to 17, 2016 to 2025');
  await page.locator('#project-create').click();

  // 1. THE JUNE 2023 SMOKE DAYS. Two weeks, a bar a day, and the table with ozone and PM2.5 beside it.
  await named(page,'What happened during the June 2023 smoke?');
  {
    const table=await fetchTable(page);
    // ONE NODE AT A TIME: Tidy can stack unconnected nodes, which is a known fault in TODO.
    await add(page,'select_rows');const days=await newest(page,'select_rows');
    await page.locator('#tidy-button').click();
    await wire(page,table,days,'records');
    await select(page,days);
    await page.locator('#select-key').selectOption('date');
    for(const day of JUNE)await page.locator(`[data-select-value="${day}"]`).check();
    await add(page,'chart_output');const chart=await newest(page,'chart_output');
    await select(page,chart);
    await page.locator('#chart-records').selectOption(days);
    await page.locator('#output-label').fill('Asthma ED visits, ages 5 to 17, 1 to 14 June 2023');
    await page.locator('#output-label').press('Tab');
    await add(page,'table_output');const shown=await newest(page,'table_output');
    await select(page,shown);
    await page.locator('#table-table').selectOption(days);
    await page.locator('#table-label').fill('The smoke days, with ozone and PM2.5');
    await page.locator('#table-label').press('Tab');
    await run(page);
    const text=await page.locator('main').first().innerText();
    expect(text).toContain('2023-06-07');
    await page.screenshot({path:'test-results/nyc-smoke.png'});
    await page.locator('[data-view="workflow"]').click();await page.locator('#tidy-button').click();
  }

  // 2. TEN YEARS OF DAILY VISITS, as a table to read through.
  await page.locator('#add-workflow').click();
  await named(page,'Ten years of daily visits');
  {
    const table=await fetchTable(page);
    await add(page,'table_output');const shown=await newest(page,'table_output');
    await page.locator('#tidy-button').click();
    await select(page,shown);
    await page.locator('#table-table').selectOption(table);
    await page.locator('#table-label').fill('Daily asthma ED visits and exposures, 2016 to 2025');
    await page.locator('#table-label').press('Tab');
    await run(page);
    await expect(page.locator('main').first()).toContainText('3,653');
    await page.locator('[data-view="workflow"]').click();await page.locator('#tidy-button').click();
  }

  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Ozone and child asthma'}).first();
  await expect(block).toContainText('2 workflows');
  if(process.env.NYC_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.NYC_EXPORT);
  }
});
