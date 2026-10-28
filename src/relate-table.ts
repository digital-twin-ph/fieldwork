/** `RELATE`: bringing a column from one table onto the rows of another, on a shared key.
 *
 *  Epi Info has three join commands -- `MERGE`, `RELATE` and `MATCH` -- and this project had
 *  none, which the 0.12.0 release notes recorded as the reason South London's contingency table
 *  is "prepared outside the application". It was carried as one missing capability. It is not
 *  one: the three differ in what they bring across and in how they match, and the one the Snow
 *  chain needs is the narrowest of them.
 *
 *  THE SHAPE THE DATA FORCES, again, and differently from `derive-value.ts`. A `DataTable` here
 *  is long: key columns and one value. So there are two distinct things a join could do, and
 *  they are not variants of one operation.
 *
 *    - Bring a CATEGORY across. Snow's Table XII says which company supplied each of 32
 *      sub-districts; Table VIII gives each sub-district's population and deaths. The thing
 *      being brought is `water_supply`, which is not a number and can never be a value in a long
 *      table. It is a KEY COLUMN, and relating adds it to every row of the left table. The row
 *      count does not change.
 *    - Bring MEASURES across, which adds ROWS -- new values of the measure column -- and is a
 *      different operation with a different failure mode (two tables disagreeing about the same
 *      measure, rather than one table being ambiguous about a category). Not built here, and
 *      named so that this module is not later widened into it by accident.
 *
 *  So this is `RELATE` and not `MERGE`, and the widget says so.
 *
 *  WHAT IT REFUSES. A right table holding two different values of the related column for one key
 *  is ambiguous, and the ambiguity is the interesting case rather than an edge case: it is what a
 *  table looks like when the key does not identify what the practitioner thinks it identifies.
 *  Picking the first would produce a stratification that is quietly wrong in a way no total
 *  reveals. A left key the right table does not carry is reported by name and its rows are
 *  dropped, because a row with an absent category cannot be grouped by that category and
 *  inventing "unknown" for it would put a stratum in the table that the data never measured.
 */
import {normaliseName} from './deduplicate-points.js';
import type {DataTable} from './data-table.js';

export interface RelateRequest {
  /** The key column both tables carry. Key cells are trimmed at import (`data-table.ts`); how
   *  they are compared here is `normalisation`. */
  on:string;
  /** The right table's key column to add to the left table's rows. */
  bring:string;
  /** HOW KEY CELLS ARE COMPARED, in the vocabulary `join_table_to_area` already uses and through
   *  the same `normaliseName`: `fuzzy` folds every run of non-alphanumerics to one space, `exact`
   *  only trims and lowercases. Defaults to `fuzzy`.
   *
   *  It was exact-and-unstated until 2026-10-28, which made the weaker join the stricter one.
   *  `join_table_to_area` exists BECAUSE sources spell names differently: 23 of Snow's 32
   *  sub-districts match the published boundaries on raw strings and 32 of 32 once punctuation is
   *  folded, every difference being a single comma. This matched on raw strings, so the same nine
   *  rows would have been dropped here and matched next door. */
  normalisation?:'exact'|'fuzzy';
  /** The key column whose values name the numeric variables, so the overlap can be reported per
   *  variable rather than as one total -- the same pivot `rate` names `measureKey`, and the same
   *  thing `derive_value` and `select_rows` ask for as their key column.
   *
   *  The practitioner, 2026-10-28: *"The visual aid should also enable the user to see the effects
   *  of each type of join on numeric variables."* Where nothing says which column holds them, the
   *  share of the one value column is reported instead, which is the same statement with one
   *  variable in it. */
  measureKey?:string;
  /** What to do with the left rows the right table has no key for, where there are any. Absent
   *  and non-empty gaps is a REFUSAL, not a default: see `relateTable`. */
  unmatched?:UnmatchedDeclaration;
}
/** A left key the right table had no row for. Reported, never defaulted. */
export interface RelateGap {key:string; rows:number}

