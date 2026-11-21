import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** JOIN A TABLE TO THE STUDY AREA, ON THE STANDARD (2026-11-20). The practitioner's DR Congo census, joined to provinces
 *  from geoBoundaries, stopped the run with "The table has no column """: no column had been chosen, and nothing showed
 *  the parts' names or what the join would make. Now the Inspector says what is missing, the dialog proposes the column
 *  naming the most parts, and shows the table and the parts Before, and each part's value After. */
test.use({serviceWorkers:'block'});
const PROVINCES=['Nord-Kivu','Sud-Kivu','Ituri','Maniema'];
const square=i=>[[[20+i,-2],[21+i,-2],[21+i,-1],[20+i,-1],[20+i,-2]]];
const ROWS=[['Kivu','Nord-Kivu',100],['Kivu','Sud-Kivu',80],['Haut-Zaïre','Ituri',60],['Kinshasa','Kinshasa',50]];
const workflow={schema:'fieldwork/workflow/1',name:'Census on provinces',nodes:[
  {id:'area',type:'study_area',x:20,y:20,params:{label:'Eastern provinces',source:'drawn',selectionMode:'polygon',
    geometry:{type:'MultiPolygon',coordinates:PROVINCES.map((_,i)=>square(i))},
    boundary:{boundaryID:'COD-ADM1-TEST',unitID:PROVINCES.join(', '),unitName:PROVINCES.join(', '),source:'geoBoundaries',licence:'CC BY 4.0',
      units:PROVINCES.map((name,i)=>({id:`COD-${i}`,name}))}}},
  {id:'census',type:'table_input',x:20,y:300,params:{label:'Census 1984',keys:['unit','geoboundaries_name'],valueField:'total',
    data:{kind:'data-table',keys:['unit','geoboundaries_name'],valueField:'total',rowCount:ROWS.length,missingValueCount:0,
      rows:ROWS.map(([unit,geoboundaries_name,total])=>({key:{unit,geoboundaries_name},value:total}))}}},
  {id:'join',type:'join_table_to_area',x:400,y:150,params:{label:'Census on provinces',keyField:'',normalisation:'fuzzy'}},
  {id:'map',type:'map_output',x:750,y:150,params:{label:'Map',basemap:'none'}}],
  edges:[{id:'e1',from:'census',to:'join',port:'records'},{id:'e2',from:'area',to:'join',port:'area'},{id:'e3',from:'join',to:'map',port:'polygons'}]};

