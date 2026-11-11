import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// The same widget over one table: rows repeating the primary key, one exact copy and one pair that
// disagrees, decided in the dialog. The rules are pinned in deduplicate-table.test.mjs.
const csv='ID,Food,Age\n1,Y,30\n1,Y,30\n2,N,40\n2,Y,40\n3,N,50\n';

test('rows repeating a primary key: the copy merges, and the disagreement is decided by a person',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  const rows=csv.trim().split('\n').slice(1).map(line=>line.split(','));
  const findings=[{kind:'repeated-key',rows:[1,2],value:'ID=1',text:'Rows 1, 2 repeat ID=1.'},
    {kind:'repeated-key',rows:[3,4],value:'ID=2',text:'Rows 3, 4 repeat ID=2.'}];
  const data={kind:'data-table',keys:['ID','Food'],valueField:'Age',primaryKey:['ID'],findings,
    rows:rows.map(([ID,Food,Age])=>({key:{ID,Food},value:Number(Age)})),rowCount:rows.length,missingValueCount:0};
  const table='list',dedup='dedup',shown='shown';
  const held={schema:'fieldwork/workflow/1',name:'Rows that repeat a key',nodes:[
    {id:table,type:'table_input',x:0,y:0,params:{label:'Line list',keys:['ID','Food'],valueField:'Age',data}},
    {id:dedup,type:'deduplicate_points',x:340,y:0,params:{label:'Deduplicated rows',format:'table',
      nameField:'name',nameMatch:'exact',fuzzyThreshold:0.88,blockDistanceM:500,nearDistanceM:50,
      matchThreshold:2,reviewThreshold:1,decisions:[]}},
    {id:shown,type:'table_output',x:680,y:0,params:{label:'Deduplicated'}}],
    edges:[{id:'e1',from:table,to:dedup,port:'records'},{id:'e2',from:dedup,to:shown,port:'table'}]};
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'dedup.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(held))});
  await page.locator('[data-view="workflow"]').click();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator(`.react-flow__node[data-id="${dedup}"]`).click();
  await expect(page.locator('#dedup-review-open')).toContainText('Review 1 pair');
  await page.locator('#dedup-review-open').click();
  await expect(page.locator('#dedup-review')).toContainText('Are these the same record?');
  await page.locator('#dedup-review-reason').fill('Food was corrected on the second entry');
  await page.locator('#dedup-keep-b').click();
  await page.locator('#dedup-review-close').click();
  const decided=(await saved()).nodes.find(n=>n.id===dedup).params.decisions;
  expect(decided).toHaveLength(1);
  expect(decided[0].keep).toBe('b');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:30000});
  await page.locator(`.react-flow__node[data-id="${dedup}"]`).click();
  await expect(page.locator('.dedup-summary').last()).toContainText('Merged away2');
  await expect(page.locator('.dedup-summary').last()).toContainText('Came out3');
  expect(errors).toEqual([]);
});
