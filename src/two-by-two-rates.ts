/** THE TWO-BY-TWO'S RATE LAYOUT: events and units at risk in each group, and the rate ratio over them.
 *
 *  The practitioner, 2026-11-05, on the Rate ratio widget: *"It should be in the Epi kernel 2x2 widget I think that's
 *  what we decided"* -- experiment 161's step 6, one substrate and a family of measures over it. The Rate ratio widget
 *  read only a Rate step's result, so Snow's Table IX had to pass through a Rate to be compared; this reads the table.
 *
 *  WHY A SECOND LAYOUT AND NOT THE FOUR CELLS. A rate's denominator is not a non-case count. Snow's houses can hold
 *  more than one death, and person-time is not a count of anybody, so `units at risk - events` is no cell of anything.
 *  The four letters a, b, c, d would therefore name quantities that do not exist; this layout has its own letters,
 *  $a_1$, $n_1$, $a_0$ and $n_0$, the ones the rate ratio's equation was already written in.
 *
 *  THE ARITHMETIC IS UNCHANGED. `rateRatio` in `epi-estimate.ts` is the kernel's, the function the Rate ratio widget
 *  called, so South London's 8.401853429780243 (6.84096208049671 to 10.31889085553658) is the same to the bit. */
import type {DataTable} from './data-table.js';
import type {EpiEstimate,IntervalLevel} from './epi-estimate.js';
import {estimateUnavailable,quantileFor,rateRatio} from './epi-estimate.js';
import {cellOf,type TwoByTwoRequest} from './two-by-two.js';

/** Below this many events the log-normal interval is an approximation doing most of the work. Reported, never a
 *  refusal: the threshold the Rate ratio widget used. */
export const SMALL_EVENT_COUNT=5;

export interface RateCells {
  exposedEvents:number; exposedUnitsAtRisk:number;
  unexposedEvents:number; unexposedUnitsAtRisk:number;
}
export interface RateTwoByTwoResult {
  kind:'two-by-two';
  /** What tells this result from the four-cell one. Every surface that draws a two-by-two branches on it. */
  layout:'rates';
  request:TwoByTwoRequest&{unitsAtRiskValue:string};
  cells:RateCells;
  /** Events per unit at risk, unscaled: a multiplier is a presentation and cancels in the ratio. */
  rateExposed:number; rateUnexposed:number;
  estimates:EpiEstimate[];
  strataLeftOut:string[];
  outcomesLeftOut:string[];
  warnings:string[];
  /** `design` null means none was connected. A rate ratio keeps its name either way, as a Poisson regression's does:
   *  events over units at risk is a rate under any design, and a design decides only whether it may be reported. */
  reading?:{design:string|null; rowProportion:null; withheld:string[]; notEstimable:string[]};
}

export const isRateLayout=(result:unknown):result is RateTwoByTwoResult=>
  (result as {kind?:string;layout?:string})?.kind==='two-by-two'&&(result as {layout?:string}).layout==='rates';

const RATE_RATIO='rate ratio',LOG_NORMAL='log-normal';

