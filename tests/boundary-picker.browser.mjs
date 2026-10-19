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
// Not a rectangle: a committed study area that comes back as four corners would be the bug.
const blob=(x,y)=>({type:'Polygon',coordinates:[[...Array.from({length:40},(_,i)=>{
  const a=2*Math.PI*i/40,r=0.3*(1+0.2*Math.sin(a*5));
  return [x+r*Math.cos(a),y+r*Math.sin(a)];}),[x+0.3,y]]]});

async function stub(page,{levelPayload=level(),units=2}={}){
  await page.route(/geoboundaries\.org\/api/,r=>r.fulfill({
    status:levelPayload?200:404,contentType:'application/json',
    body:JSON.stringify(levelPayload??{})}));
  await page.route(/example\.invalid/,r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({features:Array.from({length:units},(_,i)=>({
      properties:{shapeID:`COD-${i}`,shapeName:['Rutshuru','Nyiragongo','Masisi'][i]??`Unit ${i}`},
      geometry:blob(29+i,-1-i)}))})}));
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
  // A NAME, not a code. "Considering low friction, why do we not use a country dropdown or a
  // predictive entry selector?" -- choosing the country is a judgment; remembering that the DRC
  // is COD is a lookup.
  await expect(page.locator('#area-iso-options option')).toHaveCount(230);
  await page.locator('#area-iso').fill('Democratic Republic of the Congo');
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

  // The dialog has to ADMIT the selection. It wrote this summary once with a hard-coded empty
  // list, so it read "0 of 189 ADM2 units" however many were chosen -- the dialog denying a
  // selection it had in fact registered. The practitioner, 2026-10-18: "This selection does not
  // work even if offered."
  await expect(page.locator('#area-boundary-terms')).toContainText('none chosen yet');

  // THE MAP FOLLOWS THE CHOICE. "if I select the country the map should go there, and if I
  // select an ADM unit, the map should go there, less friction." The dialog could otherwise sit
  // over Gaborone while units in the DRC were being picked.
  const lookingAt=()=>page.locator('#area-map').getAttribute('data-looking-at');
  // The map goes to the COUNTRY as soon as its units are known, rather than staying at the
  // default view over Gaborone.
  const country=(await lookingAt()).split(',').map(Number);
  expect(country[0],'west of the country extent').toBeGreaterThan(28);
  expect(country[0]).toBeLessThan(31);

  await page.locator('#area-boundary-pick').selectOption(['0']);
  // And to the UNIT when one is chosen: a tighter extent inside the country's.
  const unit=(await lookingAt()).split(',').map(Number);
  expect(unit[2]-unit[0],'the unit is narrower than the whole level')
    .toBeLessThan(country[2]-country[0]);
  expect(unit[0]).toBeGreaterThanOrEqual(country[0]);
  await expect(page.locator('#area-boundary-terms')).toContainText('1 of');
  // Named, not just counted: Bunia (a city) sits beside Irumu (a territory a hundred times
  // larger) under the same ADM2 label, so a count does not say which was chosen.
  await expect(page.locator('#area-boundary-terms')).toContainText('Rutshuru');

  // ONE unit commits its OWN OUTLINE. "Selecting Bunia gave me a square not the jurisdictional
  // polygon" -- a bounding box includes ground in no jurisdiction at all.
  await page.locator('#area-boundary-use').click();
  await expect(page.locator('#area-boundary-terms')).toContainText('Rutshuru');
  await expect(page.locator('#area-boundary-terms')).toContainText('as published');
  await expect(page.locator('#area-boundary-terms')).toContainText('COD-ADM3-77481523');

  // The chosen units became the study area, and it can be applied like any other.
  await expect(page.locator('#area-apply')).toBeEnabled();
  await page.locator('#area-apply').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.type==='study_area').params);
  expect(saved.geometry.type).toBe('Polygon');
  // The shape, not a box: 40 vertices went in and a rectangle has four. And AS PUBLISHED --
  // every vertex the source gave, none thinned to meet a count. The practitioner, 2026-10-18:
  // "we want to admit polygons as long as they do not overrun memory."
  expect(saved.geometry.coordinates[0].length).toBe(41);
  expect(saved.selectionMode).toBe('polygon');
  expect(errors).toEqual([]);
});

test('a level a country does not publish is an answer, not a failure',async({page})=>{
  const errors=collectPageErrors(page);
  // NGA and BRA really return nothing at ADM3. A picker cannot assume a hierarchy depth.
  await stub(page,{levelPayload:null});
  await openArea(page);
  await page.locator('#area-iso').fill('Nigeria');
  await page.locator('#area-adm').selectOption('ADM3');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-status'))
    .toContainText('Nigeria (NGA) publishes no ADM3',{timeout:20000});
  await expect(page.locator('#area-boundary-units')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a permissive level does not warn about share-alike',async({page})=>{
  await stub(page,{levelPayload:level({boundaryISO:'UGA',boundaryType:'ADM3',
    boundaryLicense:'CC0 1.0 Universal (CC0 1.0)',boundaryYearRepresented:'2020',
    admUnitCount:'137',boundaryID:'UGA-ADM3-73843447'})});
  await openArea(page);
  await page.locator('#area-iso').fill('Uganda');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-terms')).toContainText('CC0',{timeout:20000});
  await expect(page.locator('#area-boundary-terms')).not.toContainText('SHARE-ALIKE');
});

test('a country name inside another names the near miss rather than resolving in silence',async({page})=>{
  await stub(page,{levelPayload:level({boundaryISO:'COG',boundaryName:'Congo'})});
  await openArea(page);
  // "Congo" IS the Republic of the Congo, so resolving it is correct -- and somebody who meant
  // the Democratic Republic of the Congo must see that before downloading a boundary a thousand
  // kilometres from their outbreak. Experiment 47's warning, in the one case that matters here.
  await page.locator('#area-iso').fill('Congo');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-status'))
    .toContainText('Democratic Republic of the Congo also match',{timeout:20000});
});

test('an ambiguous entry refuses rather than guessing',async({page})=>{
  await stub(page);
  await openArea(page);
  await page.locator('#area-iso').fill('United');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-status')).toContainText('No single country matches');
});

test('several units are a bounding box, and the dialog says so instead of letting it pass',async({page})=>{
  await stub(page,{units:3});
  await openArea(page);
  await page.locator('#area-iso').fill('Democratic Republic of the Congo');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-units')).toBeVisible({timeout:20000});
  await page.locator('#area-boundary-pick').selectOption(['0','1']);
  await page.locator('#area-boundary-use').click();
  // Honest rather than quiet: a box around two districts covers ground in neither.
  await expect(page.locator('#area-boundary-terms'))
    .toContainText('A BOUNDING BOX AROUND 2 UNITS, not their outlines');
  await expect(page.locator('#area-boundary-terms')).toContainText('Choose one unit for its own boundary');
});
