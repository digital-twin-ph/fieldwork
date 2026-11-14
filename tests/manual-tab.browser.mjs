import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';

/** THE MANUAL TAB, on the NYC example opened from its pin (experiment 173). The practitioner, 2026-11-04: *"worked
 *  examples should come with a Manual tab that lays out step by step how to build the workflows by hand."*
 *
 *  The network is stubbed: each pinned file is answered from the checkout beside this repository, by its path, so the
 *  digests the catalogue pins are the ones checked. Nothing is run, so the Zenodo package is not needed. */
test.use({serviceWorkers:'block'});

const REPO=new URL('../../example-2025-nyc-ozone/',import.meta.url);
const skip=existsSync(new URL('manual.json',REPO))?false:'example-2025-nyc-ozone is not checked out beside this repository.';

test('a worked example with a manual has a Manual tab, and a workflow without one does not',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO))});
  });
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  // A blank canvas is no worked example, so there is nothing to follow.
  await expect(page.locator('[data-view="manual"]')).toBeHidden();

  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]'))
    .toContainText('digest matched',{timeout:30000});

  const tab=page.locator('[data-view="manual"]');
  await expect(tab).toBeVisible();
  await tab.click();
  const view=page.locator('#manual-view');
  // All six workflows, the open one first and marked.
  await expect(view.locator('[data-manual-workflow]')).toHaveCount(6);
  const open=view.locator('.manual-workflow.open');
  await expect(open).toHaveCount(1);
  await expect(view.locator('[data-manual-workflow]').first()).toHaveClass(/open/);
  // Steps read as sentences, the library search named, the range as two dates.
  const smoke=view.locator('[data-manual-workflow="What happened during the June 2023 smoke?"]');
  await expect(smoke).toContainText('type its name in Find a node…');
  await expect(smoke).toContainText('Set From to 2023-06-01');
  await expect(smoke).toContainText('Connect the output of Tabular data to the records input of Select rows by value.');
  await expect(smoke).toContainText('In Project, set This workflow’s name');
  await page.screenshot({path:'test-results/manual-tab.png'});

  // COPY, not type: the Zenodo URL goes on the clipboard exactly, and the step is not marked done by it.
  const clipboard=await page.context().grantPermissions(['clipboard-read','clipboard-write']).then(()=>true,()=>false);
  const url=smoke.locator('[data-copy^="https://zenodo.org/"]').first();
  await url.click();
  await expect(url).toHaveText(/^(Copied|Selected)$/);
  if(clipboard)expect(await page.evaluate(()=>navigator.clipboard.readText()))
    .toBe('https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content');
  await expect(url.locator('xpath=ancestor::li[1]')).not.toHaveClass(/done/);
  expect(await smoke.locator('[data-copy]').count()).toBeGreaterThan(8);

  // A RANGE ON A TABLE NOT YET FETCHED is still a range. Opened from its pin, the table has no rows on this device, and
  // the smoke workflow's 1 to 14 June showed as an empty text box (the practitioner, 2026-11-04, on the published site).
  await page.locator('[data-view="workflow"]').click();
  const days=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='select_rows').id);
  await page.locator(`.react-flow__node[data-id="${days}"]`).click();
  await expect(page.locator('#inspector-content .standard-sentence')).toHaveText('Keeps the rows with date from 2023-06-01 to 2023-06-14, both ends included.');
  await page.locator('#configure-step').click();
  await expect(page.locator('#select-config #select-mode')).toHaveValue('range');
  await expect(page.locator('#select-config #select-from')).toHaveValue('2023-06-01');
  await expect(page.locator('#select-config #select-to')).toHaveValue('2023-06-14');
  await expect(page.locator('#select-config #select-values')).toHaveCount(0);
  await page.locator('#select-config #config-cancel').click();
  await page.locator('[data-view="manual"]').click();

  // Switching workflow moves the mark.
  const other=await page.locator('#workflow-select option').filter({hasText:'Ten years'}).getAttribute('value');
  await page.locator('#workflow-select').selectOption(other);
  await expect(view.locator('[data-manual-workflow]').first()).toHaveAttribute('data-manual-workflow','Ten years of daily visits');
});

/** THE MANUAL DETACHED, beside a project of the practitioner's own. The practitioner, 2026-11-04: *"Can the manual be
 *  detached, become a surface dialog so the user can create a new project? When the user decides to finish the
 *  activity he or she can close the dialog. If user wants to resume user can go back to the manual tab and detach it
 *  again to resume."* */
