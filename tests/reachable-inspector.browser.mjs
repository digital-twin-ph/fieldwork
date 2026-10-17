import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// `reachable_nodes` had no Inspector panel at all until 2026-10-17. It is in ALWAYS_ADDABLE,
// implemented and tested, and every parameter it declares could only be set by editing the
// workflow file or by adding the micro-workflow that pins them. `catchmentInspector` served the
// five CATCHMENT_TYPES and buffer_area; the node fell through every branch. The gap was found
// while giving the widget a UTM zone of its own, which is the kind of thing a palette audit
// cannot see: palette.ts asserts a widget is ADDABLE, and addable is not configurable.
test('the reachability step can be configured, and its optional frame can be unset',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:60000});

  // Explode the bundled composition: that is how a reachable_nodes node reaches a canvas.
  await page.locator('#node-library [data-composition]').first().click();
  await page.locator('#micro-explode').click();
  const node=page.locator('.react-flow__node').filter({hasText:'Walking catchment: reach'}).first();
  await expect(node).toBeVisible({timeout:20000});
  await node.click();

  // The parameters it has always declared, now reachable.
  const inspector=page.locator('#inspector-content');
  await expect(inspector.locator('#catchment-minutes')).toBeVisible();
  await expect(inspector.locator('#catchment-speedMPerMin')).toBeVisible();
  await expect(inspector.locator('#catchment-travelMode')).toBeVisible();
  await expect(inspector.locator('#catchment-direction')).toBeVisible();

  // The three that are optional, and the panel saying when they are read.
  await expect(inspector).toContainText('Attaching origins to the network');
  await expect(inspector).toContainText('A point snapped before this step keeps the junction');
  const zone=inspector.locator('#catchment-zone'),hemisphere=inspector.locator('#catchment-hemisphere');
  await expect(zone).toHaveValue('');
  await expect(hemisphere).toHaveValue('');

  // Setting them stores numbers; clearing them REMOVES the key rather than storing NaN or 0.
  await zone.fill('30');await zone.dispatchEvent('change');
  await hemisphere.selectOption('north');
  await expect.poll(async()=>page.evaluate(()=>{
    const n=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(x=>x.type==='reachable_nodes');
    return [n.params.zone,n.params.hemisphere].join(',');
  })).toBe('30,north');

  await node.click();
  await inspector.locator('#catchment-zone').fill('');
  await inspector.locator('#catchment-zone').dispatchEvent('change');
  expect(await page.evaluate(()=>{
    const n=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(x=>x.type==='reachable_nodes');
    return 'zone' in n.params;
  })).toBe(false);

  // Changing a parameter the widget always had still reaches the saved workflow.
  await node.click();
  await inspector.locator('#catchment-minutes').fill('12');
  await inspector.locator('#catchment-minutes').dispatchEvent('change');
  await expect.poll(async()=>page.evaluate(()=>
    JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(x=>x.type==='reachable_nodes').params.minutes,
  )).toBe(12);

  expect(errors).toEqual([]);
});
