import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// NOT A TEST OF THE SERVICE WORKER. On WebKit the reasoning worker is refused "due to access control checks" at
// startup, which fails every test in a file before any of its own assertions run (review of 0.198.0; the same
// isolation as tests/relate-proposed-keys.browser.mjs).
test.use({serviceWorkers:'block'});

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
      cases:['yes'],controls:['no'],exposure:{column:'vanilla',as:'categorical'},adjust:[],errors:'profile'}}],
    edges:[{id:'e0',from:'cases',to:'model',port:'records'}]});
  await page.locator('.react-flow__node[data-id="model"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#regression-config [data-config-section="preview"]');
  await expect(preview).toBeVisible();

  // EIGHT OF TEN, because two rows are empty in the column the model names. That sentence was available before only
  // by running the workflow and reading the receipt.
  //
  // COUNTED BY THE RUN'S OWN RULE (`regression-sample.ts`), not by "is this cell non-empty": the fit also drops an
  // outcome that is neither case nor control, a categorical written NA, and a numeric that is not a number, so
  // counting non-empty cells promised a larger sample than the run would use.
  await expect(preview).toContainText('8 of 10 rows are usable by this model');
  await expect(preview).toContainText('4 cases and 4 not');
  // AND WHY THE REST ARE OUT, in the run's own words.
  await expect(preview).toContainText('2 rows are left out: vanilla missing (2)');
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

/** NEVER A LIMIT SHORTER THAN THE SCAN CAN RUN (review of 0.197.0). `space-time-scan.ts` takes
 *  `Math.max(1, floor(bins * maxTimeShare))`, so the shortest run it ever applies is one period. The Preview used a
 *  bare floor and said "up to 0 days" of a scan that runs one-day windows: five days at a tenth floors to zero. */
test('the scan preview never reports a limit shorter than the scan would run',async({page})=>{
  const errors=collectPageErrors(page);
  await seed(page,{schema:'fieldwork/workflow/1',exampleId:'blank',name:'Short',nodes:[
    {id:'cases',type:'point_input',x:20,y:20,params:{label:'Cases',data:{type:'FeatureCollection',features:[
      caseAt('c1',1,0),caseAt('c2',2,0.01),caseAt('c3',3,0.02),caseAt('c4',4,0.03),caseAt('c5',5,0.04)]}}},
    {id:'scan',type:'space_time_scan',x:360,y:20,params:{label:'Clusters',dateField:'onset',unit:'day',
      maxCaseShare:0.5,maxTimeShare:0.1,replications:999,seed:42}}],
    edges:[{id:'e0',from:'cases',to:'scan',port:'points'}]});
  await page.locator('.react-flow__node[data-id="scan"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#scan-config [data-config-section="preview"]');
  await expect(preview).toContainText('5 cases over 5 days');
  await expect(preview).toContainText('up to 1 day');
  await expect(preview).not.toContainText('up to 0 days');
  await page.locator('#scan-config #config-cancel').click();
  expect(errors).toEqual([]);
});

/** THE DRAFT'S INPUT TYPE, NOT THE SAVED CONNECTION (review of 0.198.0). Switching Cases by period from points to a
 *  table left the Preview counting the points still connected — a reading of records that Apply would discard along
 *  with the connection. What the reader is looking at is the draft. */
const dated=(id,day,x)=>({type:'Feature',id,properties:{name:id,onset:`2024-07-0${day}`},
  geometry:{type:'Point',coordinates:[x,0]}});

test('Cases by period previews the input type being chosen, not the one connected',async({page})=>{
  const errors=collectPageErrors(page);
  await seed(page,{schema:'fieldwork/workflow/1',exampleId:'blank',name:'Switch',nodes:[
    {id:'cases',type:'point_input',x:20,y:20,params:{label:'Cases',data:{type:'FeatureCollection',
      features:[dated('c1',1,0),dated('c2',2,0.01)]}}},
    {id:'series',type:'case_series',x:360,y:20,params:{label:'By day',dateField:'onset',dateKind:'onset',
      period:'day'}}],
    edges:[{id:'e0',from:'cases',to:'series',port:'points'}]});
  await page.locator('.react-flow__node[data-id="series"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#series-config [data-config-section="preview"]');
  await expect(preview).toContainText('2 cases in 2 days');

  // SWITCHED TO A TABLE, with no table connected: the count must go, and what is needed must be named. It kept
  // counting the points until this was fixed.
  await page.locator('#series-config #series-input').selectOption('table');
  await expect(preview).toContainText('Connect the table of cases');
  await expect(preview).not.toContainText('2 cases in 2 days');

  // AND BACK: the points are still there, so the count returns.
  await page.locator('#series-config #series-input').selectOption('points');
  await expect(preview).toContainText('2 cases in 2 days');
  await page.locator('#series-config #config-cancel').click();
  expect(errors).toEqual([]);
});

/** ONE SAMPLE PER MODEL, AND THE FIT'S OWN READING OF A CELL (review of 0.198.0). With several exposure columns the
 *  run fits one model each, every model leaving out only the rows ITS variables are missing on; the Preview reported
 *  the first exposure's sample as though it were all of them. And a whitespace-padded `yes` passed the exclusion
 *  rule as a case — which trims — and was then counted as a non-case by the summary, which did not. */
const padded=(id,ill,vanilla,chocolate,age)=>({key:{person:id,ill,vanilla,chocolate},value:age});
const twoExposures={kind:'data-table',keys:['person','ill','vanilla','chocolate'],valueField:'age',
  rowCount:4,missingValueCount:0,
  rows:[padded('p1','yes','yes','yes',31),padded('p2',' yes ','no','no',44),
    padded('p3','no','yes','',29),padded('p4','no','no','NA',52)]};

test('Regression previews each model’s own sample, and reads a cell as the fit reads it',async({page})=>{
  const errors=collectPageErrors(page);
  await seed(page,{schema:'fieldwork/workflow/1',exampleId:'blank',name:'Models',nodes:[
    {id:'cases',type:'table_input',x:20,y:20,params:{label:'Line list',
      keys:['person','ill','vanilla','chocolate'],valueField:'age',data:twoExposures}},
    {id:'model',type:'regression',x:360,y:20,params:{label:'Two exposures',family:'logistic',outcome:'ill',
      cases:['yes'],controls:['no'],exposure:{column:'vanilla',as:'categorical'},
      exposureColumns:['vanilla','chocolate'],adjust:[],errors:'profile'}}],
    edges:[{id:'e0',from:'cases',to:'model',port:'records'}]});
  await page.locator('.react-flow__node[data-id="model"]').click();
  await page.locator('#configure-step').click();
  const preview=page.locator('#regression-config [data-config-section="preview"]');
  await expect(preview).toBeVisible();

  // Chocolate loses two rows — one empty, one written NA — where vanilla loses none.
  await expect(preview).toContainText('One model per exposure column, each on its own rows');
  await expect(preview).toContainText('vanilla 4');
  await expect(preview).toContainText('chocolate 2');

  // AND " yes " IS A CASE, as the fit reads it: two cases, not one.
  await expect(preview).toContainText('2 cases and 2 not');
  await page.locator('#regression-config #config-cancel').click();
  expect(errors).toEqual([]);
});
