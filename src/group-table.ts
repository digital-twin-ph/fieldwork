/** `SUMMARIZE`: an aggregate within the key columns you keep.
 *
 *  The operation the Snow chain needed and nothing could do. `rate` groups and sums internally --
 *  `computeRate` accumulates a numerator and a denominator per group -- but it emits a RATE, so
 *  the totals are consumed on the way out and no other step can use them. A stratified
 *  contingency table needs those totals and no rate: 32 sub-districts summed within three water
 *  supply categories, which is how Snow's Table VIII and Table XII become a table of people by
 *  supply and outcome. Before this, that table was computed by hand and inlined into the example
 *  project with an empty digest.
 *
 *  THE KEPT COLUMNS ARE NAMED, not the dropped ones, for the reason `wideDataTable` names its
 *  value columns explicitly: a column added to a file later must not silently change an analysis
 *  somebody has already read. Name what is kept and a new column is dropped, leaving the same
 *  groups; name what is dropped and a new column silently becomes a grouping key.
 *
 *  SUM AND NOTHING ELSE UNTIL 2026-10-31, deliberately, and the reason is kept because it still
 *  decides most of the vocabulary: summing counts gives a count, while summing rates gives a
 *  number with no referent -- deaths per 1,000 in three sub-districts do not add to deaths per
 *  3,000 in one. This step cannot tell a count from a rate, so it offered the operation that is
 *  right for the counts a contingency table is made of and left the rest unbuilt rather than
 *  offering a choice it could not police.
 *
 *  WHAT CHANGED, AND WHAT DID NOT. The additivity argument does not reach `MIN` and `MAX`: a
 *  maximum of three rates IS a rate, and an extremum is meaningful on counts and rates alike.
 *  It is strictly safer than the sum this step already offered. So the two were admitted and
 *  everything else stayed out -- `AVG` has the referent problem the argument is about, `STDEVP`
 *  and `VARP` are population variants that are right on a census and wrong on a sample, and
 *  `FIRST` and `LAST` depend on a row order a long table does not promise.
 *
 *  AND THE COMMAND IS `SUMMARIZE`, not `MEANS`, which the old comment had wrong. The two are separate statistics
 *  commands: `SUMMARIZE` takes an aggregate, the groups, a result field and an output table -- it emits a DATASET --
 *  while `MEANS` takes a field, a cross-tab and options and emits a REPORT. This step emits a table, so it was always
 *  the first of the two. It has been `SUMMARIZE` restricted to `SUM` all along, under a name that did not
 *  say so. Experiment 157; the node type stays `group_table` because renaming one rewrites every
 *  saved workflow that holds it, and the naming finding is recorded rather than acted on.
 *
 *  AND COUNT, ON 2026-11-02, because a line list has nothing else to add. Oswego's 75 people are
 *  a row each with a Y or an N under every food and no count anywhere, so no sum reaches a
 *  two-by-two: the file holds no column worth adding, and writing a column of 1s into a published
 *  line list would be editing the source to suit the tool. The additivity argument does not reach
 *  COUNT, because it never reads the value: it says how many rows agree, and that means the same
 *  thing over a count, a rate or an age. What it cannot know is that a row is a subject. A wide
 *  import with two value columns has two rows per person, so the receipt says ROWS and never
 *  people, and the manual says to import one value column.
 *
 *  NO PARITY WITH ANOTHER PROGRAM IS CLAIMED by sharing the command's name, and nothing here is checked against one.
 *
 *  A NULL IS NOT A ZERO, which is the whole risk of this operation. Every long table here can
 *  hold a null, meaning the cell was empty, and summing over one quietly produces a total that
 *  is too small by an unknown amount -- a stratum whose population nobody recorded coming out
 *  smaller rather than coming out unknown. So a group holding any null totals to NULL and is
 *  reported by name, which is the same choice `deriveValue` makes about a missing operand.
 */
import type {DataTable} from './data-table.js';
import type {Workflow} from './types.js';

