import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** THE EXTREME TEST: BUILD THE WORKED EXAMPLE FROM AN EMPTY CANVAS.
 *
 *  The practitioner, 2026-10-29:
 *
 *  > In the South London example we should not have any bespoke assets and components at all.
 *  > The extreme test for this is I should be able to recreate that worked example from an empty
 *  > canvas if I have all the inputs required. So for me to be able to do that, I should be able
 *  > to download all the input data, start from a blank canvas and recreate the example from
 *  > scratch. we should be able to simulate this as a test.
 *
 *  This is the mission written as an assertion. It falsifies three claims at once, and a failure
 *  of any one of them fails it: that no widget here is attached to this example, that every input
 *  is a file a reader can download, and that every parameter those widgets need is reachable from
 *  their own panels. The third is the one that has failed before -- `polygon_input` was addable,
 *  implemented and unit-tested while its features could be set only by editing a workflow file,
 *  which is how the worked example came to be the only thing that could configure it.
 *
 *  WHICH CLAIM THIS PROVES, because two are called "from scratch" and they are not the same. The
 *  practitioner drew the line on 2026-10-29: *"if the Thames polygons are provided, the end to
 *  end claim holds. But if the start begins from PBF download, that may well be a different story
 *  if Thames selection is bespoke."*
 *
 *  This is claim A: given the published inputs, an empty canvas reaches the same result, so every
 *  widget, parameter and connection the example needs is reachable from the palette and the
 *  panels. It is NOT claim B, that the study is reproducible from a primary source. B fails at one
 *  step and for one reason: `geo/thames-reaches.geojson` was SELECTED out of the water areas, and
 *  nothing here selects. No geometry was cut to make it -- the file's own method says "Nothing is
 *  cut at the limit: OpenStreetMap already divides the water area at the lock" -- so a reader
 *  starting from the extract obtains both reaches in the read, along with every pond and basin in
 *  the box, and has no way to keep the two they came for.
 *
 *  Nothing here imports the bundle. The widgets are clicked out of the palette, the data is read
 *  from the published files beside this repository, and the numbers asserted at the end are the
 *  example's own. `geo/water-intakes.geojson` was written on the day this was asked, because
 *  until then those four features existed only inside the bundle and this test could not have
 *  been written honestly. */
test.use({serviceWorkers:'block'});

const EXAMPLE=new URL('../../example-1855-cholera-south-london/',import.meta.url);
const file=name=>fileURLToPath(new URL(name,EXAMPLE));
const INPUTS=['geo/sub-districts-csds.geojson','geo/thames-reaches.geojson','geo/water-intakes.geojson'];
const skip=INPUTS.every(name=>existsSync(file(name)))?false
  :'example-1855-cholera-south-london is not checked out beside this repository, so its published inputs are not here to read.';

/** The extent Snow's sub-districts sit in: about 16 km by 11 km around Camberwell. Entered the
 *  way a practitioner enters one, through the sized-box control, because a study area typed into
 *  a file is not a study area anyone can make. */
const CENTRE={lon:-0.1453,lat:51.4601,width:'16000',height:'11000'};

const add=async(page,type)=>{
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`#node-library [data-add="${type}"]`).click();
};
/** Drag from one node's output to another's input, as the canvas asks. A map offers one
 *  configurable port, so an unbound layer is dropped on `layer` and bound by what it emits. */
