import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CAPS,capById,networkCaps,capFacts} from '../build/caps.js';

/** "There are reasonable caps and unreasonable ones. Example of reasonable - the 20K segment
 *  preview limit on a 292-pixel drawing. The others are unreasonable because they are imposing
 *  limits on things we have yet and need to discover (the DE angle)." -- 2026-10-22. */

test('a cap says what it bounds, and the dangerous kind is named',()=>{
  const preview=capById('preview-segments');
  assert.equal(preview.kind,'artefact','a drawing this application makes is its own to bound');
  assert.equal(capById('storage-quota').kind,'platform','a measured limit of the environment');
  assert.equal(capById('graph-limit-ceiling').kind,'discovery');
  assert.equal(capById('edge-length').kind,'discovery');
  for(const cap of CAPS){
    assert.ok(cap.evidence.trim(),`${cap.id} must say where its number came from`);
    assert.ok(cap.refuses.trim(),`${cap.id} must say what it refuses`);
    assert.ok(cap.iri.startsWith('urn:fieldwork:cap:'),`${cap.id} must be nameable in a receipt`);
  }
});

test('every declared cap is in the ontology, with its kind and basis',async()=>{
  const ontology=await readFile('ontology/fieldwork.ttl','utf8');
  for(const cap of CAPS){
    assert.ok(ontology.includes(`<${cap.iri}> a fw:Cap;`),`${cap.id} is not an fw:Cap`);
    assert.ok(ontology.includes(`fw:capKind "${cap.kind}"`),`${cap.id} has no kind in the ontology`);
  }
  assert.match(ontology,/fw:governedBy a owl:ObjectProperty/);
  assert.match(ontology,/fw:capValueInForce a owl:DatatypeProperty/);
});

test('a receipt names the caps a run was governed by, at the value in force',()=>{
  // The graph limit is a KNOB: asserting its default would misreport a run that raised it.
  const governing=networkCaps({maxNodes:500000});
  const limit=governing.find(g=>g.cap.id==='graph-limit-default');
  assert.equal(limit.inForce,500000,'the value in force, not the declared default');
  assert.equal(capById('graph-limit-default').value,50000,'and the default is unchanged');
  const facts=capFacts('urn:fieldwork:run:r:output:n:activity',governing);
  assert.match(facts,/fw:governedBy <urn:fieldwork:cap:graph-limit-default>/);
  assert.match(facts,/<urn:fieldwork:cap:graph-limit-default> fw:capValueInForce 500000/);
  assert.match(facts,/fw:governedBy <urn:fieldwork:cap:edge-length>/);
  // Unset means the default was in force, and the receipt says that number.
  assert.equal(networkCaps().find(g=>g.cap.id==='graph-limit-default').inForce,50000);
});

// Widened 2026-10-22 from `undderived` alone to every discovery cap that is not a measurement.
// `attempt-seconds` was classified exactly right -- discovery, derived, with a liftTest naming
// the measurement that would replace it -- and it still spent three days aborting a working
// province download, because `derived` was not counted. The practitioner: "That is the definition
// of an unreasonable cap, which I thought we know how to classify already." We did. Classifying
// it was not the same as being held to it.
test('the ratchet counts every unmeasured limit on discovery',async()=>{
  const ledger=JSON.parse(await readFile('widgets/caps.json','utf8'));
  const chosen=ledger.caps.filter(c=>c.kind==='discovery'&&c.basis!=='measured');
  assert.equal(chosen.length,ledger.chosenDiscoveryCeiling,
    'the ceiling is the measurement, not room above it');
  // A derived number is still a number nobody measured here, so it counts.
  assert.ok(chosen.some(c=>c.basis==='derived'),
    'derived discovery caps are inside the ratchet, which is the whole point of widening it');
  // An artefact cap may be chosen without counting: the thing it bounds is ours.
  assert.ok(ledger.caps.some(c=>c.kind==='artefact'&&c.basis==='undderived'),
    'buffer-batch is chosen, and that is allowed');
});
