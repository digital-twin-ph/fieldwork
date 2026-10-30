/** WHO DID THE WORK, and what the application is entitled to say it knows.
 *
 *  The practitioner, 2026-10-29: *"We can establish identity through GitHub accounts."* The
 *  measurement that settled it: the published South London example names no human being in its
 *  content, and its git history names exactly one across 34 commits. The identity was already in
 *  the repository and in none of the artifacts.
 *
 *  The tests that matter here are the ones about RESTRAINT -- that a typed-in name is not recorded
 *  as checked, and that a malformed one is dropped rather than published half-read.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {validLogin,readAuthor,readAuthors,authorLabel,IDENTITY_BASES,BASIS_GLOSS} from '../build/identity.js';
import {validateProject} from '../build/project.js';

test('a login is held to GitHub’s own rule', () => {
  for(const ok of ['octocat','a','Herman-Tolentino','x1','a-b-c','0',
    'a'.repeat(39)])
    assert.equal(validLogin(ok), true, `${ok} is a valid GitHub login`);
  for(const bad of ['-leading','trailing-','two--hyphens','has space','has.dot','has_underscore',
    'a'.repeat(40), '', 'éclair'])
    assert.equal(validLogin(bad), false, `${bad} is not a valid GitHub login`);
});

test('an entered login is recorded as declared, never as checked', () => {
  const author=readAuthor({login:'octocat'});
  assert.equal(author.basis, 'declared');
  // The gloss is the words the interface may use, and they must not imply verification.
  assert.match(BASIS_GLOSS.declared, /not checked/);
});

test('a basis the file invented falls back to declared, never up to attested', () => {
  // The dangerous direction is the only one worth a test: a file claiming more than it can show.
  assert.equal(readAuthor({login:'octocat',basis:'verified'}).basis, 'declared');
  assert.equal(readAuthor({login:'octocat',basis:'attested'}).basis, 'attested');
  assert.deepEqual([...IDENTITY_BASES], ['declared','attested']);
});

test('an unreadable identity is dropped, not half kept', () => {
  assert.equal(readAuthor({login:'-nope'}), null);
  assert.equal(readAuthor({name:'Someone with no login'}), null);
  assert.equal(readAuthor('octocat'), null);
  assert.equal(readAuthor(null), null);
});

test('one person entered twice in different cases is one author', () => {
  // GitHub logins are case-insensitive, and two spellings of one person is two names on a paper.
  const authors=readAuthors([{login:'Octocat'},{login:'octocat'},{login:'hubot'}]);
  assert.deepEqual(authors.map(a=>a.login), ['Octocat','hubot']);
});

test('a display name never stands alone, because a login is what another person can resolve', () => {
  assert.equal(authorLabel({login:'octocat',basis:'declared'}), '@octocat');
  assert.equal(authorLabel({login:'octocat',name:'Mona Lisa',basis:'declared'}),
    'Mona Lisa (@octocat)');
});

test('a project carries its authors, and a project with none has no field', () => {
  const base={schema:'fieldwork/project/2',id:'p',name:'An investigation',subject:'s',
    workflows:['w']};
  assert.equal('authors' in validateProject(base), false);
  const read=validateProject({...base,authors:[{login:'octocat',name:'Mona Lisa'},{login:'-bad'}]});
  assert.deepEqual(read.authors, [{login:'octocat',name:'Mona Lisa',basis:'declared'}]);
});

test('readNotes carries an authored note’s author, and drops a malformed one', async () => {
  // Found by exercising the contributions statement on the South London example: four authored
  // notes carried an author, were stored, and arrived with none, so no writing role was proposed.
  const {readNotes}=await import('../build/notes.js');
  const {notes}=readNotes([
    {kind:'authored',id:'a',section:'Methods',text:'ours',author:'hermantolentino'},
    {kind:'authored',id:'b',section:'Methods',text:'ours',author:'-not-a-login'},
    {kind:'authored',id:'c',section:'Methods',text:'ours'},
  ]);
  assert.deepEqual(notes.map(n=>n.author), ['hermantolentino', undefined, undefined]);
});

test('a token becomes an attested identity, and the token never appears in an error', async () => {
  const {attestIdentity}=await import('../build/identity.js');
  const seen=[];
  const ok=async(url,init)=>{seen.push({url,auth:init.headers.Authorization});
    return {ok:true,status:200,json:async()=>({login:'octocat',name:'Mona Lisa'})};};
  const who=await attestIdentity('github_pat_SECRET',ok);
  assert.equal(who.login,'octocat');
  assert.equal(who.name,'Mona Lisa');
  assert.equal(who.basis,'attested');          // the whole point of the call
  assert.ok(who.at, 'an attested identity records when GitHub answered');
  assert.match(seen[0].url, /\/user$/);
  assert.equal(seen[0].auth, 'Bearer github_pat_SECRET');
  // A refusal must not carry the secret that caused it.
  const bad=async()=>({ok:false,status:401,json:async()=>({})});
  await assert.rejects(attestIdentity('github_pat_SECRET',bad),
    e=>!String(e.message).includes('github_pat_SECRET')&&/expired|copied whole/.test(e.message));
});

test('being offline leaves a declared identity exactly as valid as it was', async () => {
  const {attestIdentity}=await import('../build/identity.js');
  const offline=async()=>{throw new Error('network down');};
  await assert.rejects(attestIdentity('t',offline), /could not be reached/);
});

test('GitHub answering without a usable login confirms nothing', async () => {
  const {attestIdentity}=await import('../build/identity.js');
  const odd=async()=>({ok:true,status:200,json:async()=>({login:'-not-valid'})});
  await assert.rejects(attestIdentity('t',odd), /without a usable login/);
});

test('the current identity survives a reload, and a refusing store is reported as refusing', async () => {
  const {currentIdentity,setCurrentIdentity}=await import('../build/identity.js');
  const mem=new Map();
  const store={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,v),
    removeItem:k=>mem.delete(k)};
  assert.equal(currentIdentity(store), null);
  assert.equal(setCurrentIdentity({login:'octocat',basis:'attested'},store), true);
  assert.equal(currentIdentity(store).login, 'octocat');
  assert.equal(setCurrentIdentity(null,store), true);
  assert.equal(currentIdentity(store), null);
  // A store that throws must not be reported as having kept it: the next project would be
  // attributed to somebody this device has forgotten.
  const refuses={setItem(){throw new Error('quota');},removeItem(){}};
  assert.equal(setCurrentIdentity({login:'octocat',basis:'declared'},refuses), false);
  assert.equal(currentIdentity(null), null);
});
