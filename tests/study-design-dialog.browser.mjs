import {test,expect} from '@playwright/test';
import {blankWorkflow} from '../build/study-area.js';

/** THE DIALOG, FROM THE INSPECTOR TO THE FIGURE. Asked for on 2026-10-31 and absent until now. */

const row=(group,outcome,value)=>({key:{group,outcome},value});
const TABLE={kind:'data-table',keys:['group','outcome'],valueField:'n',rowCount:4,missingValueCount:0,
  rows:[row('exposed','case',30),row('exposed','well',70),row('unexposed','case',10),row('unexposed','well',90)]};

const open=async page=>{
  const w=blankWorkflow();
  w.nodes=[{id:'design',type:'study_design',x:40,y:40,
      params:{label:'Study design',design:'cohort',period:'',unitOfAnalysis:'',note:''}},
    {id:'cells',type:'table_input',x:40,y:240,
      params:{label:'Cells',keys:['group','outcome'],valueField:'n',data:TABLE}},
    {id:'tbt',type:'two_by_two',x:360,y:120,params:{label:'Two by two',exposureColumn:'group',
      exposed:'exposed',unexposed:'unexposed',outcomeColumn:'outcome',caseValue:'case',
      nonCaseValue:'well',level:95}},
    {id:'out',type:'table_output',x:680,y:120,params:{label:'The table',inputMode:'table'}}];
  w.edges=[{id:'e1',from:'cells',to:'tbt',port:'records'},{id:'e2',from:'design',to:'tbt',port:'design'},
    {id:'e3',from:'tbt',to:'out',port:'table'}];
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'design.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="design"]').click();
  await page.locator('#design-open').click();
  await expect(page.locator('#study-design-dialog')).toBeVisible();
};

const estimates=page=>page.locator('.two-by-two-estimates tbody th');

test('every design shows what it licenses before it is chosen',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  await expect(dialog.locator('[name="design-kind"]')).toHaveCount(6);
  await expect(dialog.locator('.design-choice').filter({hasText:'case-control'})).toContainText('odds ratio');
  await expect(dialog.locator('[data-design-measure]')).toHaveCount(3);
});

test('a design with fewer measures offers fewer boxes, and says what it cannot estimate',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  await dialog.locator('[value="case-control"]').check();
  await expect(dialog.locator('[data-design-measure]')).toHaveCount(1);
  await expect(dialog).toContainText('Not estimable under case-control: risk ratio, risk difference');
  await dialog.locator('#design-close').click();
  await expect(page.locator('#study-design-dialog')).toHaveCount(0);
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(estimates(page)).toHaveText(['odds ratio']);
});

test('unticking a measure removes it from the result of the next run',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  await dialog.locator('[data-design-measure="odds ratio"]').uncheck();
  await dialog.locator('#design-close').click();
  await expect(page.locator('#inspector, body')).toContainText('reports risk ratio, risk difference');
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(estimates(page)).toHaveText(['risk ratio','risk difference']);
  await expect(page.locator('.two-by-two-figure')).toContainText('Not reported: odds ratio');
});

test('with no design connected the figure names the arithmetic and says why',async({page})=>{
  const w=blankWorkflow();
  w.nodes=[{id:'cells',type:'table_input',x:40,y:240,
      params:{label:'Cells',keys:['group','outcome'],valueField:'n',data:TABLE}},
    {id:'tbt',type:'two_by_two',x:360,y:120,params:{label:'Two by two',exposureColumn:'group',
      exposed:'exposed',unexposed:'unexposed',outcomeColumn:'outcome',caseValue:'case',
      nonCaseValue:'well',level:95}},
    {id:'out',type:'table_output',x:680,y:120,params:{label:'The table',inputMode:'table'}}];
  w.edges=[{id:'e1',from:'cells',to:'tbt',port:'records'},{id:'e3',from:'tbt',to:'out',port:'table'}];
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(
    {name:'none.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(estimates(page)).toHaveText(['ratio of row proportions','cross-product ratio',
    'difference of row proportions']);
  await expect(page.locator('[data-no-design]').first()).toContainText('No study design is connected');
});
