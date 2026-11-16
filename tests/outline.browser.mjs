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
  test.skip(!!skip,skip);test.setTimeout(240000);
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
