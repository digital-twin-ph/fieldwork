import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** NIGERIA FROM AN EMPTY CANVAS, one question to a workflow. South London's rule again, on a third
 *  shape: 774 parts, modelled estimates, no comparison between groups. */
test.use({serviceWorkers:'block'});
const EXAMPLE=new URL('../../example-2024-nigeria-immunization/',import.meta.url);
const file=name=>fileURLToPath(new URL(name,EXAMPLE));
const skip=existsSync(file('geo/nga-lgas.geojson'))?false:'example-2024-nigeria-immunization is not checked out beside this repository.';

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type,nth=0)=>(await saved(page)).nodes.filter(n=>n.type===type)[nth].id;
const tidy=async page=>{await page.locator('#tidy-button').click();await page.waitForTimeout(250);};
const wire=async(page,from,to,port)=>{
  await expect(page.locator(`.react-flow__node[data-id="${to}"] [data-handleid]`).first()).toBeAttached();
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to),
    {message:`${from} -> ${to}`}).toBe(true);
};

const named=async(page,name)=>{
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill(name);
  await page.locator('#workflow-name-edit').press('Enter');
  await page.locator('[data-view="workflow"]').click();
};
const importTable=async(page,csv,shape,value,keys)=>{
  await add(page,'table_input');
  const nodes=(await saved(page)).nodes.filter(n=>n.type==='table_input');
  const table=nodes.at(-1).id;
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(file(csv));
  await expect(page.locator('#table-keys')).toBeVisible();
  if(shape==='long'){
    await page.locator('#table-shape').selectOption('long');
    await page.locator('#table-value').selectOption(value);
  }
  const boxes=page.locator('#table-keys input');
  for(let i=0;i<await boxes.count();i++){
    const box=boxes.nth(i),name=await box.getAttribute('value');
    if(await box.isDisabled())continue;
    await box.setChecked(keys.includes(name));
  }
  if(shape==='wide'){
    const values=page.locator('#table-values input');
    for(let i=0;i<await values.count();i++){
      const box=values.nth(i),name=await box.getAttribute('value');
      if(await box.isDisabled())continue;
      await box.setChecked(value.includes(name));
    }
  }
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();
  return table;
};
const importLgas=async page=>{
  await add(page,'polygon_input');
  const area=await idOf(page,'polygon_input');
  await page.locator(`.react-flow__node[data-id="${area}"]`).click();
  await page.locator('#polygon-file').setInputFiles(file('geo/nga-lgas.geojson'));
  await page.locator('#polygon-name-field').fill('ID');
  await page.locator('#polygon-name-field').press('Tab');
  await page.locator('#polygon-layer-name').fill('Local Government Areas');
  await page.locator('#polygon-layer-name').press('Tab');
  await page.locator('#polygon-apply').click();
  await expect(page.locator('[data-review-polygons]')).toBeVisible({timeout:60000});
  return area;
};
/** The last two steps of every question here: put the values on the LGAs, and draw them. */
const joinAndMap=async(page,from,area,title)=>{
  await add(page,'join_table_to_area');
  const join=await idOf(page,'join_table_to_area');
  await tidy(page);await wire(page,from,join,'records');
  await tidy(page);await wire(page,area,join,'polygons');
  await add(page,'map_output');
  const map=await idOf(page,'map_output');
  await tidy(page);await wire(page,join,map,'polygons');
  await page.locator(`.react-flow__node[data-id="${join}"]`).click();
  await page.locator('#join-key').selectOption('ID');
  await page.locator('#join-normalisation').selectOption('exact');
  await page.locator(`.react-flow__node[data-id="${map}"]`).click();
  await page.locator('#map-label').fill(title);
  await page.locator('#map-label').press('Tab');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('774 of 774 parts carry a value');
};

