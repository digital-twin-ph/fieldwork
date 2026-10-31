/** THE EQUATION A COMPUTATION USED, machined into a note for the Methods section.
 *
 *  The practitioner, 2026-10-30: *"The computation widgets, especially epi widgets, should emit
 *  equations of their computations, with corresponding citations. And these should show up on the
 *  Notes UI, under Methods."*
 *
 *  This is the claim experiment 141 made and could not demonstrate -- *"All of our computations
 *  have equations, and these can be automatically constructed in LaTeX for automatic rendering as
 *  notes"* -- and which [151](../docs/experiments/151-typesetting-an-equation-a-practitioner-wrote.md)
 *  left as the one thing that would make its renderer worth its bytes: *"The first machined
 *  equation is still unwritten."* Nothing new is needed to show one. `prose.ts` reads `$$...$$`
 *  out of a note and Temml typesets it, a machined note already targets a part of a write-up and
 *  links the node that produced it, and `notesPanel` already renders a machined note as markdown.
 *
 *  THREE DECISIONS, ALL OF THEM 141'S, APPLIED RATHER THAN RE-ARGUED.
 *
 *  **Both forms, symbolic and instantiated.** 141's probe of an MMWR issue found the genre prints
 *  the rate as plain inline text in a footnote and gives the interval no formula at all. So a
 *  symbolic equation alone restates a textbook; the same equation with this run's numbers
 *  substituted is what lets a reader check the arithmetic, and is the contribution
 *  [54](../docs/experiments/54-degrees-of-reproducibility.md) means by reproducibility. Every note
 *  below carries the symbolic form and then the instantiated one.
 *
 *  **The interval is the equation worth emitting.** The rate is spelled out in footnotes because a
 *  reader could reconstruct it unaided; the interval is replaced by a software citation. That is
 *  the step this application can supply, so an estimate's interval gets its own line and its own
 *  source.
 *
 *  **A citation is READ OFF A SOURCE OR IT IS ABSENT**, which is `epiInfoLabel`'s rule in
 *  `epi-estimate.ts` applied to the second bibliographic field this project has needed. A method
 *  name filled from memory is how a wrong reference enters a teaching context, and a reference
 *  list is exactly where a reader stops checking. Two of the four interval methods here have a
 *  primary source that was looked up and recorded; two do not, and those say so. See
 *  `METHOD_REFERENCES`.
 *
 *  WHAT THIS DOES NOT DO, stated here because it is the thing a reader will assume it does. A
 *  renderer is faithful to the LaTeX it is given. Whether the LaTeX below states what Katz states
 *  is a different question, and the practitioner named the instrument for it on 2026-10-30:
 *  *"We just need to validate that what came from the source papers is what got translated into
 *  code, that's a computations audit."* No such audit exists. Every formula here was read off the
 *  implementation beside it -- `rate.ts:91`, `rate-ratio.ts:121` and `:127`, `two-by-two.ts:153`
 *  and after -- so it states what the code does, which is not the same as stating what the paper
 *  does. `TODO.md` carries the audit.
 */
import type {Citation,CitationStyle} from './input-provenance.js';
import {renderCitation} from './input-provenance.js';
import type {MachinedNote} from './notes.js';
import type {RateResult} from './rate.js';
import type {RateRatioResult} from './rate-ratio.js';
import type {TwoByTwoResult} from './two-by-two.js';
import type {EpiEstimate} from './epi-estimate.js';

/** A METHOD, AND THE WORK IT COMES FROM WHERE ONE HAS BEEN READ.
 *
 *  Keyed by the method name an estimate already carries -- `Katz log`, `Wald log`, `Wald
 *  unpooled`, `log-normal` -- so nothing has to be named twice and a method added to an estimate
 *  without a reference here is visible as an absence rather than defaulting to somebody else's
 *  paper.
 *
 *  `citation` is null where no primary source has been read, and `uncited` then says why. That is
 *  not a gap to fill later by looking one up from memory: the two filled entries below were
 *  verified against the bibliographic record on 2026-10-30, and the two null ones are null
 *  because the search for a primary source found a standard construction in several
 *  implementations and no paper to attribute it to. Printing a plausible textbook in that slot
 *  would be the professional-looking-and-wrong failure this project names. */
