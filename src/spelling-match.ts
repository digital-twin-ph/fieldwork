/** RELATE ALLOWING FOR SPELLING (experiment 193). Each distinct name of the first table's key column is matched once
 *  to the second table's, after folding case and punctuation and dropping the words named, as whole words: "Bo
 *  District" meets "Bo". A name equal after folding is exact; one within the spelling threshold, with no other close,
 *  is a spelling; two or more close are ambiguous and wait for a person; none is none. Relate then matches the row on
 *  the second table's own spelling, and a name with no match is one of Relate's unmatched rows, decided as those are.
 *  The pandas shape: a key derived on each side, an exact merge, the leftovers decided by a person. */
import type {DataTable} from './data-table.js';
import {normaliseName,jaroWinkler} from './deduplicate-points.js';

export type LinkOutcome='exact'|'spelling'|'ambiguous'|'none';
export const LINK_OUTCOMES:LinkOutcome[]=['exact','spelling','ambiguous','none'];
export const LINK_WORDS:Record<LinkOutcome,string>={exact:'matched exactly',spelling:'matched allowing for spelling',
  ambiguous:'ambiguous, awaiting a decision',none:'not found'};

export interface SpellingSettings {
  /** Words removed from both sides before comparing, as whole words, case aside: "District". */
  dropWords:string[];
  /** Jaro-Winkler similarity a folded name must reach to be a spelling. */
  threshold:number;
  /** What a person chose for a name of the first table: a value of the second, or "none". By the first table's name. */
  decisions:Record<string,string>;
}
/** 0.88 to start, as Deduplicate records' names; the practitioner adjusts it in Relate's dialog. */
export const DEFAULT_SPELLING_THRESHOLD=0.88;
export const DEFAULT_SPELLING_SETTINGS=():SpellingSettings=>({dropWords:[],threshold:DEFAULT_SPELLING_THRESHOLD,decisions:{}});

/** The name as compared: folded, and the dropped words taken out as whole words. */
export function linkKey(value:unknown,dropWords:readonly string[]):string{
  const folded=normaliseName(value,'fuzzy');
  const drop=new Set(dropWords.map(w=>normaliseName(w,'fuzzy')).filter(Boolean));
  return folded.split(' ').filter(w=>w&&!drop.has(w)).join(' ');
}

export interface LinkMatch {
  outcome:LinkOutcome; value?:string; score?:number;
  /** The second table's names weighed, best first, for a decision. */
  candidates:{value:string; score:number}[];
  /** Chosen by a person: the value, or none. */
  decided?:boolean;
}

/** The values a column of a table holds, as text: a key column's, or the value column's. */
export function columnValues(table:DataTable,column:string):string[]{
  if(table.keys.includes(column))return table.rows.map(r=>String(r.key[column]??''));
  if(column===table.valueField)return table.rows.map(r=>r.value===null?'':String(r.value));
  throw new Error(`This table has no "${column}" column. Its columns are ${[...table.keys,table.valueField].join(', ')}.`);
}

/** Every distinct name of the first column, matched once. */
export function linkNames(left:readonly string[],right:readonly string[],settings:SpellingSettings,margin=0.02):Map<string,LinkMatch>{
  const targets=new Map<string,string[]>();
  for(const value of new Set(right.filter(v=>v.trim()))){const k=linkKey(value,settings.dropWords);if(k)targets.set(k,[...(targets.get(k)??[]),value]);}
  const out=new Map<string,LinkMatch>();
  for(const name of new Set(left.filter(v=>v.trim()))){
    const k=linkKey(name,settings.dropWords);
    let found:LinkMatch;
    const same=targets.get(k);
    if(k&&same?.length===1)found={outcome:'exact',value:same[0]!,score:1,candidates:[{value:same[0]!,score:1}]};
    else if(k&&same&&same.length>1)found={outcome:'ambiguous',candidates:same.map(value=>({value,score:1}))};
    else{
      const scored=[...targets].flatMap(([key,values])=>values.map(value=>({value,score:jaroWinkler(k,key)})))
        .filter(c=>c.score>=settings.threshold).sort((a,b)=>b.score-a.score);
      const close=scored.filter(c=>c.score>=(scored[0]?.score??1)-margin);
      found=!scored.length?{outcome:'none',candidates:[]}
        :close.length>1?{outcome:'ambiguous',candidates:close}
        :{outcome:'spelling',value:scored[0]!.value,score:scored[0]!.score,candidates:scored.slice(0,3)};
    }
    // A PERSON'S CHOICE, where there was one to make, or to undo: "none" leaves the name without a match, said.
    const chosen=settings.decisions[name];
    if(chosen==='none')found={...found,value:undefined,score:undefined,decided:true};
    else if(chosen&&right.includes(chosen))found={...found,value:chosen,score:found.candidates.find(c=>c.value===chosen)?.score,decided:true};
    out.set(name,found);
  }
  return out;
}
