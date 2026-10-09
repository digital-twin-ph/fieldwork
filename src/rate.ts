import type {PointCollection,Scalar,WorkflowNode} from './types.js';
import type {DataTable} from './data-table.js';
import type {ChartSummary,Receipt} from './results.js';

/** Rates with a declared denominator: the person axis.
 *
 *  The knowledge is in the declarations. A rate is uninterpretable unless you know what its
 *  denominator counts — people, houses, households, person-time — and a proportion is a different
 *  quantity from a ratio: the share of houses with a death cannot exceed one, while deaths per house
 *  can. Both appear in John Snow's data and conflating them is easy.
 *  See docs/experiments/51-dataset-profiles.md and 62-rates-with-denominators.md. */
export const DENOMINATOR_UNITS=['people','houses','households','person-time','other'] as const;
export type DenominatorUnit=typeof DENOMINATOR_UNITS[number];
export const RATE_KINDS=['proportion','ratio'] as const;
export type RateKind=typeof RATE_KINDS[number];

export interface RateOptions {
  numeratorField:string; denominatorField:string; groupBy?:string; bandWidth?:number;
  denominatorUnit:DenominatorUnit; rateKind:RateKind; multiplier:number;
  minimumDenominator:number; numeratorPeriod:string; denominatorVintage:string;
}
export interface RateRow {
  group:string; label:string; numerator:number; denominator:number;
  rate:number|null; reason?:string;
}
export interface RateResult {
  kind:'rate'; rows:RateRow[]; options:RateOptions; totalNumerator:number; totalDenominator:number;
  overall:number|null; suppressed:number; vintagesAgree:boolean;
}

const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const number=(value:unknown):number|null=>{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  const parsed=Number(String(value??'').trim());
  return String(value??'').trim()===''||!Number.isFinite(parsed)?null:parsed;
};

export function validateRateOptions(options:RateOptions):void{
  if(!text(options.numeratorField))throw new Error('Name the attribute holding the numerator: what is being counted.');
  if(!text(options.denominatorField))throw new Error('Name the attribute holding the denominator: the population at risk.');
  if(!DENOMINATOR_UNITS.includes(options.denominatorUnit))
    throw new Error(`State what the denominator counts: ${DENOMINATOR_UNITS.join(', ')}. A rate whose denominator is unstated is not interpretable, and deaths per house is not a mortality rate.`);
  if(!RATE_KINDS.includes(options.rateKind))
    throw new Error('State whether this is a proportion, where the numerator is part of the denominator, or a ratio of events per unit.');
  if(!(options.multiplier>0))throw new Error('Choose a multiplier, such as per 100 or per 1,000.');
  if(!(options.minimumDenominator>=0))throw new Error('Set the smallest denominator for which a rate will be reported.');
  if(!text(options.numeratorPeriod))throw new Error('State the period the numerator covers; a rate joins two things measured at different times unless you say what they are.');
  if(!text(options.denominatorVintage))throw new Error('State the vintage of the denominator.');
}

const bandLabel=(lower:number,width:number)=>`${lower}–${lower+width}`;

export function computeRate(records:{id:string;properties:Record<string,Scalar>}[],options:RateOptions):RateResult{
  validateRateOptions(options);
  const {numeratorField,denominatorField,groupBy,bandWidth,minimumDenominator,multiplier,rateKind}=options;
  const groups=new Map<string,{label:string;numerator:number;denominator:number;sort:number}>();
  for(const record of records){
    const numerator=number(record.properties[numeratorField]);
    const denominator=number(record.properties[denominatorField]);
    if(numerator===null||denominator===null)
      throw new Error(`Record ${record.id} has no numeric "${numerator===null?numeratorField:denominatorField}". A rate is not computed from a value that was guessed.`);
    if(numerator<0||denominator<0)throw new Error(`Record ${record.id} has a negative count, which is not a number of events or of units at risk.`);
    let key='all',labelText='All records',sort=0;
    if(groupBy){
      const raw=record.properties[groupBy];
      if(bandWidth){
        const value=number(raw);
        if(value===null)throw new Error(`Record ${record.id} has no numeric "${groupBy}" to band.`);
        const lower=Math.floor(value/bandWidth)*bandWidth;
        key=String(lower);labelText=bandLabel(lower,bandWidth);sort=lower;
      }else{
        key=String(raw??'');labelText=key||'(blank)';sort=0;
      }
    }
    const bucket=groups.get(key)??{label:labelText,numerator:0,denominator:0,sort};
    bucket.numerator+=numerator;bucket.denominator+=denominator;
    groups.set(key,bucket);
  }
  const rows:RateRow[]=[...groups.entries()]
    .sort((a,b)=>bandWidth?a[1].sort-b[1].sort:a[0].localeCompare(b[0]))
    .map(([group,bucket])=>{
      const {numerator,denominator}=bucket;
      if(rateKind==='proportion'&&numerator>denominator)
        throw new Error(`Group ${bucket.label} has ${numerator} in the numerator and ${denominator} in the denominator. A proportion cannot exceed one: either this is a ratio of events per unit, or the two columns do not describe the same thing.`);
      if(denominator===0)return {group,label:bucket.label,numerator,denominator,rate:null,
        reason:'No denominator, so no rate. A count without a population at risk is not a rate.'};
      if(denominator<minimumDenominator)return {group,label:bucket.label,numerator,denominator,rate:null,
        reason:`Denominator ${denominator} is below the stated minimum of ${minimumDenominator}; a rate from so few units would be unstable, so none is reported.`};
      return {group,label:bucket.label,numerator,denominator,rate:numerator/denominator*multiplier};
    });
  const totalNumerator=rows.reduce((sum,row)=>sum+row.numerator,0);
  const totalDenominator=rows.reduce((sum,row)=>sum+row.denominator,0);
  return {kind:'rate',rows,options,totalNumerator,totalDenominator,
    overall:totalDenominator?totalNumerator/totalDenominator*multiplier:null,
    suppressed:rows.filter(row=>row.rate===null).length,
    vintagesAgree:text(options.numeratorPeriod)===text(options.denominatorVintage)};
}

