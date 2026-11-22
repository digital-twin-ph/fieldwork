/** COLUMNS WHOSE VALUES MATCH, ACROSS TWO TABLES (the practitioner, 2026-11-22: "Can FW detect compatible keys between
 *  tables?", then "let's find a way to show the user on the UI which columns from different tables have potential
 *  matches", and of Append rows, "Is it the same with append tables?").
 *
 *  Every pair of key columns, one from each table, that share values once both are folded as Relate folds a key
 *  (`normaliseName`: exact ignores case; fuzzy also punctuation and spacing), with how many values they share and how
 *  many each holds. Shown, never applied: which columns name the same things is the person's to say. */
import {normaliseName} from './deduplicate-points.js';
import type {DataTable} from './data-table.js';

export interface ColumnMatch {first:string; second:string; shared:number; firstDistinct:number; secondDistinct:number}

const distinct=(t:DataTable,c:string)=>[...new Set(t.rows.map(r=>(r.key[c]??'').trim()).filter(Boolean))];

/** Every pair sharing a value, most shared first; on a tie, a pair with one name before two, then the smaller columns. */
export function columnMatches(first:DataTable,second:DataTable,normalisation:'exact'|'fuzzy'='fuzzy'):ColumnMatch[]{
  const fold=(value:string)=>normaliseName(value,normalisation);
  const folded=(t:DataTable)=>new Map(t.keys.map(k=>[k,new Set(distinct(t,k).map(fold).filter(Boolean))]));
  const a=folded(first),b=folded(second),out:ColumnMatch[]=[];
  for(const [fc,fv] of a)for(const [sc,sv] of b){
    let shared=0;for(const v of fv)if(sv.has(v))shared++;
    if(shared)out.push({first:fc,second:sc,shared,firstDistinct:fv.size,secondDistinct:sv.size});
  }
  return out.sort((x,y)=>y.shared-x.shared||Number(y.first===y.second)-Number(x.first===x.second)
    ||(x.firstDistinct+x.secondDistinct)-(y.firstDistinct+y.secondDistinct));
}

const looksLikeCodes=(values:readonly string[])=>values.length>0
  &&values.filter(v=>/^[A-Za-z]{0,4}[-_]?\d+[A-Za-z0-9_-]*$/.test(v.trim())).length>=0.8*values.length;
const looksLikeNames=(values:readonly string[])=>values.length>0
  &&values.filter(v=>/[A-Za-zÀ-ɏ]{3,}/.test(v)&&!/\d{3,}/.test(v)).length>=0.8*values.length;

/** WHERE NOTHING MATCHES, codes facing names is said: folding cannot make "NG020001" "Aba North". */
export function codesFacingNames(first:DataTable,second:DataTable):{codes:string;names:string}|undefined{
  for(const a of first.keys)for(const b of second.keys){
    const av=distinct(first,a),bv=distinct(second,b);
    if(looksLikeCodes(av)&&looksLikeNames(bv))return {codes:`the first table's "${a}"`,names:`the second table's "${b}"`};
    if(looksLikeNames(av)&&looksLikeCodes(bv))return {codes:`the second table's "${b}"`,names:`the first table's "${a}"`};
  }
  return undefined;
}

type Escape=(value:unknown)=>string;
/** THE PANEL, as Relate and Append show it: a row per pair, with a button that chooses it. `pick` names what the button
 *  does; `data-column-match` carries the pair, and `data-match-table` which table it is for, where there are several. */
export function columnMatchesMarkup(matches:readonly ColumnMatch[],o:{firstLabel:string;secondLabel:string;pick:string;table?:number;limit?:number},esc:Escape):string{
  if(!matches.length)return '';
  const shown=matches.slice(0,o.limit??8);
  return `<div class="column-matches" data-column-matches${o.table!==undefined?` data-match-for="${o.table}"`:''}>`
    +`<p class="field-label">Columns whose values match: ${esc(o.firstLabel)} and ${esc(o.secondLabel)}</p>`
    +'<div class="table-scroll"><table><thead><tr>'
    +`<th scope="col">${esc(o.firstLabel)}</th><th scope="col">${esc(o.secondLabel)}</th><th scope="col">Values in both</th><th scope="col"><span class="visually-hidden">Choose</span></th>`
    +'</tr></thead><tbody>'
    +shown.map(m=>`<tr><td>${esc(m.first)}</td><td>${esc(m.second)}</td>`
      +`<td>${m.shared.toLocaleString('en')} · of ${m.firstDistinct.toLocaleString('en')} and ${m.secondDistinct.toLocaleString('en')}</td>`
      +`<td><button type="button" class="button small" data-column-match="${esc(m.first)}\u001f${esc(m.second)}"${o.table!==undefined?` data-match-table="${o.table}"`:''}`
      +` aria-label="${esc(o.pick)}: ${esc(m.first)} and ${esc(m.second)}">${esc(o.pick)}</button></td></tr>`).join('')
    +'</tbody></table></div>'
    +(matches.length>shown.length?`<p class="muted">${matches.length-shown.length} more pairs share fewer values.</p>`:'')+'</div>';
}
