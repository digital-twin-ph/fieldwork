import {test,expect} from './fixtures.mjs';
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
  await expect(dialog.locator('[name="design-kind"]')).toHaveCount(5);
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

test('the dialog pages through a design, keeps text on Next, and ends on the checklist',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  const next=dialog.locator('#design-next'),back=dialog.locator('#design-back');
  const onto=async id=>{for(let i=0;i<20&&!(await dialog.locator(`[data-question="${id}"]`).count());i++)await next.click();};
  await expect(back).toBeDisabled();
  await dialog.locator('[name="design-kind"][value="case-control"]').check();
  await expect(dialog.locator('#design-page')).toHaveText('Page 1 of 13');
  await next.click();
  await expect(dialog.locator('[data-question]')).toHaveCount(1);
  await dialog.locator('[data-question="SRC"] input[value="SRC.1"]').check();
  await expect(dialog.locator('#design-page')).toHaveText('Page 2 of 24');
  // TYPED AND NEVER LEFT: Next has to commit it, or the sentence is lost.
  await dialog.locator('[data-slot="system"]').fill('PIDSR');
  await next.click();
  await back.click();
  await expect(dialog.locator('[data-slot="system"]')).toHaveValue('PIDSR');
  await expect(dialog.locator('.design-sentence')).toHaveText('Cases came from PIDSR, a surveillance system.');
  await onto('CC3');
  await expect(dialog.locator('[data-question="C1"]')).toHaveCount(0);
  await onto('S1');
  await expect(dialog.locator('[data-question="S1"]')).toBeVisible();
  for(let i=0;i<20&&await next.isEnabled();i++)await next.click();
  await expect(next).toBeDisabled();
  await expect(dialog.locator('[data-check="computation"]')).toHaveAttribute('data-status','done');
  await expect(dialog.locator('[data-check="SRC"]')).toHaveAttribute('data-status','done');
  await expect(dialog.locator('[data-check="CC3"]')).toHaveAttribute('data-status','open');
  await dialog.locator('#design-close').click();
  await expect(page.locator('#design-checklist-summary')).toContainText('Checklist:');
  await page.locator('#run-button').click();
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('.two-by-two-estimates tbody th')).toHaveText(['odds ratio']);
});

test('Escape keeps text still in its box',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  await dialog.locator('[name="design-kind"][value="case-control"]').check();
  await dialog.locator('#design-next').click();
  await dialog.locator('input[value="SRC.2"]').check();
  await dialog.locator('[data-slot="survey"]').fill('NDHS');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.locator('#design-open').click();
  await dialog.locator('#design-next').click();
  await expect(dialog.locator('[data-slot="survey"]')).toHaveValue('NDHS');
});

test('South London: the cohort table is named on page 2, and its sentence survives Next',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  await dialog.locator('#design-next').click();
  await expect(dialog.locator('#design-table')).toBeVisible();
  await expect(dialog.locator('td.design-fixed summary b')).toHaveText(['a+b','c+d']);
  await dialog.locator('[data-table-field="exposed"]').fill('Southwark and Vauxhall Company');
  await dialog.locator('[data-table-field="unexposed"]').fill('Lambeth Company');
  await dialog.locator('[data-table-field="outcome"]').fill('a death from cholera');
  await dialog.locator('[data-cell="a"] summary').click();
  await dialog.locator('[data-cell-counts="a"]').fill('deaths');
  await dialog.locator('[data-cell-source="a"]').fill('the Registrar General');
  await dialog.locator('[data-cell="b"] summary').click();
  await dialog.locator('[data-cell-derived="b"]').check();
  await expect(dialog.locator('[data-cell-source="b"]')).toBeDisabled();
  await dialog.locator('[data-cell="a+b"] summary').click();
  await dialog.locator('[data-cell-source="a+b"]').fill('a return to Parliament');
  await dialog.locator('#design-next').click();
  await expect(dialog.locator('[data-question="SRC"]')).toBeVisible();
  await dialog.locator('#design-back').click();
  await expect(dialog.locator('thead [data-table-show="outcome"]')).toHaveText('a death from cholera');
  await expect(dialog.locator('#design-table-sentence')).toContainText('a+b came from a return to Parliament.');
  await expect(dialog.locator('#design-table-sentence')).toContainText('a counts deaths.');
  await expect(dialog.locator('[data-cell-summary="a"]')).toHaveText('deaths');
  await expect(dialog.locator('input[type="number"]')).toHaveCount(0);
});

test('the table page, read at dialog and phone width',async({page})=>{
  await open(page);
  const dialog=page.locator('#study-design-dialog');
  await dialog.locator('#design-next').click();
  await dialog.locator('[data-cell="a"] summary').click();
  await expect(dialog.locator('[data-cell="a"] .design-cell-column')).toBeHidden();
  await page.screenshot({path:process.env.DESIGN_SHOT||test.info().outputPath('wide.png')});
  await page.setViewportSize({width:390,height:844});
  const overflow=await dialog.evaluate(d=>d.scrollWidth-d.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(dialog.locator('[data-cell="a"] .design-cell-column')).toBeVisible();
  await expect(dialog.locator('[data-cell="b"] .design-cell-column')).toHaveText('no outcome');
  await page.screenshot({path:process.env.DESIGN_SHOT_NARROW||test.info().outputPath('narrow.png')});
});
