import {orderOf} from './select-rows.js';
import type {ChartSummary} from './results.js';
import {generationColours} from './presentation.js';
import type {WorkflowNode} from './types.js';
import appPackage from '../package.json';
import {orderBins} from './chart-output.js';
import {FIGURE_PALETTE,FIGURE_ROLE,FIGURE_TYPE,FIGURE_GRID,TUFTE_AXIS} from './presentation.js';

type ChartParams=WorkflowNode<'chart_output'>['params'];
type VegaChart={finalize:()=>void};
let current:VegaChart|null=null;
let generation=0;
/** The shared figure palette, so a chart and the map beside it agree. It was a Tableau-flavoured
 *  eight of its own until 2026-10-13, which meant a map and a chart from the same worked example
 *  could not go on one page. */
const colors=FIGURE_PALETTE;
/** Which way the bars run, and what decides it when nobody has said.
 *
 *  **Vertical, for every kind of bar chart.** Changed on 2026-10-13 on the practitioner's
 *  instruction. The earlier default split: a case series ran vertical, because that is how every
 *  outbreak report draws an epidemic curve, and categorical bars ran horizontal, on the argument
 *  that a long category label has room to be read lying down.
 *
 *  That argument is real but it is not the common case, and it made one widget answer the same
 *  question two ways depending on an input mode a reader cannot see. A bar chart has counts rising
 *  from a baseline; that is what a reader expects to meet, and the long-label case is a reason to
 *  CHANGE the orientation rather than a reason to default to it.
 *
 *  It remains a default and not a rule: the Inspector offers both for either kind, and a long
 *  category label is the case to switch for. */
/** Which renderer draws a chart when nobody has said.
 *
 *  **Vega-Lite, from 2026-10-13**, on the practitioner's instruction. The classic HTML bars remain
 *  and remain selectable; they are no longer what a practitioner meets first.
 *
 *  The reason is not that one is prettier. The HTML bars ignore every presentation field -- no
 *  title, no subtitle, no axis titles, no source note -- and have no figure export, so a chart
 *  drawn on them cannot be handed to anybody or leave the application the way a map can. Defaulting
 *  to them meant the presentation stage was off by default.
 *
 *  It also makes the receipt complete by default: `fw:rendererSpecification` is written only for a
 *  Vega-Lite chart, so before this a default chart's receipt recorded that a chart existed without
 *  recording what it drew. */
export const chartRenderer=(params:{renderer?:'html'|'vega-lite'}):'html'|'vega-lite'=>
  params.renderer??'vega-lite';

export const chartOrientation=(params:{orientation?:'horizontal'|'vertical';inputMode?:string}):'horizontal'|'vertical'=>
  params.orientation??'vertical';

/** THE DEFAULT IS WHAT MOST FIGURES PUBLISH WITH, so it has to be publishable.
 *
 *  This read `Source: curve · run 8e86bd09-1d3f-4a2b-8e06-b3beadf90b41` -- a node id and a run
 *  UUID. Both are provenance and neither is a source: a reader meeting the figure cannot tell
 *  what `curve` is, and the run id identifies this execution rather than the data. The
 *  practitioner, 2026-10-25: *"This chart from Hagelloch is not publish friendly"*.
 *
 *  The map's default already did this correctly -- it names the upstream labels and points at the
 *  evidence for method -- so this follows it rather than inventing a second convention. The run
 *  id is not lost: it is in the receipt, which is where a reader checking reproducibility looks
 *  and where a reader of the figure does not. */
export function chartSourceNote(params:ChartParams,sourceId?:string,runId?:string,sourceLabel?:string){
  if(params.sourceNote?.trim())return params.sourceNote.trim();
  const named=sourceLabel?.trim()||sourceId;
  return `Source: ${named||'connected workflow result'} · See N3 & evidence for method.`;
}

/** A deliberately small, offline Vega-Lite profile over already computed bins.
 *
 *  One exception, added 2026-10-10 as a prototype: `bandMeasure: 'difference'` puts a
 *  **declarative transform** in the spec rather than computing upstream. Nested travel-time
 *  bands give cumulative counts — a location one minute from the pump is inside all four
 *  rings — and the case study's own bar chart shows the difference between neighbouring
 *  bands instead (NB04 cell 19 subtracts `prev_count` as it walks outward).
 *
 *  Computing it upstream would have been the house style. The transform is defensible here
 *  because the whole spec is already recorded in the receipt as `fw:rendererSpecification`,
 *  so a Vega-Lite `window`/`calculate` pair is more inspectable than the same arithmetic
 *  buried in TypeScript: a reader of the provenance sees the subtraction stated. Whether
 *  that trade is right is what the experiment is for
 *  ([87](../docs/experiments/87-declarative-chart-transforms.md)).
 *
 *  It never changes the axis quietly. The measure is renamed, the caption says so, and the
 *  receipt carries a distinct `fw:chartMeasureKind`. */
/** Breaks a line of title text to the width the plot is drawn at.
 *
 *  Vega-Lite leaves a long subtitle to run off the edge, where it is cut rather than wrapped. The
 *  character width is approximate -- 12px Helvetica averages near 6.2px a character -- and erring
 *  short costs a line break, while erring long costs a clipped sentence. */
export function wrapToWidth(value:string,width:number):string[]{
  const max=Math.max(24,Math.floor(width/6.2));
  const lines:string[]=[];let line='';
  for(const word of value.split(/\s+/)){
    if(!line)line=word;
    else if((line+' '+word).length<=max)line+=' '+word;
    else{lines.push(line);line=word;}
  }
  if(line)lines.push(line);
  return lines;
}

