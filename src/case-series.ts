import type {DataTable} from './data-table.js';
import type {PointCollection,WorkflowNode} from './types.js';
import type {ChartSummary,Receipt} from './results.js';

/** Cases by period: the time axis, built on the input the application already has.
 *
 *  A series states what it is a series of. The kind of date is required, because a curve by date of
 *  death is not a curve by date of onset and the two must never be read as interchangeable; the
 *  weight is declared, because a row may stand for several people, as the John Snow file's 250 rows
 *  carry 489 deaths. See docs/experiments/61-input-dimensions.md. */
export const DATE_KINDS=['onset','report','death','specimen-collection','other'] as const;
export type DateKind=typeof DATE_KINDS[number];
export const PERIODS=['day','week','month'] as const;
export type Period=typeof PERIODS[number];

export interface SeriesBin {key:string; label:string; count:number}
export interface CaseSeries {
  kind:'case-series'; bins:SeriesBin[]; total:number; period:Period; dateKind:DateKind;
  dateField:string; weightField:string|null; datedRecords:number; undatedRecords:number;
  undated:{id:string; name:string; value:string}[]; firstPeriod:string|null; lastPeriod:string|null;
}
export type SeriesTable=DataTable&{series:CaseSeries};

const ISO=/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/;
const pad=(n:number)=>String(n).padStart(2,'0');

/** ISO 8601 only. A widget that guessed between day-first and month-first ordering would be wrong
 *  silently for a third of the year, so an unrecognised value is reported as undated, never parsed. */
function parseDate(value:unknown):{year:number;month:number;day:number}|null{
  const text=typeof value==='string'?value.trim():typeof value==='number'?String(value):'';
  const match=ISO.exec(text);
  if(!match)return null;
  const [,year,month,day]=match.map(Number) as unknown as [string,number,number,number];
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return {year,month,day};
}
const utc=(d:{year:number;month:number;day:number})=>Date.UTC(d.year,d.month-1,d.day);

