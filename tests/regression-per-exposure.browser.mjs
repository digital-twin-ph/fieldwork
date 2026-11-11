/** ONE REGRESSION, ONE MODEL PER SHIFT. Experiment 185, stage 2: the Inspector offers Relate's shift columns as more
 *  exposures, each ticked column is its own model on its own rows, and the models come out as one table. */
import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {cases,satellite} from './fixtures/lag-weeks.mjs';

const input=(id,label,table,y)=>({id,type:'table_input',x:40,y,params:{label,keys:table.keys,valueField:table.valueField,data:table}});
const workflow={schema:'fieldwork/workflow/1',name:'Cases and temperature weeks earlier',exampleId:'blank',outputId:'shown',
  nodes:[input('cases','Weekly cases',cases,40),input('sat','Land surface temperature',satellite,220),
    {id:'lags',type:'relate_table',x:320,y:120,params:{label:'Temperature at each shift',on:'municipio',bring:'LST_Day_1km',
      within:{date:'data_iniSE',start:'period_start',end:'period_end'},shifts:[0,-7,-14,7]}},
    {id:'models',type:'regression',x:600,y:120,params:{label:'Cases on temperature',family:'poisson',outcome:'casos',
      exposure:{column:'LST_Day_1km_0d',as:'numeric'},adjust:[],strata:'municipio',errors:'overdispersed'}},
    {id:'shown',type:'table_output',x:880,y:120,params:{label:'Rate ratios at each shift'}},
    {id:'plot',type:'chart_output',x:880,y:300,params:{label:'Rate ratio at each shift'}}],
  edges:[{id:'e1',from:'cases',to:'lags',port:'records'},{id:'e2',from:'sat',to:'lags',port:'related'},
    {id:'e3',from:'lags',to:'models',port:'records'},{id:'e4',from:'models',to:'shown',port:'table'},
    {id:'e5',from:'models',to:'plot',port:'records'}]};
const upload=page=>page.locator('#workflow-file').setInputFiles({name:'lags.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(workflow))});
const run=async page=>{await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});};

test('the shift columns are offered as more exposures, and each ticked one is its own model',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await upload(page);
  await run(page);
  await page.locator('.react-flow__node[data-id="models"]').click();
  const also=page.locator('#reg-exposures');
  await expect(also.locator('legend')).toHaveText('Also fit, one model each, with');
  // The other shifts are offered; the exposure itself, the outcome and the strata are not.
  for(const c of ['LST_Day_1km_-7d','LST_Day_1km_-14d','LST_Day_1km_+7d'])
    await expect(also.locator(`input[value="${c}"]`)).toBeVisible();
  for(const c of ['LST_Day_1km_0d','casos','municipio'])await expect(also.locator(`input[value="${c}"]`)).toHaveCount(0);
  for(const c of ['LST_Day_1km_-7d','LST_Day_1km_-14d','LST_Day_1km_+7d']){
    await page.locator(`#reg-exposures input[value="${c}"]`).check();
    await expect(page.locator(`#reg-exposures input[value="${c}"]`)).toBeChecked();
  }
  // AN ADJUSTMENT CAN FOLLOW THE SHIFT once there are several models.
  await page.locator('#reg-adjust-add').selectOption('mes');
  await expect(page.locator('[data-reg-follow="mes"]')).toHaveCount(1);
  await page.locator('[data-reg-adjust-remove="mes"]').click();
  // The chart is offered the models' keys, the shift among them, before any run.
  await page.locator('.react-flow__node[data-id="plot"]').click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#chart-key-column option[value="shift_days"]')).toHaveCount(1);
  await page.locator('#config-cancel').click();
  await run(page);
  await page.locator('[data-view="results"]').click();
  const results=page.locator('#results, main').first();
  await expect(results).toContainText('4 Poisson regressions of casos, one per exposure column and each on its own rows');
  await expect(results).toContainText('none adjusted for the number of comparisons');
  await expect(results).toContainText('shift_days');
  // Unticking all but the exposure goes back to the single model.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="models"]').click();
  for(const c of ['LST_Day_1km_-7d','LST_Day_1km_-14d','LST_Day_1km_+7d'])
    await page.locator(`#reg-exposures input[value="${c}"]`).uncheck();
  await run(page);
  await page.locator('[data-view="results"]').click();
  await expect(results).toContainText('Poisson regression of casos on LST_Day_1km_0d');
  expect(errors).toEqual([]);
});
