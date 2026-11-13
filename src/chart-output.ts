import type {WorkflowNode} from './types.js';
import type {BarOrder,ChartSummary,DisplayValue,Receipt} from './results.js';
import type {DataTable} from './data-table.js';
import {chartSpecificationFacts} from './chart-vega.js';
import {orderOf} from './select-rows.js';
import {inDeclaredOrder,type Scale,type Code} from './column-metadata.js';

/** A BAR'S NUMBER, written for a reader.
 *
 *  A frequency is an integer and a rate is not: 5.113636363636363 is the arithmetic and not the
 *  figure. Three significant digits beyond the point keep the sub-districts apart -- the closest
 *  pair on South London's table differ by nine hundredths -- without printing the division's
 *  whole tail. A count prints as itself. */
export function barNumber(value:number,measure?:ChartSummary['measure']):string{
  if(measure!=='value'||Number.isInteger(value))return value.toLocaleString('en');
  return value.toLocaleString('en',{maximumFractionDigits:3});
}

/** A TABLE IS A CHART when it has categories and a number each, whatever role it was given.
 *
 *  The practitioner, 2026-10-28: *"If the table's role is to represent decisions, it's still a
 *  table and if it has categories with numeric values, it can be presented as a chart."* A
 *  `DataTable` declares both halves itself -- `keys` names the category column and `valueField`
 *  names the number -- so nothing is asked for and nothing is guessed: a rate of deaths per
 *  1,000 people across 32 sub-districts is already a bar chart and was only missing somewhere to
 *  arrive.
 *
 *  A row with no value is kept and shown as zero-length rather than dropped, and counted in the
 *  caption: a sub-district whose rate was suppressed is not a sub-district with a rate of zero,
 *  and a chart that silently omitted it would be shorter than the table beside it. */
/** WHAT THE NUMBERS ARE: a table's value column, or, where every row is a share Total within groups made (its
 *  `statistic` key holding one value, such as "% within source"), that share (2026-11-13: Botswana's shares were captioned
 *  "population by name"). */
const measured=(table:DataTable):string=>{
  if(!table.keys.includes('statistic'))return table.valueField;
  const kinds=new Set(table.rows.map(r=>r.key.statistic));
  return kinds.size===1?[...kinds][0]!:table.valueField;
};
export function tableChart(table:DataTable,keyColumn?:string,panelsBy?:string,
    said:Record<string,{scale?:Scale;codes?:readonly Code[]}>={}):ChartSummary{
  if(panelsBy?.trim())return panelChart(table,keyColumn,panelsBy.trim());
  if(table.kind!=='data-table')throw new Error('A chart of a table needs a table.');
  if(table.interval)return intervalChart(table,keyColumn);
  const column=keyColumn?.trim()||table.keys[0];
  if(!column)throw new Error('This table has no key column, so there is nothing to put a bar '
    +'against.');
  if(!table.keys.includes(column))
    throw new Error(`This table has no "${column}" column. Its columns are ${table.keys.join(', ')}.`);
  if(!table.rows.length)throw new Error('This table holds no rows, so there is nothing to chart.');
  const absent=table.rows.filter(row=>row.value===null).length;
  const seen=new Map<string,number>();
  // WHAT THE COLUMN WAS DECLARED TO BE (experiment 211): an ordinal column's bars in its declared order, and a code's
  // meaning beside the code, the value itself never replaced.
  const declared=said[column];
  const meaning=(value:string)=>declared?.codes?.find(c=>c.value===value)?.label;
  const bins=inDeclaredOrder(table.rows,row=>row.key[column]??'',declared).map(row=>{
    const value=row.key[column]??'',label=meaning(value)?`${value} ${meaning(value)}`:value;
    // A KEY HAS TO BE UNIQUE for the renderer, and two rows may share a category when the table
    // keys on more than one column. The repeat is numbered rather than merged: adding them would
    // be a total nobody asked for, and a rate is not addable at all.
    const seenBefore=seen.get(value)??0;
    seen.set(value,seenBefore+1);
    return {key:seenBefore?`${value}#${seenBefore+1}`:value||'(unnamed)',
      label:label||'(unnamed)',count:row.value??0};
  });
  const other=table.keys.filter(name=>name!==column);
  return {field:'value',measure:'value',
    ...(table.unit?{unit:table.unit}:{}),
    categoryTitle:column,
    caption:`${measured(table)} by ${column}`
      +(other.length?` · one bar per row, keyed also by ${other.join(', ')}`:'')
      +(absent?` · ${absent} row${absent===1?'':'s'} with no value, drawn at zero`:''),
    total:table.rows.length,bins};
}

