import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A CONNECTION IS SELECTED BY A CLICK, NOT REMOVED, AND A DRAG FROM ONE PANS (2026-11-20). On DR Congo's 37-step workflow two connections went
 *  while the practitioner was trying to pan, because a click on a line removed it at once. Now a click selects it, the
 *  Inspector says what it joins and offers Remove connection, Delete removes a selected one, and Undo brings it back. */
test.use({serviceWorkers:'block'});
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).edges.length);
const centreOf=async(page,edge)=>page.evaluate(id=>{const path=document.querySelector(`.react-flow__edge[data-id="${id}"] path.react-flow__edge-path`)
  ??document.querySelector(`[data-testid="rf__edge-${id}"] path`);const p=path.getPointAtLength(path.getTotalLength()/2);
  const m=path.getScreenCTM();return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};},edge);

test('a click on a connection selects it; the Inspector removes it; Undo and Delete work',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__edge').first().waitFor();
  // NOT WHILE IT RUNS (0.155.0 CI): the example runs as it opens, and Undo runs it again, and a running workflow's canvas
  // takes no edit, Delete included. On a slower runner the key landed mid-run.
  // AND STILL: the canvas fits itself to the workflow after a run, and a click computed before the fit lands elsewhere.
  const view=()=>page.evaluate(()=>document.querySelector('.react-flow__viewport').style.transform);
  const idle=async()=>{await expect(page.locator('#run-button')).toBeEnabled({timeout:60000});
    await expect.poll(async()=>{const a=await view();await page.waitForTimeout(300);return a===await view();}).toBe(true);};
  await idle();
  const before=await saved(page);
  const id=await page.locator('.react-flow__edge').first().getAttribute('data-id')
    ??(await page.locator('.react-flow__edge').first().getAttribute('data-testid')).replace('rf__edge-','');
  const at=await centreOf(page,id);
  await page.mouse.click(at.x,at.y);
  await expect(page.locator('#remove-connection')).toBeVisible();
  await expect(page.locator('#inspector-content')).toContainText('From ');
  expect(await saved(page),'a click removes nothing').toBe(before);
  await page.locator('#remove-connection').click();
  await expect.poll(()=>saved(page)).toBe(before-1);
  await page.locator('#undo-button').click();
  await expect.poll(()=>saved(page)).toBe(before);
  await idle();
  // DELETE REMOVES A SELECTED ONE.
  const again=await centreOf(page,id);await page.mouse.click(again.x,again.y);
  await expect(page.locator('#remove-connection')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect.poll(()=>saved(page)).toBe(before-1);
  expect(errors).toEqual([]);
});

test('a drag that starts on a connection pans the canvas and removes nothing',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__edge').first().waitFor();
  // STARTED AND STILL (gate 230): a drag begun while the canvas was still fitting itself moved it either way, which hid
  // that a drag begun on a connection never panned.
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.waitForFunction(()=>document.getAnimations().length===0);
  const before=await saved(page);
  // A CONNECTION WHOSE MIDPOINT IS UNDER THE POINTER, in this window: the first one's can lie under a step or off the
  // canvas, and on CI's window it did, so the drag never started on a connection (2026-11-20).
  const ids=await page.locator('.react-flow__edge').evaluateAll(es=>es.map(e=>e.getAttribute('data-id')??e.getAttribute('data-testid')?.replace('rf__edge-','')));
  let id,at;
  for(const candidate of ids){const c=await centreOf(page,candidate);
    // On the canvas, not under a step, and within the connection's stroke: connections take no pointer events, so the
    // canvas is what is under the pointer, and a click there selects the connection it lands on.
    const hit=await page.evaluate(({x,y,candidate})=>{if(!document.elementFromPoint(x,y)?.classList.contains('react-flow__pane'))return false;
      const canvas=document.querySelector('.react-flow').parentElement;canvas.classList.add('edges-hit');
      const el=document.elementFromPoint(x,y)?.closest('.react-flow__edge');canvas.classList.remove('edges-hit');
      return !!el&&(el.getAttribute('data-id')??el.getAttribute('data-testid')?.replace('rf__edge-',''))===candidate;},{...c,candidate});
    if(hit){id=candidate;at=c;break;}}
  expect(id,'a connection whose midpoint is visible and uncovered').toBeTruthy();
  const view=()=>page.evaluate(()=>document.querySelector('.react-flow__viewport').style.transform);
  const start=await view();
  await page.mouse.move(at.x,at.y);await page.mouse.down();await page.mouse.move(at.x+90,at.y+50,{steps:8});await page.mouse.up();
  expect(await view(),'the canvas moved').not.toBe(start);
  expect(await saved(page)).toBe(before);
});
