import {test,expect} from '@playwright/test';

// A run used to be silent until it ended. These two signals say which widget just
// finished, and how long the whole thing took, because on a slow step a practitioner
// otherwise cannot tell a working application from a stuck one.
test('each widget is marked as it finishes, and the run reports how long it took',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // The glow lasts under a second, so record every node that is ever given the class
  // rather than trying to catch one mid-animation.
  await page.evaluate(()=>{
    window.__glowed=new Set();
    const seen=()=>document.querySelectorAll('.node.just-finished')
      .forEach(n=>window.__glowed.add(n.getAttribute('data-id')||n.textContent.slice(0,20)));
    new MutationObserver(seen).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
    seen();
  });

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});
  const glowed=await page.evaluate(()=>[...window.__glowed]);
  expect(glowed.length).toBeGreaterThan(1);

  // And it settles: nothing is still glowing once the animation window has passed.
  await expect(page.locator('.node.just-finished')).toHaveCount(0,{timeout:5000});

  // Wall clock for the run, beside the time the widgets themselves accounted for.
  // The two differ, and reporting only the sum would understate what a person waited.
  await expect(page.locator('#run-summary')).toContainText(/ran in \d+(\.\d+)? (ms|s) · \d+ ms computing/);
});
