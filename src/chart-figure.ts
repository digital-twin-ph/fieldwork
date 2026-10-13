import type {ChartSummary} from './results.js';
import type {WorkflowNode} from './types.js';
import {chartVegaSpec} from './chart-vega.js';

type ChartParams=WorkflowNode<'chart_output'>['params'];

/** A chart as a standalone SVG figure: the specification the receipt stores, rendered.
 *
 *  Rewritten 2026-10-13, the day it was written. The first version drew the bars by hand -- axes,
 *  scaling, label rotation, overflow geometry, about two hundred lines -- so that the classic HTML
 *  bars, which are `<div>`s with no SVG to take, could be exported at all.
 *
 *  That made a THIRD rendering of one chart: Vega-Lite on screen, the classic bars on screen, and a
 *  hand-drawn SVG for export. The guarantee it offered was "the same file whichever renderer is on
 *  screen", which is true and is the weaker of the two available. The stronger one is that **the
 *  exported file is what the receipt says was drawn** -- and `fw:rendererSpecification` already
 *  carries that specification, and `vega` is already a pinned dependency that renders it with no
 *  DOM at all.
 *
 *  So the export is now the receipt's own figure. A chart on the classic bars still exports, because
 *  the specification is derived for the purpose; what it cannot do is disagree with the receipt.
 *
 *  Found by the practitioner asking why Observable Plot had not been considered. The answer was that
 *  it could not store a specification as data -- and the better answer was that nothing needed to be
 *  drawn by hand in the first place. */
export async function standaloneChartSvg(chart:ChartSummary,params:ChartParams,
  context:{sourceId?:string;runId?:string}={}):Promise<string>{
  // Forced to the Vega-Lite renderer so a chart drawn on the classic bars still has a figure to
  // export. Everything else about the specification -- titles, axis names, source note, orientation,
  // colours, the Tufte axis configuration -- is the practitioner's, unchanged.
  const spec=chartVegaSpec(chart,{...params,renderer:'vega-lite'},context);
  const [vegaLite,vega]=await Promise.all([import('vega-lite'),import('vega')]);
  const view=new vega.View(vega.parse(vegaLite.compile(spec).spec),{renderer:'none'});
  try{return await view.toSVG();}
  finally{view.finalize();}
}
