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
  // WHO WERE THE CASES (2026-11-12): the file's own counts, by sex and by age band, found in the results.
  const rows=readFileSync(new URL('data/measles-sierra-leone-semisynthetic.csv',REPO),'utf8').trim().split(/\r?\n/);
  const head=rows[0].split(',');const sexAt=head.indexOf('Sex'),ageAt=head.indexOf('Age (years)');
  const cells=rows.slice(1).map(line=>line.match(/("([^"]*)"|[^,]*)(,|$)/g).slice(0,head.length).map(v=>v.replace(/,$/,'').replace(/^"|"$/g,'')));
  const tally=f=>cells.reduce((m,c)=>{const k=f(c);m[k]=(m[k]??0)+1;return m;},{});
  const bySex=tally(c=>c[sexAt]);
  expect(bySex.Male+bySex.Female).toBe(2601);
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Cases by sex'}).click();
  const main=page.locator('main').first();
  await expect(main).toContainText('3 of 3 rows');
  for(const sex of ['Male','Female'])
    await expect(main.locator('tr',{has:page.locator('th,td',{hasText:new RegExp(`^${sex}$`)})}).first()).toContainText(String(bySex[sex]));
  const band=a=>a===''?'':a<1?'0':a<5?'1 to 4':a<10?'5 to 9':a<15?'10 to 14':'15 and over';
  const byBand=tally(c=>band(c[ageAt]===''?'':Number(c[ageAt])));
  expect([byBand['0'],byBand['1 to 4'],byBand['5 to 9'],byBand['10 to 14'],byBand['15 and over']]).toEqual([546,1329,458,102,164]);
  await page.getByRole('tab',{name:'Cases by age and sex'}).click();
  await expect(page.locator('#vega-chart [aria-label^="X-axis"]').last()).toHaveAttribute('aria-label',/0, 1 to 4, 5 to 9, 10 to 14, 15 and over/);
  await page.screenshot({path:'test-results/sierra-leone-4-profile.png'});

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
