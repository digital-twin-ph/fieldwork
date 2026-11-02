/** `TABLES`: the analysis under a two-by-two, in the order a trained reader looks for it.
 *
 *  The application has drawn a 2x2 since 2026-10-26 -- Snow's houses with and without a cholera
 *  death, derived in the application and totalled -- and showed counts and margins and nothing
 *  else. This is the analysis, and the reason it could not wait is a measured misreading rather
 *  than a missing feature.
 *
 *  THE 8.40 PROBLEM, AND WHAT IT IS ACTUALLY ABOUT. The South London project shows a
 *  `rate_ratio` of 8.40 on houses; the risk ratio on PEOPLE, from Tables VIII and XII, is 5.35.
 *  The first draft of this file said the gap was rate-versus-risk. It is not, and the fixture for
 *  lab check 30 refuted it before this shipped: a risk ratio over the same houses is
 *  8.401853429780243, which is the rate ratio's value BIT FOR BIT. Deaths per house IS a risk
 *  when a house can hold at most one death, so the two are the same division. Only the intervals
 *  differ -- 6.8410 to 10.3189 from the Poisson form, 6.8450 to 10.3128 from Katz, which at two
 *  decimals reads 6.84 to 10.32 against 6.85 to 10.31.
 *
 *  So the 57% gap is the DENOMINATOR -- a house against a person -- and not the estimand. Which
 *  makes the hazard worse rather than milder. A reader who takes 8.40 for the risk ratio beside
 *  the houses table is RIGHT, and is thereby taught that the substitution is safe; the number
 *  that moves is the one nothing on the screen names, the subject being counted. The direction
 *  `recognisable-not-identical-an-epi-kernel-of-our-own` says training makes the misreading
 *  near-certain, and this is the mechanism: the layout shows the statistics and not the subject.
 *
 *  WHAT IT COMPUTES, and the methods verified from the sibling project's architecture notes
 *  (`epi-info-ai/wasm/docs/architecture.md:466`, `migration-plan.md:570`): risk in each group,
 *  the risk ratio with a Katz log interval, the odds ratio with a Wald log interval, and the
 *  risk difference with an unpooled Wald interval. NOT the tests -- Pearson, Mantel-Haenszel,
 *  Yates, Fisher, mid-P. Those are a larger piece, and experiment 141's rule is that tests are
 *  not started to meet a date.
 *
 *  FOUR CELLS OUT OF A TABLE THAT MAY HOLD MORE. Snow's people-denominated table has THREE
 *  strata, because 16 of 32 sub-districts were supplied by both companies -- which is Snow's own
 *  confounding and the reason he went to the house level. So the exposed and unexposed groups are
 *  named by the practitioner rather than taken as the first two rows, and the stratum left out is
 *  reported. Naming it is the analysis; inferring it would be guessing which comparison was
 *  meant.
 *
 *  WHAT IT IS NOT. A contrast between two supplied populations, not a measured effect. Nothing
 *  here adjusts for anything the two groups did not share, and the interval describes sampling
 *  variation in these counts alone.
 */
import type {DataTable} from './data-table.js';
import type {EpiEstimate,IntervalLevel} from './epi-estimate.js';
import type {EpiInfoLabelSource} from './epi-estimate.js';
import {estimateUnavailable,oddsRatio,quantileFor,riskDifference,riskRatio} from './epi-estimate.js';