/** WHAT THE PRACTITIONER DECIDED about the rows that did not match.
 *
 *  Settled 2026-10-28 on the practitioner's point that the join is a decision with downstream
 *  consequences and not a detail: *"What the user decides to do after that has downstream
 *  consequences."* So where anything is unmatched this is required, and the shape is
 *  `deduplicate_points`' review decision rather than a parameter -- a judgement recorded together
 *  with a signature of the data it was made about, so editing the data or changing the comparison
 *  lapses it instead of letting a stale answer ride on changed rows.
 *
 *  `keep` needs a `label`, and the practitioner types it. The project refuses to invent a stratum
 *  nobody measured; a stratum the practitioner NAMES is declared rather than invented, and it
 *  appears in the receipt under their own words. */
export interface UnmatchedDeclaration {
  decision:'drop'|'keep';
  /** The category the kept rows carry. Required for `keep`, and refused where it is already a
   *  value the second table measured. */
  label?:string;
  reason?:string;
  /** `gapSignature` of the gap this was decided about. */
  signature:string;
}

/** THE SHAPE OF THE JOIN, as distinct keys on each side after normalisation.
 *
 *  Keys and not rows: a long table holds several rows per subject, so counting rows would say
 *  that 9 unmatched sub-districts are 18 unmatched things. The bar a practitioner reads is about
 *  subjects; the row counts are reported beside it. */
export interface RelateOverlap {
  leftOnly:number; matched:number; rightOnly:number;
  /** The unmatched left keys by their RAW spelling, with how many rows each -- what to go and look
   *  for in the file, which a folded key is not. */
  gaps:RelateGap[];
  /** Right keys no left row names, by raw spelling. A COUNT, never a measure: these keys have no
   *  row in the left table, so there is no number to add up for them. */
  rightOnlyKeys:string[];
}

/** WHAT AN INNER JOIN DOES TO ONE NUMERIC VARIABLE.
 *
 *  `share` is the decision-relevant figure, and it is exact rather than a heuristic: for any two
 *  variables, an inner join multiplies a rate of one over the other by exactly the ratio of their
 *  shares. Measured on Snow's Table VIII against the published boundaries, 0.612/0.682 = 0.8963,
 *  and 3.109 x 0.8963 = 2.787 per 1000 to three decimals.
 *
 *  So the panel states the effect on the figure the practitioner is about to compute without
 *  guessing a threshold and without being told which variable they mean as a denominator. And
 *  where the shares differ, that difference IS the epidemiological content: had both dropped in
 *  step the ratio would be unchanged and only its precision would suffer. */
export interface MeasureShare {
  measure:string;
  /** Total over every row the left table offered, and over the rows that matched. */
  all:number; related:number;
  /** `related / all`, or null where the variable totals nothing to divide by. */
  share:number|null;
}

export interface RelateResult {
  table:DataTable; related:number; dropped:number; gaps:RelateGap[];
  /** Rows kept by a `keep` declaration, carrying the practitioner's own label. */
  kept:number;
  /** Distinct values of the brought column that actually landed, in first-seen order: what a
   *  practitioner needs to see before grouping by it. */
  values:string[];
  overlap:RelateOverlap;
  shares:MeasureShare[];
  normalisation:'exact'|'fuzzy';
  /** The decision this result was computed under, where one was needed. Carried so the receipt
   *  states it: the practitioner's choice is part of how the numbers were made. */
  declared?:{decision:'drop'|'keep'; label?:string; reason?:string};
}

const DEFAULT_NORMALISATION='fuzzy' as const;

/** A signature of the gap a declaration was made about. Covers the comparison too, because
 *  changing it changes which rows are in the gap, and a decision made about nine missing keys is
 *  not a decision about none. The device `deduplicate_points` uses, for the same reason. */
export function gapSignature(gaps:RelateGap[],normalisation:'exact'|'fuzzy'):string{
  return [normalisation,...gaps.map(g=>`${g.key}\u0000${g.rows}`).sort()].join('\u001f');
}

/** THE SHAPE OF A JOIN, WITHOUT COMMITTING TO ONE.
 *
 *  The practitioner, 2026-10-28: *"I expect the views to show up in a Quick Look dialog modal
 *  where the user can make a decision about the type of join. The modal dialog should also show
 *  the preview of the joined tables depending on the type of join selected and a Finalize button
 *  after the selection."*
 *
 *  So the computation splits in two. This one never refuses for a missing decision -- a dialog
 *  that cannot draw the thing being decided is no help -- and `relateTable` requires the decision,
 *  because a RUN that quietly picked one would be the behaviour this whole change is about. It is
 *  the device the table import already uses: show the before, show the after, commit on a press. */
