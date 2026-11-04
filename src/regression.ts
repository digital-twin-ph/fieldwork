/** LOGISTIC AND POISSON REGRESSION over a table's rows, fitted by the kernel. Experiment 167.
 *
 *  The practitioner, 2026-11-03: *"So do we need a regression widget?"*, then *"Let's just write our own regression for
 *  the kernel."*, and 2026-11-04: *"Why don't we develop the regression widget"*. The kernel fits; this builds the
 *  design matrix the way R's model.matrix does for the terms used, so a model written here and the same model in R
 *  have the same columns: an intercept, treatment-coded indicators for a categorical variable (reference first), and
 *  `bs(x, df, degree = 3)` for a spline, with knots where R puts them.
 *
 *  WHAT IS NOT DONE FOR THE PRACTITIONER. Variables are not chosen, interactions are not added, and a model that did
 *  not converge reports no estimate. A row missing any variable the model uses is left out and counted, as R's
 *  complete-case default does, and the count is part of the result. */
import {kernel} from './kernel.js';

export type Family='logistic'|'poisson';
export type TermKind='numeric'|'categorical'|'spline';
export interface Term {column:string; as:TermKind; reference?:string; df?:number}
export interface RegressionSpec {
  family:Family;
  outcome:string;
  /** Logistic: which values of the outcome column are cases and which are controls; other values are left out. */
  cases?:string[]; controls?:string[];
  exposure:Term;
  adjust?:Term[];
  /** Poisson: fixed effects for this column's values, absorbed rather than added as columns. */
  strata?:string;
  /** Poisson: a column holding the log of person-time or population. */
  offset?:string;
  /** Standard errors: from the model, scaled by the Pearson dispersion, or HAC (Newey-West) with this many lags. */
  errors?:{kind:'model'}|{kind:'overdispersed'}|{kind:'hac'; lag:number}|{kind:'profile'};
  level?:number;
}
export type Row=Record<string,string|number|null|undefined>;

export interface Estimate {term:string; column:string; level?:string; ratio:number; lower:number; upper:number;
  coefficient:number; se:number; p:number}
export interface RegressionResult {
  family:Family; measure:'odds ratio'|'rate ratio';
  estimates:Estimate[];
  /** Columns adjusted for, as the model states them: an adjusted ratio names what it is adjusted for. */
  adjustedFor:string[];
  rows:{used:number; leftOut:number; reasons:Record<string,number>};
  strata?:{used:number; dropped:number};
  iterations:number; loglik:number; dispersion:number; residualDf:number;
  errors:string; level:number;
  /** The columns of the design matrix, in R's naming, so the model can be compared with R's. */
  columns:string[];
}

const Z:Record<number,number>={90:1.6448536269514722,95:1.959963984540054,99:2.5758293035489004};
const KERNEL_ERRORS:Record<number,string>={
  [-1]:'The model has more columns than rows, or none.',
  [-2]:'An outcome value cannot be modelled: logistic outcomes must be case or control, Poisson outcomes counts.',
  [-3]:'Two or more columns of the model carry the same information (collinear), or a category never occurs.',
  [-4]:'The fit did not converge, so no estimate is reported.',
  [-5]:'Strata are absorbed for Poisson models only.',
  [-6]:'No stratum has any outcome, so the data carry no information.'};

