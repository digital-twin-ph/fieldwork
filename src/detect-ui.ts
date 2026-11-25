/** DETECT UNUSUAL COUNTS, ON THE STANDARD (experiment 186): the name, the input, one sentence, Configure… and what the last
 *  run found. Every setting is in the dialog, with the counts Before and each period's threshold and signal After, drawn
 *  as well as listed, and Show me how on a made-up series. Nothing reaches the workflow until Apply. */
import type {DataTable} from './data-table.js';
import {wideCells} from './data-table-ui.js';
import type {Escape,ParamsByType} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {openConfigDialog} from './config-dialog.js';
import {openWalkthrough,type Walkthrough} from './table-walkthrough.js';
import {detect,detectTable,detectSentence,detectSettings,METHOD_NAMES,DETECT_DEFAULTS,type DetectMethod,type DetectTableResult} from './aberration.js';

type Params=ParamsByType['detect_unusual_counts'];
export type DetectDraft=Omit<Params,'label'>;
const n=(x:number)=>x.toLocaleString('en');
const num=(x:number|null|undefined,places=2)=>x===null||x===undefined?'':Number.isInteger(x)?n(x):x.toFixed(places);

/** What the method compares each period with, and the threshold, in one sentence. */
export function detectSettingsSentence(p:Pick<Params,'method'|'timeField'|'groupField'|'baseline'|'alpha'|'minSigma'|'baselinePeriods'|'k'|'h'|'reset'|'lambda'|'L'>):string{
  if(!p.timeField)return 'Flags the periods whose count passes a threshold, once the column holding each period is chosen.';
  const s=detectSettings(p),by=p.groupField?`, one series for each "${p.groupField}"`:'';
  const what=p.method==='ears-c1'?`each period against the ${s.baseline} before it`
    :p.method==='ears-c2'?`each period against the ${s.baseline} ending 3 periods before it`
    :p.method==='ears-c3'?`each period and the 2 before it against the ${s.baseline} ending 3 periods before each`
    :p.method==='cusum'?`each period's excess over the mean of the first ${s.baselinePeriods}, added up (k ${s.k}, signal at ${s.h}${s.reset?', then from 0 again':''})`
    :`a smoothed level (λ ${s.lambda}) against the mean of the first ${s.baselinePeriods}, signal past ${s.L} standard deviations`;
  return `${METHOD_NAMES[p.method]}: ${what}${p.method.startsWith('ears')?`, signal at α ${s.alpha}`:''}, by "${p.timeField}"${by}.`;
}

/** THE PERIODS' COLUMN, proposed: a column named for time, else the first. */
export function proposeTimeField(columns:readonly string[]):string{
  return columns.find(c=>/^(period|date|day|week|month|year|epi_?week|time)$/i.test(c))
    ??columns.find(c=>/date|week|month|period|day/i.test(c))??columns[0]??'';
}