/** THE AGGREGATES THIS STEP CAN POLICE, and no others.
 *
 *  A `SUMMARIZE` command can offer AVG, COUNT, FIRST, LAST, MAX, MIN, STDEV, STDEVP, SUM, VAR and VARP. Four are
 *  admitted here and the absences are an argument rather than an oversight;
 *  see the note at the head of this file. */
export const AGGREGATES=['sum','minimum','maximum','count'] as const;
export type Aggregate=typeof AGGREGATES[number];

export interface GroupRequest {
  /** The key columns to keep. Rows agreeing on all of them become one row. */
  by:string[];
  /** Which aggregate. `sum` is the default and is what this step did before 2026-10-31, so every
   *  saved workflow keeps its meaning without carrying the field. */
  aggregate?:Aggregate;
  /** TOTAL WHAT IS PRESENT, EXCLUDING EMPTY CELLS — declared, and never assumed.
   *
   *  The default is false and the default is this project's position: a group holding an empty
   *  cell has an unknown total rather than a smaller one. That refusal is right and it is
   *  sometimes wrong about the world, so an override exists.
   *
   *  IT EXCLUDES; IT DOES NOT ZERO. The practitioner, 2026-10-31, correcting the first version of
   *  this: *"I think the more prudent action to deal with blanks is to opt to exclude them, not
   *  assign a zero value."* For a SUM the two give the same number, which is exactly why the
   *  difference is easy to miss and worth insisting on — they make different CLAIMS. Counting a
   *  blank as zero asserts a measurement: that there were none. Excluding it asserts only that
   *  what was totalled is what was recorded. The first can be wrong about the world; the second
   *  cannot, because it says less.
   *
   *  And the difference stops being invisible the moment anything divides. A mean, a rate or a
   *  per-unit figure over an excluded group has a denominator of what remains; over a zeroed one
   *  it has a denominator that includes a unit contributing nothing. Same total, different
   *  quantity.
   *
   *  The case that produced it: Snow's Table XII leaves Dulwich's 1854 cell BLANK — verified
   *  against Project Gutenberg #72894, where it is not a zero, not a dash, but nothing printed —
   *  and Dulwich is one of four sub-districts supplied by the Lambeth Company alone. His own
   *  summary row totals those four at 37, and 10 + 15 + 12 = 37. So the figure is reachable by
   *  totalling the three that are recorded, which is what this does, rather than by deciding what
   *  the blank meant.
   *
   *  Either way it is DECLARED: the result counts what it excluded, the receipt records it, and
   *  the write-up carries the caveat automatically. */
  excludeMissing?:boolean;
  /** EACH GROUP'S SHARE OF A TOTAL, % (experiment 191). `within`: the kept columns whose groups each total 100; none,
   *  the whole table. Offered with a sum and a count, which add up to a total; never with a minimum or a maximum. */
  share?:{within:string[]};
}
/** THE KEY THAT TELLS A COUNT FROM ITS SHARE, in a table that carries both (experiment 191). */
export const SHARE_MEASURE='statistic';
/** The share's name in that key, which says what it is a share of. */
export const shareName=(within:readonly string[])=>within.length?`% within ${within.join(' and ')}`:'% of all';

/** A group that held an empty cell, so its total is unknown rather than smaller. */
export interface GroupGap {group:string; rowsSummed:number; rowsEmpty:number}
export interface GroupResult {
  table:DataTable; groups:number; collapsedFrom:number; dropped:string[]; gaps:GroupGap[];
  /** Which aggregate produced the values, so a receipt and a caption need not infer it. */
  aggregate:Aggregate;
  /** What the override covered: how many empty cells were left out, from how many groups, and
   *  for each of those groups how many rows did contribute. Absent when the override is off,
   *  which is how a reader tells "nothing was excluded" from "the field did not exist". */
  excluded?:{cells:number; groups:number; of:GroupGap[]};
  /** Present when shares were asked for: what they are shares of, and how many strata had no share to give. */
  shares?:{within:string[]; name:string; unknownStrata:number; zeroStrata:number};
}

