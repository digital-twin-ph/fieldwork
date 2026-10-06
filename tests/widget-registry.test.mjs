import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateRegistry,sourceDefinitions} from '../scripts/validate-widgets.mjs';

const source=await sourceDefinitions();
const original=JSON.parse(await readFile('widgets/registry.json','utf8'));
test('every implemented widget has a versioned ontology-aware registry entry',async()=>{
  assert.deepEqual(await validateRegistry({...source}),{widgets:Object.keys(source.definitions).length,releases:original.widgets.reduce((count,w)=>count+w.releases.length,0)});
});
test('registry rejects missing widgets, duplicate releases, digest tampering and port drift',async()=>{
  let catalog=structuredClone(original);catalog.widgets.pop();
  await assert.rejects(validateRegistry({...source,catalog}),/Unregistered/);
  catalog=structuredClone(original);catalog.widgets[0].releases.push(catalog.widgets[0].releases[0]);
  await assert.rejects(validateRegistry({...source,catalog}),/duplicate release/);
  catalog=structuredClone(original);catalog.widgets[0].releases[0].sha256='0'.repeat(64);
  await assert.rejects(validateRegistry({...source,catalog}),/digest mismatch/);
  const definitions=structuredClone(source.definitions);definitions.places.output='area';
  await assert.rejects(validateRegistry({definitions,catalog:original}),/Port contract drift/);
});
test('registry rejects undeclared semantic mappings even with a matching release digest',async()=>{
  const catalog=structuredClone(original), entry=catalog.widgets.find(w=>w.nodeType==='area'),ref=entry.releases[0];
  const release=JSON.parse(await readFile(ref.path,'utf8'));release.ontology.mappings[0].iri='urn:fieldwork:Nonexistent';
  const changed=JSON.stringify(release);ref.sha256=createHash('sha256').update(changed).digest('hex');
  await assert.rejects(validateRegistry({...source,catalog,read:path=>path===ref.path?changed:readFile(path,'utf8')}),/Undeclared ontology class/);
});