export interface RelateShape {
  overlap:RelateOverlap;
  shares:MeasureShare[];
  normalisation:'exact'|'fuzzy';
  /** What a declaration about this gap must carry to still be about it. */
  signature:string;
  /** Distinct values of the brought column that landed, in first-seen order. */
  values:string[];
  /** The table each decision would produce. `keep` is null until the practitioner has named the
   *  category, because the application will not invent one to preview either. */
  previews:{drop:DataTable; keep:DataTable|null};
  /** Why the named category cannot be used, where it cannot. */
  labelRefusal:string|null;
}

interface RelatePlan {
  on:string; bring:string; normalisation:'exact'|'fuzzy';
  lookup:Map<string,string>;
  fold:(value:string)=>string;
  gaps:RelateGap[];
  overlap:RelateOverlap;
  shares:MeasureShare[];
  signature:string;
  values:string[];
  matched:number;
  left:DataTable;
}

/** Everything both entry points need, and every refusal that does not depend on the decision. */
function planRelate(left:DataTable,right:DataTable,request:RelateRequest):RelatePlan {
  const on=request.on.trim(),bring=request.bring.trim();
  const normalisation=request.normalisation??DEFAULT_NORMALISATION;
  // WHICH COLUMN NAMES THE VARIABLES, defaulted rather than demanded. `wideDataTable` writes
  // `measureKey||'measure'`, so every table this application melted from a wide file has a key
  // column literally called `measure` unless the practitioner renamed it. Defaulting to it means
  // the shares appear without anybody configuring anything, and the dialog and the run agree
  // because they agree here rather than each guessing.
  const measureKey=request.measureKey?.trim()
    ||(left.keys.includes('measure')?'measure':undefined);
  if(!on)throw new Error('Name the column both tables share.');
  if(!bring)throw new Error('Name the column to bring across.');
  if(!left.keys.includes(on))
    throw new Error(`The first table has no "${on}" column. Its columns are ${left.keys.join(', ')}.`);
  if(!right.keys.includes(on))
    throw new Error(`The second table has no "${on}" column. Its columns are ${right.keys.join(', ')}.`);
  if(!right.keys.includes(bring))
    throw new Error(`The second table has no "${bring}" column. Its columns are ${right.keys.join(', ')}.`);
  if(on===bring)
    throw new Error(`"${on}" is the column being matched on, so bringing it across would add nothing.`);
  if(left.keys.includes(bring))
    throw new Error(`The first table already has a "${bring}" column. Relating would give its rows two `
      +'values for one key, which is a table nobody can read.');
  if(measureKey&&!left.keys.includes(measureKey))
    throw new Error(`The first table has no "${measureKey}" column to read variable names from. `
      +`Its columns are ${left.keys.join(', ')}.`);
  if(measureKey&&measureKey===on)
    throw new Error(`"${on}" is the column being matched on, so it does not name the table's variables.`);

  const fold=(value:string)=>normaliseName(value,normalisation);

  // THE RIGHT TABLE'S LOOKUP, keyed by the FOLDED key, and built before anything is joined so an
  // ambiguous key is reported as ambiguity rather than as a number that came out wrong.
  //
  // The ambiguity is checked against the folded key because the folding itself can create it: two
  // spellings differing only by punctuation become one key and may carry two different categories.
  // `area-join.ts` names this case `ambiguous-data-key` and checks it in the same place, for the
  // same reason.
  const lookup=new Map<string,string>();
  const spellings=new Map<string,Set<string>>();
  const ambiguous=new Map<string,Set<string>>();
  for(const row of right.rows){
    const raw=row.key[on],value=row.key[bring];
    if(raw===undefined||value===undefined)continue;
    const key=fold(raw);
    // A row whose key cell is empty names no subject. Skipped rather than matched against every
    // other empty cell, which would relate unrelated rows to one another.
    if(!key)continue;
    (spellings.get(key)??spellings.set(key,new Set()).get(key)!).add(raw);
    const held=lookup.get(key);
    if(held===undefined){lookup.set(key,value);continue;}
    if(held!==value)(ambiguous.get(key)??ambiguous.set(key,new Set([held])).get(key)!).add(value);
  }
  if(ambiguous.size){
    const [key,clashing]=[...ambiguous.entries()][0];
    const raws=[...(spellings.get(key)??new Set([key]))];
    throw new Error(`The second table gives "${raws[0]}" more than one "${bring}": `
      +`${[...clashing].map(v=>`"${v}"`).join(' and ')}`
      +(ambiguous.size>1?`, and ${ambiguous.size-1} other ${ambiguous.size===2?'key does':'keys do'} the same`:'')
      +`. Relating cannot choose between them, and choosing would put a value on these rows that `
      +`the table does not support. `
      +(raws.length>1
        ?`Those rows are spelled ${raws.map(v=>`"${v}"`).join(' and ')} and are one key only because `
          +`"${on}" is compared with punctuation folded; comparing it exactly would keep them apart.`
        :`Check whether "${on}" identifies one row of the second table.`));
  }

  // WHICH KEYS MATCH, before any row is built, so the decision is made against the gap and the
  // rows are constructed once with the answer known.
  const gapRows=new Map<string,number>();
  const leftKeys=new Set<string>();
  const matchedKeys=new Set<string>();
  const values:string[]=[];
  const seen=new Set<string>();
  let matched=0;
  for(const row of left.rows){
    const raw=row.key[on]??'';
    const key=fold(raw);
    leftKeys.add(key);
    const value=lookup.get(key);
    if(value===undefined){gapRows.set(raw,(gapRows.get(raw)??0)+1);continue;}
    matchedKeys.add(key);matched++;
    if(!seen.has(value)){seen.add(value);values.push(value);}
  }
  const gaps:RelateGap[]=[...gapRows.entries()].map(([key,count])=>({key,rows:count}));

  // Reported before any decision is asked for: "no key matched at all" is a different fault from
  // "nine keys did not", and telling a practitioner to decide what to do with every row of their
  // table is not the message they need.
  if(!matched)
    throw new Error(`No key in the first table's "${on}" column appears in the second table's, so `
      +'nothing could be related. Check that the two columns hold the same kind of key'
      +(normalisation==='exact'?', or compare them with punctuation folded.':'.'));

  // WHAT THE JOIN DOES TO EACH NUMERIC VARIABLE, over the rows that MATCHED. Independent of the
  // decision, because that is the comparison the decision is made against: under `keep` the result
  // totals the whole left table again, and the share still says what dropping would have cost.
  const variableOf=(key:Record<string,string>)=>measureKey?key[measureKey]??'':left.valueField;
  const totals=new Map<string,{all:number;related:number}>();
  const add=(name:string,field:'all'|'related',value:number|null)=>{
    const held=totals.get(name)??{all:0,related:0};
    if(value!==null)held[field]+=value;
    totals.set(name,held);
  };
  for(const row of left.rows){
    add(variableOf(row.key),'all',row.value);
    if(lookup.has(fold(row.key[on]??'')))add(variableOf(row.key),'related',row.value);
  }
  const shares:MeasureShare[]=[...totals.entries()].map(([measure,t])=>
    ({measure,all:t.all,related:t.related,share:t.all?t.related/t.all:null}));

  const rightOnly=[...lookup.keys()].filter(key=>!leftKeys.has(key));
  const overlap:RelateOverlap={
    leftOnly:new Set([...gapRows.keys()].map(fold)).size,
    matched:matchedKeys.size,
    rightOnly:rightOnly.length,
    gaps,
    rightOnlyKeys:rightOnly.map(key=>[...(spellings.get(key)??new Set([key]))][0]),
  };
  return {on,bring,normalisation,lookup,fold,gaps,overlap,shares,
    signature:gapSignature(gaps,normalisation),values,matched,left};
}

