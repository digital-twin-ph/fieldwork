import {test,expect} from '@playwright/test';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** A CASE-CONTROL STUDY FROM AN EMPTY CANVAS: Łuczyńska et al., Salmonella Braenderup, Germany 2021.
 *
 *  Three questions, each a short workflow. The numbers asserted are counted from the published files
 *  here, and the paper's own odds ratios are adjusted for age and sex, so these crude ones are not
 *  expected to equal them. The April control counts match the paper's Table 3. */
test.use({serviceWorkers:'block'});

const file=name=>fileURLToPath(new URL(`../../example-2021-salmonella-germany/data/${name}`,import.meta.url));
const COMPLETE='Complete_dataset_Luczynska_et_al_2022.csv',MATCHED='FM_HuGo_controls_Luczynska_et_al_2022.csv';
const skip=existsSync(file(COMPLETE))?false:'example-2021-salmonella-germany is not checked out beside this repository.';
const MELONS=['galiamelo','cantmelo','honigmelo','wamelo','andmelo','melone'];
const APRIL=MELONS.map(m=>`${m}_apr2`),JULY=MELONS.map(m=>`${m}2`);

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type,nth=0)=>(await saved(page)).nodes.filter(n=>n.type===type)[nth].id;
const tidy=async page=>{await page.locator('#tidy-button').click();await page.waitForTimeout(250);};
const wire=async(page,from,to,port)=>{
  await expect(page.locator(`.react-flow__node[data-id="${to}"] [data-handleid]`).first()).toBeAttached();
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to&&e.port===port),
    {message:`${from} -> ${to}`}).toBe(true);
};
const named=async(page,name)=>{
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill(name);
  await page.locator('#workflow-name-edit').press('Enter');
  await page.locator('[data-view="workflow"]').click();
};
/** A line list, read long, every column it needs a label column, age as the value. */
const importList=async(page,name,columns)=>{
  await add(page,'table_input');
  const node=(await saved(page)).nodes.filter(n=>n.type==='table_input').at(-1).id;
  await page.locator(`.react-flow__node[data-id="${node}"]`).click();
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(file(name));
  await expect(page.locator('#table-keys')).toBeVisible();
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('alter');
  const boxes=page.locator('#table-keys input');
  for(let i=0;i<await boxes.count();i++){
    const box=boxes.nth(i),column=await box.getAttribute('value');
    if(await box.isDisabled())continue;
    await box.setChecked(['id','fall',...columns].includes(column));
  }
  await page.locator('#table-save').click();
  return node;
};
/** A case-control design, declared in the dialog, connected to the two-by-two. */
const caseControl=async(page,tbt)=>{
  await add(page,'study_design');
  const design=(await saved(page)).nodes.filter(n=>n.type==='study_design').at(-1).id;
  await tidy(page);await wire(page,design,tbt,'design');
  await page.locator(`.react-flow__node[data-id="${design}"]`).click();
  await page.locator('#design-open').click();
  await page.locator('#study-design-dialog [value="case-control"]').check();
  await page.locator('#design-close').click();
};
const compare=async(page,tbt,label,columns,caseValue,nonCaseValue)=>{
  await page.locator(`.react-flow__node[data-id="${tbt}"]`).click();
  await page.locator('#twobytwo-label').fill(label);
  await page.locator('#twobytwo-label').press('Enter');
  await page.locator('#twobytwo-rows').check();
  await page.locator('[data-slr="outcomeColumn"]').selectOption('fall');
  for(const column of columns)await page.locator(`[data-twobytwo-exposure="${column}"]`).check();
  const pick=async(key,value)=>{await page.locator(`[data-slr="${key}"]`).selectOption(value);};
  await pick('exposed','1');await pick('unexposed','0');await pick('caseValue',caseValue);await pick('nonCaseValue',nonCaseValue);
};
const show=async(page,from,label)=>{
  await add(page,'table_output');
  const shown=(await saved(page)).nodes.filter(n=>n.type==='table_output').at(-1).id;
  await tidy(page);await wire(page,from,shown,'table');
  await page.locator(`.react-flow__node[data-id="${shown}"]`).click();
  await page.locator('#table-label').fill(label);
  await page.locator('#table-label').press('Tab');
};
const run=async page=>{
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="results"]').click();
};

// THE FILE'S OWN COUNTS, for the four cells of one exposure against one control group.
const parse=name=>{const [head,...rows]=readFileSync(file(name),'utf8').trim().split(/\r?\n/).map(line=>
  line.split(',').map(v=>v.replace(/^"|"$/g,'')));return rows.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])));};
const cells=(cases,controls,column)=>[cases.filter(r=>r[column]==='1').length,controls.filter(r=>r[column]==='1').length,
  cases.filter(r=>r[column]==='0').length,controls.filter(r=>r[column]==='0').length];
