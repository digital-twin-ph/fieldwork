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
export interface Term {column:string; as:TermKind; reference?:string; df?:number;
  /** One column per model when this adjustment follows the shift (experiment 185); see `modelParams`. */
  perModel?:string[]}
export interface RegressionSpec {
  family:Family;
  outcome:string;
  /** Logistic: which values of the outcome column are cases and which are controls; other values are left out. */
  cases?:string[]; controls?:string[];
  exposure:Term;
  adjust?:Term[];
  /** Poisson: fixed effects for each combination of these columns' values, absorbed rather than added as columns.
   *  One column, or several: municipality, year and month together compare weeks within each (experiment 182). */
  strata?:string|string[];
  /** Poisson: a column holding the log of person-time or population. */
  offset?:string;
  /** Standard errors: from the model, scaled by the Pearson dispersion, or HAC (Newey-West) with this many lags. */
  errors?:{kind:'model'}|{kind:'overdispersed'}|{kind:'hac'; lag:number}|{kind:'profile'};
  level?:number;
}
export type Row=Record<string,string|number|null|undefined>;
/** The strata columns as a list: none, one, or several, as saved. */
export const strataOf=(strata:string|string[]|undefined):string[]=>
  (Array.isArray(strata)?strata:strata?[strata]:[]).map(c=>c.trim()).filter(Boolean);

export interface Estimate {term:string; column:string; level?:string; ratio:number; lower:number; upper:number;
  coefficient:number; se:number; p:number}
export interface RegressionResult {
  /** 'odds ratio' or 'rate ratio' as fitted; renamed by a declared design (a cross-sectional design's prevalence odds
   *  ratio), which is the name every display and the receipt then carry. */
  family:Family; measure:string;
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
  const strataColumns=strataOf(spec.strata);
  if(spec.family==='logistic'&&(strataColumns.length||spec.offset))throw new Error('Strata and an offset are for Poisson models.');
  for(const c of strataColumns){if(seen.has(c))throw new Error(`"${c}" is both a variable and a strata column.`);
    if(c===spec.outcome)throw new Error(`"${c}" cannot be both the outcome and a strata column.`);}
  if(new Set(strataColumns).size!==strataColumns.length)throw new Error('A strata column is named twice.');
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
    const noStratum=strataColumns.find(c=>asText(row[c])==='');
    if(noStratum){leave(`${noStratum} missing`);continue;}
    if(spec.offset&&!Number.isFinite(asNumber(row[spec.offset]))){leave(`${spec.offset} missing`);continue;}
    used.push(row);outcome.push(y);
  }
  if(!used.length)throw new Error('No row has every variable the model uses.');

  // COLUMNS, named as R names them.
  const columns:string[]=strataColumns.length?[]:['(Intercept)'];
  const makers:((row:Row)=>number[])[]=[];
  const owner:{column:string;level?:string;report:boolean}[]=strataColumns.length?[]:[{column:'(Intercept)',report:false}];
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
  const design=used.map(row=>[...(strataColumns.length?[]:[1]),...makers.flatMap(make=>make(row))]);
  const offsets=used.map(row=>spec.offset?asNumber(row[spec.offset]):0);
  const strata=used.map(row=>{if(!strataColumns.length)return 0xFFFFFFFF;const key=strataColumns.map(c=>asText(row[c])).join('\u001f');
    if(!strataIndex.has(key))strataIndex.set(key,strataIndex.size);return strataIndex.get(key)!;});
  /** Loads the design, optionally with column `held` removed and its coefficient fixed at `at`, and fits it. */
  const fit=(held?:number,at=0):number=>{
    const width=columns.length-(held===undefined?0:1);
    if(!kernel.glm_reset(used.length,width))throw new Error(`The kernel fits at most 250,000 rows; this has ${used.length.toLocaleString('en')}.`);
    design.forEach((values,i)=>{
      let c=0;
      values.forEach((v,j)=>{if(j!==held)kernel.glm_set_x(i,c++,v);});
      kernel.glm_set_row(i,outcome[i]!,offsets[i]!+(held===undefined?0:at*values[held]!),strata[i]!);
    });
    return kernel.glm_fit(spec.family==='logistic'?0:1,strataColumns.length?1:0,100,1e-10);
  };
  const status=fit();
  if(status!==0)throw new Error(KERNEL_ERRORS[status]??`The kernel refused the model (${status}).`);

  const parameters=columns.length+(strataColumns.length?kernel.glm_used_strata():0);
  const residualDf=kernel.glm_used_rows()-parameters;
  const dispersion=residualDf>0?kernel.glm_pearson()/residualDf:NaN;
  const errors=spec.errors??{kind:'model'};
  const variance=(j:number)=>errors.kind==='hac'?kernel.glm_hac_covariance(j,j,errors.lag,strataColumns.length?1:0)
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
    adjustedFor:(spec.adjust??[]).map(t=>t.column).concat(strataColumns.length?[`${strataColumns.join(' × ')} (strata)`]:[]),
    rows:{used:used.length,leftOut:input.length-used.length,reasons},
    ...(strataColumns.length?{strata:{used:fitted.strataUsed,dropped:fitted.strataDropped}}:{}),
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
export interface RegressionParams {family:Family;outcome:string;cases?:string[];controls?:string[];exposure:Term;
  exposureColumns?:string[];adjust:Term[];
  strata?:string|string[];offset?:string;errors:'wald'|'profile'|'overdispersed'|'hac';hacLag?:number;order?:string;level?:number}
