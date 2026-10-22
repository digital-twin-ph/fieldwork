/** What a column will and will not tell you, computed from the values themselves.
 *
 *  [Experiment 117](../docs/experiments/117-data-quality.md). The practitioner, 2026-10-16:
 *  *"increase awareness of data shapes, including outliers, frequency analysis, etc."*
 *
 *  Everything a ruleset concludes rests on values being what they were declared to be, and until
 *  now this application found out at the last possible moment -- the rules ran, a quarter of the
 *  records came back Unrecorded, and the step said how many afterwards. A profile is the same
 *  facts, available before anything is concluded from them.
 *
 *  Nothing here is a finding. A count beyond an IQR fence is a prompt to look at seven values;
 *  whether any of them is an outlier is a judgement about the thing measured, which this cannot
 *  make and does not claim to.
 */
export type ColumnKind='number'|'boolean'|'term';

export interface ColumnProfile {
  column:string;
  /** The kind a binding declares for this column, when one does. Absent when nothing has. */
  declared?:ColumnKind;
  total:number;
  /** No value at all. Kept as the sum of the two below, because every reader of this number means
   *  "how much of this column is unusable". */
  absent:number;
  /** The record does not have the field. For OSM that is the common case: a tag nobody added. */
  missing:number;
  /** The record HAS the field and it is null or empty. Somebody wrote the column and left it
   *  blank, which is a different finding and a different fix -- and the two were one number until
   *  2026-10-21, when the practitioner asked of a table cell: *"was the data missing or field
   *  empty value?"* The answer could not be given, because nothing had kept them apart. */
  empty:number;
  /** A value is present and is not the declared kind. Separated from `absent` because they are
   *  different problems with different remedies -- and the rules cannot tell them apart. */
  mismatched:number;
  /** Up to three of the mismatched values, as they appear, so a reader recognises the column. */
  examples:string[];
  /** How many of the mismatched values would survive a cast to the declared kind. */
  repairable:number;
  /** Present when enough values read as numbers to say anything about their shape. */
  numeric?:{min:number;median:number;max:number;
    /** Quartiles and the 1.5x fence they imply. Rank-based, so a skewed column does not make
     *  the fence meaningless, and no normality is assumed or claimed. */
    q1:number;q3:number;lowerFence:number;upperFence:number;beyondFence:number};
  /** Present for a column that reads as categories: what is in it, and how often. */
  frequencies?:{value:string;count:number}[];
  distinct?:number;
}

const isAbsent=(v:unknown)=>v===undefined||v===null||v==='';
/** Numeric text is text. `Number('')` is 0 and `Number(' ')` is 0, which is why this is explicit
 *  rather than a bare `Number(v)`. */
const asNumber=(v:unknown):number|undefined=>{
  if(typeof v==='number')return Number.isFinite(v)?v:undefined;
  if(typeof v!=='string'||!v.trim())return undefined;
  const n=Number(v.trim());
  return Number.isFinite(n)?n:undefined;
};
const asBoolean=(v:unknown):boolean|undefined=>{
  if(typeof v==='boolean')return v;
  if(typeof v!=='string')return undefined;
  const t=v.trim().toLowerCase();
  return t==='true'?true:t==='false'?false:undefined;
};

/** The value at a rank, interpolating between neighbours, over a sorted list. */
const quantile=(sorted:number[],p:number)=>{
  if(!sorted.length)return NaN;
  const at=(sorted.length-1)*p, low=Math.floor(at), high=Math.ceil(at);
  return low===high?sorted[low]:sorted[low]+(sorted[high]-sorted[low])*(at-low);
};

const FREQUENCY_SHOWN=5;
const EXAMPLES_SHOWN=3;

