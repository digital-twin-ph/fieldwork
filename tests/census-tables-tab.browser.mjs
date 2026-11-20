import {test,expect} from './fixtures.mjs';
import {storedTable} from './stored-table.mjs';
import {collectPageErrors} from './page-errors.mjs';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

/** CENSUS TABLES, A TAB OF TABULAR DATA (2026-11-20). Each country's counts and data dictionary are fetched at the commit
 *  Fieldwork pins, and checked against the digests pinned with it. The files are answered here from the census-tables
 *  checkout beside this repository, at that commit, so the test reads the bytes the pin names without the network. */
test.use({serviceWorkers:'block'});
const catalogue=JSON.parse(readFileSync(new URL('../examples/census-tables/catalogue.json',import.meta.url),'utf8'));
const REPO=new URL('../../census-tables/',import.meta.url);
const skip=existsSync(REPO)?false:'census-tables is not checked out beside this repository.';
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

test('a census table is read with its data dictionary, checked against the pin, and reopens on its tab',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  await answer(page);
  await open(page);
  await page.locator('#table-tab-census').click();
  await expect(page.locator('#table-tab-census')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#table-census-part')).toContainText('Terms: none stated');
  await page.locator('[data-census="COD"]').click();
  await expect(page.locator('#table-keys')).toBeVisible({timeout:60000});
  await expect(page.locator('#table-census-says')).toContainText('its data dictionary, COD/provinces-2015-columns.csv, has 7 variables');
  // THE UNIT FROM THE DICTIONARY (2026-11-20), not typed: men, women and total are all "persons".
  await expect(page.locator('#table-unit')).toHaveValue('persons');
  await expect(page.locator('#table-unit-from')).toContainText('From the data dictionary');
  await page.locator('#table-save').click();
  await expect(page.locator('#table-save')).toBeHidden();
  const cod=catalogue.countries.find(c=>c.iso3==='COD');
  await expect.poll(async()=>(await storedTable(page)).remote?.sha256).toBe(cod.counts.sha256);
  const params=await storedTable(page);
  expect(params.unit).toBe('persons');
  expect(params.remote.url).toBe(catalogue.raw+cod.counts.path);
  expect(params.dictionaryRef).toBeTruthy();
  await expect(page.locator('[data-table-dictionary]').first()).toContainText('Data dictionary: COD/provinces-2015-columns.csv, 7 variables.');
  // REOPENED, the step opens on the tab its table came through.
  await page.locator('#configure-step').click();
  await expect(page.locator('#table-tab-census')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#table-census-part')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a census table whose bytes differ from the pin is refused, and nothing is kept',async({page})=>{test.skip(!!skip,skip);
  await answer(page,(bytes,path)=>path.endsWith('counts.csv')?Buffer.concat([bytes,Buffer.from('region,X,Y,1,1,2,T-02,1,added\n')]):bytes);
  await open(page);
  await page.locator('#table-tab-census').click();
  await page.locator('[data-census="RWA"]').click();
  await expect(page.locator('#table-error')).toContainText('is not the file Fieldwork pinned');
  await expect(page.locator('#table-save')).toBeDisabled();
});

test('the tabs answer the arrow keys, and the tab last used is remembered on this device',async({page})=>{test.skip(!!skip,skip);
  await open(page);
  await expect(page.locator('#table-tab-file')).toHaveAttribute('aria-selected','true');
  await page.locator('#table-tab-file').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#table-tab-remote')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#table-url')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#table-tab-census')).toBeFocused();
  await page.locator('#table-cancel').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#configure-step').click();
  await expect(page.locator('#table-tab-census')).toHaveAttribute('aria-selected','true');
});

/** THE TABLE IN TODAY'S UNITS (2026-11-20): DR Congo's 1984 regions match no map today, so the tab offers its counts
 *  summed to the 26 provinces, says so, and links to the counts as printed, which stay in census-tables as the source. */
test('where the printed units are not today\'s, the tab offers the table summed to them and links to the printed one',async({page})=>{test.skip(!!skip,skip);
  await open(page);
  await page.locator('#table-tab-census').click();
  const cod=catalogue.countries.find(c=>c.iso3==='COD');
  expect(cod.counts.path).toBe('COD/provinces-2015.csv');
  const item=page.locator('.census-choices li').filter({has:page.locator('[data-census="COD"]')});
  await expect(item).toContainText("Summed to today's 26 provinces (2015), from the counts as printed");
  await expect(item.getByRole('link',{name:'the counts as printed'})).toHaveAttribute('href',`${catalogue.repository}/blob/${catalogue.commit}/COD/counts.csv`);
  await expect(page.locator('[data-census]')).toHaveCount(catalogue.countries.length);
});

/** A STEP'S CHOICES BELONG TO ITS OWN TABLE (2026-11-20): a DR Congo step reopened and given another table kept the
 *  first table's key columns by name, so "total" was a key and could not be taken as a value. Another table now starts
 *  from the defaults, and a refused read shows no table beside the refusal. */
test('a reopened step given another census table starts from that table\'s defaults',async({page})=>{test.skip(!!skip,skip);
  const errors=collectPageErrors(page);
  await answer(page);
  await open(page);
  await page.locator('#table-tab-census').click();
  await page.locator('[data-census="RWA"]').click();
  await expect(page.locator('#table-keys')).toBeVisible({timeout:60000});
  // Saved with "total" as a key, as the DR Congo step had it.
  await page.locator('#table-keys input[value="total"]').check();
  await expect(page.locator('#table-values input[value="total"]')).toBeDisabled();
  // A refused read shows no table beside the refusal.
  for(const box of await page.locator('#table-values input[type=checkbox]:enabled').all())await box.uncheck();
  await expect(page.locator('#table-error')).toContainText('Choose at least one column holding a value');
  await expect(page.locator('#table-after')).toContainText('Nothing to import while the message below stands');
  await page.locator('#table-values input[value="men"]').check();
  await page.locator('#table-save').click();
  await expect(page.locator('#table-save')).toBeHidden();
  // Reopened and given DR Congo's table: its own defaults, "total" a value.
  await page.locator('#configure-step').click();
  await page.locator('#table-tab-census').click();
  await page.locator('[data-census="COD"]').click();
  await expect(page.locator('#table-values input[value="total"]')).toBeEnabled({timeout:60000});
  await expect(page.locator('#table-values input[value="total"]')).toBeChecked();
  await expect(page.locator('#table-keys input[value="total"]')).not.toBeChecked();
  expect(errors).toEqual([]);
});
