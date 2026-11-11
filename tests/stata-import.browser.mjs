import {test,expect} from './fixtures.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {storedTable} from './stored-table.mjs';

// A STATA FILE IMPORTED THROUGH THE TABLE DIALOG, as a CSV is. Experiment 169. The file is written here.
test.use({serviceWorkers:'block'});
const pad=(t,w)=>{const b=Buffer.alloc(w);b.write(t,'latin1');return b;};
function stata115(){
  const vars=[['date',254,'%td'],['ozone',254,'%9.0g'],['numdeaths',252,'%9.0g']];
  const head=Buffer.alloc(109);head[0]=115;head[1]=2;head[2]=1;head.writeUInt16LE(3,4);head.writeUInt32LE(2,6);
  const row=(d,o,n)=>{const b=Buffer.alloc(10);b.writeFloatLE(d,0);b.writeFloatLE(o,4);b.writeInt16LE(n,8);return b;};
  return Buffer.concat([head,Buffer.from(vars.map(v=>v[1])),...vars.map(v=>pad(v[0],33)),Buffer.alloc(8),
    ...vars.map(v=>pad(v[2],49)),...vars.map(()=>pad('',33)),Buffer.alloc(5),row(15341,4.5,199),row(15342,1.7015e38*1.0001,231)]);
}

test('a Stata file becomes a table: dates read as dates, and a missing value is empty',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#open-table').click();
  await page.locator('#table-file').setInputFiles({name:'london.dta',mimeType:'application/octet-stream',buffer:stata115()});
  await expect(page.locator('#table-keys')).toBeVisible();
  await page.locator('#table-shape').selectOption('long');
  await page.locator('#table-value').selectOption('numdeaths');
  for(const name of ['date','ozone'])await page.locator(`#table-keys input[value="${name}"]`).setChecked(name==='date');
  await page.locator('#table-save').click();
  const stored=async()=>(await storedTable(page)).data;
  await expect.poll(async()=>(await stored()).rows.map(r=>[r.key.date,r.value])).toEqual([['2002-01-01',199],['2002-01-02',231]]);
  expect(errors).toEqual([]);
});