export interface MethodReference {
  /** The work, in fields a style can render. */
  citation:Citation|null;
  /** The year the style prints. Beside the citation rather than inside it, because
   *  `renderCitation` takes the year from the provenance record -- see `renderMethodCitation`. */
  published?:string;
  /** Why there is no citation, where there is none. Read by the note, so a reader is told rather
   *  than left to notice that one method has a reference and another does not. */
  uncited?:string;
}

export const METHOD_REFERENCES:Record<string,MethodReference>={
  // Verified 2026-10-30 against the bibliographic record: Biometrics 34(3):469-474, 1978,
  // doi 10.2307/2530610. This is the interval `two-by-two.ts` computes for the risk ratio, and
  // the standard error it uses -- sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d)) -- is Katz's.
  'Katz log':{published:'1978',citation:{type:'article',
    authors:[{family:'Katz',given:'D'},{family:'Baptista',given:'J'},
      {family:'Azen',given:'S P'},{family:'Pike',given:'M C'}],
    title:'Obtaining confidence intervals for the risk ratio in cohort studies',
    container:'Biometrics',volume:'34',issue:'3',pages:'469-474',
    doi:'10.2307/2530610'}},
  // Verified 2026-10-30: Annals of Human Genetics 19(4):251-253, 1955,
  // doi 10.1111/j.1469-1809.1955.tb01348.x. Woolf is the source of the log-odds standard error
  // sqrt(1/a + 1/b + 1/c + 1/d) that `two-by-two.ts` uses for the odds ratio -- and the same
  // construction `epi-estimate.ts` records Epi Info mislabelling as Breslow-Day, which is why
  // naming it here rather than calling it "Wald" alone is worth the line.
  'Wald log':{published:'1955',citation:{type:'article',
    authors:[{family:'Woolf',given:'B'}],
    title:'On estimating the relation between blood group and disease',
    container:'Annals of Human Genetics',volume:'19',issue:'4',pages:'251-253',
    doi:'10.1111/j.1469-1809.1955.tb01348.x'}},
  // NO PRIMARY SOURCE READ. A Wald interval on a difference of two binomial proportions is
  // textbook arithmetic that several implementations state identically and none attributes.
  'Wald unpooled':{citation:null,
    uncited:'A Wald interval on a difference of two proportions. No primary source has been read '
      +'for it: the construction is standard and the implementations consulted state it without '
      +'attributing it, so none is cited here rather than a plausible textbook being named.'},
  // NO PRIMARY SOURCE READ, same reason. `rate-ratio.ts` computes exp(ln RR +/- z*sqrt(1/a1 +
  // 1/a0)), which is what every implementation checked prints and which none attributes.
  'log-normal':{citation:null,
    uncited:'A log-normal interval on a ratio of two rates. No primary source has been read for '
      +'it: the construction is standard and the implementations consulted state it without '
      +'attributing it, so none is cited here.'},
};

/** THE STYLE A MACHINED NOTE PRINTS A METHOD REFERENCE IN.
 *
 *  Vancouver, because this is the genre the work sits in -- MMWR and the field-epidemiology
 *  weeklies -- and because a note is one line of prose rather than a reference list where the
 *  author has chosen a style. It is a constant rather than a parameter: when the write-up gains a
 *  style picker, this is the call site it governs, and a per-note choice would let two notes in
 *  one Methods section disagree. */
export const METHOD_CITATION_STYLE:CitationStyle='vancouver';

/** A method's reference as one rendered line, or undefined where there is nothing to print.
 *
 *  REUSES THE PROVENANCE RENDERER RATHER THAN SPELLING A SECOND ONE. `renderCitation` encodes
 *  three style manuals and refuses a citation with a gap in it instead of half-rendering one, and
 *  a method reference wants exactly that discipline. It takes an `InputProvenance`, so the record
 *  below is built to its shape and thrown away -- it is an adapter and never stored. `licence` is
 *  required there and means nothing for a journal article this application did not retrieve, so
 *  it says `none-applies`, which is that field's own word for it. A paper a method comes from is
 *  not an input, and nothing here files it as one. */
