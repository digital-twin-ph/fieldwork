import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// "I tried to download North Kivu ADM1 study area and I think process hangs."
//
// The real level, as geoBoundaries published it on 2026-10-20: all 26 DRC provinces, 5.0 MB,
// 194,049 vertices between them, of which North Kivu alone is 16,548. The application downloads
// the WHOLE level because that is how the service publishes it, then keeps the unit chosen.
// Served from a fixture here, so this measures the application and not the service's uptime.
test.use({serviceWorkers:'block'});
// This ran in Chromium alone for part of a day, because applying North Kivu's 16,548 vertices
// CRASHED WebKit. The cause was a draggable Leaflet marker per vertex -- 16,547 divs with
// listeners -- found by profiling rather than by reading, and the limit on handles removed it.
// Both engines again, which is the point of keeping the measurement.
test.describe.configure({timeout:300_000});
const shapes=readFileSync(new URL('fixtures/cod-adm1-2026-10-20.geojson',import.meta.url),'utf8');
const meta={boundaryID:'COD-ADM1-28894549',boundaryISO:'COD',boundaryType:'ADM1',
  boundaryName:'Democratic Republic of the Congo',admUnitCount:'26',meanVertices:'7463.0',
  maxVertices:'16548',boundaryYearRepresented:'2017.0',
  boundaryLicense:'Open Data Commons Open Database License 1.0',
  gjDownloadURL:'https://example.invalid/cod-adm1.geojson'};

// Measured 2026-10-20 in Chromium, with the level served from the fixture beside this file. The
// numbers that matter, and how they were separated:
//
//   download and unit list   0.5 s     choose the unit   0.1 s     use these boundaries   0.1 s
//   apply, wall clock        ~8 s      apply, with the main thread already settled   1.6 s
//
// The difference is not work: it is the MAIN THREAD BLOCKED for about 2.5 s once the boundary
// lands, plus this runner waiting for the button to be actionable. A probe of the button through
// that window found it enabled and not moving the whole time, so what a practitioner meets is a
// frozen interface rather than a disabled control -- which is what was reported as a hang.
//
// Accounted for inside it: refresh() 1.26 s on the first draw, the apply handler 0.6 s, of which
// validation is 0.10 s and the N3 0.09 s. The rest is layout and paint.
test('the largest published DRC province can be acquired, and every phase is timed',async({page})=>{
  // Every phase message is recorded, because which phase carries the cost differs by engine --
  // WebKit spends it drawing, Chromium spends it applying -- and a message that has already been
  // replaced cannot be raced for.
  await page.addInitScript(()=>{
    const seen=[];Object.defineProperty(window,'__phases',{get:()=>seen});
    const watch=()=>{const el=document.querySelector('#area-feedback');if(!el)return setTimeout(watch,20);
      new MutationObserver(()=>seen.push(el.textContent||'')).observe(el,{childList:true,subtree:true,characterData:true});};
    watch();
  });
  await page.route(/geoboundaries\.org\/api/,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(meta)}));
  await page.route(/example\.invalid/,r=>r.fulfill({status:200,contentType:'application/json',body:shapes}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('.react-flow__node[data-id="village"]').click();
  await page.locator('#edit-study-area').click();
  await page.locator('#area-boundary-source summary').click();

  const began=Date.now();
  await page.locator('#area-iso').fill('Democratic Republic of the Congo');
  await page.locator('#area-adm').selectOption('ADM1');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-units')).toBeVisible({timeout:180000});
  console.log(`MEASURED download and unit list: ${((Date.now()-began)/1000).toFixed(1)} s`);

  const chose=Date.now();
  await page.locator('#area-boundary-pick').selectOption({label:'North Kivu'});
  await expect(page.locator('#area-boundary-terms')).toContainText('North Kivu',{timeout:60000});
  console.log(`MEASURED choose the unit: ${((Date.now()-chose)/1000).toFixed(1)} s`);

  const used=Date.now();
  await page.locator('#area-boundary-use').click();
  await expect(page.locator('#area-boundary-terms')).toContainText(/vertices|North Kivu/,{timeout:120000});
  console.log(`MEASURED use these boundaries: ${((Date.now()-used)/1000).toFixed(1)} s`);

  const applied=Date.now();
  await page.locator('#area-apply').click();
  // The phases SAY what they are, instead of a frozen dialog. This is the half that was missing.

  await expect.poll(()=>page.locator('#area-dialog').evaluate(d=>d.open),{timeout:120000}).toBe(false);
  console.log(`MEASURED apply: ${((Date.now()-applied)/1000).toFixed(1)} s`);

  const ran=Date.now();
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|Ready to run|Changed/,{timeout:180000});
  console.log(`MEASURED settle after apply: ${((Date.now()-ran)/1000).toFixed(1)} s`);
  const stored=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const area=(w.nodes||[]).find(n=>n.type==='study_area'&&n.params.geometry);
    return area?{vertices:area.params.geometry.coordinates[0].length,bytes:JSON.stringify(area.params.geometry).length}:null;
  });
  console.log('MEASURED stored:',JSON.stringify(stored));
  // Whichever phase was the slow one, it said so rather than freezing in silence.
  const phases=(await page.evaluate(()=>window.__phases)).join(' | ');
  expect(phases).toMatch(/Drawing .*vertices|Checking the outline|Writing the facts|Saving it/i);
  console.log('MEASURED phases said:',phases.slice(0,200));
});
