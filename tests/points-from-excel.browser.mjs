import {test,expect} from './fixtures.mjs';
import {zipSync,strToU8} from 'fflate';
import {collectPageErrors} from './page-errors.mjs';

/** POINT DATA READS AN EXCEL WORKBOOK (the practitioner, 2026-11-23: *"Point data import should also include Excel"*).
 *  It read CSV, GeoPackage, GeoJSON, GPX and KML, and a spreadsheet of sites with a longitude and a latitude — what a
 *  field team most often has — had to be saved as a CSV first. The sheet is read as a CSV is, and its longitude and
 *  latitude columns are proposed by name, as a CSV's are. */
test.use({serviceWorkers:'block'});
const sheetXml=rows=>`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>`
  +rows.map((row,r)=>`<row r="${r+1}">`+row.map((v,c)=>{const ref=`${String.fromCharCode(65+c)}${r+1}`;
    return typeof v==='number'?`<c r="${ref}"><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`;}).join('')+'</row>').join('')
  +'</sheetData></worksheet>';
const workbook=()=>Buffer.from(zipSync({
  '[Content_Types].xml':strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
  'xl/workbook.xml':strToU8('<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
    +'<sheet name="Sites" sheetId="1" r:id="rId1"/></sheets></workbook>'),
  'xl/_rels/workbook.xml.rels':strToU8('<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    +'<Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
  'xl/worksheets/sheet1.xml':strToU8(sheetXml([['name','Latitude','Longitude','cases'],
    ['Goroumbwa',3.02,29.57,4],['Kodja hill',3.11,29.44,2],['Nzoro',3.30,29.72,1]])),
}));

test('an Excel workbook of sites is read, its coordinate columns proposed by name',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#node-library [data-add="point_input"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#input-mode').selectOption('xlsx');
  await page.locator('#input-file').setInputFiles({name:'sites.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:workbook()});
  await expect(page.locator('#csv-mapping')).toBeVisible({timeout:30000});
  // PROPOSED BY NAME, as a CSV's are: the columns are picked out, not left on "Select column".
  const chosen=async id=>(await page.locator(`#${id} option:checked`).innerText()).trim();
  expect(await chosen('csv-longitude')).toBe('Longitude');
  expect(await chosen('csv-latitude')).toBe('Latitude');
  await page.locator('#csv-preview').click();
  await expect(page.locator('#input-summary')).toContainText('3 draft point records',{timeout:30000});
  await page.locator('#config-apply').click();
  await expect(page.locator('#input-dialog')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('#inspector-content')).toContainText('3 point');
  expect(errors).toEqual([]);
});
