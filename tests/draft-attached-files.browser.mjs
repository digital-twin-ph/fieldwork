import {test,expect} from './fixtures.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';
import {collectPageErrors} from './page-errors.mjs';

/** WHAT A DRAFT ATTACHES RATHER THAN PRINTS (experiment 202, 2026-11-19, from the target outputs audit). The practitioner:
 *  *"Line list should be an attached CSV"*, and for the sit reps and the full report, *"Annex file"*, in one zip.
 *  MERS as a WHO-style sit rep: its line lists are attached as CSV and its equations go to annex.html. NYC: the rows
 *  were fetched from Zenodo, so they are named and never written to the zip. */
test.use({serviceWorkers:'block'});

const openExample=async(page,repo,id)=>{
  const REPO=new URL(`../../${repo}/`,import.meta.url);
  await page.route(new RegExp(`raw\\.githubusercontent\\.com/digital-twin-ph/${repo}/[^/]+/`),route=>{
    const file=new URL(new URL(route.request().url()).pathname.split('/').slice(4).join('/'),REPO);
    if(!existsSync(file))return route.fulfill({status:404,body:''});
    route.fulfill({status:200,body:readFileSync(file),headers:{'access-control-allow-origin':'*'}});});
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('[data-view="project"]').click();
  await page.locator(`[data-open-example="${id}"]`).click();
  await expect(page.locator(`[data-example-status="${id}"]`)).toContainText('digest matched',{timeout:60000});
};
const runAll=async page=>{
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-run-pending]').click();
  await expect(page.locator('.toast').filter({hasText:/workflows? ran|ran in full|ran;/})).toHaveCount(1,{timeout:300000});
};
const draftAs=async(page,kind)=>{
  await page.locator('[data-view="notes"]').click();
  await page.locator('[data-publication]').click();
  await page.locator('#publication-view [data-publication-kind]').selectOption(kind);
  return page.locator('#publication-view .publication-page');
};
const download=async page=>{
  const [file]=await Promise.all([page.waitForEvent('download'),page.locator('[data-publication-files]').click()]);
  return {name:file.suggestedFilename(),entries:unzipSync(readFileSync(await file.path()))};
};

const MERS='example-2015-mers-korea';
test('a sit rep attaches its line lists as CSV and puts its equations in the annex file, in one zip',async({page})=>{
  test.skip(!existsSync(new URL(`../../${MERS}/fieldwork-project.json.gz`,import.meta.url)),`${MERS} is not checked out beside this repository.`);
  test.setTimeout(400000);
  const errors=collectPageErrors(page);
  await openExample(page,MERS,'urn:fieldwork:example:mers-korea-2015');
  await runAll(page);
  const paper=await draftAs(page,'sitrep-who');
  // In its place, a line; no table of 162 rows is printed, and no equation.
  await expect(paper.locator('.pub-attached').first()).toContainText(/Table S1\..*162 rows: attached as S1-.*\.csv\./);
  await expect(paper.locator('.notes-figure figcaption',{hasText:'Showing 50 of'})).toHaveCount(0);
  await expect(paper.locator('.pub-equation')).toHaveCount(0);
  await expect(paper.locator('.pub-annex-note')).toContainText(/equations A1 to A\d+ and tables S1 to S\d+/);
  // Nothing printed empty: a heading over a prompt is not printed, and the date says it is the draft's.
  await expect(paper.locator('.pub-date')).toHaveText(/^Drafted /);
  await page.emulateMedia({media:'print'});
  await expect(paper.locator('h2',{hasText:'Highlights'})).toBeHidden();
  await page.emulateMedia({media:'screen'});
  const {name,entries}=await download(page);
  expect(name).toMatch(/-sitrep-who-attached\.zip$/);
  const csvs=Object.keys(entries).filter(f=>f.endsWith('.csv')).sort();
  expect(csvs.length).toBe(await paper.locator('.pub-attached',{hasText:'attached as'}).count());
  const first=strFromU8(entries[csvs[0]]).trim().split('\r\n');
  expect(first.length).toBe(163);
  const annex=strFromU8(entries['annex.html']);
  expect(annex).toContain('<h2>Equations</h2>');
  expect(annex).toMatch(/<math|class="katex/);
  expect(annex).toContain(csvs[0]);
  expect(errors).toEqual([]);
});

const NYC='example-2025-nyc-ozone';
const ZENODO='https://zenodo.org/api/records/22757330/files/NYC_Pediatric_Asthma_Ozone_JHM_Reproducibility_v1.0.zip/content';
test('rows fetched from elsewhere are named, never written to the zip',async({page})=>{
  const local=process.env.NYC_PKG;
  test.skip(!existsSync(new URL(`../../${NYC}/manual.json`,import.meta.url))||!local||!existsSync(local),
    'Set NYC_PKG to a local copy of the Zenodo package, with example-2025-nyc-ozone beside this repository.');
  test.setTimeout(400000);
  await page.route(ZENODO,route=>route.fulfill({status:200,body:readFileSync(local),headers:{'access-control-allow-origin':'*'}}));
  await page.route(/planetarycomputer\.microsoft\.com|sentinel5euwest/,route=>route.abort());
  await openExample(page,NYC,'urn:fieldwork:example:nyc-asthma-ozone-2016-2025');
  const value=await page.locator('#workflow-select option').filter({hasText:'What happened'}).getAttribute('value');
  await page.locator('#workflow-select').selectOption(value);
  await page.locator('[data-view="workflow"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#table-fetch-remote').click();
  await expect(page.locator('[data-table-remote]')).toContainText('downloaded',{timeout:120000});
  await runAll(page);
  const paper=await draftAs(page,'mmwr-report');
  await expect(paper.locator('.pub-kicker')).toHaveText('Report');
  await expect(paper).not.toContainText('MMWR style');
  await expect(paper.locator('.pub-attached')).toContainText('not attached. Its rows were fetched from zenodo.org');
  const {entries}=await download(page);
  expect(Object.keys(entries)).toEqual(['annex.html']);
  expect(strFromU8(entries['annex.html'])).toContain('not attached; fetched from zenodo.org');
});