function periodKey(parts:{year:number;month:number;day:number},period:Period):string{
  if(period==='month')return `${parts.year}-${pad(parts.month)}`;
  if(period==='day')return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  // Week beginning Monday, ISO 8601, keyed by that Monday so order is the key's order.
  const date=new Date(utc(parts));
  date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
  return date.toISOString().slice(0,10);
}
const nextKey=(key:string,period:Period):string=>{
  if(period==='month'){const [y,m]=key.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${pad(m+1)}`;}
  const date=new Date(key+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+(period==='week'?7:1));
  return date.toISOString().slice(0,10);
};
const label=(key:string,period:Period)=>period==='week'?`Week beginning ${key}`:key;

export interface SeriesOptions {dateField:string; dateKind:DateKind; period:Period; weightField?:string|null}

/** The same series from a keyed table, because a time series often arrives without geometry: Snow's
 *  daily table of attacks and deaths has dates and no places, while his map has places and no dates.
 *  Neither can be turned into the other, which is why both paths exist. */
export function caseSeriesFromTable(table:DataTable,options:Omit<SeriesOptions,'weightField'>):CaseSeries{
  const {dateField,dateKind,period}=options;
  if(table?.kind!=='data-table')throw new Error('Connect a table of counts by date.');
  if(!table.keys.includes(dateField))
    throw new Error(`The table has no key column "${dateField}". Its key columns are: ${table.keys.join(', ')}.`);
  const features=table.rows.map((row,index)=>({type:'Feature' as const,id:`row-${index+1}`,
    properties:{name:`Row ${index+1}`,[dateField]:row.key[dateField],
      [table.valueField]:row.value===null?'':row.value} as Record<string,unknown>,geometry:null}));
  return caseSeries({type:'FeatureCollection',features} as unknown as PointCollection,
    {dateField,dateKind,period,weightField:table.valueField});
}

export function caseSeries(points:PointCollection,options:SeriesOptions):CaseSeries{
  const {dateField,dateKind,period}=options,weightField=options.weightField?.trim()||null;
  if(!dateField?.trim())throw new Error('Name the attribute holding the event date. This widget reads no date it was not told about.');
  if(!DATE_KINDS.includes(dateKind))throw new Error(`State which kind of date this is: ${DATE_KINDS.join(', ')}. A curve by date of death is not a curve by date of onset.`);
  if(!PERIODS.includes(period))throw new Error(`Choose a period: ${PERIODS.join(', ')}.`);
  if(!points?.features?.length)throw new Error('Cases by period needs at least one record.');

  const counts=new Map<string,number>(),undated:CaseSeries['undated']=[];
  let total=0,datedRecords=0;
  for(const feature of points.features){
    const properties=feature.properties as Record<string,unknown>;
    const parts=parseDate(properties[dateField]);
    if(!parts){
      undated.push({id:String(feature.id),name:String(properties.name??feature.id),
        value:properties[dateField]===undefined?'(attribute absent)':String(properties[dateField]??'')});
      continue;
    }
    let weight=1;
    if(weightField){
      const raw=properties[weightField];
      weight=typeof raw==='number'?raw:Number(String(raw??'').trim());
      if(!Number.isFinite(weight)||weight<0)
        throw new Error(`Record ${feature.id} has a case weight of "${String(raw)}" in "${weightField}". A weight must be a number of at least zero; it is not guessed.`);
    }
    const key=periodKey(parts,period);
    counts.set(key,(counts.get(key)??0)+weight);
    total+=weight;datedRecords++;
  }
  const keys=[...counts.keys()].sort();
  const bins:SeriesBin[]=[];
  // Zero-count periods are retained: a gap in a curve is a fact about the outbreak, and omitting
  // empty periods would compress the time axis and misstate the shape.
  for(let key=keys[0];key!==undefined&&key<=keys[keys.length-1];key=nextKey(key,period)){
    bins.push({key,label:label(key,period),count:counts.get(key)??0});
    if(bins.length>5000)throw new Error('This date range produces more than 5,000 periods. Choose a longer period.');
  }
  return {kind:'case-series',bins,total,period,dateKind,dateField,weightField,
    datedRecords,undatedRecords:undated.length,undated:undated.slice(0,50),
    firstPeriod:keys[0]??null,lastPeriod:keys[keys.length-1]??null};
}

export function seriesTable(series:CaseSeries):SeriesTable{
  return {kind:'data-table',keys:['period'],valueField:'cases',
    rows:series.bins.map(bin=>({key:{period:bin.key},value:bin.count})),
    rowCount:series.bins.length,missingValueCount:0,series};
}

/** The chart a Chart output renders: ordered period bins, which is what an epidemic curve is. */
export function seriesChart(series:CaseSeries):ChartSummary{
  const kinds:Record<DateKind,string>={onset:'date of onset',report:'date of report',death:'date of death',
    'specimen-collection':'date of specimen collection',other:'a date of unstated kind'};
  return {field:'period',total:series.total,bins:series.bins,
    caption:`Cases by ${series.period} of ${kinds[series.dateKind]}`+(series.weightField?`, weighted by ${series.weightField}`:'')
      +(series.undatedRecords?` · ${series.undatedRecords} record(s) without a usable date are excluded and listed`:'')};
}

export function seriesReceipt(node:{id:string},series:CaseSeries,runId:string,source:string):Receipt{
  const base=`urn:fieldwork:run:${runId}:`,entity=`<${base}output:${node.id}>`,activity=`<${base}output:${node.id}:activity>`;
  const quote=(value:string)=>JSON.stringify(value);
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n'
    +`${activity} a fw:CaseSeriesComputation, prov:Activity; prov:used <${base}output:${source}>; `
    +`fw:eventDateField ${quote(series.dateField)}; fw:eventDateKind ${quote(series.dateKind)}; fw:seriesPeriod ${quote(series.period)}`
    +(series.weightField?`; fw:caseWeightField ${quote(series.weightField)}`:'')+'.\n'
    +`${entity} a fw:CaseSeries, prov:Entity; prov:wasGeneratedBy ${activity}; fw:eventDateKind ${quote(series.dateKind)}; `
    +`fw:seriesPeriod ${quote(series.period)}; fw:seriesTotal "${series.total}"^^xsd:decimal; `
    +`fw:datedRecordCount "${series.datedRecords}"^^xsd:integer; fw:undatedRecordCount "${series.undatedRecords}"^^xsd:integer.\n`;
  for(const [index,bin] of series.bins.entries())
    facts+=`${entity} fw:seriesBin <${base}output:${node.id}:period:${index}>.\n<${base}output:${node.id}:period:${index}> a fw:SeriesBin; fw:periodKey ${quote(bin.key)}; fw:caseCount "${bin.count}"^^xsd:decimal.\n`;
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`Cases per ${series.period} by ${series.dateKind} date${series.weightField?`, weighted by ${series.weightField}`:', one case per record'}. Zero-count periods are retained; records without an ISO 8601 date are excluded and counted, never redistributed.`};
}

export function validateCaseSeriesNode(node:WorkflowNode):void{
  if(node.type!=='case_series')return;
  const p=node.params;
  if(!p.dateField?.trim())throw new Error('Name the event date attribute for Cases by period.');
  if(!DATE_KINDS.includes(p.dateKind))throw new Error('State which kind of date Cases by period uses.');
  if(!PERIODS.includes(p.period))throw new Error('Choose day, week or month for Cases by period.');
}
