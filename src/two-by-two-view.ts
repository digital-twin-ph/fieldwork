/** THE TWO-BY-TWO AS AN EPIDEMIOLOGIST READS IT, in its own markup.
 *
 *  The practitioner, 2026-10-31: *"So a 2x2 table is not a table in the data sense, but a table to
 *  represent an epidemiology tool complete with its standard formatting that epidemiologists
 *  understand."* [153](../docs/experiments/153-a-two-by-two-is-not-a-table.md) records the
 *  distinction and what modelling it as a data table cost: `two_by_two` declares `output:'table'`
 *  and fed a generic `table_output`, so the figure showed four bare counts while `caseTotal`,
 *  `nonCaseTotal`, `total`, `riskExposed` and `riskUnexposed` reached no surface anywhere, and the
 *  three estimates reached one -- as typeset mathematics inside the Methods note.
 *
 *  WHY THIS IS NOT A `TableView`. The letters have to sit ON the cells, and a `TableView` row is a
 *  map of column name to value: there is nowhere to put $a$ that is not either a second column or
 *  a string like `"a 844"`, and the second loses the number. Putting the instrument through the
 *  generic table path is the category error that produced the defect, so this draws its own.
 *
 *  THE LETTERS ARE THE JOIN, which is the whole reason for them. `equations.ts` writes every
 *  formula in $a$, $b$, $c$ and $d$ and justified carrying no table of its own on the grounds that
 *  the letters were "prose about the letters rather than a second rendering of the table the node
 *  already draws" -- while the table the node drew had neither letters nor margins. With both
 *  present, $\mathrm{RR} = (a/(a+b))/(c/(c+d))$ is checkable against cells a reader can see, which
 *  is the unit the practitioner asked for: the complete table, the equations, the substitutions.
 *
 *  OPTION A OF 153, TAKEN DELIBERATELY AND NOT SETTLING THE QUESTION. This draws whenever a value
 *  carries a `twoByTwo`, which leaves the port as `table` and breaks no wiring -- the arrangement
 *  `rate` and `case_series` already use for their charts. 153's Option B, a port and an output
 *  widget of its own, stays open; nothing here forecloses it, because this reads the result rather
 *  than the port.
 *
 *  Every number drawn here was computed by `computeTwoByTwo` and is reported, never recomputed:
 *  a second arithmetic for the same quantity is how two surfaces come to disagree.
 */
import type {Escape} from './types.js';
import type {TwoByTwoResult} from './two-by-two.js';
import {twoByTwoGrid,twoByTwoEstimateRows} from './two-by-two.js';

const count=(value:number):string=>value.toLocaleString('en-US');

/** Enough digits to tell two risks apart without implying precision nobody has. A risk of 0.00503
 *  against 0.00094 needs five; rounding to two would print 0.01 and 0.00 and lose the comparison
 *  the whole table exists to make. */
const estimateValue=(value:number|null):string=>
  value===null?'—'
  :Math.abs(value)>=1?value.toLocaleString('en-US',{maximumFractionDigits:2})
  :value.toLocaleString('en-US',{maximumFractionDigits:5});

/** A cell: its letter above, its count below. The letter is marked up separately so a stylesheet
 *  can set it apart and a reader can still select the number on its own. */
const cell=(letter:string,value:number,esc:Escape,kind:'cell'|'margin'|'total'):string=>
  `<td class="tbt-${kind}"><span class="tbt-letter">${esc(letter)}</span>`
  +`<span class="tbt-value">${esc(count(value))}</span></td>`;

/** THE COMPLETE TABLE: four cells, four margins, and the total of the two named groups.
 *
 *  `N` is the two groups and not the source table, which is what `strataLeftOut` warns about and
 *  what putting it on the figure makes checkable -- South London's N is 186,787 against a table
 *  totalling 486,936, and a reader who cannot see N cannot notice the difference. */
export function twoByTwoTableMarkup(result:TwoByTwoResult,esc:Escape):string{
  const g=twoByTwoGrid(result);
  const head=[g.exposureColumn,...g.columnLabels,'Total']
    .map(name=>`<th scope="col">${esc(name)}</th>`).join('');
  const bodyRow=(index:0|1):string=>
    `<tr><th scope="row">${esc(g.rowLabels[index])}</th>`
    +cell(g.cells[index][0].letter,g.cells[index][0].value,esc,'cell')
    +cell(g.cells[index][1].letter,g.cells[index][1].value,esc,'cell')
    +cell(g.rowTotals[index].expression,g.rowTotals[index].value,esc,'margin')
    +`</tr>`;
  return `<table class="two-by-two"><thead><tr>${head}</tr></thead><tbody>`
    +bodyRow(0)+bodyRow(1)
    +`<tr class="tbt-margins"><th scope="row">Total</th>`
    +cell(g.columnTotals[0].expression,g.columnTotals[0].value,esc,'margin')
    +cell(g.columnTotals[1].expression,g.columnTotals[1].value,esc,'margin')
    +cell(g.total.expression,g.total.value,esc,'total')
    +`</tr></tbody></table>`;
}

