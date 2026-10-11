import {test,expect} from '@playwright/test';

// Nine widgets take a UTM zone by hand and every one of them defaulted to Soho's 30/north,
// which is wrong anywhere else and said nothing about it. Experiment 100.
test('a widget added to a workflow takes the zone that workflow is in',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // Soho is zone 30N, which is also the old hardcoded default, so this example cannot tell a
  // derived zone from a lucky one. It establishes the agreeing case and the note that says so.
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  await expect(page.locator('[data-utm-advice]')).toContainText('zone 30N matches this workflow');
  await expect(page.locator('[data-utm-advice]')).toContainText('configured coordinate');
  await expect(page.locator('[data-utm-advice] [data-use-suggested-zone]')).toHaveCount(0);

  // Old Naledi is in Botswana: zone 35S. A widget added there must not arrive as 30N.
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-search').fill('Convex hull');
  await page.locator('[data-add="summarize_hull"]').click();
  await expect(page.locator('.react-flow__node').filter({hasText:'Area the points cover'})).toHaveCount(1);
  const saved=()=>page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    return w.nodes.find(n=>n.type==='summarize_hull').params;
  });
  const added=await saved();
  expect(added.zone).toBe(35);
  expect(added.hemisphere).toBe('south');
  // And the note agrees with the data rather than warning about a default it just set.
  await expect(page.locator('[data-utm-advice]')).toContainText('zone 35S matches this workflow');
});

test('a zone that disagrees with the data is reported, with what it costs and a way to fix it',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-search').fill('Convex hull');
  await page.locator('[data-add="summarize_hull"]').click();
  const hull=page.locator('.react-flow__node').filter({hasText:'Area the points cover'});
  await expect(hull).toHaveCount(1);
  await hull.click();

  // Set it wrong on purpose, the way leaving a Soho default would.
  await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    w.nodes.find(n=>n.type==='summarize_hull').params.zone=30;
    w.nodes.find(n=>n.type==='summarize_hull').params.hemisphere='north';
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
  });
  await page.reload();
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('.react-flow__node').filter({hasText:'Area the points cover'}).click();

  const advice=page.locator('[data-utm-advice]');
  await expect(advice).toContainText('data is in UTM zone 35S');
  await expect(advice).toContainText('not 30N');
  // The cost is stated as a measured percentage, not as a warning with no magnitude.
  const text=await advice.textContent();
  const [,stretch]=text.match(/by up to ([\d.]+)%/);
  expect(Number(stretch)).toBeGreaterThan(1);   // five zones out of position is a large stretch

  // And the advice is actionable.
  await advice.locator('[data-use-suggested-zone]').click();
  await expect(advice).toContainText('zone 35S matches this workflow');
  const fixed=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    return w.nodes.find(n=>n.type==='summarize_hull').params;
  });
  expect(fixed.zone).toBe(35);
  expect(fixed.hemisphere).toBe('south');
});
