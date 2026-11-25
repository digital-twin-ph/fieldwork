/** SELECT ROWS, TOTAL WITHIN GROUPS, TWO-BY-TWO AND REGRESSION, OUT OF APP.TS (2026-11-22, the Inspector move's first
 *  batch): their standard Inspectors -- name, inputs, one sentence, Configure…, and what the last run said -- and what
 *  opens each dialog. Regression's dialog moved here as it was; the other three's were already in their own modules.
 *  What they read of the application comes through the kit. */
import type {NodeType,WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import type {Receipt} from './results.js';
import {openConfigDialog} from './config-dialog.js';
import {exclusionReason} from './regression-sample.js';
import {orderOf} from './select-rows.js';
import {control} from './dom.js';
import {required} from './guards.js';
import {openSelectConfig,selectDraftOf,applySelectDraft,selectSentence} from './select-ui.js';
import {openGroupConfig,groupDraftOf,applyGroupDraft,groupSentence} from './group-ui.js';
import {openTwoByTwoConfig,twoByTwoDraftOf,applyTwoByTwoDraft,twoByTwoSettingsSentence} from './two-by-two-ui.js';

export interface TableStepKit extends StepKit {
  /** The last run's receipt for the step. */
  receipt:(nodeId:string)=>Receipt|undefined;
  /** The step a port's records come from, by its name. */
  sourceName:(nodeId:string,port:string,fallback:string)=>string;
  /** The key columns arriving and their values, as far as the workflow says before a run. */
  shape:(nodeId:string)=>Record<string,string[]>;
  /** The value column arriving, if any. */
  valueField:(nodeId:string)=>string|undefined;
  /** The exposure columns a two-by-two could compare, given what is chosen. */
  exposuresOffered:(nodeId:string,shape:Record<string,string[]>,d:{outcomeColumn?:string;exposed?:string;unexposed?:string})=>ReturnType<typeof import('./two-by-two-mapping.js').exposureColumnsOffered>;
  /** The table on the records port, where one can be read before a run. */
  recordsTable:(nodeId:string)=>import('./data-table.js').DataTable|undefined;
}
/** Regression's strata as a list, as `strataOf` in regression.ts reads them; kept here so the Inspector does not load the model's kernel. */
const strataOf=(strata:string|string[]|undefined):string[]=>(Array.isArray(strata)?strata:strata?[strata]:[]).map(c=>c.trim()).filter(Boolean);

/** WHAT REGRESSION WILL FIT, in one sentence (experiment 186). */
export function regressionPlan(p:import('./types.js').ParamsByType['regression']):string{
  if(!p.outcome||!p.exposure.column)return 'Not set up yet: choose the outcome and the exposure in Configure\u2026';
  const model=p.family==='logistic'?'Logistic regression':'Poisson regression',strata=strataOf(p.strata);
  const several=(p.exposureColumns?.length??0)>1?`, once for each of ${p.exposureColumns!.length} exposure columns`:'';
  const intervals={profile:'likelihood-ratio',wald:'Wald',overdispersed:'Wald, scaled for overdispersion',hac:`HAC with ${p.hacLag??0} lags`}[p.errors];
  return `${model} of ${p.outcome} on ${p.exposure.column} (${p.exposure.as})${several}`
    +(p.adjust.length?`, adjusted for ${p.adjust.map(t=>t.column).join(', ')}`:', unadjusted')
    +(strata.length?`, within strata of ${strata.join(', ')}`:'')+(p.offset?`, offset by ${p.offset}`:'')
    +`, with ${intervals} intervals.`;
}
/** THE ROWS THE MODEL WOULD BE FITTED ON (2026-11-25).
 *
 *  Regression's Preview restated `regressionPlan(draft)` -- the model, the outcome, the exposure, the adjustments --
 *  which is the settings read back. It never said whether a model could be fitted at all: that turns on how many
 *  rows carry every column the plan names, how the outcome divides, and whether any level of the exposure is left
 *  with too few rows to estimate. Those are the first things an epidemiologist checks and the last things the
 *  dialog showed.
 *
 *  COUNTED WITHOUT THE MODEL'S KERNEL. `regression.ts` is deliberately not imported here -- see `strataOf` above,
 *  copied for exactly that reason -- so this counts the table's own rows rather than fitting anything. A fit is
 *  iterative and belongs in the run; completeness is a pass over the rows, and it is the part a reader can act on
 *  while the settings are in front of them. */
function regressionPreview(kit:TableStepKit,nodeId:string,d:import('./types.js').ParamsByType['regression'],
  esc:(v:string)=>string):string{
  const plan=`<p class="description">${esc(regressionPlan(d))}</p>`;
  const table=kit.recordsTable(nodeId);
  if(!table)return plan+'<p class="muted">Connect the table, and the rows this model would be fitted on are counted here.</p>';
  if(!d.outcome||!d.exposure.column)return plan;
  const valueOf=(r:{key:Record<string,string>;value:number|null},column:string):string=>
    column===table.valueField?(r.value===null||r.value===undefined?'':String(r.value)):String(r.key[column]??'');
  // LOGISTIC NEEDS BOTH SIDES NAMED before any row can be judged; the run refuses without them, and counting here
  // as though every row were excluded would report nonsense instead of the reason.
  if(d.family==='logistic'&&!(d.cases?.length&&d.controls?.length))
    return plan+'<p class="muted">Say which outcome values are cases and which are controls, and the rows this model '
      +'would be fitted on are counted here.</p>';
  // THE RUN'S OWN RULE, from regression-sample.ts. Counting non-empty values instead promised a larger sample than
  // the fit uses: it also drops an outcome that is neither case nor control, a categorical written `NA`, a numeric
  // that is not a number, and a missing stratum or offset (review of 0.197.0).
  const rule={family:d.family,outcome:d.outcome,cases:d.cases,controls:d.controls,
    terms:[d.exposure,...d.adjust],strata:d.strata,offset:d.offset};
  const asRow=(r:{key:Record<string,string>;value:number|null}):Record<string,string|number|null>=>
    ({...r.key,...(table.valueField?{[table.valueField]:r.value}:{})});
  const left=new Map<string,number>();
  const complete=table.rows.filter(r=>{
    const why=exclusionReason(asRow(r),rule);
    if(why)left.set(why,(left.get(why)??0)+1);
    return !why;});
  const n=(v:number)=>v.toLocaleString('en-US');
  // THE OUTCOME'S TWO SIDES. `cases` names the values that count as a case; where nothing is named, the column's own
  // values are listed instead of guessing which side is which.
  const outcomes=new Map<string,number>();
  for(const r of complete){const v=valueOf(r,d.outcome);outcomes.set(v,(outcomes.get(v)??0)+1);}
  const cases=(d.cases??[]).filter(Boolean);
  const caseRows=cases.length?complete.filter(r=>cases.includes(valueOf(r,d.outcome))).length:null;
  // THE SMALLEST LEVEL OF THE EXPOSURE, where it is entered as categories: a level with a handful of rows is where
  // an estimate runs out of information, and nothing else on this screen says how many rows each level has.
  const levels=new Map<string,number>();
  if(d.exposure.as==='categorical')
    for(const r of complete){const v=valueOf(r,d.exposure.column);levels.set(v,(levels.get(v)??0)+1);}
  const smallest=[...levels.entries()].sort((a,b)=>a[1]-b[1])[0];
  return plan
    +`<p class="standard-result"><strong>${n(complete.length)}</strong> of ${n(table.rows.length)} rows `
    +`${complete.length===1?'is':'are'} usable by this model `
    +`(${[d.outcome,d.exposure.column,...d.adjust.map(t=>t.column),...strataOf(d.strata),
        ...(d.offset?[d.offset]:[])].filter(Boolean).map(esc).join(', ')}).</p>`
    +(caseRows===null
      ?(outcomes.size&&outcomes.size<=6
        ?`<p class="description">${esc(d.outcome)}: `
          +[...outcomes.entries()].map(([v,c])=>`${esc(v||'empty')} ${n(c)}`).join(', ')
          +'. Which of these count as cases is set above.</p>':'')
      :`<p class="standard-result"><strong>${n(caseRows)}</strong> case${caseRows===1?'':'s'} and `
        +`${n(complete.length-caseRows)} not, among the rows counted.</p>`)
    +(smallest&&levels.size>1
      ?`<p class="${smallest[1]<10?'profile-flag':'description'}">${esc(d.exposure.column)} has ${n(levels.size)} `
        +`levels here; the smallest, ${esc(smallest[0]||'empty')}, has ${n(smallest[1])} row${smallest[1]===1?'':'s'}.</p>`
      :'')
    // ROWS LEFT OUT ARE A FINDING, not a detail of the fit: a model quietly fitted on two thirds of the table is
    // the kind of thing a reader should see before Apply, not after a run.
    // WHY THEY ARE LEFT OUT, in the run's own words, so the Preview and the receipt describe the same exclusion.
    +(complete.length<table.rows.length
      ?`<p class="profile-flag">${n(table.rows.length-complete.length)} row`
        +`${table.rows.length-complete.length===1?' is':'s are'} left out: `
        +[...left.entries()].sort((a,b)=>b[1]-a[1]).map(([why,count])=>`${esc(why)} (${n(count)})`).join(', ')+'.</p>'
      :'');
}

/** REGRESSION'S CONFIGURATION DIALOG (experiments 167 and 186, 2026-11-12): the model, the outcome and its cases, the
 *  exposure and the columns fitted one model each, what it is adjusted for, strata and offset, and the intervals, on a
 *  draft that changes the step only on Apply. */
function openRegressionConfig(kit:TableStepKit,nodeId:string){
  const esc=kit.esc,node=kit.workflow().nodes.find(x=>x.id===nodeId) as WorkflowNode<'regression'>|undefined;if(!node)return;
  type Draft=import('./types.js').ParamsByType['regression'];
  openConfigDialog<Draft>({
    id:'regression-config',widget:'Regression',step:node.params.label||kit.title('regression'),draft:structuredClone(node.params),
    sections:d=>{
      const p=d,held=kit.shape(nodeId),valueField=kit.valueField(nodeId);
      const columns=[...Object.keys(held),...(valueField&&!(valueField in held)?[valueField]:[])];
      const option=(value:string,label:string,selected:boolean)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
      const columnSelect=(id:string,label:string,current:string|undefined,none?:string)=>`<div class="field"><label class="field-label" for="${id}">${label}</label>`
        +`<select id="${id}"${columns.length?'':' disabled'}>${none!==undefined?option('',none,!current):option('','Choose a column…',!current)}`
        +columns.map(c=>option(c,c,current===c)).join('')+`</select></div>`;
      const kinds=(current:string)=>[['numeric','Numeric'],['categorical','Categorical'],['spline','Spline, 4 df']].map(([v,l])=>option(v!,l!,current===v)).join('');
      const values=(column:string)=>held[column]??[];
      const settings=''
        +`<div class="field"><label class="field-label" for="reg-family">Model</label><select id="reg-family">`
          +option('logistic','Logistic regression · odds ratios',p.family==='logistic')+option('poisson','Poisson regression · rate ratios',p.family==='poisson')+`</select></div>`
        +columnSelect('reg-outcome','Outcome',p.outcome)
        +(p.family==='logistic'&&p.outcome&&values(p.outcome).length
          ?`<div class="field"><span class="inspector-section">Cases and controls</span><p class="description">Values of ${esc(p.outcome)} that are cases and that are controls. Rows with any other value are left out.</p>`
            +values(p.outcome).map(v=>`<div class="reg-outcome-value"><code>${esc(v)}</code>`
              +`<label class="check"><input type="checkbox" data-reg-case="${esc(v)}" ${p.cases?.includes(v)?'checked':''}> case</label>`
              +`<label class="check"><input type="checkbox" data-reg-control="${esc(v)}" ${p.controls?.includes(v)?'checked':''}> control</label></div>`).join('')+`</div>`
          :'')
        +columnSelect('reg-exposure','Exposure',p.exposure.column)
        +(p.exposure.column
          ?`<div class="field"><label class="field-label" for="reg-exposure-as">Exposure is</label><select id="reg-exposure-as">${kinds(p.exposure.as)}</select></div>`
            +(p.exposure.as==='categorical'&&values(p.exposure.column).length
              ?`<div class="field"><label class="field-label" for="reg-exposure-reference">Reference value</label><select id="reg-exposure-reference">`
                +values(p.exposure.column).map(v=>option(v,v,(p.exposure.reference??[...values(p.exposure.column)].sort()[0])===v)).join('')+`</select></div>`:'')
            +(()=>{
              // ONE MODEL PER COLUMN (experiment 185): Relate's shift columns, or any others, each fitted on its own rows.
              const several=p.exposureColumns??[],taken=new Set([p.outcome,p.exposure.column,...p.adjust.flatMap(t=>[t.column,...(t.perModel??[])]),
                ...strataOf(p.strata),...(p.offset?[p.offset]:[])]);
              const offered=columns.filter(c=>!taken.has(c)||(several.includes(c)&&c!==p.exposure.column));
              if(!offered.length)return '';
              return `<fieldset class="field" id="reg-exposures"><legend class="field-label">Also fit, one model each, with</legend>`
                +``
                +offered.map(c=>`<label class="check"><input type="checkbox" value="${esc(c)}" data-reg-also="${esc(c)}" ${several.includes(c)?'checked':''}> ${esc(c)}</label>`).join('')
                +`</fieldset>`;})()
          :'')
        +`<span class="inspector-section">Adjusted for</span>`
        +(p.adjust.length?p.adjust.map(term=>`<div class="reg-term"><label class="field-label" for="reg-kind-${esc(term.column)}">${esc(term.column)} as</label>`
            +`<select id="reg-kind-${esc(term.column)}" data-reg-adjust-kind="${esc(term.column)}">${kinds(term.as)}</select>`
            +`<button type="button" class="button small" data-reg-adjust-remove="${esc(term.column)}">Remove</button></div>`
            // AN ADJUSTMENT THAT FOLLOWS THE SHIFT (experiment 185): with several models, model k may be adjusted for its
            // own column, the rain at its own lag beside the temperature at that lag. One choice per model, in view.
            +((p.exposureColumns?.length??0)>1
              ?`<label class="check"><input type="checkbox" data-reg-follow="${esc(term.column)}" ${term.perModel?'checked':''}> ${esc(term.column)} follows the shift: each model is adjusted for its own column</label>`
                +(term.perModel?p.exposureColumns!.map((exposure,k)=>`<div class="field"><label class="field-label" for="reg-follow-${esc(term.column)}-${k}">For the model of ${esc(exposure)}</label>`
                  +`<select id="reg-follow-${esc(term.column)}-${k}" data-reg-follow-column="${esc(term.column)}" data-reg-follow-model="${k}">`
                  +columns.map(c=>option(c,c,term.perModel![k]===c)).join('')+`</select></div>`).join(''):'')
              :'')).join('')
          :'<p class="muted">Nothing: the estimate is unadjusted.</p>')
        +`<div class="field"><label class="field-label" for="reg-adjust-add">Add a variable</label><select id="reg-adjust-add">${option('','Choose a column…',true)}`
          +columns.filter(c=>c!==p.outcome&&c!==p.exposure.column&&!p.adjust.some(t=>t.column===c)).map(c=>option(c,c,false)).join('')+`</select></div>`
        +(p.family==='poisson'
          // SEVERAL STRATA COLUMNS TOGETHER (experiment 182): each chosen column gets its own select, and one more is
          // offered empty, so municipality, year and month are three choices in a row. The first keeps its saved id.
          ?(()=>{const chosen=strataOf(p.strata);
            return [...chosen,''].map((c,i)=>columnSelect(i===0?'reg-strata':`reg-strata-${i+1}`,
              i===0?'Strata, as fixed effects':'Together with',c||undefined,i===0?'None':'Nothing more')).join('')
              +(chosen.length>1?`<p class="description">One stratum for each combination of ${chosen.map(esc).join(', ')}: rows are compared only within it.</p>`:'');})()
            +columnSelect('reg-offset','Offset (log of person-time or population)',p.offset,'None'):'')
        +`<div class="field"><label class="field-label" for="reg-errors">Intervals</label><select id="reg-errors">`
          +option('profile','Likelihood-ratio (profile)',p.errors==='profile')+option('wald','Wald, from the model',p.errors==='wald')
          +(p.family==='poisson'?option('overdispersed','Wald, scaled for overdispersion',p.errors==='overdispersed')+option('hac','Wald, HAC (Newey-West) for serial correlation',p.errors==='hac'):'')
          +`</select></div>`
        +(p.errors==='hac'
          ?`<div class="field"><label class="field-label" for="reg-hac-lag">Lags</label><input id="reg-hac-lag" type="number" min="0" max="60" value="${esc(String(p.hacLag??0))}"></div>`
            +columnSelect('reg-order','Rows in the order of',p.order,'The table\'s order'):'')
        +'';
      return {settings,preview:regressionPreview(kit,nodeId,d,esc),
        ...(columns.length?{}:{message:{tone:'warning' as const,text:'Connect a table first: its columns are the choices here.'}})};
    },
    wire:(root,d,redraw)=>{
      const reg=(edit:(params:Draft)=>void)=>{edit(d);redraw();};
    root.querySelector<HTMLElement>('#reg-family')?.addEventListener('change',e=>reg(p=>{p.family=control(e).value as 'logistic'|'poisson';
      if(p.family==='logistic'){delete p.strata;delete p.offset;if(p.errors==='hac'||p.errors==='overdispersed')p.errors='profile';}}));
    root.querySelector<HTMLElement>('#reg-outcome')?.addEventListener('change',e=>reg(p=>{p.outcome=control(e).value;delete p.cases;delete p.controls;}));
    root.querySelectorAll<HTMLInputElement>('[data-reg-case],[data-reg-control]').forEach(el=>el.addEventListener('change',()=>reg(p=>{
      const key=el.dataset.regCase!==undefined?'cases':'controls',value=required(el.dataset.regCase??el.dataset.regControl);
      const list=(p[key]??[]).filter(v=>v!==value);if(el.checked)list.push(value);
      if(list.length)p[key]=list;else delete p[key];})));
    root.querySelector<HTMLElement>('#reg-exposure')?.addEventListener('change',e=>reg(p=>{const column=control(e).value,held=kit.shape(nodeId)[column];
      p.exposure={column,as:held&&orderOf(held)==='number'&&held.length>2?'numeric':held?'categorical':'numeric'};
      p.adjust=p.adjust.filter(t=>t.column!==p.exposure.column);
      if(p.exposureColumns){const also=p.exposureColumns.slice(1).filter(c=>c!==column);
        if(also.length)p.exposureColumns=[column,...also];else delete p.exposureColumns;}}));
    root.querySelectorAll<HTMLInputElement>('[data-reg-also]').forEach(el=>el.addEventListener('change',()=>reg(p=>{
      const also=[...root.querySelectorAll<HTMLInputElement>('[data-reg-also]:checked')].map(b=>b.value)
        .filter(c=>c!==p.exposure.column);
      if(also.length)p.exposureColumns=[p.exposure.column,...also];else delete p.exposureColumns;
      // An adjustment that follows the shift keeps one column per model: refilled in Relate's order, or dropped with the
      // list.
      const held=Object.keys(kit.shape(nodeId)),shiftless=(c:string)=>c.replace(/_[+-]?\d+d$/,'');
      p.adjust=p.adjust.map(t=>{if(!t.perModel)return t;const {perModel,...rest}=t;
        if(!p.exposureColumns)return {...rest,column:perModel[0]!};
        const family=held.filter(c=>shiftless(c)===shiftless(t.column)&&/_[+-]?\d+d$/.test(c));
        return {...rest,perModel:p.exposureColumns.map((_c,k)=>perModel[k]??family[k]??t.column)};});})));
    root.querySelector<HTMLElement>('#reg-exposure-as')?.addEventListener('change',e=>reg(p=>{p.exposure={column:p.exposure.column,as:control(e).value as 'numeric'};}));
    root.querySelector<HTMLElement>('#reg-exposure-reference')?.addEventListener('change',e=>reg(p=>{p.exposure={...p.exposure,reference:control(e).value};}));
    // A COLUMN OF NUMBERS IS ADDED AS NUMERIC, as R treats a numeric column; anything else as categorical. Changed by a
    // click either way.
    root.querySelector<HTMLElement>('#reg-adjust-add')?.addEventListener('change',e=>{
      const column=control(e).value,held=kit.shape(nodeId)[column];
      const as=held&&orderOf(held)==='number'?'numeric' as const:held?'categorical' as const:'numeric' as const;
      reg(p=>{if(column&&!p.adjust.some(t=>t.column===column))p.adjust=[...p.adjust,{column,as}];});});
    root.querySelectorAll<HTMLSelectElement>('[data-reg-adjust-kind]').forEach(el=>el.addEventListener('change',()=>reg(p=>{
      p.adjust=p.adjust.map(t=>t.column===el.dataset.regAdjustKind?{column:t.column,as:el.value as 'numeric'}:t);})));
    // FOLLOWING THE SHIFT, pre-filled in Relate's order: the columns that share this one's name without its shift, the
    // k-th for model k. Each is a choice in view, and can be changed.
    root.querySelectorAll<HTMLInputElement>('[data-reg-follow]').forEach(el=>el.addEventListener('change',()=>reg(p=>{
      const column=required(el.dataset.regFollow),models=p.exposureColumns??[];
      const held=Object.keys(kit.shape(nodeId)),base=column.replace(/_[+-]?\d+d$/,'');
      const family=held.filter(c=>c.replace(/_[+-]?\d+d$/,'')===base&&/_[+-]?\d+d$/.test(c));
      p.adjust=p.adjust.map(t=>{if(t.column!==column)return t;const {perModel:_,...rest}=t;
        return el.checked?{...rest,perModel:models.map((_m,k)=>family[k]??column)}:rest;});})));
    root.querySelectorAll<HTMLSelectElement>('[data-reg-follow-column]').forEach(el=>el.addEventListener('change',()=>reg(p=>{
      const k=Number(el.dataset.regFollowModel);
      p.adjust=p.adjust.map(t=>{if(t.column!==el.dataset.regFollowColumn||!t.perModel)return t;
        const perModel=[...t.perModel];perModel[k]=el.value;return {...t,column:perModel[0]!,perModel};});})));
    root.querySelectorAll<HTMLButtonElement>('[data-reg-adjust-remove]').forEach(el=>el.addEventListener('click',()=>reg(p=>{
      p.adjust=p.adjust.filter(t=>t.column!==el.dataset.regAdjustRemove);})));
    root.querySelectorAll<HTMLSelectElement>('[id^="reg-strata"]').forEach(el=>el.addEventListener('change',()=>reg(p=>{
      const at=el.id==='reg-strata'?0:Number(el.id.slice('reg-strata-'.length))-1,list=strataOf(p.strata);
      if(el.value)list[at]=el.value;else list.splice(at);
      const clean=list.filter((c,i)=>c&&list.indexOf(c)===i);
      if(!clean.length)delete p.strata;else p.strata=clean.length===1?clean[0]!:clean;})));
    for(const [id,key] of [['#reg-offset','offset'],['#reg-order','order']] as const)
      root.querySelector<HTMLElement>(id)?.addEventListener('change',e=>reg(p=>{const v=control(e).value;if(v)p[key]=v;else delete p[key];}));
    root.querySelector<HTMLElement>('#reg-errors')?.addEventListener('change',e=>reg(p=>{p.errors=control(e).value as 'profile';}));
    root.querySelector<HTMLElement>('#reg-hac-lag')?.addEventListener('change',e=>reg(p=>{p.hacLag=Math.max(0,Math.round(Number(control(e).value)||0));}));
    },
    apply:d=>{kit.change(w=>{const t=w.nodes.find(x=>x.id===nodeId);if(t?.type==='regression')t.params=d;});},
  },esc);
}

const configure='<div class="inspector-actions"><button id="configure-step" class="button primary">Configure\u2026</button></div>';
const sentence=(kit:StepKit,text:string)=>`<p class="standard-sentence">${kit.esc(text)}</p>`+configure;
const said=(kit:TableStepKit,id:string,ran:string|undefined,warn=false)=>{const why=kit.unfinished(id);
  return `<p class="standard-result${why||warn?' standard-result-warning':''}">${kit.esc(why?`The last run could not compute this step: ${why}`:ran??'Not run yet.')}</p>`;};
const nodeIn=<T extends NodeType>(kit:StepKit,n:WorkflowNode<T>)=>kit.workflow().nodes.find(x=>x.id===n.id) as WorkflowNode<T>|undefined;
export const regressionInspector:OwnInspector<'regression'>={
  markup:(n,kit)=>{const k=kit as TableStepKit,p=n.params;
    return kit.section('Name',kit.name('regression-label',p.label||k.title('regression')))+kit.section('Inputs',kit.inputs(n))
      +kit.section('Settings',sentence(k,regressionPlan(p)))+kit.section('Result',said(k,n.id,k.receipt(n.id)?.method));},
  wire:(n,kit,root)=>{root.querySelector('#configure-step')?.addEventListener('click',()=>openRegressionConfig(kit as TableStepKit,n.id));},
};
export const selectRowsInspector:OwnInspector<'select_rows'>={
  // The column, the values or the range, and the preview of what they keep are in Configure…; here, one sentence of what
  // the step keeps and what the last run kept.
  markup:(n,kit)=>{const k=kit as TableStepKit,p=n.params;
    const receipt=k.receipt(n.id) as unknown as {kept?:number;dropped?:number;absent?:string[]}|undefined,absent=receipt?.absent??[];
    const line=receipt&&typeof receipt.kept==='number'
      ?`${receipt.kept.toLocaleString()} of ${(receipt.kept+(receipt.dropped??0)).toLocaleString()} rows kept; `
        +`${(receipt.dropped??0).toLocaleString()} left out.`+(absent.length?` Not in the table: ${absent.join(', ')}.`:''):undefined;
    return kit.section('Name',kit.name('select-label',p.label||'Select rows by value'))
      +kit.section('Inputs',kit.inputs(n,{records:'Table to choose rows from'}))
      +kit.section('Settings',sentence(k,selectSentence(p)))
      +kit.section('Result',said(k,n.id,line,absent.length>0)+'<div data-standard-result></div>');},
  wire:(n,kit,root)=>{const k=kit as TableStepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{const node=nodeIn(k,n);if(!node)return;
      const table=k.tableOn(n.id,'records');
      openSelectConfig({step:node.params.label||k.title('select_rows'),sourceLabel:k.sourceName(n.id,'records','the table'),
        shape:k.shape(n.id),...(table?{table}:{}),initial:selectDraftOf(node.params),
        apply:draft=>{k.keep(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='select_rows')applySelectDraft(t.params,draft);});},
      },kit.esc);});},
};
export const groupTableInspector:OwnInspector<'group_table'>={
  // What is kept, the aggregate, empty cells and shares are in Configure…; here, one sentence of what the step totals and
  // what the last run made.
  markup:(n,kit)=>{const k=kit as TableStepKit,p=n.params,receipt=k.receipt(n.id) as unknown as {method?:string;gaps?:unknown[]}|undefined;
    return kit.section('Name',kit.name('group-label',p.label||'Total within groups'))
      +kit.section('Inputs',kit.inputs(n,{records:'Table to total'}))
      +kit.section('Settings',sentence(k,groupSentence(p)))
      +kit.section('Result',said(k,n.id,receipt?.method?`${receipt.method}.`:undefined,!!receipt?.gaps?.length)+'<div data-standard-result></div>');},
  wire:(n,kit,root)=>{const k=kit as TableStepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{const node=nodeIn(k,n);if(!node)return;
      const table=k.tableOn(n.id,'records');
      openGroupConfig({step:node.params.label||k.title('group_table'),sourceLabel:k.sourceName(n.id,'records','the table'),
        columns:table?.keys??Object.keys(k.shape(n.id)),valueField:table?.valueField??k.valueField(n.id),...(table?{table}:{}),
        initial:groupDraftOf(node.params),
        apply:draft=>{k.keep(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='group_table')applyGroupDraft(t.params,draft);});},
      },kit.esc);});},
};
export const twoByTwoInspector:OwnInspector<'two_by_two'>={
  markup:(n,kit)=>{const k=kit as TableStepKit,p=n.params;
    return kit.section('Name',kit.name('twobytwo-label',p.label||k.title('two_by_two')))+kit.section('Inputs',kit.inputs(n))
      +kit.section('Settings',sentence(k,twoByTwoSettingsSentence(p)))+kit.section('Result',said(k,n.id,k.receipt(n.id)?.method));},
  wire:(n,kit,root)=>{const k=kit as TableStepKit;
    root.querySelector('#configure-step')?.addEventListener('click',()=>{const node=nodeIn(k,n);if(!node)return;
      const shape=k.shape(n.id),table=k.tableOn(n.id,'records');
      openTwoByTwoConfig({step:node.params.label||k.title('two_by_two'),sourceLabel:k.sourceName(n.id,'records','the table'),
        values:table?Object.fromEntries(table.keys.map(c=>[c,[...new Set(table.rows.map(r=>r.key[c]??'').filter(Boolean))].sort()])):shape,
        exposuresOffered:d=>k.exposuresOffered(n.id,shape,{outcomeColumn:d.outcomeColumn,exposed:d.exposed,unexposed:d.unexposed}),
        table,initial:twoByTwoDraftOf(node.params),
        apply:d=>{k.keep(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type==='two_by_two')applyTwoByTwoDraft(t.params,d);});},
      },kit.esc);});},
};
export const TABLE_STEP_INSPECTORS={regression:regressionInspector,select_rows:selectRowsInspector,
  group_table:groupTableInspector,two_by_two:twoByTwoInspector} as const;
