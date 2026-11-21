import {test,expect} from './fixtures.mjs';
import {keepColumns,columnsOffered} from './keep-columns.mjs';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

/** SYNDROMIC SURVEILLANCE FROM AN EMPTY CANVAS (the practitioner, 2026-11-21: "let's do CUSUM, EWMA and syndromic
 *  surveillance"). Made-up emergency department visits: chief complaints sorted into syndromes by declared words, counted
 *  by day and syndrome, and each day held to a threshold from its own past. The numbers asserted are counted from the
 *  example's own files; SYNDROMIC_EXPORT names a file to keep the project in, as the worked example ships it. */
test.use({serviceWorkers:'block'});
const file=name=>fileURLToPath(new URL(`../../example-2026-syndromic-surveillance/data/${name}`,import.meta.url));
const skip=existsSync(file('visits.csv'))?false:'example-2026-syndromic-surveillance is not checked out beside this repository.';

const add=async(page,type)=>{await page.locator('[data-view="workflow"]').click();await page.locator(`#node-library [data-add="${type}"]`).click();};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));
const idOf=async(page,type)=>(await saved(page)).nodes.filter(n=>n.type===type).at(-1).id;
const tidy=async page=>{await page.locator('#tidy-button').click();await page.waitForTimeout(250);};
const wire=async(page,from,to,port)=>{
  await expect(page.locator(`.react-flow__node[data-id="${to}"] [data-handleid]`).first()).toBeAttached();
  const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
  const declared=await page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${port}"]`).count();
  const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${declared?port:'layer'}"]`);
  const a=await source.boundingBox(),b=await target.boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to&&e.port===port),{message:`${from} -> ${to}`}).toBe(true);
};
const open=async(page,id)=>{await page.locator('[data-view="workflow"]').click();await page.locator(`.react-flow__node[data-id="${id}"]`).click();};
const label=async(page,id,text)=>{await open(page,id);const box=page.locator('[data-standard-section="name"] input').first();await box.fill(text);await box.press('Enter');};
const named=async(page,name)=>{await page.locator('[data-view="project"]').click();await page.locator('#workflow-name-edit').fill(name);
  await page.locator('#workflow-name-edit').press('Enter');await page.locator('[data-view="workflow"]').click();};
/** A box that lists the columns once they are known, and takes them typed until then. */
const choose=async(page,selector,value)=>{const el=page.locator(selector);
  if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else{await el.fill(value);await el.press('Tab');}};
const run=async page=>{await page.locator('#run-button').click();await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:180_000});};
const show=async(page,from,text)=>{await add(page,'table_output');const shown=await idOf(page,'table_output');
  await tidy(page);await wire(page,from,shown,'table');await open(page,shown);
  await page.locator('#table-label').fill(text);await page.locator('#table-label').press('Tab');return shown;};

/** The visits, read long: each column a key, age in years the value. */
const visits=async page=>{
  await add(page,'table_input');const node=await idOf(page,'table_input');await open(page,node);
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles(file('visits.csv'));
  await columnsOffered(page);
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('age_years');
  await keepColumns(page,'table-keys',['visit_id','date','facility','age_group','sex','chief_complaint']);
  await page.locator('#table-save').click();await expect(page.locator('#table-dialog')).toBeHidden();
  await label(page,node,'Emergency department visits, January to June 2026');
  return node;
};
/** Syndromes from the chief complaints: the worked definitions, uploaded into the rule editor as JSON. */
const syndromes=async(page,table)=>{
  await add(page,'apply_ruleset');const rules=await idOf(page,'apply_ruleset');await open(page,rules);
  await page.locator('#configure-step').click();
  await page.locator('#ruleset-config #ruleset-choice').selectOption('authored');
  await page.locator('#ruleset-config #config-apply').click();
  await page.locator('#rule-editor #ruleset-records').selectOption('table');
  await page.locator('#rule-editor #config-apply').click();await expect(page.locator('#rule-editor')).toBeHidden();
  await tidy(page);await wire(page,table,rules,'subjects');
  await open(page,rules);await page.locator('#configure-step').click();
  const editor=page.locator('#rule-editor');
  await editor.locator('[data-rule-view="json"]').click();
  await editor.locator('#rule-json-upload').setInputFiles(file('syndromes.ruleset.json'));
  await expect(editor.locator('.json-ok')).toBeVisible();
  await editor.locator('#config-apply').click();await expect(editor).toBeHidden();
  await label(page,rules,'Syndrome from the chief complaint');
  return rules;
};

