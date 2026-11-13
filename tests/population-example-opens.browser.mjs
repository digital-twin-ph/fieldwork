import {test,expect} from './fixtures.mjs';
import {existsSync,readFileSync} from 'node:fs';

/** THE EXAMPLE AS ANOTHER DEVICE OPENS IT (experiment 209): the project arrives with no raster window in it, each Raster
 *  input says so, and each window is read again, from the file downloaded from WorldPop or from the JRC's copy, and checked
 *  against the digest of the window the example was built from. Then it runs. */
test.use({serviceWorkers:'block'});
const REPO=new URL('../../example-population-models-census/',import.meta.url),FILES=process.env.POP_FILES;
const ID='urn:fieldwork:example:population-models-census';

test('Rwanda’s workflow opens from the example, its windows read again and checked, and runs',async({page})=>{
  test.skip(!FILES||!existsSync(new URL('fieldwork-project.json.gz',REPO)),'Needs the example repository beside this one and POP_FILES.');
  test.setTimeout(900_000);
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
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:600000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Shares by district and source'}).click();
  await page.locator('#result-search').fill('Gasabo');
  const rows=await page.locator('#data-table-view tbody tr').evaluateAll(trs=>trs.map(tr=>[...tr.children].map(td=>td.textContent.trim())));
  // Gasabo, Kigali's largest district: 6.6 % of the census, and of WorldPop's and GRID3's, by construction.
  expect(rows.filter(r=>r[0]!=='GHS-POP 2025').map(r=>r.at(-1))).toEqual(['6.6','6.6','6.6']);
});
