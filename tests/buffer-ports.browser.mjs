import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';

// ONE PORT, NOT THREE. Geometry buffer grew `lines` and `polygons` on 2026-11-23 and the canvas drew a bare
// handle per declared input, unlabelled, because `spatialPorts` was a hardcoded list the step was not on. The
// practitioner, the same afternoon: *"Geometry buffer won't accept a point (mines pushpin)"* -- three dots had
// appeared and only the first one took points.
test('the buffer step shows one blank port, and a points source binds to it',async({page})=>{
  await page.goto('/?example=blank');
  await page.waitForSelector('html[data-ready]');
  await page.locator('#node-library [data-add="point_input"]').click();
  await page.locator('#node-library [data-add="buffer_point"]').click();
  await page.locator('[data-view="workflow"]').click();
  const node=page.locator('.react-flow__node').filter({hasText:'Geometry buffer'}).first();
  await expect(node).toBeVisible({timeout:20000});

  const drawn=await node.evaluate(el=>({
    handles:[...el.querySelectorAll('.react-flow__handle-left')].map(h=>h.getAttribute('data-handleid')),
    rows:[...el.querySelectorAll('.node-port-row span')].map(s=>s.textContent.trim())}));
  // 0.204.0: one blank port, as every widget draws it until something is connected.
  assert.deepEqual(drawn.handles,['layer'],'one drop target, not one per underlying port');
  assert.ok(drawn.rows.includes('+ Add an input'),`a blank port: ${drawn.rows.join(' | ')}`);

  // CONNECTED THROUGH THE INSPECTOR, which is the keyboard path and the one a screen reader has.
  await node.click();
  const connect=page.locator('#inspector-content .connect-port').first();
  await expect(connect).toBeVisible();
  const offered=await connect.locator('option').allInnerTexts();
  const source=offered.find(o=>o.trim()&&!o.startsWith('Not connected'));
  assert.ok(source,`a points source is offered: ${offered.join(' | ')}`);
  await connect.selectOption({label:source});
  // THE GROUP BINDS TO THE PORT THAT TAKES IT: the edge lands on `points`, not on the group's name.
  await expect.poll(()=>page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const to=w.nodes.find(n=>n.type==='buffer_point').id;
    return w.edges.filter(e=>e.to===to).map(e=>e.port).join(',');})).toBe('points');
});
