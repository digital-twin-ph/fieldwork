// WHAT A BOUNDARY LEVEL HOLDS, said beside the census's own levels (2026-11-20). geoBoundaries numbers its levels ADM1,
// ADM2..., and a number says nothing of the units: for some countries ADM2 holds what the census counts as counties and
// ADM3 its districts. The level's own name is given where geoBoundaries states one, and its unit count is set beside each
// level of the country's census in Census tables, as printed.
import censusCatalogue from '../examples/census-tables/catalogue.json';
import {levelName} from './figure-words.js';

interface CensusEntry{iso3:string;country:string;census:string;rows:number;levels?:{level:string;units:number}[];derived?:{label:string};
  more?:{rows:number;derived?:{label:string}}[]}
const catalogue=censusCatalogue as {countries:CensusEntry[]};
const n=(x:number)=>x.toLocaleString('en-US');

/** One or two sentences on a level about to be read: its name, and its units against the census's levels. */
export function levelCheck(iso:string,level:{level:string;units:number;canonical?:string}):string{
  const named=levelName(level.canonical);
  const said=[named?`geoBoundaries calls ${level.level}'s units “${named}”.`:`geoBoundaries does not name what ${level.level}'s units are.`];
  const census=catalogue.countries.find(c=>c.iso3===iso);
  const levels=(census?.levels??[]).filter(l=>l.units>1);
  if(!census||!levels.length)return said.join(' ');
  const counted=levels.map(l=>`${n(l.units)} ${l.level}`);
  // Two levels together count too, where a boundary level draws two census levels as units of their own. (Malawi's gbOpen
  // ADM2, 9469f09, is not one: its 28 units are the census's 28 districts, each drawn with the city inside it, if any.)
  const pairs=levels.flatMap((a,i)=>levels.slice(i+1).map(b=>({what:`its ${a.level} and ${b.level} together`,units:a.units+b.units})));
  const offered=[census,...(census.more??[])].flatMap(t=>t.derived?[{what:`the rows of “${t.derived.label}”`,units:t.rows}]:[]);
  const candidates=[...levels.map(l=>({what:`its ${l.level}`,units:l.units})),...offered];
  const single=candidates.filter(l=>l.units===level.units);
  const same=single.length?single:pairs.filter(l=>l.units===level.units);
  said.push(`Census tables, ${census.census}, counts ${counted.length<3?counted.join(' and '):`${counted.slice(0,-1).join(', ')} and ${counted.at(-1)}`}`
    +'.');
  said.push(same.length
    ?`This level's ${n(level.units)} units are as many as ${same.map(s=>s.what).join(' and ')}.`
    :`No level of the census has this level's ${n(level.units)} units: check what it holds before relating the census to it.`);
  return said.join(' ');
}

interface CensusTable{rows:number;counts:{path:string};derived?:{label:string;level?:string}}
interface CensusCountry extends CensusTable{iso3:string;country:string;more?:CensusTable[]}
const tablesOf=(c:CensusCountry):CensusTable[]=>[c,...(c.more??[])];
const CENSUS_FILE=/digital-twin-ph\/census-tables\/[0-9a-f]+\/([A-Z]{3}\/[^/?#]+\.csv)$/;

/** THE LEVEL A CENSUS TABLE WAS MATCHED ON, read from the address its step keeps: Nigeria's lgas.csv is geoBoundaries'
 *  ADM2. Undefined for a table from a file or any other address, which states no level. */
export function censusTableLevel(url:string|undefined):{iso3:string;country:string;level:string;rows:number}|undefined{
  const path=url?.match(CENSUS_FILE)?.[1];
  if(!path)return undefined;
  for(const c of (censusCatalogue as {countries:CensusCountry[]}).countries)
    for(const t of tablesOf(c))if(t.counts.path===path&&t.derived?.level)return {iso3:c.iso3,country:c.country,level:t.derived.level,rows:t.rows};
  return undefined;
}

/** A TABLE AND A STUDY AREA AT DIFFERENT LEVELS, said before anything runs (the practitioner, 2026-11-21: Nigeria's 774
 *  LGAs joined to its 37 states, *"How can we alert the user that the admin levels are different?"*). The table's level
 *  is the one Census tables matched it on; the area's is in its boundary's ID (NGA-ADM1-…). Where the census offers a
 *  table at the area's level, it is named. Undefined where either level is not stated, or they agree. */
export function levelMismatch(tableUrl:string|undefined,boundaryID:string|undefined):string|undefined{
  const table=censusTableLevel(tableUrl);
  const area=boundaryID?.match(/^([A-Z]{3})-(ADM\d)\b/);
  if(!table||!area)return undefined;
  const [,iso,level]=area;
  if(iso===table.iso3&&level===table.level)return undefined;
  if(iso!==table.iso3)return `The table is ${table.country}'s census and the study area is in ${iso}: no part will be named.`;
  const country=(censusCatalogue as {countries:CensusCountry[]}).countries.find(c=>c.iso3===iso);
  const there=country&&tablesOf(country).find(t=>t.derived?.level===level);
  const finer=Number(table.level.slice(3))>Number(level!.slice(3));
  return `The table is ${table.country}'s census at ${table.level}, ${n(table.rows)} rows; the study area is at ${level}. `
    +`The table is ${finer?'finer':'coarser'} than the study area, and a part takes one row's value. `
    +(there?`Choose “${there.derived!.label}” in Census tables, or the study area at ${table.level}.`
      :`Choose the study area at ${table.level}.`);
}
