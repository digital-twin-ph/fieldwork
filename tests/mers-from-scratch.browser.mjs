import {test,expect} from './fixtures.mjs';
import {keepColumns,columnsOffered} from './keep-columns.mjs';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** MERS-CoV, SOUTH KOREA, 2015, FROM AN EMPTY CANVAS (experiment 200, 2026-11-12): how quickly was each case detected
 *  and reported? The line list from example-2015-mers-korea, Apply ruleset with 7-1-7 timeliness reading dt_onset,
 *  dt_diag and dt_report as emergence, detection and notification (the practitioner's choice), and each verdict counted.
 *  The counts asserted are the file's own, computed here. MERS_EXPORT saves the project for the example repository. */
test.use({serviceWorkers:'block'});

const LIST=fileURLToPath(new URL('../../example-2015-mers-korea/data/mers_korea_2015_linelist.csv',import.meta.url));
const skip=existsSync(LIST)?false:'example-2015-mers-korea is not checked out beside this repository.';

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type,nth=0)=>(await saved(page)).nodes.filter(n=>n.type===type)[nth].id;
const tidy=async page=>{await page.locator('#tidy-button').click();await page.waitForTimeout(250);};
const wire=async(page,from,to,port)=>{
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  await expect(page.locator(`.react-flow__node[data-id="${to}"] [data-handleid]`).first()).toBeAttached();
  // A new Table output takes whatever is wired on one handle, `layer`, until it knows what it shows.
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  await expect(source).toBeVisible();await expect(target).toBeVisible();
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to),{message:`${from} -> ${to}`}).toBe(true);
};
const run=async page=>{
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120_000});
};
const label=async(page,id,text)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  const box=page.locator('[data-standard-section="name"] input').first();
  await box.fill(text);await box.press('Enter');
};

/** THE FILE'S OWN COUNTS, per verdict, as the ruleset defines them. */
function expected(){
  const [head,...lines]=readFileSync(LIST,'utf8').trim().split(/\r?\n/);
  const cols=head.split(',').map(c=>c.replace(/"/g,''));
  const split=line=>line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0,cols.length).map(v=>v.replace(/,$/,'').replace(/^"|"$/g,''));
  const rows=lines.map(line=>Object.fromEntries(split(line).map((v,i)=>[cols[i],v])));
  const days=(a,b)=>a&&b?(Date.parse(b)-Date.parse(a))/86_400_000:null;
  const verdict=(d,target)=>d===null?'NoVerdict':d<=target?'Met':'NotMet';
  const tally=f=>rows.reduce((m,r)=>{const v=f(r);m[v]=(m[v]??0)+1;return m;},{});
  return {cases:rows.length,
    detection:tally(r=>verdict(days(r.dt_onset,r.dt_diag),7)),
    notification:tally(r=>verdict(days(r.dt_diag,r.dt_report),1))};
}

test('MERS-CoV, South Korea, 2015: each case’s detection and notification against 7-1-7, from an empty canvas',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(300_000);
  const want=expected();
  expect(want.cases).toBe(162);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('MERS-CoV, South Korea, 2015');
  await page.locator('#project-subject-input').fill('How quickly each case was detected and reported, against 7-1-7');
  await page.locator('#project-create').click();
  // The workflow is named for the question it answers.
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill('How quickly was each case detected and reported?');
  await page.locator('#workflow-name-edit').press('Enter');

  // THE LINE LIST, one row per case: its id, the three dates and who the case was, with age as the value column.
  await add(page,'table_input');
  const list=await idOf(page,'table_input');
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(LIST);
  await columnsOffered(page);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('age');
  await keepColumns(page,'table-keys',['id','sex','age_class','dt_onset','dt_diag','dt_report']);
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();

  // 7-1-7, chosen first: choosing a ruleset disconnects what is wired to the step.
  await add(page,'apply_ruleset');
  const timely=await idOf(page,'apply_ruleset');
  await page.locator(`.react-flow__node[data-id="${timely}"]`).click();
  await page.locator('#configure-step').click();
  await page.locator('#ruleset-config #ruleset-choice').selectOption('urn:fieldwork:ruleset:seven-one-seven@1.0.0');
  await page.locator('#ruleset-config #config-apply').click();
  await tidy(page);await wire(page,list,timely,'records');
  // Which column holds each date: the practitioner's choice, 2026-11-12.
  await page.locator(`.react-flow__node[data-id="${timely}"]`).click();
  await page.locator('#configure-step').click();
  const dialog=page.locator('#ruleset-config');
  await dialog.locator('[data-ruleset-binding="fw:emergenceDate"]').selectOption('dt_onset');
  await dialog.locator('[data-ruleset-binding="fw:detectionDate"]').selectOption('dt_diag');
  await dialog.locator('[data-ruleset-binding="fw:notificationDate"]').selectOption('dt_report');
  await dialog.locator('#config-apply').click();
  await add(page,'table_output');
  const perCase=await idOf(page,'table_output');
  await tidy(page);await wire(page,timely,perCase,'table');
  await label(page,perCase,'Each case’s intervals and verdicts');
  await run(page);

  // EACH VERDICT COUNTED, by Total within groups, configured once the verdicts exist.
  const counts=[];
  for(const [column,title] of [['detectionWithinTarget','Detected within 7 days of onset'],['notificationWithinTarget','Reported within 1 day of diagnosis']]){
    await add(page,'group_table');
    const group=await idOf(page,'group_table',counts.length);
    await tidy(page);await wire(page,timely,group,'records');
    await page.locator(`.react-flow__node[data-id="${group}"]`).click();
    await page.locator('#configure-step').click();
    const g=page.locator('#group-config');
    await g.locator(`[data-group-by="${column}"]`).check();
    await g.locator('#group-aggregate').selectOption('count');
    await g.locator('#config-apply').click();
    await label(page,group,title);
    await add(page,'table_output');
    const shown=await idOf(page,'table_output',counts.length+1);
    await tidy(page);await wire(page,group,shown,'table');
    await label(page,shown,title);
    counts.push({title,want:column==='detectionWithinTarget'?want.detection:want.notification});
  }
  await run(page);
  await page.locator('[data-view="results"]').click();
  for(const {title,want:tally} of counts){
    await page.getByRole('tab',{name:title}).click();
    const main=page.locator('main').first();
    // One row per verdict, so no case's row is read as a count.
    await expect(main).toContainText(`${Object.keys(tally).length} of ${Object.keys(tally).length} rows`);
    for(const [verdict,count] of Object.entries(tally))
      await expect(main.locator('tr',{has:page.locator('th,td',{hasText:new RegExp(`^${verdict}$`)})}).first()).toContainText(String(count));
  }
  await page.screenshot({path:'test-results/mers-from-scratch.png',fullPage:true});

  await page.locator('[data-view="project"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'MERS-CoV, South Korea, 2015'}).first();
  await expect(block).toContainText('1 workflow');
  if(process.env.MERS_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.MERS_EXPORT);
  }
});
