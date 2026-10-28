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

  // THE METHODS NOTE, on the example that is the demo. Asserted here and not only on the
  // synthetic fixture: the note is the deliverable, and "the code path is the same" is not a
  // verification of the workflow a reader will actually be shown.
  const note=inspector.locator('.machined-note');
  await expect(note).toContainText('water_supply was brought from');
  await expect(note).toContainText('Snow 1855 Table XII');
  await expect(note).toContainText('comparing keys with punctuation and case folded');
  await expect(note).toContainText('32 sub_district values appeared in both tables');
  await expect(note).toContainText('No row was excluded');

  // AND THE RECEIPT, on the example too. No decision is recorded here because nothing was
  // unmatched, but the comparison and the per-variable shares are what a reader reconciling a
  // figure works from, so they are asserted where the demo will be shown.
  await page.locator('[data-view="rules"]').click();
  const n3=page.locator('#n3-preview');
  await expect(n3).toContainText('a fw:TableRelate');
  await expect(n3).toContainText('fw:keyComparison "punctuation-folded"');
  await expect(n3).toContainText('fw:ofVariable "population_1851"');
  await expect(n3).toContainText('fw:ofVariable "deaths_seven_weeks"');
  await expect(n3).toContainText('fw:retainedFraction "1.000000"');
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

/** THE JOIN AS A DECISION, taken in a dialog, with the consequence in front of you.
 *
 *  The practitioner, 2026-10-28: *"I expect the views to show up in a Quick Look dialog modal
 *  where the user can make a decision about the type of join. The modal dialog should also show
 *  the preview of the joined tables depending on the type of join selected and a Finalize button
 *  after the selection. The choice should be reflected in the receipts."* And: *"the dialog itself
 *  should show the machined note, in addition to the visual aid, and the wide table view."*
 *
 *  Six rows offered, four matched, two dropped -- and the two variables do NOT fall in step
 *  (84.6% of cases against 66.7% of population), which is the case the shares exist to show.
 */
const buildTwoTables=async page=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('[data-view="workflow"]').click();
  // Three districts, two variables each: six rows offered.
  await importTable(page,'cases.csv',
    'district,cases,population\nAlpha,4,1000\nBravo,7,2000\nCharlie,2,1500\n');
  // Two of them supplied, and one district this table knows that the first does not. Both
  // directions of disagreement, which is the ordinary case with two sources: Charlie is only in
  // cases.csv and Delta only here.
  await importTable(page,'supply.csv',
    'district,supply,connections\nAlpha,North works,120\nBravo,South works,240\nDelta,West works,90\n',
    {alreadyLong:true});
  await page.locator('[data-add="relate_table"]').click();
  await page.locator('#relate-records').selectOption({index:1});
  await page.locator('#relate-related').selectOption({index:2});
  await page.locator('#relate-on').selectOption('district');
  await page.locator('#relate-bring').selectOption('supply');
  await page.locator('[data-add="table_output"]').click();
  const relateId=await page.locator('#table-table option')
    .filter({hasText:'Relate a column'}).first().getAttribute('value');
  await page.locator('#table-table').selectOption(relateId);
};
const selectRelate=page=>
  page.locator('.react-flow__node[data-id^="relate_table-"]').dispatchEvent('click');

