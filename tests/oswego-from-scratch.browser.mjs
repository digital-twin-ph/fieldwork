import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** A LINE LIST REACHES A TWO-BY-TWO FROM AN EMPTY CANVAS.
 *
 *  South London's rule, applied to a second example so the widgets are not fitted to the first.
 *  Nothing here imports a bundle: the widgets are clicked out of the palette, the data is the
 *  published file beside this repository, and the numbers asserted are the file's own. */
test.use({serviceWorkers:'block'});

const LIST=fileURLToPath(new URL('../../example-1940-oswego-church-supper/data/oswego-line-list.csv',import.meta.url));
const CHURCH=fileURLToPath(new URL('../../example-1940-oswego-church-supper/geo/lycoming-church.geojson',import.meta.url));
const skip=existsSync(LIST)&&existsSync(CHURCH)?false:'example-1940-oswego-church-supper is not checked out beside this repository.';

const FOODS=['Baked ham','Spinach','Mashed potato','Cabbage salad','Jello','Rolls','Brown bread',
  'Milk','Coffee','Water','Cakes','Ice cream (vanilla)','Ice cream (chocolate)','Fruit salad'];

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const connect=async(page,from,to,port)=>{
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  // A node just added may not be drawn yet, and counting its ports then finds none.
  await expect(page.locator(`.react-flow__node[data-id="${to}"] [data-handleid]`).first()).toBeAttached();
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  await expect(source).toBeVisible();await expect(target).toBeVisible();
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
};
const tidy=async page=>{await page.locator('#tidy-button').click();await page.waitForTimeout(250);};
const wired=async(page,from,to)=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to);
/** A drag that lands, or says so. */
const wire=async(page,from,to,port)=>{
  await connect(page,from,to,port);
  await expect.poll(()=>wired(page,from,to),{message:`${from} -> ${to}`}).toBe(true);
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type,nth=0)=>(await saved(page)).nodes.filter(n=>n.type===type)[nth].id;

test('Oswego is two short workflows: which food, and where',{skip},async({page})=>{
  test.setTimeout(300_000);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('The Oswego church supper, 1940');
  await page.locator('#project-subject-input').fill('Gastroenteritis after a church supper in Lycoming, New York');
  await page.locator('#project-create').click();
  await add(page,'table_input');
  const list=await idOf(page,'table_input');
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(LIST);
  await expect(page.locator('#table-keys')).toBeVisible();
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('Age');
  const boxes=page.locator('#table-keys input');
  for(let i=0;i<await boxes.count();i++){
    const box=boxes.nth(i),name=await box.getAttribute('value');
    if(await box.isDisabled())continue;
    await box.setChecked(['ID','Ill',...FOODS].includes(name));
  }
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();
  await add(page,'two_by_two');
  const table=await idOf(page,'two_by_two');
  await tidy(page);await wire(page,list,table,'records');
  await add(page,'table_output');
  const shown=await idOf(page,'table_output');
  await tidy(page);await wire(page,table,shown,'table');
  await page.locator(`.react-flow__node[data-id="${table}"]`).click();
  await page.locator('#twobytwo-label').fill('Attack rates by food');
  await page.locator('#twobytwo-label').press('Enter');
  await page.locator('#twobytwo-rows').check();
  await page.locator('[data-slr="outcomeColumn"]').selectOption('Ill');
  for(const food of FOODS)await page.locator(`[data-twobytwo-exposure="${food}"]`).check();
  const pick=async(key,value)=>{await page.locator(`[data-slr="${key}"]`).selectOption(value);};
  await pick('exposed','Y');await pick('unexposed','N');await pick('caseValue','Y');await pick('nonCaseValue','N');
  await page.locator(`.react-flow__node[data-id="${shown}"]`).click();
  await page.locator('#table-label').fill('Attack rates by food');
  await page.locator('#table-label').press('Tab');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="results"]').click();
  const text=await page.locator('main').first().innerText();
  expect(text).toContain('14 exposures compared on one outcome');

  // THE FILE'S OWN COUNTS, computed here rather than copied from a paper.
  const rows=readFileSync(LIST,'utf8').trim().split(/\r?\n/);
  const head=rows[0].split(',');
  const people=rows.slice(1).map(line=>Object.fromEntries(line.split(',').map((v,i)=>[head[i],v])));
  const count=(food,ate,ill)=>people.filter(p=>p[food]===ate&&p.Ill===ill).length;
  const cells=(await page.locator('#result-rows tr, table tr').allInnerTexts()).filter(line=>FOODS.some(f=>line.startsWith(f)));
  for(const food of FOODS){
    const row=cells.find(line=>line.startsWith(food+'\t')||line.startsWith(food+' '))?.split(/\t/).map(v=>v.trim());
    expect(row,`${food} has no row`).toBeTruthy();
    expect(Number(row[1])).toBe(count(food,'Y','Y'));
    expect(Number(row[2])).toBe(count(food,'Y','Y')+count(food,'Y','N'));
    expect(Number(row[4])).toBe(count(food,'N','Y'));
    expect(Number(row[5])).toBe(count(food,'N','Y')+count(food,'N','N'));
  }
  await page.screenshot({path:'test-results/oswego-menu.png'});

  // THE PLACE, AS ITS OWN QUESTION. A box around the church and one point: a setting, not an analysis.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await add(page,'study_area');
  const extent=await idOf(page,'study_area');
  await page.locator(`.react-flow__node[data-id="${extent}"]`).click();
  await page.locator('#edit-study-area').click();
  const online=page.locator('#area-online');
  if(await online.count())await online.uncheck();
  await page.locator('#area-sized-box summary').click();
  await page.locator('#area-box-shape').selectOption('rectangle');
  await page.locator('#area-box-lon').fill('-76.385545');
  await page.locator('#area-box-lat').fill('43.499636');
  await page.locator('#area-box-width').fill('2000');
  await page.locator('#area-box-height').fill('2000');
  await page.locator('#area-box-create').click();
  await page.locator('#area-apply').click();
  await add(page,'point_input');
  const church=await idOf(page,'point_input');
  await page.locator(`.react-flow__node[data-id="${church}"]`).click();
  await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('geojson');
  await page.locator('#input-file').setInputFiles(CHURCH);
  await page.locator('#input-apply').click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();
  await add(page,'map_output');
  const where=await idOf(page,'map_output');
  await tidy(page);await wire(page,extent,where,'area');
  await tidy(page);await wire(page,church,where,'points');
  await page.locator(`.react-flow__node[data-id="${where}"]`).click();
  await page.locator('#map-label').fill('Lycoming');
  await page.locator('#map-label').press('Tab');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  expect((await saved(page)).nodes.length).toBe(3);

  // THE PROJECT, written where the example repository can take it when asked for.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'The Oswego church supper'}).first();
  await expect(block).toContainText('2 workflows');
  if(process.env.OSWEGO_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.OSWEGO_EXPORT);
  }
});