export function profileColumn(column:string,values:unknown[],declared?:ColumnKind):ColumnProfile{
  const total=values.length;
  const present=values.filter(v=>!isAbsent(v));
  const absent=total-present.length;
  const missing=values.filter(v=>v===undefined).length;
  const empty=absent-missing;

  // What does not match the declared kind. With nothing declared, nothing mismatches: a column
  // nobody has bound is not wrong, it is undeclared.
  const matches=(v:unknown)=>declared===undefined?true
    :declared==='number'?typeof v==='number'&&Number.isFinite(v)
    :declared==='boolean'?typeof v==='boolean'
    :true;
  const mismatchedValues=present.filter(v=>!matches(v));
  const repairable=mismatchedValues.filter(v=>
    declared==='number'?asNumber(v)!==undefined
    :declared==='boolean'?asBoolean(v)!==undefined:false).length;

  const profile:ColumnProfile={column,declared,total,absent,missing,empty,
    mismatched:mismatchedValues.length,
    examples:[...new Set(mismatchedValues.map(v=>String(v)))].slice(0,EXAMPLES_SHOWN),
    repairable};

  // The shape of the numbers, read from whatever reads as a number -- including numeric text,
  // because a reader asking "what is in this column" is not asking about its JavaScript type.
  const numbers=present.map(asNumber).filter((n):n is number=>n!==undefined).sort((a,b)=>a-b);
  if(numbers.length>=4){
    const q1=quantile(numbers,0.25),q3=quantile(numbers,0.75),iqr=q3-q1;
    const lowerFence=q1-1.5*iqr,upperFence=q3+1.5*iqr;
    profile.numeric={min:numbers[0],max:numbers[numbers.length-1],
      median:quantile(numbers,0.5),q1,q3,lowerFence,upperFence,
      beyondFence:numbers.filter(n=>n<lowerFence||n>upperFence).length};
  }

  // And what is in it, for a column that is not numbers. A count of distinct values is the first
  // thing that says whether a column is a category at all.
  if(!profile.numeric||declared==='term'){
    const counts=new Map<string,number>();
    for(const v of present)counts.set(String(v),(counts.get(String(v))??0)+1);
    profile.distinct=counts.size;
    profile.frequencies=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,FREQUENCY_SHOWN)
      .map(([value,count])=>({value,count}));
  }
  return profile;
}

/** Cast the values of one column to a declared kind, reporting what it could not read.
 *
 *  Never automatic. The unit check set this application's precedent -- refuse rather than
 *  convert -- and a cast that silently turned `"3"` into `3` is the same act as silently
 *  converting minutes to hours. This runs when a practitioner asks for it, counts both sides,
 *  and names what it left alone. */
export interface RepairOutcome {cast:number; unreadable:string[]}
export function castColumn(values:unknown[],to:ColumnKind):{values:unknown[];outcome:RepairOutcome}{
  const unreadable:string[]=[];
  let cast=0;
  const next=values.map(value=>{
    if(isAbsent(value))return value;
    if(to==='number'){
      if(typeof value==='number')return value;
      const n=asNumber(value);
      if(n===undefined){unreadable.push(String(value));return value;}
      cast++;return n;
    }
    if(to==='boolean'){
      if(typeof value==='boolean')return value;
      const b=asBoolean(value);
      if(b===undefined){unreadable.push(String(value));return value;}
      cast++;return b;
    }
    if(typeof value==='string')return value;
    cast++;return String(value);
  });
  return {values:next,outcome:{cast,unreadable:[...new Set(unreadable)]}};
}

/** Apply declared repairs to a copy of some records, leaving the originals untouched.
 *
 *  The practitioner, 2026-10-16: *"A processing stage problem can be mitigated by keeping the
 *  original file not overwriting it. Like pandas or geopandas, there is always an option to use
 *  a copy, not the original."*
 *
 *  Exactly, and the first version of the repair did the opposite: it rewrote the input node's
 *  stored properties, so the `"3"` the file held was gone from the saved workflow and only a
 *  count in the receipt said it had ever existed. Undo recovered it; nothing else did.
 *
 *  A repair is a DECLARATION now -- which column, read as what -- and it is applied here, to a
 *  copy, at the moment the records are handed on. What the node holds stays byte for byte what
 *  was imported, so the declaration can be removed and the original is simply there again. */
export function applyRepairs<T extends {properties?:Record<string,unknown>}>(
  features:readonly T[],repairs:readonly {column:string;to:ColumnKind}[],
):T[]{
  if(!repairs.length)return features as T[];
  let working=features.map(feature=>({...feature,properties:{...feature.properties}}));
  for(const repair of repairs){
    const {values}=castColumn(working.map(f=>f.properties[repair.column]),repair.to);
    working=working.map((feature,index)=>{
      if(values[index]===undefined&&!(repair.column in feature.properties))return feature;
      return {...feature,properties:{...feature.properties,[repair.column]:values[index]}};
    });
  }
  return working as T[];
}

/** Where a column's values are missing or unreadable, record by record, in file order.
 *
 *  A count of absences is not a description of them. [117](../docs/experiments/117-data-quality.md)
 *  recorded that gap plainly: *"Counting absences per column is not a description of their
 *  pattern. Whether they cluster in a period, a region or a source is the question, and nothing
 *  here answers it."* A per-record mark is the smallest thing that can answer it, because
 *  clustering is visible and a total is not.
 *
 *  **In file order**, which is the only order available here and may carry meaning or none. A
 *  file sorted by date makes a run of absences a period; a file in arbitrary order makes the same
 *  run a coincidence. The drawing says so rather than implying the order is time. */
