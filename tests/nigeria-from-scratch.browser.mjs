import {test,expect} from '@playwright/test';
import {keepColumns,columnsOffered} from './keep-columns.mjs';
import {serveArchive,smallArchive} from './small-pmtiles.mjs';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** NIGERIA FROM AN EMPTY CANVAS, one question to a workflow. South London's rule again, on a third
 *  shape: 774 parts, modelled estimates, no comparison between groups. */
test.use({serviceWorkers:'block'});
const EXAMPLE=new URL('../../example-2024-nigeria-immunization/',import.meta.url);
const file=name=>fileURLToPath(new URL(name,EXAMPLE));
const skip=existsSync(file('geo/nga-lgas.geojson'))?false:'example-2024-nigeria-immunization is not checked out beside this repository.';

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type,nth=0)=>(await saved(page)).nodes.filter(n=>n.type===type)[nth].id;
const tidy=async page=>{await page.locator('#tidy-button').click();await page.waitForTimeout(250);};
const wire=async(page,from,to,port)=>{
  await expect(page.locator(`.react-flow__node[data-id="${to}"] [data-handleid]`).first()).toBeAttached();
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to),
    {message:`${from} -> ${to}`}).toBe(true);
};

const named=async(page,name)=>{
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill(name);
  await page.locator('#workflow-name-edit').press('Enter');
  await page.locator('[data-view="workflow"]').click();
};
const importTable=async(page,csv,shape,value,keys)=>{
  await add(page,'table_input');
  const nodes=(await saved(page)).nodes.filter(n=>n.type==='table_input');
  const table=nodes.at(-1).id;
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles(file(csv));
  await columnsOffered(page);
  if(shape==='long'){
    await page.locator('#table-shape').selectOption('long');
    await page.locator('#table-value').selectOption(value);
  }
  await keepColumns(page,'table-keys',keys);
  if(shape==='wide'){
    await keepColumns(page,'table-values',Array.isArray(value)?value:[value]);
  }
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();
  return table;
};
const importLgas=async page=>{
  await add(page,'polygon_input');
  const area=await idOf(page,'polygon_input');
  await page.locator(`.react-flow__node[data-id="${area}"]`).click();
  await page.locator('#polygon-file').setInputFiles(file('geo/nga-lgas.geojson'));
  await page.locator('#polygon-name-field').fill('ID');
  await page.locator('#polygon-name-field').press('Tab');
  await page.locator('#polygon-layer-name').fill('Local Government Areas');
  await page.locator('#polygon-layer-name').press('Tab');
  await page.locator('#polygon-apply').click();
  await expect(page.locator('[data-review-polygons]')).toBeVisible({timeout:60000});
  return area;
};
/** The last two steps of every question here: put the values on the LGAs, and draw them. */
const joinAndMap=async(page,from,area,title)=>{
  await add(page,'join_table_to_area');
  const join=await idOf(page,'join_table_to_area');
  await tidy(page);await wire(page,from,join,'records');
  await tidy(page);await wire(page,area,join,'polygons');
  await add(page,'map_output');
  const map=await idOf(page,'map_output');
  await tidy(page);await wire(page,join,map,'polygons');
  await page.locator(`.react-flow__node[data-id="${join}"]`).click();
  await page.locator('#join-key').selectOption('ID');
  await page.locator('#join-normalisation').selectOption('exact');
  await page.locator(`.react-flow__node[data-id="${map}"]`).click();
  await page.locator('#map-label').fill(title);
  await page.locator('#map-label').press('Tab');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('main').first()).toContainText('774 of 774 parts carry a value');
  await page.locator('[data-view="workflow"]').click();
  await tidy(page);
};

