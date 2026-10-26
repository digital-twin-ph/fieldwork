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
import {estimateUnavailable,logInterval,quantileFor} from './epi-estimate.js';

export interface TwoByTwoRequest {
  /** The key column holding the exposure, and the two of its values being compared. */
  exposureColumn:string; exposed:string; unexposed:string;
  /** The key column holding the outcome, and which of its values is the case. */
  outcomeColumn:string; caseValue:string; nonCaseValue:string;
  level:IntervalLevel;
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
  warnings:string[];
}

/** Below this many cases the normal approximations are doing most of the work. Reported, never
 *  a refusal: the same threshold and the same choice as `rate_ratio`'s SMALL_COUNT. */
export const SMALL_CELL=5;

const cellOf=(table:DataTable,request:TwoByTwoRequest,exposure:string,outcome:string):number=>{
  const matching=table.rows.filter(row=>row.key[request.exposureColumn]===exposure
    &&row.key[request.outcomeColumn]===outcome);
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
  const RISK_RATIO='risk ratio',KATZ='Katz log';
  if(!c)estimates.push(estimateUnavailable(RISK_RATIO,level,KATZ,
    `"${unexposed}" has 0 ${caseValue}, so its risk is zero and the ratio has no value. `
    +'Adding half a case to every cell would make one, but that is an assumption rather than '
    +'a measurement.'));
  else if(!a)estimates.push(estimateUnavailable(RISK_RATIO,level,KATZ,
    `"${exposed}" has 0 ${caseValue}, so the ratio is 0 and its log interval is undefined.`));
  else {
    const ratio=riskExposed/riskUnexposed;
    const se=Math.sqrt(1/a-1/exposedTotal+1/c-1/unexposedTotal);
    estimates.push({name:RISK_RATIO,value:ratio,...logInterval(ratio,se,level),level,
      method:KATZ,epiInfoLabel:null,unavailable:null,
      // THE SUBJECT, not the estimand. What makes this incomparable with another ratio on this
      // canvas is what it counts, which is the thing the taught layout does not show.
      notes:[`A risk per ${table.unit?.trim()||'subject as this table counts them'}. `
        +'A ratio computed over a different subject -- a house rather than a person -- is a '
        +'different quantity even when the arithmetic looks the same.']});
  }

  // THE ODDS RATIO, Wald on the log scale. Every cell appears in the standard error, which is why
  // a single empty cell takes it out and leaves the risk ratio standing.
  const ODDS_RATIO='odds ratio',WALD_LOG='Wald log';
  const empty=[[a,`${exposed} ${caseValue}`],[b,`${exposed} ${nonCaseValue}`],
    [c,`${unexposed} ${caseValue}`],[d,`${unexposed} ${nonCaseValue}`]] as const;
  const zeroCells=empty.filter(([count])=>count===0).map(([,label])=>label);
  if(zeroCells.length)estimates.push(estimateUnavailable(ODDS_RATIO,level,WALD_LOG,
    `${zeroCells.join(' and ')} ${zeroCells.length===1?'is':'are'} zero. `
    +'The Wald interval takes the reciprocal of every cell, so a zero cell leaves it undefined.'));
  else {
    const ratio=(a*d)/(b*c);
    const se=Math.sqrt(1/a+1/b+1/c+1/d);
    estimates.push({name:ODDS_RATIO,value:ratio,...logInterval(ratio,se,level),level,
      method:WALD_LOG,epiInfoLabel:null,unavailable:null,
      notes:[...(riskExposed<0.1&&riskUnexposed<0.1
        ?['Both risks are under 10%, so the odds ratio is close to the risk ratio here. '
          +'They are still different quantities.']
        :['The outcome is common in at least one group, so the odds ratio is further from '
          +'the risk ratio than textbook examples suggest.'])]});
  }

  // THE RISK DIFFERENCE, unpooled Wald, and symmetric: a difference is on the scale it was
  // measured on, so no log and no back-transformation.
  const z=quantileFor(level);
  const difference=riskExposed-riskUnexposed;
  const seDifference=Math.sqrt(riskExposed*(1-riskExposed)/exposedTotal
    +riskUnexposed*(1-riskUnexposed)/unexposedTotal);
  estimates.push({name:'risk difference',value:difference,
    lower:difference-z*seDifference,upper:difference+z*seDifference,level,
    method:'Wald unpooled',epiInfoLabel:null,unavailable:null,
    notes:['A difference of risks, on the same scale as the risks themselves. '
      +'Unpooled: each group contributes its own variance rather than a common one.']});

  const named=new Set([exposed,unexposed]);
  const strataLeftOut=[...new Set(table.rows.map(row=>row.key[exposureColumn]))]
    .filter(value=>value!==undefined&&!named.has(value));
  const warnings:string[]=[];
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
    riskExposed,riskUnexposed,estimates,strataLeftOut,warnings};
}