/** What the Epi Info AI classic TABLES results panel prints for each of these quantities,
 *  transcribed from `epi-info-ai/wasm/demo/app.ts` where that table is built from literal
 *  strings. Read off source on 2026-10-26 on the practitioner's pointer -- *"The Epi Info labels
 *  can be deduced from the results panel that Epi Info AI prints. That's the closest I got to the
 *  real thing."* -- and therefore a DEDUCTION from a sibling project's rendering of Epi Info, not
 *  a reading of Epi Info, which is why every estimate carries the source beside the label.
 *
 *  The panel heads its columns `Parameter | Estimate | 95% confidence interval` and prints, in
 *  this order: `Odds Ratio (cross product)`, `Odds Ratio (conditional MLE)`, `Risk Ratio (RR)`,
 *  `Risk Difference (RD%)`. Two of those have no counterpart here and that is worth stating
 *  rather than hiding: the conditional MLE odds ratio is not computed, and the tests it prints
 *  below that table -- `Chi-square - uncorrected`, `Chi-square - Mantel-Haenszel`, `Chi-square -
 *  corrected (Yates)`, `Mid-p exact`, `Fisher exact` -- are not built.
 *
 *  AND THE RISK DIFFERENCE IS NOT ON THE SAME SCALE. That panel's `RD%` is the proportion times
 *  one hundred; this result carries the proportion. Same quantity, different scale on screen, and
 *  Snow's 0.004093 reads there as 0.4093%. A recognisability difference rather than a
 *  disagreement, so it is said on the estimate instead of being silently reconciled. */
const EPI_INFO_AI_PANEL:EpiInfoLabelSource='epi-info-ai-results-panel';

export interface TwoByTwoRequest {
  /** The key column holding the exposure, and the two of its values being compared. */
  exposureColumn:string; exposed:string; unexposed:string;
  /** The key column holding the outcome, and which of its values is the case. */
  outcomeColumn:string; caseValue:string; nonCaseValue:string;
  level:IntervalLevel;
  /** THE TABLE'S ROLE, declared and never inferred: each row is one subject, as in a line list, so
   *  a cell is how many rows agree. Absent, each row holds a count, as every saved workflow means.
   *  Experiment 161, step 2.
   *
   *  THE TWO READINGS DISAGREE ABOUT AN EMPTY CELL, which is why this cannot be guessed. In a table
   *  of totals a missing row means nobody counted it. In a line list everybody is present, so a
   *  combination nobody fell into is a true zero. */
  rowsAreSubjects?:boolean;
}
export interface TwoByTwoCells {
  exposedCases:number; exposedNonCases:number;
  unexposedCases:number; unexposedNonCases:number;
}
export interface TwoByTwoResult {
  kind:'two-by-two';
  request:TwoByTwoRequest;
  cells:TwoByTwoCells;
  exposedTotal:number; unexposedTotal:number; caseTotal:number; nonCaseTotal:number; total:number;
  riskExposed:number|null; riskUnexposed:number|null;
  /** In the order a trained reader reads them. */
  estimates:EpiEstimate[];
  /** Values of the exposure column this table held and the request did not name. Reported
   *  because a stratum silently excluded from a comparison is the commonest way a 2x2 misleads. */
  strataLeftOut:string[];
  /** The same for the outcome column. A subject with an unrecorded outcome is in neither column. */
  outcomesLeftOut:string[];
  warnings:string[];
  /** How a run read this table. `design` null means none was connected, so the measures carry
   *  neutral names. `rowProportion` null means a/(a+b) is no quantity under that design, so no
   *  surface may call it one. Absent only where `computeTwoByTwo` is called directly. */
  reading?:{design:string|null; rowProportion:string|null; withheld:string[]; notEstimable:string[]};
}

/** Below this many cases the normal approximations are doing most of the work. Reported, never
 *  a refusal: the same threshold and the same choice as `rate_ratio`'s SMALL_COUNT. */
export const SMALL_CELL=5;

const cellOf=(table:DataTable,request:TwoByTwoRequest,exposure:string,outcome:string):number=>{
  const matching=table.rows.filter(row=>row.key[request.exposureColumn]===exposure
    &&row.key[request.outcomeColumn]===outcome);
  if(request.rowsAreSubjects)return matching.length;
  if(!matching.length)
    throw new Error(`This table has no row for ${request.exposureColumn} "${exposure}" with `
      +`${request.outcomeColumn} "${outcome}". A two-by-two needs all four cells, and a missing `
      +'cell is not a zero: nobody counted it.');
  if(matching.length>1)
    throw new Error(`This table has ${matching.length} rows for ${request.exposureColumn} `
      +`"${exposure}" with ${request.outcomeColumn} "${outcome}", so the cell is not one number. `
      +'Total the table within those two columns first.');
  const value=matching[0].value;
  if(value===null)
    throw new Error(`The cell for ${request.exposureColumn} "${exposure}" with `
      +`${request.outcomeColumn} "${outcome}" is empty. An empty cell is unknown, not zero, and a `
      +'two-by-two computed as though it were zero would understate that group.');
  if(value<0)throw new Error(`The cell for "${exposure}" with "${outcome}" is ${value}. `
    +'A count cannot be negative, so this table is not counts of anything.');
  if(!Number.isInteger(value))
    throw new Error(`The cell for "${exposure}" with "${outcome}" is ${value}, which is not a whole `
      +'number. A two-by-two counts subjects; a table of rates or percentages is a different thing '
      +'and these estimates would be meaningless on it.');
  return value;
};

