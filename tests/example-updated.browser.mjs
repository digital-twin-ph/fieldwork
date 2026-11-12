import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** A SAVED COPY OF AN EXAMPLE THAT HAS SINCE BEEN UPDATED (the practitioner, 2026-11-12: Hagelloch's cluster workflow,
 *  saved before the day-by-day replay was added, said only "changed since"). The bar says which is true, and stays. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const dropReplay=async page=>{
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