/** The rows a decision produces, in the left table's own order. `label` undefined is the inner
 *  join; a label keeps the unmatched rows under it. */
function buildRows(plan:RelatePlan,label:string|undefined):DataTable {
  const {left,on,bring,lookup,fold}=plan;
  const rows:DataTable['rows']=[];
  for(const row of left.rows){
    const value=lookup.get(fold(row.key[on]??''));
    if(value===undefined){
      if(label===undefined)continue;
      rows.push({key:{...row.key,[bring]:label},value:row.value});
      continue;
    }
    rows.push({key:{...row.key,[bring]:value},value:row.value});
  }
  return {...left,keys:[...left.keys,bring],rows,rowCount:rows.length,
    missingValueCount:rows.filter(row=>row.value===null).length};
}

/** Why a named category cannot be used, or null. Shared so the dialog refuses before Finalize
 *  rather than after, and a run refuses the same way for the same reason. */
function labelRefusalFor(plan:RelatePlan,label:string|undefined):string|null {
  if(label===undefined)return null;
  if(!label.trim())
    return 'Keeping the unmatched rows needs a name for the category they carry. Nothing here will '
      +'invent one: a stratum the data never measured has to be your words, so that a reader of '
      +`the table can see that "${plan.bring}" was not observed for those rows.`;
  if(plan.values.includes(label.trim()))
    return `"${label.trim()}" is already a "${plan.bring}" the second table measured, so the `
      +`unmatched rows would join a stratum that was observed. Name them something that is not `
      +`${plan.values.map(v=>`"${v}"`).join(' or ')}.`;
  return null;
}