test('the manual detaches, stays through a new project and a reload, closes, and resumes where it was left',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO))});
  });
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]'))
    .toContainText('digest matched',{timeout:30000});
  const exampleProject=await page.locator('#project-select').inputValue();
  await page.locator('[data-view="manual"]').click();
  await page.locator('#manual-detach').click();
  const panel=page.locator('#manual-float');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Manual · Ozone and child asthma');
  // It opens clear of the Inspector, whose fields the manual names (2026-11-04: "there is no From").
  const inspector=await page.locator('.inspector').first().boundingBox();
  const opened=await panel.boundingBox();
  expect(opened.x+opened.width).toBeLessThanOrEqual(inspector.x);

  // A MODAL DOES NOT BLUR IT. With the import dialog open, the manual is where it was, inside the open dialog rather
  // than behind it, and its Copy works -- the file to choose in the zip is read from it. The practitioner, 2026-11-04.
  const clipboard=await page.context().grantPermissions(['clipboard-read','clipboard-write']).then(()=>true,()=>false);
  const before=await panel.boundingBox();
  await page.locator('[data-view="workflow"]').click();
  const table=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${table}"]`).click();
  await page.locator('#configure-step').click();
  await expect(page.locator('dialog[open] #table-title')).toBeVisible();
  expect(await panel.evaluate(el=>el.parentElement?.matches('dialog[open]'))).toBe(true);
  expect(await panel.boundingBox()).toEqual(before);
  const copy=panel.locator('[data-copy^="https://zenodo.org/"]').first();
  await copy.scrollIntoViewIfNeeded();await copy.click();
  await expect(copy).toHaveText(/^(Copied|Selected)$/);
  await page.screenshot({path:'test-results/manual-over-modal.png'});
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open] #table-title')).toHaveCount(0);
  expect(await panel.evaluate(el=>el.parentElement===document.body)).toBe(true);

  // Two steps done, by click and by keyboard.
  await panel.locator('[data-step="0:0"]').click();
  await panel.locator('[data-step="0:1"]').focus();await page.keyboard.press('Enter');
  await expect(panel.locator('.manual-float-head')).toContainText('2 of');
  await expect(panel.locator('[data-step="0:0"]')).toHaveClass(/done/);

  // A project of the practitioner's own: the panel stays, the tab goes. And while the New project dialog is open the
  // manual is inside it, readable and copyable, not blurred behind it (the practitioner, 2026-11-04).
  await page.locator('#new-project').click();
  await expect(page.locator('#project-dialog')).toBeVisible();
  expect(await panel.evaluate(el=>el.parentElement?.id)).toBe('project-dialog');
  const name=panel.locator('[data-copy^="Ozone and child asthma"]').first();
  await name.scrollIntoViewIfNeeded();await name.click();
  await expect(name).toHaveText(/^(Copied|Selected)$/);
  await page.locator('#project-name-input').fill('My NYC rebuild');
  await page.locator('#project-create').click();
  await expect(page.locator('[data-view="manual"]')).toBeHidden();
  await expect(panel).toBeVisible();
  // Every control stays in reach: the library can be searched with the panel open.
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-search').fill('Tabular');
  await page.locator('#node-library [data-add="table_input"]').click();

  // A reload keeps it, and its progress.
  await page.reload();
  await expect(panel).toBeVisible();
  await expect(panel.locator('.manual-float-head')).toContainText('2 of');

  // Close finishes the activity.
  await panel.locator('#manual-float-close').click();
  await expect(panel).toHaveCount(0);

  // Resuming: back to the example, the tab shows the ticks, and detaching again opens at the next step.
  await page.locator('#project-select').selectOption(exampleProject);
  await page.locator('[data-view="manual"]').click();
  await expect(page.locator('#manual-view [data-step="0:0"]')).toHaveClass(/done/);
  await page.locator('#manual-detach').click();
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-step="0:2"]')).toBeInViewport();
  await page.screenshot({path:'test-results/manual-detached.png'});
});

/** PLAYED BACK, ONE STEP AT A TIME (experiment 173's dialog, built 2026-11-13 with 214): the open workflow's steps in a
 *  panel that is not modal, the canvas holding what is placed by each step; Close restores the canvas. */
test('the manual’s steps play back one at a time, the canvas growing with them',async({page})=>{test.skip(!!skip,skip);
  await page.route(/raw\.githubusercontent\.com/,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO))});
  });
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:nyc-asthma-ozone-2016-2025"]')).toContainText('digest matched',{timeout:30000});
  const all=await page.locator('.react-flow__node').count();
  await page.locator('[data-view="manual"]').click();
  await page.locator('#manual-playback-start').click();
  const panel=page.locator('#manual-playback');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-playback-at]')).toHaveText(/^Step 1 of \d+$/);
  // The manual's first step is its own: the NYC manual's opens with a new project, so nothing is on the canvas yet.
  await expect(panel.locator('[data-playback-step]')).toContainText('New project');
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(0);
  // Next until the first widget is added: its step names the library search, and one node is placed.
  for(let i=0;i<20&&await page.locator('.react-flow__node').count()<1;i++)await panel.locator('#manual-playback-next').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(panel.locator('[data-playback-step]')).toContainText('Find a node…');
  // And a second; the canvas grows with the steps and never past the workflow.
  for(let i=0;i<20&&await page.locator('.react-flow__node').count()<2;i++)await panel.locator('#manual-playback-next').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await panel.locator('#manual-playback-back').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await panel.locator('#manual-playback-close').click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(all);
});