/** AN ESTIMATE AND ITS INTERVAL AT EACH CATEGORY, a lag-response or forest plot (experiment 181).
 *
 *  The practitioner, 2026-11-06: *"what is the best way to visualize the relationship between ground warming lag
 *  times and dengue cases?"* A table that declares an interval holds the estimate and its two limits as three rows,
 *  told apart by the declared column; they are gathered here into one point with a whisker. The rows that belong
 *  together are those that agree on every other key column. A group missing a limit is drawn without its whisker and
 *  counted in the caption; one missing the estimate is not drawn, and is counted. */
function intervalChart(table:DataTable,keyColumn?:string):ChartSummary{
  const interval=table.interval!;
  const others=table.keys.filter(k=>k!==interval.column);
  const column=keyColumn?.trim()||others[0];
  if(!column)throw new Error('This table has no key column besides its statistics, so there is nothing to place an estimate at.');
  if(column===interval.column)throw new Error(`"${column}" names the statistics; choose the column the estimates are placed at.`);
  if(!table.keys.includes(column))
    throw new Error(`This table has no "${column}" column. Its columns are ${table.keys.join(', ')}.`);
  if(!table.rows.length)throw new Error('This table holds no rows, so there is nothing to chart.');
  const groups=new Map<string,{label:string;estimate?:number|null;lower?:number|null;upper?:number|null;rest:string}>();
  for(const row of table.rows){
    const rest=others.filter(k=>k!==column).map(k=>row.key[k]??'').join(' · ');
    const id=JSON.stringify(others.map(k=>row.key[k]??''));
    const group=groups.get(id)??{label:row.key[column]??'',rest};
    const statistic=row.key[interval.column];
    if(statistic===interval.estimate)group.estimate=row.value;
    else if(statistic===interval.lower)group.lower=row.value;
    else if(statistic===interval.upper)group.upper=row.value;
    groups.set(id,group);
  }
  const all=[...groups.values()];
  const drawn=all.filter(g=>g.estimate!==undefined&&g.estimate!==null);
  if(!drawn.length)throw new Error(`No row of this table holds the ${interval.estimate}, so there is nothing to draw.`);
  const noEstimate=all.length-drawn.length;
  const noLimits=drawn.filter(g=>g.lower===undefined||g.lower===null||g.upper===undefined||g.upper===null).length;
  // A RATIO AT OR BELOW ZERO cannot sit on a log scale, and is not a ratio: stopped, naming it.
  if(interval.ratio){
    const bad=drawn.find(g=>[g.estimate,g.lower,g.upper].some(v=>typeof v==='number'&&v<=0));
    if(bad)throw new Error(`The ${interval.estimate} at ${column} = ${bad.label} has a value at or below zero, which no ratio has.`);
  }
  const unit=table.numericKeys?.[column];
  const repeated=new Set(drawn.map(g=>g.label)).size!==drawn.length;
  const bins=drawn.map((g,i)=>({key:repeated?`${g.label}#${i+1}`:g.label||'(unnamed)',
    label:repeated&&g.rest?`${g.label} (${g.rest})`:g.label||'(unnamed)',count:g.estimate as number,
    ...(typeof g.lower==='number'?{lower:g.lower}:{}),...(typeof g.upper==='number'?{upper:g.upper}:{}),
    ...(unit!==undefined&&Number.isFinite(Number(g.label))?{order:Number(g.label)}:{})}));
  return {field:'value',measure:'value',categoryTitle:unit?`${column} (${unit})`:column,
    interval:{estimate:interval.estimate,level:interval.level,ratio:interval.ratio},
    ...(unit!==undefined?{numericCategory:{unit}}:{}),
    caption:`${interval.estimate} with its ${interval.level}% interval by ${column}`
      +(repeated&&others.length>1?` · one point per row, keyed also by ${others.filter(k=>k!==column).join(', ')}`:'')
      +(noLimits?` · ${noLimits} without an interval`:'')
      +(noEstimate?` · ${noEstimate} with no ${interval.estimate}, not drawn`:''),
    total:all.length,bins};
}

