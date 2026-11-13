import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';

/** THE DATA DICTIONARY, IMPORTED WITH ITS TABLE (experiment 211). The practitioner, 2026-11-13: *"The data dictionary as
 *  a first class asset should be importable and viewable with the table input that first imports the two."* And of
 *  Hagelloch's `class`, the same day: *"What is class really?"* Its source dictionary, the outbreaks package's, says
 *  *School class (factor: 0, preschool; 1, 1st class; 2, 2nd class)*: categories, proposed as having no order, until
 *  the practitioner says they have one. */
test.use({serviceWorkers:'block'});

const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8')).features.map(f=>f.properties);
const table='case_ID,gender,class,age\n'+cases.map(c=>[c.case_ID,c.gender??'',c.class??'',c.age??''].join(',')).join('\n')+'\n';
// Four of the variables as the outbreaks package documents measles_hagelloch_1861.
const dictionary='variable,description\n'
  +'case_ID,Case ID number\n'
  +'gender,"Gender of the individual (factor: f, m)"\n'
  +'class,"School class (factor: 0, preschool; 1, 1st class; 2, 2nd class )"\n'
  +'age,Age in years (fractions ignored)\n';

test('a dictionary imported with the table is kept, viewed, proposes each column\'s kind, and the profile follows what is accepted',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#configure-step').click();
  await page.locator('#table-file').setInputFiles({name:'hagelloch.csv',mimeType:'text/csv',buffer:Buffer.from(table)});
  await page.locator('#table-dictionary-file').setInputFiles({name:'hagelloch-dictionary.csv',mimeType:'text/csv',buffer:Buffer.from(dictionary)});
  await expect(page.locator('#table-dictionary-says')).toContainText('4 variables in hagelloch-dictionary.csv');
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('age');
  for(const key of ['case_ID','gender','class'])await page.locator(`#table-keys input[value="${key}"]`).check();
  await page.locator('#table-save').click();

  // KEPT, AND STILL THERE after a reload: the file travels by its digest, like the table's.
  await expect(page.locator('[data-table-dictionary]')).toHaveText('Data dictionary: hagelloch-dictionary.csv, 4 variables.');
  await page.reload();
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await expect(page.locator('[data-table-dictionary]')).toHaveText('Data dictionary: hagelloch-dictionary.csv, 4 variables.');
  await expect(page.locator('[data-table-meaning]')).toContainText('4 proposed and not yet accepted');

  // VIEWED AS PUBLISHED.
  await page.locator('#view-dictionary').click();
  const viewer=page.locator('#table-viewer');
  await expect(viewer).toContainText('School class (factor: 0, preschool; 1, 1st class; 2, 2nd class )');
  await viewer.locator('#table-viewer-close').click();

  // PROPOSED: a factor is categories in no order, with its codes. Ordered is the practitioner's to say.
  await page.locator('#describe-columns').click();
  const dialog=page.locator('#columns-dialog');
  await expect(dialog.locator('[data-column="class"] legend')).toContainText('Proposed by hagelloch-dictionary.csv');
  await expect(dialog.locator('#column-scale-class')).toHaveValue('nominal');
  await expect(dialog.locator('#column-codes-class')).toHaveValue('0 = preschool; 1 = 1st class; 2 = 2nd class');
  await expect(dialog.locator('#column-codes-gender')).toHaveValue('f; m');
  await expect(dialog.locator('#column-scale-age')).toHaveValue('');
  await dialog.locator('#column-scale-class').selectOption('ordinal');
  await dialog.locator('#column-scale-age').selectOption('ratio');
  await dialog.locator('#columns-accept-all').click();
  await page.screenshot({path:'test-results/data-dictionary-columns.png'});
  await dialog.locator('#columns-save').click();
  await expect(dialog).toHaveCount(0);

  // THE PROFILE FOLLOWS IT: class counted in its order, with what each code means, and no median of a code.
  await page.locator('#table-quality').click();
  const quality=page.locator('#data-quality');
  await quality.getByRole('tab',{name:'Columns'}).click();
  const classSection=quality.locator('section.quality-column').filter({has:page.locator('h3',{hasText:/^class$/})});
  await expect(classSection).toContainText('Categories in an order');
  await expect(classSection).toContainText(/In order\s*0 preschool/);
  await expect(classSection).not.toContainText('median');
  const ageSection=quality.locator('section.quality-column').filter({has:page.locator('h3',{hasText:/^age$/})});
  await expect(ageSection).toContainText('Amounts counted from zero');
  await expect(ageSection).toContainText('median');
  await page.screenshot({path:'test-results/data-dictionary-quality.png'});
});
