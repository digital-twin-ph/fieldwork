import test from 'node:test';
import assert from 'node:assert/strict';
import {rateEquationNote,rateTwoByTwoEquationNote,twoByTwoEquationNote,
  renderMethodCitation,METHOD_REFERENCES} from '../build/equations.js';
import {computeRate} from '../build/rate.js';
import {computeRateTwoByTwo} from '../build/two-by-two-rates.js';
import {computeTwoByTwo} from '../build/two-by-two.js';
import {equationsIn,toHTML} from '../build/prose.js';
import {citationGaps} from '../build/input-provenance.js';

/** THE EQUATION A COMPUTATION MACHINED, as a Methods note.
 *
 *  The practitioner, 2026-10-30: *"The computation widgets, especially epi widgets, should emit
 *  equations of their computations, with corresponding citations."* Experiment 151, amendment
 *  of 2026-10-30.
 *
 *  The numbers below are Snow's and are the ones this repository already reports elsewhere, so a
 *  change to the arithmetic cannot quietly agree with itself: 3.109 deaths per 1,000 is the
 *  mortality rate experiment 146 measures the join against, and 8.40 and 5.35 are the pair lab
 *  check 30 reconciled. */

/** Snow's Table VIII as a rate reads: 32 sub-districts, 1,514 deaths, 486,936 people. */
const subDistricts=[
  {id:'1',properties:{deaths_seven_weeks:1114,population_1851:346363}},
  {id:'2',properties:{deaths_seven_weeks:400,population_1851:140573}},
];
const mortality=()=>computeRate(subDistricts,{numeratorField:'deaths_seven_weeks',
  denominatorField:'population_1851',denominatorUnit:'people',rateKind:'ratio',multiplier:1000,
  minimumDenominator:0,numeratorPeriod:'7 weeks, 1854',denominatorVintage:'1851 census'});

/** Table IX, per house: the 8.40 the project reports, read by the two-by-two's rate layout. */
const tableIX=()=>({kind:'data-table',keys:['supplier','measure'],valueField:'count',rowCount:4,missingValueCount:0,
  rows:[['Southwark and Vauxhall','deaths',1263],['Southwark and Vauxhall','houses',40046],
    ['Lambeth','deaths',98],['Lambeth','houses',26107]].map(([supplier,measure,value])=>({key:{supplier,measure},value}))});
const byCompany=()=>computeRateTwoByTwo(tableIX(),{exposureColumn:'supplier',exposed:'Southwark and Vauxhall',
  unexposed:'Lambeth',outcomeColumn:'measure',caseValue:'deaths',nonCaseValue:'',unitsAtRiskValue:'houses',level:95});

/** The contingency table: people by water supply and outcome, three strata and two named. */
const contingency=()=>computeTwoByTwo({kind:'data-table',
  keys:['water_supply','outcome'],valueField:'people',unit:'people',rowCount:6,
  missingValueCount:0,rows:[
    {key:{water_supply:'Southwark & Vauxhall only',outcome:'died'},value:844},
    {key:{water_supply:'Southwark & Vauxhall only',outcome:'survived'},value:166810},
    {key:{water_supply:'Lambeth only',outcome:'died'},value:18},
    {key:{water_supply:'Lambeth only',outcome:'survived'},value:19115},
    {key:{water_supply:'Both companies',outcome:'died'},value:652},
    {key:{water_supply:'Both companies',outcome:'survived'},value:299497},
  ]},{exposureColumn:'water_supply',outcomeColumn:'outcome',
  exposed:'Southwark & Vauxhall only',unexposed:'Lambeth only',
  caseValue:'died',nonCaseValue:'survived',level:95});

const everyNote=()=>[rateEquationNote(mortality(),'n1'),
  rateTwoByTwoEquationNote(byCompany(),'n2'),
  twoByTwoEquationNote(contingency(),'n3')];

test('a machined equation lands in Methods, as a method, on the node that computed it',()=>{
  for(const note of everyNote()){
    assert.equal(note.kind,'machined');
    assert.equal(note.section,'Methods');
    assert.equal(note.fn,'method');
    assert.match(note.nodeId,/^n\d$/);
    // STABLE ACROSS RUNS, which is what `MachinedNote.id` is for: a widget rewrites its wording
    // and a link to the note must not move. Derived from the node, so re-running gives the same.
    assert.equal(note.id,`${note.nodeId}:equation`);
  }
});

