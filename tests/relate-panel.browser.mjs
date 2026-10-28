/** WHAT THE JOIN DID, shown on the step that did it.
 *
 *  `relateTable` computed four things from its first commit -- rows related, rows dropped, the
 *  keys that did not match, the values that landed -- and displayed none of them. They went into
 *  the N3 receipt, about which this project had already settled: *"the N3 receipts is the same
 *  thing, we are the only ones that would care to look at it."* So the step's whole report was a
 *  table that looked finished.
 *
 *  IT CANNOT BE READ OFF THE DATA, which is what makes this different from every other panel
 *  here. A pandas left join keeps the unmatched row and writes NaN, so the gap is in the frame;
 *  this application drops the row, which is the right default for a stratification and leaves the
 *  result internally consistent at any size. 62 of 64 rows and 64 of 64 produce tables that are
 *  indistinguishable by inspection.
 *
 *  And the practitioner, 2026-10-27, on the other half: *"pandas also gives you the original keys
 *  so you know which half of the row came from which table."* So the Quick Look says, per column,
 *  which table it came from.
 */
import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

const openContingency=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText('imported with 6 workflows',{timeout:30000});
  await page.locator('[data-view="workflow"]').click();
  const option=page.locator('#workflow-select option',{hasText:'Died or survived, by water supply'});
  await page.locator('#workflow-select').selectOption(await option.getAttribute('value'));
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
};

test('the relate step reports the join before the table it produced',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await openContingency(page);
  await page.locator('.react-flow__node[data-id="supply"]').click();
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('This run');

  // Snow's Table VIII offers 32 sub-districts at two measures each, and Table XII names a
  // company for every one of them. So the denominator is 64 and nothing left.
  const summary=inspector.locator('.dedup-summary');
  await expect(summary).toContainText('Offered');
  await expect(summary).toContainText('64');
  await expect(summary).toContainText('Related');
  await expect(summary).toContainText('Dropped');
  await expect(summary).toContainText('0');
  // Said as a sentence as well as a row, because "0 dropped" is the claim a reader needs and a
  // zero in a table is easy to pass over.
  await expect(inspector).toContainText('No row was dropped');

  // WHICH COLUMN CAME FROM WHICH TABLE, by the labels on this canvas rather than by port name.
  await expect(inspector).toContainText('sub_district, measure');
  await expect(inspector).toContainText('Table XII');
  await expect(inspector).toContainText('water_supply');
  // The categories that actually landed: what a reader checks before grouping by them.
  await expect(inspector).toContainText('Lambeth Company only');
  expect(errors).toEqual([]);
});

/** Two tables built in the interface, the second missing one of the first's keys.
 *
 *  Through the UI rather than through localStorage: a table's rows live in the payload store by
 *  digest, so editing `params.data` in a saved workflow changes nothing the run reads. The first
 *  attempt at this test did exactly that and passed its setup while asserting against the
 *  unmodified example -- the same silent-setup trap `version-supersession.browser.mjs` documents.
 */
const importTable=async (page,name,csv,{alreadyLong=false}={})=>{
  await page.locator('[data-add="table_input"]').click();
  await page.locator('#open-table').click();
  await expect(page.locator('#table-dialog')).toBeVisible();
  await page.locator('#table-file').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(csv)});
  await expect(page.locator('#table-keys')).toBeVisible();
  // Wide is the default, and the import says so when a file has only one column left to be a
  // variable -- which is the assignment table here. Stated by the fixture rather than detected
  // by the test, so a change in that detection fails this test instead of being absorbed by it.
  if(alreadyLong){
    await expect(page.locator('#table-shape-says')).toContainText('already in LONG format');
    await page.locator('#table-shape-accept').click();
  }else{
    await expect(page.locator('#table-shape-alert')).toBeHidden();
  }
  await expect(page.locator('#table-save')).toBeEnabled();
  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toBeHidden();
};