export function relateShape(left:DataTable,right:DataTable,request:RelateRequest):RelateShape {
  const plan=planRelate(left,right,request);
  const label=request.unmatched?.decision==='keep'?request.unmatched.label:undefined;
  const refusal=labelRefusalFor(plan,label);
  return {overlap:plan.overlap,shares:plan.shares,normalisation:plan.normalisation,
    signature:plan.signature,values:plan.values,
    previews:{drop:buildRows(plan,undefined),
      keep:label!==undefined&&!refusal?buildRows(plan,label.trim()):null},
    labelRefusal:refusal};
}

export function relateTable(left:DataTable,right:DataTable,request:RelateRequest):RelateResult {
  const plan=planRelate(left,right,request);
  const {gaps,signature,bring,normalisation}=plan;

  // THE DECISION, required where anything is unmatched. Not a default: the practitioner said the
  // choice has downstream consequences, and an application that picks for them has made the choice
  // invisible at the one place it is cheap to see.
  const declared=gaps.length?request.unmatched:undefined;
  if(gaps.length&&!declared)
    throw new Error(`${gaps.length} key${gaps.length===1?'':'s'} in the first table `
      +`${gaps.length===1?'has':'have'} no row in the second: `
      +`${gaps.slice(0,4).map(g=>`"${g.key}"`).join(', ')}`
      +(gaps.length>4?`, and ${gaps.length-4} more`:'')
      +`. Open the join and say whether to drop those rows or keep them under a category you name, `
      +`because the two give different totals and the result cannot be read for which you got.`);
  if(declared&&declared.signature!==signature)
    throw new Error('The data or the key comparison changed since you decided what to do with the '
      +'unmatched rows, so that decision no longer describes this gap. Open the join and look at '
      +'it again.');

  const label=declared?.decision==='keep'?(declared.label??''):undefined;
  const refusal=labelRefusalFor(plan,label);
  if(refusal)throw new Error(refusal);

  const table=buildRows(plan,label===undefined?undefined:label.trim());
  const values=label===undefined?plan.values:[...plan.values,label.trim()];
  return {table,related:plan.matched,
    dropped:label===undefined?left.rows.length-plan.matched:0,
    kept:label===undefined?0:left.rows.length-plan.matched,
    gaps,values,overlap:plan.overlap,shares:plan.shares,normalisation,
    declared:declared?{decision:declared.decision,
      ...(declared.label?{label:declared.label.trim()}:{}),
      ...(declared.reason?{reason:declared.reason}:{})}:undefined};
}

/** WHAT THE STEP DID, kept on the run so the step itself can show it.
 *
 *  `RelateResult` computed all four numbers from the first day and displayed none of them: the
 *  table travelled on and the counts went into the N3 receipt, which is the one surface this
 *  project has already agreed nobody reads for this purpose. So a relate whose second table was
 *  missing a third of the keys produced a table that looked complete, because the rows that left
 *  left quietly.
 *
 *  THAT IS THE DIFFERENCE FROM PANDAS, and it is why the panel leads with the count rather than
 *  the data. A left join in pandas keeps the unmatched row and writes NaN into the brought
 *  column, so the table itself tells you; this application drops the row and reports it, which
 *  is the better default for a stratification and the worse one for a reader who only looks at
 *  the result. The report is therefore not optional.
 *
 *  The labels of the two tables are NOT here. A node's label belongs to the workflow and is
 *  editable after the run; resolving it from the edges at the moment of display keeps one answer
 *  rather than two that can disagree. */
