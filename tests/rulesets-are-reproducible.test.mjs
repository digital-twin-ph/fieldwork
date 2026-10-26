import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {compileAuthoredRuleset} from '../build/authored-rules.js';

/** NO SHIPPED RULESET MAY BE ONE A PRACTITIONER COULD NOT HAVE BUILT.
 *
 *  The practitioner, 2026-10-25: *"no worked example should create a ruleset that cannot be
 *  created by hand using the primitive itself. It should be reproducible from scratch."*
 *
 *  This is a reproducibility claim, not a style rule. A bundled ruleset that only the build could
 *  produce is a result nobody can audit by rebuilding it, and a worked example carrying one
 *  teaches a workflow the application cannot actually perform. The rule builder is the primitive;
 *  every ruleset here declares the authored form it was built from, and the test is that the form
 *  still compiles to the rules that ship.
 *
 *  Byte-identity, not equivalence. Two N3 texts that reason alike are not the same artifact: the
 *  shipped text is what the digest pins, what the receipts quote and what a reader checks. */

const files=readdirSync(new URL('../rulesets/',import.meta.url),{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .flatMap(dir=>readdirSync(new URL(`../rulesets/${dir.name}/`,import.meta.url))
    .filter(name=>name.endsWith('.json'))
    .map(name=>[`${dir.name}/${name}`,
      JSON.parse(readFileSync(new URL(`../rulesets/${dir.name}/${name}`,import.meta.url),'utf8'))]));

test('every bundled ruleset declares the authored form it was built from',()=>{
  assert.ok(files.length>=8,`expected the bundled rulesets, found ${files.length}`);
  for(const [path,ruleset] of files)
    assert.ok(ruleset.authored,
      `${path} ships rules with no authored form. A ruleset nobody could have built by hand is `
      +'not reproducible from scratch, whatever its rules conclude.');
});

/** SIX OF EIGHT DO NOT, measured 2026-10-25 when this test was first written, and the difference
 *  is the variable name alone: the shipped rules say `?d`, `?m`, `?a`, and the rule builder emits
 *  the predicate's own name -- `?distanceKm`, `?proxyMinutes`, `?areaSquareMetres`. The rules
 *  reason identically. They are not the same artifact, and that is the point: the digest pins the
 *  text, the receipts quote it, and a practitioner rebuilding it by hand would not get it back.
 *
 *  A RATCHET, not an exemption. These six were hand-written before the rule builder existed;
 *  clearing one means republishing that ruleset at a new version with the compiler's own text,
 *  which changes a digest and so is a release rather than an edit. The list may only shrink, so
 *  no NEW ruleset can join it, which is what the practitioner asked for:
 *  "no worked example should create a ruleset that cannot be created by hand using the primitive
 *  itself. It should be reproducible from scratch." */
const HAND_WRITTEN_BEFORE_THE_BUILDER=[
  'access-review/1.0.0.json','access-review/2.0.0.json',
  'extent-review/1.0.0.json','extent-review/1.1.0.json',
  'outreach-criteria/1.0.0.json','outreach-criteria/1.1.0.json',
];

test('the authored form recompiles to the rules that ship, byte for byte',()=>{
  const broken=[];
  for(const [path,ruleset] of files){
    const rebuilt=compileAuthoredRuleset(ruleset.authored);
    if(rebuilt!==ruleset.rules)broken.push(path);
  }
  const unexpected=broken.filter(path=>!HAND_WRITTEN_BEFORE_THE_BUILDER.includes(path));
  assert.deepEqual(unexpected,[],
    `these rulesets ship rules their authored form does not rebuild: ${unexpected.join(', ')}. `
    +'A ruleset nobody could have built with the rule builder is not reproducible from scratch, '
    +'whatever its rules conclude.');
  const cleared=HAND_WRITTEN_BEFORE_THE_BUILDER.filter(path=>!broken.includes(path));
  assert.deepEqual(cleared,[],
    `${cleared.join(', ')} now rebuilds from its authored form. Remove it from `
    +'HAND_WRITTEN_BEFORE_THE_BUILDER so the list keeps meaning what it says.');
});

/** AND THE PARAMETERS MUST BE REACHABLE TOO. A placeholder the rule builder cannot produce is
 *  the same defect one level down: the text would be unbuildable even with the right conditions. */
test('every declared parameter appears in the rules it is declared for',()=>{
  for(const [path,ruleset] of files)
    for(const parameter of ruleset.parameters??[])
      assert.ok(ruleset.rules.includes(parameter.placeholder),
        `${path} declares ${parameter.name} with placeholder ${parameter.placeholder}, which its `
        +'rules never use, so binding it would change nothing.');
});
