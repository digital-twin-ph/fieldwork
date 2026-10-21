import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The widget on the canvas: its knobs, the review band it hands back, and the decision a person
// makes in it. The matching rules themselves are pinned in tests/deduplicate-points.test.mjs.
const near=x=>x+0.0003, far=x=>x+0.002;
const layer=(id,label,records)=>({id,type:'point_input',x:0,y:0,params:{label,
  data:{type:'FeatureCollection',features:records.map(([rid,name,x,y])=>
    ({type:'Feature',id:rid,properties:{name},geometry:{type:'Point',coordinates:[x,y]}}))}}});

const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Two sources',nodes:[
  layer('osm','OSM Health Facilities',[['a','Centre de Santé Ndosho',29.2,-1.65],
    ['c','Hôpital Général de Référence de Goma',29.21,-1.66]]),
  layer('hdx','HDX Health Facilities',[['b','Centre de Sante Ndosho',near(29.2),-1.65],
    ['d','Hôpital Général de Référence de Goma',far(29.21),-1.66]]),
  {id:'dedup',type:'deduplicate_points',x:300,y:0,params:{label:'Deduplicated records',
    pointInputCount:2,nameField:'name',nameMatch:'fuzzy',fuzzyThreshold:0.88,
    blockDistanceM:500,nearDistanceM:50,matchThreshold:2,reviewThreshold:1,decisions:[]}},
  {id:'table',type:'table_output',x:600,y:0,params:{label:'Deduplicated'}},
],edges:[
  {id:'e1',from:'osm',to:'dedup',port:'points'},{id:'e2',from:'hdx',to:'dedup',port:'points_2'},
  {id:'e3',from:'dedup',to:'table',port:'points'},
]};

test('a pair that agrees twice merges, and a pair that agrees once waits for a person',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'dedup.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});

  // Four records in, three out: the close pair merged, the distant pair did not.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(3);

  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="dedup"]').click();
  const inspector=page.locator('#inspector-content');
  // EVERY OUTCOME IN THE SUMMARY, including the pairs waiting: they were reported outside it, and
  // a run summary that leaves out the thing asking for your attention is not a summary of the run.
  // Each count against two denominators, because 1 matched reads differently as half of what was
  // compared than as a quarter of what was considered, and both are true.
  const summary=inspector.locator('.dedup-summary').first();
  await expect(summary).toContainText('Considered');
  await expect(summary).toContainText('Never compared');
  await expect(summary).toContainText('Awaiting you');
  await expect(summary).toContainText('Not a match');
  const awaiting=summary.locator('tr',{hasText:'Awaiting you'});
  await expect(awaiting.locator('td')).toHaveText(['1','25.0%','50.0%']);
  // A zero reads as a zero, not as 0.00%.
  await expect(summary.locator('tr',{hasText:'Not a match'}).locator('td')).toHaveText(['0','0%','0%']);
  // And what happened to the records, which is the number a count of facilities depends on.
  const records=inspector.locator('.dedup-summary').last();
  await expect(records.locator('tr',{hasText:'Merged away'}).locator('td').first()).toHaveText('1');

  // THE DECISION IS MADE IN A DIALOG, with both records and every attribute each carries: the
  // Inspector is 292px wide and two names and a distance are not what the judgement rests on.
  await inspector.locator('#dedup-review-open').click();
  const dialog=page.locator('#dedup-review');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('1 of 1 waiting');
  // Named by their sources, in the practitioner's own labels.
  await expect(dialog.locator('.dedup-record h3').first()).toHaveText('OSM Health Facilities');
  await expect(dialog.locator('.dedup-record h3').last()).toHaveText('HDX Health Facilities');
  await expect(dialog).toContainText('222 m');
  // Every attribute of both, lined up, with the agreeing ones marked apart.
  await expect(dialog.locator('.dedup-fields tbody tr')).toHaveCount(1);
  await expect(dialog.locator('.dedup-fields tr.agrees')).toHaveCount(1);

  // Deciding needs a reason: a judgement nobody can read six months later is not a record of one.
  await dialog.locator('#dedup-same').click();
  await expect(dialog).toBeVisible({timeout:2000});
  await dialog.locator('#dedup-review-reason').fill('Same compound, two surveys');
  await dialog.locator('#dedup-same').click();
  await dialog.locator('#dedup-review-close').click();
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(2,
    {message:'the decided pair merged, and only then'});

  // The decision is saved with the workflow, and it says why.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const decisions=saved.nodes.find(n=>n.id==='dedup').params.decisions;
  expect(decisions).toHaveLength(1);
  expect(decisions[0].reason).toBe('Same compound, two surveys');
  expect(decisions[0].signature.length).toBeGreaterThan(0);

  // And the receipt carries the rule that produced the merge, not only the result.
  await page.locator('[data-view="rules"]').click();
  const download=page.waitForEvent('download');
  await page.locator('#download-evidence').click();
  const receipt=JSON.parse(await (await (await download).createReadStream()).toArray().then(b=>Buffer.concat(b).toString()));
  const facts=receipt.receipts.find(r=>r.nodeId==='dedup').facts;
  for(const token of ['fw:RecordDeduplication','fw:nameMatchMethod "jaro-winkler"','fw:fuzzyThreshold 0.88',
    'fw:blockDistanceM 500','fw:nearDistanceM 50','fw:matchThreshold 2','fw:reviewThreshold 1',
    'fw:mergedRecordCount','fw:decisionReason'])
    expect(facts).toContain(token);
  expect(errors).toEqual([]);
});