export const fromPoints=(points:PointCollection)=>points.features.map(feature=>
  ({id:String(feature.id),properties:feature.properties as Record<string,Scalar>}));

export function rateTable(result:RateResult):DataTable&{rate:RateResult}{
  const {multiplier,denominatorUnit}=result.options;
  return {kind:'data-table',keys:['group'],valueField:`per ${multiplier.toLocaleString()} ${denominatorUnit}`,
    rows:result.rows.map(row=>({key:{group:row.label},value:row.rate})),
    rowCount:result.rows.length,missingValueCount:result.suppressed,rate:result};
}

export function rateChart(result:RateResult):ChartSummary{
  const {multiplier,denominatorUnit,rateKind,numeratorField}=result.options;
  return {field:'count',total:Math.round(result.totalNumerator),
    caption:`${numeratorField} per ${multiplier.toLocaleString()} ${denominatorUnit} (${rateKind})`
      +(result.vintagesAgree?'':' · numerator and denominator come from different vintages')
      +(result.suppressed?` · ${result.suppressed} group(s) without a reportable rate`:''),
    bins:result.rows.map(row=>({key:row.group,label:row.label,count:Math.round(row.rate??0)}))};
}

export function rateReceipt(node:{id:string},result:RateResult,runId:string,source:string):Receipt{
  const base=`urn:fieldwork:run:${runId}:`,entity=`<${base}output:${node.id}>`,activity=`<${base}output:${node.id}:activity>`;
  const quote=(value:string)=>JSON.stringify(value);
  const o=result.options;
  let facts='@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n'
    +`${activity} a fw:RateComputation, prov:Activity; prov:used <${base}output:${source}>; `
    +`fw:numeratorField ${quote(o.numeratorField)}; fw:denominatorField ${quote(o.denominatorField)}; `
    +`fw:denominatorUnit ${quote(o.denominatorUnit)}; fw:rateKind ${quote(o.rateKind)}; `
    +`fw:rateMultiplier "${o.multiplier}"^^xsd:decimal; fw:minimumDenominator "${o.minimumDenominator}"^^xsd:decimal; `
    +`fw:numeratorPeriod ${quote(o.numeratorPeriod)}; fw:denominatorVintage ${quote(o.denominatorVintage)}.\n`
    +`${entity} a fw:RateResult, prov:Entity; prov:wasGeneratedBy ${activity}; `
    +`fw:denominatorUnit ${quote(o.denominatorUnit)}; fw:rateKind ${quote(o.rateKind)}; `
    +`fw:suppressedGroupCount "${result.suppressed}"^^xsd:integer; fw:vintagesAgree ${result.vintagesAgree}.\n`;
  for(const [index,row] of result.rows.entries())
    facts+=`${entity} fw:rateGroup <${base}output:${node.id}:group:${index}>.\n<${base}output:${node.id}:group:${index}> a fw:RateGroup; `
      +`fw:groupLabel ${quote(row.label)}; fw:numeratorCount "${row.numerator}"^^xsd:decimal; `
      +`fw:denominatorCount "${row.denominator}"^^xsd:decimal`
      +(row.rate===null?'':`; fw:rateValue "${row.rate}"^^xsd:decimal`)+'.\n';
  return {nodeId:node.id,kind:'computation',facts,input:facts,rules:'',conclusions:[],
    method:`${o.rateKind==='proportion'?'Proportion':'Ratio'} of ${o.numeratorField} to ${o.denominatorField}, per ${o.multiplier.toLocaleString()} ${o.denominatorUnit}. Numerator covers ${o.numeratorPeriod}; denominator vintage ${o.denominatorVintage}. Groups with a denominator below ${o.minimumDenominator} report no rate.`};
}

export function validateRateNode(node:WorkflowNode):void{
  if(node.type!=='rate')return;
  validateRateOptions(node.params as unknown as RateOptions);
}
