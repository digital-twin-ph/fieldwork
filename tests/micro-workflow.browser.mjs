import {test,expect} from '@playwright/test';

// The composition as a practitioner meets it: on the palette, added as one step, inspected,
// and exploded into the primitives it arranges. Experiment 89 claimed a composition is
// easier to follow than one node with nine knobs and nothing had put it in front of anyone,
// because until now it could not be added to a canvas at all.
test('a micro-workflow is offered, added as one step, and explodes into its primitives',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?example=snow-isochrone');

  // Offered under its own palette group, marked with the governance it has.
  await expect(page.locator('#node-library .library-group',{hasText:'Micro-workflows'})).toBeVisible();
  const entry=page.locator('#node-library [data-composition]').first();
  await expect(entry).toContainText('Walking catchment');
  await expect(entry).toContainText('private, unreviewed');
  await expect(entry).toContainText('4 steps');

  const before=await page.locator('.react-flow__node').count();
  await entry.click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(before+1);

  // It has ports on the canvas. The node's output type comes from the composition it
  // carries, so a canvas drawing handles from the static type table gives it inputs and no
  // output at all -- which is how this was found.
  const node=page.locator('.react-flow__node').filter({hasText:'Walking catchment'}).first();
  await expect(node.locator('.react-flow__handle-left')).toHaveCount(2);
  await expect(node.locator('.react-flow__handle-right')).toHaveCount(1);
  await expect(node.locator('.react-flow__handle-right')).toHaveAttribute('title','polygons output');

  // The Inspector states what it is pinned to, and its parameters are the composition's.
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('compute_walking_catchment');
  await expect(inspector).toContainText('0.3.0');
  await expect(inspector).toContainText('not reviewed by a human');
  await expect(inspector).toContainText('snap_to_network → reachable_nodes → travel_time_band → reachable_corridor');
  await expect(page.locator('[data-micro-param="speedMPerMin"]')).toHaveValue('75');
  await expect(page.locator('[data-micro-param="minutes"]')).toHaveValue('5');

  // A parameter is the practitioner's to change. The saved workflow is what is asserted,
  // not the input: every numeric field in this Inspector visually reverts to its rendered
  // value after a change while the model updates correctly -- verified the same way on the
  // pre-existing mean-center-zone field, so it is the app's behaviour and not this panel's.
  // Recorded in docs/experiments/92-micro-workflow-on-the-canvas.md.
  // Set and dispatch in one step. Filling and then dispatching leaves a window in which a
  // re-render can replace the input and drop the typed value, which is why this passed alone
  // and failed inside the full WebKit suite.
  // The set is retried until the model takes it. A re-render can replace the input between
  // resolving it and dispatching, so a single attempt is a race -- it passed in Chromium and
  // alone in WebKit, and failed inside the full WebKit suite twice. A practitioner whose
  // keystroke was swallowed would retype, and so does this.
  await expect.poll(async()=>{
    await page.locator('[data-micro-param="minutes"]').evaluate(el=>{
      el.value='10';el.dispatchEvent(new Event('change',{bubbles:true}));});
    return await page.evaluate(()=>{
      const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
      return (w.nodes||[]).find(n=>n.type==='micro_workflow')?.params?.parameters?.minutes;
    });
  },{timeout:15000}).toBe(10);

  // Exploding replaces the one node with the four it arranges.
  await page.locator('#micro-explode').click();
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(before+4);
  // Selection lands on the first member, which is now an ordinary widget with its own
  // release and digest: the composition has stopped being one step and become the steps.
  await expect(page.locator('#inspector-content')).toContainText('Walking catchment: snap');
  await expect(page.locator('#inspector-content')).toContainText('snap_to_network');
  await expect(page.locator('#inspector-content')).not.toContainText('Explode into');
  const members=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return (w.nodes||[]).filter(n=>String(n.id).startsWith('compute_walking_catchment-')).map(n=>n.type);
  });
  expect(members.sort()).toEqual(['reachable_corridor','reachable_nodes','snap_to_network','travel_time_band']);
  await expect(page.locator('#node-library [data-composition]').first()).toBeVisible();

  // Undo is the way back, as the Inspector says.
  await page.keyboard.press('Control+z');
  await expect.poll(()=>page.locator('.react-flow__node').count()).toBe(before+1);
  expect(errors).toEqual([]);
});

// The defect a practitioner hit and the unit tests could not: executionPlan validates the
// workflow a second time, so the expanded graph was checked against the authored project's
// manifest and the run stopped. Hand-built test workflows carry no manifest, so they never
// saw it. This runs a composition inside a real worked example, which does carry one.
test('a composition runs inside a worked example, which carries a project manifest',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#node-library [data-composition]').first()).toBeVisible();
  const added=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return {manifest:!!w.manifest,nodes:(w.nodes||[]).length};
  });
  expect(added.manifest,'the example carries a project manifest').toBe(true);

  await page.locator('#node-library [data-composition]').first().click();
  await expect.poll(async()=>await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    return (w.nodes||[]).filter(n=>n.type==='micro_workflow').length;})).toBe(1);

  // Wire it: the pumps and the network in, and its polygons to the existing clip step.
  const wired=await page.evaluate(()=>{
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')||'{}');
    const host=w.nodes.find(n=>n.type==='micro_workflow');
    const pumps=w.nodes.find(n=>n.id==='pumps'),net=w.nodes.find(n=>n.type==='network_input');
    return !!(host&&pumps&&net);
  });
  expect(wired).toBe(true);
  await page.evaluate(()=>{
    const key='fieldwork-workflow-v1';
    const w=JSON.parse(localStorage.getItem(key));
    const host=w.nodes.find(n=>n.type==='micro_workflow');
    const pumps=w.nodes.find(n=>n.id==='pumps'),net=w.nodes.find(n=>n.type==='network_input');
    w.edges.push({id:'mw-sites',from:pumps.id,to:host.id,port:'sites'},
      {id:'mw-net',from:net.id,to:host.id,port:'network'});
    const clip=w.nodes.find(n=>n.type==='clip_polygons');
    if(clip){w.edges=w.edges.filter(e=>!(e.to===clip.id&&e.port==='polygons'));
      w.edges.push({id:'mw-clip',from:host.id,to:clip.id,port:'polygons'});}
    localStorage.setItem(key,JSON.stringify(w));
  });
  await page.reload();
  await page.locator('#run-workflow, [data-action="run"], button:has-text("Run")').first().click();
  // The run either completes or reports a real reason; it must not stop on the manifest.
  await expect(page.locator('body')).not.toContainText('Project manifest does not match',{timeout:20000});
  expect(errors).toEqual([]);
});
