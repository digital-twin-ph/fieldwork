import {test,expect} from '@playwright/test';
import assert from 'node:assert/strict';

// The worked example as a practitioner meets it: chosen from the workspace list, run, read.
test('the Manila coastal exposure example loads, runs and shows assigned gauges',async({page})=>{
  await page.goto('/?example=sea-level');
  await expect(page.locator('#project-title')).toContainText('Manila coastal exposure');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // Both licences must be visible before anything is read, because they differ and one is
  // share-alike. The note is the only place a reader meets them without opening a node.
  await expect(page.locator('#example-note')).toContainText(/CC BY 4\.0/);
  await expect(page.locator('#example-note')).toContainText(/ODbL/);
  await expect(page.locator('#example-note')).toContainText(/millimetres/);
  await expect(page.locator('#example-note')).toContainText(/inundation model/);

  // The map first: switching tabs removes it from the page, so count while it is there.
  await expect(page.locator('#map [data-place]')).toHaveCount(68,
    {message:'60 facilities and 8 projection gauges are drawn together'});

  await page.locator('.react-flow__node[data-id="table"]').click();
  await page.locator('#result-tabs').getByText('Facility, assigned gauge, distance').click();
  await expect(page.locator('#result-metrics')).toContainText('60 rows');
  await expect(page.locator('#result-metrics')).toContainText('value in metre');
  // Site 145 is Manila: every facility in the box takes the Manila gauge, and the distance
  // to it travels with the assignment rather than being discarded.
  const assigned=page.getByRole('table').filter({hasText:'projection_site'});
  await expect(assigned).toContainText('distance_m');
  await expect(assigned).toContainText('145');

  // The example deliberately stops before comparing a level to an elevation.
  const saved=JSON.parse(await page.evaluate(()=>localStorage.getItem('fieldwork-workflow-v1')));
  assert.ok(!saved.nodes.some(n=>n.type==='slr_threshold_comparison'),
    'no elevation is supplied, so no comparison against one may appear');
  assert.equal(saved.nodes.find(n=>n.id==='projections').params.unit,'millimetre');
});

test('the example replays offline, having asked no source for anything',async({page,context})=>{
  const reached=[];
  page.on('request',r=>{if(/zenodo|overpass|amazonaws|openstreetmap/.test(r.url()))reached.push(r.url());});
  await page.goto('/?example=sea-level');
  await expect(page.locator('#offline-status')).toContainText('Available offline',{timeout:60000});
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await expect(page.locator('#map [data-place]')).toHaveCount(68);
  assert.deepEqual(reached,[],'every byte this example needs is bundled');
});