// STEP 2 OF THE KERNEL: THE SAME ANSWER WITHOUT THE COUNT. Three nodes, and the mapping dialog works
// before a run, because a line list needs nothing upstream to have run first.
test('a line list reaches a two-by-two directly, with nothing counted first',{skip},async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await add(page,'table_input');
  const list=await idOf(page,'table_input');
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(LIST);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('Age');
  const boxes=page.locator('#table-keys input');
  for(let i=0;i<await boxes.count();i++){
    const box=boxes.nth(i),name=await box.getAttribute('value');
    if(await box.isDisabled())continue;
    await box.setChecked(['ID','Ill',...FOODS].includes(name));
  }
  await page.locator('#table-save').click();
  await add(page,'two_by_two');
  const table=await idOf(page,'two_by_two');
  await tidy(page);await wire(page,list,table,'records');
  await add(page,'table_output');
  const shown=await idOf(page,'table_output');
  await tidy(page);await wire(page,table,shown,'table');

  await page.locator(`.react-flow__node[data-id="${table}"]`).click();
  await page.locator('#twobytwo-rows').check();
  await page.locator('#twobytwo-map').click();
  const map=async(key,value)=>{await page.locator(`[data-mapping="${key}"]`).selectOption(value);};
  await map('exposureColumn','Ice cream (vanilla)');await map('exposed','Y');await map('unexposed','N');
  await map('outcomeColumn','Ill');await map('caseValue','Y');await map('nonCaseValue','N');
  await expect(page.locator('.map-cell').first()).toContainText('43');
  await page.locator('#mapping-close').click();

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('from 54 and 21 subjects');
  await expect(page.locator('main').first()).toContainText('5.57');
  expect((await saved(page)).nodes.length).toBe(3);
});

// STEP 3: THE WHOLE MENU ON ONE NODE. The question Oswego took 43 nodes to ask, in three.
test('all 14 foods on one node give one table, in file order, unranked',{skip},async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await add(page,'table_input');
  const list=await idOf(page,'table_input');
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(LIST);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('Age');
  const boxes=page.locator('#table-keys input');
  for(let i=0;i<await boxes.count();i++){
    const box=boxes.nth(i),name=await box.getAttribute('value');
    if(await box.isDisabled())continue;
    await box.setChecked(['ID','Ill',...FOODS].includes(name));
  }
  await page.locator('#table-save').click();
  await add(page,'two_by_two');
  const table=await idOf(page,'two_by_two');
  await tidy(page);await wire(page,list,table,'records');
  await add(page,'table_output');
  const shown=await idOf(page,'table_output');
  await tidy(page);await wire(page,table,shown,'table');
  await page.locator(`.react-flow__node[data-id="${table}"]`).click();
  await page.locator('#twobytwo-rows').check();
  await page.locator('[data-slr="outcomeColumn"]').selectOption('Ill');
  for(const food of FOODS)await page.locator(`[data-twobytwo-exposure="${food}"]`).check();
  const pick=async(key,value)=>{await page.locator(`[data-slr="${key}"]`).selectOption(value);};
  await pick('exposed','Y');await pick('unexposed','N');await pick('caseValue','Y');await pick('nonCaseValue','N');
  await page.screenshot({path:'test-results/oswego-menu-panel.png'});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('14 exposures compared on one outcome');
  await page.waitForTimeout(400);
  await page.screenshot({path:'test-results/oswego-menu.png',fullPage:false});
  const text=await page.locator('main').first().innerText();
  expect(text.indexOf('Baked ham')).toBeLessThan(text.indexOf('Fruit salad'));
  expect((await saved(page)).nodes.length).toBe(3);
});
