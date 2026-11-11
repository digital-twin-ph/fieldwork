import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

// GHS-POP, READ FOR THE STUDY AREA ONLY (TODO 24, 2026-11-11): chosen as a population source, a year picked, and its
// window read from JRC's copy by HTTP range through Raster input's URL path, with nothing downloaded first. JRC's server
// is answered here by a 24 x 24 GeoTIFF over Manila, ranges honoured as the real one honours them.
test.use({serviceWorkers:'block'});
const TIFF=readFileSync(new URL('./fixtures/egm08-manila-cut.tif',import.meta.url));
const workflow={schema:'fieldwork/workflow/1',name:'GHS-POP',
  nodes:[{id:'area',type:'study_area',x:20,y:20,params:{label:'Manila',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[120.9,14.5],[121.1,14.5],[121.1,14.7],[120.9,14.7],[120.9,14.5]]]}}},
    {id:'raster',type:'raster_input',x:300,y:200,params:{label:'Raster input'}}],
  edges:[{id:'e1',from:'area',to:'raster',port:'area'}]};

test('GHS-POP is offered with every year, and its window is read in parts from JRC\'s copy',async({page})=>{
  const errors=collectPageErrors(page);
  const asked=[];
  await page.route(/jrc-ghsl\.s3\.amazonaws\.com\/ghs-pop\/r2023a\/4326\/3asec\/2015\//,route=>{
    const range=route.request().headers().range;asked.push(route.request().method()+' '+(range||'whole'));
    const headers={'access-control-allow-origin':'*','accept-ranges':'bytes','content-type':'image/tiff'};
    if(route.request().method()==='HEAD')return route.fulfill({status:200,headers:{...headers,'content-length':String(TIFF.length)},body:''});
    const m=/bytes=(\d+)-(\d*)/.exec(range||'');
    if(!m)return route.fulfill({status:200,headers,body:TIFF});
    const start=Number(m[1]),end=Math.min(m[2]?Number(m[2]):TIFF.length-1,TIFF.length-1);
    return route.fulfill({status:206,headers:{...headers,'content-range':`bytes ${start}-${end}/${TIFF.length}`},body:TIFF.subarray(start,end+1)});
  });
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'ghs.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="raster"]').click({timeout:45000});
  await page.locator('#prepare-raster').click();
  const dialog=page.locator('#raster-dialog');
  // Offered with no country stated: one grid of the world.
  await dialog.locator('#population-source').selectOption('ghs');
  await expect(dialog.locator('#raster-population')).toContainText('Population (GHS-POP)');
  await expect(dialog.locator('#ghs-epoch option')).toHaveCount(12);
  await expect(dialog.locator('#ghs-epoch option[value="2030"]')).toHaveText('2030 (projected)');
  await expect(dialog.locator('#raster-population')).toContainText('Residential population');
  await expect(dialog.locator('#raster-population')).toContainText('doi:10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE');
  await dialog.locator('#ghs-epoch').selectOption('2015');
  await dialog.locator('#ghs-read').click();
  await expect(dialog.locator('#raster-url')).toHaveValue(/GHS_POP_E2015_GLOBE_R2023A_4326_3ss_V1_0\.tif$/);
  await expect(dialog).toContainText('Source: 24 × 24',{timeout:30000});
  // Read by range: no request for the whole file.
  expect(asked.filter(a=>a.startsWith('GET')).every(a=>a.includes('bytes='))).toBe(true);
  expect(errors).toEqual([]);
});
