import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
import fs from 'node:fs';

// `reachable_nodes` had no Inspector panel at all until 2026-10-17, and was on the old catchment panel until 2026-11-23,
// when it moved to the standard Inspector (experiment 186): one sentence, Configure…, and the run's count in Result.
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(x=>x.type==='reachable_nodes').params);

test('the reachability step is configured in its dialog, and its optional frame can be unset',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:60000});

  await page.locator('#node-library [data-add="reachable_nodes"]').click();
  await page.locator('[data-view="workflow"]').click();
  const node=page.locator('.react-flow__node').filter({hasText:'Reachable junctions'}).first();
  await expect(node).toBeVisible({timeout:20000});
  await node.click();

  const inspector=page.locator('#inspector-content');
  await expect(inspector.locator('[data-standard-section="settings"] .standard-sentence'))
    .toContainText('The street junctions each site can reach within 10 minutes, walking at 80 metres a minute.');
  await expect(inspector.locator('#catchment-minutes')).toHaveCount(0);
  await expect(inspector.locator('[data-standard-section="result"]')).toContainText('Not run yet');

  // Every setting is in the dialog; the three optional ones say when they are read.
  await inspector.locator('#configure-step').click();
  const dialog=page.locator('#reach-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Sites not yet on the network');
  await expect(dialog).toContainText('Leave unset where the sites were snapped first');
  // Why a snapped point skips these settings is explanation; it is in the manual.
  expect(fs.readFileSync(new URL('../docs/widgets/isochrone.md',import.meta.url),'utf8'))
    .toContain('keeps the junction and the distance it arrived');
  await expect(dialog.locator('#reach-zone')).toHaveValue('');
  await expect(dialog.locator('#reach-hemisphere')).toHaveValue('');

  // A speed outside the mode's band holds Apply, and says why.
  await dialog.locator('#reach-speedMPerMin').fill('500');await dialog.locator('#reach-speedMPerMin').dispatchEvent('change');
  await expect(dialog).toContainText('outside the plausible range for walking');
  await expect(dialog.locator('#config-apply')).toBeDisabled();
  await dialog.locator('#reach-speedMPerMin').fill('80');await dialog.locator('#reach-speedMPerMin').dispatchEvent('change');

  await dialog.locator('#reach-minutes').fill('12');await dialog.locator('#reach-minutes').dispatchEvent('change');
  await dialog.locator('#reach-zone').fill('30');await dialog.locator('#reach-zone').dispatchEvent('change');
  await dialog.locator('#reach-hemisphere').selectOption('north');
  await expect(dialog).toContainText('960 m along the streets');
  await dialog.locator('#config-apply').click();
  await expect.poll(async()=>{const p=await saved(page);return [p.minutes,p.zone,p.hemisphere].join(',');}).toBe('12,30,north');
  await expect(inspector.locator('.standard-sentence')).toContainText('attached in UTM zone 30N');

  // Clearing the zone REMOVES the key rather than storing NaN or 0.
  await inspector.locator('#configure-step').click();
  await dialog.locator('#reach-zone').fill('');await dialog.locator('#reach-zone').dispatchEvent('change');
  await dialog.locator('#reach-hemisphere').selectOption('');
  await dialog.locator('#config-apply').click();
  await expect.poll(async()=>{const p=await saved(page);return 'zone' in p||'hemisphere' in p;}).toBe(false);

  expect(errors).toEqual([]);
});
