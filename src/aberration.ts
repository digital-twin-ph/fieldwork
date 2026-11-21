/** UNUSUAL COUNTS, DETECTED (the practitioner, 2026-11-21: "let's do CUSUM, EWMA and syndromic surveillance"). Each method
 *  sets a threshold from a baseline of the series' own past and says, period by period, whether the count passed it.
 *  Written from the published definitions:
 *
 *  - EARS C1, C2 and C3: Hutwagner L, Thompson W, Seeman GM, Treadwell T. The bioterrorism preparedness and response Early
 *    Aberration Reporting System (EARS). J Urban Health 2003;80(2 Suppl 1):i89–96 (open: PMC3456557). C1's baseline is
 *    the 7 periods before; C2's the 7 ending 3 periods before (a guard of 2); C3 adds, over the period and the 2 before,
 *    how far each C2 statistic exceeds 1.
 *  - CUSUM: Page ES. Continuous inspection schemes. Biometrika 1954;41:100–115. Counts standardized as (x − m)/√m, m the
 *    baseline mean, as the R package surveillance does (`algo.cusum`, trans = "standard").
 *  - EWMA: Roberts SW. Control chart tests based on geometric moving averages. Technometrics 1959;1:239–250; the limits as
 *    in Montgomery's Introduction to Statistical Quality Control, with the factor that widens them from the start.
 *
 *  A threshold is a decision about false alarms, stated (α, h, L); nothing here says a signal is an outbreak. */

export type DetectMethod='ears-c1'|'ears-c2'|'ears-c3'|'cusum'|'ewma';
export interface DetectSettings {
  method:DetectMethod;
  /** EARS: periods in the baseline (7). */ baseline?:number;
  /** EARS: the false-alarm rate a threshold is set for (C1, C2 0.001; C3 0.025). */ alpha?:number;
  /** EARS: the least standard deviation a baseline is taken to have, so a flat baseline does not alarm on any rise (0). */ minSigma?:number;
  /** CUSUM, EWMA: the first periods, whose mean (and, for EWMA, standard deviation) is the expected level. */ baselinePeriods?:number;
  /** CUSUM: the slack subtracted each period (1.04) and the decision interval (2.26), R's defaults. */ k?:number; h?:number;
  /** CUSUM: start again from zero after a signal. */ reset?:boolean;
  /** EWMA: the weight on the newest period (0.3) and the width of the limit in standard deviations (3). */ lambda?:number; L?:number;
}
export interface DetectRow {
  /** Position in the series. */ index:number; observed:number;
  /** What the baseline expects; null before there is a baseline. */ expected:number|null;
  /** The count, or for EWMA the smoothed level, above which a period signals. */ threshold:number|null;
  /** C1 or C2's standardized count, C3's sum, CUSUM's sum, EWMA's smoothed level. */ statistic:number|null;
  signal:boolean|null;
}

export const DETECT_DEFAULTS={baseline:7,alphaC12:0.001,alphaC3:0.025,minSigma:0,baselinePeriods:7,k:1.04,h:2.26,lambda:0.3,L:3} as const;

/** The standard normal quantile: Acklam's rational approximation, refined by one Halley step. Agrees with R's qnorm to
 *  about 2e-8 at the α used here, the error of the erfc it refines against; a threshold moves by that times the sd. */