export function chartVegaSpec(chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string;sourceLabel?:string}={}){
  if(chartRenderer(params)!=='vega-lite')throw new Error('Vega-Lite rendering is not selected.');
  if(chart.panels?.length&&params.figure==='pyramid')return pyramidVegaSpec(chart,params,context);
  if(chart.panels?.length)return panelVegaSpec(chart,params,context);
  if(chart.interval)return intervalVegaSpec(chart,params,context);
  // A LINE runs along the categories in their order, left to right (the practitioner, 2026-11-12: Chart offered no line).
  const mark=params.mark||'bar',orientation=mark==='line'?'vertical':chartOrientation(params);
  if(!['bar','point','line'].includes(mark)||!['horizontal','vertical'].includes(orientation))throw new Error('Unsupported chart encoding.');
  // A NEGATIVE VALUE IS NOT A MALFORMED ONE. This refused `b.count<0` until 2026-10-31, which
  // made the one quantity a before-and-after produces -- a change -- undrawable: Snow's 1849
  // against 1854 gives Southwark and Vauxhall +197 and Lambeth -125, and the step stopped the
  // whole run rather than the figure. The practitioner: *"There should be a way to present bars
  // with positive and negative values."* What is still refused is what was always wrong: a
  // value that is not finite, a bin with no label, and more bins than a figure can carry.
  if(!Array.isArray(chart.bins)||chart.bins.length>100||chart.bins.some(b=>!Number.isFinite(b.count)||typeof b.label!=='string'||typeof b.key!=='string'))throw new Error('Chart requires at most 100 labelled, finite bins.');
  if(new Set(chart.bins.map(b=>b.key)).size!==chart.bins.length)throw new Error('Chart categories require unique stable keys.');
  if(params.colorByCategory&&chart.bins.length>colors.length)throw new Error(`Category legend supports at most ${colors.length} distinct categories, and this chart has ${chart.bins.length}. The palette is six validated hues rather than eight, because the yellow and the black fell outside the usable lightness band; past six the honest move is to group the tail upstream rather than invent a seventh hue. Turn off the legend, or reduce the categories.`);
  const labels=chart.bins.map(b=>b.label),duplicateLabels=new Set(labels).size!==labels.length;
  const difference=params.bandMeasure==='difference';
  const ordered=[...chart.bins].sort((a,b)=>(a.order??0)-(b.order??0));
  if(difference){
    if(!chart.bins.every(b=>Number.isFinite(b.order)))
      throw new Error('A band difference needs every bin to carry a travel time. These bins are not nested bands.');
    if(new Set(chart.bins.map(b=>b.order)).size!==chart.bins.length)
      throw new Error('Two bands share a travel time, so there is no order to take differences along.');
    // Nesting is proved from the counts rather than assumed: an outer band of a nested set
    // cannot hold fewer records than the band inside it, and a difference would go negative.
    for(let i=1;i<ordered.length;i++)
      if(ordered[i].count<ordered[i-1].count)
        throw new Error(`These bands are not nested: ${ordered[i].label} holds fewer records (${ordered[i].count}) than ${ordered[i-1].label} (${ordered[i-1].count}), so differences between them would be negative.`);
  }
  // ORDERED HERE TOO, which it was not. `orderBins` ran in `chartMarkup` and nowhere else, so the
  // figure a reader actually sees -- this renderer draws the Results tab and the exported SVG --
  // kept the bins in arrival order whatever the practitioner chose. Caught on the South London
  // 1849/1854 chart, which asked for `smallest` and drew largest-first. `orderBins` leaves a
  // sequence alone, so the epidemic curve and the travel-time bands are unaffected, and the
  // difference chart keeps its own nesting sort.
  const source=difference?ordered:orderBins(chart.bins,chart.barOrder);
  const values=source.map(b=>({key:b.key,label:b.label,displayLabel:duplicateLabels?`${b.label} (${b.key})`:b.label,count:b.count,...(b.order===undefined?{}:{order:b.order})}));
  // LABELS THAT FIT. Vega-Lite thins overlapping labels by default on quantitative and temporal
  // axes and NOT on nominal ones, so a date axis modelled as categories -- which an epidemic
  // curve is -- draws every label and they collide. 87 daily bins across the plot width rendered
  // as a solid band of overlapping text, reported 2026-10-25 on the Hagelloch measles curve.
  //
  // `parity` drops every other label and repeats until they fit, so the ones that remain are
  // evenly spaced and the axis stays readable at any bin count. No data is hidden: the bars are
  // all drawn and the tooltip names each one.
  const categoryAxis={labelOverlap:'parity' as const,labelSeparation:2};
  const category={field:'displayLabel',type:'nominal' as const,sort:values.map(b=>b.displayLabel),axis:categoryAxis};
  const quantity={field:difference?'bandCount':'count',type:'quantitative' as const,scale:{domainMin:0}};
  // THE AXIS SAYS WHAT THE NUMBER IS. "Recorded count" over deaths per 1,000 people is a wrong
  // label on a right figure, and the unit was available the whole time.
  const quantityTitle=difference
    ?(chart.field==='total'?'Numeric total in this band alone':'Records in this band alone')
    :chart.measure==='value'?(chart.unit?.trim()||'Value')
    :(chart.field==='total'?'Recorded numeric total':'Recorded count');
  // lag over the bands innermost-first, then subtract. The first band has no inner
  // neighbour, so its difference is its own count.
  const transform=difference?{transform:[
    {window:[{op:'lag' as const,field:'count',as:'innerCount'}],sort:[{field:'order',order:'ascending' as const}]},
    {calculate:'datum.count - (datum.innerCount == null ? 0 : datum.innerCount)',as:'bandCount'},
  ]}:{};
  const color=params.colorByCategory?{color:{field:'displayLabel',type:'nominal' as const,scale:{domain:values.map(v=>v.displayLabel),range:colors.slice(0,values.length)},legend:{title:'Category'}}}:{};
  const sourceNote=chartSourceNote(params,context.sourceId,context.runId,context.sourceLabel);
  const chartWidth=Math.min(560,Math.max(300,chart.bins.length*72));
  return {
    $schema:'https://vega.github.io/schema/vega-lite/v6.json',
    // Stated so an exported figure carries its own surface. Without it the SVG is transparent
    // and takes the colour of whatever it is dropped onto, which for a figure meant to be
    // handed to somebody is a defect rather than a convenience.
    background:FIGURE_ROLE.background,
    description:difference?`${chart.caption} Shown as the difference between neighbouring bands, computed in the specification.`:chart.caption,
    data:{values},
    ...transform,
    // Vega-Lite does not wrap title text: a subtitle longer than the plot runs off the right edge
    // and is simply cut. Found by exporting the Snow curve and looking at it -- "the pump handle was
    // removed on 8 Septem". `subtitle` takes an array of lines, so the wrapping is done here, at the
    // width the chart is actually drawn.
    title:{text:params.chartTitle?.trim()||chart.caption,
      subtitle:[params.subtitle?.trim(),sourceNote].filter((part):part is string=>!!part)
        .flatMap(part=>wrapToWidth(part,chartWidth)),
      anchor:'start' as const},
    mark:mark==='line'?{type:'line' as const,point:{filled:true,size:50,...(params.colorByCategory?{}:{color:FIGURE_ROLE.primary})},strokeWidth:2,
        ...(params.colorByCategory?{}:{color:FIGURE_ROLE.primary})}
      :{type:mark,filled:true,...(params.colorByCategory?{}:{color:FIGURE_ROLE.primary}),...(mark==='point'?{size:110}:{})},
    encoding:orientation==='horizontal'
      ?{x:{...quantity,title:params.xAxisTitle?.trim()||quantityTitle},y:{...category,title:params.yAxisTitle?.trim()||chart.categoryTitle||'Category'},...color,tooltip:[{field:'displayLabel',type:'nominal' as const,title:'Category'},{field:difference?'bandCount':'count',type:'quantitative' as const,title:quantityTitle},...(difference?[{field:'count',type:'quantitative' as const,title:'Cumulative to this band'}]:[])]}
      :{x:{...category,title:params.xAxisTitle?.trim()||chart.categoryTitle||'Category'},y:{...quantity,title:params.yAxisTitle?.trim()||quantityTitle},...color,tooltip:[{field:'displayLabel',type:'nominal' as const,title:'Category'},{field:difference?'bandCount':'count',type:'quantitative' as const,title:quantityTitle},...(difference?[{field:'count',type:'quantitative' as const,title:'Cumulative to this band'}]:[])]},
    width:chartWidth,
    height:orientation==='horizontal'?Math.max(140,chart.bins.length*38):280,
    // One type scale with the map, including the family: a chart that inherits the page font and a
    // map that names Arial are two figures, not a pair.
    // After Tufte and Cairo: the frame, the domain lines and the ticks carry no data and go; the
    // gridline survives only on the MEASURED axis, because that is the one a reader reads a value
    // off. The categorical axis keeps nothing -- a label under a bar needs no line pointing at it.
    config:{view:{stroke:null},font:FIGURE_TYPE.family,
      axis:{...TUFTE_AXIS,labelFontSize:FIGURE_TYPE.tick,titleFontSize:FIGURE_TYPE.axisTitle,
        labelColor:FIGURE_ROLE.quietInk,titleColor:FIGURE_ROLE.ink},
      axisQuantitative:{grid:true,gridColor:FIGURE_GRID,gridWidth:1},
      title:{fontSize:FIGURE_TYPE.title,subtitleFontSize:FIGURE_TYPE.subtitle,color:FIGURE_ROLE.ink,subtitleColor:FIGURE_ROLE.quietInk,
        subtitlePadding:8,offset:12},
      legend:{labelFontSize:FIGURE_TYPE.legend,titleFontSize:FIGURE_TYPE.legend,labelColor:FIGURE_ROLE.quietInk,
        symbolStrokeWidth:0,offset:12},
      bar:{binSpacing:2}},
  };
}

