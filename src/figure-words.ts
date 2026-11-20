/** WORDS A FIGURE TAKES FROM ITS WORKFLOW (2026-11-20). The practitioner, after a DR Congo workflow copied from Botswana's
 *  kept "Botswana", "by district" and "Census 2022" in every chart: *"one way to avoid those inconsistencies is to automate
 *  country names in titles"*, and *"The last few errors could have been prevented with automation instead of consistency
 *  checking and hand typing."* A title, subtitle, axis title, source note or Append rows label may hold:
 *
 *  - `{country}`: the study area's country, from the boundary it was acquired as or the countries it states;
 *  - `{units}`, `{unit}`: what its boundary level calls its units, plural and singular ("provinces", "province");
 *  - `{census}`: the census a Census tables step reads, by year ("1984 census").
 *
 *  Each is filled where the figure is drawn, so a copy of the workflow over another country reads that country. Nothing
 *  is guessed: a word the workflow does not state is written as the gap it is, "[country not stated]". */
import type {Workflow,WorkflowNode} from './types.js';
import {countryName,countryOfArea} from './boundary-source.js';
import {countriesOfArea} from './area-countries.js';
import censusCatalogue from '../examples/census-tables/catalogue.json';

export interface FigureWords {country?:string;units?:string;unit?:string;census?:string}
const PLACEHOLDER=/\{(country|units|unit|census)\}/g;
const GAP:Record<keyof FigureWords,string>={country:'[country not stated]',units:'[units not stated]',unit:'[unit not stated]',census:'[census not stated]'};

/** A boundary level's own name for its units, where it is one: geoBoundaries says "Unknown" for Rwanda's districts, and a
 *  file read from disk "as published in the file", which name nothing. */
export const levelName=(canonical:string|undefined):string|undefined=>{
  const c=canonical?.trim()??'';
  return !c||/unknown|not stated|as published|^n\/?a$/i.test(c)?undefined:c;
};
const list=(items:string[])=>items.length<3?items.join(' and '):`${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;
/** "Provinces" to "provinces" and "province"; "Territory, city" to "territories and cities" and "territory or city". */
function unitWords(canonical:string):{units:string;unit:string}|undefined{
  const parts=canonical.split(/\s*[,/;]\s*|\s+and\s+/).map(p=>p.trim().toLowerCase()).filter(Boolean);
  if(!parts.length)return undefined;
  const singular=(w:string)=>w.endsWith('ies')?w.slice(0,-3)+'y':/(ss|sh|ch|x)es$/.test(w)?w.slice(0,-2):w.endsWith('s')?w.slice(0,-1):w;
  const plural=(w:string)=>w.endsWith('s')?w:w.endsWith('y')&&!/[aeiou]y$/.test(w)?w.slice(0,-1)+'ies':/(s|sh|ch|x)$/.test(w)?w+'es':w+'s';
  return {units:list(parts.map(plural)),unit:parts.map(singular).join(' or ')};
}

/** What the workflow states: its study areas' countries and unit names, and the census its Census tables steps read. */
export function figureWordsOf(workflow:Workflow):FigureWords{
  const areas=workflow.nodes.filter((n):n is WorkflowNode<'study_area'>=>n.type==='study_area');
  const countries=new Set<string>(),unitNames=new Set<string>();
  for(const a of areas){
    const p=a.params as {boundary?:{boundaryID?:string;canonical?:string;provenance?:{boundaryID?:string}};countries?:string[];country?:string;unitName?:string};
    const acquired=countryOfArea({boundary:p.boundary});
    for(const iso of acquired?[acquired]:countriesOfArea(p))countries.add(iso);
    const named=p.unitName?.trim()||levelName(p.boundary?.canonical);
    if(named)unitNames.add(named);
  }
  const units=unitNames.size===1?unitWords([...unitNames][0]!):undefined;
  const census=new Set<string>();
  const catalogue=censusCatalogue as {raw:string;countries:{counts:{path:string};referenceDate:string}[]};
  for(const n of workflow.nodes){
    const url=n.type==='table_input'?(n as WorkflowNode<'table_input'>).params.remote?.url:undefined;
    // At any commit of census-tables: a step read at an earlier pin still names its census.
    const path=url?.match(/^https:\/\/raw\.githubusercontent\.com\/digital-twin-ph\/census-tables\/[0-9a-f]{7,40}\/(.+)$/)?.[1];
    const iso=path?.split('/')[0];
    const entry=iso?catalogue.countries.find(c=>c.counts.path.startsWith(`${iso}/`)):undefined;
    if(entry)census.add(`${entry.referenceDate.slice(0,4)} census`);
  }
  return {...(countries.size?{country:list([...countries].map(countryName))}:{}),...(units??{}),
    ...(census.size?{census:list([...census])}:{})};
}

/** The text with each placeholder filled from `words`, or written as the gap where the workflow does not state it. */
export function fillWords<T extends string|undefined>(text:T,words:FigureWords):T{
  if(!text||!text.includes('{'))return text;
  return text.replace(PLACEHOLDER,(_,key:keyof FigureWords)=>words[key]??GAP[key]) as T;
}
/** Every text field of a Chart's, Map's or Append rows' parameters, filled. Other fields are returned as they are. */
const FIELDS=['chartTitle','subtitle','xAxisTitle','yAxisTitle','sourceNote','mapTitle','mapSubtitle','mapSourceNote'] as const;
export function filledParams<P extends object>(params:P,words:FigureWords):P{
  const out={...params} as Record<string,unknown>;
  for(const key of FIELDS)if(typeof out[key]==='string')out[key]=fillWords(out[key] as string,words);
  if(Array.isArray(out.labels))out.labels=(out.labels as unknown[]).map(l=>typeof l==='string'?fillWords(l,words):l);
  for(const key of ['firstLabel','secondLabel'])if(typeof out[key]==='string')out[key]=fillWords(out[key] as string,words);
  return out as P;
}
/** The words of the workflow being drawn: set by the application before it draws, and by a run before it writes. */
let current:FigureWords={};
export const setFigureWords=(words:FigureWords)=>{current=words;};
export const figureWords=():FigureWords=>current;
/** WHAT THE PLACEHOLDERS READ HERE, under a dialog's text fields: each word as this workflow states it, or not stated. */
export function wordsHint(esc:(s:string)=>string,words:FigureWords=current):string{
  const said=(key:keyof FigureWords)=>words[key]?`<strong>${esc(words[key]!)}</strong>`:'not stated';
  return `<p class="description" data-figure-words>Write {country}, {units}, {unit} or {census} to take them from this workflow, `
    +`so a copy over another place reads its own: here {country} is ${said('country')}, {units} ${said('units')}, `
    +`{unit} ${said('unit')} and {census} ${said('census')}.</p>`;
}