export interface RelateOutcome {
  on:string; bring:string;
  /** Rows the left table brought in: `related + dropped`, stated rather than derived, because it
   *  is the denominator the other two numbers mean something against. */
  offered:number;
  related:number; dropped:number; gaps:RelateGap[]; values:string[];
  /** The left table's own columns, in its order. With `bring`, this is the whole of the result's
   *  key columns and says which table each came from -- what pandas writes as an `_x`/`_y`
   *  suffix, said in words because here only one column crosses over. */
  carried:string[];
  /** Rows kept under a declared category rather than dropped. */
  kept:number;
  /** The shape of the join and what it did to each numeric variable, so the step can draw the bar
   *  and the shares without recomputing them. */
  overlap:RelateOverlap;
  shares:MeasureShare[];
  normalisation:'exact'|'fuzzy';
  declared?:{decision:'drop'|'keep'; label?:string; reason?:string};
}

/** THE MULTIPLIER A DROP PUTS ON A RATE, exactly.
 *
 *  For any two variables, an inner join multiplies a rate of one over the other by the ratio of
 *  their retained shares. Measured on Snow's Table VIII against the published boundaries:
 *  0.612/0.682 = 0.8963, and 3.109 x 0.8963 = 2.787 per 1000 to three decimals.
 *
 *  So the panel states the effect on the figure the practitioner is about to compute without
 *  guessing a threshold and without being told which variable they mean as a denominator. Null
 *  where either share is unknown or the denominator's is zero -- there is no multiplier then, and
 *  a 1 would read as "no effect". */
export function rateMultiplier(shares:MeasureShare[],numerator:string,denominator:string):number|null{
  const of=(name:string)=>shares.find(s=>s.measure===name)?.share??null;
  const n=of(numerator),d=of(denominator);
  return n===null||d===null||d===0?null:n/d;
}

/** The outcome of a relate, as the run records it. Separate from `relateTable` so the computation
 *  returns the table it computed and nothing about how it will be displayed. */
export function relateOutcome(left:DataTable,request:RelateRequest,result:RelateResult):RelateOutcome{
  return {on:request.on.trim(),bring:request.bring.trim(),
    offered:left.rows.length,related:result.related,dropped:result.dropped,kept:result.kept,
    gaps:result.gaps,values:result.values,carried:[...left.keys],
    overlap:result.overlap,shares:result.shares,normalisation:result.normalisation,
    ...(result.declared?{declared:result.declared}:{})};
}

/** A NOTE THE WIDGET MACHINED, for the write-up rather than for the panel.
 *
 *  The practitioner, 2026-10-28, correcting the framing of experiment 146: *"It's not so much
 *  about offering a choice but about (1) being transparent about the effects of table joins (this
 *  should be in fact a machined note from the widget) and (2) serving as a check if the
 *  computations produce values that match with any of those joins and it happens to be the join
 *  the user did not intend to make."*
 *
 *  SIBLING OF A QUOTED NOTE. The South London repository already carries Snow's own sentences as
 *  `fieldwork/quoted-notes/1` with `kind: 'quoted'`; this is the other kind -- the application's
 *  account of what it did to his numbers. A panel is read by whoever is sitting in front of the
 *  step; a note is what survives into the paper, next to the figure it qualifies.
 *
 *  Defined here because `relate_table` is its only producer. When there is a second, this type
 *  moves to `results.ts` and nothing else about it changes. */
export interface MachinedNote {
  /** Which PART of a write-up it belongs to.
   *
   *  The practitioner, 2026-10-28: *"The table join will produce notes that map to Methods."* A
   *  join is a thing you did to the data, and the count of what it excluded is Methods prose in
   *  an epidemiology paper rather than a limitation -- STROBE puts participants excluded, and why,
   *  in Methods. So this widget maps to one part and the vocabulary has one value; it widens
   *  when a producer genuinely needs another, rather than being guessed at now.
   *
   *  NOT "an IMRAD section", which this said until the practitioner corrected it the same day:
   *  *"Title and Abstract are not in IMRAD so we have to account for that in the Notes."* IMRAD is
   *  the BODY -- introduction, methods, results, discussion. A title and an abstract are front
   *  matter, and they are also not things a single node can target: both are assembled from
   *  declarations spread across a workflow, so they are run-level products rather than values of
   *  this field. The two facts point the same way, which is why this union will widen to the body
   *  sections only. */
  section:'methods';
  kind:'machined';
  text:string;
}

