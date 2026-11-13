import {test,expect} from './fixtures.mjs';
import {existsSync,readFileSync} from 'node:fs';

/** POPULATION MODELS BESIDE A CENSUS (experiment 209): WorldPop, GRID3 and GHS-POP totalled over each census district and
 *  set beside the 2022 census, as shares of the country, for Botswana (28 districts) and Rwanda (30). The steps are laid
 *  out as the example's project holds them; every piece of data comes in through the dialog a practitioner would use: the
 *  boundaries through the study area, each raster through Raster input, the census through Tabular data.
 *
 *  POP_FILES names a folder holding the downloads (see the example's README); REFERENCE a JSON of rasterio's district
 *  totals over the same files. POP_EXPORT saves the project for the example repository. */
test.use({serviceWorkers:'block'});
const FILES=process.env.POP_FILES,REFERENCE=process.env.POP_REFERENCE,EXPORT=process.env.POP_EXPORT;
const DATA=new URL('../../example-population-models-census/data/',import.meta.url).pathname;
const GHS='https://jrc-ghsl.s3.amazonaws.com/ghs-pop/r2023a/4326/3asec/2025/GHS_POP_E2025_GLOBE_R2023A_4326_3ss_V1_0.tif';
const COUNTRIES={
  RWA:{name:'Rwanda',districts:30,census:'rwanda_census_2022_districts.csv',keys:['name'],
    worldpop:'dl-worldpop-rwa/rwa_pop_2025_CN_100m_R2025A_v1.tif',grid3:'dl-grid3-rwa/rwa_SSApopulation_ 2025_v1_0_gridded.tif'},
  BWA:{name:'Botswana',districts:28,census:'botswana_census_2022_districts.csv',keys:['census_district','name'],boundaryFile:'dl-bwa-adm2/geoBoundaries-BWA-ADM2.geojson',
    worldpop:'worldpop-dl/bwa_pop_2025_CN_100m_R2025A_v1.tif',grid3:'dl-grid3-bwa/bwa_SSApopulation_ 2025_v1_0_gridded.tif'},
};
const SOURCES=['Census 2022','WorldPop 2025','GRID3 2025','GHS-POP 2025'];

const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const node=(page,id)=>page.locator(`.react-flow__node[data-id="${id}"]`);

/** The steps, their settings and their wiring, for one country. Data comes in later, through the dialogs. */
function layout(code,tableParams){
  const c=COUNTRIES[code],raster=(id,label,x,y)=>({id,type:'raster_input',x,y,params:{label}});
  const sample=(id,label,x,y)=>({id,type:'sample_raster',x,y,params:{label,attribute:'population',valueUnit:'people',over:'areas',source:'raster'}});
  return {name:`Where does each source put ${c.name}'s people?`,nodes:[
    {id:'area',type:'study_area',x:20,y:300,params:{label:`${c.name}, its ${c.districts} census districts`,source:'drawn',selectionMode:'polygon',geometry:null}},
    raster('worldpop','WorldPop 2025',320,40),raster('grid3','GRID3 2025',320,220),raster('ghs','GHS-POP 2025',320,400),
    sample('by-worldpop','WorldPop 2025 by district',620,40),sample('by-grid3','GRID3 2025 by district',620,220),sample('by-ghs','GHS-POP 2025 by district',620,400),
    {id:'census',type:'table_input',x:620,y:580,params:{...tableParams,label:'Census 2022 by district'}},
    {id:'stacked',type:'append_rows',x:920,y:300,params:{label:'Four sources, row by row',tableCount:4,nameSource:true,sourceColumn:'source',labels:SOURCES}},
    {id:'shares',type:'group_table',x:1220,y:300,params:{label:'Each district’s share, by source',by:['source','name'],aggregate:'sum',share:{within:['source']}}},
    {id:'only-shares',type:'select_rows',x:1520,y:300,params:{label:'The shares',keyColumn:'statistic',values:['% within source']}},
    {id:'table',type:'table_output',x:1820,y:200,params:{label:'Shares by district and source'}},
    {id:'chart',type:'chart_output',x:1820,y:400,params:{label:'Where each source puts the people',keyColumn:'name',panelsBy:'source',
      chartTitle:`Each district\u2019s share of ${c.name}\u2019s people, by source`,yAxisTitle:'Share of the country, %',xAxisTitle:'Census district',
      subtitle:'WorldPop and GRID3 spread census counts by district, so their shares follow the census by construction; GHS-POP is built another way.'}},
    {id:'only-ghs',type:'select_rows',x:1820,y:600,params:{label:'GHS-POP’s shares',keyColumn:'source',values:['GHS-POP 2025']}},
    {id:'joined',type:'join_table_to_area',x:2120,y:600,params:{label:'GHS-POP’s share on the districts',keyField:'name',normalisation:'exact'}},
    {id:'map',type:'map_output',x:2420,y:600,params:{label:'GHS-POP 2025, share of the country'}}],
  edges:[
    ...['worldpop','grid3','ghs'].map(r=>({id:`a-${r}`,from:'area',to:r,port:'area'})),
    ...['worldpop','grid3','ghs'].flatMap(r=>[{id:`r-${r}`,from:r,to:`by-${r}`,port:'raster'},{id:`s-${r}`,from:'area',to:`by-${r}`,port:'area'}]),
    {id:'t1',from:'census',to:'stacked',port:'records'},{id:'t2',from:'by-worldpop',to:'stacked',port:'records_2'},
    {id:'t3',from:'by-grid3',to:'stacked',port:'records_3'},{id:'t4',from:'by-ghs',to:'stacked',port:'records_4'},
    {id:'g',from:'stacked',to:'shares',port:'records'},{id:'p',from:'shares',to:'only-shares',port:'records'},
    {id:'v1',from:'only-shares',to:'table',port:'table'},{id:'v2',from:'only-shares',to:'chart',port:'records'},
    {id:'v3',from:'only-shares',to:'only-ghs',port:'records'},{id:'j1',from:'only-ghs',to:'joined',port:'records'},
    {id:'j2',from:'area',to:'joined',port:'area'},{id:'m',from:'joined',to:'map',port:'polygons'}]};
}

