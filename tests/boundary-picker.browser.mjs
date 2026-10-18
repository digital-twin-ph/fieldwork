import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "The study area still does not show geoboundary download" -- the practitioner, 2026-10-17.
// Experiment 14 specified this on 2026-10-06 and its status said jurisdiction selection was
// "not yet implemented"; the research existed and the surface did not.
//
// The API is stubbed here. These responses are what the live service returned on 2026-10-17,
// recorded in docs/research/geoboundaries-probe-2026-10-17.md -- a test that reached the network
// would be measuring their uptime, not this application.
const level=(over={})=>({boundaryID:'COD-ADM3-77481523',boundaryISO:'COD',boundaryType:'ADM3',
  boundaryName:'Democratic Republic of the Congo',admUnitCount:'188',meanVertices:'917.0',
  maxVertices:'9001',boundaryYearRepresented:'2010.0',
  boundaryLicense:'Open Data Commons Open Database License 1.0',
  gjDownloadURL:'https://example.invalid/cod-adm3.geojson',...over});
const square=(x,y)=>({type:'Polygon',coordinates:[[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]]]});

async function stub(page,{levelPayload=level(),units=2}={}){
  await page.route(/geoboundaries\.org\/api/,r=>r.fulfill({
    status:levelPayload?200:404,contentType:'application/json',
    body:JSON.stringify(levelPayload??{})}));
  await page.route(/example\.invalid/,r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({features:Array.from({length:units},(_,i)=>({
      properties:{shapeID:`COD-${i}`,shapeName:['Rutshuru','Nyiragongo','Masisi'][i]??`Unit ${i}`},
      geometry:square(29+i,-1-i)}))})}));
}

// THE SERVICE WORKER INTERCEPTS BEFORE PLAYWRIGHT'S ROUTING DOES, in WebKit, so the stubs below
// never applied and the test reached the live API -- which incidentally proved the feature works,
// downloading 189 real COD ADM2 units through the LFS media host, but measured geoBoundaries'
// uptime rather than this application. Blocked for this file only; every other test keeps the
// worker, because offline behaviour is part of what they check.
test.use({serviceWorkers:'block'});

const openArea=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('.react-flow__node[data-id="village"]').click();
  await page.locator('#edit-study-area').click();
  await page.locator('#area-boundary-source summary').click();
};

test('a study area can be chosen from administrative boundaries',async({page})=>{
  const errors=collectPageErrors(page);
  await stub(page);
  await openArea(page);
  await page.locator('#area-iso').fill('COD');
  await page.locator('#area-adm').selectOption('ADM3');
  await page.locator('#area-boundary-check').click();

  // The SIZE is shown before the shapes are downloaded: that is what the metadata endpoint is
  // for, and what makes "only the boundaries we need" possible.
  await expect(page.locator('#area-boundary-units')).toBeVisible({timeout:20000});
  // The size STAYS on screen: a message replaced the moment the download finishes is one the
  // practitioner may never read, and the size is what makes the choice a decision.
  await expect(page.locator('#area-boundary-terms')).toContainText('917 vertices each on average');
  await expect(page.locator('#area-boundary-terms')).toContainText('of 188 ADM3 units');

  // A SHARE-ALIKE LICENCE SAYS SO. The project's own records called geoBoundaries
  // "attribution obligation only"; the DRC levels are ODbL.
  await expect(page.locator('#area-boundary-terms')).toContainText('SHARE-ALIKE');
  // And the vintage, normalised from the "2010.0" the service really returns.
  await expect(page.locator('#area-boundary-terms')).toContainText('represents 2010');

  await page.locator('#area-boundary-pick').selectOption(['0','1']);
  await page.locator('#area-boundary-use').click();
  await expect(page.locator('#area-boundary-terms')).toContainText('Rutshuru, Nyiragongo');
  await expect(page.locator('#area-boundary-terms')).toContainText('COD-ADM3-77481523');

  // The chosen units became the study area, and it can be applied like any other.
  await expect(page.locator('#area-apply')).toBeEnabled();
  await page.locator('#area-apply').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.type==='study_area').params.geometry);
  expect(saved.type).toBe('Polygon');
  expect(errors).toEqual([]);
});

test('a level a country does not publish is an answer, not a failure',async({page})=>{
  const errors=collectPageErrors(page);
  // NGA and BRA really return nothing at ADM3. A picker cannot assume a hierarchy depth.
  await stub(page,{levelPayload:null});
  await openArea(page);
  await page.locator('#area-iso').fill('NGA');
  await page.locator('#area-adm').selectOption('ADM3');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-status'))
    .toContainText('NGA publishes no ADM3',{timeout:20000});
  await expect(page.locator('#area-boundary-units')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a permissive level does not warn about share-alike',async({page})=>{
  await stub(page,{levelPayload:level({boundaryISO:'UGA',boundaryType:'ADM3',
    boundaryLicense:'CC0 1.0 Universal (CC0 1.0)',boundaryYearRepresented:'2020',
    admUnitCount:'137',boundaryID:'UGA-ADM3-73843447'})});
  await openArea(page);
  await page.locator('#area-iso').fill('UGA');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-terms')).toContainText('CC0',{timeout:20000});
  await expect(page.locator('#area-boundary-terms')).not.toContainText('SHARE-ALIKE');
});
