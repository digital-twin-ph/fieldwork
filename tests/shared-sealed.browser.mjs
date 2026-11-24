import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {collectPageErrors} from './page-errors.mjs';
import {REPO,fakeGitHub} from './fake-github.mjs';

/** A SHARED PROJECT ENCRYPTED ON GITHUB (the export encryption audit, 2026-11-21; the practitioner chose *"Encrypted by
 *  default"*). Shared, saved: GitHub holds only sealed files, with no word of the project in them; a member with no key
 *  is named; a key pasted for them makes the next save seal every file for them too; a save with nothing changed sends
 *  only what changed; locked, the project cannot be got again and says why; made open, the next save writes plain files
 *  and removes the sealed ones in the same commit. */
test.use({serviceWorkers:'block'});
const PASS='correct horse battery staple';

test('a shared project is saved encrypted for its members, and made open again',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  const github=fakeGitHub();
  await page.route('https://api.github.com/**',route=>github.route(route).catch(e=>{errors.push(String(e));return route.abort();}));
  await page.goto('/');await page.waitForSelector('html[data-ready]');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');await page.waitForSelector('html[data-ready]');
  await page.locator('#credentials-button').click();await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('github-shared-test');await page.locator('#credential-provider').fill('github');
  await page.locator('#credential-origin').fill('https://api.github.com');await page.locator('#credential-repository').fill(REPO);await page.locator('#credential-secret').fill('not-a-real-token');
  await page.locator('#credential-add').click();await page.locator('#credential-close').click();
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Measles in Ituri');
  await page.locator('#project-adopt-current').check();
  await page.locator('#project-create').click();
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill('Cases by health zone');await page.locator('#project-apply').click();
  await page.locator('#share-name').fill(REPO);await page.locator('#share-send').click();
  await expect(page.locator('#project-shared')).toContainText(`Shared with ${REPO}`);
  await expect(page.locator('#shared-sealed')).toBeChecked();

  // NO IDENTITY OPEN: the save says so and does not write.
  await page.locator('#shared-message').fill('First save');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('Open your identity to save it.');
  const dialog=page.locator('#identity-dialog');
  await dialog.locator('#identity-name').fill('Ada Lovelace');
  await dialog.locator('#identity-new-passphrase').fill(PASS);await dialog.locator('#identity-confirm').fill(PASS);
  const saving=page.waitForEvent('download');await dialog.locator('#identity-create').click();await saving;
  await dialog.locator('#identity-close').click();

  // A MEMBER WITH NO KEY, named at the save.
  await page.locator('#shared-check').click();
  await page.locator('[data-member="jlt"]').selectOption('co-author');
  await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('Saved.');
  await expect(page.locator('#toast')).toContainText('Not yet able to read it: jlt');
  let files=github.filesAt(github.refs.main);
  const sealed=Object.keys(files).filter(p=>p.endsWith('.fwsealed'));
  assert.ok(sealed.includes('project.json.fwsealed'));
  assert.ok(sealed.some(p=>/^workflows\/.+\.json\.fwsealed$/.test(p)));
  for(const p of sealed){const bytes=Buffer.from(files[p],'base64');assert.equal(bytes.subarray(0,8).toString(),'FWSEALED');
    assert.ok(!bytes.toString('latin1').includes('Ituri'),`${p} holds the project's words`);}
  // THE REPOSITORY'S DECLARATION STAYS PLAIN; the project's files are sealed, and their plain forms gone.
  assert.ok('.fieldwork/format.json' in files);assert.ok(!('.fieldwork/format.json.fwsealed' in files));
  assert.ok(!('project.json' in files),'the template\'s plain project.json is removed');
  const firstCommit=github.refs.main;
  // SAID IN THE PANEL: encrypted on GitHub.
  await expect(page.locator('#shared-state')).toContainText('Encrypted on GitHub');

  // A KEY PASTED FOR THEM: the next save seals every file again, for both.
  const theirs=await page.evaluate(async()=>{const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
    return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey))));});
  await page.locator('[data-member-key="jlt"]').fill(`fwkey1:${theirs}`);await page.locator('[data-member-key-add="jlt"]').click();
  await expect(page.locator('#shared-people')).toContainText('with a key given by Ada Lovelace');
  const before=github.commits.length;
  await page.locator('#shared-message').fill('For jlt too');await page.locator('#shared-save').click();
  // The commit itself, not the words: the first save's "Saved." is still on screen while this one runs.
  await expect.poll(()=>github.refs.main!==firstCommit&&github.commits.length>before).toBe(true);
  files=github.filesAt(github.refs.main);
  const header=f=>JSON.parse(Buffer.from(files[f],'base64').subarray(13,13+Buffer.from(files[f],'base64').readUInt32BE(9)).toString());
  for(const p of Object.keys(files).filter(p=>p.endsWith('.fwsealed')))assert.equal(header(p).recipients.length,2,p);
  assert.notEqual(github.refs.main,firstCommit);

  // GOT AGAIN with the identity open: read and opened.
  await page.locator('#shared-latest').click();
  await expect(page.locator('#toast')).toContainText('Got the latest');

  // LOCKED: getting the latest says why it cannot read.
  await page.locator('#identity-button').click();await dialog.locator('#identity-lock').click();await dialog.locator('#identity-close').click();
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#shared-sealed')).toBeChecked();
  await page.locator('#shared-latest').click();
  await expect(page.locator('#shared-result')).toContainText('Open your identity to read it.');

  // MADE OPEN: the next save writes plain files and removes the sealed ones in one commit.
  await page.locator('#shared-sealed').uncheck();
  await expect(page.locator('#shared-sealed-said')).toContainText('removes the encrypted ones');
  const opened=github.commits.length;
  await page.locator('#shared-message').fill('Open now');await page.locator('#shared-save').click();
  // WAIT ON THE SAVE, NOT ON THE COMMIT COUNT (2026-11-24). The fake GitHub pushes to `commits` when
  // POST /git/commits creates the object and moves `refs.main` in a LATER request (fake-github.mjs, lines 54 and
  // 58), so a poll on the count becomes true while `filesAt(refs.main)` still reads the PREVIOUS tree -- in which
  // every sealed file is naturally still there. It failed on CI for exactly that reason and passed locally every
  // time, because the gap is between two HTTP calls and a loaded runner widens it.
  //
  // "Saved." is written only after `saveToRepository` resolves, and that awaits the ref PATCH
  // (repository-save.ts), so it is a complete guarantee that the tree at `refs.main` is the new one. It is also
  // what `shared-project.browser.mjs` waits on before each of its commit-count assertions, and the poll twenty
  // lines above this one already waits on `refs.main` for the same reason.
  await expect(page.locator('#shared-result')).toContainText('Saved.');
  // ONE COMMIT, which is what the docstring claims and what `>opened` never actually checked.
  assert.equal(github.commits.length,opened+1,'made open in one commit');
  files=github.filesAt(github.refs.main);
  assert.deepEqual(Object.keys(files).filter(p=>p.endsWith('.fwsealed')),[]);
  assert.equal(JSON.parse(files['project.json']).name,'Measles in Ituri');
  expect(errors).toEqual([]);
});
