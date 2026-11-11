import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
// geoBoundaries is answered by this test, so the service worker must not answer instead: WebKit in CI fetched the real
// outlines through it and measured 95% Botswana (0.86.0). The routed tests elsewhere block it for the same reason.
test.use({serviceWorkers:'block'});

// A STUDY AREA ACROSS A BORDER (experiment 204): from Gaborone to the South African border. Its countries are found from
// where it falls, each with its share of the area, and confirmed; the raster dialog then offers the area's countries
// and says it reads one file. geoBoundaries is answered here with two outlines split at 25.95 E, so the shares are
// known: half in each.
const workflow={schema:'fieldwork/workflow/1',name:'Across a border',
  nodes:[
    {id:'area',type:'study_area',x:20,y:20,params:{label:'Gaborone to the border',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[25.85,-24.75],[26.05,-24.75],[26.05,-24.55],[25.85,-24.55],[25.85,-24.75]]]}}},
    {id:'raster',type:'raster_input',x:300,y:200,params:{label:'Raster input'}}],
  edges:[{id:'e1',from:'area',to:'raster',port:'area'}]};
const outline=(w,e)=>({type:'FeatureCollection',features:[{type:'Feature',properties:{},
  geometry:{type:'Polygon',coordinates:[[[w,-26],[e,-26],[e,-23],[w,-23],[w,-26]]]}}]});

test('a study area across a border: its countries found with their shares, confirmed, and the raster dialog says it reads one',async({page})=>{
  const errors=collectPageErrors(page);
  await page.route(/geoboundaries\.org\/api\/current\/gbOpen\/(BWA|ZAF)\/ADM0/,route=>{
    const iso=/gbOpen\/(\w+)\//.exec(route.request().url())[1];
    return route.fulfill({json:{boundaryISO:iso,simplifiedGeometryGeoJSON:`https://github.com/wmgeolab/geoBoundaries/raw/test/${iso}.geojson`}});
  });
  await page.route(/media\.githubusercontent\.com\/media\/wmgeolab\/geoBoundaries\/test\/(BWA|ZAF)\.geojson/,route=>
    route.fulfill({json:route.request().url().includes('BWA')?outline(24,25.95):outline(25.95,28)}));
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'border.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="area"]').click({timeout:45000});
  await expect(page.locator('#area-countries-sentence')).toContainText('Not stated');
  await page.locator('#configure-countries').click();
  const dialog=page.locator('#area-countries-config');
  await dialog.locator('#area-countries-find').click();
  // Proposed, with the share of the AREA in each, and nothing applied yet.
  const found=dialog.locator('#area-countries-found');
  await expect(found).toContainText('Botswana (BWA)');
  await expect(found).toContainText('South Africa (ZAF)');
  await expect(found).toContainText('A share is of the area as drawn, not of the people in it.');
  await expect(found.locator('tr',{hasText:'Botswana'})).toContainText('50%');
  await expect(found.locator('tr',{hasText:'South Africa'})).toContainText('50%');
  await expect(dialog.locator('#area-countries-list')).toContainText('None stated yet.');
  await dialog.locator('#area-countries-use').click();
  await expect(dialog.locator('#area-countries-list')).toContainText('Botswana (BWA)');
  await expect(dialog.locator('#area-countries-list')).toContainText('South Africa (ZAF)');
  await dialog.locator('#config-apply').click();
  // Largest share first; these two are half each to within rounding, so either order is right.
  await expect(page.locator('#area-countries-sentence')).toContainText('Botswana (BWA)');
  await expect(page.locator('#area-countries-sentence')).toContainText('South Africa (ZAF)');
  await expect.poll(()=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.id==='area').params.countries.slice().sort()))).toBe('["BWA","ZAF"]');
  // The raster dialog offers the area's two countries, says it reads one file, and leaves the area's list alone.
  await page.locator('.react-flow__node[data-id="raster"]').click();
  await page.locator('#prepare-raster').click();
  const raster=page.locator('#raster-dialog');
  await expect(raster.locator('#raster-population')).toContainText('this step reads one');
  await expect(raster.locator('#population-country option')).toHaveCount(3);
  await raster.locator('#population-country').selectOption('ZAF');
  await expect(raster.locator('#population-download')).toContainText('ZAF');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1'))
    .nodes.find(n=>n.id==='area').params.countries.length)).toBe(2);
  expect(errors).toEqual([]);
});

test('countries are named by hand, one removed, and a saved single country opens as a list of one',async({page})=>{
  const errors=collectPageErrors(page);
  const saved=structuredClone(workflow);saved.nodes[0].params.country='BWA';
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="area"]').click({timeout:45000});
  await expect(page.locator('#area-countries-sentence')).toContainText('Botswana (BWA).');
  await page.locator('#configure-countries').click();
  const dialog=page.locator('#area-countries-config');
  await dialog.locator('#area-country-add').selectOption('ZAF');
  await expect(dialog.locator('#area-countries-list li')).toHaveCount(2);
  await dialog.locator('[data-remove-country="BWA"]').click();
  await expect(dialog.locator('#area-countries-list li')).toHaveCount(1);
  await dialog.locator('#config-apply').click();
  await expect(page.locator('#area-countries-sentence')).toContainText('South Africa (ZAF).');
  await expect.poll(()=>page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='area').params;
    return `${JSON.stringify(p.countries)}/${p.country??'none'}`;})).toBe('["ZAF"]/none');
  expect(errors).toEqual([]);
});
