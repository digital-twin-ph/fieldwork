import {test,expect} from './fixtures.mjs';
import {zipSync,strToU8} from 'fflate';
import {collectPageErrors} from './page-errors.mjs';

/** AN EXCEL WORKBOOK, READ BY TABULAR DATA. The practitioner, 2026-11-08: *"Yes add Excel."* A workbook of two sheets,
 *  made here: the first is notes about the data, the second the table. The sheet is chosen, the table set up as a CSV
 *  is, and the step says which sheet it read. Cells are read as written: a number stays a number, text stays text. */
test.use({serviceWorkers:'block'});
const sheetXml=rows=>`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`
  +rows.map((row,r)=>`<row r="${r+1}">`+row.map((v,c)=>{const ref=`${String.fromCharCode(65+c)}${r+1}`;
    return typeof v==='number'?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`;}).join('')+'</row>').join('')
  +'</sheetData></worksheet>';
const workbook=()=>Buffer.from(zipSync({
  '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
  'xl/workbook.xml':strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    +'<sheet name="About" sheetId="1" r:id="rId1"/><sheet name="Cases" sheetId="2" r:id="rId2"/></sheets></workbook>'),
  'xl/_rels/workbook.xml.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>'),
  'xl/worksheets/sheet1.xml':strToU8(sheetXml([['note'],['Made up for this test']])),
  'xl/worksheets/sheet2.xml':strToU8(sheetXml([['district','cases','deaths'],['Northgate',61,2],['Eastmarsh',12,0],['Harbour',3,'']])),
}));

test('a workbook sheet is chosen, read as a table, and named on the step',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#open-table').click();
  await expect(page.locator('label[for="table-file"]')).toContainText('CSV, Excel or Stata file');
  await page.locator('#table-file').setInputFiles({name:'districts.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
  // TWO SHEETS, so the choice is offered; the first is read until another is chosen.
  await expect(page.locator('#table-sheet-row')).toBeVisible();
  // The first sheet, a note of one column, is no table: said, and the other sheet can be chosen.
  await expect(page.locator('#table-sheet')).toHaveValue('About');
  await expect(page.locator('#table-error')).toBeVisible();
  await page.locator('#table-sheet').selectOption('Cases');
  await expect(page.locator('#table-workbook')).toContainText('Excel workbook, sheet "Cases": 3 rows of 3 columns');
  await expect(page.locator('#table-keys')).toContainText('district');
  // Read wide: one row per district, cases and deaths.
  await page.locator('#table-keys input[value="district"]').check();
  for(const c of ['cases','deaths'])await page.locator(`#table-keys input[value="${c}"]`).uncheck();
  await expect(page.locator('#table-after')).toContainText('Northgate');
  await page.locator('#table-save').click();
  await expect(page.locator('#table-dialog')).toBeHidden();
  await expect(page.locator('.inspector .standard-sentence')).toContainText('Reads districts.xlsx, sheet Cases, wide: one row per district, 2 variables');
  // Harbour's empty deaths cell is kept as unknown, never zero.
  await expect(page.locator('.inspector [data-standard-section="result"]')).toContainText('6 rows, 1 values absent');
  const source=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').params.source);
  expect(source.sheet).toBe('Cases');
  expect(errors).toEqual([]);
});