/** The mark a panel is drawn with: the practitioner's, or bars up to 60 points and a line beyond, because 3,653 daily
 *  bars are a solid block. Experiment 174. */
/** For a ratio: a log scale and a line at 1, unless the practitioner turned them off (experiment 181). */
export const ratioScale=(chart:ChartSummary,params:ChartParams):{log:boolean;line:boolean}=>
  ({log:!!chart.interval?.ratio&&params.ratioScale!=='linear',line:!!chart.interval?.ratio&&params.referenceLine!==false});

/** WHY THE AXIS IS AS IT IS, said on the figure. The practitioner chose it on by default so a trainee meets the
 *  convention with its reason, not as an unexplained axis (experiment 181). */
export function ratioScaleNote(chart:ChartSummary,params:ChartParams):string|undefined{
  const {log,line}=ratioScale(chart,params);
  if(!log&&!line)return undefined;
  return [log?'Log scale, so a ratio and its inverse sit equally far from 1':'',
    line?`the dashed line at 1 marks no association`:''].filter(Boolean).join('; ')
    +`. Whiskers are ${chart.interval!.level}% intervals.`;
}

/** AN ESTIMATE AND ITS INTERVAL AT EACH CATEGORY: a point, a whisker, and for a ratio a log scale and a dashed line
 *  at 1 (experiment 181). A category declared numeric is placed as a number, so lags of 0, 1, 2, 4 and 8 weeks sit
 *  at their distances; otherwise categories are evenly spaced in the table's order. */
