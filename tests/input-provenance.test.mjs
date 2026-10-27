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
  unstatedProvenance,UNSTATED,NONE_APPLIES,
  renderCitation,renderedCitations,citationGaps,citationShort,CITATION_STYLES,
  citationOmissions,normaliseDoi}
  from '../build/input-provenance.js';

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

/* ---- the citation is structured data, because a style cannot reorder a sentence ----
 *
 *  The practitioner, 2026-10-27, on a style picker that could only work against hand-parsed
 *  fields: "While it is early, let us make provenance structured data then."
 *
 *  The two records below are the example's own, as the South London inputs declare them.
 */
const SNOW={licence:'CC0-1.0',published:'1855',
  edition:{statement:'2nd',published:'1855',publisher:'John Churchill'},
  retrieved:'2026-10-24',represents:'1854',
  citation:{type:'book',authors:[{family:'Snow',given:'John'}],
    title:'On the Mode of Communication of Cholera',
    place:'London',publisher:'John Churchill'}};

const KOCH={licence:'BSD-2-Clause',published:'2006',retrieved:'2026-10-24',represents:'1855',
  citation:{type:'dataset',
    authors:[{family:'Koch',given:'Tom'},{family:'Denike',given:'Ken'}],
    title:'Sub-district boundaries for Snow\u2019s south London study',
    container:'Center for Spatial Data Science'}};

test('one record renders in all three styles, and each reorders what the others do not',()=>{
  assert.equal(renderCitation(SNOW,'vancouver'),
    'Snow J. On the Mode of Communication of Cholera. 2nd ed. London: John Churchill; 1855.');
  assert.equal(renderCitation(SNOW,'apa-7'),
    'Snow, J. (1855). On the Mode of Communication of Cholera (2nd ed.). John Churchill.');
  assert.equal(renderCitation(SNOW,'chicago-author-date'),
    'Snow, John. 1855. On the Mode of Communication of Cholera. 2nd ed. London: John Churchill.');
});

test('a second author is joined differently by each style, and only Chicago inverts just the first',()=>{
  assert.match(renderCitation(KOCH,'vancouver'),/^Koch T, Denike K\./);
  assert.match(renderCitation(KOCH,'apa-7'),/^Koch, T\., & Denike, K\./);
  // Chicago inverts the first author only: the second reads forename-first.
  assert.match(renderCitation(KOCH,'chicago-author-date'),/^Koch, Tom, and Ken Denike\./);
});

