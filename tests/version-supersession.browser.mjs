import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner's instruction, 2026-10-14: "We should not offer up old widget versions in the
// palette, only updated versions. When new versions appear, and a workflow is run that requires
// an old version, we have to alert the user that there is a newer version. The widget manual
// should explain what was changed in the current version, and to warn of deprecated or
// incompatible functionality."
//
// The palette half shipped that day. These are the other two halves, and they were both
// available in the data already: widget releases have carried `changes` since the registry
// existed and rulesets since 2026-10-12, and nothing read either one.

test('a step pinned to a superseded ruleset says so, and says what moving costs',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  // A worked example auto-runs on load and saves when the run finishes, so an edit written
  // before that lands is overwritten by the in-memory workflow.
  await expect(page.locator('body')).toContainText('Complete in',{timeout:30000});

  // No shipped example pins a stale version, which is the point of the palette change -- so a
  // stale pin has to be made. extent-review 1.0.0 is a real published version and the only
  // difference from 1.1.0 is the output port, which is why it is the interesting case.
  await page.evaluate(()=>{
    // Both keys: the single workspace the app boots from and the per-example map a reload with
    // ?example= reads. Writing only the first is silently discarded on reload.
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const host=w.nodes.find(n=>n.type==='apply_ruleset');
    host.params.ruleset.version='1.0.0';
    // 1.0.0 returns decisions where 1.1.0 returns polygons, so what this step feeds is dropped --
    // which is exactly the incompatibility the notice is there to state.
    w.edges=w.edges.filter(e=>e.from!==host.id);
    // The project manifest records an inventory of what the workflow contains, and a saved
    // workflow whose manifest disagrees is refused on open -- which silently reset this edit to
    // the published template. Dropped so the app re-derives it, which is what it does for a
    // workflow that has none.
    delete w.manifest;
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    const workspaces=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    workspaces['snow-extent']=w;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(workspaces));
  });
  await page.reload();
  await page.locator('.react-flow__node[data-id="review"]').click();

  // Named as not a drop-in, because the ports moved: that decides whether the practitioner is
  // looking at a convenience or at a rewiring job.
  const alert=page.locator('#inspector-content .inspector-alert');
  await expect(alert).toContainText('Pinned to 1.0.0');
  await expect(alert).toContainText('1.1.0 is available and is not a drop-in');
  await expect(alert).toContainText('Incompatible:');
  await expect(alert).toContainText('re-wired to accept polygons');
  // The pin keeps running, and the panel says why rather than nagging.
  await expect(alert).toContainText('which is what reproduces the results it was built on');
  expect(errors).toEqual([]);
});

test('the run names every superseded pin it just used',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('body')).toContainText('Complete in',{timeout:30000});
  await page.evaluate(()=>{
    // Both keys: the single workspace the app boots from and the per-example map a reload with
    // ?example= reads. Writing only the first is silently discarded on reload.
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));
    const host=w.nodes.find(n=>n.type==='apply_ruleset');
    host.params.ruleset.version='1.0.0';
    // The wiring is left alone here: with the step's output disconnected the run refuses on the
    // unconnected table instead of completing, and a run that does not complete has no notice
    // to carry.
    // The project manifest records an inventory of what the workflow contains, and a saved
    // workflow whose manifest disagrees is refused on open -- which silently reset this edit to
    // the published template. Dropped so the app re-derives it.
    delete w.manifest;
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));
    const workspaces=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');
    workspaces['snow-extent']=w;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(workspaces));
  });
  // The reload re-runs the example, and that run is the one the notice is about.
  await page.reload();
  // Said at the run, because that is the moment a result is produced by rules the practitioner
  // may not know are superseded.
  await expect(page.locator('body')).toContainText('1.1.0 is available and is not a drop-in',{timeout:30000});
  await expect(page.locator('body')).toContainText('The run used the pinned version');
  expect(errors).toEqual([]);
});

test('the Inspector says what the offered version of a widget changed',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  // Wait for the example to settle before selecting. Clicking a node while the workspace is
  // still restoring leaves the Inspector on its empty state -- "Choose a node to inspect its
  // settings" -- and the assertion below then reads that instead of the node. WebKit is slow
  // enough to lose this and every Chromium run won it, which is the signature of a test racing
  // the application. Found 2026-10-17 by running the suite as the gate configures it.
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="map"]').click();
  const inspector=page.locator('#inspector-content');
  await expect(inspector).not.toContainText('Choose a node to inspect');
  await expect(inspector).toContainText('What changed in 0.10.0');
  // Folded by default for an ordinary release; the text is there once opened.
  await inspector.locator('details',{hasText:'What changed in 0.10.0'}).first().click();
  await expect(inspector).toContainText('declares every layer port it can draw');
  await expect(inspector).toContainText('Earlier releases stay in the registry');
  expect(errors).toEqual([]);
});
