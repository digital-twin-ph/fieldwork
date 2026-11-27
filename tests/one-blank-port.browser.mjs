import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {dragConnection} from './canvas-drag.mjs';

/** ONE BLANK PORT, BOUND BY WHAT ARRIVES (0.204.0). Settled 2026-10-15 for the Map and, by experiment 116, for every
 *  widget: bind when one input fits, ask when more than one does. The practitioner, 2026-11-27: *"Nodes should
 *  automatically detect the shape of the incoming input on an unconnected input port and once connected should display
 *  in words what came in. Then it adds a blank port to accommodate another input if it's configured to receive more."*
 *  Measure distance takes two point layers for different jobs, From and To: the first drop asks, the second fits only
 *  the input left. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const drawn=node=>node.evaluate(el=>({
  handles:[...el.querySelectorAll('.react-flow__handle-left')].map(h=>h.getAttribute('data-handleid')),
  rows:[...el.querySelectorAll('.node-port-row:not(.node-output-row)')].map(r=>r.textContent.trim())}));

test('a step taking two point layers asks which the first is, binds the second, then draws no blank port',async({page})=>{
  await page.goto('/?example=blank');
  await page.waitForSelector('html[data-ready]');
  for(const type of ['point_input','point_input','measure_distance'])
    await page.locator(`#node-library [data-add="${type}"]`).click();
  await page.locator('[data-view="workflow"]').click();
  const w=await saved(page);
  const [cases,clinics]=w.nodes.filter(n=>n.type==='point_input').map(n=>n.id);
  const measureId=w.nodes.find(n=>n.type==='measure_distance').id;
  // NAMED, AND SET APART: nodes added from the library land on top of one another.
  await page.evaluate(([cases,clinics,measureId])=>{const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const place=(id,label,x,y)=>{const n=w.nodes.find(n=>n.id===id);if(label)n.params.label=label;n.x=x;n.y=y;};
    place(cases,'Cases',0,0);place(clinics,'Clinics',0,320);place(measureId,null,420,140);
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));},[cases,clinics,measureId]);
  await page.reload();await page.waitForSelector('html[data-ready]');
  await page.locator('[data-view="workflow"]').click();
  const measure=page.locator(`.react-flow__node[data-id="${measureId}"]`);
  await expect(measure).toBeVisible({timeout:20000});

  // BEFORE: one blank port, not one dot per input.
  assert.deepEqual(await drawn(measure),{handles:['layer'],rows:['+ Add an input']});

  // THE FIRST DROP FITS BOTH INPUTS, so the canvas asks.
  const out=id=>page.locator(`.react-flow__node[data-id="${id}"] [data-handleid="out"]`);
  const blank=measure.locator('[data-handleid="layer"]');
  const asked=page.locator('dialog.choose-input');
  await dragConnection(page,out(cases),blank,async()=>await asked.isVisible());
  await expect(asked).toBeVisible();
  await expect(asked.locator('h2')).toHaveText('Cases goes into Measure distance as:');
  assert.deepEqual((await asked.locator('button').allInnerTexts()).map(t=>t.trim()),['From','To','Cancel']);
  await asked.getByRole('button',{name:'From'}).click();
  await expect.poll(async()=>(await saved(page)).edges.filter(e=>e.to===measureId).map(e=>`${e.from}:${e.port}`).join(','))
    .toBe(`${cases}:points`);

  // CONNECTED, IT SAYS WHAT CAME IN, and another blank port is drawn for the input still free.
  await expect.poll(async()=>JSON.stringify(await drawn(measure)))
    .toBe(JSON.stringify({handles:['points','layer'],rows:['From Cases','+ Add an input']}));

  // THE SECOND DROP FITS ONLY THE INPUT LEFT: bound without asking.
  await dragConnection(page,out(clinics),measure.locator('[data-handleid="layer"]'),
    async()=>(await saved(page)).edges.some(e=>e.from===clinics&&e.to===measureId));
  await expect(asked).toHaveCount(0);
  assert.equal((await saved(page)).edges.find(e=>e.from===clinics&&e.to===measureId).port,'candidates');

  // FULL: no blank port.
  await expect.poll(async()=>JSON.stringify(await drawn(measure)))
    .toBe(JSON.stringify({handles:['points','candidates'],rows:['From Cases','To Clinics']}));
});