const rounded=(share:number)=>`${(share*100).toFixed(1)}%`;

/** The sentences a relate is entitled to contribute to a write-up, in the practitioner's units.
 *
 *  PURPOSE (2) IS WHY THE SHARES ARE STATED AS SHARES. The identity is reversible: a rate of one
 *  variable over another is multiplied by the ratio of their retained shares, so a reader who
 *  expected one figure and is looking at another can divide and find out which join produced what
 *  they have. Stated as the general identity rather than enumerated pair by pair, because with
 *  more than two variables there are more pairs than a note can carry and the division is one
 *  step; the pair is worked explicitly where there are exactly two, which is the epidemiological
 *  case and saves the reader doing it.
 *
 *  Takes the pieces rather than a `RelateResult`, because the dialog shows the note that WOULD be
 *  machined for the decision being considered, and nothing is committed at that point. A
 *  `RelateOutcome` satisfies this structurally, so the run passes its own. */
export interface MachinedNoteInput {
  on:string; bring:string; normalisation:'exact'|'fuzzy';
  overlap:RelateOverlap; shares:MeasureShare[];
  declared?:{decision:'drop'|'keep'; label?:string; reason?:string};
}

export function machinedNotes(view:MachinedNoteInput,tables:{left:string;right:string}):MachinedNote[]{
  const {on,bring,normalisation,overlap,shares,declared}=view;
  const compared=normalisation==='fuzzy'
    ?'comparing keys with punctuation and case folded'
    :'comparing keys exactly, after trimming';
  const notes:MachinedNote[]=[{section:'methods',kind:'machined',
    text:`${bring} was brought from ${tables.right} onto the rows of ${tables.left}, matched on `
      +`${on}, ${compared}. ${overlap.matched} ${on} value`
      +`${overlap.matched===1?'':'s'} appeared in both tables`
      +(overlap.leftOnly?`, ${overlap.leftOnly} only in ${tables.left}`:'')
      +(overlap.rightOnly?`, ${overlap.rightOnly} only in ${tables.right}`:'')
      +(declared
        ?declared.decision==='drop'
          ?`. The rows whose ${on} was absent from ${tables.right} were excluded`
            +(declared.reason?` (${declared.reason})`:'')+'.'
          :`. The rows whose ${on} was absent from ${tables.right} were retained and recorded as `
            +`\u201c${declared.label}\u201d, a category ${tables.right} does not measure`
            +(declared.reason?` (${declared.reason})`:'')+'.'
        :'. No row was excluded.')}];

  if(!overlap.gaps.length||declared?.decision==='keep')return notes;

  // WHAT THE EXCLUSION COST, and only where rows actually left: a second Methods sentence, the
  // one an epidemiology paper carries as "n were excluded because ..., leaving N". A share of
  // 100% stated at all would train a reader to skip it.
  const measured=shares.filter(s=>s.share!==null) as (MeasureShare&{share:number})[];
  const partial=measured.filter(s=>s.share<1);
  if(!partial.length)return notes;
  // QUOTED INDIVIDUALLY, because a key can contain a comma and in this example every one of the
  // nine does: `St. Saviour, Southwark` in a comma-joined list reads as two keys, and the reader
  // cannot tell where one ends. Found 2026-10-28 by printing the note on the real data.
  const named=overlap.gaps.slice(0,6).map(g=>`\u201c${g.key}\u201d`).join(', ')
    +(overlap.gaps.length>6?`, and ${overlap.gaps.length-6} more`:'');
  // BOTH DIRECTIONS, because nothing here knows which variable the practitioner means as the
  // numerator and stating one would privilege it. Order of appearance is not a claim about which
  // rate matters: on Snow's table it would have offered population over deaths, 1.1157, where the
  // figure anybody is reading is the mortality rate, 0.8963.
  const pair=measured.length===2
    ?(():string=>{
        const [a,b]=measured;
        if(!a.share||!b.share)return '';
        const forward=a.share/b.share;
        if(Math.abs(forward-1)<0.0005)
          return ` A rate of either over the other is unchanged, so the exclusion costs precision `
            +'rather than moving the estimate.';
        return ` A rate of ${a.measure} over ${b.measure} computed on this table is `
          +`${forward.toFixed(4)} times its value over the whole of ${tables.left}, and a rate of `
          +`${b.measure} over ${a.measure} is ${(1/forward).toFixed(4)} times its value, because `
          +'the two do not fall in step.';
      })()
    :' A rate of any one of these variables over another, computed on this table, is multiplied by '
      +'the ratio of their retained shares.';
  notes.push({section:'methods',kind:'machined',
    text:`${overlap.gaps.length} ${on} value${overlap.gaps.length===1?'':'s'} present in `
      +`${tables.left} had no row in ${tables.right} (${named}) and the corresponding rows are `
      +`absent from this analysis. Of the totals ${tables.left} holds, `
      +partial.map(s=>`${rounded(s.share)} of ${s.measure} (${s.related.toLocaleString()} of `
        +`${s.all.toLocaleString()})`).join(' and ')
      +` ${partial.length===1?'is':'are'} retained.${pair}`});
  return notes;
}

