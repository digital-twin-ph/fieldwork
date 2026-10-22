import {test,expect} from '@playwright/test';

// "Where is the export project button?" -- 2026-10-21.
test('a project exports as one file and comes back as one project',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Facilities and Networks');
  await page.locator('#project-subject-input').fill('Health facilities by province');
  await page.locator('#project-create').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.locator('#add-workflow').click();
  await page.locator('#node-library [data-add="point_input"]').click();

  await page.locator('#storage-status').click();
  const block=page.locator('.project-block').filter({hasText:'Facilities and Networks'}).first();
  const download=page.waitForEvent('download');
  await block.locator('button',{hasText:'Export project'}).click();
  const file=await download;
  const text=await (await import('node:fs/promises')).readFile(await file.path(),'utf8');
  const document=JSON.parse(text);
  expect(document.schema).toBe('fieldwork/project-document/1');
  expect(document.project.name).toBe('Facilities and Networks');
  expect(document.workflows).toHaveLength(2);
  await page.locator('#projects-dialog-close').click();

  // Importing it again makes a SECOND project rather than overwriting the first.
  await page.locator('#workflow-file').setInputFiles({name:'p.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await expect(page.locator('#toast')).toContainText('imported with 2 workflows');
  const projects=await page.locator('#project-select option').allTextContents();
  expect(projects.filter(p=>p.startsWith('Facilities and Networks'))).toHaveLength(2);
  // And the imported canvas carries the first workflow's widgets.
  await expect(page.locator('#canvas .node')).toHaveCount(1);
});