/** ONE SERIES DRAWN: the counts as bars, the threshold as a dashed line, each signal marked and said in the key. */
export function detectChart(found:DetectTableResult,series:string,esc:Escape):string{
  const rows=found.table.rows.filter(r=>found.table.keys.length===2||String(r.key[found.table.keys[1]!])===series);
  const per=(m:string)=>rows.filter(r=>r.key.measure===m).map(r=>r.value);
  const observed=per('observed'),threshold=per('threshold'),signal=per('signal'),N=observed.length;
  if(!N)return '';
  const W=760,H=220,L=48,B=28,top=12,max=Math.max(1,...observed.map(v=>v??0),...threshold.map(v=>v??0));
  const x=(i:number)=>L+(i+0.5)*(W-L-8)/N,y=(v:number)=>H-B-(v/max)*(H-B-top),bw=Math.max(1,(W-L-8)/N*0.7);
  const bars=observed.map((v,i)=>`<rect x="${(x(i)-bw/2).toFixed(1)}" y="${y(v??0).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H-B-y(v??0)).toFixed(1)}" `
    +`class="${signal[i]===1?'detect-bar-signal':'detect-bar'}"><title>${esc(found.periods[i]!)}: ${num(v)}${signal[i]===1?', signal':''}</title></rect>`).join('');
  const line=threshold.map((v,i)=>v===null?null:`${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const paths:string[]=[];let run:string[]=[];
  for(const p of line){if(p)run.push(p);else if(run.length){paths.push(run.join(' '));run=[];}}
  if(run.length)paths.push(run.join(' '));
  const ticks=[0,max/2,max].map(v=>`<text x="${L-6}" y="${(y(v)+5).toFixed(1)}" text-anchor="end" class="detect-axis">${num(v,1)}</text>`).join('');
  const labels=[0,Math.floor((N-1)/2),N-1].filter((v,i,a)=>a.indexOf(v)===i)
    .map(i=>`<text x="${(i===0?L:i===N-1?W-8:x(i)).toFixed(1)}" y="${H-8}" text-anchor="${i===0?'start':i===N-1?'end':'middle'}" class="detect-axis">${esc(found.periods[i]!)}</text>`).join('');
  const signals=signal.filter(v=>v===1).length;
  return `<figure class="detect-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Counts by period with the threshold">`
    +`<line x1="${L}" y1="${H-B}" x2="${W-8}" y2="${H-B}" class="detect-axis-line"/>${ticks}${labels}${bars}`
    +paths.map(p=>`<polyline points="${p}" class="detect-threshold"/>`).join('')+'</svg>'
    +`<figcaption><ul class="walk-key"><li>Bars: the count in each period${series?` for ${esc(series)}`:''}.</li>`
    +'<li>Dashed line: the threshold each period was held to.</li>'
    +`<li>Dark bars: the ${n(signals)} period${signals===1?'':'s'} that signal.</li></ul></figcaption></figure>`;
}

/** SHOW ME HOW: EARS C1 on ten made-up days, with a baseline of 3 so each step fits on the screen. */
/** THE METHOD'S OWN COMPUTATION, drawn (the practitioner, 2026-11-21: "don't we need algorithmic computation charts?"):
 *  its statistic over time against its decision limit, on the statistic's own scale, each day that signals marked with a
 *  triangle and said in the key. */
const COMPUTATION:Record<DetectMethod,[string,string]>={
  'ears-c1':['each day’s count, in standard deviations above the mean of the days before it','z(1−α), the line a day must pass'],
  'ears-c2':['each day’s count, in standard deviations above the mean of the days before the 2 left out','z(1−α), the line a day must pass'],
  'ears-c3':['C2’s excess over 1, added over the day and the 2 before it','z(1−α), the line the sum must pass'],
  cusum:['the CUSUM sum: each day’s excess over the expected level, added up, never below 0','h, the decision interval'],
  ewma:['the smoothed level: each day weighted with the level before it','its limit, narrow at first, widening to steady'],
};
export function detectMethodChart(found:DetectTableResult,series:string,method:DetectMethod,esc:Escape):string{
  const rows=found.table.rows.filter(r=>found.table.keys.length===2||String(r.key[found.table.keys[1]!])===series);
  const per=(m:string)=>rows.filter(r=>r.key.measure===m).map(r=>r.value);
  const stat=per('statistic'),limit=per('limit'),signal=per('signal'),N=stat.length;
  if(!N||stat.every(v=>v===null))return '';
  const values=[...stat,...limit].filter((v):v is number=>v!==null&&Number.isFinite(v));
  const lo=Math.min(0,...values),hi=Math.max(1,...values),W=760,H=200,L=48,B=28,top=12;
  const x=(i:number)=>L+(i+0.5)*(W-L-8)/N,y=(v:number)=>H-B-((v-lo)/(hi-lo))*(H-B-top);
  const line=(vals:(number|null)[])=>{const runs:string[]=[];let run:string[]=[];
    vals.forEach((v,i)=>{if(v===null){if(run.length)runs.push(run.join(' '));run=[];}else run.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`);});
    if(run.length)runs.push(run.join(' '));return runs;};
  const marks=signal.map((v,i)=>v===1&&stat[i]!==null?`<path d="M${x(i).toFixed(1)},${(y(stat[i]!)-11).toFixed(1)} l6,10 h-12 z" class="detect-signal-mark"><title>${esc(found.periods[i]!)}: signals</title></path>`:'').join('');
  const ticks=[lo,(lo+hi)/2,hi].map(v=>`<text x="${L-6}" y="${(y(v)+5).toFixed(1)}" text-anchor="end" class="detect-axis">${num(v,1)}</text>`).join('');
  const labels=[0,Math.floor((N-1)/2),N-1].filter((v,i,a)=>a.indexOf(v)===i)
    .map(i=>`<text x="${(i===0?L:i===N-1?W-8:x(i)).toFixed(1)}" y="${H-8}" text-anchor="${i===0?'start':i===N-1?'end':'middle'}" class="detect-axis">${esc(found.periods[i]!)}</text>`).join('');
  const [what,limitWhat]=COMPUTATION[method],signals=signal.filter(v=>v===1).length;
  return `<figure class="detect-chart detect-computation"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(METHOD_NAMES[method])}: the statistic against its limit">`
    +`<line x1="${L}" y1="${y(0).toFixed(1)}" x2="${W-8}" y2="${y(0).toFixed(1)}" class="detect-axis-line"/>${ticks}${labels}`
    +line(limit).map(pts=>`<polyline points="${pts}" class="detect-threshold"/>`).join('')
    +line(stat).map(pts=>`<polyline points="${pts}" class="detect-statistic"/>`).join('')+marks+'</svg>'
    +`<figcaption><ul class="walk-key"><li>Solid line: ${esc(what)}.</li><li>Dashed line: ${esc(limitWhat)}.</li>`
    +`<li>Triangles: the ${n(signals)} day${signals===1?'':'s'} where the line passes the limit, which signal.</li></ul></figcaption></figure>`;
}

