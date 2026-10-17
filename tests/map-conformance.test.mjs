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
