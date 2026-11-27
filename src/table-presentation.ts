/** A TABLE PRESENTED TO A STANDARD (Table 0.15.0, 2026-11-27). The practitioner: *"Since table outputs are render facing,
 *  we should be able to style them according to established table presentation standards"*, and *"We want tables to
 *  really look pretty but also vision impaired friendly."* The rules the standards agree on are applied by every Table
 *  (docs/research/table-presentation-standards-2026-11-27.md): a caption above, header cells, numbers right-aligned in
 *  equal-width digits with one precision a column and thousands separators, few rules and none vertical, notes and
 *  the source below. What the standards leave to the author is set here, in Configure…'s Presentation section. */
import type {Escape} from './types.js';

export interface TablePresentation {
  /** The table's title: what, where and when. The Table's name when unset. */
  caption?:string;
  /** Definitions, exclusions and anything a reader needs, below the table. */
  notes?:string;
  /** Where the numbers come from, below the notes. */
  source?:string;
  /** Decimal places for the values, the same in every row; as recorded when unset. */
  decimals?:number;
  /** Thousands separators from four digits (1,234). On unless turned off; never on a year. */
  separators?:boolean;
  /** How an absent value is written. */
  absent?:'unknown'|'dash'|'blank';
  /** A light shade on every other row, to follow a row across a wide table. */
  shade?:boolean;
}

/** A DASH UNLESS TOLD OTHERWISE: an absent value is not written as words a reader could take for data (the practitioner,
 *  2026-10-21, on "Not supplied": *"was the data missing or field empty value and we supplied that value as a
 *  replacement?"*). The dash is read aloud as "no value" and drawn apart from the data. */
export const ABSENT_CHOICES:Record<NonNullable<TablePresentation['absent']>,string>={
  dash:'A dash (—), read aloud as "no value"',unknown:'The word "unknown"',blank:'Left blank'};

/** A saved presentation, checked as it opens: an unknown setting refuses the workflow rather than vanishing from it. */
export function validatePresentation(value:unknown):asserts value is TablePresentation{
  if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('A table\'s presentation is a set of named settings.');
  const p=value as Record<string,unknown>;
  for(const key of Object.keys(p))
    if(!['caption','notes','source','decimals','separators','absent','shade'].includes(key))throw new Error(`A table's presentation has no setting "${key}".`);
  for(const [key,max] of [['caption',200],['notes',2000],['source',500]] as const)
    if(p[key]!==undefined&&(typeof p[key]!=='string'||(p[key] as string).length>max))throw new Error(`A table's ${key} is text of at most ${max} characters.`);
  if(p.decimals!==undefined&&(!Number.isInteger(p.decimals)||(p.decimals as number)<0||(p.decimals as number)>6))
    throw new Error('Decimal places run from 0 to 6.');
  for(const key of ['separators','shade'] as const)if(p[key]!==undefined&&typeof p[key]!=='boolean')throw new Error(`A table's ${key} setting is on or off.`);
  if(p.absent!==undefined&&!Object.keys(ABSENT_CHOICES).includes(p.absent as string))throw new Error('Choose how an absent value is written: unknown, a dash, or blank.');
}

/** A column read as years is never given a separator: 2,026 is not a year. */
const YEARS=/(^|[^a-z])(year|yr|yyyy)([^a-z]|$)/i;
const NUMBER=/^-?(\d+\.?\d*|\.\d+)$/;

/** One value, written to the table's presentation: its text, and whether it is a number (right-aligned) or absent.
 *  `measure` is false for identifiers and coordinates, which keep their own digits but still align as numbers. */
