import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** TWO MORE PREVIEWS THAT RESTATED THEIR SETTINGS (2026-11-25, docs/audits/preview-audit.md).
 *
 *  Regression read its plan back -- the model, the outcome, the exposure -- and never said whether a model could be
 *  fitted: that turns on how many rows carry every column the plan names. The space-time scan restated its limits as
 *  SHARES, and a share says nothing alone: "circles up to 20% of the cases" is the same sentence over 10 cases and
 *  over 10,000. Both now count from the records connected, before any run. */
const seed=async(page,flow)=>{
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.evaluate(f=>{localStorage.clear();localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(f));},flow);
  await page.goto('/');await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
};

// Ten people, two of whom never said whether they ate the vanilla: those two cannot enter a model that names it.
const person=(id,ill,vanilla,age)=>({key:{person:id,ill,vanilla},value:age});
const lineList={kind:'data-table',keys:['person','ill','vanilla'],valueField:'age',rowCount:10,missingValueCount:0,
  rows:[person('p1','yes','yes',31),person('p2','yes','yes',44),person('p3','yes','yes',29),
    person('p4','yes','no',52),person('p5','no','no',38),person('p6','no','no',61),
    person('p7','no','no',27),person('p8','no','yes',45),person('p9','yes','',33),person('p10','no','',58)]};

test('Regression previews the rows a model would be fitted on',async({page})=>{
  const errors=collectPageErrors(page);
  await seed(page,{schema:'fieldwork/workflow/1',exampleId:'blank',name:'Model',nodes:[
    {id:'cases',type:'table_input',x:20,y:20,params:{label:'Line list',keys:['person','ill','vanilla'],
      valueField:'age',data:lineList}},
    {id:'model',type:'regression',x:360,y:20,params:{label:'Illness on vanilla',family:'logistic',outcome:'ill',
      cases:['yes'],exposure:{column:'vanilla',as:'categorical'},adjust:[],errors:'profile'}}],
    edges:[{id:'e0',from:'cases',to:'model',port:'records'}]});
  await page.locator('.react-flow__node[data-id="model"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#regression-config [data-config-section="preview"]');
  await expect(preview).toBeVisible();

  // EIGHT OF TEN, because two rows are empty in the column the model names. That sentence was available before only
  // by running the workflow and reading the receipt.
  await expect(preview).toContainText('8 of 10 rows carry every column this model names');
  await expect(preview).toContainText('4 cases and 4 not');
  // The exposure's smallest level is what an estimate runs out of information on.
  await expect(preview).toContainText('vanilla has 2 levels here');
  await expect(preview).toContainText('2 rows are left out');
  await page.locator('#regression-config #config-cancel').click();
  expect(errors).toEqual([]);
});

const caseAt=(id,day,x)=>({type:'Feature',id,properties:{name:id,onset:`2024-07-${String(day).padStart(2,'0')}`},
  geometry:{type:'Point',coordinates:[x,0]}});

test('the space-time scan previews what its shares come to over the cases',async({page})=>{
  const errors=collectPageErrors(page);
  await seed(page,{schema:'fieldwork/workflow/1',exampleId:'blank',name:'Scan',nodes:[
    {id:'cases',type:'point_input',x:20,y:20,params:{label:'Cases',data:{type:'FeatureCollection',features:[
      caseAt('c1',1,0),caseAt('c2',2,0.01),caseAt('c3',3,0.02),caseAt('c4',4,0.03),caseAt('c5',5,0.04),
      caseAt('c6',6,0.05),caseAt('c7',7,0.06),caseAt('c8',8,0.07),caseAt('c9',9,0.08),caseAt('c10',10,0.09)]}}},
    {id:'scan',type:'space_time_scan',x:360,y:20,params:{label:'Clusters',dateField:'onset',unit:'day',
      maxCaseShare:0.5,maxTimeShare:0.5,replications:999,seed:42}}],
    edges:[{id:'e0',from:'cases',to:'scan',port:'points'}]});
  await page.locator('.react-flow__node[data-id="scan"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#scan-config [data-config-section="preview"]');
  await expect(preview).toBeVisible();

  // Ten cases, one a day, 1 to 10 July: the period is what the dates say, not what the settings say.
  await expect(preview).toContainText('10 cases over 10 days, 2024-07-01 to 2024-07-10');
  // AND THE SHARES IN THE UNITS OF THE THING THEY LIMIT: half of ten cases is five, half of ten days is five.
  await expect(preview).toContainText('up to 5 of those cases');
  await expect(preview).toContainText('up to 5 days');
  await page.locator('#scan-config #config-cancel').click();
  expect(errors).toEqual([]);
});