const rowOf=async(page,column)=>{
  const lines=await page.locator('table tr').allInnerTexts();
  return lines.find(line=>line.split('\t')[0].trim()===column)?.split('\t').map(v=>v.trim());
};

test('three questions about a Salmonella outbreak, each its own short workflow',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(600_000);
  const all=parse(COMPLETE),matched=parse(MATCHED);
  const cases=all.filter(r=>r.fall==='1'),classical=all.filter(r=>r.fall==='0');
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Salmonella Braenderup and melons, Germany 2021');
  await page.locator('#project-subject-input').fill('A case-control study with two control groups');
  await page.locator('#project-create').click();

  // 1. WHICH MELON, AGAINST CLASSICAL CONTROLS? The week after Easter, near the cases' onset.
  await named(page,'Which melon, against classical controls?');
  {
    const list=await importList(page,COMPLETE,APRIL);
    await add(page,'two_by_two');const tbt=await idOf(page,'two_by_two');
    await tidy(page);await wire(page,list,tbt,'records');
    await caseControl(page,tbt);
    await compare(page,tbt,'Melons, April, classical controls',APRIL,'1','0');
    await show(page,tbt,'Melons against classical controls, April');
    await run(page);
    await expect(page.locator('main').first()).toContainText('6 exposures compared on one outcome');
    const galia=await rowOf(page,'galiamelo_apr2');
    expect(galia,'galiamelo_apr2 has a row').toBeTruthy();
    expect(galia.slice(1,5).map(Number)).toEqual(cells(cases,classical,'galiamelo_apr2'));
    await page.locator('[data-view="workflow"]').click();await tidy(page);
  }

  // 2. AGAINST THE 81 MATCHED PANEL CONTROLS, as the paper compares them. The cases are kept from the
  // complete file and the matched controls appended from theirs, with a new key, because 110 rows of
  // the complete file have the id "NA".
  await page.locator('#add-workflow').click();
  await named(page,'Which melon, against matched panel controls?');
  {
    const list=await importList(page,COMPLETE,APRIL);
    await add(page,'select_rows');const select=await idOf(page,'select_rows');
    await tidy(page);await wire(page,list,select,'records');
    await page.locator(`.react-flow__node[data-id="${select}"]`).click();
    await page.locator('#select-key').selectOption('fall');
    await page.locator('[data-select-value="1"]').check();
    const panel=await importList(page,MATCHED,APRIL);
    await add(page,'append_rows');const append=await idOf(page,'append_rows');
    await tidy(page);await wire(page,select,append,'records');
    await tidy(page);await wire(page,panel,append,'records_2');
    await page.locator(`.react-flow__node[data-id="${append}"]`).click();
    await page.locator('#append-name-source').check();
    await page.locator('#append-first').fill('cases');await page.locator('#append-first').press('Tab');
    await page.locator('#append-second').fill('matched panel controls');await page.locator('#append-second').press('Tab');
    await page.locator('#append-new-key').check();
    await add(page,'two_by_two');const tbt=await idOf(page,'two_by_two');
    await tidy(page);await wire(page,append,tbt,'records');
    await caseControl(page,tbt);
    await compare(page,tbt,'Melons, April, matched panel controls',APRIL,'1','0');
    await show(page,tbt,'Melons against matched panel controls, April');
    await run(page);
    const galia=await rowOf(page,'galiamelo_apr2');
    expect(galia.slice(1,5).map(Number)).toEqual(cells(cases,matched,'galiamelo_apr2'));
    const params=(await saved(page)).nodes.find(n=>n.id===append).params;
    expect(params).toMatchObject({nameSource:true,sourceColumn:'source',newKey:'row'});
    await page.locator('[data-view="workflow"]').click();await tidy(page);
  }

  // 3. JULY AGAINST APRIL. The same comparison over the week before each control's interview.
  await page.locator('#add-workflow').click();
  await named(page,'Does the week asked about change the answer?');
  {
    const list=await importList(page,COMPLETE,JULY);
    await add(page,'two_by_two');const tbt=await idOf(page,'two_by_two');
    await tidy(page);await wire(page,list,tbt,'records');
    await caseControl(page,tbt);
    await compare(page,tbt,'Melons, July, classical controls',JULY,'1','0');
    await show(page,tbt,'Melons against classical controls, July');
    await run(page);
    const galia=await rowOf(page,'galiamelo2');
    expect(galia.slice(1,5).map(Number)).toEqual(cells(cases,classical,'galiamelo2'));
    await page.locator('[data-view="workflow"]').click();await tidy(page);
  }

  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Salmonella Braenderup'}).first();
  await expect(block).toContainText('3 workflows');
  if(process.env.SALMONELLA_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.SALMONELLA_EXPORT);
  }
});