/** SHOW ME HOW, for the method chosen: EARS C1 day by day against the days before it, or the others' computation. */
export function detectWalkthrough(method:DetectMethod='ears-c1'):Walkthrough{
  if(method!=='ears-c1')return computationWalkthrough(method);
  const counts=[3,4,2,3,5,3,4,9,4,3],days=counts.map((_,i)=>`day ${i+1}`);
  const rows=detect(counts,{method:'ears-c1',baseline:3,alpha:0.001});
  const steps:Walkthrough['steps']=[{text:'A made-up example: ten days of counts. EARS C1 holds each day to the days just before it: their mean, '
    +'plus a margin of 3.09 standard deviations, which is the threshold at α 0.001. Here the baseline is 3 days so each step fits; '
    +'the method’s usual baseline is 7.',marks:[]}];
  for(const r of rows){
    if(r.signal===null)continue;
    const base=[r.index-3,r.index-2,r.index-1];
    steps.push({text:`${days[r.index]}: the 3 days before it average ${num(r.expected)}, so its threshold is ${num(r.threshold)}. `
      +`It has ${r.observed}, which is ${r.signal?'above the threshold: it signals.':'not above the threshold.'}`,
      marks:[...base.map(row=>({table:0,row,state:'looking' as const,word:'baseline'})),
        {table:0,row:r.index,state:r.signal?'matched' as const:'unused' as const,word:r.signal?'signals':'no signal'}],
      result:[[days[r.index]!,num(r.expected),num(r.threshold),r.signal?'yes':'no']]});
  }
  steps.push({text:'One day signals, day 8. A signal says the count passed a threshold set for few false alarms; whether it is an '
    +'outbreak is for the person who looks at the cases behind it.',marks:[],
    result:rows.filter(r=>r.signal!==null).map(r=>[days[r.index]!,num(r.expected),num(r.threshold),r.signal?'yes':'no']),final:true});
  return {title:'Detect unusual counts, on a made-up example',resultColumns:['day','expected','threshold','signal'],steps,
    tables:[{label:'Cases by day',columns:['day','cases'],rows:counts.map((c,i)=>[days[i]!,String(c)])}]};
}

