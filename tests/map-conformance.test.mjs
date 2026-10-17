/** Design rules a map is held to. The practitioner's decision of 2026-10-17: rules embedded in
 *  the widget, applied while the visualisation is assembled, and the receipt saying which ran.
 *
 *  The arithmetic is tested against hand-computed ratios, because a contrast formula that is
 *  wrong by a constant passes every self-consistent test ever written against it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {contrastRatio,relativeLuminance,isNeutral,applyDesignRules,figureDesign,DESIGN_RULES}
  from '../build/map-conformance.js';

test('the WCAG contrast formula, against values that can be checked by hand',()=>{
  // Black on white is the maximum the formula can produce: (1.0+0.05)/(0.0+0.05) = 21.
  assert.equal(Number(contrastRatio('#000000','#ffffff').toFixed(2)),21);
  // A colour against itself is 1, whatever it is.
  assert.equal(Number(contrastRatio('#4a7b2c','#4a7b2c').toFixed(4)),1);
  // Order does not matter.
  assert.equal(contrastRatio('#1A1A1A','#FFFFFF'),contrastRatio('#FFFFFF','#1A1A1A'));
  // White's luminance is 1 and black's is 0, by definition.
  assert.equal(relativeLuminance('#ffffff'),1);
  assert.equal(relativeLuminance('#000000'),0);
});

test('a neutral has no hue, and a hue is not neutral',()=>{
  assert.ok(isNeutral('#8C8C8C'),'the declared unknown colour is grey');
  assert.ok(isNeutral('#FFFFFF'));
  assert.ok(!isNeutral('#0072B2'),'the palette blue is a hue');
  assert.ok(!isNeutral('#E69F00'),'and so is the orange');
});

test('this project\'s own figure palette passes its own rules',()=>{
  const applied=applyDesignRules(figureDesign(['#0072B2','#D55E00','#009E73'],true));
  const failed=applied.filter(a=>a.outcome==='failed');
  assert.deepEqual(failed,[],`nothing should fail: ${failed.map(f=>f.says).join(' ')}`);
  // And the measured ones carry their number, not just a verdict.
  const text=applied.find(a=>a.subject==='ink on background');
  assert.equal(text.outcome,'passed');
  assert.ok(text.measurement.value>=4.5);
  assert.equal(text.measurement.threshold,4.5);
});

test('a mark too faint to find is failed, with the number that decided it',()=>{
  // A pale yellow on white: well under the 3:1 a meaningful graphic needs.
  const applied=applyDesignRules(figureDesign(['#FFF9C4'],false));
  const mark=applied.find(a=>a.rule.id==='MapMarkContrast');
  assert.equal(mark.outcome,'failed');
  assert.ok(mark.measurement.value<3,`got ${mark.measurement.value}`);
  assert.match(mark.says,/faintest of 1 category colours/);
});

test('a colour from outside the declared palette is reported, and named',()=>{
  const applied=applyDesignRules(figureDesign(['#0072B2','#FF00FF'],false));
  const palette=applied.find(a=>a.rule.id==='CategoricalPaletteIsColourBlindSafe');
  assert.equal(palette.outcome,'failed');
  assert.match(palette.says,/#FF00FF/);
});

test('absence of data drawn as a hue is failed, because it competes with the categories',()=>{
  const hued=applyDesignRules({background:'#FFFFFF',ink:'#1A1A1A',quietInk:'#595959',
    categoryColours:['#0072B2'],unknownColour:'#D55E00'});
  const rule=hued.find(a=>a.rule.id==='UnknownIsNotAHue');
  assert.equal(rule.outcome,'failed');
  assert.match(rule.says,/competes with the categories/);
});

test('a rule that did not apply is REPORTED, not omitted',()=>{
  // A map with no categories still reports the category rules, as inapplicable. A reader
  // seeing four rules in one receipt and two in another cannot otherwise tell whether the
  // missing two passed, were skipped, or do not exist.
  const applied=applyDesignRules(figureDesign([],false));
  const ids=new Set(applied.map(a=>a.rule.id));
  for(const rule of DESIGN_RULES)assert.ok(ids.has(rule.id),`${rule.id} must be reported`);
  assert.equal(applied.filter(a=>a.outcome==='inapplicable').length,3);
});

test('every rule declares whether it measured or merely checked',()=>{
  // It decides how much the outcome is worth: a measured rule produces a number somebody can
  // re-derive, a categorical one produces a judgement that was coded in.
  for(const rule of DESIGN_RULES)assert.ok(['measured','categorical'].includes(rule.kind));
  const measured=DESIGN_RULES.filter(r=>r.kind==='measured');
  // And a measured rule binds to a published criterion rather than to this project's taste.
  for(const rule of measured){
    assert.match(rule.criterion.iri,/^https:\/\/www\.w3\.org\/TR\/WCAG22\//);
    assert.equal(rule.criterion.level,'AA');
  }
});

test('the receipt states which rules were applied, in EARL and DQV',async()=>{
  const {designRuleFacts,designRuleDeclarations}=await import('../build/map-conformance.js');
  const applied=applyDesignRules(figureDesign(['#0072B2'],true));
  const n3=designRuleDeclarations()+'\n'+designRuleFacts('urn:fieldwork:run:r1:map-specification:m',applied);

  // The assertion is EARL's, because W3C already modelled "this failed that criterion".
  assert.match(n3,/a fw:DesignRuleApplication, earl:Assertion/);
  assert.match(n3,/earl:outcome earl:passed/);
  assert.match(n3,/earl:mode earl:automatic/);
  // The criterion is WCAG's own IRI. Nothing is minted to name a criterion that has one.
  assert.match(n3,/earl:test <https:\/\/www\.w3\.org\/TR\/WCAG22\/#contrast-minimum>/);
  // The measurement is DQV's, as adopted for data quality the same day.
  assert.match(n3,/dqv:value \d/);
  // And the threshold is ours, because EARL says it does not carry one.
  assert.match(n3,/fw:conformanceThreshold 4\.5/);

  // The rules themselves travel with the receipt, not just their outcomes.
  assert.match(n3,/fw:MapTextContrast a fw:DesignRule/);
  assert.match(n3,/must reach 4\.5:1 against the ground/);
  // A rule of this project's own judgement points at itself rather than borrowing a criterion.
  assert.match(n3,/fw:UnknownIsNotAHue a fw:DesignRule; fw:ruleKind "categorical"/);
  assert.ok(!/fw:UnknownIsNotAHue a fw:DesignRule[^.]*WCAG/.test(n3),
    'a project judgement must not claim a published criterion');
});

test('a map that drew no categories still reports the category rules',async()=>{
  const {designRuleFacts}=await import('../build/map-conformance.js');
  const n3=designRuleFacts('urn:x',applyDesignRules(figureDesign([],false)));
  assert.match(n3,/earl:outcome earl:inapplicable/);
  assert.match(n3,/fw:designRule fw:CategoricalPaletteIsColourBlindSafe/);
});

test('a practitioner\'s choice is recorded as a choice, with what else was offered',async()=>{
  const {designChoiceFacts}=await import('../build/map-conformance.js');
  const n3=designChoiceFacts('urn:x',[
    {setting:'presentation',chosen:'plot',alternatives:['plot','interactive']},
    {setting:'basemap',chosen:'none',alternatives:['none','osm','topo']}]);

  assert.match(n3,/a fw:DesignChoice/);
  assert.match(n3,/fw:choiceSetting "presentation"; fw:choiceMade "plot"/);
  // What else was available, so the decision reads as a judgement rather than a stored value.
  assert.match(n3,/fw:choiceOffered "interactive"/);
  assert.match(n3,/fw:choiceOffered "topo"/);

  // SELECTED, never "preferred". A preference is a disposition -- a claim that this person
  // tends to choose this -- and one click cannot evidence one; it evidences one click. The
  // receipts hold the observations a preference could later be inferred FROM, and asserting the
  // inference on a single act would be the same overclaim this project keeps catching in prose.
  assert.match(n3,/fw:decisionBasis "selected"/);
  assert.ok(!n3.includes('preferred'),'one selection is not a preference');
  assert.ok(!n3.includes('earl:'),'a selection is not a conformance assertion');
});

test('a choice with no stated alternatives is not dressed up as a judgement',async()=>{
  const {designChoiceFacts}=await import('../build/map-conformance.js');
  const n3=designChoiceFacts('urn:x',[{setting:'title',chosen:'Soho, 1854'}]);
  assert.match(n3,/fw:choiceMade "Soho, 1854"/);
  assert.ok(!n3.includes('fw:choiceOffered'),'nothing invented to fill the field');
});

test('a rule of this project\'s own judgement cites where the principle comes from',async()=>{
  const {designRuleDeclarations,DESIGN_RULES}=await import('../build/map-conformance.js');
  const n3=designRuleDeclarations();
  // A rule citing a source is checkable against that source. A rule citing nothing is taste
  // wearing a rule's clothes, which is what these were until 2026-10-17.
  // Matched per line: a rule's own comment contains full stops, so anything bounded by `.`
  // stops inside it. The declaration is one line per rule.
  const line=id=>n3.split('\n').find(l=>l.startsWith(`fw:${id} `))||'';
  assert.match(line('UnknownIsNotAHue'),/dcterms:source "Bertin, on the visual variables/);
  assert.match(line('CategoricalPaletteIsColourBlindSafe'),/dcterms:source "Brewer/);
  // And a measured rule points at WCAG rather than at a person.
  assert.match(line('MapTextContrast'),/earl:test <https:\/\/www\.w3\.org\/TR\/WCAG22\//);
  assert.ok(!line('MapTextContrast').includes('dcterms:source'),
    'a published criterion is its own source');
  // A rule that binds to a published criterion needs no second source: the criterion IS one.
  for(const rule of DESIGN_RULES){
    assert.ok(rule.criterion||rule.tracesTo,
      `${rule.id} must cite either a criterion or a principle`);
  }
});

test('the ontology and the code declare the same four rules',async()=>{
  // Two copies with no check between them is how a declaration and its implementation drift.
  // The ontology is the vocabulary; src/map-conformance.ts is what applies it.
  const {readFile}=await import('node:fs/promises');
  const ttl=await readFile(new URL('../ontology/fieldwork.ttl',import.meta.url),'utf8');
  const {DESIGN_RULES}=await import('../build/map-conformance.js');
  const declared=[...ttl.matchAll(/^fw:(\w+) a fw:DesignRule; fw:ruleKind "(\w+)";\n  rdfs:comment "((?:[^"\\]|\\.)*)"/gm)]
    .map(m=>({id:m[1],kind:m[2],statement:JSON.parse(`"${m[3]}"`)}));
  assert.equal(declared.length,DESIGN_RULES.length,'same number of rules in both places');
  for(const rule of DESIGN_RULES){
    const match=declared.find(d=>d.id===rule.id);
    assert.ok(match,`fw:${rule.id} is applied in code and not declared in the ontology`);
    assert.equal(match.kind,rule.kind,`${rule.id}: kind differs`);
    assert.equal(match.statement,rule.statement,`${rule.id}: statement differs`);
  }
});

test('the SHACL shapes accept a real receipt and refuse a malformed one',async()=>{
  // The audit's standard for a new shape: a positive example and a negative test.
  const {Parser,Store}=await import('n3');
  const {validateGraph}=await import('../scripts/validate-ontology.mjs');
  const {designRuleFacts,designChoiceFacts}=await import('../build/map-conformance.js');
  const prefixes=`@prefix fw: <urn:fieldwork:>.\n@prefix earl: <http://www.w3.org/ns/earl#>.\n`
    +`@prefix dqv: <http://www.w3.org/ns/dqv#>.\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.\n`;
  const applied=applyDesignRules(figureDesign(['#0072B2'],true));
  const good=prefixes+designRuleFacts('urn:fieldwork:run:r:map-specification:m',applied)
    +'\n'+designChoiceFacts('urn:fieldwork:run:r:map-specification:m',
      [{setting:'basemap',chosen:'none',alternatives:['none','osm']}]);

  const parse=t=>new Store(new Parser().parse(t));
  const ok=await validateGraph(parse(good));
  assert.equal(ok.conforms,true,ok.results.map(r=>`${r.path?.value} ${r.message}`).join('\n'));

  // Negative: an outcome outside EARL's closed set must be refused. A free-text outcome is how
  // a conformance report starts meaning whatever its author felt like.
  assert.equal((await validateGraph(parse(good.replace('earl:passed','fw:probablyFine')))).conforms,false);
  // Negative: a choice claiming a preference. One act cannot evidence a disposition.
  assert.equal((await validateGraph(parse(good.replace('"selected"','"preferred"')))).conforms,false);
  // Negative: a reading problem with a count and no denominator -- "63" with no "of 250".
  const issue=prefixes+`<urn:x> fw:readingProblem [ a fw:ReadingProblem; `
    +`dqv:isMeasurementOf fw:absentValues; fw:boundAttribute "deaths"; `
    +`fw:problemKind fw:ValueAbsent; fw:affectedRecordCount 3; fw:consideredRecordCount 43 ].`;
  assert.equal((await validateGraph(parse(issue))).conforms,true);
  assert.equal((await validateGraph(parse(issue.replace('; fw:consideredRecordCount 43','')))).conforms,false);
});
