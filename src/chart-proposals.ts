/** WHICH FORMS SUIT WHAT ARRIVED, question first (experiment 210, the proposer). The practitioner, 2026-11-13: *"It would
 *  also be useful to have potential chart type candidates appear on the dropdown, as we discussed in experiment 210."*
 *
 *  Rules over the shape of what arrived, each with the question it answers and its reason. No model: the rule and its
 *  sentence are the teaching. Only the forms Chart draws today are offered; a proposal is not a choice, so nothing is
 *  drawn until the practitioner picks one. The kinds are read from the values, because columns do not yet declare
 *  whether they hold a category or a number. */
import type {DataTable} from './data-table.js';

export type ChartForm='bars'|'pyramid'|'tree'|'curve'|'stacked';
export interface ChartProposal {form:ChartForm; question:string; name:string; because:string; fits:boolean}
export type ChartArrival=
  |{kind:'series'; splitBy?:string}
  |{kind:'polygons'}
  |{kind:'table'; table:Pick<DataTable,'keys'|'rows'>};

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const BAND=/^(\d+(\.\d+)?|\d+\s*[-–]\s*\d+|\d+\s*\+|<\s*\d+)$/;

/** The non-empty values of one column, as written. */
const valuesOf=(table:Pick<DataTable,'rows'>,column:string)=>
  table.rows.map(r=>(r.key[column]??'').trim()).filter(v=>v!=='');

/** A column dating each row: every value it holds is a day. */
function dateColumn(table:Pick<DataTable,'keys'|'rows'>):string|undefined{
  return table.keys.find(c=>{const v=valuesOf(table,c);return v.length>0&&v.every(x=>DATE.test(x));});
}

/** A case and its source: one column names rows (its values mostly distinct), another names values of the first, apart
 *  from at most one word written where none is recorded. */
function caseAndSource(table:Pick<DataTable,'keys'|'rows'>):{id:string;parent:string}|undefined{
  for(const id of table.keys){
    const ids=valuesOf(table,id);if(ids.length<2)continue;
    const named=new Set(ids);if(named.size<ids.length*0.5)continue;
    for(const parent of table.keys){
      if(parent===id)continue;
      const sources=valuesOf(table,parent);if(!sources.length)continue;
      const found=sources.filter(s=>named.has(s)).length;
      const other=new Set(sources.filter(s=>!named.has(s)));
      if(found>=sources.length*0.5&&other.size<=1)return {id,parent};
    }
  }
  return undefined;
}

/** Two groups across bands: a column of ages or bands, and one with two values. */
function bandsByTwo(table:Pick<DataTable,'keys'|'rows'>):{bands:string;two:string}|undefined{
  const bands=table.keys.find(c=>{const v=valuesOf(table,c);return new Set(v).size>=3&&v.every(x=>BAND.test(x));});
  if(!bands)return undefined;
  const two=table.keys.find(c=>c!==bands&&new Set(valuesOf(table,c)).size===2);
  return two?{bands,two}:undefined;
}

export function proposeChartForms(arrived:ChartArrival):ChartProposal[]{
  if(arrived.kind==='series')return [
    {form:'curve',question:'How did it unfold over time?',name:'Epidemic curve',because:'a count for each period',fits:true},
    {form:'stacked',question:'When, and of which kind?',name:'Stacked epidemic curve',
      because:arrived.splitBy?`the series is split by ${arrived.splitBy}`:'needs a series split by a column, in Cases by period',
      fits:!!arrived.splitBy}];
  if(arrived.kind==='polygons')return [
    {form:'bars',question:'How do the areas differ?',name:'Bars',because:'one bar for each area, as tall as its count or total',fits:true}];
  const {table}=arrived;
  const tree=caseAndSource(table),date=dateColumn(table),pyramid=bandsByTwo(table);
  return [
    {form:'tree',question:'Who infected whom?',name:'Transmission tree',
      because:tree&&date?`${tree.parent} holds values of ${tree.id}, in the same table, and ${date} dates each row`
        :'needs a column naming each case, one naming its source, and a date',fits:!!(tree&&date)},
    {form:'pyramid',question:'How are two groups spread across ages?',name:'Population pyramid',
      because:pyramid?`${pyramid.bands} in bands, the two values of ${pyramid.two} back to back`
        :'needs a column of ages or bands, and one with two values',fits:!!pyramid},
    {form:'bars',question:'How do groups differ?',name:'Bars',because:'one bar for each category, as tall as its number',fits:true}];
}

/** Those that fit, first, keeping each group's own order. */
export const proposalOrder=(proposals:readonly ChartProposal[])=>[...proposals.filter(p=>p.fits),...proposals.filter(p=>!p.fits)];