test('a dropped row is named by its key, not only counted',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();

  // Three districts, two measures each: six rows offered.
  await importTable(page,'cases.csv',
    'district,cases,population\nAlpha,4,1000\nBravo,7,2000\nCharlie,2,1500\n');
  // Two of them supplied. Charlie is in the first table and not in this one, which is the whole
  // case: the result will be internally consistent at four rows and will not mention the other two.
  await importTable(page,'supply.csv',
    'district,supply,connections\nAlpha,North works,120\nBravo,South works,240\n',
    {alreadyLong:true});

  await page.locator('[data-add="relate_table"]').click();
  // By position, because `table_input` has no node-label control: both of these nodes are
  // labelled "Tabular data" and the port select offers them in canvas order. That the panel can
  // still tell them apart -- by filename, which is the only name they have been given -- is the
  // thing asserted below.
  await page.locator('#relate-records').selectOption({index:1});
  await page.locator('#relate-related').selectOption({index:2});
  await page.locator('#relate-on').selectOption('district');
  await page.locator('#relate-bring').selectOption('supply');

  // A workflow with nothing to show is not ready to run, so the relate gets a reader.
  await page.locator('[data-add="table_output"]').click();
  const relateId=await page.locator('#table-table option')
    .filter({hasText:'Relate a column'}).first().getAttribute('value');
  await page.locator('#table-table').selectOption(relateId);

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});

  // Back to the step that did the join: the panel belongs on it, not on whichever tab is open.
  // Forced, because nodes added from the palette land stacked on a blank canvas and the output
  // node sits over this one. Selecting the node is the point; where it was dropped is not.
  await page.locator('.react-flow__node[data-id^="relate_table-"]').dispatchEvent('click');
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('This run');
  // THE FOUR NUMBERS, against the denominator that makes them mean something.
  const summary=inspector.locator('.dedup-summary');
  await expect(summary).toContainText('Offered');
  await expect(summary).toContainText('6');
  await expect(summary).toContainText('Related');
  await expect(summary).toContainText('4');
  await expect(summary).toContainText('Dropped');
  // The key BY NAME, which is the thing a practitioner can act on. "Two rows dropped" is a
  // number; "Charlie" is a table to go and look at.
  await expect(inspector).toContainText('2 rows left the table');
  await expect(inspector).toContainText('Charlie');
  await expect(inspector).toContainText('4 of 6 rows');
  await expect(inspector).not.toContainText('No row was dropped');
  // And which half of the row came from where, by filename rather than by "Tabular data" twice.
  await expect(inspector).toContainText('From cases.csv: district, measure');
  await expect(inspector).toContainText('Brought from supply.csv');
  await expect(inspector).toContainText('North works');
  expect(errors).toEqual([]);
});

test('the Quick Look says which table each column came from',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await openContingency(page);
  await page.locator('.react-flow__node[data-id="supply"]').click();
  await page.locator('#output-quick-look').click();
  const viewer=page.locator('#table-viewer');
  await expect(viewer).toBeVisible();

  // One note per column, every column accounted for, and the brought one distinguished by how it
  // got there rather than by a suffix on its name.
  const origins=viewer.locator('thead th .column-origin');
  expect(await origins.count()).toBe(await viewer.locator('thead th').count()-1);
  await expect(viewer.locator('thead th',{hasText:'water_supply'}).locator('.column-origin'))
    .toContainText('brought from');
  await expect(viewer.locator('thead th',{hasText:'water_supply'}).locator('.column-origin'))
    .toContainText('matched on sub_district');
  await expect(viewer.locator('thead th',{hasText:'sub_district'}).first().locator('.column-origin'))
    .toContainText('Table VIII');
  await expect(viewer).toContainText('64 of 64 offered rows related');

  await page.keyboard.press('Escape');
  await expect(viewer).toBeHidden();
  expect(errors).toEqual([]);
});
