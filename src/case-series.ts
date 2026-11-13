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
/** `week` begins on a Monday (ISO 8601). `week-sunday` begins on a Sunday: the epidemiological week of Brazil's
 *  notification system and of the United States, as Brazil's `data_iniSE` records it (experiment 187). */
/** `weekday` is the day of the week, Monday to Sunday as ISO 8601 numbers them (the practitioner, 2026-11-12, asking
 *  whether Hagelloch's onsets fall on some days more than others): a cycle, not a time axis, so all seven are kept. */
/** `month-of-year` likewise: January to December, all twelve kept, for a season across years of data (the practitioner,
 *  2026-11-12: "Maybe we should also add month of the year"). */
export const PERIODS=['day','week','week-sunday','month','weekday','month-of-year'] as const;
export type Period=typeof PERIODS[number];
/** Each period in words, for the axis, the caption and the method. */
export const PERIOD_WORDS:Record<Period,string>={day:'day',week:'week','week-sunday':'week starting Sunday',month:'month',weekday:'day of the week','month-of-year':'month of the year'};
export const WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'] as const;
/** The cycles: a period that repeats, counted by its place in the cycle and not along time. */
const CYCLES:Partial<Record<Period,readonly string[]>>={weekday:WEEKDAYS,'month-of-year':MONTHS};

export interface SeriesBin {key:string; label:string; count:number;
  /** The value of the column the series is split by, where it is (experiment 210): one bin per period and value. */ group?:string}