function intervalVegaSpec(chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string;sourceLabel?:string}){
  if(!Array.isArray(chart.bins)||chart.bins.length>100||chart.bins.some(b=>!Number.isFinite(b.count)))
    throw new Error('Chart requires at most 100 estimates, each a finite number.');
  const {log,line}=ratioScale(chart,params),interval=chart.interval!;
  const numeric=!!chart.numericCategory&&chart.bins.every(b=>Number.isFinite(b.order));
  const values=chart.bins.map(b=>({key:b.key,label:b.label,at:numeric?b.order:b.label,estimate:b.count,
    lower:b.lower??null,upper:b.upper??null}));
  const width=Math.min(560,Math.max(320,chart.bins.length*72)),height=300;
  const x=numeric
    ?{field:'at',type:'quantitative' as const,title:params.xAxisTitle?.trim()||chart.categoryTitle||'Category',
      scale:{zero:false,nice:false,padding:24},axis:{values:values.map(v=>v.at as number),grid:false}}
    :{field:'at',type:'nominal' as const,sort:values.map(v=>v.label),title:params.xAxisTitle?.trim()||chart.categoryTitle||'Category',
      axis:{labelOverlap:'parity' as const,labelSeparation:2}};
  // THE DOMAIN HOLDS EVERY LIMIT AND, FOR A RATIO, 1, so the line is never off the plot.
  const all=values.flatMap(v=>[v.estimate,v.lower,v.upper]).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
  const lowest=Math.min(...all,...(line?[1]:[])),highest=Math.max(...all,...(line?[1]:[]));
  const pad=log?Math.pow(highest/lowest,0.06):(highest-lowest)*0.06||Math.abs(highest)*0.06||1;
  const domain=log?[lowest/pad,highest*pad]:[lowest-pad,highest+pad];
  const yTitle=params.yAxisTitle?.trim()||[interval.estimate,chart.unit?.trim()].filter(Boolean).join(', ');
  const y={type:'quantitative' as const,title:yTitle,
    scale:{type:log?'log' as const:'linear' as const,domain,zero:false,nice:false},axis:{format:'~r',tickCount:6}};
  const sourceNote=chartSourceNote(params,context.sourceId,context.runId,context.sourceLabel);
  const note=ratioScaleNote(chart,params);
  const tooltip=[{field:'label',type:'nominal' as const,title:chart.categoryTitle||'Category'},
    {field:'estimate',type:'quantitative' as const,title:interval.estimate,format:'.4~r'},
    {field:'lower',type:'quantitative' as const,title:`lower ${interval.level}%`,format:'.4~r'},
    {field:'upper',type:'quantitative' as const,title:`upper ${interval.level}%`,format:'.4~r'}];
  return {
    $schema:'https://vega.github.io/schema/vega-lite/v6.json',
    background:FIGURE_ROLE.background,
    description:`${chart.caption}${note?` ${note}`:''}`,
    title:{text:params.chartTitle?.trim()||chart.caption,
      subtitle:[params.subtitle?.trim(),note,sourceNote].filter((part):part is string=>!!part).flatMap(part=>wrapToWidth(part,width)),
      anchor:'start' as const},
    width,height,
    layer:[
      ...(line?[{data:{values:[{one:1}]},mark:{type:'rule' as const,color:FIGURE_ROLE.quietInk,strokeDash:[5,4],strokeWidth:1.2},
        encoding:{y:{...y,field:'one'}}}]:[]),
      {data:{values},transform:[{filter:'isValid(datum.lower) && isValid(datum.upper)'}],
        mark:{type:'rule' as const,color:FIGURE_ROLE.primary,strokeWidth:1.6},
        encoding:{x,y:{...y,field:'lower'},y2:{field:'upper'},tooltip}},
      {data:{values},mark:{type:'point' as const,filled:true,size:90,color:FIGURE_ROLE.primary,opacity:1},
        encoding:{x,y:{...y,field:'estimate'},tooltip}},
    ],
    config:{view:{stroke:null},font:FIGURE_TYPE.family,
      axis:{...TUFTE_AXIS,labelFontSize:FIGURE_TYPE.tick,titleFontSize:FIGURE_TYPE.axisTitle,
        labelColor:FIGURE_ROLE.quietInk,titleColor:FIGURE_ROLE.ink},
      axisQuantitative:{grid:true,gridColor:FIGURE_GRID,gridWidth:1},
      title:{fontSize:FIGURE_TYPE.title,subtitleFontSize:FIGURE_TYPE.subtitle,color:FIGURE_ROLE.ink,subtitleColor:FIGURE_ROLE.quietInk,
        subtitlePadding:8,offset:12}},
  };
}

export const PANEL_BAR_LIMIT=60;
export const panelMark=(chart:ChartSummary,params:ChartParams,panel:string):'bar'|'line'=>
  params.panelMarks?.[panel]??(chart.bins.filter(b=>b.panel===panel).length<=PANEL_BAR_LIMIT?'bar':'line');

