import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkParity,checkVendored} from '../scripts/validate-widgets.mjs';

const registry=JSON.parse(await readFile(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const parity=JSON.parse(await readFile(new URL('../widgets/parity.json',import.meta.url),'utf8'));
const clone=()=>JSON.parse(JSON.stringify(parity));

test('the recorded parity evidence is well formed and agrees with the registry', () => {
  const {problems,notes}=checkParity(parity,registry);
  assert.deepEqual(problems,[]);
  const covered=new Set(parity.entries.map(e=>e.widget)).size;
  assert.ok(notes.some(n=>n.includes(`${covered} of ${registry.widgets.length} widgets`)),notes.join('\n'));
  // A partial outcome must be surfaced, not averaged into a pass.
  assert.ok(notes.some(n=>n.includes('clip_raster')&&n.includes('partial')));
});

test('a claim about a release the registry does not list is refused', () => {
  const doc=clone();doc.entries[0].coversRelease='9.9.9';
  assert.match(checkParity(doc,registry).problems.join(' '),/names a release the registry does not list/);
});

test('an unknown widget, an undeclared outcome and a missing measurement are refused', () => {
  const unknown=clone();unknown.entries[0].widget='urn:fieldwork:widget:imaginary';
  assert.match(checkParity(unknown,registry).problems.join(' '),/unknown widget/);
  const outcome=clone();outcome.entries[0].outcome='looks fine';
  assert.match(checkParity(outcome,registry).problems.join(' '),/undeclared outcome/);
  const bare=clone();delete bare.entries[0].measured;
  assert.match(checkParity(bare,registry).problems.join(' '),/missing measured/);
});

test('evidence without an external implementation or a result digest is refused', () => {
  const noExternal=clone();noExternal.entries[0].external=[];
  assert.match(checkParity(noExternal,registry).problems.join(' '),/names no external implementation/);
  const badDigest=clone();badDigest.entries[0].sha256='not-a-digest';
  assert.match(checkParity(badDigest,registry).problems.join(' '),/result digest is not a SHA-256/);
  const branch=clone();branch.lab.commit='main';
  assert.match(checkParity(branch,registry).problems.join(' '),/not a full 40-character SHA/);
});

test('parity established for an older release is reported as not re-established', () => {
  const doc=clone();
  const widget=registry.widgets.find(w=>w.id==='urn:fieldwork:widget:clip_raster');
  doc.entries[1].coversRelease=widget.releases[0].version;
  const {problems,notes}=checkParity(doc,registry);
  assert.deepEqual(problems,[]);
  assert.ok(notes.some(n=>n.includes('not re-established')),notes.join('\n'));
});

test('two results for the same check on the same release are refused', () => {
  const doc=clone();doc.entries.push({...doc.entries[0]});
  assert.match(checkParity(doc,registry).problems.join(' '),/duplicate entry for check/);
});

const catalog=JSON.parse(await readFile(new URL('../widgets/packs.json',import.meta.url),'utf8'));
const readHost=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('the vendored pack declarations match the digests the catalog pins', async () => {
  const files=Object.fromEntries(await Promise.all(
    ['ontology/packs/sea-level.ttl','ontology/shapes/pack-sea-level.ttl'].map(async p=>[p,await readHost(p)])));
  const {problems,checked}=checkVendored(catalog,path=>files[path]??null);
  assert.deepEqual(problems,[]);
  assert.equal(checked.length,2);
});

test('a vendored copy that drifts from the pinned digest is refused, and a missing one is named', () => {
  const files={'ontology/packs/sea-level.ttl':'# edited\n','ontology/shapes/pack-sea-level.ttl':null};
  const {problems}=checkVendored(catalog,path=>files[path]??null);
  assert.equal(problems.length,2);
  assert.match(problems.join(' '),/does not match the pinned/);
  assert.match(problems.join(' '),/vendored from .* but missing/);
});
