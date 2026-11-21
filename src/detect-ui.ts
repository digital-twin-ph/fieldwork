/** DETECT UNUSUAL COUNTS, ON THE STANDARD (experiment 186): the name, the input, one sentence, Configure… and what the last
 *  run found. Every setting is in the dialog, with the counts Before and each period's threshold and signal After, drawn
 *  as well as listed, and Show me how on a made-up series. Nothing reaches the workflow until Apply. */
import type {DataTable} from './data-table.js';
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
export function detectWalkthrough():Walkthrough{
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
        +'<div class="table-scroll"><table><thead><tr>'+[...t.keys,t.valueField].map(c=>`<th scope="col">${esc(c)}</th>`).join('')+'</tr></thead><tbody>'
        +t.rows.slice(0,1000).map(r=>'<tr>'+t.keys.map(k=>`<td>${esc(String(r.key[k]??''))}</td>`).join('')+`<td>${num(r.value)}</td></tr>`).join('')
        +'</tbody></table></div></fieldset>';
      if(!d.timeField)return {settings,preview:before,message:{tone:'warning' as const,text:'Choose the column holding each period.'},blocked:true};
      let found:DetectTableResult;
      try{found=detectTable(t,{...d});}catch(error){return {settings,preview:before,message:{tone:'refusal' as const,text:error instanceof Error?error.message:String(error)},blocked:true};}
      const first=found.series[0]?.name??'';
      const wide=found.periods.map((p,i)=>{const at=(m:string)=>found.table.rows.find(r=>r.key[d.timeField]===p&&(!d.groupField||r.key[d.groupField]===first)&&r.key.measure===m)?.value;
        return [p,num(at('observed')),num(at('expected')),num(at('threshold')),num(at('statistic')),at('signal')===1?'yes':at('signal')===0?'no':'—'];void i;});
      const after=`<fieldset class="detect-after"><legend>After</legend><p data-detect-sentence>${esc(detectSentence(found,{...d}))}</p>`
        +detectChart(found,first,esc)
        +'<div class="table-scroll"><table><thead><tr>'+[d.timeField,'observed','expected','threshold','statistic','signal'].map(c=>`<th scope="col">${esc(c)}</th>`).join('')
        +'</tr></thead><tbody>'+wide.map(r=>`<tr${r[5]==='yes'?' class="detect-signal-row"':''}>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')+'</tbody></table></div>'
        +(found.series.length>1?`<p class="muted">The first of ${found.series.length} series shown; the step hands on every series, each period’s five measures.</p>`:'')+'</fieldset>';
      return {settings,preview:before+after};
    },
    wire:(root,d,redraw)=>{
      const show=root.querySelector<HTMLButtonElement>('#detect-show-me');
      if(show)show.onclick=()=>openWalkthrough(detectWalkthrough(),esc,show);
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
