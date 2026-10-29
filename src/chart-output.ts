import type {WorkflowNode} from './types.js';
import type {ChartSummary,DisplayValue,Receipt} from './results.js';
import type {DataTable} from './data-table.js';
import {chartSpecificationFacts} from './chart-vega.js';

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
export function tableChart(table:DataTable,keyColumn?:string):ChartSummary{
  if(table.kind!=='data-table')throw new Error('A chart of a table needs a table.');
  const column=keyColumn?.trim()||table.keys[0];
  if(!column)throw new Error('This table has no key column, so there is nothing to put a bar '
    +'against.');
  if(!table.keys.includes(column))
    throw new Error(`This table has no "${column}" column. Its columns are ${table.keys.join(', ')}.`);
  if(!table.rows.length)throw new Error('This table holds no rows, so there is nothing to chart.');
  const absent=table.rows.filter(row=>row.value===null).length;
  const seen=new Map<string,number>();
  const bins=table.rows.map(row=>{
    const label=row.key[column]??'';
    // A KEY HAS TO BE UNIQUE for the renderer, and two rows may share a category when the table
    // keys on more than one column. The repeat is numbered rather than merged: adding them would
    // be a total nobody asked for, and a rate is not addable at all.
    const seenBefore=seen.get(label)??0;
    seen.set(label,seenBefore+1);
    return {key:seenBefore?`${label}#${seenBefore+1}`:label||'(unnamed)',
      label:label||'(unnamed)',count:row.value??0};
  });
  const other=table.keys.filter(name=>name!==column);
  return {field:'value',measure:'value',
    ...(table.unit?{unit:table.unit}:{}),
    categoryTitle:column,
    caption:`${table.valueField} by ${column}`
      +(other.length?` · one bar per row, keyed also by ${other.join(', ')}`:'')
      +(absent?` · ${absent} row${absent===1?'':'s'} with no value, drawn at zero`:''),
    total:table.rows.length,bins};
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
export function chartMarkup(chart:ChartSummary,esc:(text:string)=>string,
  orientation:'horizontal'|'vertical'='horizontal'):string{
  const maximum=Math.max(1,...chart.bins.map(bin=>bin.count));
  const caption=`<p class="muted">${esc(chart.caption)} · ${chart.total} records · grouping: ${esc(chart.field)}`
    +`${chart.unit?' · '+esc(chart.unit):''}</p>`;
  if(orientation==='vertical')
    return caption+`<div class="bar-columns" role="img" aria-label="${esc(chart.caption)}">`
      +chart.bins.map(bin=>`<div class="bar-column"><b>${esc(barNumber(bin.count,chart.measure))}</b>`
        +`<div class="bar-stack" aria-hidden="true"><div style="height:${bin.count/maximum*100}%"></div></div>`
        +`<span>${esc(bin.label)}</span></div>`).join('')+`</div>`;
  return caption+chart.bins.map(bin=>`<div class="bar-row"><span>${esc(bin.label)}</span><div class="bar-track" aria-hidden="true"><div style="width:${bin.count/maximum*100}%"></div></div><b>${esc(barNumber(bin.count,chart.measure))}</b></div>`).join('');
}
