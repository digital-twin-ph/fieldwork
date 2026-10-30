/** CAN A PROJECT THAT DID NOT START AS COLLABORATIVE BECOME ONE?
 *
 *  The practitioner, 2026-10-29, and then: *"let's address the mechanical gaps above."* The gap was
 *  that a project had no way to name a repository at all, so there was nothing a conversion could
 *  do. Attaching one IS the conversion, and its presence is the whole definition of collaborative.
 *
 *  The tests that carry weight are the refusals: a malformed repository must leave a project SOLO
 *  rather than collaborative-and-unaddressable, and converting must not make the converter an
 *  author.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,validateProject,attachRepository,isCollaborative} from '../build/project.js';
import {readRepository,validRepo,repositoryLabel,repositoryURL} from '../build/identity.js';

const solo=()=>newProject('Sea level rise','Coastal facility exposure',[],
  {login:'hermantolentino',basis:'attested',at:'2026-10-29T12:00:00Z'});

test('a project records when it began, not only when it last changed', () => {
  const p=solo();
  assert.ok(p.createdAt, 'a project made now knows when it began');
  assert.equal(validateProject(p).createdAt, p.createdAt);
  // Not guessed for a project carried over: one edited today would claim to have begun today.
  const carried=validateProject({schema:'fieldwork/project/2',id:'old',name:'Old',subject:'s',
    workflows:['w'],changedAt:'2026-10-01T00:00:00Z'});
  assert.equal('createdAt' in carried, false);
});

test('a project is solo until a repository is attached, and then it is collaborative', () => {
  const p=solo();
  assert.equal(isCollaborative(p), false);
  const joint=attachRepository(p,'digital-twin-ph','sea-level-rise','2026-10-29T13:00:00Z');
  assert.equal(isCollaborative(joint), true);
  assert.equal(repositoryLabel(joint.repository), 'digital-twin-ph/sea-level-rise');
  assert.equal(repositoryURL(joint.repository),
    'https://github.com/digital-twin-ph/sea-level-rise');
  // The original is untouched: conversion returns a project, it does not mutate one.
  assert.equal(isCollaborative(p), false);
});

test('conversion records WHEN, because that is the question the field exists for', () => {
  const p=solo();
  // An hour after this project began, which is the real sequence a conversion follows. Derived
  // from the project's own clock rather than pinned to a date: pinning made the fixture claim a
  // conversion that happened before the project existed, and the test caught itself.
  const later=new Date(Date.parse(p.createdAt)+3_600_000).toISOString();
  const joint=attachRepository(p,'digital-twin-ph','sea-level-rise',later);
  assert.equal(joint.repository.attachedAt, later);
  // Later than the work already in the project, which is the honest reason a contributions
  // statement under-credits earlier work rather than a defect in it.
  assert.ok(Date.parse(joint.repository.attachedAt) > Date.parse(joint.createdAt));
  assert.equal(readRepository({owner:'o',repo:'r'}), null, 'no moment, no conversion');
});

test('converting does not make the converter an author', () => {
  // Attaching a repository is not doing work. A conversion that quietly appended whoever performed
  // it would be the import defect in a different coat.
  const p=solo();
  const joint=attachRepository(p,'digital-twin-ph','sea-level-rise');
  assert.deepEqual(joint.authors.map(a=>a.login), ['hermantolentino']);
  assert.equal(joint.authors.length, 1);
});

test('a malformed repository leaves the project SOLO, never collaborative-and-unaddressable', () => {
  // Failing closed: a project wrongly shown as solo is an inconvenience; one shown as
  // collaborative with nowhere to write is a sequence of failures nobody can diagnose.
  for(const bad of [['-owner','repo'],['owner','..'],['owner','has space'],['owner','']])
    assert.throws(()=>attachRepository(solo(),bad[0],bad[1]), /Name the repository/);
  const read=validateProject({...solo(),repository:{owner:'ok',repo:'has space',
    attachedAt:'2026-10-29T13:00:00Z'}});
  assert.equal('repository' in read, false);
  assert.equal(isCollaborative(read), false);
});

test('GitHub’s repository name rule, including the two names it reserves', () => {
  for(const ok of ['a','fieldwork','example-1855-cholera-south-london','dot.name','under_score',
    'a'.repeat(100)]) assert.equal(validRepo(ok), true, ok);
  for(const bad of ['.','..','','has space','a'.repeat(101),'slash/name'])
    assert.equal(validRepo(bad), false, bad);
});