test('syndromic surveillance: syndromes from complaints, counted by day, each day held to its own past',async({page})=>{
  test.skip(!!skip,skip||'');
  test.setTimeout(900_000);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Syndromic surveillance, 2026');
  await page.locator('#project-subject-input').fill('Made-up emergency department visits: syndromes from chief complaints, and unusual days');
  await page.locator('#project-create').click();

  // 1. WHICH SYNDROME DOES EACH COMPLAINT SAY?
  await named(page,'Which syndrome does each complaint say?');
  {
    const table=await visits(page),rules=await syndromes(page,table);
    await show(page,rules,'Each visit and its syndrome');
    await run(page);
    await open(page,rules);
    await expect(page.locator('#inspector-content')).toContainText('24,328');
  }

  // 2. WAS THERE AN UNUSUAL RISE IN ANY SYNDROME? Counted by day and syndrome, then CUSUM over the first four weeks.
  await page.locator('#add-workflow').click();
  await named(page,'Was there an unusual rise in any syndrome?');
  {
    const table=await visits(page),rules=await syndromes(page,table);
    await add(page,'case_series');const series=await idOf(page,'case_series');await open(page,series);
    await page.locator('#configure-step').click();
    await page.locator('#series-input').selectOption('table-case');
    await page.locator('#config-apply').click();
    await tidy(page);await wire(page,rules,series,'cases');
    await open(page,series);await page.locator('#configure-step').click();
    await choose(page,'#series-date','date');
    await page.locator('#series-kind').selectOption('other');
    await page.locator('#series-period').selectOption('day');
    await choose(page,'#series-case','visit_id');
    await choose(page,'#series-split','syndrome');
    await page.locator('#config-apply').click();
    await label(page,series,'Visits by day and syndrome');
    await show(page,series,'Visits by day and syndrome');
    await run(page);
    await add(page,'detect_unusual_counts');const detect=await idOf(page,'detect_unusual_counts');
    await tidy(page);await wire(page,series,detect,'records');
    await open(page,detect);await page.locator('#configure-step').click();
    const dialog=page.locator('#detect-config');
    await dialog.locator('#detect-time').selectOption('period');
    await dialog.locator('#detect-group').selectOption('syndrome');
    await dialog.locator('#detect-method').selectOption('cusum');
    await dialog.locator('#detect-baseline-periods').fill('28');await dialog.locator('#detect-baseline-periods').press('Tab');
    await dialog.locator('#detect-reset').check();
    // GASTROINTESTINAL SIGNALS ON THE OUTBREAK'S SECOND DAY, and only inside it, as the README says.
    await expect(dialog.locator('[data-detect-sentence]')).toContainText('gastrointestinal: 7 of 147 periods signal (2026-04-14, 2026-04-15');
    await dialog.locator('#config-apply').click();
    await label(page,detect,'Unusual days, CUSUM over the first four weeks');
    await show(page,detect,'Each day, each syndrome: observed, expected, threshold and signal');
    await run(page);
  }

  await page.locator('#storage-status').click();
  const block=page.locator('.project-view-block').filter({hasText:'Syndromic surveillance, 2026'}).first();
  await expect(block).toContainText('2 workflows');
  if(process.env.SYNDROMIC_EXPORT){
    const download=page.waitForEvent('download');
    await block.locator('button[data-export-project]').click();
    await (await download).saveAs(process.env.SYNDROMIC_EXPORT);
  }
});
