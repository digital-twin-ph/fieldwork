import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** BACKUPS ENCRYPTED BY DEFAULT (the export encryption audit, 2026-11-21). The practitioner: *"I want to make sure that we are able to
 *  save workflows and projects encrypted by default"*, and *"How can others decrypt the project file if I send it to
 *  them?"*. A project backed up encrypted for the open identity, a colleague's key and a passphrase; the file holds no
 *  word of the project; it opens again with the identity, and with the passphrase once the identity is locked. */
test.use({serviceWorkers:'block'});
const PASS='correct horse battery staple',SHARED='a passphrase for Bea only';

test('a project is backed up encrypted for its owner, a colleague and a passphrase, and opens again',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.waitForSelector('html[data-ready]');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in Ituri');
  await page.locator('#project-create').click();
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="study_area"]').click();

  // THE IDENTITY, made here, carries a key for encrypted files, shown to pass on.
  await page.locator('#identity-button').click();
  const dialog=page.locator('#identity-dialog');
  await dialog.locator('#identity-name').fill('Ada Lovelace');
  await dialog.locator('#identity-new-passphrase').fill(PASS);await dialog.locator('#identity-confirm').fill(PASS);
  const saving=page.waitForEvent('download');
  await dialog.locator('#identity-create').click();await saving;
  await expect(dialog.locator('#identity-sealing-part')).toBeVisible();
  await dialog.locator('#identity-sealing-part summary').click();
  await expect(dialog.locator('#identity-sealing-key')).toContainText('fwkey1:');
  await expect(dialog.locator('#identity-sealing-print')).toHaveText(/^[0-9a-f]{4}(-[0-9a-f]{4}){3}$/);
  await dialog.locator('#identity-close').click();

  // A COLLEAGUE'S KEY, made in the page as their identity would make it.
  const colleague=await page.evaluate(async()=>{
    const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    const b=x=>btoa(String.fromCharCode(...new Uint8Array(x)));
    return {publicKey:b(await crypto.subtle.exportKey('spki',pair.publicKey)),privateKey:b(await crypto.subtle.exportKey('pkcs8',pair.privateKey))};});

  // BACK UP: encrypted comes first.
  await page.locator('#backup-button').click();
  await expect(page.locator('#backup-project-sealed')).toBeVisible();
  await page.locator('#backup-project-sealed').click();
  const seal=page.locator('#seal-dialog');
  await expect(seal).toContainText('You, Ada Lovelace');
  await expect(seal.locator('#seal-me')).toBeChecked();
  await seal.locator('#seal-keys').fill('not a key');
  await expect(seal.locator('#seal-keys-said')).toContainText('1 line is not a key');
  await seal.locator('#seal-keys').fill(`fwkey1:${colleague.publicKey}`);
  await expect(seal.locator('#seal-keys-said')).toContainText('1 key:');
  await seal.locator('#seal-pass-part summary').click();
  await seal.locator('#seal-pass').fill(SHARED);await seal.locator('#seal-pass-again').fill(SHARED);
  const writing=page.waitForEvent('download');
  await seal.locator('#seal-save').click();
  const file=await writing;
  expect(file.suggestedFilename()).toBe('measles-in-ituri-project.json.gz.fwsealed');
  const bytes=readFileSync(await file.path());
  expect(bytes.subarray(0,8).toString()).toBe('FWSEALED');
  expect(bytes.toString('latin1')).not.toContain('Ituri health');
  expect(bytes.toString('latin1')).not.toContain('Study area');
  await expect(page.locator('#toast')).toContainText('backed up encrypted');
  await expect(page.locator('#project-safety')).toHaveText('Backed up, encrypted');

  // THE COLLEAGUE OPENS IT with their own key, in the page as Fieldwork would.
  const theirs=await page.evaluate(async({bytes,privateKey})=>{
    const {openSealed}=await import('/build/sealed-file.js');
    const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(privateKey),c=>c.charCodeAt(0)),{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
    const pair=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(privateKey),c=>c.charCodeAt(0)),{name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    const jwk=await crypto.subtle.exportKey('jwk',pair);delete jwk.d;
    const pub=await crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},true,[]);
    const spki=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('spki',pub))));
    const opened=await openSealed(new Uint8Array(bytes),{identity:{publicKey:spki,privateKey:key}});
    return opened.content.name;},{bytes:[...bytes],privateKey:colleague.privateKey});
  expect(theirs).toBe('measles-in-ituri-project.json.gz');

  // OPENED AGAIN WITH THE IDENTITY: no question asked, and the project comes back as a second one.
  await page.locator('#workflow-file').setInputFiles({name:file.suggestedFilename(),mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('#toast')).toContainText('imported with 1 workflow');

  // LOCKED: it asks, says what opens it, and opens with the passphrase.
  await page.locator('#identity-button').click();await dialog.locator('#identity-lock').click();await dialog.locator('#identity-close').click();
  await page.locator('#workflow-file').setInputFiles({name:file.suggestedFilename(),mimeType:'application/octet-stream',buffer:bytes});
  const open=page.locator('#unseal-dialog');
  await expect(open).toContainText('It opens with any of 2 identities or a passphrase.');
  await open.locator('#unseal-pass').fill('not the passphrase');await open.locator('#unseal-open').click();
  await expect(open.locator('#unseal-error')).toHaveText('That passphrase does not open this file.');
  await open.locator('#unseal-pass').fill(SHARED);await open.locator('#unseal-open').click();
  await expect(open).toHaveCount(0);
  await expect.poll(async()=>(await page.locator('#project-select option').allTextContents()).filter(p=>p.startsWith('Measles in Ituri')).length).toBe(3);
  expect(errors).toEqual([]);
});