test('the column naming each part is proposed, the table and parts shown Before, each part’s value After',async({page})=>{
  const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org|basemaps|tiles/,route=>route.abort('failed'));
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'join.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  // THE AREA'S PARTS, seen on the study area itself.
  await page.locator('.react-flow__node[data-id="area"]').click({timeout:45000});
  await expect(page.locator('[data-area-parts]')).toContainText('4 parts');
  await page.locator('#area-view-parts').click();
  await expect(page.locator('#table-viewer')).toContainText('Maniema');
  await page.keyboard.press('Escape');await expect(page.locator('#table-viewer')).toHaveCount(0);
  await page.locator('.react-flow__node[data-id="join"]').click();
  // THE INSPECTOR SAYS WHAT IS MISSING, before a run rather than as the run's refusal.
  await expect(page.locator('[data-join-missing]')).toContainText('Choose the column naming each part');
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('once the column naming each part is chosen');
  // SHOW ME HOW, in Configure… only, as every step's (2026-11-21).
  await expect(page.locator('#inspector-content [data-show-me]')).toHaveCount(0);
  await page.locator('#configure-step').click();
  await page.locator('#join-config #join-show-me').click();
  await expect(page.locator('#table-walkthrough')).toBeVisible();
  // EVERY STEP'S DRAWING IS STYLED (2026-11-21): the shapes had no styles from 0.154.0, so each filled black. A shape is
  // outlined or tinted, never black; a made part is filled.
  const walk=page.locator('#table-walkthrough');
  // BOTH TABLES JOINED, beside the drawing (2026-11-21): the study area's parts and the table, each row marked in words.
  await expect(walk.locator('.walk-table figcaption')).toHaveText(["The study area's parts",'The table']);
  await walk.locator('[data-walk-step]').click();
  await expect(walk.locator('tr[data-walk-state="matched"] .walk-word')).toHaveText([/gets 12/,/onto North/]);
  // A JOIN STAYS MARKED as the next one is made (2026-11-21): North's 12 is still there when St. Mary takes its 30.
  await walk.locator('[data-walk-step]').click();
  await expect(walk.locator('tr[data-walk-state="matched"] .walk-word')).toHaveText([/gets 12/,/gets 30/,/onto North/,/onto St. Mary/]);
  await expect(walk.locator('.walk-shape-result')).toHaveCount(2);
  await walk.locator('[data-walk-back]').click().catch(async()=>{await walk.getByRole('button',{name:'Back'}).click();});
  await walk.locator('[data-walk-back]').click().catch(async()=>{await walk.getByRole('button',{name:'Back'}).click();});
  await expect(walk.locator('.walk-say')).toContainText('Step 1 of 6.');
  for(let i=0;;i++){
    const fills=await walk.locator('.walk-shape').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).fill));
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.filter(f=>f==='rgb(0, 0, 0)'),`step ${i+1}`).toEqual([]);
    if(!await walk.locator('[data-walk-step]').isEnabled().catch(()=>false)||await walk.locator('[data-walk-step]').count()===0)break;
    await walk.locator('[data-walk-step]').click();if(i>8)break;
  }
  expect(await walk.locator('.walk-shape-result').evaluateAll(xs=>xs.map(x=>getComputedStyle(x).fill))).not.toContain('none');
  await walk.locator('[data-walk-close]').click();await expect(page.locator('#table-walkthrough')).toHaveCount(0);
  const dialog=page.locator('#join-config');
  await expect(dialog.locator('#join-key')).toHaveValue('geoboundaries_name');
  await expect(dialog.locator('[data-join-proposed]')).toContainText('names 3 of 4 parts');
  await expect(dialog.locator('.join-before')).toContainText('Census 1984 · 4 rows');
  await expect(dialog.locator('.join-before')).toContainText('Eastern provinces · 4 parts');
  await expect(dialog.locator('.join-before')).toContainText('Maniema');
  await expect(dialog.locator('[data-join-counts]')).toContainText('3 of 4 parts take a value; 1 is drawn empty; 1 of 4 rows name no part.');
  await expect(dialog.locator('.join-after')).toContainText('Kinshasa');
  // The census's own 1984 names name no part: said, and Apply still possible.
  await dialog.locator('#join-key').selectOption('unit');
  await expect(dialog.locator('[data-join-counts]')).toContainText('0 of 4 parts take a value');
  await expect(dialog.locator('.config-message')).toContainText('No part is named in "unit"');
  await dialog.locator('#join-key').selectOption('geoboundaries_name');
  await dialog.locator('#config-apply').click();await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-join-missing]')).toHaveCount(0);
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('its column "geoboundaries_name"');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="join"]').click();
  await expect(page.locator('#inspector-content .standard-result')).toContainText('3 of 4 parts took a value; 1 of 4 rows named no part.');
  expect(errors).toEqual([]);
});

