import test from 'node:test';
import assert from 'node:assert/strict';
import {measureButtons} from '../scripts/measure-buttons.mjs';

/** FOUR ROLES, ONE STYLE EACH (the buttons-and-ports audit; adopted by the practitioner 2026-11-27, applied in 0.204.0).
 *  Primary commits, Secondary is every other action, Danger removes or discards, Link leads somewhere and changes
 *  nothing. A label means one role wherever it is drawn, and Primary is never spent on Close, Next or Done. At the
 *  audit: 20 labels in more than one style and 6 Primary labels that did not commit, counted by hand. */
test('no label is drawn in more than one role, and every Primary button commits',()=>{
  const {mixed,primaryNotCommitting}=measureButtons();
  assert.deepEqual(mixed,[],`labels in more than one role: ${mixed.map(m=>`${m.label} (${m.roles.join(', ')})`).join('; ')}`);
  assert.deepEqual(primaryNotCommitting.map(b=>`${b.label} (${b.file})`),[]);
});