/** ALIGNED PANELS ON ONE SHARED X AXIS, each with its own y scale (experiment 174). Concatenated rather than faceted,
 *  because a facet draws every panel with one mark and the practitioner chooses a mark per panel. Only the bottom panel
 *  carries the x axis, so the panels read as one figure. A shaded period is a rectangle behind every panel; it needs a
 *  time axis, since a range of categories has no width to shade. */
/** A POPULATION PYRAMID (experiment 210, 2026-11-12): two groups back to back, one band per row, the youngest at the
 *  bottom, each side counted outward and read as a count on either side. The groups are the two named values of the
 *  column the panels would be drawn by; rows where it is blank are not drawn, and the subtitle says how many. */
export function pyramidVegaSpec(chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string;sourceLabel?:string}){
  const by=params.panelsBy?.trim()||'group';
  const sides=chart.panels!.filter(panel=>panel!=='');
  if(sides.length!==2)throw new Error(`A pyramid sets two groups back to back; ${by} holds ${sides.length}: ${sides.join(', ')||'none'}.`);
  const [left,right]=sides as [string,string];
  const blank=chart.bins.filter(b=>b.panel===''&&!b.missing).reduce((sum,b)=>sum+b.count,0);
  const values=chart.bins.filter(b=>b.panel===left||b.panel===right)
    .map(b=>({group:b.panel,band:b.label,count:b.missing?0:b.count,signed:(b.missing?0:b.count)*(b.panel===left?-1:1)}));
  const labels=[...new Set(chart.bins.map(b=>b.label))].filter(l=>l!=='');
  const lead=(label:string)=>{const m=/^\s*(\d+(?:\.\d+)?)/.exec(label);return m?Number(m[1]):NaN;};
  const ordered=labels.every(l=>Number.isFinite(lead(l)))?[...labels].sort((a,b)=>lead(a)-lead(b)||a.localeCompare(b)):labels;
  const width=560,height=Math.max(160,Math.min(520,ordered.length*18));
  const sourceNote=chartSourceNote(params,context.sourceId,context.runId,context.sourceLabel);
  const left_note=blank?`${blank.toLocaleString('en')} with ${by} blank are not drawn.`:'';
  return {
    $schema:'https://vega.github.io/schema/vega-lite/v6.json',
    background:FIGURE_ROLE.background,
    description:chart.caption,
    data:{values},
    title:{text:params.chartTitle?.trim()||chart.caption,
      subtitle:[params.subtitle?.trim(),left_note,sourceNote].filter((part):part is string=>!!part).flatMap(part=>wrapToWidth(part,width)),
      anchor:'start' as const},
    width,height,
    mark:{type:'bar' as const},
    encoding:{
      // Youngest at the bottom: Vega-Lite lists a sorted nominal axis from the top, so the order is reversed.
      y:{field:'band',type:'ordinal' as const,sort:[...ordered].reverse(),title:params.yAxisTitle?.trim()||chart.categoryTitle||null},
      x:{field:'signed',type:'quantitative' as const,title:params.xAxisTitle?.trim()||`${left} ← count → ${right}`,
        axis:{labelExpr:'abs(datum.value)',format:'d'}},
      color:{field:'group',type:'nominal' as const,scale:{domain:[left,right],range:[FIGURE_PALETTE[0],FIGURE_PALETTE[1]]},
        legend:{title:by,orient:'top' as const}},
      tooltip:[{field:'band',type:'ordinal' as const,title:chart.categoryTitle??'band'},{field:'group',type:'nominal' as const,title:by},
        {field:'count',type:'quantitative' as const,title:'count'}]},
    config:{view:{stroke:null},font:FIGURE_TYPE.family,
      axis:{...TUFTE_AXIS,labelFontSize:FIGURE_TYPE.tick,titleFontSize:FIGURE_TYPE.axisTitle,
        labelColor:FIGURE_ROLE.quietInk,titleColor:FIGURE_ROLE.ink},
      axisQuantitative:{grid:true,gridColor:FIGURE_GRID,gridWidth:1},
      legend:{labelFontSize:FIGURE_TYPE.tick,titleFontSize:FIGURE_TYPE.axisTitle,labelColor:FIGURE_ROLE.ink,titleColor:FIGURE_ROLE.ink},
      title:{fontSize:FIGURE_TYPE.title,subtitleFontSize:FIGURE_TYPE.subtitle,color:FIGURE_ROLE.ink,subtitleColor:FIGURE_ROLE.quietInk,
        subtitlePadding:8,offset:12},
      bar:{binSpacing:1}},
  };
}