/** R's quantile type 7, which `bs()` places its knots by. */
export function quantile7(sorted:number[],q:number):number{
  const h=(sorted.length-1)*q,lo=Math.floor(h),hi=Math.ceil(h);
  return sorted[lo]!+(h-lo)*(sorted[hi]!-sorted[lo]!);
}
/** R's `splines::bs(x, df, degree = 3, intercept = FALSE)`: knots at the quantiles of x, boundary at its range. */
export function bsBasis(x:number[],df:number,degree=3):{knots:number[];boundary:[number,number];basis:(v:number)=>number[]}{
  const interior=df-degree;
  if(interior<0)throw new Error(`A cubic spline needs at least ${degree} degrees of freedom.`);
  const sorted=[...x].sort((a,b)=>a-b);
  const knots=Array.from({length:interior},(_,i)=>quantile7(sorted,(i+1)/(interior+1)));
  const boundary:[number,number]=[sorted[0]!,sorted.at(-1)!];
  const t=[...Array(degree+1).fill(boundary[0]),...knots,...Array(degree+1).fill(boundary[1])];
  const count=t.length-degree-1;
  const basis=(v:number)=>{
    // Cox-de Boor, with the last interval closed so the upper boundary belongs to the last basis function.
    let b:number[]=Array.from({length:t.length-1},(_,i)=>(v>=t[i]!&&v<t[i+1]!)||(v===boundary[1]&&t[i]!<t[i+1]!&&t[i+1]===boundary[1])?1:0);
    for(let k=1;k<=degree;k++){
      const next:number[]=[];
      for(let i=0;i<t.length-1-k;i++){
        const left=t[i+k]!-t[i]!,right=t[i+k+1]!-t[i+1]!;
        next.push((left>0?(v-t[i]!)/left*b[i]!:0)+(right>0?(t[i+k+1]!-v)/right*b[i+1]!:0));
      }
      b=next;
    }
    return b.slice(1,count);
  };
  return {knots,boundary,basis};
}

const asNumber=(v:Row[string])=>v===null||v===undefined||v===''?NaN:typeof v==='number'?v:Number(String(v).trim());
const asText=(v:Row[string])=>v===null||v===undefined?'':String(v).trim();