test('every note carries both the symbolic form and the instantiated one',()=>{
  // 141's third decision: a symbolic formula restates a textbook, and the same formula with this
  // run's numbers substituted is what lets a reader check the arithmetic. A note with only the
  // first is the thing that decision rejected, so the count is asserted rather than assumed.
  for(const note of everyNote()){
    const display=equationsIn(note.text).filter(e=>e.display);
    assert.ok(display.length>=2,`${note.nodeId} carries ${display.length} display formulas`);
    // The instantiated ones are the formulas with digits in them.
    assert.ok(display.some(e=>/\d/.test(e.tex)),`${note.nodeId} instantiates nothing`);
  }
});

test('the rate note states the rate this repository reports, 3.109 per 1,000',()=>{
  const note=rateEquationNote(mortality(),'n1');
  assert.match(note.text,/3\.109/);
  assert.match(note.text,/\\frac\{1\{,\}514\}\{486\{,\}936\}/);
  // The multiplier is a scale and there is no estimator, so nothing is cited and the note says
  // why rather than ending on a reference list that is empty for an unstated reason.
  assert.match(note.text,/No interval is computed here, so no method is cited/);
});

test('a rate with no value machines no equation at all',()=>{
  // A symbolic equation on its own is the textbook restatement 141 ruled against, so the note is
  // withheld rather than emitted half-built.
  const empty=computeRate([{id:'1',properties:{n:0,d:0}}],
    {numeratorField:'n',denominatorField:'d',denominatorUnit:'people',rateKind:'ratio',
      multiplier:1000,minimumDenominator:0,numeratorPeriod:'a',denominatorVintage:'b'});
  assert.equal(rateEquationNote(empty,'n1'),null);
});

test('the rate ratio note reproduces 8.40 and its interval',()=>{
  const note=rateTwoByTwoEquationNote(byCompany(),'n2');
  assert.match(note.text,/= 8\.40/);
  assert.match(note.text,/6\.84 \\text\{ to \} 10\.32/);
  // The quantile is recovered from the bounds rather than typed, so the note cannot disagree
  // with `epi-estimate.ts`'s single copy of it. Check 27 found 1.9600 hard-coded once already.
  assert.match(note.text,/1\.959964/);
});

test('the two-by-two note is written in a, b, c, d, and says what each letter counts',()=>{
  // Experiment 147, on the practitioner's ruling: *"That's why labeling the 2x2 cells as a,b,c,d
  // helps with the mapping to rate and ratio computations"*. The letters are destructured in
  // `two-by-two.ts:144` and reached no surface until this note.
  const note=twoByTwoEquationNote(contingency(),'n3');
  for(const [letter,count] of [['a','844'],['b','166,810'],['c','18'],['d','19,115']])
    assert.match(note.text,new RegExp(`\\$${letter}\\$ = ${count.replace(',',',')} `),
      `letter ${letter} is not stated as ${count}`);
  assert.match(note.text,/\\mathrm\{RR\} = \\frac\{a\/\(a\+b\)\}\{c\/\(c\+d\)\}/);
  assert.match(note.text,/\\mathrm\{OR\} = \\frac\{ad\}\{bc\}/);
  // The three figures lab check 30 and the manual page already carry.
  assert.match(note.text,/= 5\.35/);
  assert.match(note.text,/= 5\.37/);
  assert.match(note.text,/= 0\.004093/);
});

test('a stratum the comparison left out is named in the note, not only on the step',()=>{
  const note=twoByTwoEquationNote(contingency(),'n3');
  assert.match(note.text,/"Both companies"/);
  assert.match(note.text,/186,787 and not the table/);
});