function panelVegaSpec(chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string;sourceLabel?:string}){
  const panels=chart.panels!,temporal=!!chart.temporal;
  const values=chart.bins.map(b=>({panel:b.panel,label:b.label,count:b.missing?null:b.count}));
  const width=640,height=Math.max(90,Math.min(160,Math.round(420/panels.length)));
  // CATEGORIES IN THEIR OWN ORDER (Hagelloch's ages, 2026-11-12, drew 7, 6, 4, 8 … in the order the rows came): numbers
  // as numbers, so 2 comes before 10; anything else in the order the table holds it, as before.
  const labels=[...new Set(chart.bins.map(b=>b.label))];
  // AND BANDS BY WHERE THEY BEGIN (2026-11-12): 0, 1–4, 5–9, 10–14, 15+ by their first number, where every label has one,
  // so an age band reads in age order and not as text ("10–14" before "5–9").
  const lead=(label:string)=>{const m=/^\s*(\d+(?:\.\d+)?)/.exec(label);return m?Number(m[1]):NaN;};
  const banded=labels.filter(l=>l!=='').every(l=>Number.isFinite(lead(l)));
  const order=orderOf(labels)==='number'?[...labels].sort((a,b)=>a===''?1:b===''?-1:Number(a)-Number(b))
    :banded?[...labels].sort((a,b)=>a===''?1:b===''?-1:lead(a)-lead(b)||a.localeCompare(b)):null;
  // A BLANK PANEL IS NAMED AS BLANK, and its rows are drawn: matched by expression, since a filter on an empty string
  // matched nothing and left the panel empty with no name (the 11 Hagelloch children with no gender, 2026-11-12).
  const nameOf=(panel:string)=>panel===''?`${params.panelsBy?.trim()||'value'} blank`:panel;
  const shade=temporal&&params.shade&&(params.shade.from||params.shade.to)?(()=>{
    const dates=chart.bins.map(b=>b.label).sort();
    const from=params.shade!.from||dates[0]!,to=params.shade!.to||dates.at(-1)!;
    // To the end of the last day, so the last day's bar is inside the shading rather than cut through its middle.
    const end=new Date(Date.parse(`${to}T00:00:00Z`)+86_400_000).toISOString().slice(0,10);
    return {data:{values:[{from,to:end}]},mark:{type:'rect' as const,color:FIGURE_ROLE.quietInk,opacity:.12},
      encoding:{x:{field:'from',type:'temporal' as const},x2:{field:'to'}}};
  })():null;
  const sourceNote=chartSourceNote(params,context.sourceId,context.runId,context.sourceLabel);
  return {
    $schema:'https://vega.github.io/schema/vega-lite/v6.json',
    background:FIGURE_ROLE.background,
    description:chart.caption,
    data:{values},
    title:{text:params.chartTitle?.trim()||chart.caption,
      subtitle:[params.subtitle?.trim(),sourceNote].filter((part):part is string=>!!part).flatMap(part=>wrapToWidth(part,width)),
      anchor:'start' as const},
    vconcat:panels.map((panel,index)=>{
      const mark=panelMark(chart,params,panel),last=index===panels.length-1;
      const x=temporal
        ?{field:'label',type:'temporal' as const,title:last?(params.xAxisTitle?.trim()||chart.categoryTitle||null):null,
          axis:last?{labelOverlap:true,format:'%-d %b %Y'}:{labels:false,ticks:false,title:null}}
        :{field:'label',type:'nominal' as const,sort:order,title:last?(params.xAxisTitle?.trim()||chart.categoryTitle||null):null,
          axis:last?{labelOverlap:'parity' as const}:{labels:false,ticks:false,title:null}};
      const drawn={transform:[{filter:`datum.panel === ${JSON.stringify(panel)}`}],
        mark:mark==='bar'
          ?{type:'bar' as const,color:FIGURE_ROLE.primary}
          :{type:'line' as const,color:FIGURE_ROLE.primary,strokeWidth:1.4,invalid:'break-paths-show-path-domains' as const},
        encoding:{x,
          // The name as the file spells it, its meaning beside it, over two lines so a long meaning fits the panel.
          y:{field:'count',type:'quantitative' as const,title:chart.meanings?.[panel]?[nameOf(panel),...wrapToWidth(chart.meanings[panel]!,height)]:nameOf(panel),
            scale:{zero:mark==='bar'}},
          tooltip:[{field:'label',type:temporal?'temporal' as const:'nominal' as const,title:chart.categoryTitle??'',...(temporal?{format:'%-d %b %Y'}:{})},
            {field:'count',type:'quantitative' as const,title:nameOf(panel)}]}};
      return {width,height,layer:[...(shade?[shade]:[]),drawn]};
    }),
    resolve:{scale:{x:'shared' as const,y:'independent' as const}},
    spacing:6,
    config:{view:{stroke:null},font:FIGURE_TYPE.family,
      axis:{...TUFTE_AXIS,labelFontSize:FIGURE_TYPE.tick,titleFontSize:FIGURE_TYPE.axisTitle,
        labelColor:FIGURE_ROLE.quietInk,titleColor:FIGURE_ROLE.ink},
      axisQuantitative:{grid:true,gridColor:FIGURE_GRID,gridWidth:1},
      title:{fontSize:FIGURE_TYPE.title,subtitleFontSize:FIGURE_TYPE.subtitle,color:FIGURE_ROLE.ink,subtitleColor:FIGURE_ROLE.quietInk,
        subtitlePadding:8,offset:12},
      bar:{binSpacing:1}},
  };
}