test('three questions about 774 LGAs, each its own short workflow',{skip},async({page})=>{
  test.setTimeout(300_000);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('DTP coverage and zero-dose children in Nigeria');
  await page.locator('#project-subject-input').fill('Modelled estimates for 774 LGAs, WorldPop');
  await page.locator('#project-create').click();

  // 1. WHERE IS COVERAGE LOWEST? 4 nodes.
  await named(page,'Where is DTP1 coverage lowest?');
  let area=await (async()=>{
    const table=await importTable(page,'data/nga-lga-2024.csv','long','mean_dtp1',['ID']);
    const lgas=await importLgas(page);
    await joinAndMap(page,table,lgas,'DTP1 coverage, 2024');
    return lgas;
  })();
  expect((await saved(page)).nodes.length).toBe(4);

  // 2. WHERE IS THE BURDEN HIGHEST? 4 nodes, and it need not be the same places.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await named(page,'Where are the most zero-dose children?');
  {
    const table=await importTable(page,'data/nga-lga-2024.csv','long','zd_est',['ID']);
    area=await importLgas(page);
    await joinAndMap(page,table,area,'Zero-dose children, 2024');
    await page.waitForTimeout(800);
    await page.screenshot({path:'test-results/nga-zd.png'});
  }

  // 3. WHAT CHANGED? 6 nodes: 2,322 rows, because three years were read together.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await named(page,'What changed from 2018 to 2024?');
  {
    const table=await importTable(page,'data/nga-lga-dtp1-by-year.csv','wide',
      ['dtp1_2018','dtp1_2021','dtp1_2024'],['ID']);
    await add(page,'derive_value');
    const derive=await idOf(page,'derive_value');
    await tidy(page);await wire(page,table,derive,'records');
    await page.locator(`.react-flow__node[data-id="${derive}"]`).click();
    const pick=async(key,value)=>{await page.locator(`[data-slr="${key}"]`).selectOption(value);};
    await pick('keyColumn','measure');await pick('left','dtp1_2024');await pick('right','dtp1_2018');
    await page.locator('[data-slr="name"]').fill('change 2018 to 2024');
    await page.locator('[data-slr="name"]').press('Tab');
    await add(page,'select_rows');
    const select=await idOf(page,'select_rows');
    await tidy(page);await wire(page,derive,select,'records');
    await page.locator(`.react-flow__node[data-id="${select}"]`).click();
    await page.locator('[data-select-value="change 2018 to 2024"]').check();
    area=await importLgas(page);
    await joinAndMap(page,select,area,'Change in DTP1 coverage, 2018 to 2024');
    await page.waitForTimeout(800);
    await page.screenshot({path:'test-results/nga-change.png'});
    expect((await saved(page)).nodes.length).toBe(6);
  }

  // 4. WHICH LGAS ARE BOTH? Two joins make one record with both values, and a rule reads the record
  // as it would a row of a GeoDataFrame. The thresholds are the specification's illustration.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await named(page,'Which LGAs have low coverage and a high burden?');
  {
    const coverage=await importTable(page,'data/nga-lga-2024.csv','long','mean_dtp1',['ID']);
    area=await importLgas(page);
    await add(page,'join_table_to_area');
    const first=await idOf(page,'join_table_to_area',0);
    await tidy(page);await wire(page,coverage,first,'records');
    await tidy(page);await wire(page,area,first,'polygons');
    await page.locator(`.react-flow__node[data-id="${first}"]`).click();
    await page.locator('#join-key').selectOption('ID');
    await page.locator('#join-normalisation').selectOption('exact');
    const burden=await importTable(page,'data/nga-lga-2024.csv','long','zd_est',['ID']);
    await add(page,'join_table_to_area');
    const second=await idOf(page,'join_table_to_area',1);
    await tidy(page);await wire(page,burden,second,'records');
    await tidy(page);await wire(page,first,second,'polygons');
    await page.locator(`.react-flow__node[data-id="${second}"]`).click();
    await page.locator('#join-key').selectOption('ID');
    await page.locator('#join-normalisation').selectOption('exact');

    await add(page,'apply_ruleset');
    const rules=await idOf(page,'apply_ruleset');
    await page.locator(`.react-flow__node[data-id="${rules}"]`).click();
    await page.locator('#author-rules').click();
    await page.locator('#rule-editor-cancel').click();
    await page.locator('#ruleset-records').selectOption('polygons');
    await tidy(page);await wire(page,second,rules,'subjects');
    await page.locator(`.react-flow__node[data-id="${rules}"]`).click();
    await page.locator('#edit-rules').click();
    const dialog=page.locator('#rule-editor');
    await expect(dialog).toBeVisible();
    // A NUMBER STATES ITS UNIT before a rule may compare it. Declared in the panel, as a person would.
    await dialog.locator('#rule-editor-cancel').click();
    for(const [index,unit] of [[0,'proportion'],[1,'children']]){
      const box=page.locator(`[data-field-unit="${index}"]`);
      await box.fill(unit);await box.press('Tab');
    }
    await page.locator('#edit-rules').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('#rule-editor-add').click();
    const card=()=>dialog.locator('.rule-card').last();
    const setValue=async(n,value)=>{const box=card().locator('[data-part="value"]').nth(n);await box.fill(value);await box.press('Tab');};
    await card().locator('[data-part="field"]').selectOption('fwa:meanDtp1');
    await card().locator('[data-part="comparator"]').selectOption('lessThan');
    await setValue(0,'0.7');
    await card().locator('[data-part="add-condition"]').click();
    await card().locator('[data-part="field"]').nth(1).selectOption('fwa:zdEst');
    await card().locator('[data-part="comparator"]').nth(1).selectOption('greaterThan');
    await setValue(1,'5000');
    await card().locator('[data-part="predicate"]').fill('review');
    await card().locator('[data-part="predicate"]').press('Tab');
    await card().locator('[data-part="conclusion"]').fill('Priority for data review');
    await card().locator('[data-part="conclusion"]').press('Tab');
    await page.screenshot({path:'test-results/nga-rule-editor.png'});
    await dialog.locator('#rule-editor-keep').click();
    await expect(dialog).toBeHidden();
    await add(page,'map_output');
    const map=await idOf(page,'map_output');
    await tidy(page);await wire(page,rules,map,'polygons');
    await page.locator(`.react-flow__node[data-id="${map}"]`).click();
    await page.locator('#map-label').fill('Low coverage and high burden, 2024');
    await page.locator('#map-label').press('Tab');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    await page.locator('[data-view="results"]').click();
    await page.waitForTimeout(1200);
    await page.screenshot({path:'test-results/nga-priority.png'});
    // THE CLASS ON THE MAP, against the source: 127 LGAs meet both conditions, counted from the file
    // by hand and asserted in the example's README.
    const fills=await page.locator('svg path[fill]').evaluateAll(paths=>{
      const counts={};
      for(const path of paths){const fill=path.getAttribute('fill');counts[fill]=(counts[fill]||0)+1;}
      return counts;});
    expect(Object.values(fills),JSON.stringify(fills)).toContain(127);
    expect((await saved(page)).nodes.length).toBe(7);
  }

  await page.locator('[data-view="workflow"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'DTP coverage and zero-dose'}).first();
  await expect(block).toContainText('4 workflows');
  await page.screenshot({path:'test-results/nga-project.png'});
  if(process.env.NIGERIA_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.NIGERIA_EXPORT);
  }
});
