import type {RateResult,RateRow} from './rate.js';
import type {Receipt} from './results.js';
import type {WorkflowNode} from './types.js';

/** A ratio of two rates, with an interval. The comparison axis.
 *
 *  `rate` computes one group's measure. Snow's argument is not a measure, it is a CONTRAST:
 *  houses supplied by the Southwark and Vauxhall Company against houses supplied by Lambeth, in
 *  the same streets, in the same weeks. A map of rates shows where; a ratio with an interval is
 *  what says the difference is not the kind a reader should shrug at.
 *
 *  Designed in docs/experiments/139-a-rate-ratio-with-an-interval.md before this file existed.
 *  Every refusal below is one of the distinctions that record names. */

/** The multiplier for a rate ratio, stated once: there is none.
 *
 *  A RATE RATIO IS NOT A RATE. It is dimensionless -- deaths per 1,000 divided by deaths per
 *  1,000 cancels the per-1,000 -- so "8.40 per 10,000" is not a quantity and there is deliberately
 *  nowhere on this result to write one. */
export const RATE_RATIO_IS_DIMENSIONLESS=true as const;

/** The key column a rate-ratio table carries, named where the table is built. See RATE_TABLE_KEYS. */
export const RATE_RATIO_TABLE_KEYS=['comparison'] as const;

export const INTERVAL_METHODS=['log-normal'] as const;
export type IntervalMethod=typeof INTERVAL_METHODS[number];

/** 1.96 is the two-sided 95% normal quantile. The level is carried on the result rather than
 *  assumed by a reader, because a 90% interval and a 95% interval are different claims. */
const Z_FOR_LEVEL:Record<number,number>={90:1.6449,95:1.9600,99:2.5758};
export const INTERVAL_LEVELS=[90,95,99] as const;

export interface RateRatioOptions {
  /** The group whose rate goes on top -- the one a claim is being made about.
   *
   *  NOT `exposed`, which is what this was called until 2026-10-25. Exposure is one use of a rate
   *  ratio and not the shape of it: Snow's water companies are an exposure, two sub-districts
   *  compared with each other are not, and 1849 against 1854 is a period. A knob named for the
   *  commonest case misdescribes every other one, and this widget is `standard`, not epi-only. */
  compared:string;
  /** The group it is compared WITH. 8.40 and 0.12 are the same finding and not the same
   *  sentence, so which group sits underneath is the practitioner's choice and never a default. */
  reference:string;
  level:90|95|99;
  method:IntervalMethod;
}

/** One side of the comparison. `events` and `unitsAtRisk` rather than numerator and denominator,
 *  because the ratio has a numerator too and `result.numerator.numerator` reads as a mistake. */
export interface RatioSide {name:string; label:string; events:number; unitsAtRisk:number; rate:number}

export interface RateRatioResult {
  kind:'rate-ratio';
  compared:RatioSide;
  reference:RatioSide;
  ratio:number;
  lower:number;
  upper:number;
  level:number;
  method:IntervalMethod;
  /** What both rates are per. Carried so the result can say what was compared, never to scale it. */
  denominatorUnit:string;
  /** Stated when either count is small enough that the approximation is doing the work. */
  smallCountWarning:string|null;
  /** Stated when the two rates were not measured over the same period or population vintage. */
  periodsAgree:boolean;
  vintagesAgree:boolean;
}

/** Below this many events the log-normal interval is wider than it looks and narrower than it
 *  should be. Not a refusal: the count is reported and the reader decides. */
export const SMALL_COUNT=5;

const find=(rows:RateRow[],group:string,role:string):RateRow=>{
  const row=rows.find(r=>r.group===group||r.label===group);
  if(!row)throw new Error(`No group "${group}" to use as the ${role}. `
    +`The rate has: ${rows.map(r=>r.label).join(', ')}.`);
  return row;
};