export function fitRegression(input:Row[],spec:RegressionSpec):RegressionResult{
  const level=spec.level??95,z=Z[level];
  if(z===undefined)throw new Error(`${level}% is not an interval level this computes.`);
  const terms=[spec.exposure,...(spec.adjust??[])];
  const seen=new Set<string>();
  for(const term of terms){if(seen.has(term.column))throw new Error(`"${term.column}" is in the model twice.`);seen.add(term.column);}
  if(seen.has(spec.outcome))throw new Error(`"${spec.outcome}" cannot be both the outcome and a variable.`);
  if(spec.family==='logistic'&&(spec.strata||spec.offset))throw new Error('Strata and an offset are for Poisson models.');
  if(spec.family==='logistic'&&!(spec.cases?.length&&spec.controls?.length))
    throw new Error('Say which outcome values are cases and which are controls.');

  // COMPLETE CASES, counted by reason.
  const reasons:Record<string,number>={};
  const leave=(why:string)=>{reasons[why]=(reasons[why]??0)+1;};
  const used:Row[]=[];const outcome:number[]=[];
  for(const row of input){
    let y:number;
    if(spec.family==='logistic'){
      const v=asText(row[spec.outcome]);
      if(spec.cases!.includes(v))y=1;else if(spec.controls!.includes(v))y=0;else{leave(`${spec.outcome} neither case nor control`);continue;}
    }else{
      y=asNumber(row[spec.outcome]);
      if(!Number.isFinite(y)||y<0){leave(`${spec.outcome} missing or not a count`);continue;}
    }
    const missing=terms.find(term=>term.as==='categorical'?asText(row[term.column])===''||asText(row[term.column]).toUpperCase()==='NA'
      :!Number.isFinite(asNumber(row[term.column])));
    if(missing){leave(`${missing.column} missing`);continue;}
    if(spec.strata&&asText(row[spec.strata])===''){leave(`${spec.strata} missing`);continue;}
    if(spec.offset&&!Number.isFinite(asNumber(row[spec.offset]))){leave(`${spec.offset} missing`);continue;}
    used.push(row);outcome.push(y);
  }
  if(!used.length)throw new Error('No row has every variable the model uses.');

  // COLUMNS, named as R names them.
  const columns:string[]=spec.strata?[]:['(Intercept)'];
  const makers:((row:Row)=>number[])[]=[];
  const owner:{column:string;level?:string;report:boolean}[]=spec.strata?[]:[{column:'(Intercept)',report:false}];
  for(const [index,term] of terms.entries()){
    const report=index===0||term.as!=='spline';
    if(term.as==='numeric'){
      columns.push(term.column);owner.push({column:term.column,report});
      makers.push(row=>[asNumber(row[term.column])]);
    }else if(term.as==='categorical'){
      const levels=[...new Set(used.map(row=>asText(row[term.column])))].sort(collate);
      const reference=term.reference??levels[0]!;
      if(!levels.includes(reference))throw new Error(`"${reference}" is not a value of ${term.column}.`);
      const others=levels.filter(l=>l!==reference);
      if(!others.length)throw new Error(`${term.column} has one value only among the rows used, so it explains nothing.`);
      for(const l of others){columns.push(`${term.column}${l}`);owner.push({column:term.column,level:l,report});}
      makers.push(row=>others.map(l=>asText(row[term.column])===l?1:0));
    }else{
      const df=term.df??4;
      const {basis}=bsBasis(used.map(row=>asNumber(row[term.column])),df);
      for(let k=1;k<=df;k++){columns.push(`bs(${term.column}, df = ${df})${k}`);owner.push({column:term.column,level:`spline ${k}`,report:false});}
      makers.push(row=>basis(asNumber(row[term.column])));
    }
  }
  if(columns.length>32)throw new Error(`The model has ${columns.length} columns; the kernel fits at most 32.`);
  // THE DESIGN, built once: a refit for a profile interval reloads it without one column.
  const strataIndex=new Map<string,number>();
  const design=used.map(row=>[...(spec.strata?[]:[1]),...makers.flatMap(make=>make(row))]);
  const offsets=used.map(row=>spec.offset?asNumber(row[spec.offset]):0);
  const strata=used.map(row=>{if(!spec.strata)return 0xFFFFFFFF;const key=asText(row[spec.strata]);
    if(!strataIndex.has(key))strataIndex.set(key,strataIndex.size);return strataIndex.get(key)!;});
  /** Loads the design, optionally with column `held` removed and its coefficient fixed at `at`, and fits it. */
  const fit=(held?:number,at=0):number=>{
    const width=columns.length-(held===undefined?0:1);
    if(!kernel.glm_reset(used.length,width))throw new Error(`The kernel fits at most 20,000 rows; this has ${used.length.toLocaleString('en')}.`);
    design.forEach((values,i)=>{
      let c=0;
      values.forEach((v,j)=>{if(j!==held)kernel.glm_set_x(i,c++,v);});
      kernel.glm_set_row(i,outcome[i]!,offsets[i]!+(held===undefined?0:at*values[held]!),strata[i]!);
    });
    return kernel.glm_fit(spec.family==='logistic'?0:1,spec.strata?1:0,100,1e-10);
  };
  const status=fit();
  if(status!==0)throw new Error(KERNEL_ERRORS[status]??`The kernel refused the model (${status}).`);

  const parameters=columns.length+(spec.strata?kernel.glm_used_strata():0);
  const residualDf=kernel.glm_used_rows()-parameters;
  const dispersion=residualDf>0?kernel.glm_pearson()/residualDf:NaN;
  const errors=spec.errors??{kind:'model'};
  const variance=(j:number)=>errors.kind==='hac'?kernel.glm_hac_covariance(j,j,errors.lag,spec.strata?1:0)
    :errors.kind==='overdispersed'?kernel.glm_covariance(j,j)*Math.max(1,dispersion):kernel.glm_covariance(j,j);
  const estimates:Estimate[]=[];
  owner.forEach((o,j)=>{
    if(!o.report)return;
    const coefficient=kernel.glm_coefficient(j),se=Math.sqrt(variance(j));
    estimates.push({term:columns[j]!,column:o.column,...(o.level?{level:o.level}:{}),
      ratio:Math.exp(coefficient),lower:Math.exp(coefficient-z*se),upper:Math.exp(coefficient+z*se),
      coefficient,se,p:2*normalUpper(Math.abs(coefficient/se))});
  });
  const fitted={used:kernel.glm_used_rows(),strataUsed:kernel.glm_used_strata(),strataDropped:kernel.glm_dropped_strata(),
    iterations:kernel.glm_iterations(),loglik:kernel.glm_loglik()};

  // LIKELIHOOD-RATIO INTERVALS: each limit is where the log-likelihood, refitted with the coefficient held there, has
  // fallen by z^2/2 from its maximum -- R's confint() for a GLM. Asymmetric on the log scale where the data are thin,
  // which is where a Wald interval misleads. Found 2026-11-04: Salmonella's published intervals are of this kind.
  if(errors.kind==='profile'){
    if(columns.length<2)throw new Error('A likelihood-ratio interval needs at least one other column to refit.');
    const target=fitted.loglik-z*z/2;
    const profile=(j:number,at:number)=>{const code=fit(j,at);return code===0?kernel.glm_loglik():-Infinity;};
    for(const e of estimates){
      const j=columns.indexOf(e.term);
      const limit=(direction:1|-1)=>{
        // Bracket by doubling the step from the estimate, then bisect on the coefficient.
        let inner=e.coefficient,step=Math.max(e.se,1e-3),outer=e.coefficient+direction*step;
        for(let k=0;k<60&&profile(j,outer)>target;k++){inner=outer;step*=2;outer=e.coefficient+direction*step;}
        if(!(profile(j,outer)<=target))return direction>0?Infinity:-Infinity;
        for(let k=0;k<80&&Math.abs(outer-inner)>1e-9;k++){
          const mid=(inner+outer)/2;
          if(profile(j,mid)>target)inner=mid;else outer=mid;
        }
        return (inner+outer)/2;
      };
      e.lower=Math.exp(limit(-1));e.upper=Math.exp(limit(1));
    }
  }
  return {family:spec.family,measure:spec.family==='logistic'?'odds ratio':'rate ratio',estimates,
    adjustedFor:(spec.adjust??[]).map(t=>t.column).concat(spec.strata?[`${spec.strata} (strata)`]:[]),
    rows:{used:used.length,leftOut:input.length-used.length,reasons},
    ...(spec.strata?{strata:{used:fitted.strataUsed,dropped:fitted.strataDropped}}:{}),
    iterations:fitted.iterations,loglik:fitted.loglik,dispersion,residualDf,
    errors:errors.kind==='hac'?`HAC (Newey-West, Bartlett, ${errors.lag} lags)`:errors.kind==='overdispersed'
      ?`model-based, scaled by the Pearson dispersion (${dispersion.toFixed(3)})`
      :errors.kind==='profile'?'likelihood-ratio (profile)':'model-based (Wald)',
    level,columns};
}