/** The other methods on the same ten made-up days: the statistic each day, its limit, and whether it signals. */
function computationWalkthrough(method:Exclude<DetectMethod,'ears-c1'>):Walkthrough{
  const counts=[3,4,2,3,5,3,4,9,8,3],days=counts.map((_,i)=>`day ${i+1}`);
  const settings={method,...(method.startsWith('ears')?{baseline:3}:{baselinePeriods:4})};
  const rows=detect(counts,settings);
  const intro:Record<Exclude<DetectMethod,'ears-c1'>,string>={
    'ears-c2':'EARS C2 holds each day to the 3 days ending 3 before it: the 2 days just before are left out, so the start of a rise does not lift its own threshold. Its statistic is the count in standard deviations above that mean; it signals past z(1−α) = 3.09.',
    'ears-c3':'EARS C3 adds up, over the day and the 2 before it, how far C2’s statistic passes 1, and signals where the sum passes z(1−α) = 1.96. Slower to start, steadier once it does.',
    cusum:`CUSUM takes the mean of the first 4 days as the expected level, ${num(rows[0]!.expected)}. Each day after, it adds the day’s excess, standardized and less k = 1.04, to a running sum that never falls below 0; it signals where the sum reaches h = 2.26.`,
    ewma:`EWMA takes the mean and spread of the first 4 days, then smooths: each day counts 0.3, the level before it 0.7. It signals where the smoothed level passes its limit, which starts narrow and widens.`};
  const steps:Walkthrough['steps']=[{text:`A made-up example: ten days of counts. ${intro[method]} Short baselines so each step fits.`,marks:[]}];
  const watched=rows.filter(r=>r.signal!==null);
  for(const r of watched)steps.push({text:`${days[r.index]}: ${num(r.observed)} cases; the statistic is ${num(r.statistic)} against a limit of ${num(r.limit)}, `
      +(r.signal?'which it passes: it signals.':'which it does not pass.'),
    marks:[{table:0,row:r.index,state:r.signal?'matched' as const:'unused' as const,word:r.signal?'signals':'no signal'}],
    result:[[days[r.index]!,num(r.statistic),num(r.limit),r.signal?'yes':'no']]});
  const signalled=watched.filter(r=>r.signal).map(r=>days[r.index]);
  steps.push({text:`${signalled.length?`${signalled.join(' and ')} signal.`:'No day signals.'} The chart of the method’s computation draws the same: the statistic as a line, the limit dashed.`,
    marks:[],result:watched.map(r=>[days[r.index]!,num(r.statistic),num(r.limit),r.signal?'yes':'no']),final:true});
  return {title:`${METHOD_NAMES[method]}, on a made-up example`,resultColumns:['day','statistic','limit','signal'],steps,
    tables:[{label:'Cases by day',columns:['day','cases'],rows:counts.map((c,i)=>[days[i]!,String(c)])}]};
}

interface DetectView {step:string;table?:DataTable;source:string;initial:DetectDraft;apply:(d:DetectDraft)=>void}
const METHODS:DetectMethod[]=['ears-c1','ears-c2','ears-c3','cusum','ewma'];
const HELP:Record<DetectMethod,string>={
  'ears-c1':'Each period against the mean of the periods just before it. Quick to react; a slow rise lifts its own baseline.',
  'ears-c2':'As C1, with 2 periods left out before the baseline, so the start of a rise does not lift its own threshold.',
  'ears-c3':'Adds up C2’s excess over the period and the 2 before it: slower to signal, steadier once it does.',
  cusum:'Adds up each period’s excess over a fixed expected level, so small rises that persist add up to a signal.',
  ewma:'A weighted average that leans on recent periods, held to limits set from a fixed baseline: for slow shifts.'};

