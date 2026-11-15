import {test,expect} from './fixtures.mjs';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import proj4 from 'proj4';
import {fromArrayBuffer} from 'geotiff';
import {collectPageErrors} from './page-errors.mjs';
import {projectionOf,northUpPlan} from '../build/geotiff-picture.js';

/** A SCANNED SHEET IN A GEOTIFF, THROUGH FIELDWORK'S OWN WIDGETS (TODO 35, 2026-11-15). The fixture is drawn polyconic on
 *  NAD27 like USGS's 1943 Lycoming sheets, its tags 600 m west of its printed border (scripts/make-sheet-fixture.mjs):
 *  the dialog opens it on its own placement and draws the graticule on its datum; one pair at its printed corner moves it
 *  about 600 m east and both placements are kept; a map draws two sheets as two grounds and lists both. */
const SHEET=fileURLToPath(new URL('./fixtures/sheet-polyconic-offset.tif',import.meta.url));
const AREA=[-76.392,43.488,-76.368,43.512];
const workflow={schema:'fieldwork/workflow/1',name:'Two sheets',
  nodes:[{id:'area',type:'study_area',x:20,y:20,params:{label:'The hamlet',source:'drawn',selectionMode:'bbox',
      geometry:{type:'Polygon',coordinates:[[[AREA[0],AREA[1]],[AREA[2],AREA[1]],[AREA[2],AREA[3]],[AREA[0],AREA[3]],[AREA[0],AREA[1]]]]}}},
    {id:'south',type:'map_image_input',x:20,y:300,params:{label:'Sheet one',image:{width:0,height:0,bytes:0,sha256:''},bounds:[0,0,0,0]}},
    {id:'north',type:'map_image_input',x:20,y:520,params:{label:'Sheet two',image:{width:0,height:0,bytes:0,sha256:''},bounds:[0,0,0,0]}},
    {id:'map',type:'map_output',x:400,y:20,params:{label:'Map',presentation:'plot',groundInputCount:2}}],
  edges:[{id:'e1',from:'area',to:'map',port:'area'},{id:'e2',from:'south',to:'map',port:'ground'},{id:'e3',from:'north',to:'map',port:'ground_2'}]};

/** The pair a person would make: the printed corner on the dialog's north-up image, and the dashed crossing on today's map. */
async function cornerPair(){
  const buffer=readFileSync(SHEET),img=await (await fromArrayBuffer(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength))).getImage();
  const tags={samplesPerPixel:3,bitsPerSample:8,geoKeys:img.getGeoKeys(),width:img.getWidth(),height:img.getHeight(),
    origin:img.getOrigin().slice(0,2),resolution:img.getResolution().slice(0,2)};
  const p=projectionOf(tags.geoKeys),mx=(AREA[2]-AREA[0])*.25,my=(AREA[3]-AREA[1])*.25;
  const plan=northUpPlan(tags,p.proj,[AREA[0]-mx,AREA[1]-my,AREA[2]+mx,AREA[3]+my]);
  const xs=(plan.box[2]-plan.box[0])/plan.width,ys=-(plan.box[3]-plan.box[1])/plan.height;
  // The printed corner is source pixel (191, 30); the tags say where that is, and the dialog's image is north-up from them.
  const [lon,lat]=proj4(p.proj,'EPSG:4326').forward([tags.origin[0]+191.5*tags.resolution[0],tags.origin[1]+30.5*tags.resolution[1]]);
  const truth=proj4(p.geographic,'EPSG:4326').forward([-76.37,43.51]);
  return {x:(lon-plan.box[0])/xs,y:(lat-plan.box[3])/ys,lon:truth[0],lat:truth[1]};
}

test('a GeoTIFF sheet opens on its own placement, is moved by one pair, and two sheets are drawn as two grounds',async({page})=>{
  test.setTimeout(240_000);const errors=collectPageErrors(page);
  await page.route(/tile\.openstreetmap\.org/,route=>route.abort('failed'));
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('[data-view="workflow"]').click();
  const pair=await cornerPair();
  for(const id of ['south','north']){
    await page.locator(`.react-flow__node[data-id="${id}"]`).click();
    await page.locator('#configure-step').click();
    const dialog=page.locator('#map-image-config');
    await dialog.locator('#map-image-file').setInputFiles(SHEET);
    // What the file says of itself, from its tags, and its placement previewed with its graticule before any pair.
    await expect(dialog.locator('.geo-tags')).toContainText('polyconic, centred on -76.4375°, NAD27',{timeout:30000});
    await expect(dialog.locator('.geo-tags')).toContainText('click where the dashed lines cross');
    await expect(dialog.locator('#geo-fit')).toContainText('Placed where the file’s own tags put it');
    await dialog.locator('#geo-preview-toggle').click();
    await expect(dialog.locator('.geo-graticule').first()).toBeAttached({timeout:30000});
    if(id==='south'){
      const row=dialog.locator('[data-geo-row="0"]');
      await row.locator('[data-geo-field="id"]').fill('Printed north-east corner');await row.locator('[data-geo-field="id"]').press('Tab');
      for(const [f,v] of [['x',pair.x],['y',pair.y],['lon',pair.lon],['lat',pair.lat]]){
        await row.locator(`[data-geo-field="${f}"]`).fill(String(v));await row.locator(`[data-geo-field="${f}"]`).press('Tab');}
      await expect(dialog.locator('#geo-fit')).toContainText('Moved from the file’s own placement by 1 pair');
      const moved=Number((await dialog.locator('#geo-fit').innerText()).match(/1 pair: (\d+) m in all/)[1]);
      expect(moved).toBeGreaterThan(585);expect(moved).toBeLessThan(615);
    }
    await dialog.locator('#config-apply').click();
    await expect(dialog).toBeHidden({timeout:20000});
  }
  // Both placements kept: the tags' and the shift's, with its pair.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.id==='south').params);
  expect(saved.placementModel).toBe('shift');expect(saved.controlPoints).toHaveLength(1);
  expect(saved.tagsWorld.xOrigin).toBeLessThan(saved.world.xOrigin);expect(saved.tagsSaid).toContain('polyconic');
  // Two sheets under one map, each drawn and each listed.
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#map [data-plate]')).toHaveCount(2);
  await expect(page.locator('#map-layer-list')).toContainText('(backdrop)');
  expect(await page.locator('#map-layer-list label',{hasText:'(backdrop)'}).count()).toBe(2);
  expect(errors).toEqual([]);
});
