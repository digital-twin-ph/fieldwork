import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** WHO DID WHAT (experiment 218, the spike of 2026-11-16): an identity file made in the Identity dialog, a note signed
 *  with it and checked offline, the file opened again after a lock, and nothing of the identity left in storage. */
const PASS='correct horse battery staple';

test('an identity made here signs a note, the signature checks, and storage keeps none of the identity',async({page},info)=>{
  const errors=collectPageErrors(page);
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  // Which signing algorithm this engine gives (218, open question 1), recorded with the result.
  const ed25519=await page.evaluate(async()=>{try{await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);return true;}catch{return false;}});
  info.annotations.push({type:'Ed25519',description:String(ed25519)});
  await page.locator('[data-view="project"]').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in a district');
  await page.locator('input[name="project-target-new"][value="publication"]').check();
  await page.locator('#project-create').click();

  // Make the identity file.
  await page.locator('#identity-button').click();
  const dialog=page.locator('#identity-dialog');
  await expect(dialog.locator('#identity-status')).toContainText('No identity is open');
  await expect(dialog.locator('#identity-tab-make')).toHaveAttribute('aria-selected','true');
  await dialog.locator('#identity-name').fill('Ada Lovelace');
  await dialog.locator('#identity-login').fill('ada');
  await dialog.locator('#identity-orcid').fill('0000-0002-1825-0098');
  await dialog.locator('#identity-new-passphrase').fill(PASS);
  await dialog.locator('#identity-confirm').fill(PASS);
  await dialog.locator('#identity-create').click();
  await expect(dialog.locator('#identity-error')).toContainText('check digit');
  await dialog.locator('#identity-orcid').fill('0000-0002-1825-0097');
  // An avatar from Fieldwork's set: the water pump, in teal.
  await dialog.locator('.avatar-colour:has(input[value="teal"])').click();
  await dialog.locator('.avatar-option:has(input[value="pump"])').click();
  if(info.project.name==='chromium')await dialog.screenshot({path:'test-results/identity-make.png'});
  const saving=page.waitForEvent('download');
  await dialog.locator('#identity-create').click();
  const download=await saving;
  expect(download.suggestedFilename()).toBe('FWID-Ada-Lovelace.fwid');
  const file=readFileSync(await download.path(),'utf8');
  expect(file).not.toContain('Ada');
  await expect(dialog.locator('#identity-status')).toContainText(`Open: Ada Lovelace · @ada · ORCID 0000-0002-1825-0097. Notes you save now are signed (${ed25519?'Ed25519':'ECDSA-P256'})`);
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity: Ada Lovelace');
  await expect(dialog.locator('#identity-avatar svg.fw-avatar')).toHaveCount(1);
  await expect(dialog.locator('#identity-avatar svg.key-pattern')).toHaveCount(1);
  if(info.project.name==='chromium'){await dialog.locator('#identity-status').scrollIntoViewIfNeeded();
    await dialog.screenshot({path:'test-results/identity-open.png'});
}
  await dialog.locator('#identity-close').click();

  if(info.project.name==='chromium')await page.locator('header').first().screenshot({path:'test-results/identity-button.png'});
  // A note written and saved with the identity open is signed; its dialog says the signature checks.
  await page.locator('[data-view="notes"]').click();
  await page.locator('.notes-outline [data-outline-role="objectives"] [data-add-note]').click();
  const note=page.locator('#note-dialog');
  await note.locator('#note-text').fill('Our objectives were to:');
  await note.locator('#note-item-add').click();
  await note.locator('#note-item-0').fill('describe the outbreak by place');
  await note.locator('#note-save').click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1'))
    .find(p=>p.name==='Measles in a district').notes.find(n=>n.fn==='objective')?.versions?.length??0)).toBe(1);
  await page.locator('#notes-view [data-note-open]').first().click();
  await note.locator('#note-versions summary').click();
  await expect(note.locator('#note-versions li')).toHaveText(/Ada Lovelace · @ada: signed, and the signature checks/);
  await expect(note.locator('#note-versions li svg.key-pattern')).toHaveCount(1);
  if(info.project.name==='chromium')await note.locator('#note-versions').screenshot({path:'test-results/identity-versions.png'});
  await note.locator('#note-close').click();

  // Words changed in storage behind the signature's back: the version no longer checks.
  await page.evaluate(()=>{const all=JSON.parse(localStorage.getItem('fieldwork-projects-v1'));
    const n=all.find(p=>p.name==='Measles in a district').notes.find(x=>x.fn==='objective');
    n.versions[0].content.text='Our objectives were not these.';localStorage.setItem('fieldwork-projects-v1',JSON.stringify(all));});
  await page.locator('[data-view="project"]').click();await page.locator('[data-view="notes"]').click();
  await page.locator('#notes-view [data-note-open]').first().click();
  await note.locator('#note-versions summary').click();
  await expect(note.locator('#note-versions li')).toHaveText(/signature does not check/);
  await note.locator('#note-close').click();

  // Locked, then opened again from the file: a wrong passphrase is refused.
  await page.locator('#identity-button').click();
  await dialog.locator('#identity-lock').click();
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity');
  await expect(dialog.locator('#identity-tab-open')).toHaveAttribute('aria-selected','true');
  await dialog.locator('#identity-file').setInputFiles({name:'FWID-Ada-Lovelace.fwid',mimeType:'application/json',buffer:Buffer.from(file)});
  await dialog.locator('#identity-passphrase').fill('not the passphrase');
  await dialog.locator('#identity-open').click();
  await expect(dialog.locator('#identity-error')).toContainText('passphrase does not open');
  await dialog.locator('#identity-passphrase').fill(PASS);
  await dialog.locator('#identity-open').click();
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity: Ada Lovelace');

  // NOTHING OF THE IDENTITY IN STORAGE: not the file, not the passphrase. The public key is in the note's versions by
  // design, as the thing a reader checks against.
  const kept=await page.evaluate(async()=>{
    const local=Object.keys(localStorage).map(k=>k+localStorage.getItem(k)).join('');
    const session=Object.keys(sessionStorage).map(k=>k+sessionStorage.getItem(k)).join('');
    const dbs=(await indexedDB.databases?.())?.map(d=>d.name).join(',')??'';
    return {local,session,dbs};});
  const sealed=JSON.parse(file).data;
  for(const where of [kept.local,kept.session]){
    expect(where).not.toContain(PASS);expect(where).not.toContain(sealed);expect(where).not.toContain('fieldwork/identity/1');}
  expect(kept.dbs).not.toMatch(/identity/i);
  expect(errors).toEqual([]);
});