export function specFrom(params:RegressionParams):RegressionSpec{
  if(!params.outcome?.trim())throw new Error('Choose the outcome column.');
  if(!params.exposure?.column?.trim())throw new Error('Choose the exposure column.');
  return {family:params.family,outcome:params.outcome,...(params.cases?{cases:params.cases}:{}),...(params.controls?{controls:params.controls}:{}),
    exposure:params.exposure,adjust:params.adjust??[],...(strataOf(params.strata).length?{strata:strataOf(params.strata)}:{}),...(params.offset?{offset:params.offset}:{}),
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
    // THE INTERVAL, DECLARED: which statistic is the estimate and which are its limits (experiment 181).
    interval:{column:'statistic',estimate:name,lower:`lower ${result.level}%`,upper:`upper ${result.level}%`,
      level:result.level,ratio:true},
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

/** THE FIT AS RDF, so the N3 & evidence view shows a regression the way it shows a two-by-two. Experiment 176.
 *  `fw:RegressionModel` states what was fitted and how; each coefficient is an `fw:EpiEstimate` that names its term,
 *  its interval method and its level. `ontology/shapes/quality-and-design.ttl` holds the receipt to that. */
/** One fitted model as RDF statements about `entity`: the model's lines, then one estimate per term. */
function modelFacts(entity:string,result:RegressionResult,params:RegressionParams,runId:string,sourceNodeId:string,
  designDeclared:boolean):{lines:string[];estimates:string}{
  const quote=(v:string)=>JSON.stringify(v);
  // xsd:double's own spellings for an unbounded profile interval; JavaScript's "Infinity" is not one.
  const num=(v:number)=>`"${v===Infinity?'INF':v===-Infinity?'-INF':Number.isNaN(v)?'NaN':v}"^^xsd:double`;
  const int=(v:number)=>`"${v}"^^xsd:integer`;
  const term=(t:Term)=>`[ fw:termAttribute ${quote(t.column)}; fw:termEntry ${quote(t.as)}`
    +(t.reference?`; fw:termReference ${quote(t.reference)}`:'')+(t.df?`; fw:termDegreesOfFreedom ${int(t.df)}`:'')+' ]';
  const lines=[
    `${entity} a fw:RegressionModel`,
    `prov:wasDerivedFrom <urn:fieldwork:run:${runId}:output:${sourceNodeId}>`,
    `fw:modelFamily ${quote(result.family)}`,
    `fw:outcomeAttribute ${quote(params.outcome)}`,
    `fw:exposureAttribute ${quote(params.exposure.column)}`,
    `fw:exposureTerm ${term(params.exposure)}`,
    ...(params.adjust??[]).map(t=>`fw:adjustmentTerm ${term(t)}`),
    ...strataOf(params.strata).map(c=>`fw:stratumAttribute ${quote(c)}`),
    ...(params.offset?.trim()?[`fw:offsetAttribute ${quote(params.offset.trim())}`]:[]),
    `fw:errorMethod ${quote(result.errors)}`,
    `fw:usedRecordCount ${int(result.rows.used)}`,
    `fw:leftOutRecordCount ${int(result.rows.leftOut)}`,
    ...(result.strata?[`fw:usedStratumCount ${int(result.strata.used)}`,`fw:droppedStratumCount ${int(result.strata.dropped)}`]:[]),
    `fw:iterationCount ${int(result.iterations)}`,
    ...(designDeclared?[]:['fw:noDesignDeclared true']),
  ];
  const estimates=result.estimates.map(e=>`${entity} fw:estimate [ a fw:EpiEstimate; `
    +`fw:estimateName ${quote(result.measure)}; fw:modelTerm ${quote(e.term)}; `
    +`fw:estimateValue ${num(e.ratio)}; fw:intervalLower ${num(e.lower)}; fw:intervalUpper ${num(e.upper)}; `
    +`fw:intervalMethod ${quote(result.errors)}; fw:intervalLevel ${int(result.level)} ].`).join('\n');
  return {lines,estimates};
}
const PREFIXES=`@prefix fw: <urn:fieldwork:>.\n@prefix prov: <http://www.w3.org/ns/prov#>.\n`
  +`@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n`;

export function regressionReceipt(node:{id:string},result:RegressionResult,params:RegressionParams,runId:string,
  sourceNodeId:string,designDeclared:boolean){
  const entity=`<urn:fieldwork:run:${runId}:output:${node.id}>`;
  const {lines,estimates}=modelFacts(entity,result,params,runId,sourceNodeId,designDeclared);
  const facts=PREFIXES+lines.join(';\n  ')+'.\n'+estimates+'\n';
  return {nodeId:node.id,kind:'computation' as const,facts,rules:'',input:facts,conclusions:[],
    method:regressionSentence(result,params),
    estimates:result.estimates,columns:result.columns,rows:result.rows,errors:result.errors,
    iterations:result.iterations,dispersion:result.dispersion,...(result.strata?{strata:result.strata}:{})};
}

/** THE EXPOSURE COLUMNS, ONE MODEL EACH (experiment 185). Two or more listed fit one model per column; one, or none
 *  listed, is the single model this widget has always fitted. */
export const exposureColumnsOf=(params:{exposure:Term;exposureColumns?:string[]}):string[]=>
  (params.exposureColumns?.length??0)>1?params.exposureColumns!.map(c=>c.trim()):[params.exposure.column];

export interface ModelRow {
  column:string;
  /** Null when this column's model could not be fitted; `reason` then says why. */
  result:RegressionResult|null; reason:string|null;
  /** The shift Relate brought this column at, in days, where it recorded one. */
  shiftDays?:number;
}

/** ONE MODEL PER EXPOSURE COLUMN, EACH ON ITS OWN ROWS (experiment 185). Every model is `fitRegression` with the
 *  exposure column swapped and nothing else changed, so each leaves out only the rows its own variables are missing
 *  on: a week with no value at one shift is still in the models of the shifts that have one. Fitting all of them on
 *  the rows common to every column would be a different analysis, and is not done.
 *
 *  ONE COLUMN CANNOT SINK THE OTHERS, as with the two-by-two's several exposures: a model that cannot be fitted is a
 *  row saying why. Only when none can is the step stopped. */
export function fitEachExposure(rows:Row[],params:RegressionParams,shifts?:Record<string,number>,
  measure?:string|null):ModelRow[]{
  const columns=exposureColumnsOf(params);
  const empty=columns.findIndex(c=>!c);
  if(empty>=0)throw new Error(`Exposure column ${empty+1} is not chosen.`);
  const twice=columns.find((c,i)=>columns.indexOf(c)!==i);
  if(twice)throw new Error(`"${twice}" is listed twice as an exposure.`);
  const following=(params.adjust??[]).find(t=>t.perModel&&t.perModel.length!==columns.length);
  if(following)throw new Error(`"${following.column}" follows the shift, so it needs one column for each of the `
    +`${columns.length} models; it has ${following.perModel!.length}.`);
  const models=columns.map((column,k):ModelRow=>{
    const shiftDays=shifts?.[column];
    const at=shiftDays===undefined?{}:{shiftDays};
    try{
      const fitted=fitRegression(rows,specFrom(modelParams(params,k)));
      return {column,result:measure?{...fitted,measure}:fitted,reason:null,...at};
    }catch(error){return {column,result:null,reason:error instanceof Error?error.message:String(error),...at};}
  });
  if(!models.some(m=>m.result))throw new Error(`No exposure column could be fitted: `
    +models.map(m=>`${m.column} (${m.reason})`).join('; '));
  return models;
}

/** MODEL k's OWN SETTINGS: the k-th exposure column, and the k-th column of every adjustment that follows the shift.
 *  Everything else is the same in every model. */
export function modelParams(params:RegressionParams,k:number):RegressionParams{
  const column=exposureColumnsOf(params)[k]!;
  return {...params,exposure:{...params.exposure,column},exposureColumns:[column],
    adjust:(params.adjust??[]).map(({perModel,...t})=>perModel?{...t,column:perModel[k]!}:t)};
}
/** A shift column's name without its shift: `precip_total_semana_-14d` is `precip_total_semana`. */
const unshifted=(column:string)=>column.replace(/_[+-]?\d+d$/,'');

/** THE MODELS AS ONE LONG TABLE: a row per model, term and statistic, with the exposure column as a key, the shift as
 *  a number where Relate recorded one, and whether the term is the model's exposure or something it is adjusted for.
 *  The shape the lag chart reads, so no Append rows is needed to stack the models. */
export function regressionsTable(models:ModelRow[],columns?:Record<string,{label?:string;unit?:string;description?:string;confirmed:boolean}>){
  const first=models.find(m=>m.result)!.result!;
  const name=first.measure,level=first.level;
  const shifted=models.some(m=>m.shiftDays!==undefined);
  const statistics:[string,(e:Estimate)=>number][]=[[name,e=>e.ratio],[`lower ${level}%`,e=>e.lower],
    [`upper ${level}%`,e=>e.upper],['p',e=>e.p]];
  const rows:DataTableRow[]=[];
  for(const m of models){
    const keyOf=(term:string,role:string,statistic:string)=>({exposure:m.column,
      ...(shifted?{shift_days:m.shiftDays===undefined?'':String(m.shiftDays)}:{}),role,term,statistic});
    if(!m.result){for(const [statistic] of statistics)rows.push({key:keyOf(m.column,'exposure',statistic),value:null});continue;}
    for(const e of m.result.estimates)for(const [statistic,read] of statistics)
      rows.push({key:keyOf(e.term,e.column===m.column?'exposure':'adjusted for',statistic),value:read(e)});
  }
  const single=regressionTable(first,columns);
  const meanings=Object.assign({},...models.filter(m=>m.result).map(m=>(regressionTable(m.result!,columns) as {meanings?:Record<string,string>}).meanings??{}));
  return {kind:'data-table' as const,keys:['exposure',...(shifted?['shift_days']:[]),'role','term','statistic'],
    valueField:'value',rows,rowCount:rows.length,missingValueCount:rows.filter(r=>r.value===null).length,
    interval:single.interval,
    ...(shifted?{numericKeys:{shift_days:'days'}}:{}),
    ...(Object.keys(meanings).length?{meanings}:{})};
}
type DataTableRow={key:Record<string,string>;value:number|null};

/** What was fitted, model by model, with the number of intervals said and that none is adjusted for it. */
export function regressionsSentence(models:ModelRow[],params:RegressionParams):string{
  const round=(v:number)=>v>=100?v.toFixed(0):v>=10?v.toFixed(1):v.toFixed(3);
  const first=models.find(m=>m.result)!.result!;
  const model=params.family==='logistic'?'logistic regressions':'Poisson regressions';
  // AN ADJUSTMENT THAT FOLLOWS THE SHIFT is named once, as the column without its shift, "at its own shift".
  const firstFitted=models.findIndex(m=>m.result);
  const followed=new Map((params.adjust??[]).filter(t=>t.perModel).map(t=>[t.perModel![firstFitted]!,t]));
  const named=first.adjustedFor.map(c=>followed.has(c)?`${unshifted(c)} at its own shift`:c);
  const adjusted=named.length?`, each adjusted for ${named.join(', ')}`:', each unadjusted';
  // EACH MODEL'S OWN COUNTS: rows, strata and dispersion differ from model to model, so none is stated once for all.
  const dispersed=/\(\d+(\.\d+)?\)$/.test(first.errors);
  const fitted=models.filter(m=>m.result).map(m=>{const r=m.result!,e=r.estimates[0]!;
    return `${m.column}: ${round(e.ratio)} (${round(e.lower)} to ${round(e.upper)}) for ${e.term}, `
      +`${r.rows.used.toLocaleString('en')} rows${r.rows.leftOut?`, ${r.rows.leftOut.toLocaleString('en')} left out`:''}`
      +(r.strata?`, ${r.strata.used.toLocaleString('en')} strata${r.strata.dropped?`, ${r.strata.dropped.toLocaleString('en')} without events dropped`:''}`:'')
      +(dispersed?`, dispersion ${r.dispersion.toFixed(3)}`:'');});
  const failed=models.filter(m=>!m.result);
  return `${models.length} ${model} of ${params.outcome}, one per exposure column and each on its own rows${adjusted}; `
    +`${first.measure}, ${dispersed?first.errors.replace(/the Pearson dispersion \(\d+(\.\d+)?\)$/,"each model's Pearson dispersion"):first.errors} intervals. ${fitted.join('. ')}. `
    +`${fitted.length} ${first.level}% intervals, none adjusted for the number of comparisons.`
    +(failed.length?` Not fitted: ${failed.map(m=>`${m.column} (${m.reason})`).join('; ')}`:'');
}

/** EVERY MODEL IN ONE RECEIPT, each its own `fw:RegressionModel` with its own exposure, so the shapes hold each as
 *  they hold one. A model that could not be fitted has no statement: it has nothing the shapes could check. */
export function regressionsReceipt(node:{id:string},models:ModelRow[],params:RegressionParams,runId:string,
  sourceNodeId:string,designDeclared:boolean,method:string){
  const blocks=models.flatMap((m,i)=>{
    if(!m.result)return [];
    const entity=`<urn:fieldwork:run:${runId}:output:${node.id}:model:${i+1}>`;
    const {lines,estimates}=modelFacts(entity,m.result,modelParams(params,i),runId,sourceNodeId,designDeclared);
    return [lines.join(';\n  ')+'.\n'+estimates];
  });
  const facts=PREFIXES+blocks.join('\n')+'\n';
  return {nodeId:node.id,kind:'computation' as const,facts,rules:'',input:facts,conclusions:[],method,
    models:models.map(m=>({column:m.column,...(m.shiftDays!==undefined?{shiftDays:m.shiftDays}:{}),
      ...(m.result?{estimates:m.result.estimates,rows:m.result.rows,errors:m.result.errors,iterations:m.result.iterations,
        dispersion:m.result.dispersion,...(m.result.strata?{strata:m.result.strata}:{})}:{reason:m.reason})}))};
}
