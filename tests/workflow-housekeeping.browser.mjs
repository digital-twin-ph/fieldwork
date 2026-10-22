import {test,expect} from '@playwright/test';

/** Reported 2026-10-21, with a screenshot of nine rows: *"The import workflow template does not
 *  seem to work. Now I have a bunch of workflows I do not need. We do not have a way to delete
 *  workflows."* Three defects behind one list. */

const newProject=async(page,name)=>{
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill(name);
  await page.locator('#project-create').click();
  await page.locator('[data-view="workflow"]').click();
};
const names=page=>page.locator('#workflow-select option').allTextContents();

test('a template fills the open canvas when it is empty, keeping its name',async({page})=>{
  await page.goto('/?example=blank');
  await newProject(page,'Kivu');
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.locator('#node-library [data-add="point_input"]').click();
  await page.locator('#add-workflow').click();
  const before=await names(page);
  const values=await page.locator('#workflow-template option').evaluateAll(o=>o.map(x=>x.value));
  await page.selectOption('#workflow-template',values.find(v=>v==='kivu/w1'));
  await expect(page.locator('#canvas .node')).not.toHaveCount(0);
  // No third row, and the canvas keeps the name it was given for its own question.
  expect(await names(page)).toEqual(before);
  await expect(page.locator('#project-title')).toHaveText('Kivu · question 2');
});

test('a template becomes a new workflow when the open canvas holds work',async({page})=>{
  await page.goto('/?example=blank');
  await newProject(page,'Kivu');
  await page.locator('#node-library [data-add="study_area"]').click();
  const values=await page.locator('#workflow-template option').evaluateAll(o=>o.map(x=>x.value));
  await page.selectOption('#workflow-template',values[1]);
  await expect(page.locator('#workflow-select option')).toHaveCount(2);
});

test('a workflow can be deleted, and a worked example cannot',async({page})=>{
  await page.goto('/?example=blank');
  await newProject(page,'Kivu');
  await page.locator('#add-workflow').click();
  expect(await names(page)).toHaveLength(2);
  page.on('dialog',d=>d.accept());
  await page.locator('#delete-workflow').click();
  expect(await names(page)).toEqual(['Kivu · first question']);
  await page.locator('#project-select').selectOption('');
  await expect(page.locator('#delete-workflow')).toBeDisabled();
});

test('a project row with nothing saved under it is removed on arrival',async({page})=>{
  await page.goto('/?example=blank');
  await newProject(page,'Kivu');
  await page.evaluate(()=>{
    const projects=JSON.parse(localStorage.getItem('fieldwork-projects-v1'));
    projects[0].workflows=[...projects[0].workflows,'kivu/w7','kivu/w8'];
    localStorage.setItem('fieldwork-projects-v1',JSON.stringify(projects));
  });
  await page.reload();
  await expect(page.locator('#toast')).toContainText('nothing saved under');
  const held=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1'))[0].workflows);
  expect(held).not.toContain('kivu/w7');
  expect(held).not.toContain('kivu/w8');
});

test('choosing a row with nothing saved under it says so instead of doing nothing',async({page})=>{
  await page.goto('/?example=blank');
  await newProject(page,'Kivu');
  await page.locator('#node-library [data-add="study_area"]').click();
  await page.evaluate(()=>{
    const projects=JSON.parse(localStorage.getItem('fieldwork-projects-v1'));
    projects[0].workflows=[...projects[0].workflows,'kivu/w7'];
    localStorage.setItem('fieldwork-projects-v1',JSON.stringify(projects));
  });
  // Rebuild the list without reloading, so the row is there to be chosen.
  await page.locator('#node-library [data-add="point_input"]').click();
  await page.selectOption('#workflow-select','kivu/w7');
  await expect(page.locator('#toast')).toContainText('nothing to open');
  // The canvas it was on is still the canvas it is on, and the list no longer offers the row.
  await expect(page.locator('#canvas .node')).toHaveCount(2);
  expect(await names(page)).not.toContain('kivu/w7');
});

test('the bar offers Reset example only where there is a published example to reset to',async({page})=>{
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#reset-example')).toBeVisible();
  await newProject(page,'Kivu');
  await expect(page.locator('#reset-example')).toBeHidden();
  await expect(page.locator('#delete-workflow')).toBeEnabled();
  // The blank canvas is not a worked example either.
  await page.locator('#new-workflow').click();
  await expect(page.locator('#reset-example')).toBeHidden();
});

test('a workflow the application refuses to open says why and can be deleted from the toast',async({page})=>{
  await page.goto('/?example=blank');
  await newProject(page,'Kivu');
  await page.locator('#node-library [data-add="study_area"]').click();
  // A saved workflow that no longer validates: a drawn study area with no geometry key at all,
  // which is the shape the old template clearing produced.
  await page.evaluate(()=>{
    const store=JSON.parse(localStorage.getItem('fieldwork-examples-v1'));
    store['kivu/w9']={schema:'fieldwork/workflow/1',id:'broken',name:'Health Facilities Ituri · template',
      projectId:'kivu',workflowKey:'kivu/w9',
      nodes:[{id:'scope',type:'study_area',x:0,y:0,params:{label:'Area',source:'drawn',selectionMode:'polygon'}}],edges:[]};
    localStorage.setItem('fieldwork-examples-v1',JSON.stringify(store));
    const projects=JSON.parse(localStorage.getItem('fieldwork-projects-v1'));
    projects[0].workflows=[...projects[0].workflows,'kivu/w9'];
    localStorage.setItem('fieldwork-projects-v1',JSON.stringify(projects));
  });
  await page.locator('#node-library [data-add="point_input"]').click();
  await page.selectOption('#workflow-select','kivu/w9');
  await expect(page.locator('#toast')).toContainText('could not be opened');
  // The canvas is untouched, and the one action left is offered on the spot.
  await expect(page.locator('#canvas .node')).toHaveCount(2);
  page.on('dialog',d=>d.accept());
  await page.locator('#toast button',{hasText:'Delete it'}).click();
  expect(await names(page)).not.toContain('Health Facilities Ituri · template');
  await expect(page.locator('#canvas .node')).toHaveCount(2);
});
