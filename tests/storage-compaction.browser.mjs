import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {EXAMPLE_TEMPLATES} from '../build/example-templates.js';

// A WORKFLOW SAVED WITH ITS DATA INLINE, as every save before 0.88.1 kept a worked example's points (the practitioner,
// 2026-11-10: "What is still being stored in localStorage? I am almost at max"). On the next start its large data moves
// into the payload store, by content, and the workflow still opens and runs.
test('saved inline data is moved out of local storage on start, and the workflow still runs',async({page})=>{
  const errors=collectPageErrors(page);
  const saved=EXAMPLE_TEMPLATES['hagelloch']();
  const inline=JSON.stringify(saved).length;
  await page.goto('/?example=blank');
  await page.evaluate(([w])=>{const store=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}');store.hagelloch=w;
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(store));},[saved]);
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>{const w=JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}').hagelloch;
    const cases=w?.nodes?.find(n=>n.id==='cases');return `${cases?.params?.data===undefined}/${String(cases?.params?.dataRef).slice(0,5)}`;}),{timeout:20_000}).toBe('true/data-');
  const after=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}').hagelloch).length);
  expect(after).toBeLessThan(inline/4);
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:120_000});
  await page.locator('[data-view="results"]').click();
  await page.getByRole('tab',{name:'Where the cases were'}).click();
  await expect(page.locator('#result-metrics')).toContainText('188');
  expect(errors).toEqual([]);
});