/** Categories in R's order for a character variable: sorted, numbers as text. */
const collate=(a:string,b:string)=>a<b?-1:a>b?1:0;

/** Upper tail of the standard normal, through the complementary error function. */
function normalUpper(x:number):number{
  // erfc by Numerical Recipes' Chebyshev fit, relative error below 1.2e-7.
  const t=1/(1+0.5*x/Math.SQRT2);
  const y=t*Math.exp(-(x*x/2)-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807
    +t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
  return y/2;
}

/** The widget's parameters as a fit specification. */
export interface RegressionParams {family:Family;outcome:string;cases?:string[];controls?:string[];exposure:Term;adjust:Term[];
  strata?:string;offset?:string;errors:'wald'|'profile'|'overdispersed'|'hac';hacLag?:number;order?:string;level?:number}
export function specFrom(params:RegressionParams):RegressionSpec{
  if(!params.outcome?.trim())throw new Error('Choose the outcome column.');
  if(!params.exposure?.column?.trim())throw new Error('Choose the exposure column.');
  return {family:params.family,outcome:params.outcome,...(params.cases?{cases:params.cases}:{}),...(params.controls?{controls:params.controls}:{}),
    exposure:params.exposure,adjust:params.adjust??[],...(params.strata?{strata:params.strata}:{}),...(params.offset?{offset:params.offset}:{}),
    errors:params.errors==='hac'?{kind:'hac',lag:params.hacLag??0}:params.errors==='profile'?{kind:'profile'}
      :params.errors==='overdispersed'?{kind:'overdispersed'}:{kind:'model'},
    level:params.level??95};
}

/** A table's rows as records: each key column and the value field, by name. */
export function rowsOf(table:{keys:string[];valueField:string;rows:{key:Record<string,string>;value:number|null}[]},order?:string):Row[]{
  const rows=table.rows.map(row=>({...row.key,[table.valueField]:row.value}) as Row);
  if(order)rows.sort((a,b)=>{const x=String(a[order]??''),y=String(b[order]??'');return x<y?-1:x>y?1:0;});
  return rows;
}

/** THE RESULT AS A TABLE: one row per term and statistic, so Table output draws a term per row. */
export function regressionTable(result:RegressionResult,columns?:Record<string,{label?:string;unit?:string;description?:string;confirmed:boolean}>){
  // EACH TERM'S MEANING, from the column it comes from, where that column has an accepted description (experiment 172).
  const meaningOf=(column:string)=>{const m=columns?.[column];if(!m?.confirmed)return '';
    const text=m.label?.trim()||m.description?.trim()||'';return text?`${text}${m.unit?.trim()?` (${m.unit.trim()})`:''}`:'';};
  const meanings=Object.fromEntries(result.estimates.map(e=>[e.term,meaningOf(e.column)+(e.level&&meaningOf(e.column)?`: ${e.level}`:'')]).filter(([,m])=>m));
  const name=result.measure;
  const statistics:[string,(e:Estimate)=>number][]=[[name,e=>e.ratio],[`lower ${result.level}%`,e=>e.lower],
    [`upper ${result.level}%`,e=>e.upper],['p',e=>e.p]];
  const rows=result.estimates.flatMap(e=>statistics.map(([statistic,read])=>({key:{term:e.term,statistic},value:read(e)})));
  return {kind:'data-table' as const,keys:['term','statistic'],valueField:'value',rows,rowCount:rows.length,missingValueCount:0,
    ...(Object.keys(meanings).length?{meanings}:{})};
}

/** What was fitted, in a sentence a reader can check against the paper they are reproducing. */
export function regressionSentence(result:RegressionResult,params:RegressionParams):string{
  const e=result.estimates[0]!;
  const round=(v:number)=>v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(3);
  const model=params.family==='logistic'?'Logistic regression':'Poisson regression';
  const adjusted=result.adjustedFor.length?`, adjusted for ${result.adjustedFor.join(', ')}`:', unadjusted';
  // WHY EACH ROW WAS LEFT OUT, as counted: a control group not chosen is not a missing value.
  const reasons=Object.entries(result.rows.reasons).map(([why,n])=>`${n.toLocaleString('en')} ${why}`).join('; ');
  const left=result.rows.leftOut?` ${result.rows.leftOut.toLocaleString('en')} row${result.rows.leftOut===1?'':'s'} left out: ${reasons}.`:'';
  const strata=result.strata?` ${result.strata.used.toLocaleString('en')} strata${result.strata.dropped?`, ${result.strata.dropped} without events dropped`:''}.`:'';
  return `${model} of ${params.outcome} on ${params.exposure.column}${adjusted}: ${result.measure} ${round(e.ratio)} `
    +`(${result.level}% ${round(e.lower)} to ${round(e.upper)}) for ${e.term}, ${result.errors} intervals, `
    +`${result.rows.used.toLocaleString('en')} rows.${strata}${left}`;
}
