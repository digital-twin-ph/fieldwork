import type {WorkflowNode} from './types.js';
import type {ChartSummary,DisplayValue,Receipt} from './results.js';

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
    chart.bins.map((bin,i)=>`${result} fw:countBin <urn:fieldwork:run:${runId}:chart:${node.id}:bin:${i}>.\n<urn:fieldwork:run:${runId}:chart:${node.id}:bin:${i}> a fw:CountBin; fw:categoryKey "${bin.key}"; fw:recordCount ${bin.count}.\n`).join('');
  return {value:{...structuredClone(input),chart},receipt:{nodeId:node.id,kind:'computation',facts,rules:'',input:facts,conclusions:[],method:'Categorical frequency: count every input row once; retain zero-count categories and report missing or unrecognized categories separately. No population weighting, filtering or new inference.'}};
}

export function chartMarkup(chart:ChartSummary,esc:(text:string)=>string):string{
  const maximum=Math.max(1,...chart.bins.map(bin=>bin.count));
  return `<p class="muted">${esc(chart.caption)} · ${chart.total} records · grouping: ${esc(chart.field)}</p>`+
    chart.bins.map(bin=>`<div class="bar-row"><span>${esc(bin.label)}</span><div class="bar-track" aria-hidden="true"><div style="width:${bin.count/maximum*100}%"></div></div><b>${bin.count}</b></div>`).join('');
}
