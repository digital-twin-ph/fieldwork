import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectPageErrors} from './page-errors.mjs';

// Half A of the reproject split (experiment 111): a source reads UTM easting and northing and
// converts before its points leave the dialog, so the common case needs no second widget.
//
// The failure this prevents is recorded in src/input-data.ts and is silent: a CSV of UTM metres
// read as degrees gives [500000, 7800000] as a longitude and latitude with no error, every point
// then reads as Outside the study area -- a finding about geography, not a fault -- and haversine
// on metres-read-as-degrees returns a finite nonsense distance.
const UTM=['id,name,easting,northing',
  'a,Pump A,698687.800,5710773.830',
  'b,Pump B,698855.133,5710936.278'].join('\n');
// The same two points, converted with proj4 outside the browser.
const EXPECTED=[[-0.1365,51.5131],[-0.1340,51.5145]];

test('a CSV of UTM easting and northing imports as CRS84 without a second widget',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=coverage');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="observations"]').click();
  await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('csv');
  await page.locator('#input-file').setInputFiles({name:'utm.csv',mimeType:'text/csv',buffer:Buffer.from(UTM)});

  // Read as degrees first: the columns are found by their easting/northing aliases, and the
  // import refuses the values rather than accepting metres as degrees.
  await expect(page.locator('#csv-frame')).toHaveValue('degree');
  await expect(page.locator('#input-apply')).toBeDisabled();

  await page.locator('#csv-frame').selectOption('metre');
  await expect(page.locator('#csv-zone-label')).toBeVisible();
  await page.locator('#csv-zone').fill('30');
  await page.locator('#csv-hemisphere').selectOption('north');
  await page.locator('#csv-preview').click();
  await expect(page.locator('#csv-frame-note')).toContainText('EPSG:32630');
  await expect(page.locator('#csv-x-label')).toContainText('Easting');
  await expect(page.locator('#input-summary')).toContainText('2 draft');
  await page.locator('#input-apply').click();

  // The two imported points are in UTM zone 30, off West Africa, and the exercise's study area is
  // a box in Gaborone -- so the `clip_points_to_area` the Spatial coverage exercise gained on
  // 2026-10-21 has nothing to keep and refuses the run by design. This test is about the INGEST,
  // so the clip and the map it feeds come off the canvas rather than the refusal being weakened.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="clip"]').click();
  await page.locator('#delete-node').click();
  // The map keeps its area and takes the records directly, so the workflow still has something to
  // display -- a workflow with no output is "Not ready to run".
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="map"]').click();
  await page.locator('#map-add-layer').selectOption('observations');

  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const node=saved.nodes.find(n=>n.id==='observations');
  const got=node.params.data.features.map(f=>f.geometry.coordinates);
  assert.equal(got.length,2);
  for(const [i,[lon,lat]] of EXPECTED.entries()){
    assert.ok(Math.abs(got[i][0]-lon)<1e-6,`point ${i} longitude ${got[i][0]} is not ${lon}`);
    assert.ok(Math.abs(got[i][1]-lat)<1e-6,`point ${i} latitude ${got[i][1]} is not ${lat}`);
  }
  // The receipt has to say where the coordinates came from, not just where they ended up.
  assert.equal(node.params.sourceInfo.sourceCRS,'EPSG:32630',JSON.stringify(node.params.sourceInfo));
  assert.equal(node.params.sourceInfo.reprojection.datumShift,'none');

  // And the frame the FILE arrived in reaches the receipt as a triple, not only as text inside
  // the fw:sourceMetadata JSON literal, so the chain source -> operation -> run is one query.
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="rules"]').click();
  const event=page.waitForEvent('download');
  await page.locator('#download-evidence').click();
  const receipt=JSON.parse(await readFile(await (await event).path(),'utf8'));
  const n3=[receipt.provenanceN3,...receipt.receipts.map(r=>r.facts)].join('\n');
  assert.match(n3,/dcterms:conformsTo <http:\/\/www\.opengis\.net\/def\/crs\/EPSG\/0\/32630>/,
    'the receipt must state the UTM zone the imported file was in');
  assert.equal(errors.length,0,errors.join('; '));
});

test('a wrong zone cannot be caught from the numbers, and the import does not pretend otherwise',async({page})=>{
  // Written first as "a wrong zone is refused". It is not, and cannot be. The same easting and
  // northing are valid in every zone: declaring zone 1 instead of 30 moves these points 174
  // degrees west into the Pacific, leaves the latitude untouched, round-trips exactly and passes
  // the 6-degree validity guard, because they genuinely are a location in zone 1.
  //
  // Recorded as a LIMITATION, which is one of the five categories in the audit procedure and not
  // the same as an enforced distinction. Nothing in a file of bare easting and northing can
  // establish its zone. Only context can -- which is what suggestUTM compares against, and what
  // the projection explainer exists to tell the practitioner before they choose.
  await page.goto('/?example=coverage');
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="observations"]').click();
  await page.locator('#edit-input-data').click();
  await page.locator('#input-mode').selectOption('csv');
  await page.locator('#input-file').setInputFiles({name:'utm.csv',mimeType:'text/csv',buffer:Buffer.from(UTM)});
  await page.locator('#csv-frame').selectOption('metre');
  await page.locator('#csv-zone').fill('1');
  await page.locator('#csv-hemisphere').selectOption('north');
  await page.locator('#csv-preview').click();
  await expect(page.locator('#csv-frame-note')).toContainText('EPSG:32601');
  await expect(page.locator('#input-apply')).toBeEnabled();
  await page.locator('#input-apply').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  const got=saved.nodes.find(n=>n.id==='observations').params.data.features[0].geometry.coordinates;
  assert.ok(Math.abs(got[0]-(-174.1365))<1e-6,`longitude ${got[0]} should be the zone-1 reading`);
  assert.ok(Math.abs(got[1]-51.5131)<1e-6,`latitude ${got[1]} is unchanged by the zone, which is why the error is invisible`);
});
