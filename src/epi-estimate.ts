/** One shape for every estimate this application computes, and the quantiles they share.
 *
 *  STEP ZERO of the epi kernel, written before the second estimate rather than after the fifth.
 *  The three widgets in the Epidemiology group arrived one at a time and each invented its own
 *  result: `rate` declares a denominator class and a vintage, `rate_ratio` declares an interval
 *  method and a level, `case_series` declares a kind of date. Nothing is shared, so every new
 *  estimate re-argues what a result owes a reader -- and the arguing is the part that gets
 *  skipped under a deadline.
 *
 *  WHAT AN ESTIMATE OWES A READER, from the direction
 *  `recognisable-not-identical-an-epi-kernel-of-our-own` (2026-10-26). A value, an interval with
 *  its level, THE METHOD BY ITS REAL NAME, and the conventional name a reader knows it by. The last two
 *  are separate fields on purpose, because the direction's hardest finding is that they can
 *  disagree: `legacyBreslowDayOddsRatio` ports a Woolf weighted log-odds dispersion that the
 *  legacy output labels "Breslow-Day test for Odds". A single `label` field would force a choice
 *  between being correct and being recognisable. Two fields say both.
 *
 *  `conventionalLabel` IS READ OFF A SOURCE OR IT IS NULL. Never filled from memory: that is how a
 *  wrong label enters a teaching context.
 *
 *  WHICH SOURCE, AND WHY IT IS NAMED SEPARATELY. The practitioner, 2026-10-26, pointed at a results panel that renders
 *  these estimates as the closest available source. The labels carried here were read from that panel, which builds its
 *  estimate table from literal strings: a rendering of the original program, not the original, which makes it a good
 *  deduction and not a verification.
 *
 *  Hence `conventionalLabelSource`, beside the label rather than folded into it. A label whose
 *  provenance is unstated would let a deduced string be read as a verified one, which is the same
 *  class of error as the Breslow-Day mislabelling this pair of fields exists to survive. The
 *  receipt writes the source, and a reader can tell "what a rendering prints" from "what the original prints" -- two
 *  claims that happen to coincide on these four rows and need not in general.
 *
 *  AN ESTIMATE MAY BE UNAVAILABLE WITHOUT THE TABLE BEING UNREADABLE. Snow's Lambeth-only
 *  stratum has 18 deaths and a defined risk ratio; a stratum with zero would not, while its risk
 *  difference stays perfectly well defined. `rate_ratio` refuses the whole computation on a zero
 *  cell, which is right when the ratio IS the output. Here several estimates are computed
 *  together, so refusing all of them because one is undefined would withhold numbers that are
 *  sound. Each estimate carries its own availability and its own reason.
 */

import {kernel} from './kernel.js';

/** Two-sided normal quantiles, to the precision the arithmetic can use.
 *
 *  Moved here from `rate-ratio.ts`, which is the first thing a shared vocabulary buys: the
 *  constant that check 27 found rounded to 1.9600 now exists once, so the next estimate cannot
 *  reintroduce the same defect by typing a textbook value into its own file. */
export const Z_FOR_LEVEL:Record<number,number>=
  {90:1.6448536269514722,95:1.959963984540054,99:2.5758293035489004};
export const INTERVAL_LEVELS=[90,95,99] as const;
export type IntervalLevel=typeof INTERVAL_LEVELS[number];

export function quantileFor(level:number):number {
  const z=Z_FOR_LEVEL[level];
  if(z===undefined)throw new Error(`${level}% is not an interval level this computes. `
    +`It computes ${INTERVAL_LEVELS.join(', ')}.`);
  return z;
}

