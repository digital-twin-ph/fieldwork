import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// "I don't see the John Snow data sets in the Example 9 canvas" -- the practitioner, 2026-10-16,
// looking at a worked example that had been rebuilt on Snow's data that morning. Their browser
// was holding the version from before, exactly as designed: a saved workspace wins over the
// template, or edits would vanish on every visit. The cost was that republishing an example
// reached nobody who had already opened it, and nothing said so. They found it by reloading the
// example, which is the one thing a reader has no reason to try.
const stale=()=>{
  localStorage.clear();
  localStorage.setItem('fieldwork-examples-v1',JSON.stringify({rulesets:{
    schema:'fieldwork/workflow/1',exampleId:'rulesets',name:'Rulesets · how a rule is put together',
    nodes:[{id:'sites',type:'point_input',x:40,y:200,params:{label:'Twelve service points (synthetic)',
      data:{type:'FeatureCollection',features:[{type:'Feature',id:'s1',properties:{name:'Riverside clinic'},
        geometry:{type:'Point',coordinates:[25.902,-24.683]}}]},sourceInfo:{format:'manual'}}}],edges:[]}}));
};

test('a republished worked example says so, and nothing is replaced without asking',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(stale);
  await page.goto('/?example=rulesets');

  const toast=page.locator('#toast');
  await expect(toast).toContainText('has been republished since you last opened it',{timeout:25000});
  // Amber: nothing failed, and nothing is wrong with the copy they have.
  await expect(toast).toHaveClass(/warning/);
  // The saved workspace is untouched until they ask. Discarding somebody's work in order to
  // deliver news is not an improvement on withholding the news.
  await expect(page.locator('.react-flow__node')).toHaveCount(1);

  await toast.getByText('Load the published version').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(14,{timeout:20000});
  await expect(page.locator('.react-flow__node').filter({hasText:'Snow 1855 Table 1'}).first()).toBeVisible();

  // And it does not nag afterwards: the workspace now records which published version it came
  // from, so the next visit is quiet.
  await page.goto('/?example=rulesets');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(toast).not.toContainText('has been republished');
  expect(errors).toEqual([]);
});

// A workspace opened for the first time is not "republished": it IS the published version, and
// a notice there would be noise on every first visit.
test('a first visit is quiet',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=snow-extent');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await expect(page.locator('#toast')).not.toContainText('has been republished');
  expect(errors).toEqual([]);
});