export function renderMethodCitation(method:string):string|undefined{
  const reference=METHOD_REFERENCES[method];
  if(!reference?.citation)return undefined;
  return renderCitation({licence:'none-applies',published:reference.published,
    citation:reference.citation},METHOD_CITATION_STYLE);
}

/** TeX specials, escaped so a column name is printed rather than parsed.
 *
 *  `deaths_seven_weeks` is an ordinary column name here and a subscript in TeX, and inside
 *  `\text{}` an unescaped underscore is an error rather than a character. A formula that fails to
 *  typeset keeps its source on the card and says why (`prose.ts`), so this would be visible --
 *  but it would be visible as a broken formula in a write-up, which is late. */
const tex=(value:string):string=>value.replace(/[\\{}$&#^_%~]/g,m=>
  m==='\\'?'\\backslash ':`\\${m}`);
/** A name as it appears inside a formula: upright, escaped, and spaced as written. */
const name=(value:string):string=>`\\text{${tex(value)}}`;
/** A number as a formula prints it: grouped in thousands, with the separator TeX needs in order
 *  not to read a comma as punctuation between arguments. */
const figure=(value:number,places=0):string=>
  value.toLocaleString('en-US',{minimumFractionDigits:places,maximumFractionDigits:places})
    .replace(/,/g,'{,}');
/** A computed value, to the precision the note is checking rather than the precision it has. */
const round=(value:number,places:number):string=>figure(
  Number(value.toFixed(places)),places);
/** THE SAME NUMBER IN PROSE, where the TeX separator would be read as what it is.
 *
 *  `figure` writes 166{,}810 because inside `$$` a bare comma is punctuation between arguments.
 *  Outside one it is six characters of TeX source in the middle of a sentence, which is what the
 *  first version of this module printed in two places -- caught by reading the note rather than
 *  by any assertion, which is the lesson experiment 141 recorded about its own drag gesture. */
const said=(value:number):string=>value.toLocaleString('en-US');

/** The reference line a note ends with, for every method it used.
 *
 *  BOTH OUTCOMES ARE PRINTED. A method with a source gets the source; a method without one gets
 *  the sentence saying none has been read. Omitting the second would leave a reader to infer from
 *  a missing line that there was nothing to say, when what it means is that nobody has looked it
 *  up -- which is a different claim and the one `epiInfoLabelSource` exists to keep separate. */
function references(methods:readonly string[]):string{
  const lines=[...new Set(methods)].map(method=>{
    const rendered=renderMethodCitation(method);
    return `- **${method}**: `
      +(rendered||METHOD_REFERENCES[method]?.uncited
        ||'No source has been read for this method.');
  });
  return lines.length?`\n\nMethod:\n\n${lines.join('\n')}`:'';
}

/** An estimate's interval, symbolic and then as bounds.
 *
 *  The bounds are printed rather than the substituted standard error. A reader checking the
 *  arithmetic of an interval needs the inputs and the answer; the intermediate quantity is the
 *  one thing they can recompute themselves, and printing it in full makes a formula a reader
 *  skips rather than reads. */
const intervalLines=(estimate:EpiEstimate,symbolic:string):string=>{
  // A RISK DIFFERENCE IS NOT ON THE SCALE OF A RATIO. Snow's is 0.004093, which at two decimals
  // is 0.00 and says nothing. The places follow the magnitude rather than the estimate's name,
  // so a measure added later gets a readable number without this deciding anything about it.
  const places=Math.abs(estimate.value??0)<0.01?6:2;
  return `\n\n$$${symbolic}$$\n\n$$= ${round(estimate.lower??0,places)} \\text{ to } `
    +`${round(estimate.upper??0,places)} \\quad (${estimate.level}\\%)$$`;
};

/** THE NOTE A RATE MACHINES.
 *
 *  A rate has no interval and therefore no method to cite: the multiplier is a scale and the
 *  division is arithmetic. That is stated rather than left as a blank reference line, because a
 *  note that cites nothing and says nothing about why reads as an oversight.
 *
 *  The instantiated form uses the OVERALL rate rather than one group's. A rate node computes one
 *  row per group -- 32 of them on Snow's sub-districts -- and a note that printed 32 equations
 *  would be a table, which this dialect does not carry and a Methods section does not want. The
 *  overall is the one figure the prose elsewhere quotes. */
export function rateEquationNote(result:RateResult,nodeId:string):MachinedNote|null{
  const {numeratorField,denominatorField,multiplier,denominatorUnit,rateKind}=result.options;
  // Nothing to instantiate. A rate whose denominator is zero has no value to substitute, and a
  // symbolic equation on its own is a textbook restatement -- which this would be emitting
  // without the half that makes it worth emitting.
  if(result.overall===null)return null;
  const per=`per ${said(multiplier)} ${denominatorUnit}`;
  const text=`The ${rateKind==='proportion'?'proportion':'rate'} is `
    +`${numeratorField} divided by ${denominatorField}, times ${multiplier.toLocaleString()}:`
    +`\n\n$$\\text{rate} = \\frac{${name(numeratorField)}}{${name(denominatorField)}} `
    +`\\times ${figure(multiplier)}$$\n\n`
    +`Each group has its own rate, in the table this step produces. Totalled over all `
    +`${result.rows.length} of them \u2014 ${said(result.totalNumerator)} ${numeratorField} and `
    +`${said(result.totalDenominator)} ${denominatorField}:`
    +`\n\n$$\\frac{${figure(result.totalNumerator)}}{${figure(result.totalDenominator)}} `
    +`\\times ${figure(multiplier)} = ${round(result.overall,3)}$$\n\n`
    +`That is ${round(result.overall,3)} ${per}`
    +`, for the numerator over ${result.options.numeratorPeriod} against a denominator of `
    +`${result.options.denominatorVintage}.`
    // THE DENOMINATOR IS THE THING THAT MOVES THE NUMBER, which is the finding lab check 30
    // produced and which `two-by-two.ts` carries at the top of the file: two rates whose
    // arithmetic is identical are different quantities when they count different things.
    //
    // THE DECLARED UNIT IS NAMED AND NOTHING IS BRANCHED ON IT. An earlier version read better
    // for one value of `denominatorUnit` by testing for it, which is a worked example's
    // vocabulary compiled into a widget: the sentence would have been subtly wrong for every
    // unit nobody wrote the branch for, including the next one added to DENOMINATOR_UNITS.
    +` The unit is what makes this comparable or not: a ${rateKind} per ${denominatorUnit} and`
    +` one per anything else are different quantities even where the division looks the same.`
    +`\n\nNo interval is computed here, so no method is cited: the division is arithmetic and the `
    +`multiplier is a scale rather than an estimator.`;
  return {kind:'machined',id:`${nodeId}:equation`,section:'Methods',fn:'method',text,nodeId};
}

/** THE NOTE A RATE RATIO MACHINES.
 *
 *  Two equations, because they answer different questions and 141 found the literature prints
 *  only the first: the ratio, which a reader could reconstruct, and the interval, which MMWR
 *  replaces with a software citation. */
export function rateRatioEquationNote(result:RateRatioResult,nodeId:string):MachinedNote{
  const {compared,reference,ratio,lower,upper,level,method}=result;
  const z=Math.abs(Math.log(upper/ratio))/Math.sqrt(1/compared.events+1/reference.events);
  const text=`The rate ratio is ${compared.label}'s rate over ${reference.label}'s. `
    +`Both rates are per ${result.denominatorUnit}, so the multiplier cancels and the ratio is `
    +`dimensionless:`
    +`\n\n$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$\n\n`
    +`with $a_1$ and $n_1$ the events and ${result.denominatorUnit} at risk in `
    +`${compared.label}, and $a_0$ and $n_0$ the same in ${reference.label}:`
    +`\n\n$$\\mathrm{RR} = \\frac{${figure(compared.events)} / ${figure(compared.unitsAtRisk)}}`
    +`{${figure(reference.events)} / ${figure(reference.unitsAtRisk)}} = ${round(ratio,2)}$$\n\n`
    +`The ${level}% interval is computed on the log scale and transformed back, because a ratio `
    +`is not symmetric about its point estimate:`
    +`\n\n$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$`
    +`\n\n$$\\exp\\left(\\ln ${round(ratio,4)} \\pm ${round(z,6)} `
    +`\\sqrt{\\frac{1}{${figure(compared.events)}} + \\frac{1}{${figure(reference.events)}}}\\right)`
    +` = ${round(lower,2)} \\text{ to } ${round(upper,2)}$$\n\n`
    +`The interval describes sampling variation in these counts alone. It is not a p-value, and `
    +`nothing here adjusts for anything the two groups did not share.`
    +references([method]);
  return {kind:'machined',id:`${nodeId}:equation`,section:'Methods',fn:'method',text,nodeId,
    cites:[method]};
}

/** One estimate's pair of equations, symbolic then instantiated, in the a/b/c/d letters. */
const estimateLines=(estimate:EpiEstimate,symbolic:string,instantiated:string):string=>
  `\n\n**${estimate.name}**, ${estimate.method}:`
  +(estimate.unavailable
    // AN UNAVAILABLE ESTIMATE KEEPS ITS EQUATION AND LOSES ITS NUMBERS, which is the shape
    // `estimateUnavailable` already has: the method is stated even when the value is null, so a
    // reader can tell "not computed" from "computed differently".
    ?`\n\n$$${symbolic}$$\n\nNot computed: ${estimate.unavailable}`
    :`\n\n$$${symbolic}$$\n\n$$${instantiated}$$`);

/** THE NOTE A TWO-BY-TWO MACHINES.
 *
 *  IN THE LETTERS a, b, c, d, which is the vocabulary experiment 147 settled on the practitioner's
 *  ruling -- *"That's why labeling the 2x2 cells as a,b,c,d helps with the mapping to rate and
 *  ratio computations"* -- and which `two-by-two.ts:144` already destructures to internally and
 *  surfaces nowhere. Every measure below is a function of the same four letters, so stating them
 *  once makes three equations readable instead of three sets of long names, and it is the
 *  notation an FETP-trained reader was taught in.
 *
 *  THE CELLS ARE A LIST AND NOT A TABLE. 151 settled that a note carries no table: a table in a
 *  write-up is an artifact this application already makes, with its own provenance and its own
 *  receipt, and retyping one as prose would produce a table with none. The four cells as four
 *  bullets are prose about the letters rather than a second rendering of the table the node
 *  already draws. */
export function twoByTwoEquationNote(result:TwoByTwoResult,nodeId:string):MachinedNote{
  const {exposed,unexposed,caseValue,nonCaseValue,exposureColumn}=result.request;
  const {exposedCases:a,exposedNonCases:b,unexposedCases:c,unexposedNonCases:d}=result.cells;
  const A=figure(a),B=figure(b),C=figure(c),D=figure(d);
  const ab=figure(result.exposedTotal),cd=figure(result.unexposedTotal);
  const of=(label:string)=>`${exposureColumn} "${label}"`;
  let text=`The four cells, in the letters every formula below is written in:`
    +`\n\n- $a$ = ${said(a)} — ${of(exposed)}, ${caseValue}`
    +`\n- $b$ = ${said(b)} — ${of(exposed)}, ${nonCaseValue}`
    +`\n- $c$ = ${said(c)} — ${of(unexposed)}, ${caseValue}`
    +`\n- $d$ = ${said(d)} — ${of(unexposed)}, ${nonCaseValue}`
    +`\n\nThe risks are $a/(a+b)$ and $c/(c+d)$:`
    +`\n\n$$\\frac{${A}}{${ab}} = ${round(result.riskExposed??0,5)} \\qquad `
    +`\\frac{${C}}{${cd}} = ${round(result.riskUnexposed??0,5)}$$`;

  const used:string[]=[];
  for(const estimate of result.estimates){
    used.push(estimate.method);
    if(estimate.name==='risk ratio')
      text+=estimateLines(estimate,
        '\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}',
        `\\mathrm{RR} = \\frac{${A}/${ab}}{${C}/${cd}} = ${round(estimate.value??0,2)}`)
        +(estimate.unavailable?'':intervalLines(estimate,
          '\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} '
          +'+ \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)'));
    else if(estimate.name==='odds ratio')
      text+=estimateLines(estimate,
        '\\mathrm{OR} = \\frac{ad}{bc}',
        `\\mathrm{OR} = \\frac{${A} \\times ${D}}{${B} \\times ${C}} `
        +`= ${round(estimate.value??0,2)}`)
        +(estimate.unavailable?'':intervalLines(estimate,
          '\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} '
          +'+ \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)'));
    else if(estimate.name==='risk difference')
      text+=estimateLines(estimate,
        '\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}',
        `\\mathrm{RD} = \\frac{${A}}{${ab}} - \\frac{${C}}{${cd}} `
        +`= ${round(estimate.value??0,6)}`)
        // THE TWO RISKS ARE NAMED WHERE THEY ARE FIRST USED. An unpooled interval is the one
        // formula here that needs a symbol the cells do not give it, and a note that writes
        // $p_1$ without saying what it is has stopped being checkable.
        +(estimate.unavailable?'':`\n\nwith $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group `
          +`contributing its own variance rather than a pooled one:`
          +intervalLines(estimate,
            '\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}'));
  }

  if(result.strataLeftOut.length)
    text+=`\n\nThis table also holds `
      +`${result.strataLeftOut.map(v=>`"${v}"`).join(', ')} in ${exposureColumn}, which is in `
      +`neither group, so the letters above total ${said(result.total)} and not the table.`;
  text+=references(used);
  return {kind:'machined',id:`${nodeId}:equation`,section:'Methods',fn:'method',text,nodeId,
    cites:[...new Set(used)]};
}

/** THE NOTE, AS N3, for the receipt that already asserts the computation.
 *
 *  `relate-table.ts` has emitted its machined notes into its own receipt since 0.3.0, as
 *  `fw:machinedNote [ a fw:MachinedNote; fw:noteSection ...; fw:noteText ... ]`, and three more
 *  producers that did not would leave one widget's write-up prose in the graph and three
 *  widgets' outside it. The terms are `runtime.ttl`'s and already declared; nothing is coined
 *  here.
 *
 *  THE LATEX IS INSIDE `fw:noteText` AND IS NOT A SECOND PROPERTY. A note's text is what it says,
 *  and the formula is part of the sentence rather than an annotation on it -- which is the same
 *  reason the markup is markdown: what is stored is what was written. A reader wanting the
 *  formulas alone has `equationsIn`, which reads them back out of the text rather than needing
 *  them stored twice where the two copies could disagree. */
export function machinedNoteFacts(subject:string,notes:readonly MachinedNote[]):string{
  const quote=(value:string)=>JSON.stringify(value);
  // STANDALONE STATEMENTS, not a clause appended to the entity's own. `relate-table.ts` builds
  // its clause before the full stop that closes its one statement; these three receipts close
  // theirs before this runs -- `rate` emits a statement per group -- so a `;` continuation would
  // be appended after a `.` and the receipt would not parse. A separate triple with the same
  // predicate says the same thing and does not depend on where the caller stopped writing.
  // THE FUNCTION AND THE METHODS TRAVEL WITH THE NOTE, added 2026-10-30 so the shapes in
  // ontology/shapes/write-up.ttl have something to hold a receipt to. `fw:noteFunction` had been
  // named in an ontology comment since 2026-10-29 and declared nowhere, and the works a note
  // cited could only be recovered by matching its prose -- which breaks the first time a venue
  // changes citation style.
  const citation=(method:string):string=>{
    const rendered=renderMethodCitation(method);
    const uncited=METHOD_REFERENCES[method]?.uncited;
    // EITHER a reference OR the reason there is none, never neither and never both, which is
    // what `fw:MethodCitationShape` holds this to. The fallback is a sentence rather than
    // silence, for the reason `references()` prints one.
    const stated=rendered
      ?`fw:methodReference ${quote(rendered)}`
      :`fw:methodUncited ${quote(uncited||'No source has been read for this method.')}`;
    return `fw:citesMethod [ a fw:MethodCitation; fw:methodName ${quote(method)}; ${stated} ]`;
  };
  return notes.map(note=>`${subject} fw:machinedNote [ a fw:MachinedNote; `
    +`fw:noteSection ${quote(note.section)}; `
    +(note.fn?`fw:noteFunction ${quote(note.fn)}; `:'')
    +[...new Set(note.cites||[])].map(method=>`${citation(method)}; `).join('')
    +`fw:noteText ${quote(note.text)} ].\n`).join('');
}
