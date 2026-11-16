import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** THE OUTLINE OF WHAT A PROJECT WRITES TOWARDS (experiment 202, Stage A, 2026-11-15). On South London, opened from its
 *  repository so its project can be kept: targets chosen on the Project tab, the outline and coverage on the Notes
 *  board, and an empty slot's note made with the slot's section and function. */
test.use({serviceWorkers:'block'});
const REPO=new URL('../../example-1855-cholera-south-london/',import.meta.url);
const skip=existsSync(REPO)?false:'example-1855-cholera-south-london is not checked out beside this repository.';

test('targets chosen on the Project tab give the Notes board an outline, and an empty slot makes its note',async({page})=>{
  test.skip(!!skip,skip);test.setTimeout(480000);
  const errors=collectPageErrors(page);
  await page.route(/raw\.githubusercontent\.com\/digital-twin-ph\/example-1855-cholera-south-london\/[0-9a-f]{40}\//,route=>{
    const path=new URL(route.request().url()).pathname.split('/').slice(4).join('/');
    route.fulfill({status:200,body:readFileSync(new URL(path,REPO)),headers:{'access-control-allow-origin':'*'}});});
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example="urn:fieldwork:example:south-london-1854"]').click();
  await expect(page.locator('[data-example-status="urn:fieldwork:example:south-london-1854"]')).toContainText('digest matched',{timeout:30000});
  // No target yet: no outline.
  await page.locator('[data-view="notes"]').click();
  await expect(page.locator('.notes-outline')).toHaveCount(0);
  // Writing towards a publication and a WHO-style sit rep.
  await page.locator('[data-view="project"]').click();
  await page.locator('input[name="project-target-edit"][value="publication"]').check();
  await page.locator('input[name="project-target-edit"][value="sitrep-who"]').check();
  await page.locator('#project-apply').click();
  await page.locator('[data-view="notes"]').click();
  const outline=page.locator('.notes-outline');
  await expect(outline).toContainText(/Publication: \d+ of 15 filled/);
  await expect(outline).toContainText(/Situation report, WHO style: \d+ of 13 filled/);
  // Snow's quotations fill the background; nothing yet states a principal finding.
  await expect(outline.locator('[data-outline-role="background"]')).toContainText(/\d+ notes?/);
  const principal=outline.locator('[data-outline-role="principalFinding"]');
  await expect(principal).toContainText('empty');
  await expect(principal).toContainText('Discussion: principal finding');
  await principal.locator('[data-add-note]').click();
  // The note made from the slot carries its role: Discussion, finding.
  await expect(page.locator('#note-dialog')).toBeVisible();
  const role=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('fieldwork-projects-v1')).find(x=>/South London/i.test(x.name));
    const n=p.notes[p.notes.length-1];return `${n.section}|${n.fn||''}`;});
  expect(role).toBe('Discussion|finding');
  // Not yet written, it fills nothing.
  await page.locator('#note-close').click();
  await expect(page.locator('.notes-outline [data-outline-role="principalFinding"]')).toContainText('empty');
  // An objectives note: its dialog says where it goes in each target, and holds its objectives as items.
  const objectives=page.locator('.notes-outline [data-outline-role="objectives"]');
  await objectives.locator('[data-add-note]').click();
  const dialog=page.locator('#note-dialog');
  await expect(dialog.locator('#note-targets')).toContainText('Publication: Introduction: objectives, 2 to 4 objectives');
  await dialog.locator('#note-text').fill('Our objectives were to:');
  await dialog.locator('#note-item-add').click();
  await dialog.locator('#note-item-0').fill('reproduce the comparison per house');
  await dialog.locator('#note-item-add').click();
  await dialog.locator('#note-item-1').fill('recompute it per person');
  await dialog.locator('#note-save').click();
  await expect(page.locator('.notes-outline [data-outline-role="objectives"]')).toContainText('2 objectives');
  await expect(page.locator('#notes-view .note-items li')).toHaveCount(2);
  // STAGE B: this workflow answers objective 1, said on the Project tab, kept on the objective.
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#workflow-objective-field')).toBeVisible();
  await page.locator('#workflow-objective-edit').selectOption({label:'Objective 1: reproduce the comparison per house'});
  await page.locator('#project-apply').click();
  await page.locator('[data-view="notes"]').click();
  // Its workflows run, so their tables, charts and maps are there to rest on.
  const pending=page.locator('[data-run-pending]');
  if(await pending.count()){await pending.click();await expect(page.locator('.toast').last()).toContainText('ran',{timeout:300000});}
  await page.locator('[data-view="notes"]').click();
  const rows=page.locator('.notes-outline .outline-objectives li');
  await expect(rows.nth(0)).toContainText(/no answer yet, \d+ tables?, charts? or maps?, answered by /);
  await expect(rows.nth(1)).toContainText('no workflow yet');
  // Objective 2's answer, written from its row, shown with a table, chart or map of the project's.
  await rows.nth(1).locator('[data-add-answers]').click();
  await expect(dialog.locator('#note-answers')).toHaveValue(/.+/);
  await dialog.locator('#note-text').fill('Deaths per 1,000 people fell across the three supply groups.');
  const component=dialog.locator('[data-component]').first();
  await component.check();
  await dialog.locator('#note-save').click();
  await expect(page.locator('.notes-outline .outline-objectives li').nth(1)).toContainText(/answered, 1 table, chart or map/);
  await expect(page.locator('#notes-view .notes-answers')).toContainText('answers objective 2');
  await page.locator('.notes-outline [data-outline-role="objectives"]').screenshot({path:'test-results/outline-objectives.png'});
  // The draft: Results by objective, the answer under objective 2, its component after it.
  await page.locator('#notes-view [data-publication]').first().click();
  const paper=page.locator('#publication-view .publication-page');
  await expect(paper.locator('h3[data-pub-objective]')).toHaveCount(2);
  await expect(paper.locator('h3[data-pub-objective]').nth(1)).toContainText('3.2 Recompute it per person (objective 2)');
  const order=await paper.evaluate(el=>{const t=el.innerHTML;return [t.indexOf('3.2 Recompute'),t.indexOf('Deaths per 1,000 people fell')];});
  expect(order[0]).toBeGreaterThan(0);expect(order[1]).toBeGreaterThan(order[0]);
  await page.screenshot({path:'test-results/outline.png'});
  expect(errors).toEqual([]);
});

test('a new project names what it writes towards in its dialog',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in a district');
  await page.locator('input[name="project-target-new"][value="sitrep-ocha"]').check();
  await page.locator('#project-create').click();
  const targets=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1')).find(x=>x.name==='Measles in a district').targets);
  expect(targets).toEqual(['sitrep-ocha']);
});

test('a fresh project writes its objectives before any workflow answers them',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#workflow-objective-field')).toBeHidden();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in a district');
  await page.locator('input[name="project-target-new"][value="publication"]').check();
  await page.locator('#project-create').click();
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-outline [data-outline-role="objectives"] [data-add-note]').click();
  const dialog=page.locator('#note-dialog');
  await dialog.locator('#note-text').fill('Our objectives were to:');
  await dialog.locator('#note-item-add').click();
  await dialog.locator('#note-item-0').fill('describe the outbreak by place');
  await dialog.locator('#note-save').click();
  await expect(page.locator('.notes-outline .outline-objectives li')).toContainText('describe the outbreak by place: no answer yet, 0 tables, charts or maps, no workflow yet');
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#workflow-objective-field')).toBeVisible();
});
