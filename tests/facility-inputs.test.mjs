import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateWorkflow} from '../build/core.js';
const legacy=JSON.parse(await readFile(new URL('./fixtures/old-naledi-source-2026-10-06.json',import.meta.url),'utf8'));
/** The 2026-10-06 fixture now refuses to open, by design.
 *
 *  It holds an `access` node, which was retired on 2026-10-12 and decomposed into three steps --
 *  a candidate filter knob, the nearest-neighbour search, and travel_time. A widget that cannot be
 *  replaced by one other widget cannot be migrated, and the practitioner's rule is that such a
 *  workflow ceases to work **naming the widget**, rather than failing somewhere inside with
 *  "Incompatible node connection" as this did before.
 *
 *  The fixture is kept rather than rewritten: it is evidence of what a workflow looked like on
 *  that date, and frozen evidence does not get edited to keep a test green.
 */
test('a workflow holding a non-replaceable retired widget refuses to open, naming it',()=>{
  const original=structuredClone(legacy);
  // Whichever of this file's retired widgets comes first is named: since 2026-11-11 that is no longer Facility access,
  // because Select nearby facilities and Diagnostic evidence are refused too (docs/audits/old-naledi-audit.md).
  assert.throws(()=>validateWorkflow(legacy),/(Select nearby facilities|Diagnostic evidence|Facility access), which was retired and cannot be replaced/);
  assert.deepEqual(legacy,original,'and the refusal does not mutate what it refused');
});

// The facility-registry tests that followed retired with Old Naledi on 2026-11-11 (docs/audits/old-naledi-audit.md).
