/** WHAT EACH CO-AUTHOR DID, for the author contributions section.
 *
 *  The practitioner, 2026-10-29: *"Because we have authors modifying the artifacts, we can actually
 *  quantify the amount of work each co-author did in the publication."*
 *
 *  The tests that matter are about what the statement REFUSES to say. A count of acts is the only
 *  quantity available and it is not a measure of contribution, so there is a test that no share,
 *  percentage or ranking appears, and a test that an author the record happens not to carry is
 *  described as such rather than as having done nothing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {contributions,contributionStatement,actsOfNotes,CREDIT_ROLES,roleIRI,UNEVIDENCED}
  from '../build/contributions.js';

const mona={login:'octocat',name:'Mona Lisa',basis:'declared'};
const hubot={login:'hubot',basis:'attested'};

test('CRediT is taken as given, all fourteen roles, with resolving IRIs', () => {
  // Somebody else's standard, so the set is closed. Checked to resolve 2026-10-29.
  assert.equal(CREDIT_ROLES.length, 14);
  assert.equal(roleIRI('Writing – original draft'),
    'https://credit.niso.org/contributor-roles/writing-original-draft/');
  assert.equal(roleIRI('Data curation'),
    'https://credit.niso.org/contributor-roles/data-curation/');
});

test('a written note is drafting; an edited machined note is review and editing', () => {
  // The fork is already recorded, so this reads the distinction rather than guessing it.
  const acts=actsOfNotes([
    {kind:'authored',id:'a',section:'Methods',text:'x',author:'octocat'},
    {kind:'authored',id:'b',section:'Discussion',text:'y',author:'octocat',
      forkedFrom:{nodeId:'n',text:'the machined original'}},
    {kind:'quoted',id:'c',section:'Methods',quote:'Snow said something'},
    {kind:'authored',id:'d',section:'Methods',text:'z'},
  ]);
  assert.deepEqual(acts.map(a=>a.kind), ['note','note-edit']);
  const [entry]=contributions([mona],acts);
  assert.deepEqual(entry.contributions.map(c=>c.role),
    ['Writing – original draft','Writing – review & editing']);
  assert.equal(entry.contributions[0].evidence, '1 authored note (Methods)');
});

test('every proposed role says it was proposed, never that it was agreed', () => {
  const [entry]=contributions([mona],actsOfNotes(
    [{kind:'authored',id:'a',section:'Methods',text:'x',author:'octocat'}]));
  assert.equal(entry.contributions.every(c=>c.confirmed===false), true);
  const text=contributionStatement([entry]);
  assert.match(text, /Proposed from the record/);
  assert.match(text, /for the authors to confirm or correct/);
});

test('NO share, percentage or ranking is produced', () => {
  // The load-bearing refusal. One decisive limitation note can outweigh forty drawn boxes, and
  // nothing observable here tells them apart, so a proportion would be a judgement in disguise.
  const acts=[...Array(40)].map((_,i)=>({login:'hubot',kind:'study-area',where:`box ${i}`}))
    .concat([{login:'octocat',kind:'note',where:'Discussion'}]);
  const entries=contributions([mona,hubot],acts);
  const text=contributionStatement(entries);
  // Scoped to the per-author lines: the closing disclaimer says the words "share" and "ranking"
  // precisely in order to deny them, and must not be read as using them.
  const perAuthor=text.split('\n').filter(l=>l.includes('@'));
  assert.equal(perAuthor.length, 2);
  for(const line of perAuthor)
    assert.equal(/%|percent|\bshare\b|\bmajority\b|\blead\b|\branked?\b/i.test(line),
      false, line);
  assert.match(text, /Counts are evidence, not a measure of contribution/);
  // And the forty labels are not recited into the publication's own apparatus.
  assert.match(text, /40 study areas drawn \(box 0, box 1, box 10, box 11, and 36 more\)/);
});

test('authors keep the byline order, and are not re-sorted by how much they did', () => {
  const acts=[...Array(5)].map(()=>({login:'hubot',kind:'study-area'}));
  const entries=contributions([mona,hubot],acts);
  assert.deepEqual(entries.map(e=>e.author.login), ['octocat','hubot']);
});

test('an author the record does not carry is described, not credited with nothing', () => {
  const text=contributionStatement(contributions([mona],[]));
  assert.match(text, /no role is proposed/);
  assert.match(text, /statement about the record, not about the person/);
});

test('roles a workflow cannot evidence are named, not quietly dropped', () => {
  // So a reader can tell a role nobody performed from a role this application cannot observe.
  const text=contributionStatement(contributions([mona],[]));
  for(const role of ['Supervision','Funding acquisition','Conceptualization'])
    assert.ok(UNEVIDENCED.includes(role) && text.includes(role), `${role} must be disclosed`);
});
