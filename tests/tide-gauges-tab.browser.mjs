import {test,expect} from './fixtures.mjs';
import {storedTable} from './stored-table.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

/** TIDE GAUGES, A TAB OF TABULAR DATA (2026-11-20): an overview map of every pinned gauge, drawn with no network; a
 *  country's index of its gauges read with the shared data dictionary, checked against the digests pinned with them, and
 *  the step reopening on its tab. The files are answered from the coastal-sea-level checkout beside this repository, at
 *  the commit Fieldwork pins. */
test.use({serviceWorkers:'block'});
const catalogue=JSON.parse(readFileSync(new URL('../examples/coastal-sea-level/catalogue.json',import.meta.url),'utf8'));
const REPO=new URL('../../coastal-sea-level/',import.meta.url);
const skip=existsSync(REPO)?false:'coastal-sea-level is not checked out beside this repository.';
const atPin=path=>execFileSync('git',['-C',REPO.pathname,'show',`${catalogue.commit}:${path}`]);
const answer=(page,change=b=>b)=>page.route(url=>url.href.startsWith(catalogue.raw),route=>{
  const path=route.request().url().slice(catalogue.raw.length);
  route.fulfill({status:200,body:change(atPin(path),path),headers:{'access-control-allow-origin':'*','content-type':'text/plain'}});
});
const open=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#configure-step').click();
};

test('the tab maps every pinned gauge, reads a country’s index with its dictionary, and reopens on its tab',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  await answer(page);
  await open(page);
  await page.locator('#table-tab-gauges').click();
  const total=catalogue.countries.reduce((n,c)=>n+c.gauges.length,0),trend=catalogue.countries.reduce((n,c)=>n+c.gauges.filter(g=>g[3]).length,0);
  await expect(page.locator('#table-gauges-part .gauges-map circle')).toHaveCount(total);
  await expect(page.locator('#table-gauges-part .gauges-map circle.gauge-dot-trend')).toHaveCount(trend);
  await expect(page.locator('#table-gauges-part')).toContainText('not their records');
  const phl=catalogue.countries.find(c=>c.iso3==='PHL');
  await page.locator('[data-gauges="PHL"]').click();
  // 22 columns: the column lists are summarised in the dialog (more than twenty), so the read is known by its status.
  await expect(page.locator('#table-status')).toContainText(`${phl.stations} subjects`,{timeout:60000});
  await expect(page.locator('#table-gauges-says')).toContainText(`its data dictionary, ${catalogue.columns.path}, has 22 variables`);
  await page.locator('#table-save').click();
  await expect(page.locator('#table-save')).toBeHidden();
  await expect.poll(async()=>(await storedTable(page)).remote?.sha256).toBe(phl.table.sha256);
  const params=await storedTable(page);
  expect(params.remote.url).toBe(catalogue.raw+phl.table.path);
  expect(new Set(params.data.rows.map(r=>r.key.psmsl_id)).size).toBe(phl.stations);
  await page.locator('#configure-step').click();
  await expect(page.locator('#table-tab-gauges')).toHaveAttribute('aria-selected','true');
  expect(errors).toEqual([]);
});

test('a gauges table whose bytes differ from the pin is refused, and nothing is kept',async({page})=>{test.skip(!!skip,skip);
  const path=catalogue.countries.find(c=>c.iso3==='NGA').table.path;
  await answer(page,(bytes,p)=>p===path?Buffer.concat([bytes,Buffer.from('9999,ADDED,rlr,0,0,2000,2001,2,100,,,,,,,,,,,,,\n')]):bytes);
  await open(page);
  await page.locator('#table-tab-gauges').click();
  await page.locator('[data-gauges="NGA"]').click();
  await expect(page.locator('#table-error')).toContainText('is not the file Fieldwork pinned');
  await expect(page.locator('#table-save')).toBeDisabled();
});