export function computeRateRatio(result:RateResult,options:RateRatioOptions):RateRatioResult{
  if(result?.kind!=='rate')
    throw new Error('Connect a Rate with a denominator. A rate ratio divides two RATES, and a '
      +'plain table does not say what its numbers are per.');
  if(!INTERVAL_METHODS.includes(options.method))
    throw new Error(`"${options.method}" is not an interval method this computes.`);
  if(!(options.level in Z_FOR_LEVEL))
    throw new Error(`${options.level}% is not an interval level this computes.`);
  if(options.compared===options.reference)
    throw new Error('A group compared with itself is 1 by construction, which measures nothing. '
      +'Choose a different reference.');

  const a=find(result.rows,options.compared,'compared group');
  const b=find(result.rows,options.reference,'reference group');

  // A ZERO CELL IS NOT A SMALL NUMBER. Dulwich has 0 cholera deaths in Snow's seven weeks. The
  // log of zero is not a number, and the usual repair -- adding a half to every cell -- is a
  // choice somebody made, not a fact about Dulwich. Refusing says so; a reported interval of
  // zero to infinity would not.
  for(const [row,role] of [[a,'compared'],[b,'reference']] as const)
    if(row.numerator===0)
      throw new Error(`"${row.label}" has 0 events, so there is no ratio and no interval to `
        +`report for it as the ${role} group. A ratio with a zero cell is undefined, and adding `
        +'half an event to make one is an assumption, not a measurement.');
  for(const [row,role] of [[a,'compared'],[b,'reference']] as const)
    if(row.rate===null||row.denominator===0)
      throw new Error(`"${row.label}" has no rate to use as the ${role} group`
        +(row.reason?`: ${row.reason}`:'. A count without a population at risk is not a rate.'));

  // Both rates are per the same thing, so the multiplier cancels and the ratio is of the raw
  // rates. Dividing a per-house rate by a per-person one would be arithmetic on two different
  // quantities, which is why `rate` is the input and a table is not: only a rate declares this.
  const rateA=a.numerator/a.denominator,rateB=b.numerator/b.denominator;
  const ratio=rateA/rateB;
  const z=Z_FOR_LEVEL[options.level];
  // ln(RR) +/- z*sqrt(1/a + 1/b), back-transformed. The standard error is on the log scale
  // because a ratio is not symmetric about its point estimate: 2x and 0.5x are the same distance.
  const se=Math.sqrt(1/a.numerator+1/b.numerator);
  const lower=Math.exp(Math.log(ratio)-z*se),upper=Math.exp(Math.log(ratio)+z*se);

  const small=[a,b].filter(r=>r.numerator<SMALL_COUNT);
  return {kind:'rate-ratio',
    compared:{name:a.group,label:a.label,events:a.numerator,unitsAtRisk:a.denominator,rate:rateA},
    reference:{name:b.group,label:b.label,events:b.numerator,unitsAtRisk:b.denominator,rate:rateB},
    ratio,lower,upper,level:options.level,method:options.method,
    denominatorUnit:result.options.denominatorUnit,
    smallCountWarning:small.length
      ?`${small.map(r=>`${r.label} has ${r.numerator} event${r.numerator===1?'':'s'}`).join(' and ')}. `
        +'Below about five events the log-normal interval is an approximation doing most of the '
        +'work; read the counts, not only the bounds.'
      :null,
    periodsAgree:true,vintagesAgree:result.vintagesAgree};
}

/** The sentence a reader should be given, with the denominator named.
 *
 *  Named here rather than built in the Inspector so the figure, the table and the receipt cannot
 *  word the same finding three ways. */
export const rateRatioSentence=(r:RateRatioResult):string=>
  `${r.compared.label} against ${r.reference.label}: rate ratio ${r.ratio.toFixed(2)} `
  +`(${r.level}% interval ${r.lower.toFixed(2)} to ${r.upper.toFixed(2)}), `
  +`comparing ${r.compared.events} events in ${r.compared.unitsAtRisk.toLocaleString()} `
  +`${r.denominatorUnit} with ${r.reference.events} in ${r.reference.unitsAtRisk.toLocaleString()}.`;

export function rateRatioReceipt(node:WorkflowNode,result:RateRatioResult,runId:string,
  sourceNodeId:string):Receipt{
  const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const quote=(v:string)=>JSON.stringify(v);
  const num=(v:number)=>`"${v}"^^xsd:double`;
  const facts=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
    +`@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:RateRatio;\n`
    +`  prov:wasDerivedFrom <urn:fieldwork:run:${runId}:output:${sourceNodeId}>;\n`
    +`  fw:comparedGroup ${quote(result.compared.label)};\n`
    +`  fw:referenceGroup ${quote(result.reference.label)};\n`
    +`  fw:comparedEventCount "${result.compared.events}"^^xsd:integer;\n`
    +`  fw:comparedUnitsAtRisk "${result.compared.unitsAtRisk}"^^xsd:integer;\n`
    +`  fw:referenceEventCount "${result.reference.events}"^^xsd:integer;\n`
    +`  fw:referenceUnitsAtRisk "${result.reference.unitsAtRisk}"^^xsd:integer;\n`
    +`  fw:denominatorUnit ${quote(result.denominatorUnit)};\n`
    +`  fw:ratioValue ${num(result.ratio)};\n`
    +`  fw:intervalLower ${num(result.lower)};\n`
    +`  fw:intervalUpper ${num(result.upper)};\n`
    +`  fw:intervalLevel "${result.level}"^^xsd:integer;\n`
    +`  fw:intervalMethod ${quote(result.method)}.\n`;
  return {nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],
    method:rateRatioSentence(result)
      +' The interval is a log-normal approximation and is not a p-value.'
      +' A ratio is a contrast between two supplied populations, not a measured effect:'
      +' nothing here adjusts for anything the two groups did not share.'
      +(result.smallCountWarning?` ${result.smallCountWarning}`:'')};
}