export function computeTwoByTwo(table:DataTable,request:TwoByTwoRequest):TwoByTwoResult {
  const {exposureColumn,outcomeColumn,exposed,unexposed,caseValue,nonCaseValue,level}=request;
  quantileFor(level);
  for(const [name,column] of [['exposure',exposureColumn],['outcome',outcomeColumn]] as const){
    if(!column.trim())throw new Error(`Name the column holding the ${name}.`);
    if(!table.keys.includes(column))
      throw new Error(`This table has no "${column}" column to read the ${name} from. `
        +`Its columns are ${table.keys.join(', ')}.`);
  }
  if(exposureColumn===outcomeColumn)
    throw new Error('The exposure and the outcome must be different columns. '
      +'A table cross-tabulated against itself has only its diagonal.');
  if(exposed===unexposed)
    throw new Error('The exposed and unexposed groups must be different values. '
      +'A group compared with itself gives a risk ratio of 1 by construction.');
  if(caseValue===nonCaseValue)
    throw new Error('The case and non-case values must be different.');

  const cells={
    exposedCases:cellOf(table,request,exposed,caseValue),
    exposedNonCases:cellOf(table,request,exposed,nonCaseValue),
    unexposedCases:cellOf(table,request,unexposed,caseValue),
    unexposedNonCases:cellOf(table,request,unexposed,nonCaseValue)};
  const {exposedCases:a,exposedNonCases:b,unexposedCases:c,unexposedNonCases:d}=cells;
  const exposedTotal=a+b,unexposedTotal=c+d;
  if(!exposedTotal)throw new Error(`"${exposed}" has nobody in it, so it has no risk.`);
  if(!unexposedTotal)throw new Error(`"${unexposed}" has nobody in it, so there is nothing to `
    +'compare against.');

  const riskExposed=a/exposedTotal,riskUnexposed=c/unexposedTotal;
  const estimates:EpiEstimate[]=[];

  // THE RISK RATIO. Katz: the standard error of ln(RR) is sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d)),
  // which is not the rate ratio's sqrt(1/a + 1/c) -- a risk has its denominator in both terms
  // because the numerator is part of it. The two forms differ by terms of order 1/n, so on a
  // rare outcome the BOUNDS stay close while the point estimates coincide exactly: Snow's houses
  // give 6.8450 to 10.3128 here against 6.8410 to 10.3189 there. That closeness is a fact about
  // his data and not a licence -- make the outcome common and the two part company.
  const RISK_RATIO='risk ratio',KATZ='Katz log',RISK_RATIO_LABEL='Risk Ratio (RR)';
  if(!c)estimates.push(estimateUnavailable(RISK_RATIO,level,KATZ,
    `"${unexposed}" has 0 ${caseValue}, so its risk is zero and the ratio has no value. `
    +'Adding half a case to every cell would make one, but that is an assumption rather than '
    +'a measurement.',RISK_RATIO_LABEL,EPI_INFO_AI_PANEL));
  else if(!a)estimates.push(estimateUnavailable(RISK_RATIO,level,KATZ,
    `"${exposed}" has 0 ${caseValue}, so the ratio is 0 and its log interval is undefined.`,
    RISK_RATIO_LABEL,EPI_INFO_AI_PANEL));
  else {
    estimates.push({name:RISK_RATIO,...riskRatio(a,b,c,d,level),level,
      method:KATZ,epiInfoLabel:RISK_RATIO_LABEL,epiInfoLabelSource:EPI_INFO_AI_PANEL,
      unavailable:null,
      // THE SUBJECT, not the estimand. What makes this incomparable with another ratio on this
      // canvas is what it counts, which is the thing the taught layout does not show.
      notes:[`A risk per ${table.unit?.trim()||'subject as this table counts them'}. `
        +'A ratio computed over a different subject -- a house rather than a person -- is a '
        +'different quantity even when the arithmetic looks the same.']});
  }

  // THE ODDS RATIO, Wald on the log scale. Every cell appears in the standard error, which is why
  // a single empty cell takes it out and leaves the risk ratio standing.
  // `(cross product)` is the panel's own qualifier and is kept: it distinguishes this ad/bc odds
  // ratio from the `Odds Ratio (conditional MLE)` printed beside it, which is a different
  // estimator and is not computed here. Dropping the qualifier would make this label claim both.
  const ODDS_RATIO='odds ratio',WALD_LOG='Wald log',
    ODDS_RATIO_LABEL='Odds Ratio (cross product)';
  const empty=[[a,`${exposed} ${caseValue}`],[b,`${exposed} ${nonCaseValue}`],
    [c,`${unexposed} ${caseValue}`],[d,`${unexposed} ${nonCaseValue}`]] as const;
  const zeroCells=empty.filter(([count])=>count===0).map(([,label])=>label);
  if(zeroCells.length)estimates.push(estimateUnavailable(ODDS_RATIO,level,WALD_LOG,
    `${zeroCells.join(' and ')} ${zeroCells.length===1?'is':'are'} zero. `
    +'The Wald interval takes the reciprocal of every cell, so a zero cell leaves it undefined.',
    ODDS_RATIO_LABEL,EPI_INFO_AI_PANEL));
  else {
    estimates.push({name:ODDS_RATIO,...oddsRatio(a,b,c,d,level),level,
      method:WALD_LOG,epiInfoLabel:ODDS_RATIO_LABEL,epiInfoLabelSource:EPI_INFO_AI_PANEL,
      unavailable:null,
      notes:[...(riskExposed<0.1&&riskUnexposed<0.1
        ?['Both risks are under 10%, so the odds ratio is close to the risk ratio here. '
          +'They are still different quantities.']
        :['The outcome is common in at least one group, so the odds ratio is further from '
          +'the risk ratio than textbook examples suggest.'])]});
  }

  // THE RISK DIFFERENCE, unpooled Wald, and symmetric: a difference is on the scale it was
  // measured on, so no log and no back-transformation.
  const difference=riskDifference(a,b,c,d,level);
  estimates.push({name:'risk difference',...difference,level,
    method:'Wald unpooled',epiInfoLabel:'Risk Difference (RD%)',
    epiInfoLabelSource:EPI_INFO_AI_PANEL,unavailable:null,
    notes:['A difference of risks, on the same scale as the risks themselves. '
      +'Unpooled: each group contributes its own variance rather than a common one.',
      // The scale difference, said where the number is, because the label carries a % and this
      // value does not. A reader comparing the two screens must not read 0.004093 against 0.4093%
      // and conclude the implementations disagree.
      `Epi Info AI's panel prints this as a percentage under "Risk Difference (RD%)": `
      +`${(difference.value*100).toFixed(4)}% for the same figure. Same quantity, different scale.`]});

  const named=new Set([exposed,unexposed]);
  const strataLeftOut=[...new Set(table.rows.map(row=>row.key[exposureColumn]))]
    .filter(value=>value!==undefined&&!named.has(value));
  const namedOutcomes=new Set([caseValue,nonCaseValue]);
  const outcomesLeftOut=[...new Set(table.rows.map(row=>row.key[outcomeColumn]))]
    .filter(value=>value!==undefined&&!namedOutcomes.has(value));
  const warnings:string[]=[];
  if(request.rowsAreSubjects)warnings.push('Counted rows, one subject each. This cannot tell whether '
    +'a person appears on two rows.');
  if(outcomesLeftOut.length)warnings.push(
    `This table also holds ${outcomesLeftOut.map(v=>`"${v}"`).join(', ')} in `
    +`"${outcomeColumn}", left out of this comparison. Those subjects are in neither column.`);
  const small=empty.filter(([count])=>count<SMALL_CELL);
  if(small.length)warnings.push(
    `${small.map(([count,label])=>`${label} is ${count}`).join(', ')}. `
    +`Below about ${SMALL_CELL} the normal approximations above are doing most of the work; `
    +'read the counts, not only the bounds.');
  if(strataLeftOut.length)warnings.push(
    `This table also holds ${strataLeftOut.map(v=>`"${v}"`).join(', ')} in `
    +`"${exposureColumn}", left out of this comparison. Those subjects are in neither group, so `
    +'the totals below are of the two named groups and not of the table.');
  return {kind:'two-by-two',request,cells,exposedTotal,unexposedTotal,
    caseTotal:a+c,nonCaseTotal:b+d,total:exposedTotal+unexposedTotal,
    riskExposed,riskUnexposed,estimates,strataLeftOut,outcomesLeftOut,warnings};
}