test('five questions about 774 LGAs, each its own short workflow',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(process.env.NIGERIA_REAL_TILES?1_200_000:480_000);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('DTP coverage and zero-dose children in Nigeria');
  await page.locator('#project-subject-input').fill('Modelled estimates for 774 LGAs, WorldPop');
  await page.locator('#project-create').click();

  // 1. WHERE IS COVERAGE LOWEST? 4 nodes.
  await named(page,'Where is DTP1 coverage lowest?');
  let area=await (async()=>{
    const table=await importTable(page,'data/nga-lga-2024.csv','long','mean_dtp1',['ID']);
    const lgas=await importLgas(page);
    await joinAndMap(page,table,lgas,'DTP1 coverage, 2024');
    return lgas;
  })();
  expect((await saved(page)).nodes.length).toBe(4);

  // 2. WHERE IS THE BURDEN HIGHEST? 4 nodes, and it need not be the same places.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await named(page,'Where are the most zero-dose children?');
  {
    const table=await importTable(page,'data/nga-lga-2024.csv','long','zd_est',['ID']);
    area=await importLgas(page);
    await joinAndMap(page,table,area,'Zero-dose children, 2024');
    await page.waitForTimeout(800);
    await page.screenshot({path:'test-results/nga-zd.png'});
  }

  // 3. WHAT CHANGED? 6 nodes: 15,480 rows, because twenty years were read together.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await named(page,'What changed from 2005 to 2024?');
  {
    const table=await importTable(page,'data/nga-lga-dtp1-by-year.csv','wide',
      Array.from({length:20},(_,i)=>`dtp1_${2005+i}`),['ID']);
    await add(page,'derive_value');
    const derive=await idOf(page,'derive_value');
    await tidy(page);await wire(page,table,derive,'records');
    await page.locator(`.react-flow__node[data-id="${derive}"]`).click();
    const pick=async(key,value)=>{await page.locator(`[data-slr="${key}"]`).selectOption(value);};
    await pick('keyColumn','measure');await pick('left','dtp1_2024');await pick('right','dtp1_2005');
    await page.locator('[data-slr="name"]').fill('change 2005 to 2024');
    await page.locator('[data-slr="name"]').press('Tab');
    await add(page,'select_rows');
    const select=await idOf(page,'select_rows');
    await tidy(page);await wire(page,derive,select,'records');
    await page.locator(`.react-flow__node[data-id="${select}"]`).click();
    await page.locator('[data-select-value="change 2005 to 2024"]').check();
    area=await importLgas(page);
    await joinAndMap(page,select,area,'Change in DTP1 coverage, 2005 to 2024');
    await page.waitForTimeout(800);
    await page.screenshot({path:'test-results/nga-change.png'});
    // AND EVERY YEAR, PLAYED. The same table joined with its years kept as frames, on an interactive
    // map with one key for all twenty. Experiment 168.
    await page.locator('[data-view="workflow"]').click();
    await add(page,'join_table_to_area');
    const frames=(await saved(page)).nodes.filter(n=>n.type==='join_table_to_area')[1].id;
    await tidy(page);await wire(page,table,frames,'records');
    await tidy(page);await wire(page,area,frames,'polygons');
    await page.locator(`.react-flow__node[data-id="${frames}"]`).click();
    await page.locator('#join-key').selectOption('ID');
    await page.locator('#join-normalisation').selectOption('exact');
    await page.locator('#join-frames').selectOption('measure');
    await add(page,'map_output');
    const played=(await saved(page)).nodes.filter(n=>n.type==='map_output')[1].id;
    await tidy(page);await wire(page,frames,played,'polygons');
    await page.locator(`.react-flow__node[data-id="${played}"]`).click();
    await page.locator('#map-label').fill('DTP1 coverage by birth cohort, 2005 to 2024');
    await page.locator('#map-label').press('Tab');
    await page.locator('#polygon-presentation').selectOption('interactive');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    await page.locator('[data-view="workflow"]').click();
    await page.locator(`.react-flow__node[data-id="${played}"]`).click();
    await page.locator('#map-frame-caption').fill('Birth cohort');
    await page.locator('#map-frame-caption').press('Tab');
    await page.locator('#map-part-label').selectOption('shapeName');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    await page.locator('[data-view="results"]').click();
    await page.locator(`#result-tabs [data-output="${played}"]`).click();
    const control=page.locator('.map-frame-control');
    await expect(control.locator('[data-frame-label]')).toHaveText('Birth cohort · dtp1_2024');
    await expect(control.locator('[data-frame-slider]')).toHaveAttribute('max','19');
    await control.locator('[data-frame-step="-1"]').click();
    await expect(control.locator('[data-frame-label]')).toHaveText('Birth cohort · dtp1_2023');
    // PLAY IS CHECKED LOCALLY, NOT IN CI. It failed twice in CI's Chromium (2026-11-04) and passes locally; playback is
    // confirmed on the practitioner's Edge. The practitioner: "If the playback works on local browser test just exclude
    // that from CI". The slider and the steps above still run there.
    if(!process.env.CI){
      await control.locator('[data-frame-pace]').selectOption('500');
      await control.locator('[data-frame-play]').evaluate(button=>{window.__playLabels=[];
        new MutationObserver(()=>window.__playLabels.push(button.textContent)).observe(button,{childList:true,characterData:true,subtree:true});});
      await control.locator('[data-frame-play]').click();
      await expect(control.locator('[data-frame-label]')).toHaveText('Birth cohort · dtp1_2024',{timeout:10000});
      await expect(control.locator('[data-frame-play]')).toHaveText('Play',{timeout:3000});
      expect(await page.evaluate(()=>window.__playLabels),'the button said Pause while playing').toContain('Pause');
    }
    await page.screenshot({path:'test-results/nga-frames.png'});
    await page.locator('[data-view="workflow"]').click();
    await tidy(page);
    expect((await saved(page)).nodes.length).toBe(8);
  }

  // 4. WHICH LGAS ARE BOTH? Two joins make one record with both values, and a rule reads the record
  // as it would a row of a GeoDataFrame. The thresholds are the specification's illustration.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#add-workflow').click();
  await named(page,'Which LGAs have low coverage and a high burden?');
  {
    const coverage=await importTable(page,'data/nga-lga-2024.csv','long','mean_dtp1',['ID']);
    area=await importLgas(page);
    await add(page,'join_table_to_area');
    const first=await idOf(page,'join_table_to_area',0);
    await tidy(page);await wire(page,coverage,first,'records');
    await tidy(page);await wire(page,area,first,'polygons');
    await page.locator(`.react-flow__node[data-id="${first}"]`).click();
    await page.locator('#join-key').selectOption('ID');
    await page.locator('#join-normalisation').selectOption('exact');
    const burden=await importTable(page,'data/nga-lga-2024.csv','long','zd_est',['ID']);
    await add(page,'join_table_to_area');
    const second=await idOf(page,'join_table_to_area',1);
    await tidy(page);await wire(page,burden,second,'records');
    await tidy(page);await wire(page,first,second,'polygons');
    await page.locator(`.react-flow__node[data-id="${second}"]`).click();
    await page.locator('#join-key').selectOption('ID');
    await page.locator('#join-normalisation').selectOption('exact');

    await add(page,'apply_ruleset');
    const rules=await idOf(page,'apply_ruleset');
    await page.locator(`.react-flow__node[data-id="${rules}"]`).click();
    await page.locator('#author-rules').click();
    await page.locator('#rule-editor-cancel').click();
    await page.locator('#ruleset-records').selectOption('polygons');
    await tidy(page);await wire(page,second,rules,'subjects');
    await page.locator(`.react-flow__node[data-id="${rules}"]`).click();
    await page.locator('#edit-rules').click();
    const dialog=page.locator('#rule-editor');
    await expect(dialog).toBeVisible();
    // A NUMBER STATES ITS UNIT before a rule may compare it. Declared in the panel, as a person would.
    await dialog.locator('#rule-editor-cancel').click();
    for(const [index,unit] of [[0,'proportion'],[1,'children']]){
      const box=page.locator(`[data-field-unit="${index}"]`);
      await box.fill(unit);await box.press('Tab');
    }
    await page.locator('#edit-rules').click();
    await expect(dialog).toBeVisible();
    await dialog.locator('#rule-editor-add').click();
    const card=()=>dialog.locator('.rule-card').last();
    const setValue=async(n,value)=>{const box=card().locator('[data-part="value"]').nth(n);await box.fill(value);await box.press('Tab');};
    await card().locator('[data-part="field"]').selectOption('fwa:meanDtp1');
    await card().locator('[data-part="comparator"]').selectOption('lessThan');
    await setValue(0,'0.7');
    await card().locator('[data-part="add-condition"]').click();
    await card().locator('[data-part="field"]').nth(1).selectOption('fwa:zdEst');
    await card().locator('[data-part="comparator"]').nth(1).selectOption('greaterThan');
    await setValue(1,'5000');
    await card().locator('[data-part="predicate"]').fill('review');
    await card().locator('[data-part="predicate"]').press('Tab');
    await card().locator('[data-part="conclusion"]').fill('Priority for data review');
    await card().locator('[data-part="conclusion"]').press('Tab');
    await page.screenshot({path:'test-results/nga-rule-editor.png'});
    await dialog.locator('#rule-editor-keep').click();
    await expect(dialog).toBeHidden();
    await add(page,'map_output');
    const map=await idOf(page,'map_output');
    await tidy(page);await wire(page,rules,map,'polygons');
    await page.locator(`.react-flow__node[data-id="${map}"]`).click();
    await page.locator('#map-label').fill('Low coverage and high burden, 2024');
    await page.locator('#map-label').press('Tab');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    await page.locator('[data-view="results"]').click();
    await page.waitForTimeout(1200);
    await page.screenshot({path:'test-results/nga-priority.png'});
    // THE CLASS ON THE MAP, against the source: 127 LGAs meet both conditions, counted from the file
    // by hand and asserted in the example's README.
    const fills=await page.locator('svg path[data-catchment]').evaluateAll(paths=>{
      const counts={};
      for(const path of paths){const fill=path.getAttribute('fill');counts[fill]=(counts[fill]||0)+1;}
      return counts;});
    expect(Object.values(fills),JSON.stringify(fills)).toContain(127);
    // THE KEY NAMES WHAT THE SHADE MEANS. It carried zero-dose ranges here until 2026-11-02.
    const key=page.locator('#map-communication-header-key');
    await expect(key).toContainText('Priority_for_data_review');
    await expect(key).toContainText('No class');
    await expect(key).not.toContainText(' to ');
    // EVERY SHADE DRAWN IS A SHADE THE KEY NAMES. Asserted as agreement, so a palette change moves both.
    const named=await key.locator('path').evaluateAll(marks=>marks.map(m=>m.getAttribute('fill').toUpperCase()));
    for(const fill of Object.keys(fills))expect(named).toContain(fill.toUpperCase());
    await page.locator('[data-view="workflow"]').click();
    await tidy(page);
    expect((await saved(page)).nodes.length).toBe(7);
  }

  // 5. THE SAME COVERAGE ON THE GROUND. An interactive map over tiles imported once for what it draws.
  // The test answers from a one-tile archive; NIGERIA_REAL_TILES reaches the real one.
  if(!process.env.NIGERIA_REAL_TILES)await serveArchive(page,smallArchive());
  await page.locator('#add-workflow').click();
  await named(page,'Where is coverage lowest, on the ground?');
  {
    const table=await importTable(page,'data/nga-lga-2024.csv','long','mean_dtp1',['ID']);
    const lgas=await importLgas(page);
    await joinAndMap(page,table,lgas,'DTP1 coverage on OpenStreetMap, 2024');
    const map=await idOf(page,'map_output');
    await page.locator(`.react-flow__node[data-id="${map}"]`).click();
    await page.locator('#polygon-presentation').selectOption('interactive');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    await page.locator('#map-import-tiles').click();
    await expect(page.locator('#map-tile-status')).toContainText('The project keeps this description',{timeout:600000});
    const spec=(await saved(page)).nodes.find(n=>n.id===map).params;
    expect(spec.basemap).toBe('tile-extract');
    expect(spec.tileExtract.bounds[0]).toBeGreaterThan(2);
    expect(spec.tileExtract.bounds[2]).toBeLessThan(15);
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    // EACH LGA BY ITS NAME, with the ID it is joined on beneath.
    await page.locator('[data-view="workflow"]').click();
    await page.locator(`.react-flow__node[data-id="${map}"]`).click();
    await page.locator('#map-part-label').selectOption('shapeName');
    await page.locator('#run-button').click();
    await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120000});
    await page.locator('[data-view="results"]').click();
    await expect(page.locator('[data-tile-status]')).toContainText('tiles held on this device',{timeout:30000});
    await page.locator('#catchment-map-host path.leaflet-interactive').nth(400).click({force:true});
    const popup=page.locator('.leaflet-popup-content');
    await expect(popup.locator('b')).not.toHaveText(/^\d+$/);
    await expect(popup.locator('.muted')).toHaveText(/^\d+$/);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(process.env.NIGERIA_REAL_TILES?8000:500);
    await page.screenshot({path:'test-results/nga-ground.png'});
    await page.locator('[data-view="workflow"]').click();
    await tidy(page);
  }

  // THE REPORT OVER THE 20 YEARS. Authored notes go in through the dialog, as a practitioner would
  // write them, and the machined ones come from running the rest.
  const {notes,works}=JSON.parse(readFileSync(file('notes/report-notes.json'),'utf8'));
  // EACH WORK THROUGH THE CITATIONS TAB, field by field, as a practitioner would build it.
  const cite=async work=>{
    const c=work.citation;
    await page.locator('#cite-type').selectOption(c.type);
    await page.locator('#cite-authors').fill(c.authors.map(a=>a.corporate?a.family:`${a.family}, ${a.given}`).join('\n'));
    if(c.etAl)await page.locator('#cite-et-al').check();
    await page.locator('#cite-title').fill(c.title);
    await page.locator('#cite-published').fill(work.published);
    for(const [key,id] of [['container','cite-container'],['volume','cite-volume'],['issue','cite-issue'],
      ['pages','cite-pages'],['publisher','cite-publisher'],['place','cite-place'],['doi','cite-doi']])
      if(c[key])await page.locator(`#${id}`).fill(c[key]);
    if(work.url)await page.locator('#cite-url').fill(work.url);
    if(work.retrieved)await page.locator('#cite-retrieved').fill(work.retrieved);
    await expect(page.locator('#cite-add')).toBeEnabled();
    await page.locator('#cite-add').click();
  };
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
  for(const note of notes){
    await page.locator(`[data-add-note="${note.section}"]`).first().click();
    await expect(page.locator('#note-text')).toBeVisible();
    await page.locator('#note-text').fill(note.text);
    await page.locator('#note-function').selectOption(note.fn);
    if(note.cites?.length){
      await page.locator('[data-note-tab="cite"]').click();
      for(const id of note.cites)await cite(works[id]);
      await expect(page.locator('.note-works li')).toHaveCount(note.cites.length);
    }
    await page.locator('#note-save').click();
    await expect(page.locator('#note-dialog')).not.toBeVisible();
  }
  await page.locator('[data-run-pending]').click();
  await expect(page.locator('.notes-run')).toContainText('All 5',{timeout:120000});
  await page.waitForTimeout(1200);
  const view=page.locator('#notes-view');
  await expect(view.locator('.notes-note.k-authored')).toHaveCount(notes.length);
  // REFERENCES ASSEMBLED FROM WHAT THE NOTES CITE: seven works, numbered once each, and no notes of its own.
  const assembled=view.locator('[data-section="References"] .notes-reference.r-work');
  await expect(assembled).toHaveCount(Object.keys(works).length);
  await expect(assembled.first()).toContainText('WorldPop');
  await expect(view.locator('[data-section="References"] [data-add-note]')).toHaveCount(0);
  await expect(view.locator('.notes-cite').first()).toHaveText('[1, 2]');
  await expect(assembled.filter({hasText:'Croft TN, Allen CK, Zachary BW, et al.'})).toHaveCount(1);
  expect(await view.locator('.notes-note.k-machined').count()).toBeGreaterThan(3);
  await page.screenshot({path:'test-results/nga-report.png',fullPage:true});
  if(process.env.NIGERIA_REPORT)writeFileSync(process.env.NIGERIA_REPORT,await view.innerText());

  await page.locator('[data-view="workflow"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'DTP coverage and zero-dose'}).first();
  await expect(block).toContainText('5 workflows');
  await page.screenshot({path:'test-results/nga-project.png'});
  if(process.env.NIGERIA_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.NIGERIA_EXPORT);
  }
});
