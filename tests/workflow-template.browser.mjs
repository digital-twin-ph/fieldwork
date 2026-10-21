import {test,expect} from '@playwright/test';

// "Can the workflow be imported as a template to be filled up?" -- 2026-10-21, with a North Kivu
// workflow built and an Ituri one to build.
test('a workflow can be taken as a template, and the original is untouched',async({page})=>{
  await page.goto('/?example=blank');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');

  // A project with one workflow that has something to copy.
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Facilities and Networks');
  await page.locator('#project-subject-input').fill('Health facilities by province');
  await page.locator('#project-dialog button[type="submit"], #project-create').first().click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.locator('#node-library [data-add="clip_points_to_area"]').click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(before.nodes).toHaveLength(2);

  // Take it as a template. The picker lists the workflows that have something to copy.
  await page.locator('#add-workflow').click();
  const picker=page.locator('#workflow-template');
  await expect(picker).toBeVisible();
  // Every workflow on this device that has something to copy, plus the placeholder.
  await expect(picker.locator('option')).not.toHaveCount(1);
  await picker.selectOption(before.workflowKey);

  // The same widgets and wiring, in a workflow of its own.
  await expect(page.locator('#workflow-state')).toBeVisible();
  const made=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
  expect(made.nodes.map(n=>n.type).sort()).toEqual(['clip_points_to_area','study_area']);
  expect(made.workflowKey).not.toBe(before.workflowKey);
  expect(made.name).toContain('template');

  // And the workflow it was taken from is still there, unchanged.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-examples-v1')||'{}'));
  expect(saved[before.workflowKey].nodes).toHaveLength(2);
  expect(saved[before.workflowKey].name).toBe(before.name);
});