export type CellState='ok'|'absent'|'empty'|'mismatched';
export function columnStates(values:unknown[],declared?:ColumnKind):CellState[]{
  return values.map(value=>{
    if(value===undefined)return 'absent';
    if(isAbsent(value))return 'empty';
    if(declared===undefined)return 'ok';
    if(declared==='number')return typeof value==='number'&&Number.isFinite(value)?'ok':'mismatched';
    if(declared==='boolean')return typeof value==='boolean'?'ok':'mismatched';
    return 'ok';
  });
}

/** Counts over equal-width bins, for drawing a distribution.
 *
 *  Equal width rather than equal count: a histogram of equal-count bins is a quantile plot
 *  wearing a histogram's clothes, and the thing a reader is looking for here -- a gap, a spike,
 *  a second mode -- is a property of the values' spacing. */
export function histogram(values:unknown[],bins=12):{from:number;to:number;count:number}[]{
  const numbers=values.map(asNumber).filter((n):n is number=>n!==undefined);
  if(numbers.length<2)return [];
  // Folded rather than spread: a column of a hundred thousand values is an argument list of a
  // hundred thousand, and the stack gives out before the histogram does.
  let min=Infinity,max=-Infinity;
  for(const value of numbers){if(value<min)min=value;if(value>max)max=value;}
  if(min===max)return [{from:min,to:max,count:numbers.length}];
  const width=(max-min)/bins;
  const counts=new Array(bins).fill(0);
  for(const n of numbers){
    const at=Math.min(bins-1,Math.floor((n-min)/width));
    counts[at]++;
  }
  return counts.map((count,i)=>({from:min+i*width,to:min+(i+1)*width,count}));
}

/** Whether two columns tend to be unreadable in the SAME records.
 *
 *  missingno calls this nullity correlation. [117](../docs/experiments/117-data-quality.md) first
 *  declined to draw it and the practitioner corrected the shape of that refusal: a refusal to
 *  visualise should be **conditional** — stated against what the data can support, and withdrawn
 *  when the data supports it — rather than a standing no. So it is computed, and the caller shows
 *  it exactly when there is a pair to show.
 *
 *  The precondition is arithmetic, not taste. The coefficient is taken between two vectors of
 *  readable/not-readable, one value per record. A column that is wholly readable, or wholly
 *  unreadable, has no variance, so the correlation with it is undefined by division rather than
 *  equal to zero — which is why `pairs` can be empty while columns remain.
 *
 *  What it measures is **readability**, not the values. A pair at 0.9 tends to fail together,
 *  which is a fact about collection or about a broken export, and says nothing about whether the
 *  things measured are related. The drawing has to say so, because it looks exactly like the
 *  correlation matrix of the data that every reader has seen before. */
export interface NullityPair {a:string; b:string; phi:number; together:number}
export function nullityPairs(
  columns:{column:string;states:CellState[]}[],
):{pairs:NullityPair[]; constant:string[]}{
  const varying=columns.filter(c=>c.states.some(s=>s==='ok')&&c.states.some(s=>s!=='ok'));
  const constant=columns.filter(c=>!varying.includes(c)).map(c=>c.column);
  const pairs:NullityPair[]=[];
  for(let i=0;i<varying.length;i++)
    for(let j=i+1;j<varying.length;j++){
      // The phi coefficient: Pearson over two binary vectors, which is what this is.
      // Annotated: inferred as (0|1)[] the reduce overloads demand a 0|1 accumulator.
      const x:number[]=varying[i].states.map(s=>s==='ok'?0:1);
      const y:number[]=varying[j].states.map(s=>s==='ok'?0:1);
      const n=x.length;
      const sx=x.reduce((a,b)=>a+b,0),sy=y.reduce((a,b)=>a+b,0);
      const sxy=x.reduce((a,b,k)=>a+b*y[k],0);
      const numerator=n*sxy-sx*sy;
      const denominator=Math.sqrt(sx*(n-sx))*Math.sqrt(sy*(n-sy));
      if(!denominator)continue;
      pairs.push({a:varying[i].column,b:varying[j].column,
        phi:numerator/denominator,
        together:x.reduce((a,b,k)=>a+(b&&y[k]?1:0),0)});
    }
  return {pairs,constant};
}
