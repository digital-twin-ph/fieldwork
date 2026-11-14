import {test,expect} from './fixtures.mjs';
import {existsSync,readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** THE EXAMPLE AS ANOTHER DEVICE OPENS IT (experiment 209): the project arrives with no raster window in it, each Raster
 *  input says so, and each window is read again, from the file downloaded from WorldPop or from the JRC's copy, and checked
 *  against the digest of the window the example was built from. Then it runs. */
test.use({serviceWorkers:'block'});
const REPO=new URL('../../example-population-models-census/',import.meta.url),FILES=process.env.POP_FILES;
const ID='urn:fieldwork:example:population-models-census';

test('Rwanda’s workflow opens from the example, its windows read again and checked, and runs',async({page})=>{
  test.skip(!FILES||!existsSync(new URL('fieldwork-project.json.gz',REPO)),'Needs the example repository beside this one and POP_FILES.');
  test.setTimeout(900_000);
  const errors=collectPageErrors(page);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-population-models-census/,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO))});
  });
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator(`[data-open-example="${ID}"]`).click();
  await expect(page.locator(`[data-example-status="${ID}"]`)).toContainText('digest matched',{timeout:60000});
  const value=await page.locator('#workflow-select option').filter({hasText:'Rwanda'}).getAttribute('value');
  await page.locator('#workflow-select').selectOption(value);
  await page.locator('[data-view="workflow"]').click();
  const reread=async(id,file)=>{
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await expect(page.locator('[data-raster-missing]')).toContainText('The window is not on this device yet',{timeout:30000});
    if(file)await page.locator('#raster-reread-file').setInputFiles(`${FILES}/${file}`);
    else await page.locator('#raster-reread').click();
    await expect(page.locator('[data-raster-missing]')).toHaveCount(0,{timeout:600000});
  };
  await reread('worldpop','dl-worldpop-rwa/rwa_pop_2025_CN_100m_R2025A_v1.tif');
  await reread('grid3','dl-grid3-rwa/rwa_SSApopulation_ 2025_v1_0_gridded.tif');
  await reread('ghs');
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Run failed/,{timeout:600000});
  if((await page.locator('#workflow-state').innerText()).includes('failed'))console.log('FAILED:',(await page.locator('.toast').allInnerTexts()).join(' | '),(await page.locator('.react-flow__node.failed, .node-error, [data-status="failed"]').allInnerTexts()).join(' | ').slice(0,800));
  await expect(page.locator('#workflow-state')).toContainText('Run complete');
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Shares by district and source'}).click();
  await page.locator('#result-search').fill('Gasabo');
  const rows=await page.locator('#data-table-view tbody tr').evaluateAll(trs=>trs.map(tr=>[...tr.children].map(td=>td.textContent.trim())));
  // Gasabo, Kigali's largest district: 6.6 % of the census, and of WorldPop's and GRID3's, by construction.
  expect(rows.filter(r=>r[0]!=='GHS-POP 2025').map(r=>r.at(-1))).toEqual(['6.6','6.6','6.6']);
  await page.locator('#result-search').fill('');

  // MAPS SIDE BY SIDE, ONE SCALE (experiment 212): the four sources' shares in four panels, two by two, one key. Gasabo's
  // share is the same in the census, WorldPop and GRID3, so its shade is the same in their three panels.
  await page.getByRole('tab',{name:'Each source\u2019s share, side by side'}).click();
  const panels=page.locator('#map g[data-map-panel]');
  await expect(panels).toHaveCount(4,{timeout:30000});
  expect(await panels.evaluateAll(gs=>gs.map(g=>g.getAttribute('data-map-panel')))).toEqual(['Census 2022','WorldPop 2025','GRID3 2025','GHS-POP 2025']);
  const fills=await panels.evaluateAll(gs=>gs.map(g=>[...g.querySelectorAll('path')].find(p=>p.querySelector('title')?.textContent.startsWith('Gasabo'))?.getAttribute('fill')));
  expect(fills[0]).toBeTruthy();
  expect(fills.slice(0,3)).toEqual([fills[0],fills[0],fills[0]]);
  const key=(await page.locator('#map text').allTextContents()).join(' ');
  expect(key).toContain('one scale for every panel; side by side, not a difference');
  expect(key.match(/Polygon shade/g)?.length).toBe(1);
  await page.screenshot({path:'test-results/population-panels-static.png',fullPage:true});

  // INTERACTIVE: one map per panel, and moving one moves the others.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#config-apply').click();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Each source\u2019s share, side by side'}).click();
  const maps=page.locator('.map-panel .leaflet-container');
  await expect(maps).toHaveCount(4,{timeout:30000});
  const centre=i=>maps.nth(i).evaluate(el=>el.querySelector('.leaflet-map-pane')?.style.transform??'');
  const before=await centre(3);
  const box=await maps.nth(0).boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2+40,{steps:6});await page.mouse.up();
  await expect.poll(()=>centre(3),{timeout:10000}).not.toBe(before);
  await page.screenshot({path:'test-results/population-panels-interactive.png',fullPage:true});

  // GRID CELLS IN PANELS (experiment 212, the practitioner: "the maps with the reddish orange hues actually show the grid
  // cells"): the three rasters in a row, people per km², one scale; interactive, linked as they move.
  await page.getByRole('tab',{name:'Each source\u2019s cells, side by side'}).click();
  const cellPanels=page.locator('#map g[data-map-panel]');
  await expect(cellPanels).toHaveCount(3,{timeout:30000});
  expect(await cellPanels.evaluateAll(gs=>gs.map(g=>g.getAttribute('data-map-panel')))).toEqual(['WorldPop 2025','GRID3 2025','GHS-POP 2025']);
  await expect(page.locator('#map image')).toHaveCount(3);
  // Each panel draws the study area's outline (the practitioner, 2026-11-13: "How come the static maps did not have a
  // study area?").
  await expect(page.locator('#map path[data-panel-outline]')).toHaveCount(3);
  expect((await page.locator('#map text').allTextContents()).join(' ')).toContain('Cell shade: people per km², one scale for every panel');
  await page.screenshot({path:'test-results/population-cells-static.png',fullPage:true});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="cells"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#polygon-presentation').selectOption('interactive');
  await page.locator('#config-apply').click();
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Each source\u2019s cells, side by side'}).click();
  const cellMaps=page.locator('.raster-panel-map.leaflet-container');
  await expect(cellMaps).toHaveCount(3,{timeout:30000});
  await expect(page.locator('[data-density-key]')).toContainText('people per km²');
  await expect(page.locator('.raster-panel-map path.raster-panel-outline')).toHaveCount(3);
  // Where the third panel's cells are drawn, which a zoom or a pan of the first changes.
  const drawnAt=i=>cellMaps.nth(i).evaluate(el=>{const img=el.querySelector('.raster-panel-image');return img?`${img.style.width} ${img.style.transform}`:'';});
  const was=await drawnAt(2);
  await cellMaps.nth(0).hover();await page.mouse.wheel(0,-300);
  await expect.poll(()=>drawnAt(2),{timeout:10000}).not.toBe(was);
  await expect(page.locator('#result-metrics')).toContainText('3 rasters side by side');
  await expect(page.locator('#polygon-method')).toHaveCount(0);
  await page.screenshot({path:'test-results/population-cells-interactive.png',fullPage:true});

  // HOW FAR EACH MODEL IS FROM THE CENSUS (experiment 209, 2026-11-14): the share of the country's people each places in a
  // different district, from shares held to one decimal; WorldPop and GRID3 follow the census by construction.
  await page.getByRole('tab',{name:'People each model places in another district, %'}).click();
  const moved=Object.fromEntries((await page.locator('#data-table-view tbody tr').evaluateAll(trs=>trs.map(tr=>[...tr.children].map(td=>td.textContent.trim()))))
    .map(r=>[r[0],Number(r.at(-1))]));
  expect(moved).toEqual({'WorldPop 2025':0,'GRID3 2025':0,'GHS-POP 2025':5.6});
  await page.getByRole('tab',{name:'Difference from the census, by district'}).click();
  await expect(page.locator('main').first()).toContainText('Percentage points');
  await page.screenshot({path:'test-results/population-difference.png',fullPage:true});
  // ZONAL STATISTICS, per district, for each source.
  await page.getByRole('tab',{name:'GHS-POP 2025: zonal statistics by district'}).click();
  const zonal=page.locator('main').first();
  for(const column of ['cell_median','density_km2'])await expect(zonal).toContainText(column);
  await page.screenshot({path:'test-results/population-zonal.png',fullPage:true});
  // The project's notes, as written.
  await page.locator('[data-view="notes"]').click();
  await expect(page.locator('#notes-view')).toContainText('the share of the country\u2019s people the model places in a different district');
  expect(errors).toEqual([]);
});
