import {test,expect} from './fixtures.mjs';
import {storedTable} from './stored-table.mjs';
import {collectPageErrors} from './page-errors.mjs';

/** THE DHIS2 TAB (2026-11-20): connect with a token from Credentials, find a data element, read its analytics by district
 *  as a table, and keep where it came from. The server is answered here, at a .test address, with replies shaped as
 *  the Docker server's (DHIS2 2.41.11, Sierra Leone's demonstration database) gave them; the token is made up, and the
 *  test checks it is sent as ApiToken and kept nowhere. */
test.use({serviceWorkers:'block'});
const ORIGIN='https://dhis2.example.test',TOKEN='d2pat_test_not_real';
const DISTRICTS=[['O6uvpzGd5pu','Bo',4303],['fdc6uOvgoji','Bombali',2642],['jUb8gELQApl','Kailahun',3018]];
async function server(page){
  const sent=[];
  await page.route(url=>url.href.startsWith(ORIGIN),route=>{
    const req=route.request(),url=new URL(req.url());sent.push(req.headers().authorization);
    const json=body=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,accept'}});
    if(url.pathname==='/api/system/info')return json({version:'2.41.11'});
    if(url.pathname==='/api/organisationUnitLevels')return json({organisationUnitLevels:[{level:1,displayName:'National'},{level:2,displayName:'District'},{level:3,displayName:'Chiefdom'}]});
    if(url.pathname==='/api/dataElements')return json({dataElements:[{id:'YtbsuPPo010',displayName:'Measles doses given'}]});
    if(url.pathname==='/api/indicators')return json({indicators:[]});
    if(url.pathname==='/api/analytics')return json({headers:[{name:'dx'},{name:'pe'},{name:'ou'},{name:'value'}],
      rows:DISTRICTS.map(([id,,v])=>['YtbsuPPo010','2025',id,String(v)]),
      metaData:{items:{YtbsuPPo010:{name:'Measles doses given'},2025:{name:'2025'},...Object.fromEntries(DISTRICTS.map(([id,name])=>[id,{name}]))}}});
    return route.fulfill({status:404,body:'{}'});
  });
  return sent;
}
async function addToken(page){
  await page.locator('#credentials-button').click();
  if(await page.locator('#credential-new').isVisible())await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('dhis2-test');await page.locator('#credential-provider').fill('dhis2');
  await page.locator('#credential-origin').fill(ORIGIN);await page.locator('#credential-secret').fill(TOKEN);
  await page.locator('#credential-add').click();await expect(page.locator('#credential-error')).toBeHidden();
  await page.locator('#credential-close').click();
}

test('a DHIS2 server’s analytics are read as a table, with a token from Credentials, and where they came from is kept',async({page})=>{
  const errors=collectPageErrors(page);
  const sent=await server(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.goto('/?example=blank');
  await addToken(page);
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#table-tab-dhis2').click();
  await page.locator('#dhis2-address').fill(ORIGIN);
  await expect(page.locator('#dhis2-token')).toContainText('dhis2-test');
  await page.locator('#dhis2-connect').click();
  await expect(page.locator('#dhis2-says')).toContainText('Connected: DHIS2 2.41.11 at dhis2.example.test, 3 levels');
  await expect(page.locator('#dhis2-level')).toHaveValue('2');
  await page.locator('#dhis2-search').fill('measles');await page.locator('#dhis2-find').click();
  await page.locator('#dhis2-items input[value="YtbsuPPo010"]').check();
  await page.locator('#dhis2-period').selectOption('LAST_YEAR');
  await page.locator('#dhis2-read').click();
  await expect(page.locator('#dhis2-says')).toContainText('3 rows read from dhis2.example.test');
  await expect(page.locator('#table-before')).toContainText('Kailahun');
  // Long, as DHIS2 gives it, its value in "value", and what its columns mean proposed from a dictionary.
  await expect(page.locator('#table-shape')).toHaveValue('long');
  await expect(page.locator('#table-value')).toHaveValue('value');
  for(const key of await page.locator('#table-keys input[type=checkbox]').all())await key.uncheck();
  for(const key of ['data','period','org_unit'])await page.locator(`#table-keys input[value="${key}"]`).check();
  await page.locator('#table-save').click();
  await expect(page.locator('#table-save')).toBeHidden();
  await expect.poll(async()=>(await storedTable(page)).data?.rowCount).toBe(3);
  const params=await storedTable(page);
  expect(params.provenance.source).toBe(`DHIS2 at ${ORIGIN}`);
  expect(params.dictionaryRef).toBeTruthy();
  await expect(page.locator('[data-table-dictionary]').first()).toContainText('Data dictionary: DHIS2 analytics columns, 7 variables.');
  expect(params.provenance.url).toContain('/api/analytics?dimension=dx:YtbsuPPo010');
  expect(sent.filter(Boolean).every(h=>h===`ApiToken ${TOKEN}`)).toBe(true);
  // The token is sent, and kept nowhere in the project.
  expect(await page.evaluate(()=>JSON.stringify({...localStorage}))).not.toContain(TOKEN);
  expect(errors).toEqual([]);
});

test('a server that refuses the token says so, naming where to fix it',async({page})=>{
  await page.route(url=>url.href.startsWith(ORIGIN),route=>route.fulfill({status:401,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{}'}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.goto('/?example=blank');
  await addToken(page);
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#table-tab-dhis2').click();
  await page.locator('#dhis2-address').fill(ORIGIN);
  await page.locator('#dhis2-connect').click();
  await expect(page.locator('#table-error')).toContainText('refused the token (401)');
});

test('a token for another address is named, with the address it is for',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.goto('/?example=blank');
  await addToken(page);
  await page.locator('#node-library [data-add="table_input"]').click();
  await page.locator('#configure-step').click();
  await page.locator('#table-tab-dhis2').click();
  await expect(page.locator('#dhis2-token')).toContainText(ORIGIN);
  await page.locator('#dhis2-address').fill('http://127.0.0.1:8080');
  await page.locator('#dhis2-connect').click();
  await expect(page.locator('#table-error')).toContainText(`is for ${ORIGIN}, not http://127.0.0.1:8080`);
});