/** ONE PANEL PER VALUE of a key column, for variables that move together through time (experiment 174).
 *
 *  The practitioner, 2026-11-04: *"How do we show the dependent and independent variables moving together through
 *  time?"* A wide file melted by Table input holds them as one variable column and one value column; each variable
 *  becomes a panel with its own scale, on one shared x axis. A missing value is marked rather than drawn at zero, so a
 *  line breaks there instead of diving to nothing. */
/** The table's own limit, measured (experiment 175): 250,000 points drew in 32 s in Chromium, 100,000 in 10 s. */
export const PANEL_POINT_LIMIT=250_000;
function panelChart(table:DataTable,keyColumn:string|undefined,panelsBy:string):ChartSummary{
  if(table.kind!=='data-table')throw new Error('A chart of a table needs a table.');
  const column=keyColumn?.trim()||table.keys.find(key=>key!==panelsBy);
  if(!column)throw new Error('Panels need a key column to run along, besides the one the panels are made from.');
  for(const name of [column,panelsBy])if(!table.keys.includes(name))
    throw new Error(`This table has no "${name}" column. Its columns are ${table.keys.join(', ')}.`);
  if(column===panelsBy)throw new Error(`"${column}" cannot be both the axis and the panels.`);
  if(!table.rows.length)throw new Error('This table holds no rows, so there is nothing to chart.');
  if(table.rows.length>PANEL_POINT_LIMIT)throw new Error(`Panels draw at most ${PANEL_POINT_LIMIT.toLocaleString('en')} `
    +`points, and this table has ${table.rows.length.toLocaleString('en')}. Select a period first.`);
  const panels:string[]=[],seen=new Set<string>();
  const bins=table.rows.map(row=>{
    const panel=row.key[panelsBy]??'',label=row.key[column]??'';
    if(!panels.includes(panel))panels.push(panel);
    // Unique within its panel, which is what the renderer needs; two rows on one date in one panel is a repeated key,
    // already a finding of the table, and is refused here rather than drawn as two points on one day.
    const key=`${panel}\u0000${label}`;
    if(seen.has(key))throw new Error(`"${label}" appears twice in the ${panel} panel. Each panel needs one row per `
      +`${column}; the table's findings name the repeat.`);
    seen.add(key);
    return {key,label,count:row.value??0,panel,...(row.value===null?{missing:true as const}:{})};
  });
  const labels=bins.map(bin=>bin.label);
  const temporal=orderOf(labels)==='date'&&labels.every(label=>label.length===10);
  const absent=bins.filter(bin=>bin.missing).length;
  // WHAT EACH PANEL MEASURES, where the table carries an accepted description of the column it came from.
  const meanings=Object.fromEntries(panels.map(name=>{const m=table.columns?.[name];
    const text=m?.confirmed?(m.label?.trim()||m.description?.trim()||''):'';
    return [name,text?`${text}${m!.unit?.trim()?` (${m!.unit.trim()})`:''}`:''];}).filter(([,m])=>m));
  return {field:'value',measure:'value',...(table.unit?{unit:table.unit}:{}),categoryTitle:column,
    ...(Object.keys(meanings).length?{meanings}:{}),
    caption:`${measured(table)} by ${column}, one panel per ${panelsBy}`
      +(absent?` · ${absent} point${absent===1?'':'s'} with no value, left as gaps`:''),
    total:table.rows.length,panels,temporal,bins};
}

/** Bounded categorical frequency adapter. No filtering or population weighting. */
export function summarizeChart(input:DisplayValue):ChartSummary{
  if(!input||!Array.isArray(input.rows)||!Array.isArray(input.centers)||
    (input.kind!==undefined&&!['access','facility-evidence'].includes(input.kind)))throw new Error('Chart needs a supported reasoning result.');
  const audit=input.kind==='facility-evidence',access=input.kind==='access';
  const field=audit?'tier':access?'zone':'status';
  const categories=audit?[['Direct','Direct'],['Contextual','Contextual'],['Inferential','Inferential'],['None','No evidence']]:access?
    [['Within5','≤ 5 min'],['Within15','5–15 min'],['Within30','15–30 min'],['Over30','> 30 min'],['Unknown','Unknown']]:
    [['Review','Review'],['NoFlag','No flag'],['Unknown','Insufficient data']];
  const bins=categories.map(([key,label])=>({key:key!,label:label!,count:0}));
  let unclassified=0;
  for(const row of input.rows){const bin=bins.find(b=>b.key===row[field]);if(bin)bin.count++;else unclassified++;}
  if(unclassified)bins.push({key:'Unclassified',label:'Unclassified / missing category',count:unclassified});
  const caption=audit?'Facilities by evidence tier':access?
    `${input.locationSource?.kind==='input-points'?'Input locations':'Generated sample locations'} by proxy access zone · not population counts`:'Locations by decision';
  return {field,caption,total:input.rows.length,bins};
}