async function districts(page,code){
  const c=COUNTRIES[code];
  await node(page,'area').click();
  await page.locator('#edit-study-area').click();
  if(c.boundaryFile){
    await page.locator('#area-file-source summary').click();
    await page.locator('#area-file-name-key').fill('shapeName');
    await page.locator('#area-file-input').setInputFiles(`${FILES}/${c.boundaryFile}`);
    await expect(page.locator('#area-file-status')).toContainText(`${c.districts} boundaries read`,{timeout:120000});
  }else{
    await page.locator('#area-boundary-source summary').click();
    await page.locator('#area-iso').fill(code);
    await page.locator('#area-adm').selectOption('ADM2');
    await page.locator('#area-boundary-check').click();
    await expect(page.locator('#area-boundary-status')).toContainText(`${c.districts} units ready`,{timeout:180000});
  }
  const units=await page.locator('#area-boundary-pick option').evaluateAll(os=>os.map(o=>o.value));
  await page.locator('#area-boundary-pick').selectOption(units);
  await page.locator('#area-boundary-use').click();
  await page.locator('#area-apply').click();
  await expect.poll(()=>page.locator('#area-dialog').evaluate(d=>d.open),{timeout:180000}).toBe(false);
}
async function raster(page,id,from){
  await node(page,id).click();
  await page.locator('#prepare-raster').click();
  const dialog=page.locator('#raster-dialog');
  if(from.startsWith('https://')){
    await dialog.locator('#raster-url-source summary').click();
    await dialog.locator('#raster-url').fill(from);await dialog.locator('#raster-url-read').click();
    await expect(dialog).toContainText(/cells/i,{timeout:180000});
    await dialog.locator('#raster-source-title').fill('GHS-POP R2023A, 2025, 3 arc-seconds, read for the area only');
    await dialog.locator('#raster-source-provider').fill('European Commission, Joint Research Centre (JRC)');
    await dialog.locator('#raster-source-license').fill('CC BY 4.0');
    await dialog.locator('#raster-source-units').fill('people per pixel');
  }else{
    await page.locator('#raster-file').setInputFiles(from);
    await expect(dialog.locator('#raster-source-units')).toHaveValue(/people/,{timeout:60000});
  }
  await dialog.locator('#config-apply').click();
  await expect(dialog).toHaveCount(0,{timeout:600000});
}
async function census(page,code){
  const c=COUNTRIES[code];
  await node(page,'census').click();
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles(`${DATA}${c.census}`);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('population');
  for(const key of c.keys)await page.locator(`#table-keys input[value="${key}"]`).check();
  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toHaveCount(0,{timeout:30000});
}