/** The sentence a reader should be given, with both groups named and the estimand said out loud.
 *
 *  Named here rather than in the Inspector for the reason `rateRatioSentence` is: the figure, the
 *  table and the receipt cannot word the same finding three ways. */
export const twoByTwoSentence=(r:TwoByTwoResult):string=>{
  const {exposed,unexposed,caseValue}=r.request;
  const pct=(risk:number|null)=>risk===null?'no risk':`${(risk*100).toFixed(3)}%`;
  const ratio=r.estimates.find(e=>e.name==='risk ratio');
  return `${exposed} against ${unexposed}: `
    +`${pct(r.riskExposed)} ${caseValue} against ${pct(r.riskUnexposed)}`
    +(ratio?.value!==null&&ratio!==undefined
      ?`, a risk ratio of ${ratio.value!.toFixed(2)} `
        +`(${ratio.level}% interval ${ratio.lower!.toFixed(2)} to ${ratio.upper!.toFixed(2)}, `
        +`${ratio.method})`
      :`, with no risk ratio: ${ratio?.unavailable??''}`)
    +`, from ${r.exposedTotal.toLocaleString()} and ${r.unexposedTotal.toLocaleString()} subjects.`;
};

export function twoByTwoReceipt(node:{id:string},result:TwoByTwoResult,runId:string,
  sourceNodeId:string){
  const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const quote=(v:string)=>JSON.stringify(v);
  const num=(v:number)=>`"${v}"^^xsd:double`;
  const {cells,request}=result;
  const estimateFacts=result.estimates.map(estimate=>
    `${entity} fw:estimate [ a fw:EpiEstimate; fw:estimateName ${quote(estimate.name)}; `
    +`fw:intervalMethod ${quote(estimate.method)}; `
    +`fw:intervalLevel "${estimate.level}"^^xsd:integer; `
    +(estimate.value===null
      ?`fw:estimateUnavailable ${quote(estimate.unavailable??'')}`
      :`fw:estimateValue ${num(estimate.value)}; fw:intervalLower ${num(estimate.lower!)}; `
        +`fw:intervalUpper ${num(estimate.upper!)}`)
    // Written even when null, so a receipt states that nobody has verified the label rather than
    // staying silent about a field the direction requires. See epi-estimate.ts.
    +(estimate.epiInfoLabel?`; fw:epiInfoLabel ${quote(estimate.epiInfoLabel)}`
      :'; fw:epiInfoLabelStatus "unverified"')+' ].').join('\n');
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
    +result.strataLeftOut.map(value=>`;\n  fw:stratumLeftOut ${quote(value)}`).join('')+`.\n`
    +estimateFacts+'\n';
  return {nodeId:node.id,kind:'computation' as const,facts,rules:'',input:facts,conclusions:[],
    method:twoByTwoSentence(result)
      +' Each estimate names its interval method; none claims agreement with Epi Info, whose'
      +' displayed labels for these quantities nobody here has verified.'
      +' A contrast between two groups as they were supplied, not a measured effect: nothing'
      +' here adjusts for anything the two groups did not share.'
      +result.warnings.map(warning=>` ${warning}`).join('')};
}