export interface CaseSeries {
  kind:'case-series'; bins:SeriesBin[]; total:number; period:Period; dateKind:DateKind;
  /** SPLIT BY A COLUMN (experiment 210): its name and its values, in order; each bin then carries its group. */
  splitBy?:string; groups?:string[];
  dateField:string; weightField:string|null; datedRecords:number; undatedRecords:number;
  undated:{id:string; name:string; value:string}[]; firstPeriod:string|null; lastPeriod:string|null;
  /** The unit of each count, where the table read declares one: Brazil's "notified cases/week". */
  unit?:string;
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
  // 1 for Monday to 7 for Sunday, so the key's order is the week's.
  if(period==='weekday')return String((new Date(utc(parts)).getUTCDay()+6)%7+1);
  if(period==='month-of-year')return String(parts.month);
  // A week keyed by its first day, so order is the key's order: the Monday before (ISO 8601), or the Sunday before.
  const date=new Date(utc(parts));
  date.setUTCDate(date.getUTCDate()-(period==='week-sunday'?date.getUTCDay():(date.getUTCDay()+6)%7));
  return date.toISOString().slice(0,10);
}
const nextKey=(key:string,period:Period):string=>{
  if(period==='month'){const [y,m]=key.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${pad(m+1)}`;}
  const date=new Date(key+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+(period==='day'?1:7));
  return date.toISOString().slice(0,10);
};
const label=(key:string,period:Period)=>period==='week'||period==='week-sunday'?`Week beginning ${key}`
  :CYCLES[period]?CYCLES[period]![Number(key)-1]!:key;

export interface SeriesOptions {dateField:string; dateKind:DateKind; period:Period; weightField?:string|null; splitBy?:string|null}

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
  const series=caseSeries({type:'FeatureCollection',features} as unknown as PointCollection,
    {dateField,dateKind,period,weightField:table.valueField});
  // THE COUNTS KEEP THEIR UNIT: each row's value is summed as it is, so the table's unit is the series'.
  return table.unit?.trim()?{...series,unit:table.unit.trim()}:series;
}

export function caseSeries(points:PointCollection,options:SeriesOptions):CaseSeries{
  const {dateField,dateKind,period}=options,weightField=options.weightField?.trim()||null;
  if(!dateField?.trim())throw new Error('Name the attribute holding the event date. This widget reads no date it was not told about.');
  if(!DATE_KINDS.includes(dateKind))throw new Error(`State which kind of date this is: ${DATE_KINDS.join(', ')}. A curve by date of death is not a curve by date of onset.`);
  if(!PERIODS.includes(period))throw new Error(`Choose a period: ${PERIODS.map(x=>PERIOD_WORDS[x]).join(', ')}.`);
  if(!points?.features?.length)throw new Error('Cases by period needs at least one record.');

  const counts=new Map<string,number>(),undated:CaseSeries['undated']=[];
  // SPLIT BY A COLUMN (experiment 210): each period counted for each of its values, blank its own value, as a case
  // without a class is still a case.
  const splitBy=options.splitBy?.trim()||null,byGroup=new Map<string,Map<string,number>>();
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
    if(splitBy){const group=String(properties[splitBy]??'').trim(),held=byGroup.get(group)??new Map<string,number>();
      held.set(key,(held.get(key)??0)+weight);byGroup.set(group,held);}
    total+=weight;datedRecords++;
  }
  const keys=[...counts.keys()].sort();
  const bins:SeriesBin[]=[];
  // EVERY PLACE IN THE CYCLE, in its order: a day or a month with no case is a finding, as an empty period is.
  const cycle=CYCLES[period];
  if(cycle){
    for(const [i,name] of cycle.entries())bins.push({key:String(i+1),label:name,count:counts.get(String(i+1))??0});
    return {kind:'case-series',...splitBins(bins,splitBy,byGroup),total,period,dateKind,dateField,weightField,
      datedRecords,undatedRecords:undated.length,undated:undated.slice(0,50),firstPeriod:bins[0]!.key,lastPeriod:bins.at(-1)!.key};
  }
  // Zero-count periods are retained: a gap in a curve is a fact about the outbreak, and omitting
  // empty periods would compress the time axis and misstate the shape.
  for(let key=keys[0];key!==undefined&&key<=keys[keys.length-1];key=nextKey(key,period)){
    bins.push({key,label:label(key,period),count:counts.get(key)??0});
    if(bins.length>5000)throw new Error('This date range produces more than 5,000 periods. Choose a longer period.');
  }
  return {kind:'case-series',...splitBins(bins,splitBy,byGroup),total,period,dateKind,dateField,weightField,
    datedRecords,undatedRecords:undated.length,undated:undated.slice(0,50),
    firstPeriod:keys[0]??null,lastPeriod:keys[keys.length-1]??null};
}
/** Every period for every group, zeros kept; groups in their own order, numbers as numbers, blank last. */
function splitBins(bins:SeriesBin[],splitBy:string|null,byGroup:Map<string,Map<string,number>>):{bins:SeriesBin[];splitBy?:string;groups?:string[]}{
  if(!splitBy)return {bins};
  const groups=[...byGroup.keys()].sort((a,b)=>a===''?1:b===''?-1:Number.isFinite(Number(a))&&Number.isFinite(Number(b))?Number(a)-Number(b):a.localeCompare(b));
  return {splitBy,groups,bins:groups.flatMap(group=>bins.map(bin=>({...bin,group,count:byGroup.get(group)!.get(bin.key)??0})))};
}

/** The key column a case-series table carries. Named for the same reason as RATE_TABLE_KEYS. */
export const SERIES_TABLE_KEYS=['period'] as const;

export function seriesTable(series:CaseSeries):SeriesTable{
  return {kind:'data-table',keys:[...SERIES_TABLE_KEYS,...(series.splitBy?[series.splitBy]:[])],valueField:'cases',
    rows:series.bins.map(bin=>({key:{period:bin.key,...(series.splitBy?{[series.splitBy]:bin.group??''}:{})},value:bin.count})),
    rowCount:series.bins.length,missingValueCount:0,...(series.unit?{unit:series.unit}:{}),series};
}

/** The chart a Chart output renders: ordered period bins, which is what an epidemic curve is. */
export function seriesChart(series:CaseSeries):ChartSummary{
  const kinds:Record<DateKind,string>={onset:'date of onset',report:'date of report',death:'date of death',
    'specimen-collection':'date of specimen collection',other:'a date of unstated kind'};
  const records=series.datedRecords+series.undatedRecords;
  return {field:'period',total:series.total,
    // A SPLIT SERIES IS PANELS OF ONE CHART, one per value, which Chart draws as panels or, asked, stacked.
    bins:series.splitBy?series.bins.map(({group,...bin})=>({...bin,panel:group??''})):series.bins,
    ...(series.splitBy?{panels:series.groups??[],temporal:series.period==='day',groupedBy:series.splitBy}:{}),
    ...(series.weightField?{records}:{}),
    ...(series.unit?{unit:series.unit}:{}),
    // The axis says WHICH date, not merely that there are dates. "Date of onset, by day" rather
    // than "Category", and the declared kind travels with it so a chart cannot quietly relabel
    // the series it was built from.
    categoryTitle:`${kinds[series.dateKind].replace(/^a? ?date/,'Date')}, by ${PERIOD_WORDS[series.period]}`,
    caption:`Cases by ${PERIOD_WORDS[series.period]} of ${kinds[series.dateKind]}`+(series.weightField?`, weighted by ${series.weightField}`:'')
      +(series.undatedRecords?` · ${series.undatedRecords} record(s) without a usable date are excluded and listed`:'')};
}

export function seriesReceipt(node:{id:string},series:CaseSeries,runId:string,source:string):Receipt{
  const base=`urn:fieldwork:run:${runId}:`,entity=`<${base}output:${node.id}>`,activity=`<${base}output:${node.id}:activity>`;
  const quote=(value:string)=>JSON.stringify(value);
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n'
    +`${activity} a fw:CaseSeriesComputation, prov:Activity; prov:used <${base}output:${source}>; `
    +`fw:eventDateField ${quote(series.dateField)}; fw:eventDateKind ${quote(series.dateKind)}; fw:seriesPeriod ${quote(series.period)}`
    +(series.weightField?`; fw:caseWeightField ${quote(series.weightField)}`:'')
    +(series.splitBy?`; fw:seriesSplitBy ${quote(series.splitBy)}`:'')+'.\n'
    +`${entity} a fw:CaseSeries, prov:Entity; prov:wasGeneratedBy ${activity}; fw:eventDateKind ${quote(series.dateKind)}; `
    +`fw:seriesPeriod ${quote(series.period)}; fw:seriesTotal "${series.total}"^^xsd:decimal; `
    +`fw:datedRecordCount "${series.datedRecords}"^^xsd:integer; fw:undatedRecordCount "${series.undatedRecords}"^^xsd:integer.\n`;
  for(const [index,bin] of series.bins.entries())
    facts+=`${entity} fw:seriesBin <${base}output:${node.id}:period:${index}>.\n<${base}output:${node.id}:period:${index}> a fw:SeriesBin; fw:periodKey ${quote(bin.key)}; fw:caseCount "${bin.count}"^^xsd:decimal`
      +(bin.group!==undefined?`; fw:seriesGroup ${quote(bin.group)}`:'')+'.\n';
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`Cases per ${PERIOD_WORDS[series.period]} by ${series.dateKind} date${series.weightField?`, weighted by ${series.weightField}`:', one case per record'}${series.splitBy?`, for each value of ${series.splitBy} (${(series.groups??[]).map(g=>g||'blank').join(', ')})`:''}. Zero-count periods are retained; records without an ISO 8601 date are excluded and counted, never redistributed.`};
}

export function validateCaseSeriesNode(node:WorkflowNode):void{
  if(node.type!=='case_series')return;
  const p=node.params;
  // An empty date field is not refused on save: a node added from the library starts empty, and refusing it meant
  // Cases by period could not be added (2026-11-06). The run refuses it.
  if(!DATE_KINDS.includes(p.dateKind))throw new Error('State which kind of date Cases by period uses.');
  if(!PERIODS.includes(p.period))throw new Error('Choose day, week, week starting Sunday, month, day of the week or month of the year for Cases by period.');
}