/** THE RECEIPT, as N3, beside the computation that earned it.
 *
 *  Built here rather than in `core.ts` for two reasons. A release declares the ontology terms its
 *  own module asserts and the gate checks that, which is the mechanical one. The other is that
 *  these facts ARE the computation's account of itself: the counts, the comparison, the
 *  practitioner's decision and what the join did to each variable.
 *
 *  WHY IT EXISTS AT ALL, which is a defect found on 2026-10-28. `receiptText` prints a computation
 *  receipt's `input`, and this widget had only ever set `method` -- so every count it computed
 *  from its first release reached the Inspector and reached the evidence not at all. A browser
 *  test asserting the practitioner's choice was in the receipt is what found it.
 *
 *  `fw:retainedShare` is the part worth machine reading. An inner join multiplies a rate of one
 *  variable over another by exactly the ratio of their retained shares, and that identity runs
 *  backwards: somebody holding a figure they did not expect can divide and name the join that
 *  produced it, outside this application, later, from the receipt alone. */
export function relateReceiptFacts(
  outcome:RelateOutcome,
  notes:MachinedNote[],
  context:{runId:string; nodeId:string},
):string{
  const quote=(value:string)=>JSON.stringify(value);
  const entity=`<urn:fieldwork:run:${context.runId}:output:${context.nodeId}>`;
  return `@prefix fw: <urn:fieldwork:>.\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`
    +`${entity} a fw:TableRelate;\n`
    +`  fw:matchedOn ${quote(outcome.on)};\n`
    +`  fw:broughtColumn ${quote(outcome.bring)};\n`
    +`  fw:keyComparison ${quote(outcome.normalisation==='fuzzy'?'punctuation-folded':'exact')};\n`
    +`  fw:offeredRowCount "${outcome.offered}"^^xsd:integer;\n`
    +`  fw:relatedRowCount "${outcome.related}"^^xsd:integer;\n`
    +`  fw:droppedRowCount "${outcome.dropped}"^^xsd:integer;\n`
    +`  fw:keptRowCount "${outcome.kept}"^^xsd:integer`
    +outcome.gaps.map(gap=>`;\n  fw:unmatchedKey ${quote(gap.key)}`).join('')
    +(outcome.declared
      ?`;\n  fw:unmatchedDecision ${quote(outcome.declared.decision)}`
        +(outcome.declared.label?`;\n  fw:declaredCategory ${quote(outcome.declared.label)}`:'')
        +(outcome.declared.reason?`;\n  fw:decisionReason ${quote(outcome.declared.reason)}`:'')
      :'')
    +outcome.shares.map(share=>`;\n  fw:retainedShare [ a fw:VariableShare; `
      +`fw:ofVariable ${quote(share.measure)}; `
      +`fw:offeredTotal "${share.all}"^^xsd:decimal; `
      +`fw:relatedTotal "${share.related}"^^xsd:decimal`
      +(share.share===null?'':`; fw:retainedFraction "${share.share.toFixed(6)}"^^xsd:decimal`)
      +' ]').join('')
    +notes.map(note=>`;\n  fw:machinedNote [ a fw:MachinedNote; `
      +`fw:noteSection ${quote(note.section)}; fw:noteText ${quote(note.text)} ]`).join('')
    +'.\n';
}
