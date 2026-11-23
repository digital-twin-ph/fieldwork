import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE COUNTRY OUTLINE, FOR CONTEXT (2026-11-23). The practitioner, of a province drawn with nothing around it: *"when
 *  we pick admin boundary other than ADM0 ... we can have the option to include the ADM0 boundary as well for
 *  context."* It is drawn under everything, as a line with no fill, and nothing measures against it. */
const province={type:'Polygon',coordinates:[[[29,3],[30,3],[30,4],[29,4],[29,3]]]};
const country={type:'Polygon',coordinates:[[[28,2],[32,2],[32,5],[28,5],[28,2]]]};
const workflow=withOutline=>({schema:'fieldwork/workflow/1',name:'Outline',exampleId:'blank',
  nodes:[{id:'area',type:'study_area',x:20,y:20,params:{label:'Haut-Uele',source:'drawn',selectionMode:'polygon',geometry:province,
      ...(withOutline?{countryOutline:{geometry:country,provenance:{boundaryID:'COD-ADM0-95928705',unitID:'COD-ADM0-95928705',
        unitName:'Democratic Republic of the Congo',source:'geoBoundaries',licence:'not stated',
        licenceSource:'www.openstreetmap.org/copyright',yearRepresented:'2022',canonical:'country',
        retrievedFrom:'https://example.invalid/COD-ADM0_simplified.geojson',retrievedAt:'2026-11-23T00:00:00.000Z',
        vertices:5,publishedHash:'0'.repeat(64)}}}:{})}},
    {id:'map',type:'map_output',x:320,y:20,params:{label:'Map',presentation:'plot'}}],
  edges:[{id:'e1',from:'area',to:'map',port:'area'}]});
const open=async(page,withOutline)=>{
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#workflow-file').setInputFiles({name:'w.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow(withOutline)))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('[data-view="results"]').click();
};

test('a study area carrying a country outline draws it, as a line under everything',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,true);
  const outline=page.locator('#map path[data-country-outline]');
  await expect(outline).toHaveCount(1);
  // A LINE, NOT A SHADE: it encodes nothing, so it spends no fill.
  await expect(outline).toHaveAttribute('fill','none');
  // Drawn first, so nothing it crosses is hidden by it.
  const first=await page.locator('#map path').first().getAttribute('data-country-outline');
  expect(first).not.toBeNull();
  expect(errors).toEqual([]);
});

test('a study area without one draws no outline',async({page})=>{
  const errors=collectPageErrors(page);
  await open(page,false);
  await expect(page.locator('#map path[data-country-outline]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
