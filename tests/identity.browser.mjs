import {test,expect} from './fixtures.mjs';
import {readFileSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** WHO DID WHAT (experiment 218, the spike of 2026-11-16): an identity file made in the Identity dialog, a note signed
 *  with it and checked offline, the file opened again after a lock, and nothing of the identity left in storage. */
const PASS='correct horse battery staple';
// The offline service worker would make the lookups itself, past the stubs below, and reach the real services.
test.use({serviceWorkers:'block'});

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
  await expect(dialog.locator('#identity-orcid-check')).toHaveText('The check digit does not match: a digit is mistyped.');
  // Looked up only when asked: the name on record, from a stand-in for ORCID's public answer.
  await page.route('https://pub.orcid.org/**',route=>route.fulfill({status:200,contentType:'application/json',
    headers:{'access-control-allow-origin':'*'},body:JSON.stringify({name:{'given-names':{value:'Josiah'},'family-name':{value:'Carberry'}}})}));
  await dialog.locator('#identity-login').fill('-ada');
  await expect(dialog.locator('#identity-login-check')).toContainText('A GitHub login is');
  await dialog.locator('#identity-login').fill('ada');
  // Checked as it is typed: too short, then a second passphrase that differs, then one that matches.
  await dialog.locator('#identity-new-passphrase').fill('short');
  await expect(dialog.locator('#identity-length')).toHaveText('7 more characters needed.');
  await dialog.locator('#identity-new-passphrase').fill(PASS);
  await expect(dialog.locator('#identity-length')).toHaveText('Long enough.');
  await dialog.locator('#identity-confirm').fill('correct horse');
  await expect(dialog.locator('#identity-match')).toHaveText('Keep typing: not the whole passphrase yet.');
  await dialog.locator('#identity-confirm').fill('correct horse battery stable');
  await expect(dialog.locator('#identity-match')).toHaveText('The passphrases do not match.');
  await dialog.locator('#identity-create').click();
  await expect(dialog.locator('#identity-create-error')).toContainText('check digit');
  await dialog.locator('#identity-orcid').fill('0000-0002-1825-0097');
  await expect(dialog.locator('#identity-orcid-check')).toHaveText('The check digit is right.');
  await dialog.locator('#identity-orcid-lookup').click();
  await expect(dialog.locator('#identity-orcid-check')).toHaveText('ORCID record found: Josiah Carberry. Is this you?');
  // Pressed with passphrases that differ: said beside the button, and nothing is made.
  await dialog.locator('#identity-create').click();
  await expect(dialog.locator('#identity-create-error')).toHaveText('The two passphrases do not match. Type the second again.');
  await dialog.locator('#identity-confirm').fill(PASS);
  await expect(dialog.locator('#identity-match')).toHaveText('The passphrases match.');
  // An avatar from Fieldwork's set: the water pump, in teal.
  await dialog.locator('.avatar-colour:has(input[value="teal"])').click();
  await dialog.locator('.avatar-option:has(input[value="pump"])').click();
  // AN AFFILIATION, FOUND ON ROR BY NAME (2026-11-16), from a stand-in for ROR's public answer; then a ROR ID typed wrong
  // is caught by its checksum, and the one chosen is kept.
  await page.route('https://api.ror.org/**',route=>route.fulfill({status:200,contentType:'application/json',
    headers:{'access-control-allow-origin':'*'},body:JSON.stringify({items:[{id:'https://ror.org/03vek6s52',
      names:[{value:'Harvard University',types:['ror_display','label']}],locations:[{geonames_details:{name:'Cambridge',country_name:'United States'}}]}]})}));
  await dialog.locator('[data-aff-add]').click();
  await dialog.locator('[data-aff-name]').fill('Harvard');
  await dialog.locator('[data-aff-find]').click();
  await dialog.locator('[data-aff-pick="0"]').click();
  await expect(dialog.locator('[data-aff-name]')).toHaveValue('Harvard University');
  await expect(dialog.locator('[data-aff-ror]')).toHaveValue('03vek6s52');
  await dialog.locator('[data-aff-ror]').fill('03vek6s53');
  await expect(dialog.locator('.affiliation-row .field-check')).toContainText('Not a ROR ID');
  await dialog.locator('[data-aff-ror]').fill('https://ror.org/03vek6s52');
  await expect(dialog.locator('.affiliation-row .field-check')).toHaveText('The checksum is right.');
  if(info.project.name==='chromium')await dialog.screenshot({path:'test-results/identity-make.png'});
  const saving=page.waitForEvent('download');
  await dialog.locator('#identity-create').click();
  const download=await saving;
  expect(download.suggestedFilename()).toBe('FWID-Ada-Lovelace.fwid');
  const file=readFileSync(await download.path(),'utf8');
  expect(file).not.toContain('Ada');
  await expect(dialog.locator('#identity-status')).toContainText(`Open: Ada Lovelace · @ada · ORCID 0000-0002-1825-0097 · Harvard University. Notes you save now are signed (${ed25519?'Ed25519':'ECDSA-P256'})`);
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity: Ada Lovelace');
  await expect(dialog.locator('#identity-avatar svg.fw-avatar')).toHaveCount(1);
  await expect(dialog.locator('#identity-avatar svg.key-pattern')).toHaveCount(1);
  if(info.project.name==='chromium'){await dialog.locator('#identity-status').scrollIntoViewIfNeeded();
    await dialog.screenshot({path:'test-results/identity-open.png'});
}
  // LINKED TO GITHUB: the key shown in SSH form, and found among the account's signing keys (GitHub's answer stubbed).
  await expect(dialog.locator('#identity-github-part')).toBeVisible();
  await expect(dialog.locator('#identity-ssh-qr svg')).toHaveCount(1);
  const ssh=(await dialog.locator('#identity-ssh-key').textContent()).trim();
  expect(ssh).toMatch(/^ssh-ed25519 AAAA\S+ FWID Ada Lovelace$/);
  let keys=[];
  await page.route('https://api.github.com/users/ada/ssh_signing_keys',route=>{return route.fulfill({status:200,contentType:'application/json',
    headers:{'access-control-allow-origin':'*'},body:JSON.stringify(keys)});});
  await dialog.locator('#identity-ssh-check').click();
  await expect(dialog.locator('#identity-ssh-result')).toContainText("Not among @ada's signing keys yet");
  keys=[{id:1,key:ssh.split(' ').slice(0,2).join(' '),title:'Fieldwork',created_at:'2026-11-16T10:00:00Z'}];
  await dialog.locator('#identity-ssh-check').click();
  await expect(dialog.locator('#identity-ssh-result')).toHaveText('✓ Linked: @ada has published this key on GitHub (added 16 November 2026).');
  // Linked: next time the section is one closed line.
  await dialog.locator('#identity-close').click();await page.locator('#identity-button').click();
  await expect(dialog.locator('#identity-github-summary')).toContainText('✓ Linked to GitHub as @ada (checked');
  await expect(dialog.locator('#identity-github-part')).not.toHaveAttribute('open','');
  await dialog.locator('#identity-github-summary').click();
  if(info.project.name==='chromium')await dialog.locator('#identity-github-part').screenshot({path:'test-results/identity-github.png'});
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
  await expect(dialog.locator('#identity-open-result')).toContainText('passphrase does not open');
  await dialog.locator('#identity-passphrase').fill(PASS);
  await dialog.locator('#identity-open').click();
  await expect(dialog.locator('#identity-status')).toContainText('✓ Opened from your file. Open: Ada Lovelace · @ada · ORCID 0000-0002-1825-0097 · Harvard University.');
  // With an identity open, the dialog is about it only: no Make or Open, one avatar chooser.
  await expect(dialog.locator('.identity-tabs')).toBeHidden();
  await expect(dialog.locator('#identity-create-part')).toBeHidden();
  await expect(dialog.locator('.avatar-chooser:visible')).toHaveCount(0);
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity: Ada Lovelace');
  // AN ORCID iD CHANGED LATER, the key kept (2026-11-19): it is shown filled in, and a new file is saved.
  await dialog.locator('#identity-avatar-part summary').click();
  await expect(dialog.locator('#identity-change-orcid')).toHaveValue('0000-0002-1825-0097');
  await dialog.locator('#identity-change-orcid').fill('0000-0001-5109-3700');
  await dialog.locator('#identity-change-file').setInputFiles({name:'FWID-Ada-Lovelace.fwid',mimeType:'application/json',buffer:Buffer.from(file)});
  await dialog.locator('#identity-change-passphrase').fill(PASS);
  const changing=page.waitForEvent('download');
  await dialog.locator('#identity-change').click();
  await changing;
  await expect(dialog.locator('#identity-status')).toContainText('ORCID 0000-0001-5109-3700');

  // OPEN THROUGH A RELOAD (the practitioner, 2026-11-16: stay unlocked, and lock after 10 minutes; 15 from 2026-11-19).
  await page.reload();
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity: Ada Lovelace');
  // NOTHING OF THE IDENTITY IN STORAGE AS PLAIN TEXT: not the file, not the passphrase, not the name. It is kept
  // encrypted while open, and the public key is in the note's versions by design, as the thing a reader checks against.
  const kept=await page.evaluate(async()=>{
    const local=Object.keys(localStorage).map(k=>k+localStorage.getItem(k)).join('');
    const session=Object.keys(sessionStorage).map(k=>k+sessionStorage.getItem(k)).join('');
    const dbs=(await indexedDB.databases?.())?.map(d=>d.name).join(',')??'';
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('fieldwork-unlocked-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const record=await new Promise(resolve=>{const r=db.transaction('kept','readonly').objectStore('kept').get('identity');r.onsuccess=()=>resolve(r.result);});db.close();
    const unlocked=record?Array.from(new Uint8Array(record.data),b=>String.fromCharCode(b)).join(''):'';
    return {local,session,dbs,unlocked,extractable:record?.keys?.privateKey?.extractable};});
  expect(kept.unlocked.length).toBeGreaterThan(0);
  expect(kept.unlocked).not.toContain('Ada');expect(kept.unlocked).not.toContain(PASS);
  expect(kept.extractable).toBe(false);
  const sealed=JSON.parse(file).data;
  for(const where of [kept.local,kept.session]){
    expect(where).not.toContain(PASS);expect(where).not.toContain(sealed);expect(where).not.toContain('fieldwork/identity/1');}
  expect(kept.dbs).not.toMatch(/identity/i);
  // LOCK ENDS IT: locked, then reloaded, it stays locked.
  await page.locator('#identity-button').click();await dialog.locator('#identity-lock').click();
  await page.reload();
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity');
  expect(errors).toEqual([]);
});

