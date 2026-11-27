import {test,expect} from './fixtures.mjs';

// A stubbed network reaches the real service through the service worker in WebKit unless it is blocked.
test.use({serviceWorkers:'block'});

/** A CHECK LEFT WAITING WHEN THE CREDENTIALS CHANGE IS LET GO (PR 10's review). A check was started, another credential
 *  added, then Supabase answered: the reply was rightly discarded, and the button stayed on "Checking…" for good. Now it
 *  can be pressed again, and the late reply still writes nothing. */
test('a Supabase check pending when the credentials change can be pressed again',async({page})=>{
  const ORIGIN='https://abcdefghijklmnopqrst.supabase.co';
  let answer;const answered=new Promise(resolve=>{answer=resolve;});
  await page.route(`${ORIGIN}/auth/v1/health`,async route=>{await answered;
    await route.fulfill({status:200,contentType:'application/json',body:'{"name":"GoTrue","version":"v-test"}'});});
  await page.goto('/?example=blank');
  await page.locator('#credentials-button').click();
  await page.locator('#credential-new').click();
  const add=async(ref,provider,origin,secret)=>{
    await page.locator('#credential-ref').fill(ref);await page.locator('#credential-provider').fill(provider);
    await page.locator('#credential-origin').fill(origin);await page.locator('#credential-secret').fill(secret);
    await page.locator('#credential-add').click();};
  await add('training','supabase',ORIGIN,'sb_publishable_test_value');
  const check=page.locator('#credential-list button',{hasText:/^Check/});
  await check.click();
  await expect(check).toHaveText('Checking…');
  await add('basemaps','carto','https://basemaps.cartocdn.com','test-value');
  await expect(check).toHaveText('Check');
  await expect(check).toBeEnabled();
  answer();
  await page.waitForTimeout(500);
  await expect(page.locator('#credential-list .field-check')).toHaveCount(0);
  // Pressed again, it asks and says what came back.
  await check.click();
  await expect(page.locator('#credential-list .field-check')).toContainText('Supabase answered 200');
});

/** A FINISHED CHECK IS ABOUT THE KEY IT WAS MADE WITH (PR 10's review): a key checked as accepted, then a different key
 *  under the same reference, showed "accepted this key" without asking. The result goes with the change; checking the
 *  new key asks again. */
test('a different key under the same reference does not inherit the earlier result',async({page})=>{
  const ORIGIN='https://abcdefghijklmnopqrst.supabase.co';
  await page.route(`${ORIGIN}/auth/v1/health`,route=>route.request().headers()['apikey']==='sb_publishable_first'
    ?route.fulfill({status:200,contentType:'application/json',body:'{"name":"GoTrue","version":"v-test"}'})
    :route.fulfill({status:401,contentType:'application/json',body:'{"message":"Invalid API key"}'}));
  await page.goto('/?example=blank');
  await page.locator('#credentials-button').click();
  const add=async secret=>{await page.locator('#credential-new').click();
    await page.locator('#credential-ref').fill('training');await page.locator('#credential-provider').fill('supabase');
    await page.locator('#credential-origin').fill(ORIGIN);await page.locator('#credential-secret').fill(secret);
    await page.locator('#credential-add').click();};
  await add('sb_publishable_first');
  const check=page.locator('#credential-list button',{hasText:/^Check/}),said=page.locator('#credential-list .field-check');
  await check.click();
  await expect(said).toContainText('Supabase answered 200');
  // A new collection holding a different key under the same reference.
  await add('sb_publishable_second');
  await expect(said).toHaveCount(0);
  await check.click();
  await expect(said).toContainText('Supabase answered 401');
});
