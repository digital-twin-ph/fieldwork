import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';
import {openWorkflow} from './open-workflow.mjs';

// Tidy and Reset on an edited worked example. Written first for exploded micro-workflows, which were retired
// 2026-11-07; the canvas is now crowded with three ordinary steps instead.

/** The node count once the canvas has stopped drawing.
 *
 *  Reading it straight after a navigation undercounts in WebKit, which renders the graph
 *  progressively: a test that captured 16 then asserted 17 saw 20, because the first number
 *  was taken mid-render rather than because three nodes appeared. Two matching reads.
 */
async function settledNodes(page){
  let previous=-1;
  for(let attempt=0;attempt<40;attempt++){
    const count=await page.locator('.react-flow__node').count();
    if(count===previous&&count>0)return count;
    previous=count;
    await page.waitForTimeout(100);
  }
  return previous;
}

test('a worked example can be reset, and a crowded canvas can be laid out',async({page})=>{
  const errors=collectPageErrors(page);
  page.on('dialog',d=>d.accept());
  // Fieldwork saves each workspace to localStorage, so a test that edits snow-isochrone
  // leaves it edited for the next one. Cleared first: the counts only mean something from a known start.
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-isochrone');
  const original=await settledNodes(page);

  // Edit it: three steps added, which land wherever the palette puts them.
  for(const [index,type] of ['append_rows','table_output','chart_output'].entries()){
    await page.locator(`#node-library [data-add="${type}"]`).click();
    await page.locator('[data-view="workflow"]').click();
    await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(original+index+1);
  }

  // Tidy: every node lands on the column grid, and nothing is lost.
  await page.locator('#tidy-button').click();
  await expect.poll(async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return (w.nodes||[]).every(n=>(n.x-40)%300===0);
  })).toBe(true);
  // ROWS STACK BY HEIGHT since 2026-11-07, not on a fixed 150px grid: a readable step is taller than 150px, and the
  // grid laid steps on top of each other. So what is checked is that no two steps in a column overlap on screen.
  expect(await page.evaluate(()=>{
    const boxes=[...document.querySelectorAll('.react-flow__node')].map(e=>e.getBoundingClientRect());
    return boxes.every((a,i)=>boxes.every((b,j)=>i===j||Math.abs(a.left-b.left)>2||a.bottom<=b.top+1||b.bottom<=a.top+1));
  })).toBe(true);
  expect(await page.locator('.react-flow__node').count()).toBe(original+3);

  // A second tidy says so rather than appearing to do nothing.
  await page.locator('#tidy-button').click();
  await expect(page.locator('body')).toContainText('Already laid out in order');

  // Reselecting the workspace keeps the edit, which is why a reset exists.
  await openWorkflow(page,'snow-voronoi');
  await openWorkflow(page,'snow-isochrone');
  await page.locator('[data-view="workflow"]').click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(original+3);

  // Reset returns it to the published example.
  await page.locator('#reset-example').click();
  await page.locator('[data-view="workflow"]').click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(original);
  expect(errors).toEqual([]);
});
