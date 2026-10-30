/** WHO DREW THE SHAPE, for the geometry no source can be cited for.
 *
 *  The practitioner, 2026-10-29, settling the seven study areas the worked-example audit counts as
 *  carrying a geometry with no declared source: *"any study area sourced from geoboundaries gets
 *  that provenance. Anything else will either be the user or someone else, depends on who created
 *  the study area if collaborative project."*
 *
 *  The load-bearing test here is the REFUSAL: an unaltered published boundary gets no human
 *  author, because that line is geoBoundaries' and naming a person beside it would credit them
 *  with somebody else's work. The same rule `studyAreaN3` already applies to the source.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {studyAreaN3,boundaryFingerprint} from '../build/study-area.js';

const box=[[[-0.14,51.5],[-0.13,51.5],[-0.13,51.51],[-0.14,51.51],[-0.14,51.5]]];
const geometry={type:'Polygon',coordinates:box};
const drawnBy={login:'hermantolentino',basis:'declared',at:'2026-10-29T12:00:00Z'};
const area=params=>studyAreaN3({id:'area',params:{source:'drawn',label:'Soho reporting rectangle',
  selectionMode:'bbox',geometry,...params}}).facts;

test('a drawn area names the person who drew it, as a dereferenceable agent', () => {
  const facts=area({drawnBy});
  assert.match(facts, /prov:wasAttributedTo <https:\/\/github\.com\/hermantolentino>/);
  assert.match(facts, /<https:\/\/github\.com\/hermantolentino> a prov:Agent, fw:Author/);
  assert.match(facts, /fw:githubLogin "hermantolentino"/);
  assert.match(facts, /prov:generatedAtTime "2026-10-29T12:00:00Z"\^\^xsd:dateTime/);
});

test('the receipt says the name was only typed, never that it was checked', () => {
  assert.match(area({drawnBy}), /fw:identityBasis "declared"/);
  assert.match(area({drawnBy:{...drawnBy,basis:'attested'}}), /fw:identityBasis "attested"/);
});

test('a drawn area with nobody recorded attributes nobody', () => {
  // Every study area shipped before identity existed is in this state, and a receipt that filled
  // it in with whoever opened the file would be inventing the provenance it exists to report.
  const facts=area({});
  assert.equal(/wasAttributedTo/.test(facts), false);
  assert.equal(/fw:Author/.test(facts), false);
});

test('an UNALTERED published boundary gets no human author', () => {
  // The refusal. The shape is geoBoundaries', so a person beside it would be credited with a line
  // they did not draw -- the rule the source provenance already follows.
  // The fingerprint of THIS geometry, which is what "as published" means: the shape on the canvas
  // still hashes to what the source handed over.
  const boundary={source:'geoBoundaries',boundaryID:'GBR-ADM2-1',unitID:'u1',unitName:'Lambeth',
    licence:'CC BY 4.0',publishedHash:boundaryFingerprint(geometry),vertices:4};
  const published=studyAreaN3({id:'area',params:{source:'drawn',label:'Lambeth',
    selectionMode:'bbox',geometry,boundary,drawnBy}}).facts;
  assert.match(published, /dcterms:source "geoBoundaries"/);
  assert.equal(/wasAttributedTo/.test(published), false,
    'an unaltered published boundary must not be attributed to a person');
});

test('an ALTERED published boundary names both: the source it came from and the person who changed it', () => {
  // studyAreaN3 already says the source "is cited for what this was derived from, not as the
  // author of this shape". This is the author that sentence left unnamed.
  const boundary={source:'geoBoundaries',boundaryID:'GBR-ADM2-1',unitID:'u1',unitName:'Lambeth',
    licence:'CC BY 4.0',publishedHash:'a-hash-that-no-longer-matches',vertices:9};
  const altered=studyAreaN3({id:'area',params:{source:'drawn',label:'Lambeth, trimmed',
    selectionMode:'polygon',geometry,boundary,drawnBy}}).facts;
  assert.match(altered, /dcterms:source "geoBoundaries"/);
  assert.match(altered, /MODIFIED IN THIS WORKFLOW/);
  assert.match(altered, /prov:wasAttributedTo <https:\/\/github\.com\/hermantolentino>/);
});

test('a login GitHub could not issue attributes nobody, rather than publishing a typo', () => {
  assert.equal(/wasAttributedTo/.test(area({drawnBy:{login:'-nope',basis:'declared'}})), false);
});