export function groupTable(table:DataTable,request:GroupRequest):GroupResult {
  const result=groupTotals(table,request);
  return request.share?withShares(result,request.by.map(n=>n.trim()).filter(Boolean),request.share.within):result;
}

/** THE SHARES, beside the totals they are shares of: the result gains a `measure` key whose rows are the total and
 *  the share, declared wide so the view shows them as two columns. Held to one decimal place, so a stratum can sum to
 *  99.9 or 100.1. A stratum whose total is unknown, because a group in it summed over an empty cell, has every share
 *  unknown: a share of an unknown total is not a smaller share. */
export function withShares(result:GroupResult,by:readonly string[],within:readonly string[]):GroupResult{
  if(result.aggregate==='minimum'||result.aggregate==='maximum')
    throw new Error('A share needs a total, and a minimum or a maximum does not add up to one. Choose Sum or Count rows.');
  for(const w of within)if(!by.includes(w))throw new Error(`"${w}" is not a kept column, so there are no groups within it to total 100.`);
  if(within.length&&within.length===by.length)throw new Error('Every kept column is a "within" column, so each group would be 100% of itself. '
    +'Leave at least one kept column out of "within".');
  if(by.includes(SHARE_MEASURE))throw new Error(`A kept column is already called "${SHARE_MEASURE}", which the shares need for their own column.`);
  const t=result.table,stratum=(row:{key:Record<string,string>})=>within.map(w=>row.key[w]).join('\u0000');
  const totals=new Map<string,number|null>();
  for(const row of t.rows){const id=stratum(row),held=totals.get(id);
    totals.set(id,held===null||row.value===null?null:(held??0)+row.value);}
  const name=shareName(within),value=t.valueField;
  const rows=t.rows.flatMap(row=>{const total=totals.get(stratum(row));
    const share=total===null||total===undefined||row.value===null?null:total===0?null:Math.round(row.value/total*1000)/10;
    return [{key:{...row.key,[SHARE_MEASURE]:value},value:row.value},{key:{...row.key,[SHARE_MEASURE]:name},value:share}];});
  const {wide:_wide,...rest}=t;
  return {...result,table:{...rest,keys:[...t.keys,SHARE_MEASURE],rows,rowCount:rows.length,
    missingValueCount:rows.filter(r=>r.value===null).length,wide:{measureKey:SHARE_MEASURE,subjectKeys:[...t.keys],asDeclared:true}},
    shares:{within:[...within],name,unknownStrata:[...totals].filter(([,v])=>v===null).length,zeroStrata:[...totals].filter(([,v])=>v===0).length}};
}

