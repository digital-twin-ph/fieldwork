import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A SAVED COPY OF AN EXAMPLE THAT HAS SINCE BEEN UPDATED (the practitioner, 2026-11-12: Hagelloch's cluster workflow,
 *  saved before the day-by-day replay was added, said only "changed since"). The bar says which is true, and stays. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const dropReplay=async page=>{
  // AFTER THE RUN THE EXAMPLE STARTS ON OPENING: its scan shuffles 999 times and replays every day, and while it runs
  // Remove is disabled. On CI's slower runner that outlasted the click's 15 s (0.100.0 and 0.101.1, both engines).
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120_000});
  await page.locator('[data-view="workflow"]').click();
  await page.locator('.react-flow__node[data-id="replay"]').click();
  await page.locator('#delete-node').click();
  await expect.poll(async()=>(await saved(page)).nodes.some(n=>n.id==='replay')).toBe(false);
};

test('a copy edited by its user says so, with no offer to replace it',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch-cluster');
  await dropReplay(page);
  await expect(page.locator('#example-note')).toContainText('and changed since');
  await expect(page.locator('#load-published')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a copy made before the example was updated says so in the bar, and loads the updated example on request',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch-cluster');
  await dropReplay(page);
  // As if the copy had been made from an earlier version of the example.
  await page.evaluate(()=>{const k='fieldwork-example-revisions-v1';const r=JSON.parse(localStorage.getItem(k)||'{}');
    r['hagelloch-cluster']='an earlier version';localStorage.setItem(k,JSON.stringify(r));});
  await page.goto('/?example=hagelloch-cluster');
  const note=page.locator('#example-note');
  await expect(note).toContainText('The example has been updated since this copy was made');
  await page.locator('#load-published').click();
  await expect.poll(async()=>(await saved(page)).nodes.some(n=>n.id==='replay')).toBe(true);
  await expect(note).not.toContainText('updated since');
  expect(errors).toEqual([]);
});

/** A COPY NOBODY CHANGED FOLLOWS ITS EXAMPLE (2026-11-13). An FETP demo met Hagelloch without its day-by-day replay and John
 *  Snow's geomasking without its donuts: copies saved earlier on that computer, the example moved on since, and the
 *  comparison read only which steps there were. Opened, an unchanged copy is replaced by the example as it ships. */
test('a copy nobody changed opens as the example ships now, its settings included',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=hagelloch-cluster');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120_000});
  // As if saved from an earlier version whose replay map was drawn as a plot: the copy is rewritten. Opened, the bar gives
  // its fingerprint as the application reads it, which is then recorded as the copy loaded unchanged.
  const rewrite=()=>page.evaluate(()=>{
    for(const k of ['fieldwork-examples-v1']){const all=JSON.parse(localStorage.getItem(k));all['hagelloch-cluster'].nodes.find(n=>n.id==='replay-map').params.presentation='plot';localStorage.setItem(k,JSON.stringify(all));}
    const w=JSON.parse(localStorage.getItem('fieldwork-workflow-v1'));w.nodes.find(n=>n.id==='replay-map').params.presentation='plot';localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(w));});
  await rewrite();
  await page.goto('/?example=hagelloch-cluster');
  await expect(page.locator('#example-note')).toHaveAttribute('data-revision',/./);
  const copy=await page.locator('#example-note').getAttribute('data-revision');
  await page.evaluate(copy=>localStorage.setItem('fieldwork-example-pristine-v1',JSON.stringify({'hagelloch-cluster':copy})),copy);
  await rewrite();
  await page.goto('/?example=hagelloch-cluster');
  await expect.poll(async()=>(await saved(page)).nodes.find(n=>n.id==='replay-map')?.params.presentation,{timeout:60_000}).toBe('interactive');
  await expect(page.locator('#example-note')).not.toContainText('changed since');
  expect(errors).toEqual([]);
});

/** EVERY BUILT-IN EXAMPLE, OPENED AND RUN FRESH, IS ITSELF (2026-11-13). The comparison now reads every step's settings, so a
 *  run that wrote a setting back would mark an untouched example as changed: the bar stays quiet for each, after its run. */
for(const key of ['snow-deaths','snow-curve','snow-voronoi','snow-isochrone','snow-geoprivacy','snow-extent','hagelloch','hagelloch-chains','hagelloch-cluster','hagelloch-sheet','hagelloch-people'])
test(`${key}: opened and run fresh, it is the example as it ships`,async({page})=>{
  test.setTimeout(300_000);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto(`/?example=${key}`);
  await page.locator('[data-view="workflow"]').click();
  // Run, so a setting a run writes back is in the copy compared.
  if(!(await page.locator('#workflow-state').innerText()).includes('Run complete')){
    await expect(page.locator('#run-button')).toBeEnabled({timeout:240_000});
    if(!(await page.locator('#workflow-state').innerText()).includes('Run complete'))await page.locator('#run-button').click();}
  // The 1824 sheet waits for the learner: its image is offered in Configure… and chosen only on request (experiment 201).
  if(key==='hagelloch-sheet')await expect(page.getByText('This step has no image yet')).toBeVisible({timeout:240_000});
  else await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:240_000});
  await page.goto(`/?example=${key}`);
  await expect(page.locator('#example-note')).toHaveAttribute('data-revision',/./);
  await page.waitForTimeout(1500);
  await expect(page.locator('#example-note')).not.toContainText(/changed since|Differs from|updated since/);
});
