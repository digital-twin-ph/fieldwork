import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** SHARES WITHIN GROUPS, IN THE STANDARD DIALOG (experiments 186 and 191). A line list of eight cases, counted by
 *  classification and by what was recorded, each group with its share within its classification. */
test.use({serviceWorkers:'block'});
const line=(n,classification,symptoms)=>Array.from({length:n},(_,i)=>({key:{id:`${classification}-${symptoms}-${i}`,classification,symptoms},value:1}));
const rows=[...line(3,'by the clinician','none'),...line(1,'by the clinician','some'),...line(4,'by symptoms','all')];
const data={kind:'data-table',keys:['id','classification','symptoms'],valueField:'case',rows,rowCount:rows.length,missingValueCount:0};
const workflow={schema:'fieldwork/workflow/1',name:'Shares',exampleId:'blank',nodes:[
  {id:'t',type:'table_input',x:40,y:40,params:{label:'Line list',keys:data.keys,valueField:'case',data}},
  {id:'g',type:'group_table',x:340,y:40,params:{label:'Total within groups',by:[]}},
  {id:'o',type:'table_output',x:640,y:40,params:{label:'Classification',inputMode:'table'}}],
  edges:[{id:'e1',from:'t',to:'g',port:'records'},{id:'e2',from:'g',to:'o',port:'table'}]};

test('Total within groups: six sections, the settings in Configure…, and each group\'s share beside its count',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('.react-flow__node[data-id="g"]').click();
  for(const section of ['name','inputs','settings','result'])
    await expect(page.locator(`[data-standard-section="${section}"]`)).toBeVisible();
  await expect(page.locator('.inspector .standard-sentence')).toContainText('Choose the key columns to keep');
  await page.locator('#configure-step').click();
  const dialog=page.locator('#group-config');
  await dialog.locator('[data-group-by="classification"]').check();
  await dialog.locator('[data-group-by="symptoms"]').check();
  await dialog.locator('#group-aggregate').selectOption('count');
  await dialog.locator('#group-share').check();
  await dialog.locator('[data-group-within="classification"]').check();
  const preview=dialog.locator('[data-config-section="preview"]');
  await expect(preview).toContainText('8 rows into 3 groups, each with its % within classification');
  await expect(preview.locator('.group-preview').locator('thead')).toContainText('% within classification');
  await expect(preview.locator('.group-preview').locator('tr').filter({hasText:'none'})).toContainText('75');
  await dialog.screenshot({path:'test-results/group-shares.png'});
  await dialog.locator('#config-apply').click();
  await expect(page.locator('.inspector .standard-sentence')).toContainText("Counts the rows that agree on classification and symptoms, with each group's share within classification, %.");
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="g"]').click();
  await expect(page.locator('[data-standard-section="result"]')).toContainText('8 rows counted into 3 within classification and symptoms');
  await expect(page.locator('[data-standard-section="result"]')).toContainText('of the total within classification, as a percentage to one decimal place');
  // Cancel writes nothing.
  await page.locator('#configure-step').click();
  await dialog.locator('#group-share').uncheck();
  await dialog.locator('#config-cancel').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='g').params);
  expect(saved).toMatchObject({by:['classification','symptoms'],aggregate:'count',share:{within:['classification']}});
  expect(errors).toEqual([]);
});
