/** Every input carries its provenance and licence, in one shape.
 *
 *  The practitioner, 2026-10-27: "All inputs to the workflow should carry their provenance and
 *  license data with them", then "that's something we need to standardize now."
 *
 *  What it replaced is the reason it matters: a figure decided whether to credit OpenStreetMap by
 *  testing whether its method description contained the word "Dijkstra". An ODbL obligation
 *  discharged by substring-matching a sentence written for a human.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {attributionFor,attributionsFor,shareAlike,provenanceOf,provenanceFacts,
  unstatedProvenance,UNSTATED,NONE_APPLIES} from '../build/input-provenance.js';

test('the three licence states are different claims',()=>{
  // A blank field has been made to mean all three at different times. They are not the same.
  assert.equal(attributionFor({licence:UNSTATED}),'','unstated obliges nothing and permits nothing');
  assert.equal(attributionFor({licence:NONE_APPLIES}),'','a positive claim that no terms attach');
  assert.equal(shareAlike({licence:NONE_APPLIES}),false);
  // Unknown is undefined, NOT false: "nobody encoded this" is not "it does not apply".
  assert.equal(shareAlike({licence:'Some-Bespoke-Terms-1.0'}),undefined);
  assert.equal(shareAlike({licence:UNSTATED}),undefined);
  assert.equal(unstatedProvenance('a street graph').licence,UNSTATED);
});

test('an ODbL input obliges attribution, and says so from the licence alone',()=>{
  const osm={licence:'ODbL-1.0',source:'OpenStreetMap'};
  assert.match(attributionFor(osm),/OpenStreetMap contributors, ODbL/);
  assert.equal(shareAlike(osm),true,'ODbL carries onward');
  // No source named: the obligation still stands.
  assert.match(attributionFor({licence:'ODbL-1.0'}),/OpenStreetMap contributors, ODbL/);
});

test("an author's own attribution text wins over the licence's default",()=>{
  assert.equal(attributionFor({licence:'ODbL-1.0',
    obligation:{attribution:'Street graph © OpenStreetMap contributors, ODbL 1.0'}}),
    'Street graph © OpenStreetMap contributors, ODbL 1.0');
});

test('a licence nobody encoded still names itself rather than going silent',()=>{
  // The failure mode to avoid is an obligation vanishing because a table did not list it.
  assert.equal(attributionFor({licence:'PHIVOLCS-Terms-2018',source:'PHIVOLCS'}),
    'PHIVOLCS · PHIVOLCS-Terms-2018');
});

test('a figure collects each obligation once, in order',()=>{
  const got=attributionsFor([
    {licence:'ODbL-1.0',source:'OpenStreetMap'},
    {licence:'ODbL-1.0',source:'OpenStreetMap'},   // the same source twice is one credit
    {licence:'BSD-2-Clause',source:'Center for Spatial Data Science'},
    {licence:NONE_APPLIES,source:'John Snow, 1855'},
    undefined,
  ]);
  assert.equal(got.length,2,`one ODbL and one BSD, got ${JSON.stringify(got)}`);
  assert.match(got[0],/OpenStreetMap/);
  assert.match(got[1],/BSD-2-Clause/);
});

// THE STANDARD ABSORBS THE SHAPES THAT CAME BEFORE IT rather than competing with them. Four
// existed on 2026-10-27 and no saved workflow is rewritten to adopt a fifth.
test("a study area's boundary provenance reads as the standard",()=>{
  const p=provenanceOf({boundary:{source:'Koch and Denike, modified by CSDS',
    licence:'BSD-2-Clause',licenceSource:'https://geodacenter.github.io/data-and-lab/snow8/',
    retrievedAt:'2026-10-24T00:00:00.000Z',yearRepresented:'1855',unitName:'33 sub-districts'}});
  assert.equal(p.licence,'BSD-2-Clause');
  assert.equal(p.represents,'1855','the year it REPRESENTS, not the year it was fetched');
  assert.match(p.retrieved,/^2026-10-24/);
  assert.match(p.licenceSource,/geodacenter/);
});

test("a point layer's sourceInfo and a plate's source both read as the standard",()=>{
  assert.equal(provenanceOf({sourceInfo:{licence:'CC-BY-4.0',url:'https://example.org/pumps.csv'}}).licence,'CC-BY-4.0');
  const plate=provenanceOf({source:{title:"John Snow, Map 2, 1855",licence:'none-applies',
    url:'https://www.gutenberg.org/x.jpg'}});
  assert.equal(plate.licence,'none-applies');
  assert.equal(plate.what,"John Snow, Map 2, 1855");
});

test('a declared provenance wins over an older field',()=>{
  const p=provenanceOf({provenance:{licence:'ODbL-1.0',what:'street graph'},
    boundary:{licence:'BSD-2-Clause'}});
  assert.equal(p.licence,'ODbL-1.0');
});

test('an input that declares nothing reads as nothing, not as permission',()=>{
  assert.equal(provenanceOf({}),undefined);
  assert.equal(provenanceOf({source:{filename:'x.csv',bytes:10,sha256:'a'}}),undefined,
    'a file digest is identity, not terms');
  assert.equal(attributionFor(provenanceOf({})),'');
});

test('the receipt states the terms where a reader meets the data',()=>{
  const facts=provenanceFacts('<urn:x>',{licence:'ODbL-1.0',source:'OpenStreetMap',
    retrieved:'2026-10-20',represents:'2026',url:'https://overpass-api.de'});
  assert.match(facts,/fw:licence "ODbL-1\.0"/);
  assert.match(facts,/fw:requiredAttribution ".*OpenStreetMap contributors, ODbL"/);
  assert.match(facts,/fw:shareAlike true/);
  assert.match(facts,/fw:retrievedAt "2026-10-20"/);
  assert.match(facts,/fw:represents "2026"/);
  // Nothing asserted for an input that declares nothing.
  assert.equal(provenanceFacts('<urn:x>',undefined),'');
});