export function openDetectConfig(view:DetectView,esc:Escape):void{
  const columns=view.table?.keys??[];
  const draft:DetectDraft={...view.initial,...(!view.initial.timeField&&columns.length?{timeField:proposeTimeField(columns)}:{})};
  const field=(id:string,label:string,value:number|undefined,placeholder:number,step='any',hint='')=>
    `<div class="field"><label class="field-label" for="${id}">${esc(label)}</label><input id="${id}" type="number" step="${step}" min="0" `
    +`value="${value??''}" placeholder="${placeholder}">${hint?`<small>${esc(hint)}</small>`:''}</div>`;
  const select=(id:string,label:string,options:string[],current:string,empty:string)=>`<div class="field"><label class="field-label" for="${id}">${esc(label)}</label>`
    +`<select id="${id}"><option value="">${esc(empty)}</option>${options.map(o=>`<option value="${esc(o)}"${o===current?' selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
  openConfigDialog<DetectDraft>({
    id:'detect-config',widget:'Detect unusual counts',step:view.step,draft,wide:true,
    sections:d=>{
      const settings=`<p class="description">Flags the periods in <strong>${esc(view.source)}</strong> whose count passes a threshold set from the series’ own past.</p>`
        +'<p><button type="button" class="button" id="detect-show-me" data-show-me>Show me how it works</button></p>'
        +select('detect-time','Column holding each period',columns,d.timeField,columns.length?'Choose a column…':'Run the workflow once to choose')
        +select('detect-group','A series for each (optional)',columns.filter(c=>c!==d.timeField&&c!=='measure'),d.groupField??'','One series')
        +`<div class="field"><label class="field-label" for="detect-method">Method</label><select id="detect-method">`
        +METHODS.map(m=>`<option value="${m}"${m===d.method?' selected':''}>${esc(METHOD_NAMES[m])}</option>`).join('')+`</select><small>${esc(HELP[d.method])}</small></div>`
        +(d.method.startsWith('ears')
          ?field('detect-baseline','Periods in the baseline',d.baseline,DETECT_DEFAULTS.baseline,'1')
            +field('detect-alpha','False-alarm rate α',d.alpha,d.method==='ears-c3'?DETECT_DEFAULTS.alphaC3:DETECT_DEFAULTS.alphaC12,'any','Smaller: fewer false alarms, and later signals.')
            +field('detect-min-sigma','Least standard deviation',d.minSigma,DETECT_DEFAULTS.minSigma,'any','Above 0, a baseline of equal counts does not signal on every rise.')
          :field('detect-baseline-periods','Baseline: the first periods',d.baselinePeriods,DETECT_DEFAULTS.baselinePeriods,'1','Their mean is the expected level; choose periods with no outbreak in them.')
            +(d.method==='cusum'
              ?field('detect-k','Slack k',d.k,DETECT_DEFAULTS.k)+field('detect-h','Signal at h',d.h,DETECT_DEFAULTS.h)
                +`<label><input type="checkbox" id="detect-reset"${d.reset?' checked':''}> Start again from 0 after a signal</label>`
              :field('detect-lambda','Weight on the newest period λ',d.lambda,DETECT_DEFAULTS.lambda)+field('detect-L','Limit, in standard deviations L',d.L,DETECT_DEFAULTS.L)));
      const t=view.table;
      if(!t)return {settings,message:{tone:'warning' as const,text:'Run the workflow once: the table of counts is known after a run.'},blocked:!d.timeField};
      const before=`<fieldset class="detect-before"><legend>Before</legend><p>${esc(view.source)} · ${n(t.rows.length)} rows</p>`
        // WIDE, as every user-facing table is (2026-11-24).
        +((cells=>'<div class="table-scroll"><table><thead><tr>'
          +cells.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')+'</tr></thead><tbody>'
          +cells.rows.slice(0,1000).map(r=>'<tr>'+r.map(v=>`<td>${esc(v)}</td>`).join('')+'</tr>').join('')
          +'</tbody></table></div>')(wideCells(t)))+'</fieldset>';
      if(!d.timeField)return {settings,preview:before,message:{tone:'warning' as const,text:'Choose the column holding each period.'},blocked:true};
      let found:DetectTableResult;
      try{found=detectTable(t,{...d});}catch(error){return {settings,preview:before,message:{tone:'refusal' as const,text:error instanceof Error?error.message:String(error)},blocked:true};}
      const first=found.series[0]?.name??'';
      const wide=found.periods.map((p,i)=>{const at=(m:string)=>found.table.rows.find(r=>r.key[d.timeField]===p&&(!d.groupField||r.key[d.groupField]===first)&&r.key.measure===m)?.value;
        return [p,num(at('observed')),num(at('expected')),num(at('threshold')),num(at('statistic')),num(at('limit')),at('signal')===1?'yes':at('signal')===0?'no':'—'];void i;});
      const after=`<fieldset class="detect-after"><legend>After</legend><p data-detect-sentence>${esc(detectSentence(found,{...d}))}</p>`
        +detectChart(found,first,esc)+detectMethodChart(found,first,d.method,esc)
        +'<div class="table-scroll"><table><thead><tr>'+[d.timeField,'observed','expected','threshold','statistic','limit','signal'].map(c=>`<th scope="col">${esc(c)}</th>`).join('')
        +'</tr></thead><tbody>'+wide.map(r=>`<tr${r[6]==='yes'?' class="detect-signal-row"':''}>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>'
        +(found.series.length>1?`<p class="muted">The first of ${found.series.length} series shown; the step hands on every series, each period’s five measures.</p>`:'')+'</fieldset>';
      return {settings,preview:before+after};
    },
    wire:(root,d,redraw)=>{
      const show=root.querySelector<HTMLButtonElement>('#detect-show-me');
      if(show)show.onclick=()=>openWalkthrough(detectWalkthrough(d.method),esc,show);
      const on=(id:string,f:(el:HTMLInputElement&HTMLSelectElement)=>void)=>root.querySelector<HTMLInputElement&HTMLSelectElement>(id)?.addEventListener('change',e=>{f(e.target as HTMLInputElement&HTMLSelectElement);redraw();});
      const numeric=(id:string,key:keyof DetectDraft)=>on(id,el=>{const raw=el.value.trim();if(raw==='')delete d[key];else (d as Record<string,unknown>)[key]=Number(raw);});
      on('#detect-time',el=>{d.timeField=el.value;if(d.groupField===el.value)delete d.groupField;});
      on('#detect-group',el=>{if(el.value)d.groupField=el.value;else delete d.groupField;});
      on('#detect-method',el=>{d.method=el.value as DetectMethod;});
      numeric('#detect-baseline','baseline');numeric('#detect-alpha','alpha');numeric('#detect-min-sigma','minSigma');
      numeric('#detect-baseline-periods','baselinePeriods');numeric('#detect-k','k');numeric('#detect-h','h');
      numeric('#detect-lambda','lambda');numeric('#detect-L','L');
      on('#detect-reset',el=>{if(el.checked)d.reset=true;else delete d.reset;});
    },
    apply:d=>view.apply(d),
  },esc);
}

export const detectInspector:OwnInspector<'detect_unusual_counts'>={
  markup:(node,kit)=>{const k=kit as StepKit,p=node.params,why=k.unfinished(node.id);
    let sentence:string;try{sentence=detectSettingsSentence(p);}catch(error){sentence=error instanceof Error?error.message:String(error);}
    return kit.section('Name',kit.name('detect-label',p.label||k.title('detect_unusual_counts')))
      +kit.section('Inputs',kit.inputs(node,{records:'A table of counts per period'}))
      +kit.section('Settings',`<p class="standard-sentence">${kit.esc(sentence)}</p>`
        +(p.timeField?'':'<div class="notice notice-warning" data-detect-missing>Choose the column holding each period in Configure… before running.</div>')
        +'<div class="inspector-actions"><button id="configure-step" class="button primary">Configure…</button></div>')
      +kit.section('Result',`<p class="standard-result${why?' standard-result-warning':''}">`
        +`${kit.esc(why?`The last run could not compute this step: ${why}`:k.method(node.id)??'Not run yet.')}</p>`);},
  wire:(node,kit,root)=>{const k=kit as StepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{
      const w=kit.workflow(),now=w.nodes.find(x=>x.id===node.id);
      if(now?.type!=='detect_unusual_counts')return;
      const from=w.edges.find(e=>e.to===node.id&&e.port==='records')?.from,up=w.nodes.find(x=>x.id===from);
      const {label,...initial}=now.params;void label;
      const table=k.tableOn(node.id,'records');
      openDetectConfig({step:now.params.label||k.title('detect_unusual_counts'),...(table?{table}:{}),
        source:up?(up.params.label||k.title(up.type)):'the table',initial,
        apply:d=>k.keep(w2=>{const t=w2.nodes.find(x=>x.id===node.id);if(t?.type!=='detect_unusual_counts')return;
          t.params={label:t.params.label,...d};})},kit.esc);
    });
  },
};