test('a non-print work carries the designator the style asks for, and Chicago asks for none',()=>{
  assert.match(renderCitation(KOCH,'vancouver'),/\[dataset\]/);
  assert.match(renderCitation(KOCH,'apa-7'),/\[Data set\]/);
  assert.ok(!/\[/.test(renderCitation(KOCH,'chicago-author-date')));
});

test('a corporate author is never initialised',()=>{
  const p={licence:'CC-BY-4.0',published:'2024',
    citation:{type:'report',authors:[{family:'Center for Spatial Data Science',corporate:true}],
      title:'Georeferencing Snow Map 2',publisher:'University of Chicago'}};
  for(const style of Object.keys(CITATION_STYLES))
    assert.match(renderCitation(p,style),/Center for Spatial Data Science/,style);
});

test('a free-text source is not a citation, and says so rather than being parsed',()=>{
  const sentence={licence:'CC0-1.0',
    source:'John Snow, On the Mode of Communication of Cholera, second edition, London: John '
      +'Churchill, 1855.'};
  assert.equal(renderCitation(sentence,'apa-7'),undefined);
  assert.deepEqual(renderedCitations(sentence),{});
  assert.match(citationGaps(sentence)[0],/A style cannot reorder a sentence/);
});

test('a gap refuses the whole citation rather than rendering a checkable-looking fragment',()=>{
  const noYear={licence:'CC0-1.0',
    citation:{type:'book',authors:[{family:'Snow',given:'John'}],title:'On the Mode'}};
  assert.equal(renderCitation(noYear,'vancouver'),undefined);
  assert.match(citationGaps(noYear).join(' '),/No publication date/);
  // `retrieved` and `represents` are different questions and neither stands in for the year.
  assert.equal(renderCitation({...noYear,retrieved:'2026-10-24',represents:'1854'},'vancouver'),
    undefined);
});

test('an author with no given name cannot be rendered, because two styles need an initial and one needs the name',()=>{
  const p={licence:'CC0-1.0',published:'1855',
    citation:{type:'book',authors:[{family:'Snow'}],title:'On the Mode'}};
  assert.match(citationGaps(p).join(' '),/Snow has no given name/);
  assert.equal(renderCitation(p,'chicago-author-date'),undefined);
});

test('a complete record has no gaps and renders in every encoded style',()=>{
  assert.deepEqual(citationGaps(SNOW),[]);
  assert.deepEqual(Object.keys(renderedCitations(SNOW)).sort(),
    Object.keys(CITATION_STYLES).sort());
});

test('a figure credit takes the short form, not a reference-list entry',()=>{
  assert.equal(citationShort(SNOW),'Snow 1855, On the Mode of Communication of Cholera');
  assert.match(citationShort(KOCH),/^Koch et al\. 2006, /);
});

test('an input that records a work and no sentence still credits the work',()=>{
  // Until this existed, attribution fell through to the bare licence id and a figure drawn from
  // Koch and Denike's boundaries credited "BSD-2-Clause" and nobody.
  assert.equal(attributionFor(KOCH),
    'Koch et al. 2006, Sub-district boundaries for Snow\u2019s south London study · BSD-2-Clause');
  // An author's own sentence still wins, because they wrote it for this line.
  assert.equal(attributionFor({...KOCH,source:'Koch and Denike (2006), via CSDS'}),
    'Koch and Denike (2006), via CSDS · BSD-2-Clause');
});

test('the receipt asserts the citation as fields, so a reader can re-render it',()=>{
  const facts=provenanceFacts('<urn:x>',SNOW);
  assert.match(facts,/fw:citationType "book"/);
  assert.match(facts,/dcterms:creator "Snow, John"/);
  assert.match(facts,/dcterms:publisher "John Churchill"/);
  assert.match(facts,/fw:editionStatement "2nd"/);
  assert.match(facts,/dcterms:issued "1855"/);
  // Each author is its own statement, so two authors are two creators rather than one string.
  const both=provenanceFacts('<urn:x>',KOCH);
  assert.equal((both.match(/dcterms:creator/g)||[]).length,2);
  // And no rendered sentence is asserted: that would be the free-text problem one layer down.
  assert.ok(!/Snow J\. On the Mode/.test(facts));
});

test('a declared citation survives provenanceOf',()=>{
  assert.deepEqual(provenanceOf({provenance:SNOW}).citation,SNOW.citation);
});

/* ---- the DOI, preferred wherever one exists ----
 *
 *  The practitioner, 2026-10-27: "We should also include DOIs in the citation as much as
 *  possible."
 */
const ARTICLE={licence:'CC-BY-4.0',published:'2006',
  citation:{type:'article',authors:[{family:'Koch',given:'Tom'},{family:'Denike',given:'Ken'}],
    title:'Rethinking John Snow\u2019s South London study',
    container:'Health & Place',volume:'12',issue:'4',pages:'271\u2013283',
    doi:'10.1016/j.healthplace.2006.01.001'}};

test('each style prints a DOI in its own convention',()=>{
  assert.match(renderCitation(ARTICLE,'vancouver'),/doi:10\.1016\/j\.healthplace\.2006\.01\.001$/);
  assert.match(renderCitation(ARTICLE,'apa-7'),
    /https:\/\/doi\.org\/10\.1016\/j\.healthplace\.2006\.01\.001$/);
  assert.match(renderCitation(ARTICLE,'chicago-author-date'),
    /https:\/\/doi\.org\/10\.1016\/j\.healthplace\.2006\.01\.001$/);
});

test('an article carries its volume, issue and pages in each style\u2019s own order',()=>{
  assert.match(renderCitation(ARTICLE,'vancouver'),/Health & Place\. 2006;12\(4\):271\u2013283\./);
  assert.match(renderCitation(ARTICLE,'apa-7'),/Health & Place, 12\(4\), 271\u2013283\./);
  assert.match(renderCitation(ARTICLE,'chicago-author-date'),
    /Health & Place 12, no\. 4: 271\u2013283\./);
});

test('the three forms a reader copies all normalise to the bare DOI',()=>{
  const bare='10.1016/j.healthplace.2006.01.001';
  for(const form of [bare,`doi:${bare}`,`DOI: ${bare}`,`https://doi.org/${bare}`,
    `http://dx.doi.org/${bare}`])
    assert.equal(normaliseDoi(form),bare,form);
});

test('a malformed DOI is refused rather than printed, because a broken one looks resolvable',()=>{
  assert.equal(normaliseDoi('10.1016'),undefined);
  assert.equal(normaliseDoi('not-a-doi'),undefined);
  assert.equal(normaliseDoi('11.1016/x'),undefined);
  const bad={...ARTICLE,citation:{...ARTICLE.citation,doi:'10.1016'}};
  assert.match(citationGaps(bad).join(' '),/is not a DOI/);
  assert.equal(renderCitation(bad,'vancouver'),undefined);
});

test('a missing DOI is advice, not a refusal',()=>{
  const noDoi={...ARTICLE,citation:{...ARTICLE.citation,doi:undefined}};
  assert.deepEqual(citationGaps(noDoi),[]);
  assert.ok(renderCitation(noDoi,'apa-7'));
  assert.match(citationOmissions(noDoi).join(' '),/No DOI\. An article published in 2006/);
});

test('a work that predates or sits outside the DOI register is not nagged for one',()=>{
  // Snow 1855 is a book from before the register existed: no DOI is a fact, not a gap.
  assert.deepEqual(citationOmissions(SNOW).filter(o=>/DOI/.test(o)),[]);
  const old={licence:'CC-BY-4.0',published:'1998',
    citation:{type:'article',authors:[{family:'Brody',given:'Howard'}],title:'Map-making',
      container:'The Lancet',pages:'64\u201368'}};
  assert.deepEqual(citationOmissions(old).filter(o=>/No DOI/.test(o)),[]);
});

test('an omission names what cannot be reached, not just what is absent',()=>{
  const page={licence:'CC-BY-4.0',published:'2024',
    citation:{type:'webpage',authors:[{family:'Center for Spatial Data Science',corporate:true}],
      title:'Snow cholera data'}};
  assert.match(citationOmissions(page).join(' '),/neither a DOI nor a URL/);
});
