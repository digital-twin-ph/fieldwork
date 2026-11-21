import {test,expect} from './fixtures.mjs';
/** A STUDY AREA OF DR CONGO'S FIRST-LEVEL SIZE, DRAWN BY A MAP (2026-11-19). The practitioner, with geoBoundaries' COD ADM1:
 *  *"This combination of widgets ... did not yield any map"*. 26 units, about 195,000 vertices, stubbed so the test measures
 *  this application and not geoBoundaries. The map's frame had thrown "Maximum call stack size exceeded", unsaid. */
test.use({serviceWorkers:'block'});
test('a study area of 26 provinces and 195,000 vertices is drawn on a Map, with no error',async({page})=>{
  test.setTimeout(300000);
  const logs=[];page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.type()+': '+m.text().slice(0,300));});
  page.on('pageerror',e=>logs.push('pageerror: '+(e.stack||e.message).slice(0,1500)));
  const ring=(n,x,y,r)=>{const p=Array.from({length:n},(_,i)=>{const a=2*Math.PI*i/n,rr=r*(1+0.15*Math.sin(a*7));return [x+rr*Math.cos(a),y+rr*Math.sin(a)];});return [...p,p[0]];};
  const units=Array.from({length:26},(_,i)=>({properties:{shapeID:`COD-${i}`,shapeName:`Province ${i}`},
    geometry:{type:'Polygon',coordinates:[ring(7500,15+(i%6)*2.5,-10+Math.floor(i/6)*3,1.1)]}}));
  // geoBoundaries stubbed here: the held copy is answered with a file not as pinned, so the picker falls back to the stub.
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/boundaries\//,r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.route(/geoboundaries\.org\/api/,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    boundaryID:'COD-ADM1-1',boundaryISO:'COD',boundaryType:'ADM1',boundaryName:'Democratic Republic of the Congo',admUnitCount:'26',
    meanVertices:'7500.0',maxVertices:'7500',boundaryYearRepresented:'2020.0',boundaryLicense:'CC BY 3.0 IGO',gjDownloadURL:'https://example.invalid/cod-adm1.geojson'})}));
  await page.route(/example\.invalid/,r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({features:units})}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="study_area"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='study_area').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#edit-study-area').click();
  await page.locator('#area-boundary-source summary').click();
  await page.locator('#area-iso').fill('Democratic Republic of the Congo');
  await page.locator('#area-adm').selectOption('ADM1');
  await page.locator('#area-boundary-check').click();
  await expect(page.locator('#area-boundary-units')).toBeVisible({timeout:30000});
  const all=await page.locator('#area-boundary-pick option').count();
  await page.locator('#area-boundary-pick').selectOption(Array.from({length:all},(_,i)=>({index:i})));
  await page.locator('#area-boundary-use').click();
  await page.waitForTimeout(3000);
  await page.locator('#area-apply').click();
  await expect(page.locator('#area-dialog')).toBeHidden({timeout:120000});
  await page.locator('[data-add="map_output"]').click();
  const mid=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='map_output').id);
  await page.locator(`.react-flow__node[data-id="${mid}"]`).click();
  const port=page.locator('select.connect-port').first();
  await port.selectOption({index:1});
  await page.waitForTimeout(1000);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText(/Run complete|failed|stopped/,{timeout:200000});
  await page.locator('[data-view="results"]').click();
  await page.waitForTimeout(8000);
  await expect(page.locator('#map path').first()).toBeAttached({timeout:30000});
  expect(await page.locator('#map path').count()).toBeGreaterThanOrEqual(26);
  await expect(page.getByText('The map could not be drawn')).toHaveCount(0);
  expect(logs.filter(l=>l.startsWith('pageerror')||l.startsWith('error'))).toEqual([]);
});