export function chartOutput(node:WorkflowNode<'chart_output'>,input:DisplayValue,sourceNodeId:string,runId:string):{value:DisplayValue;receipt:Receipt}{
  const chart=summarizeChart(input),activity=`<urn:fieldwork:run:${runId}:view:${node.id}>`,source=`<urn:fieldwork:run:${runId}:output:${sourceNodeId}>`,result=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n'+
    `${activity} a fw:ChartView, fw:CategoricalCount, prov:Activity; prov:used ${source}; fw:groupingField "${chart.field}"; fw:inputRecordCount ${chart.total}.\n${result} a prov:Entity; prov:wasGeneratedBy ${activity}; prov:wasDerivedFrom ${source}.\n`+
    chart.bins.map((bin,i)=>`${result} fw:countBin <urn:fieldwork:run:${runId}:chart:${node.id}:bin:${i}>.\n<urn:fieldwork:run:${runId}:chart:${node.id}:bin:${i}> a fw:CountBin; fw:categoryKey "${bin.key}"; fw:recordCount ${bin.count}.\n`).join('')+
    chartSpecificationFacts(node,runId,sourceNodeId,chart,'record-count');
  return {value:{...structuredClone(input),chart},receipt:{nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:'Categorical frequency: count every input row once; retain zero-count categories and report missing or unrecognized categories separately. No population weighting, filtering or new inference.'}};
}

/** Bars without a charting library, in either direction.
 *
 *  Vertical is for a series, where the x axis is time and a reader follows it left to
 *  right; horizontal is for categories, where the label needs room. Both render the same
 *  numbers from the same bins: the orientation changes the reading, not the measure. */
/** HOW THE BARS ARE ORDERED.
 *
 *  The practitioner, 2026-10-31: *"there should be an option in the widget to display a bar chart
 *  where the bars are ordered from largest to smallest or reverse or category name-ordered
 *  (current display)."* The argument for it was already on the canvas: South London's chart node
 *  is labelled **"Deaths per 1,000 people, ranked"** and drew them alphabetically, so the label
 *  claimed a capability that did not exist.
 *
 *  AND IT IS REFUSED WHERE THE CATEGORIES ARE A SEQUENCE. A bin may carry an `order`, which is
 *  what an epidemic curve's days and a travel-time band's thresholds use: those categories mean
 *  something in the order they are in, and sorting them by size would destroy the one thing the
 *  figure is for. `orderableBins` answers whether a chart may be re-ordered at all, so the
 *  Inspector can decline to offer a control that could not act -- this project's rule, and the
 *  reason the option is not simply applied to whatever arrives. */
export const BAR_ORDERS:readonly BarOrder[]=['category','largest','smallest'];

/** Whether these bins may be re-ordered. False where any bin declares its place in a sequence. */
export const orderableBins=(bins:readonly {order?:number}[]):boolean=>
  !bins.some(bin=>bin.order!==undefined);

/** The bins in the order asked for, or in the order they arrived where that cannot be honoured.
 *
 *  Pure, and it never mutates: `chart.bins` is carried on a run's value and a renderer that
 *  sorted it in place would reorder the chart every other surface draws from the same object. */
export function orderBins<T extends {label:string; count:number; order?:number}>(
  bins:readonly T[],order:BarOrder|undefined):T[]{
  if(!order||order==='category'||!orderableBins(bins))return [...bins];
  const by=order==='largest'?-1:1;
  // Ties keep the order they arrived in, which for a table is its own row order: a sort that
  // shuffled equal values would make the same data draw differently on two runs.
  return [...bins].map((bin,at)=>({bin,at}))
    .sort((a,b)=>(a.bin.count-b.bin.count)*by||a.at-b.at)
    .map(({bin})=>bin);
}