function groupTotals(table:DataTable,request:GroupRequest):GroupResult {
  const by=request.by.map(name=>name.trim()).filter(Boolean);
  if(!by.length)throw new Error('Name at least one key column to total within. '
    +'Grouping by nothing would give one number, which a table cannot hold a key for.');
  if(new Set(by).size!==by.length)throw new Error('The key columns to keep must be distinct.');
  for(const name of by)
    if(!table.keys.includes(name))
      throw new Error(`This table has no "${name}" column. Its columns are ${table.keys.join(', ')}.`);
  const dropped=table.keys.filter(name=>!by.includes(name));
  if(!dropped.length)
    throw new Error('Those are all of this table\'s key columns, so every row is already its own '
      +'group and totalling would change nothing. Leave out the column whose rows should be added up.');

  const groups=new Map<string,{key:Record<string,string>; label:string;
    total:number; summed:number; empty:number; values:number[]}>();
  for(const row of table.rows){
    const key=Object.fromEntries(by.map(name=>[name,row.key[name]??'']));
    const id=by.map(name=>key[name]).join('\u0000');
    const group=groups.get(id)??{key,label:by.map(name=>key[name]).join(' · '),
      total:0,summed:0,empty:0,values:[]};
    // An empty cell still COUNTS as empty whichever way this is set: the override changes what
    // the total is, never what was in the table. `gaps` is what the surfaces report from.
    // An empty cell is counted as empty whichever way this is set. `summed` stays the number of
    // rows that CONTRIBUTED a value, so "3 of 4" can be said rather than inferred.
    if(row.value===null)group.empty++;
    else{group.total+=row.value;group.summed++;group.values.push(row.value);}
    groups.set(id,group);
  }
  const aggregate=request.aggregate??'sum';
  /** A COUNT HAS NO EMPTY CELLS TO WORRY ABOUT. It never reads the value, so a row with a blank
   *  value is still a row, there is nothing to exclude, and the result no longer measures what
   *  the input's value column measured. */
  if(aggregate==='count'){
    const rows=[...groups.values()].map(group=>({key:group.key,value:group.summed+group.empty}));
    const {unit:_unit,...rest}=table;
    return {aggregate,table:{...rest,keys:by,valueField:'rows',rows,rowCount:rows.length,
      missingValueCount:0},groups:rows.length,collapsedFrom:table.rows.length,dropped,gaps:[]};
  }
  /** AN EXTREMUM OF NOTHING IS NOT ZERO, which is where this differs from a sum. A group whose
   *  every cell was excluded has a total of 0 -- nothing added up to nothing -- and has no
   *  minimum at all, because there is no value to be the smallest. Returning 0 there would
   *  invent an observation, which is the error this whole file is about. */
  const aggregated=(group:{total:number; values:number[]}):number|null=>
    aggregate==='sum'?group.total
    :!group.values.length?null
    :aggregate==='minimum'?Math.min(...group.values):Math.max(...group.values);
  const rows=[...groups.values()].map(group=>({key:group.key,
    value:group.empty&&!request.excludeMissing?null:aggregated(group)}));
  const gaps=[...groups.values()].filter(group=>group.empty)
    .map(group=>({group:group.label,rowsSummed:group.summed,rowsEmpty:group.empty}));
  const overridden=request.excludeMissing
    ?{cells:[...groups.values()].reduce((n,g)=>n+g.empty,0),
      groups:[...groups.values()].filter(g=>g.empty).length,
      of:[...groups.values()].filter(g=>g.empty)
        .map(g=>({group:g.label,rowsSummed:g.summed,rowsEmpty:g.empty}))}
    :undefined;
  return {aggregate,...(overridden?{excluded:overridden}:{}),
    // STILL WIDE when the measure is among the groups (experiment 188): totals by company and measure are one record per
    // company, each measure a number. Otherwise the subjects are gone, and so is the claim.
    table:{...(({wide:_,...rest})=>rest)(table),keys:by,rows,rowCount:rows.length,
    ...(table.wide&&by.includes(table.wide.measureKey)&&by.length>1
      ?{wide:{measureKey:table.wide.measureKey,subjectKeys:by.filter(k=>k!==table.wide!.measureKey)}}:{}),
    missingValueCount:rows.filter(row=>row.value===null).length},
    groups:rows.length,collapsedFrom:table.rows.length,dropped,gaps};
}

/** Drops `missingAsZero`, which no longer decides anything.
 *
 *  An empty cell was once overridable to a zero. That was withdrawn for the rule the practitioner
 *  settled on -- *the more prudent action to deal with blanks is to opt to exclude them, not
 *  assign a zero value* -- and `excludeMissing` replaced it. The parameter stayed on workflows
 *  saved before the change, where it is inert and WORSE THAN INERT IN A PUBLISHED FILE: a reader
 *  of the JSON finds `missingAsZero: true` beside `excludeMissing: true` and has every reason to
 *  read the first one, which states the opposite of what the step does. Removed on open rather
 *  than tolerated, because the file is the thing a collaborator reads. */
export function migrateGroupTableNulls(workflow:Workflow):void{
  for(const node of workflow.nodes){
    if(!node||node.type!=='group_table'||!node.params)continue;
    if('missingAsZero' in node.params)delete (node.params as Record<string,unknown>).missingAsZero;
  }
}