test('a join with unmatched rows refuses to run until the practitioner decides',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await buildTwoTables(page);
  await page.locator('#run-button').click();
  // REFUSED, not defaulted. The two answers give different totals and the result cannot be read
  // for which one you got, so the application does not choose.
  await expect(page.locator('#workflow-state')).toContainText('Run failed',{timeout:60000});

  await selectRelate(page);
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('This join needs a decision before it can run');
  // The shape is on the node even though no run succeeded: the dialog has to be able to draw the
  // thing being decided, so the tables are resolved without a run.
  await expect(inspector).toContainText('2 districts in both');
  await expect(inspector).toContainText('1 only in cases.csv');
  await expect(inspector).toContainText('1 only in supply.csv');
  await expect(page.locator('#relate-open-join')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the dialog shows the shape, the effect on each variable, the note and the table',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await buildTwoTables(page);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run failed',{timeout:60000});
  await selectRelate(page);
  await page.locator('#relate-open-join').click();
  const dialog=page.locator('#relate-join');
  await expect(dialog).toBeVisible();

  // THE VISUAL AID: three segments, because one key is only on each side.
  expect(await dialog.locator('.overlap-bar .overlap-seg').count()).toBe(3);
  await expect(dialog.locator('.overlap-both')).toContainText('2');

  // THE EFFECT ON THE NUMERIC VARIABLES, and the exact multiplier that follows from the shares.
  const shares=dialog.locator('.relate-shares');
  await expect(shares).toContainText('cases');
  await expect(shares).toContainText('population');
  await expect(shares).toContainText('84.6%');
  await expect(shares).toContainText('66.7%');
  await expect(dialog).toContainText('1.2692');
  await expect(dialog).toContainText('do not drop in step');

  // THE MACHINED NOTE, which is Methods prose and names the key that did not match.
  const note=dialog.locator('.machined-note');
  await expect(note).toContainText('supply was brought from');
  await expect(note).toContainText('Charlie');
  await expect(note).toContainText('84.6% of cases');

  // THE WIDE TABLE VIEW of the join: the brought column beside the variables, not a long list.
  const preview=dialog.locator('.relate-preview');
  await expect(preview).toContainText('supply');
  await expect(preview).toContainText('North works');

  // CHOOSING THE OTHER JOIN redraws all three.
  await dialog.locator('input[value="keep"]').check();
  await expect(dialog).toContainText('Name for the category');
  await dialog.locator('#relate-join-label').fill('Supply not recorded');
  await dialog.locator('#relate-join-label').blur();
  await expect(dialog).toContainText('every row kept');
  await expect(dialog.locator('.relate-preview')).toContainText('Supply not recorded');
  await expect(dialog.locator('.machined-note'))
    .toContainText('retained and recorded as \u201cSupply not recorded\u201d');
  expect(errors).toEqual([]);
});

test('finalizing drops the rows, names them, and the choice reaches the receipt',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await buildTwoTables(page);
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run failed',{timeout:60000});
  await selectRelate(page);
  await page.locator('#relate-open-join').click();
  await page.locator('#relate-join-reason').fill('Charlie has no supply record');
  await page.locator('#relate-join-finalize').click();
  await expect(page.locator('#relate-join')).toBeHidden();

  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
  await selectRelate(page);
  const inspector=page.locator('#inspector-content');
  await expect(inspector).toContainText('Decided: drop the unmatched rows');
  await expect(inspector).toContainText('Charlie has no supply record');
  const summary=inspector.locator('.dedup-summary');
  await expect(summary).toContainText('Offered');
  await expect(summary).toContainText('6');
  await expect(summary).toContainText('4');
  await expect(inspector).toContainText('2 rows left the table');
  await expect(inspector).toContainText('4 of 6 rows');
  // THE METHODS NOTE the run machined, on the step, and the choice inside it.
  await expect(inspector.locator('.machined-note')).toContainText('were excluded');
  await expect(inspector.locator('.machined-note')).toContainText('Charlie has no supply record');

  // AND IN THE RECEIPT, machine readable, which is where a reader checking the numbers goes.
  //
  // `receiptText` prints a computation receipt's `input`, so a receipt carrying only `method` put
  // nothing in the evidence -- which is how this widget shipped 0.1.0 and 0.2.0. Asserted as the
  // triples rather than as prose for that reason.
  await page.locator('[data-view="rules"]').click();
  const n3=page.locator('#n3-preview');
  await expect(n3).toContainText('a fw:TableRelate');
  await expect(n3).toContainText('fw:keyComparison "punctuation-folded"');
  await expect(n3).toContainText('fw:unmatchedDecision "drop"');
  await expect(n3).toContainText('fw:unmatchedKey "Charlie"');
  await expect(n3).toContainText('fw:decisionReason "Charlie has no supply record"');
  // THE SHARES, which are what let a reader reconcile a figure they did not expect against the
  // join that produced it -- outside this application, later, from the receipt alone.
  await expect(n3).toContainText('fw:ofVariable "cases"');
  await expect(n3).toContainText('fw:retainedFraction');
  await expect(n3).toContainText('fw:noteSection "methods"');
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