export interface EpiEstimate {
  /** What this estimate IS, in this project's words: `risk ratio`, not `RR`. */
  name:string;
  /** What a declared design calls it, where that differs: the same arithmetic as `name`, measuring
   *  a prevalence rather than a risk. `name` stays the computation; every surface prints this. */
  reportedAs?:string;
  /** The point estimate, or null when it is undefined for this table. */
  value:number|null;
  lower:number|null;
  upper:number|null;
  level:IntervalLevel;
  /** The interval method by its real name -- `Katz log`, `Wald log`, `Wald unpooled`. Stated even
   *  when the value is null, so a reader can tell "not computed" from "computed differently". */
  method:string;
  /** The conventional name a reader knows this quantity by, or null when no source has been read for it. */
  conventionalLabel:string|null;
  /** Where that label was read from. Never omitted when a label is present: a deduced label and a
   *  verified one are different claims, and only this field tells them apart. */
  conventionalLabelSource:ConventionalLabelSource|null;
  /** Why this estimate has no value, when it has none. Null when it does. */
  unavailable:string|null;
  /** Said with the estimate rather than left for a venue. */
  notes:string[];
}

/** The sources a label may come from, narrowest claim first.
 *
 *  `results-panel` is a deduction from a rendering of the original program;
 *  `original-program` would be the original's own output, which nobody here has read. Keeping them as
 *  separate values rather than one boolean means upgrading a label later is a change of value and
 *  not a change of meaning. */
export const CONVENTIONAL_LABEL_SOURCES=['results-panel','original-program'] as const;
export type ConventionalLabelSource=typeof CONVENTIONAL_LABEL_SOURCES[number];

export const estimateUnavailable=(name:string,level:IntervalLevel,method:string,reason:string,
  conventionalLabel:string|null=null,
  conventionalLabelSource:ConventionalLabelSource|null=null):EpiEstimate=>
  ({name,value:null,lower:null,upper:null,level,method,conventionalLabel,conventionalLabelSource,
    unavailable:reason,notes:[]});

/** A ratio's interval on the log scale, back-transformed: the shape every ratio here shares.
 *
 *  A ratio is not symmetric about its point estimate -- 2x and 0.5x are the same distance -- so
 *  the interval is computed where it is symmetric and transformed back. */
export const logInterval=(ratio:number,standardError:number,level:IntervalLevel)=>{
  const z=quantileFor(level);
  return {lower:Math.exp(Math.log(ratio)-z*standardError),
    upper:Math.exp(Math.log(ratio)+z*standardError)};
};

/** THE MEASURES, as functions of counts and nothing else. Experiment 161.
 *
 *  The arithmetic is the Rust kernel's, in `kernel/src/lib.rs`, and these only give it this
 *  project's shape. What a measure is called, what it refuses and what is said beside it stay with
 *  the caller, because those depend on the declared design and the table's own words.
 *
 *  A CALLER CHECKS FOR ZERO FIRST. Each reason a measure is undefined is worth saying in the
 *  reader's terms, which only the caller has. */
export interface Interval {value:number; lower:number; upper:number}

export function riskRatio(a:number,b:number,c:number,d:number,level:IntervalLevel):Interval{
  const z=quantileFor(level);
  return {value:kernel.risk_ratio(a,b,c,d),lower:kernel.risk_ratio_ci_lower(a,b,c,d,z),
    upper:kernel.risk_ratio_ci_upper(a,b,c,d,z)};
}
export function oddsRatio(a:number,b:number,c:number,d:number,level:IntervalLevel):Interval{
  const z=quantileFor(level);
  return {value:kernel.odds_ratio(a,b,c,d),lower:kernel.odds_ratio_ci_lower(a,b,c,d,z),
    upper:kernel.odds_ratio_ci_upper(a,b,c,d,z)};
}
export function riskDifference(a:number,b:number,c:number,d:number,level:IntervalLevel):Interval{
  const z=quantileFor(level);
  return {value:kernel.risk_difference(a,b,c,d),lower:kernel.risk_difference_ci_lower(a,b,c,d,z),
    upper:kernel.risk_difference_ci_upper(a,b,c,d,z)};
}
export function rateRatio(eventsA:number,unitsA:number,eventsB:number,unitsB:number,
  level:IntervalLevel):Interval{
  const z=quantileFor(level);
  return {value:kernel.rate_ratio(eventsA,unitsA,eventsB,unitsB),
    lower:kernel.rate_ratio_ci_lower(eventsA,unitsA,eventsB,unitsB,z),
    upper:kernel.rate_ratio_ci_upper(eventsA,unitsA,eventsB,unitsB,z)};
}