export function chartSpecificationFacts(node:WorkflowNode<'chart_output'>,runId:string,sourceId:string,chart:ChartSummary,measureKind:string):string{
  const spec=`<urn:fieldwork:run:${runId}:chart-spec:${node.id}>`;
  const activity=node.params.inputMode==='polygons'
    ?`<urn:fieldwork:run:${runId}:output:${node.id}:view>`
    :`<urn:fieldwork:run:${runId}:view:${node.id}>`;
  const banded=node.params.bandMeasure==='difference';
  const unitStatus=banded?'location-memberships-differenced-between-bands'
    :measureKind==='record-count'?'records':measureKind==='location-membership-count'?'location-memberships':'source-unit-not-specified';
  const title=node.params.chartTitle?.trim()||chart.caption;
  const sourceNote=chartSourceNote(node.params,sourceId,runId);
  const rendererSpec=chartRenderer(node.params)==='vega-lite'?JSON.stringify(chartVegaSpec(chart,node.params,{sourceId,runId})):null;
  return `@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n`+
    `${spec} a fw:ChartSpecification, prov:Plan; dcterms:title ${JSON.stringify(title)}; fw:chartRenderer ${JSON.stringify(chartRenderer(node.params))}; fw:chartMark ${JSON.stringify(node.params.mark||'bar')}; fw:chartOrientation ${JSON.stringify(chartOrientation(node.params))}; fw:chartField ${JSON.stringify(chart.field)}; fw:chartMeasureKind ${JSON.stringify(banded?`band-difference-of-${measureKind}`:measureKind)}; fw:chartUnitStatus ${JSON.stringify(unitStatus)}; fw:chartLegend ${!!node.params.colorByCategory}; fw:chartSourceNote ${JSON.stringify(sourceNote)}; prov:wasDerivedFrom <urn:fieldwork:run:${runId}:output:${sourceId}>.\n`+
    // The version is recorded for EITHER renderer. It used to be written only beside a Vega-Lite
    // specification, so a receipt from the classic bars said which renderer drew the figure without
    // saying which version of it -- and the classic bars are this project's own code, so the answer
    // is the application's version rather than a library's. A receipt that names a renderer and not
    // its version cannot be used to redraw anything.
    `${spec} fw:chartRendererVersion ${JSON.stringify(chartRenderer(node.params)==='vega-lite'
      ?`vega-lite@${appPackage.dependencies['vega-lite']}; vega-embed@${appPackage.dependencies['vega-embed']}`
      :`fieldwork@${appPackage.version} src/chart-output.ts#chartMarkup`)}.\n`+
    (rendererSpec?`${spec} fw:rendererSpecification ${JSON.stringify(rendererSpec)}.\n`:'')+
    (chart.interval?`${spec} fw:chartIntervalLevel ${chart.interval.level}; fw:chartScale ${JSON.stringify(ratioScale(chart,node.params).log?'log':'linear')}; fw:chartReferenceLine ${ratioScale(chart,node.params).line}.\n`:'')+
    (node.params.subtitle?.trim()?`${spec} dcterms:description ${JSON.stringify(node.params.subtitle.trim())}.\n`:'')+
    (node.params.xAxisTitle?.trim()?`${spec} fw:chartXAxisTitle ${JSON.stringify(node.params.xAxisTitle.trim())}.\n`:'')+
    (node.params.yAxisTitle?.trim()?`${spec} fw:chartYAxisTitle ${JSON.stringify(node.params.yAxisTitle.trim())}.\n`:'')+
    `${activity} fw:chartSpecification ${spec}; prov:used ${spec}.\n`+
    (node.references||[]).map(ref=>`${spec} dcterms:references <urn:fieldwork:run:${runId}:reference:${node.id}:${ref.id}>.\n`).join('');
}

export function disposeVegaChart(){generation++;current?.finalize();current=null;}
export async function renderVegaChart(host:HTMLElement,chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string;sourceLabel?:string}={}):Promise<void>{
  disposeVegaChart();
  const ticket=generation;
  const spec=chartVegaSpec(chart,params,context);
  const {default:embed}=await import('vega-embed');
  if(ticket!==generation||!host.isConnected)return;
  const result=await embed(host,spec,{mode:'vega-lite',renderer:'svg',actions:{export:{svg:true,png:false},source:false,compiled:false,editor:false},tooltip:true});
  if(ticket!==generation||!host.isConnected){result.finalize();return;}
  current=result;
}

/** WHO INFECTED WHOM, IN VEGA-LITE (experiment 200, step 5; the practitioner, 2026-11-09: "Vega lite for tree chart").
 *  The same figure the tree module computes, drawn by the renderer every other chart uses, so it exports, carries its
 *  title and source note, and enters the write-up the same way. Each link is two rules: down from the infector at its
 *  date to the case's row, then across to the case's date, so the length across is the serial interval. Text at 14 px. */
