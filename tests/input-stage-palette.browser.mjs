import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "On a blank canvas, all widgets are active, does not start with Study Area." -- the
// practitioner, 2026-10-15, reporting the absence of progressive reveal. Experiment 112 had
// dismissed two forms of it on the premise that the first placement was already handled by
// STARTER_TYPES; measured that day, a blank canvas offered 41 of 53, because addableTypes added
// ALWAYS_ADDABLE and the catchment types two lines after applying the starter set.
//
// The rule adopted is the practitioner's own, as they revised it: start with an input, and once
// an input exists everything is sensible. "Let's start with that assumption 7 and then reassess."
test('a canvas with no input offers the input stage, and everything after one is placed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');

  const entries=page.locator('#node-library [data-add]');
  await expect(entries).toHaveCount(5);
  // The input stage is eight by contract; `places` and `centers` are retired from the palette,
  // and `alert` joined them on 2026-10-25 -- a declaration wearing a node type, whose condition
  // is now stated on the node that applies the ruleset asking for it. Five are offered.
  //
  // It was four until `map_image_input` joined the input stage on 2026-10-27. This count was left
  // at four by that change and the test failed from then until the plate was made addable: a
  // DRAFT plate carries `[0,0,0,0]` corners, which `validateWorkflow` was refusing as crossed, so
  // the widget was offered on the palette and could not be placed from it.
  for(const name of ['Study area','Point data','Tabular data','Street network',
    'Georeferenced map image'])
    await expect(page.locator('#node-library [data-add]').filter({hasText:name})).toHaveCount(1);
  // Nothing that needs something is offered yet. Asserted by NODE TYPE rather than by title
  // text: `hasText:'Map'` also matched "Georeferenced map image" once a plate joined the input
  // stage, so a title that merely contains another widget's name could fail this on its own.
  for(const type of ['map_output','buffer_area','reproject'])
    await expect(page.locator(`#node-library [data-add="${type}"]`)).toHaveCount(0);

  // Place one input and the palette opens. The gate is "start with an input", not a running
  // filter: after that, judging what is sensible is the practitioner's.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  // `toBeGreaterThan(30)` stood here and passed for weeks while nine widgets were addable only on
  // the examples whose template named them. The practitioner found it by looking for one:
  // "I don't see measure distance as a widget" ... "How do I know which widgets need work if I
  // can't even see them." So the nine are named, and the floor is the live count rather than a
  // number comfortably below it.
  await expect.poll(()=>entries.count(),{timeout:15000}).toBeGreaterThanOrEqual(45);
  for(const type of ['measure_distance','network_input','voronoi','isochrone','clip_polygons',
    'summarize_points_to_polygon','facilities','facility_audit','map_output'])
    await expect(page.locator(`#node-library [data-add="${type}"]`)).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('an example that already has inputs is not restricted',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect.poll(()=>page.locator('#node-library [data-add]').count(),{timeout:20000}).toBeGreaterThanOrEqual(45);
  // The cholera project is where the street network and the three-leg distance work belongs
  // (experiment 123), and neither widget could be added here until 2026-10-19.
  for(const type of ['measure_distance','network_input','snap_to_network'])
    await expect(page.locator(`#node-library [data-add="${type}"]`)).toHaveCount(1);
  expect(errors).toEqual([]);
});