/** THE ESTIMATES, EACH WITH ITS INTERVAL AND THE METHOD THAT PRODUCED IT.
 *
 *  The practitioner, 2026-10-31: *"And confidence intervals are reported where needed. Certain
 *  journals will even require them."* Reported rather than computed: `computeTwoByTwo` already
 *  returns the interval at the level the step declared, and `INTERVAL_LEVELS` offers 90, 95 and
 *  99, so the level is printed rather than assumed to be 95.
 *
 *  AN ESTIMATE WITHOUT AN INTERVAL SAYS WHY. `unavailable` carries the reason -- a zero cell
 *  leaves a log interval undefined -- and printing a blank there would read as "no effect" rather
 *  than "not computable", which is the distinction every absence in this project is held to.
 *
 *  THE METHOD IS NAMED BESIDE THE NUMBER, not relegated to a note. Katz log and Wald log give
 *  different bounds on the same cells, and an interval whose method a reader cannot see is an
 *  interval they cannot check. The works themselves are in References -- 151's ruling, and 152's.
 */
export function twoByTwoEstimatesMarkup(result:TwoByTwoResult,esc:Escape):string{
  const rows=twoByTwoEstimateRows(result).map(row=>{
    const interval=row.interval
      ?`${esc(estimateValue(row.interval.lower))} to ${esc(estimateValue(row.interval.upper))}`
      :`<span class="tbt-absent" title="not computable, not zero">${esc(row.unavailable
        ||'No interval.')}</span>`;
    const level=row.interval?`${row.interval.level}%`:'';
    return `<tr><th scope="row">${esc(row.name)}</th>`
      +`<td class="tbt-value">${esc(estimateValue(row.value))}</td>`
      +`<td class="tbt-interval">${interval}</td>`
      +`<td class="tbt-level">${esc(level)}</td>`
      +`<td class="tbt-method">${esc(row.method)}</td></tr>`;
  }).join('');
  return `<table class="two-by-two-estimates"><thead><tr>`
    +`<th scope="col">Estimate</th><th scope="col">Value</th>`
    +`<th scope="col">Confidence interval</th><th scope="col">Level</th>`
    +`<th scope="col">Method</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** The instrument whole: the table, then the estimates, then whatever the computation warned
 *  about. The warnings are drawn rather than dropped because the one that matters most here --
 *  a stratum left out of the comparison -- is what makes N smaller than the table it came from. */
export function twoByTwoMarkup(result:TwoByTwoResult,esc:Escape,
  declared?:{design:string;unitOfAnalysis:string;sentence:string},unit?:string):string{
  const warnings=result.warnings.length
    ?`<p class="tbt-warning muted">${result.warnings.map(w=>esc(w)).join(' ')}</p>`:'';
  // THE DECLARED DESIGN, ABOVE THE NUMBERS RATHER THAN UNDER THEM. What a measure MEANS depends
  // on it -- a/(a+b) is a risk in a cohort, a prevalence in a cross-sectional survey and not a
  // quantity at all under case-control sampling -- so a reader needs it before they read the
  // cells, not after. Absent where nothing was declared: an undeclared design is not a cohort,
  // and a figure asserting one nobody chose would be worse than a figure asserting none.
  // WHAT THE CELLS COUNT, beside the design. This is the determinism failure the study-design
  // audit records: South London carries a rate ratio of 8.40 on HOUSES and a risk ratio of 5.35
  // on PEOPLE, both correct, and in the letters one computation took a+b as houses and the other
  // as people with nothing on either figure saying so. A letter is only as determinate as the
  // subject it counts, so the subject is printed where the letters are.
  const counts=unit?`<span class="tbt-unit">cells count ${esc(unit)}</span>`:'';
  const design=declared
    ?`<p class="tbt-design"><b>${esc(declared.design)}</b> \u00b7 unit of analysis: `
      +`${esc(declared.unitOfAnalysis)}${counts?' \u00b7 ':''}${counts}</p>`
    :(counts?`<p class="tbt-design">${counts}</p>`:'');
  const left=[...(result.reading?.withheld??[]),...(result.reading?.notEstimable??[])];
  const reported=result.estimates.length?twoByTwoEstimatesMarkup(result,esc)
    :`<p class="tbt-warning muted">No measure is reported under this design.</p>`;
  return `<div class="two-by-two-figure" data-figure="two-by-two">`
    +design
    +twoByTwoTableMarkup(result,esc)
    +reported
    +(left.length?`<p class="tbt-warning muted">Not reported: ${esc(left.join(', '))}.</p>`:'')
    +warnings
    +`</div>`;
}