test('a table dropped on the area input is bound to the table input, and an area to the area input',async({page})=>{
  const w=structuredClone(workflow);w.edges=[{id:'e3',from:'join',to:'map',port:'polygons'}];
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'join.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(w))});
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="join"] [data-handleid="parts"]')).toBeAttached({timeout:45000});
  await expect(page.locator('.react-flow__node[data-id="join"] [data-handleid="polygons"]')).toHaveCount(0);
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).edges);
  const drag=async(from,port)=>{
    const a=await page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`).boundingBox();
    const b=await page.locator(`.react-flow__node[data-id="join"] [data-handleid="${port}"]`).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();};
  // The census dropped on "Study area or polygon layer": it is a table, so it goes to Table.
  await drag('census','parts');
  await expect.poll(async()=>(await saved()).some(e=>e.from==='census'&&e.to==='join'&&e.port==='records')).toBe(true);
  // The study area dropped on "Table": it is an area, so it goes to the area input.
  await drag('area','records');
  await expect.poll(async()=>(await saved()).some(e=>e.from==='area'&&e.to==='join'&&e.port==='area')).toBe(true);
  expect((await saved()).filter(e=>e.to==='join').length).toBe(2);
});

/** LONG TABLES SCROLL (the practitioner, 2026-11-21, on Nigeria's 774 LGAs): a table in a dialog of more than 20 rows
 *  shows 20 at a time and scrolls with its header held, Before and After alike, rather than its first 12 rows. */
test('a dialog’s Before and After tables of more than 20 rows show 20 at a time and scroll',async({page})=>{
  const names=Array.from({length:30},(_,i)=>`District ${i+1}`);
  const long=structuredClone(workflow);
  const area=long.nodes.find(n=>n.id==='area'),census=long.nodes.find(n=>n.id==='census');
  area.params.geometry={type:'MultiPolygon',coordinates:names.map((_,i)=>square(i))};
  area.params.boundary={...area.params.boundary,unitID:names.join(', '),unitName:names.join(', '),units:names.map((name,i)=>({id:`D-${i}`,name}))};
  census.params.data={...census.params.data,rowCount:30,rows:names.map((name,i)=>({key:{unit:name,geoboundaries_name:name},value:i}))};
  await page.route(/tile\.openstreetmap\.org|basemaps|tiles/,route=>route.abort('failed'));
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'long.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(long))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="join"]').click({timeout:45000});
  await page.locator('#configure-step').click();
  const boxes=page.locator('#join-config .table-rows-scroll');
  await expect(boxes).toHaveCount(3);
  for(const box of await boxes.all()){
    const seen=await box.evaluate(el=>{const head=el.querySelector('thead').offsetHeight,row=el.querySelector('tbody tr').offsetHeight;
      el.scrollTop=el.scrollHeight;
      return {rows:el.querySelectorAll('tbody tr').length,inView:Math.round((el.clientHeight-head)/row),scrolls:el.scrollHeight>el.clientHeight,
        headHeld:Math.abs(el.querySelector('th').getBoundingClientRect().top-el.getBoundingClientRect().top)<2};});
    expect(seen).toEqual({rows:30,inView:20,scrolls:true,headHeld:true});
  }
});

/** THE LEVELS, SAID BEFORE A RUN (the practitioner, 2026-11-21): Nigeria's LGA table connected to a study area of its
 *  states says so in the panel and in Configure…, naming the census table at the area's level. */
test('a census table at another level than the study area is said to be, before any run',async({page})=>{
  const levels=structuredClone(workflow);
  const area=levels.nodes.find(n=>n.id==='area'),census=levels.nodes.find(n=>n.id==='census');
  area.params.boundary.boundaryID='NGA-ADM1-TEST';
  census.params.remote={url:'https://raw.githubusercontent.com/digital-twin-ph/census-tables/e688e90a7fb7df7c880a185b61b7e7371d3bd1ec/NGA/lgas.csv',sha256:'0'.repeat(64),bytes:1};
  await page.route(/tile\.openstreetmap\.org|basemaps|tiles|raw\.githubusercontent/,route=>route.abort('failed'));
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'levels.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(levels))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="join"]').click({timeout:45000});
  await expect(page.locator('#inspector-content [data-join-levels]')).toContainText('census at ADM2, 774 rows; the study area is at ADM1');
  await page.locator('#configure-step').click();
  await expect(page.locator('#join-config [data-join-levels]')).toContainText('Choose “Its 37 states');
});
