import type {ChartSummary} from './results.js';
import type {WorkflowNode} from './types.js';
import appPackage from '../package.json';
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
  const mark=params.mark||'bar',orientation=chartOrientation(params);
  if(!['bar','point'].includes(mark)||!['horizontal','vertical'].includes(orientation))throw new Error('Unsupported chart encoding.');
  if(!Array.isArray(chart.bins)||chart.bins.length>100||chart.bins.some(b=>!Number.isFinite(b.count)||b.count<0||typeof b.label!=='string'||typeof b.key!=='string'))throw new Error('Chart requires at most 100 nonnegative, finite bins.');
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
  const source=difference?ordered:chart.bins;
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
    mark:{type:mark,filled:true,...(params.colorByCategory?{}:{color:FIGURE_ROLE.primary}),...(mark==='point'?{size:110}:{})},
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