export function normalQuantile(p:number):number{
  if(!(p>0&&p<1))throw new Error('A probability between 0 and 1, exclusive.');
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
  const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572];
  const c=[-0.007784894002430293,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
  const d=[0.007784695709041462,0.3224671290700398,2.445134137142996,3.754408661907416];
  const lo=0.02425;let x:number;
  if(p<lo){const q=Math.sqrt(-2*Math.log(p));x=(((((c[0]!*q+c[1]!)*q+c[2]!)*q+c[3]!)*q+c[4]!)*q+c[5]!)/((((d[0]!*q+d[1]!)*q+d[2]!)*q+d[3]!)*q+1);}
  else if(p<=1-lo){const q=p-0.5,r=q*q;x=(((((a[0]!*r+a[1]!)*r+a[2]!)*r+a[3]!)*r+a[4]!)*r+a[5]!)*q/(((((b[0]!*r+b[1]!)*r+b[2]!)*r+b[3]!)*r+b[4]!)*r+1);}
  else{const q=Math.sqrt(-2*Math.log(1-p));x=-(((((c[0]!*q+c[1]!)*q+c[2]!)*q+c[3]!)*q+c[4]!)*q+c[5]!)/((((d[0]!*q+d[1]!)*q+d[2]!)*q+d[3]!)*q+1);}
  // One Halley step against the complementary error function.
  const e=0.5*erfc(-x/Math.SQRT2)-p,u=e*Math.sqrt(2*Math.PI)*Math.exp(x*x/2);
  return x-u/(1+x*u/2);
}
function erfc(x:number):number{
  // Numerical Recipes' erfc, fractional error below 1.2e-7, ample for one refining step.
  const z=Math.abs(x),t=1/(1+0.5*z);
  const r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398
    +t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
  return x>=0?r:2-r;
}
const mean=(xs:readonly number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
/** The sample standard deviation, n − 1, as R's sd. */
const sd=(xs:readonly number[])=>{const m=mean(xs);return Math.sqrt(xs.reduce((t,x)=>t+(x-m)**2,0)/(xs.length-1));};
const empty=(index:number,observed:number):DetectRow=>({index,observed,expected:null,threshold:null,statistic:null,signal:null});

/** Validates the settings and says what is wrong in words; returns them with the defaults filled. */
export function detectSettings(s:DetectSettings):Required<Omit<DetectSettings,'reset'>>&{reset:boolean}{
  const v={method:s.method,baseline:s.baseline??DETECT_DEFAULTS.baseline,
    alpha:s.alpha??(s.method==='ears-c3'?DETECT_DEFAULTS.alphaC3:DETECT_DEFAULTS.alphaC12),minSigma:s.minSigma??DETECT_DEFAULTS.minSigma,
    baselinePeriods:s.baselinePeriods??DETECT_DEFAULTS.baselinePeriods,k:s.k??DETECT_DEFAULTS.k,h:s.h??DETECT_DEFAULTS.h,reset:!!s.reset,
    lambda:s.lambda??DETECT_DEFAULTS.lambda,L:s.L??DETECT_DEFAULTS.L};
  if(!['ears-c1','ears-c2','ears-c3','cusum','ewma'].includes(v.method))throw new Error('Choose a method: EARS C1, C2 or C3, CUSUM or EWMA.');
  if(!Number.isInteger(v.baseline)||v.baseline<3)throw new Error('An EARS baseline is 3 periods or more.');
  if(!(v.alpha>0&&v.alpha<0.5))throw new Error('The false-alarm rate α is between 0 and 0.5.');
  if(!(v.minSigma>=0))throw new Error('The least standard deviation is 0 or more.');
  if(!Number.isInteger(v.baselinePeriods)||v.baselinePeriods<2)throw new Error('A baseline is 2 periods or more.');
  if(!(v.k>=0)||!(v.h>0))throw new Error('CUSUM\'s k is 0 or more and its h more than 0.');
  if(!(v.lambda>0&&v.lambda<=1)||!(v.L>0))throw new Error('EWMA\'s λ is above 0 and at most 1, and its L more than 0.');
  return v;
}

/** One series, in order, period by period. */
export function detect(series:readonly number[],settings:DetectSettings):DetectRow[]{
  const s=detectSettings(settings),n=series.length;
  if(series.some(x=>!Number.isFinite(x)||x<0))throw new Error('A count is a number, 0 or more, in every period.');
  const z=normalQuantile(1-s.alpha);
  if(s.method==='ears-c1'||s.method==='ears-c2'||s.method==='ears-c3'){
    const lag=s.method==='ears-c1'?1:3;
    // The baseline ending `lag` periods back: C1 the 7 before; C2 and C3 the 7 before a guard of 2.
    const base=(t:number)=>t-lag-s.baseline+1>=0?series.slice(t-lag-s.baseline+1,t-lag+1):null;
    const c2=(t:number)=>{const b=base(t);if(!b)return null;const sig=Math.max(sd(b),s.minSigma);
      return {mean:mean(b),sig,stat:sig>0?(series[t]!-mean(b))/sig:null};};
    return series.map((x,t)=>{
      const here=c2(t);if(!here)return empty(t,x);
      if(s.method!=='ears-c3'){
        return {index:t,observed:x,expected:here.mean,threshold:here.mean+z*here.sig,statistic:here.stat,
          signal:here.sig>0?x>here.mean+z*here.sig:x>here.mean};
      }
      // C3: over this period and the two before, how far each C2 exceeds 1; the threshold is the count that brings it to z.
      const before=[c2(t-2),c2(t-1)];
      if(before.some(b=>!b||b.stat===null)||here.stat===null)return {...empty(t,x),expected:here.mean};
      const carried=before.reduce((a,b)=>a+Math.max(0,b!.stat!-1),0),c3=carried+Math.max(0,here.stat-1);
      // Past z already from the two before, any count signals: the threshold is 0.
      const threshold=carried>z?0:Math.max(0,here.mean+here.sig*(1+z-carried));
      return {index:t,observed:x,expected:here.mean,threshold,statistic:c3,signal:c3>z};
    });
  }
  const b=series.slice(0,s.baselinePeriods);
  if(b.length<s.baselinePeriods||n<=s.baselinePeriods)throw new Error(`The series has ${n} periods; a baseline of ${s.baselinePeriods} leaves none to watch.`);
  const m=mean(b);
  if(s.method==='cusum'){
    if(!(m>0))throw new Error('The baseline\'s mean is 0, so a count cannot be standardized by it: choose a baseline with cases in it.');
    let S=0;
    return series.map((x,t)=>{
      if(t<s.baselinePeriods)return {...empty(t,x),expected:m};
      const previous=S;S=Math.max(0,S+(x-m)/Math.sqrt(m)-s.k);
      const signal=S>=s.h,threshold=Math.ceil(Math.sqrt(m)*(s.h+s.k-previous)+m);
      const row={index:t,observed:x,expected:m,threshold:Math.max(0,threshold),statistic:S,signal};
      if(signal&&s.reset)S=0;
      return row;
    });
  }
  const sigma=sd(b);
  if(!(sigma>0))throw new Error('The baseline does not vary, so EWMA has no spread to set its limit by: choose a longer baseline.');
  let Z=m;
  return series.map((x,t)=>{
    if(t<s.baselinePeriods)return {...empty(t,x),expected:m};
    const i=t-s.baselinePeriods+1;Z=s.lambda*x+(1-s.lambda)*Z;
    const limit=m+s.L*sigma*Math.sqrt(s.lambda/(2-s.lambda)*(1-(1-s.lambda)**(2*i)));
    return {index:t,observed:x,expected:m,threshold:limit,statistic:Z,signal:Z>limit};
  });
}

/** THE NAMES THE PRACTITIONER READS, in the dialog, the table and the receipt. */
export const METHOD_NAMES:Record<DetectMethod,string>={'ears-c1':'EARS C1','ears-c2':'EARS C2','ears-c3':'EARS C3',cusum:'CUSUM',ewma:'EWMA'};
export const MEASURES=['observed','expected','threshold','statistic','signal'] as const;

export interface DetectTableSettings extends DetectSettings {timeField:string;groupField?:string}
export interface DetectTableResult {
  table:import('./data-table.js').DataTable;
  /** Per series: its name ('' with none), the periods watched and those that signal. */
  series:{name:string;watched:number;signals:string[];filled:number}[];
  periods:string[];
}

/** A TABLE OF COUNTS, DETECTED: one series per value of `groupField` (one series with none), its periods in order. A
 *  period a series has no row for counts as 0, and is said; a period a series has two rows for is refused, since a
 *  count per period is what each method reads. Out: one row per period, series and measure. */
export function detectTable(table:import('./data-table.js').DataTable,s:DetectTableSettings):DetectTableResult{
  if(!table.keys.includes(s.timeField))throw new Error(`The table has no column "${s.timeField}". It is keyed by ${table.keys.join(', ')}.`);
  if(s.groupField&&!table.keys.includes(s.groupField))throw new Error(`The table has no column "${s.groupField}". It is keyed by ${table.keys.join(', ')}.`);
  if(s.groupField===s.timeField)throw new Error('The column splitting the series cannot also be the periods.');
  const at=(r:{key:Record<string,unknown>},k:string)=>String(r.key[k]??'').trim();
  const periods=[...new Set(table.rows.map(r=>at(r,s.timeField)).filter(Boolean))];
  const numeric=periods.every(p=>p!==''&&Number.isFinite(Number(p)));
  periods.sort((a,b)=>numeric?Number(a)-Number(b):a<b?-1:a>b?1:0);
  const names=s.groupField?[...new Set(table.rows.map(r=>at(r,s.groupField!)))].sort():[''];
  const rows:import('./data-table.js').DataTable['rows']=[],series:DetectTableResult['series']=[];
  for(const name of names){
    const counts=new Map<string,number>();
    for(const r of table.rows){
      if(s.groupField&&at(r,s.groupField)!==name)continue;
      const p=at(r,s.timeField);if(!p)continue;
      if(counts.has(p))throw new Error(`${name?`"${name}" has`:'The table has'} two rows for ${p}. Each method reads one count per period: `
        +'choose the column that splits the series, or select the rows of one measure first.');
      if(r.value===null||r.value===undefined)throw new Error(`${p}${name?` for "${name}"`:''} has no count.`);
      counts.set(p,r.value);
    }
    const filled=periods.filter(p=>!counts.has(p)).length;
    const result=detect(periods.map(p=>counts.get(p)??0),s);
    result.forEach((d,i)=>{const p=periods[i]!;
      for(const m of MEASURES){const v=m==='signal'?(d.signal===null?null:d.signal?1:0):d[m];
        rows.push({key:{[s.timeField]:p,...(s.groupField?{[s.groupField]:name}:{}),measure:m},value:v===null?null:Number(v)});}});
    series.push({name,watched:result.filter(d=>d.signal!==null).length,signals:result.filter(d=>d.signal).map(d=>periods[d.index]!),filled});
  }
  const keys=[s.timeField,...(s.groupField?[s.groupField]:[]),'measure'];
  return {periods,series,table:{kind:'data-table',keys,valueField:'value',rows,rowCount:rows.length,
    missingValueCount:rows.filter(r=>r.value===null).length,primaryKey:keys,
    columns:{measure:{label:'Measure',description:`observed, expected, threshold, statistic, and signal (1 where the period signals) by ${METHOD_NAMES[s.method]}`,origin:'file',confirmed:true}}} as import('./data-table.js').DataTable};
}

/** One sentence of what a detection found, for the Inspector, the receipt and Notes. */
export function detectSentence(r:DetectTableResult,s:DetectTableSettings):string{
  const n=(x:number)=>x.toLocaleString('en');
  const said=r.series.map(x=>`${x.name?`${x.name}: `:''}${x.signals.length?`${n(x.signals.length)} of ${n(x.watched)} periods signal (${x.signals.slice(0,6).join(', ')}${x.signals.length>6?' …':''})`:`none of ${n(x.watched)} periods signals`}`);
  const filled=r.series.reduce((t,x)=>t+x.filled,0);
  return `${METHOD_NAMES[s.method]} over ${n(r.periods.length)} periods${r.series.length>1?` in ${r.series.length} series`:''}: ${said.join('; ')}.`
    +(filled?` ${n(filled)} period${filled===1?'':'s'} with no row counted as 0.`:'');
}
