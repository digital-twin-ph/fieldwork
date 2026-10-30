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