export function computeRateTwoByTwo(table:DataTable,request:TwoByTwoRequest):RateTwoByTwoResult{
  const {exposureColumn,outcomeColumn,exposed,unexposed,caseValue,level}=request;
  const unitsAtRiskValue=request.unitsAtRiskValue?.trim()??'';
  quantileFor(level);
  if(!unitsAtRiskValue)throw new Error('Name the value of the outcome column that holds the units at risk.');
  if(request.rowsAreSubjects)
    throw new Error('A line list has no units at risk to read: each row is one subject. Read the table as cases '
      +'and non-cases, or total it to events and units at risk per group first.');
  if((request as {exposureColumns?:string[]}).exposureColumns?.length)
    throw new Error('The rate layout compares one exposure. Several exposures are read from a line list, which has '
      +'no units at risk.');
  for(const [name,column] of [['exposure',exposureColumn],['outcome',outcomeColumn]] as const){
    if(!column.trim())throw new Error(`Name the column holding the ${name}.`);
    if(!table.keys.includes(column))
      throw new Error(`This table has no "${column}" column to read the ${name} from. `
        +`Its columns are ${table.keys.join(', ')}.`);
  }
  if(exposureColumn===outcomeColumn)
    throw new Error('The exposure and the outcome must be different columns.');
  if(exposed===unexposed)
    throw new Error('The exposed and unexposed groups must be different values. A group compared with itself gives '
      +'a rate ratio of 1 by construction, which measures nothing.');
  if(caseValue===unitsAtRiskValue)
    throw new Error('The events and the units at risk must be different values of the outcome column.');

  const cells:RateCells={
    exposedEvents:cellOf(table,request,exposed,caseValue),
    exposedUnitsAtRisk:cellOf(table,request,exposed,unitsAtRiskValue,'units'),
    unexposedEvents:cellOf(table,request,unexposed,caseValue),
    unexposedUnitsAtRisk:cellOf(table,request,unexposed,unitsAtRiskValue,'units')};
  const {exposedEvents:a1,exposedUnitsAtRisk:n1,unexposedEvents:a0,unexposedUnitsAtRisk:n0}=cells;
  for(const [n,group] of [[n1,exposed],[n0,unexposed]] as const)
    if(!n)throw new Error(`"${group}" has no ${unitsAtRiskValue}, so it has no rate. `
      +'A count without units at risk is not a rate.');

  const estimates:EpiEstimate[]=[];
  // A ZERO CELL IS NOT A SMALL NUMBER. The log of zero is not a number, and adding half an event to every cell is a
  // choice somebody made, not a fact about the group. The estimate says why it has no value, as the four-cell
  // layout's do; the Rate ratio widget refused the whole step, which left the counts unseen.
  if(!a0)estimates.push(estimateUnavailable(RATE_RATIO,level,LOG_NORMAL,
    `"${unexposed}" has 0 ${caseValue}, so its rate is zero and the ratio has no value. Adding half an event would `
    +'make one, but that is an assumption rather than a measurement.'));
  else if(!a1)estimates.push(estimateUnavailable(RATE_RATIO,level,LOG_NORMAL,
    `"${exposed}" has 0 ${caseValue}, so the ratio is 0 and its log interval is undefined.`));
  else estimates.push({name:RATE_RATIO,...rateRatio(a1,n1,a0,n0,level as IntervalLevel),level,
    method:LOG_NORMAL,conventionalLabel:null,conventionalLabelSource:null,unavailable:null,
    notes:[`A rate per ${unitsAtRiskValue}. Both rates are per the same thing, so the ratio is dimensionless.`,
      // The assumption a reader will ask about, stated with the result. Experiment 139.
      'It treats the events as independent, which a transmitted disease is not: events that cluster are '
        +'over-dispersed, so an interval of this kind is narrower than the data warrants.']});

  const named=new Set([exposed,unexposed]);
  const strataLeftOut=[...new Set(table.rows.map(row=>row.key[exposureColumn]))]
    .filter(value=>value!==undefined&&!named.has(value));
  const namedOutcomes=new Set([caseValue,unitsAtRiskValue]);
  const outcomesLeftOut=[...new Set(table.rows.map(row=>row.key[outcomeColumn]))]
    .filter(value=>value!==undefined&&!namedOutcomes.has(value));
  const warnings:string[]=[];
  const small=[[a1,exposed],[a0,unexposed]].filter(([count])=>(count as number)<SMALL_EVENT_COUNT);
  if(small.length)warnings.push(
    `${small.map(([count,group])=>`${group} has ${count} ${caseValue}`).join(' and ')}. `
    +`Below about ${SMALL_EVENT_COUNT} events the log-normal interval is an approximation doing most of the work; `
    +'read the counts, not only the bounds.');
  if(outcomesLeftOut.length)warnings.push(
    `This table also holds ${outcomesLeftOut.map(v=>`"${v}"`).join(', ')} in "${outcomeColumn}", not read here.`);
  if(strataLeftOut.length)warnings.push(
    `This table also holds ${strataLeftOut.map(v=>`"${v}"`).join(', ')} in "${exposureColumn}", left out of this `
    +'comparison. Those groups are in neither row, so the totals are of the two named groups and not of the table.');
  return {kind:'two-by-two',layout:'rates',request:{...request,unitsAtRiskValue},cells,
    rateExposed:a1/n1,rateUnexposed:a0/n0,estimates,strataLeftOut,outcomesLeftOut,warnings};
}

/** What a declared design does to the rate layout: the rate ratio is reported where the design licenses one, and the
 *  step stops where it does not. Read from `RATE_RATIO_LICENCES`, which the regression's Poisson licences are tested
 *  against, so the two widgets cannot disagree about what a design permits. */
export const readRatesUnderDesign=(result:RateTwoByTwoResult,design:string):RateTwoByTwoResult=>
  ({...result,reading:{design,rowProportion:null,withheld:[],notEstimable:[]}});
export const readRatesUndeclared=(result:RateTwoByTwoResult):RateTwoByTwoResult=>
  ({...result,reading:{design:null,rowProportion:null,withheld:[],notEstimable:[]}});

const figure=(value:number):string=>value.toLocaleString('en-US');

/** THE LAYOUT AS A FIGURE: events, units at risk and the rate in each group, in the letters the equation uses, with
 *  the column totals. Pure markup over an escape function, like `twoByTwoTableMarkup`. */
export function rateTableMarkup(result:RateTwoByTwoResult,esc:(value:string)=>string):string{
  const {exposureColumn,exposed,unexposed,caseValue,unitsAtRiskValue}=result.request;
  const c=result.cells;
  const rate=(value:number)=>value.toLocaleString('en-US',{maximumSignificantDigits:5});
  const td=(letter:string,value:string,kind:'cell'|'margin'|'total')=>
    `<td class="tbt-${kind}"><span class="tbt-letter">${esc(letter)}</span>`
    +`<span class="tbt-value">${esc(value)}</span></td>`;
  const row=(label:string,a:number,n:number,i:'1'|'0')=>
    `<tr><th scope="row">${esc(label)}</th>`+td(`a${i}`,figure(a),'cell')+td(`n${i}`,figure(n),'cell')
    +td(`a${i}/n${i}`,rate(a/n),'margin')+'</tr>';
  return `<table class="two-by-two" data-layout="rates"><thead><tr>`
    +[exposureColumn,caseValue,unitsAtRiskValue,'Rate'].map(name=>`<th scope="col">${esc(name)}</th>`).join('')
    +`</tr></thead><tbody>`
    +row(exposed,c.exposedEvents,c.exposedUnitsAtRisk,'1')
    +row(unexposed,c.unexposedEvents,c.unexposedUnitsAtRisk,'0')
    +`<tr class="tbt-margins"><th scope="row">Total</th>`
    +td('a1+a0',figure(c.exposedEvents+c.unexposedEvents),'margin')
    +td('n1+n0',figure(c.exposedUnitsAtRisk+c.unexposedUnitsAtRisk),'margin')
    +td('',rate((c.exposedEvents+c.unexposedEvents)/(c.exposedUnitsAtRisk+c.unexposedUnitsAtRisk)),'total')
    +`</tr></tbody></table>`;
}