export function presentValue(value:unknown,column:string,p:TablePresentation|undefined,esc:Escape,{measure=true}={}):{html:string;number:boolean;absent:boolean}{
  if(value===null||value===undefined||value==='')
    return {absent:true,number:false,html:(p?.absent??'dash')==='blank'?'':(p?.absent??'dash')==='dash'?'<span aria-label="no value">—</span>':'unknown'};
  // TEXT IS SHOWN AS WRITTEN (PR 10's review): "00123" is an identifier, not 123, and a long code loses digits through
  // Number. A text that reads as a number is only aligned as one.
  if(typeof value!=='number'){const text=String(value);return {html:esc(text),number:NUMBER.test(text.trim()),absent:false};}
  if(!Number.isFinite(value))return {html:esc(String(value)),number:false,absent:false};
  if(!measure)return {html:esc(String(value)),number:true,absent:false};
  // A NUMBER KEEPS ITS PRECISION unless decimal places are chosen: 7e-8 is not 0. Separators go into the whole part only.
  if(p?.decimals===undefined){
    const said=String(value);
    if(/e/i.test(said)||p?.separators===false||YEARS.test(column)||Math.abs(value)<1000)return {html:esc(said),number:true,absent:false};
    const [whole,fraction]=said.split('.');
    return {html:esc(whole!.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction!==undefined?`.${fraction}`:'')),number:true,absent:false};
  }
  const grouped=p.separators!==false&&!YEARS.test(column)&&Math.abs(value)>=1000;
  return {html:esc(value.toLocaleString('en',{minimumFractionDigits:p.decimals,maximumFractionDigits:p.decimals,useGrouping:grouped})),number:true,absent:false};
}
/** One cell, as a <td>. */
export function presentCell(value:unknown,column:string,p:TablePresentation|undefined,esc:Escape,options:{measure?:boolean}={}):string{
  const v=presentValue(value,column,p,esc,options);
  return `<td${v.absent?' class="absent-cell"':v.number?' class="number"':''}${v.absent&&!v.html?' aria-label="no value"':''}>${v.html}</td>`;
}

/** The caption above and the notes and source below, around a table's markup. */
export function presentedTable(p:TablePresentation|undefined,fallbackCaption:string,table:string,esc:Escape):string{
  const caption=(p?.caption||fallbackCaption).trim();
  return `<div class="table-presented${p?.shade?' table-shaded':''}">`
    +(caption?`<p class="table-caption">${esc(caption)}</p>`:'')
    +table
    +(p?.notes?`<p class="table-notes">${esc(p.notes)}</p>`:'')
    +(p?.source?`<p class="table-notes">Source: ${esc(p.source)}</p>`:'')
    +'</div>';
}

/** The Presentation section of Configure…, on a draft. */
export function presentationFields(p:TablePresentation,fallbackCaption:string,esc:Escape):string{
  return `<div class="field"><label class="field-label" for="present-caption">Title: what, where and when</label>`
    +`<input id="present-caption" maxlength="200" placeholder="${esc(fallbackCaption)}" value="${esc(p.caption??'')}"></div>`
    +`<div class="field"><label class="field-label" for="present-decimals">Decimal places for the values</label>`
    +`<select id="present-decimals"><option value=""${p.decimals===undefined?' selected':''}>As recorded</option>`
    +[0,1,2,3].map(n=>`<option value="${n}"${p.decimals===n?' selected':''}>${n}</option>`).join('')+`</select></div>`
    +`<label class="check"><input type="checkbox" id="present-separators"${p.separators!==false?' checked':''}> Thousands separators (1,234), never on a year</label>`
    +`<div class="field"><label class="field-label" for="present-absent">An absent value is written</label>`
    +`<select id="present-absent">${Object.entries(ABSENT_CHOICES).map(([k,said])=>`<option value="${k}"${(p.absent??'dash')===k?' selected':''}>${esc(said)}</option>`).join('')}</select></div>`
    +`<label class="check"><input type="checkbox" id="present-shade"${p.shade?' checked':''}> Shade every other row</label>`
    +`<div class="field"><label class="field-label" for="present-notes">Notes below the table</label>`
    +`<textarea id="present-notes" rows="3" maxlength="2000">${esc(p.notes??'')}</textarea></div>`
    +`<div class="field"><label class="field-label" for="present-source">Source</label>`
    +`<input id="present-source" maxlength="500" value="${esc(p.source??'')}"></div>`;
}

