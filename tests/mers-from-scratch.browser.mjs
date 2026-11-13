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
const CONTACTS=fileURLToPath(new URL('../../example-2015-mers-korea/data/mers_korea_2015_contacts.csv',import.meta.url));
const HOSPITALS=fileURLToPath(new URL('../../example-2015-mers-korea/data/mers_korea_2015_facilities.csv',import.meta.url));
const skip=existsSync(LIST)&&existsSync(CONTACTS)&&existsSync(HOSPITALS)?false:'example-2015-mers-korea is not checked out beside this repository.';

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
  const verdict=(d,target)=>d===null?'No verdict':d<=target?'Met':'Not met';
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
  await page.locator('#configure-step').click();
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
  await page.locator('#ruleset-config #ruleset-choice').selectOption('urn:fieldwork:ruleset:seven-one-seven@2.0.0');
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
  for(const [column,title] of [['detected_within_target','Detected within 7 days of onset'],['notified_within_target','Reported within 1 day of diagnosis']]){
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
    counts.push({title,want:column==='detected_within_target'?want.detection:want.notification});
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

  // WHO INFECTED WHOM, as far as the 98 probable links say without a choice: cases per source, and where exposure
  // happened. No tree: SK_39 has three recorded sources and SK_107 two, and picking one is not this file's to do.
  const links=readFileSync(CONTACTS,'utf8').trim().split(/\r?\n/).slice(1).map(line=>line.split(',').map(v=>v.replace(/^"|"$/g,'')));
  const tally=i=>links.reduce((m,l)=>{m[l[i]]=(m[l[i]]??0)+1;return m;},{});
  expect(links.length).toBe(98);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill('Who infected whom, and where?');
  await page.locator('#workflow-name-edit').press('Enter');
  await add(page,'table_input');
  const contacts=await idOf(page,'table_input');
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles(CONTACTS);
  await columnsOffered(page);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('diff_dt_onset');
  await keepColumns(page,'table-keys',['from','to','exposure']);
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();
  await label(page,contacts,'Probable links between cases');
  const second=[];
  for(const [column,title,want] of [['from','Cases each source infected',tally(0)],['exposure','Where exposure happened',tally(2)]]){
    await add(page,'group_table');
    const group=await idOf(page,'group_table',second.length);
    await tidy(page);await wire(page,contacts,group,'records');
    await page.locator(`.react-flow__node[data-id="${group}"]`).click();
    await page.locator('#configure-step').click();
    const g=page.locator('#group-config');
    await g.locator(`[data-group-by="${column}"]`).check();
    await g.locator('#group-aggregate').selectOption('count');
    await g.locator('#config-apply').click();
    await label(page,group,title);
    await add(page,'table_output');
    const shown=await idOf(page,'table_output',second.length);
    await tidy(page);await wire(page,group,shown,'table');
    await label(page,shown,title);
    second.push({title,want});
  }
  await run(page);
  await page.locator('[data-view="results"]').click();
  for(const {title,want} of second){
    await page.getByRole('tab',{name:title}).click();
    const main=page.locator('main').first();
    const n=Object.keys(want).length;
    await expect(main).toContainText(`${n} of ${n} rows`);
    for(const [value,count] of Object.entries(want))
      await expect(main.locator('tr',{has:page.locator('th,td',{hasText:new RegExp(`^${value.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`)})}).first()).toContainText(String(count));
  }

  // WHO INFECTED WHOM, AS A TREE (the practitioner, 2026-11-12: every recorded link). The cases, each with every source
  // the contacts record: Relate on id = to, one row per match, the 67 with no recorded source kept as "none recorded".
  await add(page,'table_input');
  const people=await idOf(page,'table_input',1);
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles(LIST);
  await columnsOffered(page);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('age');
  await keepColumns(page,'table-keys',['id','dt_onset']);
  await page.locator('#table-save').click();
  await label(page,people,'The cases and their onsets');
  await add(page,'relate_table');
  const sources=await idOf(page,'relate_table');
  await tidy(page);await wire(page,people,sources,'records');
  await tidy(page);await wire(page,contacts,sources,'related');
  await page.locator(`.react-flow__node[data-id="${sources}"]`).click();
  await page.locator('#configure-step').click();
  const rel=page.locator('#relate-config');
  await rel.locator('#relate-on').selectOption('id');
  await rel.locator('#relate-right-on').selectOption('to');
  await rel.locator('#relate-bring').selectOption('from');
  await rel.locator('#relate-several').selectOption('each');
  await rel.locator('[name="relate-decision"][value="keep"]').check();
  await rel.locator('#relate-join-label').fill('none recorded');
  await rel.locator('#relate-join-label').press('Tab');
  await rel.locator('#relate-join-reason').fill('A case the contacts name as nobody\u2019s has no recorded source.');
  await rel.locator('#relate-join-reason').press('Tab');
  await rel.locator('#config-apply').click();
  await label(page,sources,'Each case with every recorded source');
  await add(page,'table_output');
  const listed=await idOf(page,'table_output',2);
  await tidy(page);await wire(page,sources,listed,'table');
  await label(page,listed,'Each case with every recorded source');
  await run(page);
  await add(page,'chart_output');
  const tree=await idOf(page,'chart_output');
  await tidy(page);await wire(page,sources,tree,'records');
  await page.locator(`.react-flow__node[data-id="${tree}"]`).click();
  await page.locator('#configure-step').click();
  const ch=page.locator('#chart-config');
  await ch.locator('#chart-figure').selectOption('tree');
  await ch.locator('#chart-tree-id').selectOption('id');
  await ch.locator('#chart-tree-parent').selectOption('from');
  await ch.locator('#chart-tree-date').selectOption('dt_onset');
  await ch.locator('#chart-tree-none').fill('none recorded');
  await ch.locator('#chart-tree-none').press('Tab');
  await ch.locator('#chart-title').fill('Who infected whom, MERS-CoV, South Korea, 2015');
  await ch.locator('#chart-title').press('Tab');
  await ch.locator('#config-apply').click();
  await label(page,tree,'Who infected whom');
  await run(page);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Each case with every recorded source'}).click();
  await expect(page.locator('main').first()).toContainText('165 rows');
  await page.getByRole('tab',{name:'Who infected whom'}).click();
  await expect(page.locator('main').first()).toContainText('162 cases');
  await expect(page.locator('main').first()).toContainText('2 cases record more than one source');
  await page.screenshot({path:'test-results/mers-tree.png',fullPage:true});

  // WHERE WERE THE CASES IN HOSPITAL? (the practitioner, 2026-11-12: the hospitals placed, then on a map). Cases counted by
  // loc_hosp as the line list writes it, related to the hospitals table on that name, placed, and sized by their cases.
  // Samsung's two spellings stay two rows at one place, 80 and 5, as written; 365 Seoul Yeollin Clinic has no position
  // and is kept and counted, not drawn.
  const [hHead,...hLines]=readFileSync(HOSPITALS,'utf8').trim().split(/\r?\n/);
  expect(hHead.split(',').slice(0,5)).toEqual(['loc_hosp','facility','facility_ko','lon','lat']);
  expect(hLines.length).toBe(13);
  const byHospital=(()=>{const [h,...ls]=readFileSync(LIST,'utf8').trim().split(/\r?\n/);const cols=h.split(',').map(c=>c.replace(/"/g,''));
    const at=cols.indexOf('loc_hosp');const split=line=>line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0,cols.length).map(v=>v.replace(/,$/,'').replace(/^"|"$/g,''));
    return ls.reduce((m,l)=>{const v=split(l)[at];m[v]=(m[v]??0)+1;return m;},{});})();
  expect(Object.keys(byHospital).length).toBe(13);
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill('Where were the cases in hospital?');
  await page.locator('#workflow-name-edit').press('Enter');
  await add(page,'table_input');
  const cases=await idOf(page,'table_input');
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles(LIST);
  await columnsOffered(page);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('age');
  await keepColumns(page,'table-keys',['id','loc_hosp']);
  await page.locator('#table-save').click();
  await label(page,cases,'The cases and their hospitals');
  await add(page,'group_table');
  const perHospital=await idOf(page,'group_table');
  await tidy(page);await wire(page,cases,perHospital,'records');
  await page.locator(`.react-flow__node[data-id="${perHospital}"]`).click();
  await page.locator('#configure-step').click();
  await page.locator('#group-config [data-group-by="loc_hosp"]').check();
  await page.locator('#group-config #group-aggregate').selectOption('count');
  await page.locator('#group-config #config-apply').click();
  await label(page,perHospital,'Cases per hospital, as the line list writes it');
  await add(page,'table_output');
  const perHospitalTable=await idOf(page,'table_output');
  await tidy(page);await wire(page,perHospital,perHospitalTable,'table');
  await label(page,perHospitalTable,'Cases per hospital, as the line list writes it');
  await add(page,'table_input');
  const hospitals=await idOf(page,'table_input',1);
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles(HOSPITALS);
  await columnsOffered(page);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('lon');
  await keepColumns(page,'table-keys',['loc_hosp','facility','lat','position','confidence']);
  await page.locator('#table-save').click();
  await label(page,hospitals,'The hospitals, placed');
  await run(page);
  await add(page,'relate_table');
  const placed=await idOf(page,'relate_table');
  await tidy(page);await wire(page,hospitals,placed,'records');
  await tidy(page);await wire(page,perHospital,placed,'related');
  await page.locator(`.react-flow__node[data-id="${placed}"]`).click();
  await page.locator('#configure-step').click();
  const rh=page.locator('#relate-config');
  await rh.locator('#relate-on').selectOption('loc_hosp');
  await rh.locator('#relate-right-on').selectOption('loc_hosp');
  await rh.locator('#relate-bring').selectOption('rows');
  await rh.locator('#relate-bring-as').fill('cases');
  await rh.locator('#relate-bring-as').press('Tab');
  await rh.locator('#config-apply').click();
  await label(page,placed,'Each hospital with its cases');
  await add(page,'table_output');
  const hospitalTable=await idOf(page,'table_output',1);
  await tidy(page);await wire(page,placed,hospitalTable,'table');
  await label(page,hospitalTable,'Each hospital with its cases');
  await add(page,'point_input');
  const points=await idOf(page,'point_input');
  await tidy(page);await wire(page,placed,points,'records');
  await run(page);
  await page.locator(`.react-flow__node[data-id="${points}"]`).click();
  await page.locator('#configure-step').click();
  const pc=page.locator('#points-config');
  await pc.locator('#from-table-x').selectOption('lon');
  await pc.locator('#from-table-y').selectOption('lat');
  await pc.locator('#from-table-id').selectOption('loc_hosp');
  await pc.locator('#from-table-name').selectOption('facility');
  await pc.locator('#config-apply').click();
  await label(page,points,'The hospitals, as points');
  await add(page,'map_output');
  const map=await idOf(page,'map_output');
  await tidy(page);await wire(page,points,map,'points');
  // SOUTH KOREA'S 17 PROVINCES as the study area (geoBoundaries gbOpen ADM1, release 9469f09, Public Domain, from Natural
  // Earth; the download approved by the practitioner, 2026-11-12): a map places its points against an area.
  await add(page,'study_area');
  const korea=await idOf(page,'study_area');
  await page.locator(`.react-flow__node[data-id="${korea}"]`).click();
  await page.locator('#edit-study-area').click();
  await page.locator('#area-boundary-source summary').click();
  await page.locator('#area-iso').fill('KOR');
  await page.locator('#area-adm').selectOption('ADM1');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-units')).toBeVisible({timeout:120_000});
  await expect(page.locator('#area-boundary-status')).toContainText('17 units ready');
  const provinces=await page.locator('#area-boundary-pick option').evaluateAll(os=>os.map(o=>o.value));
  await page.locator('#area-boundary-pick').selectOption(provinces);
  await page.locator('#area-boundary-use').click();
  await page.locator('#area-apply').click();
  await expect.poll(()=>page.locator('#area-dialog').evaluate(d=>d.open),{timeout:120_000}).toBe(false);
  await label(page,korea,'South Korea, its 17 provinces');
  await tidy(page);await wire(page,korea,map,'area');
  await run(page);
  await page.locator(`.react-flow__node[data-id="${map}"]`).click();
  await page.locator('#configure-step').click();
  const mc=page.locator('#map-config');
  // COLOURED, NOT SIZED (the practitioner, 2026-11-13: sized by cases, Samsung Medical Center's circle hid the hospitals
  // near it; "Maybe color keyed to expose all the point locations"). Choosing colour clears size.
  await mc.locator(`[data-layer-size-by="${points}"]`).selectOption('cases');
  await mc.locator(`[data-layer-colour-by="${points}"]`).selectOption('cases');
  await expect(mc.locator(`[data-layer-size-by="${points}"]`)).toHaveValue('');
  await mc.locator('#map-title').fill('Cases by the hospital named for them, MERS-CoV, South Korea, 2015');
  await mc.locator('#map-title').press('Tab');
  await mc.locator('#config-apply').click();
  await label(page,map,'Where were the cases in hospital?');
  await run(page);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Each hospital with its cases'}).click();
  const ht=page.locator('main').first();
  await expect(ht).toContainText('13 rows · loc_hosp with facility, lat, position, cases');
  for(const [name,count] of Object.entries(byHospital).filter(([,c])=>c>=10))
    await expect(ht.locator('tr',{hasText:name.split(',')[0]}).first()).toContainText(String(count));
  await page.getByRole('tab',{name:'Where were the cases in hospital?'}).click();
  await expect(page.locator('#map g.location')).toHaveCount(12);
  // One size for every hospital, and a key that states each class's range and count.
  const radii=await page.locator('#map g.location path').evaluateAll(paths=>[...new Set(paths.map(p=>p.getBoundingClientRect().width.toFixed(1)))]);
  expect(radii.length,'every mark one size').toBe(1);
  await expect(page.locator('#map-communication-header-key')).toContainText('coloured by cases: 1 (4)');
  await page.screenshot({path:'test-results/mers-hospitals.png',fullPage:true});
  await page.locator('#map').screenshot({path:'test-results/mers-hospitals-map.png'});

  await page.locator('[data-view="project"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'MERS-CoV, South Korea, 2015'}).first();
  await expect(block).toContainText('3 workflows');
  if(process.env.MERS_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.MERS_EXPORT);
  }
});