for(const code of ['RWA','BWA'])
test(`${COUNTRIES[code].name}: three population models totalled over the census districts and set beside the census`,async({page})=>{
  test.skip(!FILES||!existsSync(FILES),'Set POP_FILES to the folder holding the downloads.');
  test.setTimeout(1_800_000);
  const c=COUNTRIES[code];
  // Tabular data's own parameters, as the palette makes them, so the seeded step is one the application would make.
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  const tableParams=(await saved(page)).nodes.find(n=>n.type==='table_input').params;
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await page.addInitScript(seeded=>{if(sessionStorage.getItem('pop-seeded'))return;sessionStorage.setItem('pop-seeded','1');
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(seeded));},{schema:'fieldwork/workflow/1',exampleId:'blank',...layout(code,tableParams)});
  await page.goto('/');
  await page.locator('[data-view="workflow"]').click();

  await districts(page,code);
  await raster(page,'worldpop',`${FILES}/${c.worldpop}`);
  await raster(page,'grid3',`${FILES}/${c.grid3}`);
  await raster(page,'ghs',GHS);
  await census(page,code);

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:900000});

  // EVERY DISTRICT'S SHARE, from each source, as rasterio's totals over the same files give it, rounded as the step rounds.
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Shares by district and source'}).click();
  if(REFERENCE&&existsSync(REFERENCE)){
    const ref=JSON.parse(readFileSync(REFERENCE,'utf8'))[code];
    const key={'Census 2022':'census','WorldPop 2025':'WorldPop','GRID3 2025':'GRID3','GHS-POP 2025':'GHS-POP'};
    for(const source of SOURCES){
      await page.locator('#result-search').fill(source);
      const rows=await page.locator('#data-table-view tbody tr').evaluateAll(trs=>trs.map(tr=>[...tr.children].map(td=>td.textContent.trim())));
      const shown=Object.fromEntries(rows.filter(r=>r[0]===source).map(r=>[r[1],Number(r.at(-1))]));
      const total=ref.totals[key[source]];
      const expected=Object.fromEntries(Object.entries(ref.districts).map(([name,d])=>[name,Math.round(d[key[source]]/total*1000)/10]));
      expect(Object.keys(shown).length,`${source}: one share for each district`).toBe(c.districts);
      expect(shown,`${source}: each district's share`).toEqual(expected);
    }
    await page.locator('#result-search').fill('');
  }
  await page.screenshot({path:`test-results/population-${code}.png`,fullPage:true});
  for(const tab of ['Where each source puts the people','GHS-POP 2025, share of the country']){
    await page.getByRole('tab',{name:tab}).click();await page.waitForTimeout(800);
    await page.screenshot({path:`test-results/population-${code}-${tab.split(' ')[0]}.png`,fullPage:true});}
  // THE WORKFLOW, AS IT LEAVES THE DEVICE, for the example's project: no raster window inside it, each read again from its
  // source and checked where the project is opened.
  if(EXPORT){
    const download=page.waitForEvent('download');
    await page.locator('#backup-button').click();await page.locator('#export-button').click();
    await (await download).saveAs(`${EXPORT}/${code}-workflow.json.gz`);
  }
});

/** THE EXAMPLE'S PROJECT: both countries' workflows, as one investigation. */
test('both countries\u2019 workflows as one project, for the example repository',async({page})=>{
  test.skip(!EXPORT||!existsSync(`${EXPORT}/RWA-workflow.json.gz`)||!existsSync(`${EXPORT}/BWA-workflow.json.gz`),'Run both countries with POP_EXPORT first.');
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  // Each workflow imported, then filed: the first as a new project, the second under it.
  for(const [i,code] of ['RWA','BWA'].entries()){
    if(i){await page.locator('[data-view="workflow"]').click();await page.locator('#new-workflow').click();}
    await page.locator('#workflow-file').setInputFiles(`${EXPORT}/${code}-workflow.json.gz`);
    await page.locator('[data-view="workflow"]').click();
    await expect(page.locator('.react-flow__node[data-id="census"]')).toBeAttached({timeout:30000});
    await page.locator('[data-view="project"]').click();
    if(!i){
      await page.locator('#project-file-new').click();
      await page.locator('#project-name-input').fill('Population models beside a census');
      await page.locator('#project-subject-input').fill('Where WorldPop, GRID3 and GHS-POP put each country\u2019s people, district by district, beside the 2022 census');
      await page.locator('#project-create').click();
    }else{
      await page.locator('#project-file-under').selectOption({label:'Population models beside a census'});
      await page.locator('#project-file').click();
    }
    await page.locator('[data-view="project"]').click();
    await expect(page.locator('#workflow-name-edit')).toHaveValue(`Where does each source put ${COUNTRIES[code].name}'s people?`);
  }
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Population models beside a census'}).first();
  await expect(block).toContainText('2 workflows');
  const download=page.waitForEvent('download');
  await block.locator('button[data-export-project]').click();
  await (await download).saveAs(`${EXPORT}/fieldwork-project.json.gz`);
});
