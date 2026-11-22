import {test,expect} from './fixtures.mjs';
import {configureStep} from './configure-step.mjs';

// A drawn area at Gaborone, Botswana: UTM zone 35S. Old Naledi stood here until it retired on 2026-11-11
// (docs/audits/old-naledi-audit.md).
const openGaborone=async page=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'gaborone.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(
    {schema:'fieldwork/workflow/1',name:'Gaborone',nodes:[{id:'area',type:'study_area',x:20,y:20,params:{label:'Gaborone',source:'drawn',
      selectionMode:'bbox',geometry:{type:'Polygon',coordinates:[[[25.90,-24.69],[25.92,-24.69],[25.92,-24.67],[25.90,-24.67],[25.90,-24.69]]]}}}],edges:[]}))});
};

// Nine widgets take a UTM zone by hand and every one of them defaulted to Soho's 30/north,
// which is wrong anywhere else and said nothing about it. Experiment 100.
test('a widget added to a workflow takes the zone that workflow is in',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:60000});

  // Soho is zone 30N, which is also the old hardcoded default, so this example cannot tell a
  // derived zone from a lucky one. It establishes the agreeing case and the note that says so.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="catchments"]').click();
  // Settings says nothing of a zone that fits; the dialog says it fits, and offers no other.
  await expect(page.locator('[data-utm-mismatch]')).toHaveCount(0);
  const dialog=await configureStep(page,{},{apply:false});
  await expect(dialog.locator('[data-utm-advice]')).toContainText('Zone 30N fits this workflow');
  await expect(dialog.locator('[data-utm-advice] [data-suggested-zone]')).toHaveCount(0);
  await dialog.locator('#config-cancel').click();

  // Gaborone is in zone 35S. A widget added there must not arrive as 30N.
  await openGaborone(page);
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-search').fill('Convex hull');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="summarize_hull"]').click();
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node').filter({hasText:'Convex hull'})).toHaveCount(1);
  const saved=()=>page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    return w.nodes.find(n=>n.type==='summarize_hull').params;
  });
  const added=await saved();
  expect(added.zone).toBe(35);
  expect(added.hemisphere).toBe('south');
  // And the note agrees with the data rather than warning about a default it just set.
  await page.locator('.react-flow__node').filter({hasText:'Convex hull'}).click();
  await expect(page.locator('#inspector-content .standard-sentence')).toContainText('UTM zone 35S');
  await expect(page.locator('[data-utm-mismatch]')).toHaveCount(0);
});

test('a zone that disagrees with the data is reported, with what it costs and a way to fix it',async({page})=>{
  await openGaborone(page);
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#node-search').fill('Convex hull');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('[data-add="summarize_hull"]').click();
  const hull=page.locator('.react-flow__node').filter({hasText:'Convex hull'});
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
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node').filter({hasText:'Convex hull'}).click();

  const advice=page.locator('[data-utm-mismatch]');
  await expect(advice).toContainText('UTM zone 35S, not 30N');
  // The cost is stated as a measured percentage, not as a warning with no magnitude.
  const text=await advice.textContent();
  const [,stretch]=text.match(/by up to ([\d.]+)%/);
  expect(Number(stretch)).toBeGreaterThan(1);   // five zones out of position is a large stretch

  // And the advice is actionable.
  const dialog=await configureStep(page,{},{apply:false});
  await dialog.locator('[data-suggested-zone]').click();
  await expect(dialog.locator('[data-utm-advice]')).toContainText('Zone 35S fits this workflow');
  await dialog.locator('#config-apply').click();await expect(dialog).toHaveCount(0);
  await expect(advice).toHaveCount(0);
  const fixed=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    return w.nodes.find(n=>n.type==='summarize_hull').params;
  });
  expect(fixed.zone).toBe(35);
  expect(fixed.hemisphere).toBe('south');
});
