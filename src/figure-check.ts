import {orderBins} from './chart-output.js';
import type {ChartSummary} from './results.js';

/** DOES THE PICTURE SAY WHAT THE FIGURE CLAIMS?
 *
 *  Raised by the practitioner on 2026-10-31: *"I think we need some form of automated chart and
 *  map validation."* The evidence was that day's defects, every one of which was found by LOOKING
 *  at a figure while 1,295 unit tests and 740 browser tests passed -- a node labelled "ranked"
 *  over alphabetical bars, a category with neither a bar nor a number, and, found the same day in
 *  the running application, a chart that asked for `smallest` and drew largest-first because
 *  `orderBins` was called in one renderer and not the other.
 *
 *  What was testable before this was THAT a chart rendered. These checks ask whether what it drew
 *  agrees with what it was asked to draw, and they read the figure as a reader does -- bar
 *  lengths and the labels beside them -- rather than comparing images. A screenshot differ fails
 *  on a font and says nothing about a wrong bar; this says which bar and by how much.
 *
 *  IT REPORTS AND DOES NOT GRADE. Every check returns what it found, so a caller decides what is
 *  a failure. A figure is allowed to be odd on purpose. */

/** One bar as a reader meets it: the text beside it, and how long it is in the drawn figure.
 *  Pixels or any other unit -- only ratios are compared, so the unit never has to be stated. */
export interface DrawnBar {label:string; length:number}

export interface FigureFault {check:string; detail:string}

/** The proportion by which a bar may differ from its value before it is reported. Vega rounds to
 *  device pixels and a 300-pixel plot carries about three significant figures, so a tolerance
 *  below this reports arithmetic that is correct. */
export const LENGTH_TOLERANCE=0.02;

/** Checks the drawn bars against the bins the figure was built from.
 *
 *  `drawn` must be in the order the reader meets them: left to right for a vertical chart, top to
 *  bottom for a horizontal one. That IS the claim being checked -- a caller that sorts them first
 *  has thrown away the only evidence of the ordering defect. */
export function checkDrawnBars(chart:ChartSummary,drawn:readonly DrawnBar[],
    tolerance:number=LENGTH_TOLERANCE):FigureFault[]{
  const faults:FigureFault[]=[];
  const expected=orderBins(chart.bins,chart.barOrder);
  // AN AXIS TRUNCATES, AND A TRUNCATED LABEL IS STILL THAT CATEGORY. Vega writes "Southwark and
  // Vauxhall Comp\u2026" where the column is narrower than the name, so comparing the drawn text
  // to the bin's would report every long label as a category the figure does not hold -- the
  // check would fail loudest on exactly the figures it was built for. Resolved by prefix, and
  // ONLY when the prefix picks out one bin: a truncation that matches two categories is reported,
  // because then the figure genuinely cannot be read.
  const bars=drawn.map(bar=>{
    if(!/[\u2026]$|\.\.\.$/.test(bar.label))return bar;
    const stem=bar.label.replace(/([\u2026]|\.\.\.)$/,'');
    const hits=expected.filter(bin=>bin.label.startsWith(stem));
    return hits.length===1?{...bar,label:hits[0].label}:bar;
  });

  // EVERY CATEGORY HAS A BAR AND EVERY BAR HAS A CATEGORY. Reported as two separate findings
  // because they are two different mistakes: a category that vanished from a figure is a reader
  // drawing a conclusion from a set they think is complete, while a bar from nowhere is a
  // renderer inventing one.
  const drawnLabels=bars.map(bar=>bar.label);
  const missing=expected.filter(bin=>!drawnLabels.includes(bin.label)).map(bin=>bin.label);
  const extra=drawnLabels.filter(label=>!expected.some(bin=>bin.label===label));
  if(missing.length)faults.push({check:'coverage',
    detail:`${missing.length} of ${expected.length} categories have a value and no bar: ${missing.join(', ')}.`});
  if(extra.length)faults.push({check:'coverage',
    detail:`${extra.length} bars are drawn for categories the figure does not hold: ${extra.join(', ')}.`});

  // THE STATED ORDER IS THE DRAWN ORDER. The check that would have caught the 1849/1854 figure,
  // where a chart asking for `smallest` drew largest-first and every test still passed.
  if(!missing.length&&!extra.length){
    const want=expected.map(bin=>bin.label);
    if(want.join('\u0000')!==drawnLabels.join('\u0000'))faults.push({check:'order',
      detail:`The figure asks for ${chart.barOrder??'the order its bins arrived in'} `
        +`and draws a different one. Asked: ${want.join(', ')}. Drawn: ${drawnLabels.join(', ')}.`});
  }

  // A BAR'S LENGTH IS ITS VALUE. Checked as a ratio against the longest bar rather than against a
  // scale factor nobody stated, because a figure never shows its scale and a reader compares bars
  // to each other. A diverging figure is measured from its own baseline for the same reason.
  const byLabel=new Map(expected.map(bin=>[bin.label,bin.count]));
  const values=bars.map(bar=>byLabel.get(bar.label)).filter((v):v is number=>v!==undefined);
  const low=Math.min(0,...values),span=Math.max(...values)-low;
  const longest=Math.max(...bars.map(bar=>bar.length));
  if(span>0&&longest>0)for(const bar of bars){
    const value=byLabel.get(bar.label);
    if(value===undefined)continue;
    const want=(value-low)/span,got=bar.length/longest;
    if(Math.abs(want-got)>tolerance)faults.push({check:'length',
      detail:`${bar.label} holds ${value} and is drawn at ${(got*100).toFixed(1)}% of the longest `
        +`bar where its value is ${(want*100).toFixed(1)}% of the range.`});
  }
  return faults;
}