export function chartMarkup(chart:ChartSummary,esc:(text:string)=>string,
  orientation:'horizontal'|'vertical'='horizontal'):string{
  // PANELS ARE NOT DRAWN HERE. This renderer has one scale, and panels exist because their variables do not share one;
  // drawing them as bars on it would be the figure experiment 174 refuses.
  if(chart.panels?.length)return `<p class="notice">${esc(chart.caption)}. Panels are drawn by the Vega-Lite renderer: `
    +`choose it under Chart enhancement to see them.</p>`;
  // NOR ARE INTERVALS: a bar from zero is the wrong mark for an estimate whose whisker is the point (experiment 181).
  if(chart.interval)return `<p class="notice">${esc(chart.caption)}. Estimates with their intervals are drawn by the `
    +`Vega-Lite renderer: choose it under Chart enhancement to see them.</p>`;
  const maximum=Math.max(1,...chart.bins.map(bin=>bin.count));
  // BARS THAT GO BOTH WAYS, because a CHANGE is the quantity that goes negative.
  //
  // The practitioner, 2026-10-31, after the Snow 1849/1854 figure could not be drawn: *"There
  // should be a way to present bars with positive and negative values."* Until then the Vega
  // renderer refused outright -- "at most 100 nonnegative, finite bins" -- and this one would
  // have clamped a negative bar to zero width SILENTLY, which is the worse of the two.
  //
  // The scale runs from the lowest value or zero, whichever is lower, to the highest. So a chart
  // with no negative value has `low` of 0, every offset is 0 and every width is `count/high`,
  // which is byte-for-byte what it drew before -- the `left` is emitted only where it is needed,
  // so no existing figure changes at all.
  const low=Math.min(0,...chart.bins.map(bin=>bin.count));
  const high=Math.max(1,...chart.bins.map(bin=>bin.count));
  const span=high-low||1;
  const diverging=low<0;
  /** Where a bar starts and how long it is, as percentages of the whole track. A negative bar
   *  runs leftward FROM zero; a positive one runs rightward from it. */
  const geometry=(count:number)=>count<0
    ?{offset:(count-low)/span*100,size:(0-count)/span*100}
    :{offset:(0-low)/span*100,size:count/span*100};
  /** The zero line, drawn only where values fall on both sides of it: a baseline on a chart that
   *  has no negative value marks the left edge and tells a reader nothing. */
  const baseline=diverging
    ?`<i class="bar-zero" aria-hidden="true" style="left:${((0-low)/span*100).toFixed(4)}%"></i>`
    :'';
  // The ORDER the chart carries, decided where the node's parameters were known. Both renderers
  // read it from the same place, so the figure in the write-up and the figure on the screen
  // cannot be sorted differently.
  const bins=orderBins(chart.bins,chart.barOrder);
  const caption=`<p class="muted">${esc(chart.caption)} · ${chart.records!==undefined?`${chart.total.toLocaleString('en')} cases from ${chart.records.toLocaleString('en')} records`:`${chart.total.toLocaleString('en')} records`} · grouping: ${esc(chart.field)}`
    +`${chart.unit?' · '+esc(chart.unit):''}</p>`;
  if(orientation==='vertical')
    return caption+`<div class="bar-columns" role="img" aria-label="${esc(chart.caption)}">`
      +bins.map(bin=>{
        const g=geometry(bin.count);
        const style=diverging
          ?`bottom:${g.offset.toFixed(4)}%;height:${g.size.toFixed(4)}%`
          :`height:${bin.count/maximum*100}%`;
        return `<div class="bar-column"><b>${esc(barNumber(bin.count,chart.measure))}</b>`
          +`<div class="bar-stack${diverging?' diverging':''}" aria-hidden="true">${baseline}`
          +`<div class="${bin.count<0?'bar-negative':'bar-positive'}" style="${style}"></div></div>`
          +`<span>${esc(bin.label)}</span></div>`;
      }).join('')+`</div>`;
  return caption+bins.map(bin=>{
    const g=geometry(bin.count);
    const style=diverging
      ?`left:${g.offset.toFixed(4)}%;width:${g.size.toFixed(4)}%`
      :`width:${bin.count/maximum*100}%`;
    return `<div class="bar-row${diverging?' diverging':''}"><span>${esc(bin.label)}</span>`
      +`<div class="bar-track" aria-hidden="true">${baseline}`
      +`<div class="${bin.count<0?'bar-negative':'bar-positive'}" style="${style}"></div></div>`
      +`<b>${esc(barNumber(bin.count,chart.measure))}</b></div>`;
  }).join('');
}
