import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// WAS THERE A CLUSTER IN HAGELLOCH? (experiment 200, Detect): the third workflow, as shipped. The scan runs in a worker
// with a progress panel (the practitioner, 2026-11-10: "That may need a progress bar"), and its clusters are drawn over
// the village and listed.
test('Hagelloch: the space-time scan runs with a progress bar, and its clusters are mapped and listed',async({page})=>{
  test.setTimeout(180_000);
  const errors=collectPageErrors(page);
  await page.goto('/?example=hagelloch-cluster');
  await expect(page.locator('#project-select option:checked')).toHaveText('Measles in Hagelloch, 1861 · 3 workflows');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('#run-button')).toBeEnabled({timeout:60_000});
  // Recorded as it happens, so the check cannot race the panel it checks.
  await page.evaluate(()=>{
    const seen=window.__progressSeen=[];
    new MutationObserver(()=>{const panel=document.getElementById('run-progress');if(panel)seen.push(panel.textContent);})
      .observe(document.body,{subtree:true,childList:true,characterData:true});
  });
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:120_000});
  const seen=await page.evaluate(()=>window.__progressSeen);
  expect(seen.some(t=>t.includes('Shuffling the dates:')&&t.includes('of 999'))).toBe(true);
  await expect(page.locator('#run-progress')).toHaveCount(0);

  // The Inspector says what was found, with the seed.
  await page.locator('.react-flow__node[data-id="scan"]').click();
  await expect(page.locator('#inspector-content')).toContainText('The most likely cluster: 8 cases where 0.55 were expected');
  await expect(page.locator('#inspector-content')).toContainText('seed 20261110');

  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Every cluster reported'}).click();
  await expect(page.locator('main').first()).toContainText('observed_over_expected');
  await page.getByRole('tab',{name:'Clusters over the village'}).click();
  await expect(page.locator('#map')).toBeVisible();
  await page.screenshot({path:'test-results/hagelloch-cluster-example.png',fullPage:true});
  expect(errors).toEqual([]);
});
