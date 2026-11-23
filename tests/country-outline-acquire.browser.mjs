import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE COUNTRY OUTLINE, ACQUIRED WITH THE UNITS (2026-11-23). The practitioner: *"when we pick admin boundary other
 *  than ADM0 ... we can have the option to include the ADM0 boundary as well for context."* Offered only below the
 *  country, read from the same release as the units, and as the SIMPLIFIED geometry: DR Congo's outline is 339 KB
 *  against 2.4 MB, and a line drawn for context needs no more. geoBoundaries is stubbed here. */
test.use({serviceWorkers:'block'});
const blob=(x,y)=>({type:'Polygon',coordinates:[[[x,y],[x+1,y],[x+1,y+1],[x,y+1],[x,y]]]});
const ADM3={boundaryID:'COD-ADM3-77481523',boundaryISO:'COD',boundaryType:'ADM3',
  boundaryName:'Democratic Republic of the Congo',admUnitCount:'188',meanVertices:'917.0',maxVertices:'9001',
  boundaryYearRepresented:'2010.0',boundaryLicense:'Open Data Commons Open Database License 1.0',
  gjDownloadURL:'https://example.invalid/cod-adm3.geojson'};
const ADM0={boundaryID:'COD-ADM0-95928705',boundaryISO:'COD',boundaryType:'ADM0',
  boundaryName:'Democratic Republic of the Congo',boundaryYearRepresented:'2022',
  boundaryLicense:'not stated',licenseSource:'www.openstreetmap.org/copyright',boundarySource:'geoBoundaries',
  gjDownloadURL:'https://example.invalid/cod-adm0.geojson',
  simplifiedGeometryGeoJSON:'https://example.invalid/cod-adm0-simplified.geojson'};

test('the country outline is offered below ADM0, fetched simplified, and kept with its own licence',async({page})=>{
  const errors=collectPageErrors(page);
  const asked=[];
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/boundaries\//,r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route(/geoboundaries\.org\/api/,r=>{asked.push(r.request().url());
    return r.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify(/\/ADM0\//.test(r.request().url())?ADM0:ADM3)});});
  await page.route(/example\.invalid\/cod-adm3/,r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({features:[{properties:{shapeID:'COD-0',shapeName:'Rutshuru'},geometry:blob(29,-1)}]})}));
  await page.route(/example\.invalid\/cod-adm0-simplified/,r=>r.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({features:[{properties:{shapeName:'Democratic Republic of the Congo'},geometry:blob(28,-2)}]})}));
  // The full outline is never asked for: a context line is not worth a megabyte nobody asked for.
  await page.route(/example\.invalid\/cod-adm0\.geojson/,r=>r.abort());

  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#workflow-select')).toHaveValue('hagelloch');
  await page.locator('.react-flow__node[data-id="village"]').click();
  await page.locator('#edit-study-area').click();
  await page.locator('#area-boundary-source summary').click();
  await page.locator('#area-iso').fill('Democratic Republic of the Congo');
  await page.locator('#area-adm').selectOption('ADM3');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-units')).toBeVisible({timeout:20000});
  // OFFERED, because ADM3 is below the country.
  await expect(page.locator('#area-country-row')).toBeVisible();
  await page.locator('#area-country-outline').check();
  await page.locator('#area-boundary-pick').selectOption([{index:0}]);
  await page.locator('#area-boundary-use').click();
  await expect(page.locator('#area-boundary-terms')).toContainText('Rutshuru',{timeout:20000});
  await page.locator('#area-apply').click();
  const kept=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.type==='study_area').params.countryOutline);
  expect(kept?.provenance.boundaryID).toBe('COD-ADM0-95928705');
  // ITS OWN TERMS, not the province's: the country's licence is not the unit's to inherit.
  expect(kept.provenance.licence).toBe('not stated');
  expect(kept.provenance.licenceSource).toBe('www.openstreetmap.org/copyright');
  expect(kept.provenance.retrievedFrom).toContain('simplified');
  expect(kept.geometry.type).toBe('Polygon');
  expect(asked.some(u=>/\/ADM0\//.test(u))).toBe(true);
  expect(errors).toEqual([]);
});
