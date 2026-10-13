import type {ChartSummary} from './results.js';
import type {WorkflowNode} from './types.js';
import appPackage from '../package.json';
import {FIGURE_PALETTE,FIGURE_ROLE,FIGURE_TYPE} from './presentation.js';

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
 *  A case series is an epidemic curve: periods run along the bottom and counts rise, which
 *  is how every outbreak report draws one, so reading it the other way is work a
 *  practitioner should not have to do. Categorical bars stay horizontal, where a long
 *  category label has room to be read.
 *
 *  It is a default and not a rule: the Inspector offers both for either kind. */
export const chartOrientation=(params:{orientation?:'horizontal'|'vertical';inputMode?:string}):'horizontal'|'vertical'=>
  params.orientation??(params.inputMode==='series'?'vertical':'horizontal');

export function chartSourceNote(params:ChartParams,sourceId?:string,runId?:string){
  return params.sourceNote?.trim()||`Source: ${sourceId||'connected workflow result'}${runId?` · run ${runId}`:''}`;
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
export function chartVegaSpec(chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string}={}){
  if(params.renderer!=='vega-lite')throw new Error('Vega-Lite rendering is not selected.');
  const mark=params.mark||'bar',orientation=chartOrientation(params);
  if(!['bar','point'].includes(mark)||!['horizontal','vertical'].includes(orientation))throw new Error('Unsupported chart encoding.');
  if(!Array.isArray(chart.bins)||chart.bins.length>100||chart.bins.some(b=>!Number.isFinite(b.count)||b.count<0||typeof b.label!=='string'||typeof b.key!=='string'))throw new Error('Chart requires at most 100 nonnegative, finite bins.');
  if(new Set(chart.bins.map(b=>b.key)).size!==chart.bins.length)throw new Error('Chart categories require unique stable keys.');
  if(params.colorByCategory&&chart.bins.length>colors.length)throw new Error('Category legend supports at most eight distinct categories; turn off the legend or reduce categories upstream.');
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
  const category={field:'displayLabel',type:'nominal' as const,sort:values.map(b=>b.displayLabel)};
  const quantity={field:difference?'bandCount':'count',type:'quantitative' as const,scale:{domainMin:0}};
  const quantityTitle=difference
    ?(chart.field==='total'?'Numeric total in this band alone':'Records in this band alone')
    :(chart.field==='total'?'Recorded numeric total':'Recorded count');
  // lag over the bands innermost-first, then subtract. The first band has no inner
  // neighbour, so its difference is its own count.
  const transform=difference?{transform:[
    {window:[{op:'lag' as const,field:'count',as:'innerCount'}],sort:[{field:'order',order:'ascending' as const}]},
    {calculate:'datum.count - (datum.innerCount == null ? 0 : datum.innerCount)',as:'bandCount'},
  ]}:{};
  const color=params.colorByCategory?{color:{field:'displayLabel',type:'nominal' as const,scale:{domain:values.map(v=>v.displayLabel),range:colors.slice(0,values.length)},legend:{title:'Category'}}}:{};
  const sourceNote=chartSourceNote(params,context.sourceId,context.runId);
  return {
    $schema:'https://vega.github.io/schema/vega-lite/v6.json',
    description:difference?`${chart.caption} Shown as the difference between neighbouring bands, computed in the specification.`:chart.caption,
    data:{values},
    ...transform,
    title:{text:params.chartTitle?.trim()||chart.caption,subtitle:[params.subtitle?.trim(),sourceNote].filter((part):part is string=>!!part),anchor:'start' as const},
    mark:{type:mark,filled:true,...(params.colorByCategory?{}:{color:FIGURE_ROLE.primary}),...(mark==='point'?{size:110}:{})},
    encoding:orientation==='horizontal'
      ?{x:{...quantity,title:params.xAxisTitle?.trim()||quantityTitle},y:{...category,title:params.yAxisTitle?.trim()||'Category'},...color,tooltip:[{field:'displayLabel',type:'nominal' as const,title:'Category'},{field:difference?'bandCount':'count',type:'quantitative' as const,title:quantityTitle},...(difference?[{field:'count',type:'quantitative' as const,title:'Cumulative to this band'}]:[])]}
      :{x:{...category,title:params.xAxisTitle?.trim()||'Category'},y:{...quantity,title:params.yAxisTitle?.trim()||quantityTitle},...color,tooltip:[{field:'displayLabel',type:'nominal' as const,title:'Category'},{field:difference?'bandCount':'count',type:'quantitative' as const,title:quantityTitle},...(difference?[{field:'count',type:'quantitative' as const,title:'Cumulative to this band'}]:[])]},
    width:Math.min(560,Math.max(300,chart.bins.length*72)),
    height:orientation==='horizontal'?Math.max(140,chart.bins.length*38):280,
    // One type scale with the map, including the family: a chart that inherits the page font and a
    // map that names Arial are two figures, not a pair.
    config:{view:{stroke:null},font:FIGURE_TYPE.family,
      axis:{labelFontSize:FIGURE_TYPE.tick,titleFontSize:FIGURE_TYPE.axisTitle,labelColor:FIGURE_ROLE.quietInk,titleColor:FIGURE_ROLE.ink},
      title:{fontSize:FIGURE_TYPE.title,subtitleFontSize:FIGURE_TYPE.subtitle,color:FIGURE_ROLE.ink,subtitleColor:FIGURE_ROLE.quietInk},
      legend:{labelFontSize:FIGURE_TYPE.legend,titleFontSize:FIGURE_TYPE.legend,labelColor:FIGURE_ROLE.quietInk}},
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
  const rendererSpec=node.params.renderer==='vega-lite'?JSON.stringify(chartVegaSpec(chart,node.params,{sourceId,runId})):null;
  return `@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix dcterms: <http://purl.org/dc/terms/>.\n`+
    `${spec} a fw:ChartSpecification, prov:Plan; dcterms:title ${JSON.stringify(title)}; fw:chartRenderer ${JSON.stringify(node.params.renderer||'html')}; fw:chartMark ${JSON.stringify(node.params.mark||'bar')}; fw:chartOrientation ${JSON.stringify(node.params.orientation||'horizontal')}; fw:chartField ${JSON.stringify(chart.field)}; fw:chartMeasureKind ${JSON.stringify(banded?`band-difference-of-${measureKind}`:measureKind)}; fw:chartUnitStatus ${JSON.stringify(unitStatus)}; fw:chartLegend ${!!node.params.colorByCategory}; fw:chartSourceNote ${JSON.stringify(sourceNote)}; prov:wasDerivedFrom <urn:fieldwork:run:${runId}:output:${sourceId}>.\n`+
    (rendererSpec?`${spec} fw:rendererSpecification ${JSON.stringify(rendererSpec)}; fw:chartRendererVersion ${JSON.stringify(`vega-lite@${appPackage.dependencies['vega-lite']}; vega-embed@${appPackage.dependencies['vega-embed']}`)}.\n`:'')+
    (node.params.subtitle?.trim()?`${spec} dcterms:description ${JSON.stringify(node.params.subtitle.trim())}.\n`:'')+
    (node.params.xAxisTitle?.trim()?`${spec} fw:chartXAxisTitle ${JSON.stringify(node.params.xAxisTitle.trim())}.\n`:'')+
    (node.params.yAxisTitle?.trim()?`${spec} fw:chartYAxisTitle ${JSON.stringify(node.params.yAxisTitle.trim())}.\n`:'')+
    `${activity} fw:chartSpecification ${spec}; prov:used ${spec}.\n`+
    (node.references||[]).map(ref=>`${spec} dcterms:references <urn:fieldwork:run:${runId}:reference:${node.id}:${ref.id}>.\n`).join('');
}

export function disposeVegaChart(){generation++;current?.finalize();current=null;}
export async function renderVegaChart(host:HTMLElement,chart:ChartSummary,params:ChartParams,context:{sourceId?:string;runId?:string}={}):Promise<void>{
  disposeVegaChart();
  const ticket=generation;
  const spec=chartVegaSpec(chart,params,context);
  const {default:embed}=await import('vega-embed');
  if(ticket!==generation||!host.isConnected)return;
  const result=await embed(host,spec,{mode:'vega-lite',renderer:'svg',actions:{export:{svg:true,png:false},source:false,compiled:false,editor:false},tooltip:true});
  if(ticket!==generation||!host.isConnected){result.finalize();return;}
  current=result;
}