/** The sentence a reader should be given, with both groups named and the estimand said out loud.
 *
 *  Named here rather than in the Inspector for the reason `rateRatioSentence` is: the figure, the
 *  table and the receipt cannot word the same finding three ways. */
export const twoByTwoSentence=(r:TwoByTwoResult):string=>{
  const {exposed,unexposed,caseValue}=r.request;
  const pct=(risk:number|null)=>risk===null?'none':`${(risk*100).toFixed(3)}%`;
  // THE FIRST MEASURE REPORTED LEADS, which is the risk ratio unless a design or a practitioner
  // removed it. A difference is printed finer than a ratio because it is usually far smaller.
  const lead=r.estimates[0];
  const said=lead?(lead.reportedAs??lead.name):'';
  const digits=/difference/.test(said)?4:2;
  const proportions=r.reading?.rowProportion===null?''
    :` ${pct(r.riskExposed)} ${caseValue} against ${pct(r.riskUnexposed)}`;
  const comma=proportions?',':'';
  return `${exposed} against ${unexposed}:`+proportions
    +(!lead?`${comma} with no measure reported under this design`
      :lead.value!==null
      ?`${comma} ${/^[aeiou]/.test(said)?'an':'a'} ${said} of ${lead.value.toFixed(digits)} `
        +`(${lead.level}% interval ${lead.lower!.toFixed(digits)} to ${lead.upper!.toFixed(digits)}, `
        +`${lead.method})`
      :`${comma} with no ${said}: ${lead.unavailable??''}`)
    +`, from ${r.exposedTotal.toLocaleString()} and ${r.unexposedTotal.toLocaleString()} subjects.`;
};

