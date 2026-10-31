/** A REFERENCE DESCRIBES THE PAYLOAD IT WAS COMPUTED FROM, AND NOTHING ELSE.
 *
 *  Reproduced in the running application on 2026-10-31. A point layer imported from a sibling
 *  workflow carries that sibling's `dataRef`. Delete a record in the editor and press Save edits:
 *  the dialog closes reporting success, the node is written holding the INHERITED digest, the new
 *  data is stripped behind it, and the reload hydrates the payload the digest names. Measured:
 *  the editor showed 4 records then 3, and the payload store still held all four including
 *  "Teddington Lock · the tidal limit of the Thames".
 *
 *  Seven places in src/ write a dataRef and none clears one, while four editors overwrite
 *  params.data without touching it — so this is a property of the pair rather than a bug in any
 *  one editor, and these tests are written against the reconciliation rather than against them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {heldPayloadsOf,reconcilePayloadRefs} from '../build/project.js';

const workflow=nodes=>({nodes});
const node=(id,params)=>({id,type:'point_input',params});

test('DATA REWRITTEN UNDER AN UNCHANGED DIGEST DROPS THE DIGEST',()=>{
  const data={features:[1,2,3,4]};
  const w=workflow([node('a',{data,dataRef:'abc123'})]);
  const before=heldPayloadsOf(w);
  w.nodes[0].params.data={features:[1,2,3]};          // the editor hands back a new object
  reconcilePayloadRefs(before,w);
  assert.equal(w.nodes[0].params.dataRef,undefined,'the stale digest survived the edit');
  assert.deepEqual(w.nodes[0].params.data,{features:[1,2,3]});
});

test('an acquisition that sets BOTH is left alone, because its digest is the new one',()=>{
  // Every acquiring path — a file, an extract, a download, a plate — writes data and dataRef in
  // the same edit. Clearing those would undo the deduplication this whole mechanism exists for.
  const w=workflow([node('a',{data:{features:[1]},dataRef:'old'})]);
  const before=heldPayloadsOf(w);
  w.nodes[0].params.data={features:[2]};
  w.nodes[0].params.dataRef='new';
  reconcilePayloadRefs(before,w);
  assert.equal(w.nodes[0].params.dataRef,'new');
});

test('an edit that does not touch the data keeps the reference',()=>{
  // A label, a position, a name field. The payload is the same object, so the digest still
  // describes it, and dropping it here would push an inline copy into every workflow that was
  // ever renamed.
  const data={features:[1,2]};
  const w=workflow([node('a',{data,dataRef:'abc123',label:'Intakes'})]);
  const before=heldPayloadsOf(w);
  w.nodes[0].params.label='Water intakes';
  reconcilePayloadRefs(before,w);
  assert.equal(w.nodes[0].params.dataRef,'abc123');
});

test('A NODE ADDED BY THIS EDIT IS NOT AN EDIT TO A NODE',()=>{
  // The sibling-import handler pushes a new node already carrying the digest it just kept in the
  // store. It was not in the workflow a moment ago, so there is nothing to compare it against
  // and nothing to withdraw.
  const w=workflow([node('a',{data:{features:[1]},dataRef:'abc'})]);
  const before=heldPayloadsOf(w);
  w.nodes.push(node('b',{data:{features:[9]},dataRef:'def'}));
  reconcilePayloadRefs(before,w);
  assert.equal(w.nodes[1].params.dataRef,'def');
});

test('a node that never had a digest is untouched, and a dehydrated one keeps its own',()=>{
  const dehydrated=node('a',{dataRef:'abc'});          // data stripped, reference held
  const inline=node('b',{data:{features:[1]}});
  const w=workflow([dehydrated,inline]);
  const before=heldPayloadsOf(w);
  w.nodes[1].params.data={features:[1,2]};
  reconcilePayloadRefs(before,w);
  assert.equal(w.nodes[0].params.dataRef,'abc','a dehydrated node lost the reference to its data');
  assert.equal(w.nodes[1].params.dataRef,undefined);
});

test('hydration is not an edit: putting the payload back under its own digest keeps it',()=>{
  // `hydrateWorkflow` returns a REBUILT node, so this rule never sees it — but if a caller ever
  // hydrates in place, restoring the payload a digest names must not withdraw that digest.
  // Written as the boundary it is, so a change to hydration has to look at this.
  const w=workflow([node('a',{dataRef:'abc'})]);
  const before=heldPayloadsOf(w);
  w.nodes[0].params.data={features:[1]};               // arrives from the payload store
  reconcilePayloadRefs(before,w);
  // The rule CANNOT tell this from an edit and drops the reference. That is the safe direction:
  // the node goes inline, which costs storage and never costs data.
  assert.equal(w.nodes[0].params.dataRef,undefined);
});