export function treeVegaSpec(tree:import('./transmission-tree.js').TransmissionTree,params:ChartParams,
  context:{sourceId?:string;runId?:string;sourceLabel?:string}={}){
  const at=new Map(tree.cases.map(c=>[c.id,c]));
  const dayOf=(c:import('./transmission-tree.js').TreeCase):number|null=>c.day??(c.parent&&at.get(c.parent)?dayOf(at.get(c.parent)!):null);
  const iso=(day:number|null)=>day===null?null:new Date(day*86_400_000).toISOString().slice(0,10);
  const cases=tree.cases.map(c=>({id:c.id,row:c.row,date:iso(dayOf(c)),recorded:c.date||'no date',
    generation:c.generation+1,infector:c.generation?c.parent:'',
    kind:c.generation===0?(c.starts==='no infector recorded'?'No infector recorded':c.starts==='in a loop'?'In a loop':'Infector not in the table')
      :c.day===null?'No readable date':'Infected by a listed case'}));
  const links=tree.cases.filter(c=>c.generation>0&&c.parent&&at.has(c.parent)).map(c=>{const p=at.get(c.parent!)!;
    return {from:iso(dayOf(p)),to:iso(dayOf(c)),fromRow:p.row,toRow:c.row,interval:(dayOf(c)??0)-(dayOf(p)??0),generation:c.generation+1};});
  // EVERY OTHER RECORDED SOURCE, dashed (2026-11-12).
  const further=tree.cases.flatMap(c=>(c.alsoFrom??[]).filter(a=>at.has(a)).map(a=>{const p=at.get(a)!;
    return {from:iso(dayOf(p)),to:iso(dayOf(c)),fromRow:p.row,toRow:c.row,interval:(dayOf(c)??0)-(dayOf(p)??0),source:a,case:c.id};}));
  const width=860,height=Math.max(160,tree.cases.length*7);
  const sourceNote=chartSourceNote(params,context.sourceId,context.runId,context.sourceLabel);
  const x={field:'date',type:'temporal' as const,title:params.xAxisTitle?.trim()||tree.columns.date,
    axis:{format:'%Y-%m-%d',labelFontSize:14,titleFontSize:14,tickCount:6,grid:true,gridColor:FIGURE_GRID}};
  const y={field:'row',type:'quantitative' as const,scale:{reverse:true,domain:[-1,tree.cases.length]},axis:null};
  // Short enough to be read whole: Vega cuts a legend label at 160 px unless told otherwise, and here it is told.
  const kinds=['Infected by a listed case','No infector recorded','Infector not in the table','In a loop','No readable date'];
  // COLOUR IS THE GENERATION (the practitioner, 2026-11-10), from the ramp Map's lines use, so generation 3 is one colour
  // in both. What a case IS -- a link found, no infector recorded, and so on -- moves to the mark's shape.
  const deepest=Math.max(1,...cases.map(c=>c.generation));
  const generations=Array.from({length:deepest},(_,i)=>i+1);
  const generationScale={domain:generations,range:generationColours(deepest)};
  const generationColour={field:'generation',type:'ordinal' as const,scale:generationScale};
  const shapes=['circle','square','diamond','triangle-up','cross'];
  return {
    $schema:'https://vega.github.io/schema/vega-lite/v6.json',
    background:FIGURE_ROLE.background,
    description:`Transmission tree: ${tree.counts.cases} cases in ${tree.counts.chains} chains, ${tree.counts.links} links`
      +(tree.counts.furtherLinks?`, and ${tree.counts.furtherLinks} further recorded links, dashed.`:'.'),
    title:{text:params.chartTitle?.trim()||'Who infected whom',
      subtitle:[params.subtitle?.trim()||`One row per case, chains top to bottom; ${tree.columns.date} left to right. A line's length across is the serial interval.`,sourceNote]
        .filter((part):part is string=>!!part).flatMap(part=>wrapToWidth(part,width)),anchor:'start' as const},
    width,height,
    layer:[
      {data:{values:links},mark:{type:'rule' as const,strokeWidth:1.2},
        encoding:{x:{...x,field:'from'},y:{...y,field:'fromRow'},y2:{field:'toRow'},color:{...generationColour,legend:null}}},
      {data:{values:links},mark:{type:'rule' as const,strokeWidth:1.2},
        encoding:{x:{...x,field:'from'},x2:{field:'to'},y:{...y,field:'toRow'},color:{...generationColour,legend:null},
          tooltip:[{field:'interval',type:'quantitative' as const,title:'serial interval, days'}]}},
      ...(further.length?[
        {data:{values:further},mark:{type:'rule' as const,strokeWidth:1.2,strokeDash:[4,3],color:FIGURE_ROLE.quietInk},
          encoding:{x:{...x,field:'from'},y:{...y,field:'fromRow'},y2:{field:'toRow'}}},
        {data:{values:further},mark:{type:'rule' as const,strokeWidth:1.2,strokeDash:[4,3],color:FIGURE_ROLE.quietInk},
          encoding:{x:{...x,field:'from'},x2:{field:'to'},y:{...y,field:'toRow'},
            tooltip:[{field:'case',type:'nominal' as const,title:'case'},{field:'source',type:'nominal' as const,title:'also recorded as infected by'},
              {field:'interval',type:'quantitative' as const,title:'days between onsets'}]}}]:[]),
      {data:{values:cases},mark:{type:'point' as const,filled:true,size:36,opacity:1},
        encoding:{x,y,
          color:{...generationColour,title:'Generation',
            legend:{orient:'top' as const,direction:'horizontal' as const,labelFontSize:14,titleFontSize:14,symbolSize:80}},
          shape:{field:'kind',type:'nominal' as const,title:null,scale:{domain:kinds,range:shapes},
            legend:{orient:'top' as const,direction:'horizontal' as const,labelFontSize:14,labelLimit:0,symbolSize:80,symbolFillColor:FIGURE_ROLE.ink,values:kinds.filter(k=>cases.some(c=>c.kind===k))}},
          tooltip:[{field:'id',type:'nominal' as const,title:'case'},{field:'recorded',type:'nominal' as const,title:tree.columns.date},
            {field:'infector',type:'nominal' as const,title:'infected by'},{field:'generation',type:'quantitative' as const,title:'generation'}]}},
    ],
    config:{view:{stroke:null},font:FIGURE_TYPE.family,
      title:{fontSize:FIGURE_TYPE.title,subtitleFontSize:14,color:FIGURE_ROLE.ink,subtitleColor:FIGURE_ROLE.quietInk,subtitlePadding:8,offset:12}},
  };
}

export async function renderVegaTree(host:HTMLElement,tree:import('./transmission-tree.js').TransmissionTree,params:ChartParams,
  context:{sourceId?:string;runId?:string;sourceLabel?:string}={}):Promise<void>{
  disposeVegaChart();
  const ticket=generation;
  const spec=treeVegaSpec(tree,params,context);
  const {default:embed}=await import('vega-embed');
  if(ticket!==generation||!host.isConnected)return;
  const result=await embed(host,spec as never,{mode:'vega-lite',renderer:'svg',actions:{export:{svg:true,png:false},source:false,compiled:false,editor:false},tooltip:true});
  if(ticket!==generation||!host.isConnected){result.finalize();return;}
  current=result;
}