test('the note NAMES its methods and does not carry their bibliography',()=>{
  // The practitioner, 2026-10-31: *"these are citations and should be in the References."* They
  // were in both, from the same `cites` field -- see `references()` in equations.ts. The works
  // themselves are asserted in tests/references.test.mjs, which is where they are now rendered
  // and which can say things a single note cannot: deduplicated across workflows, with the
  // workflows that cite each one.
  const note=twoByTwoEquationNote(contingency(),'n3');
  assert.match(note.text,/Method: .*Katz log/);
  assert.match(note.text,/Wald log/);
  assert.match(note.text,/The works are in References\./);
  // NOT THE BIBLIOGRAPHY. Asserted as an absence, because this is the duplication being removed
  // and nothing else in the suite would notice it coming back.
  assert.doesNotMatch(note.text,/Katz D, Baptista J/);
  assert.doesNotMatch(note.text,/Biometrics/);
  assert.doesNotMatch(note.text,/doi:/);
  assert.doesNotMatch(note.text,/Woolf B\./);
  // AND AN UNSOURCED METHOD IS STILL MARKED, in three words. A reader meeting `Wald unpooled`
  // beside two cited methods would otherwise take it for a third -- the distinction
  // `conventionalLabelSource` exists to keep. The full statement of it is in References.
  assert.match(note.text,/Wald unpooled \(no primary source read\)/);
});

test('every method reference is complete enough to render, or it is null',()=>{
  // 144's rule: a gap refuses the whole citation, because a half-rendered reference looks
  // checkable and is not. A reference that is present and unrenderable would print nothing and
  // say nothing, which is the one outcome neither branch above covers.
  for(const [method,reference] of Object.entries(METHOD_REFERENCES)){
    if(!reference.citation){
      assert.ok(reference.uncited,`${method} has neither a citation nor a reason`);
      assert.equal(renderMethodCitation(method),undefined);
      continue;
    }
    assert.deepEqual(citationGaps({licence:'none-applies',published:reference.published,
      citation:reference.citation}),[],`${method} cannot be rendered`);
    assert.ok(renderMethodCitation(method),`${method} renders nothing`);
  }
});

test('a column name with an underscore is escaped, not read as a subscript',()=>{
  // `deaths_seven_weeks` is a column name here and a subscript in TeX, and inside \text{} an
  // unescaped underscore is an error rather than a character. The failure would be a broken
  // formula in a write-up, which is late.
  const note=rateEquationNote(mortality(),'n1');
  assert.match(note.text,/\\text\{deaths\\_seven\\_weeks\}/);
  assert.match(note.text,/\\text\{population\\_1851\}/);
  for(const {tex} of equationsIn(note.text))
    assert.doesNotMatch(tex,/\\text\{[^}]*[^\\]_/,`an unescaped underscore in \\text{}: ${tex}`);
});

test('no note carries a table, and none carries a heading',()=>{
  // 151 settled both. A table in a write-up is an artifact this application already makes, with
  // its own provenance and its own receipt, and a heading inside an IMRaD section is a second
  // structure arguing with the first. The cells are four bullets for that reason.
  for(const note of everyNote()){
    assert.doesNotMatch(note.text,/^\s*\|/m,`${note.nodeId} carries a table row`);
    assert.doesNotMatch(note.text,/^#{1,4}\s/m,`${note.nodeId} carries a heading`);
  }
});

test('the TeX thousands separator never reaches the prose around a formula',()=>{
  // `166{,}810` is right inside $$ and is six characters of TeX source in a sentence. The first
  // version of this module printed it in three places and every assertion passed; it was caught
  // by reading the note, which is the lesson 141 recorded about its own drag gesture.
  for(const note of everyNote()){
    const prose=note.text.replace(/\$\$[\s\S]+?\$\$/g,' ').replace(/\$[^$\n]+?\$/g,' ');
    assert.doesNotMatch(prose,/\{,\}/,`${note.nodeId} leaks a TeX separator into its prose`);
  }
});

test('every note survives the reading the Notes panel gives it',()=>{
  // The panel renders a machined note through `toHTML`, so a note that reads as markdown
  // somewhere this module did not intend is a defect here and not there.
  for(const note of everyNote()){
    const html=toHTML(note.text);
    assert.match(html,/class="prose-math is-display"/);
    // Nothing a note says can become markup: the escape runs before anything else.
    assert.doesNotMatch(html,/<script|<img/);
    // The LaTeX is on the element, so a machine where the converter never loads shows the source
    // rather than a blank where a formula should be.
    assert.match(html,/data-tex="/);
  }
});
