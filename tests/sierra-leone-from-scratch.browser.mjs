import {test,expect} from './fixtures.mjs';
import {existsSync,readFileSync} from 'node:fs';
import {performManual} from './manual-runner.mjs';

/** MEASLES IN SIERRA LEONE, FROM AN EMPTY CANVAS, by performing example-2019-sierra-leone-measles' own manual
 *  (experiments 189 and 190). The line list is semi-synthetic and public; it is fetched from raw.githubusercontent.com at
 *  a fixed commit, and this test answers that URL from the checkout beside this repository. SIERRA_LEONE_EXPORT saves
 *  the project for the example repository. */
test.use({serviceWorkers:'block'});

const REPO=new URL('../../example-2019-sierra-leone-measles/',import.meta.url);
const MANUAL=new URL('manual.json',REPO);
const skip=existsSync(MANUAL)?false:'example-2019-sierra-leone-measles is not checked out beside this repository.';

test('measles in Sierra Leone, built by following the manual',async({page})=>{test.skip(!!skip,skip);
  test.setTimeout(600_000);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-2019-sierra-leone-measles\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*','content-type':'text/plain'}});
  });
  // GRID3'S REGISTER (CC BY 4.0), answered from its fixture by the service's own query, so nothing is downloaded.
  const grid3=JSON.parse(readFileSync(new URL('fixtures/grid3-sle-facilities.json',import.meta.url),'utf8'));
  await page.route(/services3\.arcgis\.com\/.*sle_htlfac_grid3_v01\/FeatureServer\/0\/query/,route=>
    route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
      body:JSON.stringify({features:grid3.records.map(attributes=>({attributes})),exceededTransferLimit:false})}));
  const manual=JSON.parse(readFileSync(MANUAL,'utf8'));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  for(const [index,workflow] of manual.workflows.entries()){
    await performManual(page,workflow,{repo:REPO});
    await page.screenshot({path:`test-results/sierra-leone-${index+1}.png`});
    await page.locator('[data-view="results"]').click();const map=page.locator('#result-tabs [role="tab"]').filter({hasText:'Map'});
    if(await map.count()){await map.first().click();await page.waitForTimeout(1500);await page.screenshot({path:`test-results/sierra-leone-${index+1}-map.png`});}
  }
  await page.locator('[data-view="project"]').click();
  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Measles in Sierra Leone'}).first();
  await expect(block).toContainText(`${manual.workflows.length} workflow`);
  if(process.env.SIERRA_LEONE_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.SIERRA_LEONE_EXPORT);
  }
});
