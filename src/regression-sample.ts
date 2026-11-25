/** WHICH ROWS A REGRESSION IS FITTED ON, and why the others are left out.
 *
 *  Split out of `regression.ts` on 2026-11-25 so the dialog can say what the fit will do without loading the model's
 *  kernel. Regression's Preview had counted rows that merely held a non-empty value in every column the plan names,
 *  which is a weaker test than the fit's: the fit also drops an outcome that is neither a case nor a control, a
 *  categorical written `NA`, a numeric that is not a number, and a missing stratum or offset. The Preview therefore
 *  promised a larger sample than the run would use (review of 0.197.0).
 *
 *  Two readers of one rule, rather than two rules that agree today: this file holds the rule, `fitRegression` calls
 *  it, and so does the Preview. The kernel stays where it was. */
export type Row=Record<string,string|number|null|undefined>;
export type Term={column:string;as:'numeric'|'categorical'|'spline';reference?:string;df?:number};

export const asNumber=(v:Row[string]):number=>
  v===null||v===undefined||v===''?NaN:typeof v==='number'?v:Number(String(v).trim());
export const asText=(v:Row[string]):string=>v===null||v===undefined?'':String(v).trim();

/** Regression's strata as a list: one column, several, or none. */
export const strataOf=(strata:string|string[]|undefined):string[]=>
  (Array.isArray(strata)?strata:strata?[strata]:[]).map(c=>c.trim()).filter(Boolean);

export interface SampleRule {
  family:'logistic'|'poisson';
  outcome:string;
  cases?:string[];
  controls?:string[];
  terms:Term[];
  strata?:string|string[];
  offset?:string;
}

/** Why this row is not fitted, or null where it is. The reasons are the run's own words, so the Preview and the
 *  receipt describe the same exclusion. */
export function exclusionReason(row:Row,rule:SampleRule):string|null{
  if(rule.family==='logistic'){
    const v=asText(row[rule.outcome]);
    if(!(rule.cases??[]).includes(v)&&!(rule.controls??[]).includes(v))
      return `${rule.outcome} neither case nor control`;
  }else{
    const y=asNumber(row[rule.outcome]);
    if(!Number.isFinite(y)||y<0)return `${rule.outcome} missing or not a count`;
  }
  const missing=rule.terms.find(term=>term.as==='categorical'
    ?asText(row[term.column])===''||asText(row[term.column]).toUpperCase()==='NA'
    :!Number.isFinite(asNumber(row[term.column])));
  if(missing)return `${missing.column} missing`;
  const noStratum=strataOf(rule.strata).find(c=>asText(row[c])==='');
  if(noStratum)return `${noStratum} missing`;
  if(rule.offset&&!Number.isFinite(asNumber(row[rule.offset])))return `${rule.offset} missing`;
  return null;
}