const connect=async(page,from,to,port)=>{
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  await expect(source).toBeVisible();await expect(target).toBeVisible();
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
};
/** The id the application gave a node it just created. A node added from the palette gets a
 *  generated id, so it is read back from the saved workflow rather than guessed -- which also
 *  means this test only ever names widgets by their TYPE, never by an id the example happens to
 *  use. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type,nth=0)=>{
  const w=await saved(page);
  const found=(w?.nodes||[]).filter(n=>n.type===type);
  if(found.length<=nth)throw new Error(`No ${type} at position ${nth}; the canvas holds `
    +`${(w?.nodes||[]).map(n=>n.type).join(', ')||'nothing'}.`);
  return found[nth].id;
};

test('the worked example is rebuilt from an empty canvas and the published inputs',{skip},async({page})=>{
  test.slow();
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');

  // 1. THE GROUND. A study area entered as a sized box, not drawn into a file.
  await add(page,'study_area');
  const extent=await idOf(page,'study_area');
  await page.locator(`.react-flow__node[data-id="${extent}"]`).click();
  await page.locator('#edit-study-area').click();
  const online=page.locator('#area-online');
  if(await online.count())await online.uncheck();
  await page.locator('#area-sized-box summary').click();
  await page.locator('#area-box-shape').selectOption('rectangle');
  await page.locator('#area-box-lon').fill(String(CENTRE.lon));
  await page.locator('#area-box-lat').fill(String(CENTRE.lat));
  await page.locator('#area-box-width').fill(CENTRE.width);
  await page.locator('#area-box-height').fill(CENTRE.height);
  await page.locator('#area-box-create').click();
  await page.locator('#area-apply').click();

  // 2. THE SUB-DISTRICTS, read from the published file and named by their own property.
  await add(page,'polygon_input');
  const districts=await idOf(page,'polygon_input',0);
  await page.locator(`.react-flow__node[data-id="${districts}"]`).click();
  await page.locator('#polygon-file').setInputFiles(file('geo/sub-districts-csds.geojson'));
  await page.locator('#polygon-name-field').fill('subdist');
  await page.locator('#polygon-name-field').press('Tab');
  await page.locator('#polygon-layer-name').fill('Registration sub-districts');
  await page.locator('#polygon-layer-name').press('Tab');

  // 3. THE RIVER, the same way.
  await add(page,'polygon_input');
  const thames=await idOf(page,'polygon_input',1);
  await page.locator(`.react-flow__node[data-id="${thames}"]`).click();
  await page.locator('#polygon-file').setInputFiles(file('geo/thames-reaches.geojson'));
  await page.locator('#polygon-name-field').fill('reach');
  await page.locator('#polygon-name-field').press('Tab');
  await page.locator('#polygon-layer-name').fill('Thames reaches');
  await page.locator('#polygon-layer-name').press('Tab');

  // 4. THE INTAKES. The layer that existed only inside the bundle until 2026-10-29.
  await add(page,'point_input');
  const intakes=await idOf(page,'point_input');
  await page.locator(`.react-flow__node[data-id="${intakes}"]`).click();
  // Point data is prepared in its own dialog, which is where the import lives.
  await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('geojson');
  await page.locator('#input-file').setInputFiles(file('geo/water-intakes.geojson'));
  await page.locator('#input-apply').click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();

  // 5. COLLECTED, and drawn.
  await add(page,'stack_polygons');
  const collected=await idOf(page,'stack_polygons');
  await add(page,'map_output');
  const where=await idOf(page,'map_output');

  await connect(page,districts,collected,'polygons');
  await connect(page,thames,collected,'polygons_2');
  await connect(page,extent,where,'area');
  await connect(page,intakes,where,'points');
  await connect(page,collected,where,'polygons');

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // THE EXAMPLE'S OWN NUMBERS, reached without the example. 32 sub-districts and 2 Thames
  // reaches collected into 34 polygons, and the four intake points beside them.
  await page.locator('[data-view="results"]').click();
  await expect(page.locator('#result-metrics')).toContainText('34 polygons');

  // AND THE LAYERS ARE THE EXAMPLE'S LAYERS: four of them, the collection listed as its parts.
  await page.locator('[data-view="workflow"]').click();
  await page.locator(`.react-flow__node[data-id="${where}"]`).click();
  await page.locator('[data-manage-layers]').click();
  await expect(page.locator('#layer-dialog-rows .layer-row')).toHaveCount(4);
  const named=await page.locator('[data-layer-label]').evaluateAll(f=>f.map(x=>x.value));
  expect(named).toContain('Registration sub-districts');
  expect(named).toContain('Thames reaches');
});

/** THE INTAKES ARE PRODUCIBLE, NOT ONLY IMPORTABLE.
 *
 *  The practitioner, 2026-10-29, on the one input that existed nowhere but the bundle until that
 *  day: *"These were obtained directly from John Snow text, and I think that's OK, because I
 *  could very well have used input_points for that with pushpins."* And then: *"So in the end to
 *  end, we could add the input points for the water intakes."*
 *
 *  So this does. It is the criterion the audit now states — an input is reproducible when an
 *  existing widget COULD produce it, not only when it was produced that way — and the criterion
 *  is worth no more than a check of it, because these four features carry `company`,
 *  `drawn_from`, `in_use` and `snow_says`, and a pushpin that took only a name and a position
 *  would not reach them.
 *
 *  What this does NOT claim: that clicking a map reproduces Snow's coordinates. Those are
 *  geocoded from the landmarks he names, and the test asserts the path exists, not that a click
 *  lands on Vauxhall Bridge. */
test('the water intakes can be made with pushpins and a form, from Snow’s text',{skip},async({page})=>{
  test.slow();
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await add(page,'point_input');
  const intakes=await idOf(page,'point_input');
  await page.locator(`.react-flow__node[data-id="${intakes}"]`).click();
  await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('pins');
  await page.locator('#pins-online').uncheck();

  // A FIELD SNOW'S TEXT FILLS, declared before the pins so each one takes it by default. This is
  // the part a name-and-position pin could not do.
  await page.locator('#input-pins details summary').click();
  await page.locator('#pin-field-key').fill('company');
  await page.locator('#pin-field-label').fill('Water company');
  await page.locator('#pin-field-default').fill('Southwark and Vauxhall Company');
  await page.locator('#pin-add-field').click();

  // Four pins: three intakes and the lock. Positions are wherever the click lands -- what is
  // being shown is that a practitioner reading Snow can place and describe them here.
  const map=page.locator('#pin-map');
  await expect(map).toBeVisible();
  const box=await map.boundingBox();
  for(const [dx,dy] of [[.3,.4],[.45,.35],[.6,.55],[.7,.45]])
    await page.mouse.click(box.x+box.width*dx,box.y+box.height*dy);

  await page.getByRole('button',{name:'Save Edits',exact:true}).click();
  await expect(page.locator('#input-dialog')).not.toBeVisible();

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const made=saved.nodes.find(n=>n.type==='point_input').params;
  expect(made.data.features.length).toBe(4);
  // The declared field reached every pin, which is what makes this a layer and not four dots.
  for(const feature of made.data.features)
    expect(feature.properties.company).toBe('Southwark and Vauxhall Company');
  expect(made.data.features.every(f=>f.geometry?.coordinates?.length===2)).toBe(true);
});
