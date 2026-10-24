import {test,expect} from '@playwright/test';
import {downloadText} from './read-download.mjs';

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
  const block=page.locator('.project-view-block').filter({hasText:'Facilities and Networks'}).first();
  const download=page.waitForEvent('download');
  await block.locator('button[data-export-project]').click();
  const file=await download;
  const text=await downloadText(file);
  const document=JSON.parse(text);
  expect(document.schema).toBe('fieldwork/project-document/1');
  expect(document.project.name).toBe('Facilities and Networks');
  expect(document.workflows).toHaveLength(2);
  await page.locator('[data-view="workflow"]').click();

  // Importing it again makes a SECOND project rather than overwriting the first.
  await page.locator('#workflow-file').setInputFiles({name:'p.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await expect(page.locator('#toast')).toContainText('imported with 2 workflows');
  const projects=await page.locator('#project-select option').allTextContents();
  expect(projects.filter(p=>p.startsWith('Facilities and Networks'))).toHaveLength(2);
  // And the imported canvas carries the first workflow's widgets.
  await expect(page.locator('#canvas .node')).toHaveCount(1);
});

// A PROJECT'S DATA GOES WHERE DATA GOES. The practitioner, 2026-10-24, importing a project:
// '"Experiments Project" could not be saved on this device, so it was not imported. The workspace
// store is full.' -- over a store reading 419 KB of 5.2 MB.
//
// It was not full. The import dehydrated against `()=>false`, meaning "no digest is held", so
// nothing was stripped and every downloaded payload was written inline into localStorage, whose
// ceiling is about 5 MB. A project carrying real data could not be imported however empty the
// store was. save() had always done it correctly; the import never did.
test('an imported project keeps its payloads out of the workspace store',async({page})=>{
  await page.goto('/?example=old-naledi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri payload carrier');
  await page.locator('#project-subject-input').fill('A project with data in it');
  await page.locator('#project-create').click();

  const download=page.waitForEvent('download');
  await page.locator('[data-view="project"]').click();
  await page.locator('.project-view-block [data-export-project]').click();
  const file=await (await download).path();

  const before=await page.evaluate(()=>(localStorage.getItem('fieldwork-examples-v1')||'').length);
  await page.locator('#workflow-file').setInputFiles(file);
  await expect(page.locator('#toast')).not.toHaveClass(/failure/,{timeout:15000});
  const after=await page.evaluate(()=>(localStorage.getItem('fieldwork-examples-v1')||'').length);

  // The structure grows; the payloads do not live here. A workflow written inline would add its
  // whole dataset to this number.
  expect(after).toBeGreaterThan(before);
  expect(after).toBeLessThan(5_000_000);
});
