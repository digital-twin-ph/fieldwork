import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';

/** THE WRITE-UP IS THE PROJECT'S, NOT THE OPEN WORKFLOW'S.
 *
 *  The practitioner, 2026-10-30, after the Notes tab was found holding one workflow's artifacts:
 *  *"This is not the model we are building. It's supposed to hold notes from all workflows in
 *  that project."*
 *
 *  THE DEFECT THIS HOLDS OUT. `result` in `app.ts` is one variable holding the open workflow's
 *  last run, nulled on every workflow switch. The Notes tab read it directly, so a six-workflow
 *  investigation showed one workflow's notes at a time and a freshly opened project showed none.
 *  Every test written for the machined notes ran ONE workflow and then looked, so none of them
 *  could see it -- which is why this drives the real sequence a practitioner does instead.
 *
 *  Nothing here injects state through `localStorage`: the write-up is built by running workflows
 *  in the interface, because the two silent setup traps recorded in
 *  `tests/version-supersession.browser.mjs` are exactly how a test like this comes to assert
 *  against the published template. */
test.use({serviceWorkers:'block'});

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';
const bundle=skip?Buffer.alloc(0):readFileSync(BUNDLE);

const open=async page=>{
  await page.route(/raw\.githubusercontent\.com/,r=>r.fulfill({status:200,body:bundle}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="project"]').click();
  await page.locator('[data-open-example]').click();
  await expect(page.locator('[data-example-status]')).toContainText('digest matched',{timeout:30000});
};
const run=async (page,named)=>{
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',{hasText:named});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
};
const notes=async page=>{
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-part').first().waitFor();
};
const machined=page=>page.locator('.notes-note.k-machined');

test('a second workflow adds to the write-up instead of replacing it',{skip},async({page})=>{
  await open(page);
  await run(page,'Deaths per 1,000 people, by sub-district');
  await notes(page);
  const first=await machined(page).count();
  expect(first).toBeGreaterThan(0);
  // THE ASSERTION THE OLD BEHAVIOUR FAILS. Running a second workflow replaced the first's notes,
  // so this count used to go DOWN -- the ground contributes one note where mortality contributes
  // three.
  await run(page,'The ground: an extent, its sub-districts and the river');
  await notes(page);
  expect(await machined(page).count()).toBeGreaterThan(first);
  // And the first workflow's own notes are still there by name, not merely the count.
  await expect(machined(page).filter({hasText:'Mortality by sub-district'})).toHaveCount(1);
  await expect(machined(page).filter({hasText:'bottom to top'})).toHaveCount(1);
});

test('a note from another workflow says which workflow it came from',{skip},async({page})=>{
  await open(page);
  await run(page,'Deaths per 1,000 people, by sub-district');
  await run(page,'The ground: an extent, its sub-districts and the river');
  await notes(page);
  // The open workflow's own notes carry no source line -- the step chip already says it, and
  // repeating the workflow name on every card would be noise.
  const here=machined(page).filter({hasText:'bottom to top'});
  await expect(here.locator('.notes-source')).toHaveCount(0);
  // A note from elsewhere says where it came from and when that run happened.
  const elsewhere=machined(page).filter({hasText:'Mortality by sub-district'});
  await expect(elsewhere.locator('.notes-source')).toContainText('Deaths per 1,000 people');
  await expect(elsewhere.locator('.notes-source')).toContainText('ran 20');
});

test('the write-up survives a reload, because a publication is not a run',{skip},async({page})=>{
  await open(page);
  await run(page,'Deaths per 1,000 people, by sub-district');
  await run(page,'Died or survived, by water supply');
  await notes(page);
  const before=await machined(page).count();
  expect(before).toBeGreaterThan(4);
  await page.reload();
  await notes(page);
  // RE-RUNNING SIX WORKFLOWS TO READ A WRITE-UP would make opening a project expensive and make
  // the write-up depend on a reasoner. A practitioner organising a publication is reading.
  expect(await machined(page).count()).toBeGreaterThanOrEqual(before);
  await expect(machined(page).filter({hasText:'Mortality by sub-district'})).toHaveCount(1);
});

test('notes from several workflows do not collide on a node id they share',{skip},
  async({page})=>{
    await open(page);
    // `table-viii` is a node in three of South London's six workflows, so a write-up keyed by
    // node id silently dropped two of every three notes, and two cards sharing a `data-note`
    // attribute made opening one act on the other.
    await run(page,'Deaths per 1,000 people, by sub-district');
    await run(page,'Cholera in 1849 compared with 1854');
    await run(page,'Died or survived, by water supply');
    await notes(page);
    const keys=await machined(page).evaluateAll(ns=>ns.map(n=>n.getAttribute('data-note')));
    expect(keys.length).toBeGreaterThan(5);
    expect(new Set(keys).size).toBe(keys.length);
    // And each card's step chip names a step of the workflow that produced it, not whatever
    // shares that id on the open canvas.
    await expect(machined(page).filter({hasText:'1849 and 1854 by sub-district'}))
      .toHaveCount(1);
  });

test('a freshly opened project says why its write-up has no figures yet',{skip},async({page})=>{
  // THE CASE THREE ROUNDS OF TESTING MISSED. Every test ran a workflow and then looked, so none
  // of them ever saw what a practitioner meets first: thirteen quoted and authored notes, no
  // tables, no maps, no charts, and no account of why. The notes are correct -- nothing has run
  // -- and the silence is the defect.
  await open(page);
  await notes(page);
  await expect(machined(page)).toHaveCount(0);
  const line=page.locator('.notes-pending');
  await expect(line).toContainText('6 of this project\u2019s workflows'.replace('\u2019',"'"));
  await expect(line).toContainText('have not run');
  await expect(line).toContainText('not in this write-up yet');
  // NAMED AND CAPPED, which is `relate_table`'s rule for its gap keys: a count tells nobody what
  // to do, and six long workflow names is a paragraph nobody reads.
  await expect(line).toContainText('Deaths per 1,000 people, by sub-district');
  await expect(line).toContainText('and 3 more');
});

test('the line shrinks as workflows run, and goes when none are left',{skip},async({page})=>{
  await open(page);
  await run(page,'Deaths per 1,000 people, by sub-district');
  await notes(page);
  await expect(page.locator('.notes-pending')).toContainText('5 of this project');
  // It reports and does not grade: no score, no completeness bar, no warning tone. A
  // practitioner who has run one of six is not doing anything wrong.
  await expect(page.locator('.notes-pending')).not.toContainText(/incomplete|missing|warning/i);
  for(const name of ['The ground: an extent, its sub-districts and the river',
    'Cholera in 1849 compared with 1854','Deaths per 1,000 people, mapped',
    'Deaths per house, by water company','Died or survived, by water supply'])
    await run(page,name);
  await notes(page);
  await expect(page.locator('.notes-pending')).toHaveCount(0);
  // And the whole investigation is now in one write-up.
  expect(await machined(page).count()).toBeGreaterThan(8);
});

test('one button runs the rest and assembles the whole write-up',{skip},async({page})=>{
  // The practitioner's choice of 2026-10-30, against running them on open: South London's six
  // run in 1.9 seconds, but a project with an isochrone or a raster download does not, and each
  // run switches the open canvas -- the run-in-flight hazard experiment 142 spent a day finding.
  await open(page);
  await notes(page);
  await expect(machined(page)).toHaveCount(0);
  await page.locator('[data-run-pending]').click();
  await expect(page.locator('.notes-pending')).toHaveCount(0,{timeout:60000});
  // Every artifact kind is now in one write-up, from six different workflows.
  expect(await machined(page).count()).toBeGreaterThan(8);
  await expect(machined(page).filter({hasText:'bottom to top'}).first()).toBeVisible();
  await expect(machined(page).filter({hasText:'Mortality by sub-district'})).toHaveCount(1);
  await expect(machined(page).filter({hasText:'The four cells'})).toHaveCount(1);
});

test('running the rest returns the practitioner to the workflow they were reading',{skip},
  async({page})=>{
    await open(page);
    await run(page,'Died or survived, by water supply');
    const before=await page.locator('#workflow-select').inputValue();
    await notes(page);
    await page.locator('[data-run-pending]').click();
    await expect(page.locator('.notes-pending')).toHaveCount(0,{timeout:60000});
    // The canvas moves once per workflow and is put back. Leaving a practitioner on whichever
    // workflow happened to be last would be the surface rearranging their work to do its own.
    await page.locator('[data-view="workflow"]').click();
    expect(await page.locator('#workflow-select').inputValue()).toBe(before);
  });
