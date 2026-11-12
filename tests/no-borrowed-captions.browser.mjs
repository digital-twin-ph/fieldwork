import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

// THE HEAT EXAMPLE'S CAPTIONS WERE EVERY OTHER WORKFLOW'S FALLBACK (the practitioner, 2026-11-11, on Hagelloch's cluster
// workflow: "That heat example text is stale and needs to be removed"). A workflow with no caption of its own shows none.
test('a Hagelloch workflow says nothing about the heat example, in the header, the canvas, the footer or the Inspector',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('[data-view="workflow"]').click();
  for(const where of ['#example-note','#canvas-example','#footer-context','#project-description','#inspector-content'])
    await expect(page.locator(where),where).not.toContainText(/heat|synthetic neighborhoods|cooling cent/i);
  await expect(page.locator('#inspector-content .notice')).toHaveCount(0);
  await expect(page.locator('#canvas-example')).toContainText('HAGELLOCH');
  // The heat example kept its own captions until it retired on 2026-11-11 (docs/audits/old-naledi-audit.md).
  expect(errors).toEqual([]);
});