test('the key page a phone opens from the QR code shows the key, offers Copy and GitHub, and says when none is given',async({page})=>{
  const key='AAAAC3NzaC1lZDI1NTE5AAAAIMuMl5Lp/2DSpHaSLa7tm+PnQ3fk+BYZpSTExTBckjt7';
  await page.goto(`/key.html#k=${key}`);
  await expect(page.locator('#key')).toHaveText(`ssh-ed25519 ${key}`);
  await expect(page.getByRole('button',{name:'Copy the key'})).toBeVisible();
  await expect(page.getByRole('link',{name:"Open GitHub's page for a new key"})).toHaveAttribute('href','https://github.com/settings/ssh/new');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/key-page.png'});
  await page.goto('/key.html#k=not-a-key');
  await expect(page.locator('#missing')).toBeVisible();
  await expect(page.locator('#found')).toBeHidden();
});

// ONLY ITS OWN USE KEEPS IT OPEN (2026-11-18, as for the credentials): clicks elsewhere in Fieldwork do not.
test('an open identity locks after 15 minutes without its own use, however much Fieldwork is used',async({page})=>{
  test.setTimeout(120000);
  await page.clock.install();
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('#identity-button').click();
  const dialog=page.locator('#identity-dialog');
  await dialog.locator('#identity-name').fill('Ada Lovelace');
  await dialog.locator('#identity-new-passphrase').fill(PASS);
  await dialog.locator('#identity-confirm').fill(PASS);
  const download=page.waitForEvent('download');
  await dialog.locator('#identity-create').click();
  await download;
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity: Ada Lovelace');
  await page.keyboard.press('Escape');
  for(let minute=0;minute<16;minute++){await page.clock.fastForward(60*1000);await page.locator('body').click({position:{x:5,y:300}});}
  await expect(page.locator('#identity-button')).toHaveAttribute('aria-label','Identity');
});