export function twoByTwoReceipt(node:{id:string},result:TwoByTwoResult,runId:string,
  sourceNodeId:string){
  const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const quote=(v:string)=>JSON.stringify(v);
  const num=(v:number)=>`"${v}"^^xsd:double`;
  const {cells,request}=result;
  const estimateFacts=result.estimates.map(estimate=>
    `${entity} fw:estimate [ a fw:EpiEstimate; fw:estimateName ${quote(estimate.reportedAs??estimate.name)}; `
    +`fw:intervalMethod ${quote(estimate.method)}; `
    +`fw:intervalLevel "${estimate.level}"^^xsd:integer; `
    +(estimate.value===null
      ?`fw:estimateUnavailable ${quote(estimate.unavailable??'')}`
      :`fw:estimateValue ${num(estimate.value)}; fw:intervalLower ${num(estimate.lower!)}; `
        +`fw:intervalUpper ${num(estimate.upper!)}`)
    // Written even when null, so a receipt states that nobody has verified the label rather than
    // staying silent about a field the direction requires. See epi-estimate.ts.
    // THE SOURCE TRAVELS WITH THE LABEL, always. A receipt carrying `fw:epiInfoLabel` and no
    // provenance would let a label deduced from a sibling project's results panel be read as one
    // verified against Epi Info -- two different claims, and the distinction this pair of fields
    // exists to keep.
    +(estimate.epiInfoLabel
      ?`; fw:epiInfoLabel ${quote(estimate.epiInfoLabel)}; `
        +`fw:epiInfoLabelSource ${quote(estimate.epiInfoLabelSource??'unstated')}; `
        +`fw:epiInfoLabelStatus ${quote(estimate.epiInfoLabelSource==='epi-info'?'verified':'deduced')}`
      :'; fw:epiInfoLabelStatus "unread"')+' ].').join('\n');
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:TwoByTwo;\n`
    +`  prov:wasDerivedFrom <urn:fieldwork:run:${runId}:output:${sourceNodeId}>;\n`
    +`  fw:exposureAttribute ${quote(request.exposureColumn)};\n`
    +`  fw:exposedGroup ${quote(request.exposed)};\n`
    +`  fw:unexposedGroup ${quote(request.unexposed)};\n`
    +`  fw:outcomeAttribute ${quote(request.outcomeColumn)};\n`
    +`  fw:caseValue ${quote(request.caseValue)};\n`
    +`  fw:exposedCaseCount "${cells.exposedCases}"^^xsd:integer;\n`
    +`  fw:exposedNonCaseCount "${cells.exposedNonCases}"^^xsd:integer;\n`
    +`  fw:unexposedCaseCount "${cells.unexposedCases}"^^xsd:integer;\n`
    +`  fw:unexposedNonCaseCount "${cells.unexposedNonCases}"^^xsd:integer;\n`
    +`  fw:subjectCount "${result.total}"^^xsd:integer`
    +result.strataLeftOut.map(value=>`;\n  fw:stratumLeftOut ${quote(value)}`).join('')
    +(result.reading?.withheld??[]).map(name=>`;\n  fw:withheldEstimate ${quote(name)}`).join('')
    +(result.reading?.notEstimable??[]).map(name=>`;\n  fw:notEstimable ${quote(name)}`).join('')
    +(result.reading?.design===null?`;\n  fw:noDesignDeclared true`:'')
    +`.\n`
    +estimateFacts+'\n';
  return {nodeId:node.id,kind:'computation' as const,facts,rules:'',input:facts,conclusions:[],
    method:twoByTwoSentence(result)
      +' Each estimate names its interval method, and the label Epi Info AI\'s results panel'
      +' prints for the same quantity, read from that panel rather than from Epi Info itself.'
      +' No agreement with Epi Info is claimed: the labels are a deduction from a sibling'
      +' project synthesized from it, and the numbers are standard methods named honestly.'
      +' A contrast between two groups as they were supplied, not a measured effect: nothing'
      +' here adjusts for anything the two groups did not share.'
      +result.warnings.map(warning=>` ${warning}`).join('')};
}

/** THE COMPLETE TWO-BY-TWO: the four cells in their letters, every margin, and the total.
 *
 *  The practitioner, 2026-10-31, on the figure the node published: *"This 2x2 table claims it has
 *  the risk ratio but it does not"*, and then: *"The margin totals are also missing ... The
 *  rationale for labeling each cell A, B, C, D, totals A+C, etc. is because the equations map
 *  these labels, and in fact should come as a unit. You see the complete 2x2 table, the equations
 *  and the value substitutions, that makes for a very clear process in the Methods."*
 *
 *  WHAT WAS WRONG. `core.ts` published four bare counts and carried this whole result along on
 *  the value, where nothing read it: `caseTotal`, `nonCaseTotal` and `total` reached no surface at
 *  all, and `riskExposed`/`riskUnexposed` reached none either. The machined note meanwhile names
 *  $a$, $b$, $c$ and $d$ and writes every formula in $a+b$ and $c+d$ -- and justified doing so by
 *  saying the letters were "prose about the letters rather than a second rendering of the table
 *  the node already draws". The table the node already drew had no letters and no margins, so the
 *  formulas pointed at nothing a reader could see.
 *
 *  THE LETTERS ARE THE JOIN, which is the practitioner's point and the reason this is one
 *  structure rather than two. $\mathrm{RR} = (a/(a+b)) / (c/(c+d))$ is checkable by eye only when
 *  $a$ and $a+b$ are both on the figure. An FETP-trained reader is taught the letters; the
 *  equations are written in them; the table has to carry them or the notation is decoration.
 *
 *  A MARGIN IS DERIVED AND IS NOT A CELL. Each one carries the expression it was computed from
 *  rather than a bare number, so a total cannot be read as a fifth observed count -- the same
 *  distinction `cellOf` enforces when it refuses to treat an empty cell as a zero. `total` is
 *  the two named groups and not the source table, which is what `strataLeftOut` warns about and
 *  what this makes checkable: South London's N is 186,787 against a table of 486,936.
 *
 *  Pure, and stating no markup: the result tab, Quick Look and the write-up's figure all draw
 *  from this, and a second arrangement of the same numbers is how two surfaces come to disagree.
 */
export interface TwoByTwoMargin {
  /** The margin in the letters the equations use: `a+b`, `a+c`, `N`. */
  expression:string;
  value:number;
}
export interface TwoByTwoGrid {
  exposureColumn:string; outcomeColumn:string;
  /** Exposed then unexposed, as the request named them. */
  rowLabels:[string,string];
  /** Case then non-case. */
  columnLabels:[string,string];
  /** In reading order: a, b on the first row; c, d on the second. */
  cells:[[{letter:string;value:number},{letter:string;value:number}],
         [{letter:string;value:number},{letter:string;value:number}]];
  rowTotals:[TwoByTwoMargin,TwoByTwoMargin];
  columnTotals:[TwoByTwoMargin,TwoByTwoMargin];
  total:TwoByTwoMargin;
}

export function twoByTwoGrid(result:TwoByTwoResult):TwoByTwoGrid{
  const {exposureColumn,outcomeColumn,exposed,unexposed,caseValue,nonCaseValue}=result.request;
  const c=result.cells;
  return {
    exposureColumn,outcomeColumn,
    rowLabels:[exposed,unexposed],
    columnLabels:[caseValue,nonCaseValue],
    cells:[[{letter:'a',value:c.exposedCases},{letter:'b',value:c.exposedNonCases}],
           [{letter:'c',value:c.unexposedCases},{letter:'d',value:c.unexposedNonCases}]],
    rowTotals:[{expression:'a+b',value:result.exposedTotal},
               {expression:'c+d',value:result.unexposedTotal}],
    columnTotals:[{expression:'a+c',value:result.caseTotal},
                  {expression:'b+d',value:result.nonCaseTotal}],
    total:{expression:'N',value:result.total},
  };
}

/** AN ESTIMATE AS A READER OF A JOURNAL MEETS IT: the value, its interval, and the method that
 *  produced the interval.
 *
 *  The practitioner, 2026-10-31: *"And confidence intervals are reported where needed. Certain
 *  journals will even require them."* They are computed already, at the level the step declares
 *  -- `INTERVAL_LEVELS` offers 90, 95 and 99 -- and until now they reached a reader only as
 *  typeset mathematics inside the Methods note. Nothing is estimated here that was not estimated
 *  before; this reports what `computeTwoByTwo` already returned.
 *
 *  AN ESTIMATE WITHOUT AN INTERVAL SAYS WHY, rather than printing a blank. `unavailable` carries
 *  the reason and `interval` is null, which are two different facts from an interval of zero
 *  width -- the distinction every other absence in this project is held to. */
export interface TwoByTwoEstimateRow {
  name:string;
  value:number|null;
  /** Null where there is none, in which case `unavailable` says why. */
  interval:{lower:number;upper:number;level:IntervalLevel}|null;
  method:string;
  unavailable:string|null;
  /** What Epi Info calls the same quantity, where a source has been read for it. */
  epiInfoLabel:string|null;
}

export const twoByTwoEstimateRows=(result:TwoByTwoResult):TwoByTwoEstimateRow[]=>
  result.estimates.map(e=>({
    name:e.reportedAs??e.name,value:e.value,
    interval:e.lower===null||e.upper===null?null:{lower:e.lower,upper:e.upper,level:e.level},
    method:e.method,unavailable:e.unavailable,epiInfoLabel:e.epiInfoLabel,
  }));
