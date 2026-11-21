// WHAT A BOUNDARY LEVEL HOLDS, said beside the census's own levels (2026-11-20). geoBoundaries numbers its levels ADM1,
// ADM2..., and a number says nothing of the units: for some countries ADM2 holds what the census counts as counties and
// ADM3 its districts. The level's own name is given where geoBoundaries states one, and its unit count is set beside each
// level of the country's census in Census tables, as printed.
import censusCatalogue from '../examples/census-tables/catalogue.json';
import {levelName} from './figure-words.js';

interface CensusEntry{iso3:string;country:string;census:string;rows:number;levels?:{level:string;units:number}[];derived?:{label:string}}
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
  // Two levels together count too: Malawi's 32 ADM2 units are its census's 28 districts and 4 cities.
  const pairs=levels.flatMap((a,i)=>levels.slice(i+1).map(b=>({what:`its ${a.level} and ${b.level} together`,units:a.units+b.units})));
  const offered=census.derived?[{what:`the rows of “${census.derived.label}”`,units:census.rows}]:[];
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
