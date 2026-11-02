/** MORE THAN ONE EXPOSURE, ONE TABLE. Experiment 161, step 3.
 *
 *  The practitioner, 2026-11-02, after Oswego took 43 nodes for one question: *"I think this is a
 *  genuine problem having more than 1 exposure."* An outbreak with a menu has many, so the node
 *  takes several columns of a line list and gives one row each.
 *
 *  ROWS STAY IN THE ORDER CHOSEN, nothing is ranked and nothing is highlighted. Reading down the
 *  column and seeing which exposure stands apart is the reasoning a trainee is here to do.
 *
 *  ONE EXPOSURE CANNOT SINK THE OTHERS. A column holding neither named value is a row saying so.
 *
 *  THE NUMBER OF COMPARISONS IS STATED. Fourteen intervals are not one interval. Whether they
 *  should be adjusted is not settled here; that they were not is said on the result. */
import type {DataTable} from './data-table.js';
import {computeTwoByTwo,type TwoByTwoRequest,type TwoByTwoResult} from './two-by-two.js';

export interface ExposureRow {
  column:string;
  /** Null when this column could not be read as these two groups; `reason` then says why. */
  result:TwoByTwoResult|null;
  reason:string|null;
  /** Rows in neither group or neither column: an answer nobody recorded, or a value the mapping
   *  did not name, such as a second control group. The table cannot say which, so it says "left
   *  out" and not "not recorded". */
  leftOut:number;
}
export interface ExposureTable {table:DataTable; rows:ExposureRow[]; sentence:string}

export function computeExposures(table:DataTable,request:TwoByTwoRequest,columns:string[],
  read:(result:TwoByTwoResult)=>TwoByTwoResult):ExposureTable{
  if(!request.rowsAreSubjects)throw new Error('Several exposures are read from a line list, so tick '
    +'"Each row is one subject". A table of totals is already arranged around one exposure.');
  const rows:ExposureRow[]=columns.map(column=>{
    if(!table.keys.includes(column))return {column,result:null,leftOut:0,
      reason:`This table has no "${column}" column.`};
    try{
      const result=read(computeTwoByTwo(table,{...request,exposureColumn:column}));
      return {column,result,reason:null,leftOut:table.rows.length-result.total};
    }catch(error){return {column,result:null,leftOut:0,
      reason:error instanceof Error?error.message:String(error)};}
  });
  const out:DataTable['rows']=[];
  const put=(exposure:string,measure:string,value:number|null)=>
    out.push({key:{exposure,measure},value});
  // TO THE PRECISION A READER USES. This table is read across, and the full values stay on `rows`.
  const percent=(part:number,whole:number)=>Math.round(1000*part/whole)/10;
  const ratio=(value:number|null|undefined)=>value===null||value===undefined?null:Math.round(100*value)/100;
  for(const {column,result,leftOut} of rows){
    const main=result?.estimates[0];
    // A ROW TOTAL MEANS SOMETHING ONLY WHERE THE DESIGN FIXED ROWS. A case-control study fixed the
    // columns, so a/(a+b) is no quantity and the four cells are shown in its place.
    const rowProportion=result?.reading?.rowProportion!==null;
    put(column,'a',result?.cells.exposedCases??null);
    if(rowProportion){
      put(column,'a+b',result?.exposedTotal??null);
      put(column,'%, exposed',result?percent(result.cells.exposedCases,result.exposedTotal):null);
    }else put(column,'b',result?.cells.exposedNonCases??null);
    put(column,'c',result?.cells.unexposedCases??null);
    if(rowProportion){
      put(column,'c+d',result?.unexposedTotal??null);
      put(column,'%, unexposed',result?percent(result.cells.unexposedCases,result.unexposedTotal):null);
    }else put(column,'d',result?.cells.unexposedNonCases??null);
    const named=main?.reportedAs??main?.name??'ratio';
    put(column,named,ratio(main?.value));
    put(column,'lower',ratio(main?.lower));
    put(column,'upper',ratio(main?.upper));
    put(column,'left out',result?leftOut:null);
  }
  const unreadable=rows.filter(row=>!row.result);
  const level=request.level;
  const outcomes=rows.find(row=>row.result)?.result?.outcomesLeftOut??[];
  const sentence=`${rows.length} exposures compared on one outcome, ${rows.length} ${level}% intervals, `
    +'none adjusted for the number of comparisons.'
    +(outcomes.length?` Left out of every comparison: ${request.outcomeColumn} `
      +`${outcomes.map(v=>`"${v}"`).join(', ')}.`:'')
    +(unreadable.length?` Not read: ${unreadable.map(row=>`${row.column} (${row.reason})`).join('; ')}`:'');
  return {rows,sentence,table:{kind:'data-table',keys:['exposure','measure'],valueField:'value',
    rows:out,rowCount:out.length,missingValueCount:out.filter(row=>row.value===null).length}};
}
