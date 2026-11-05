/** A WORKED EXAMPLE'S MANUAL: how to build each of its workflows by hand, step by step.
 *
 *  The practitioner, 2026-11-04: *"worked examples should come with a Manual tab that lays out step by step how to
 *  build the workflows by hand. This should complement the Play Back Build for each workflow."* Experiment 173.
 *
 *  The manual is data the example's repository publishes, pinned by digest like the project, and written by whoever
 *  built the example. The same file is what that example's from-scratch browser test performs, step by step, checking
 *  that every label it names is the label on screen. So a manual that stops matching the application fails a test
 *  rather than going quietly wrong. This module reads, checks and words it; it performs nothing.
 *
 *  Steps name nodes by a short handle (`as`) the manual gives them, because a node's id is minted when it is added and
 *  cannot be known when the manual is written. */
export const MANUAL_SCHEMA='fieldwork/worked-example-manual/1';

export type ManualStep=
  | {add:string; as:string}
  /** A node another workflow of this project already holds, added from the library's *From this project* group: the
   *  same data and settings, nothing fetched or set up again. The practitioner, 2026-11-04: *"The duplication is
   *  specific to a widget if that widget gets used again in a different workflow in the same project."* */
  | {reuse:string; from:string; as:string}
  | {select:string}
  | {connect:{from:string; to:string; port:string}}
  | {click:string; label:string; view?:ManualView; dialog?:string; opens?:string}
  | {fill:string; label:string; value:string; in?:string; view?:ManualView; dialog?:string}
  | {choose:string; label:string; value:string; shown?:string; in?:string; view?:ManualView; dialog?:string}
  | {tick:string; label:string; values:string[]; dialog?:string}
  /** Several options of one list, named as the reader sees them: the boroughs among a level's units. */
  | {pick:string; label:string; values:string[]; dialog?:string}
  | {keyRole:string; value:'primary'|'secondary'|''; shown:string; dialog?:string}
  | {run:true}
  | {see:string; check?:string}
  | {note:string};

/** The tab a step happens in, when it is not the canvas. Named as the tab reads. */
export type ManualView='project'|'workflow'|'results'|'notes';
const VIEW_NAMES:Record<ManualView,string>={project:'Project',workflow:'Workflow',results:'Results',notes:'Notes'};

export interface ManualWorkflow {name:string; question?:string; steps:ManualStep[]}
export interface WorkedExampleManual {schema:string; example:string; intro?:string; workflows:ManualWorkflow[]}

const KINDS=['add','reuse','select','connect','click','fill','choose','tick','pick','keyRole','run','see','note'] as const;
const kindOf=(step:ManualStep):string=>KINDS.find(kind=>kind in step)??'';

/** Refuses a manual that could not be followed: an unknown step, a node named before it is added, a handle used
 *  twice. A refusal names the workflow and the step number a reader would see. */
export function validateManual(value:unknown):WorkedExampleManual{
  const manual=value as WorkedExampleManual;
  if(manual?.schema!==MANUAL_SCHEMA)throw new Error(`This is not a worked example manual (${MANUAL_SCHEMA}).`);
  if(!Array.isArray(manual.workflows)||!manual.workflows.length)throw new Error('The manual describes no workflow.');
  for(const workflow of manual.workflows){
    const added=new Set<string>();
    workflow.steps.forEach((step,index)=>{
      const where=`"${workflow.name}", step ${index+1}`;
      const kind=kindOf(step);
      if(!kind)throw new Error(`${where} is not a step this manual knows.`);
      const named=(handle:string)=>{if(!added.has(handle))throw new Error(`${where} names "${handle}" before it is added.`);};
      if('add' in step||'reuse' in step){if(added.has(step.as))throw new Error(`${where} adds a second "${step.as}".`);added.add(step.as);}
      if('select' in step)named(step.select);
      if('connect' in step){named(step.connect.from);named(step.connect.to);}
      if(('fill' in step||'choose' in step)&&step.in)named(step.in);
    });
  }
  return manual;
}

const bold=(text:string,esc:(s:string)=>string)=>`<strong>${esc(text)}</strong>`;

/** One step, as a sentence a practitioner follows. `title` names a widget as the library does. */
export function stepSentence(step:ManualStep,types:Record<string,string>,title:(type:string)=>string,
    esc:(s:string)=>string,{sameDialog=false}:{sameDialog?:boolean}={}):string{
  const node=(handle:string)=>bold(title(types[handle]??handle),esc);
  const where=(handle?:string)=>handle?` in ${node(handle)}`:'';
  // WHERE IT HAPPENS: a dialog when there is one, which is nearer than the tab behind it.
  // Named where it changes, not on every step inside it: ten steps in one dialog say so once.
  const tab=('dialog' in step&&step.dialog)?(sameDialog?'':`In the ${bold(step.dialog,esc)} dialog, `)
    :('view' in step&&step.view)?`In ${bold(VIEW_NAMES[step.view],esc)}, `:'';
  const sentence=(text:string)=>tab?tab+text.charAt(0).toLowerCase()+text.slice(1):text;
  // THE LIBRARY'S SEARCH, named in every add: the practitioner, 2026-11-04, *"so users while building by hand and
  // following the manual can zero in on the right widgets right away."* Named as the box reads.
  if('add' in step)return `Add ${bold(title(step.add),esc)}: type its name in ${bold('Find a node…',esc)} above the `
    +'library, then click it.';
  if('reuse' in step)return `Under ${bold('From this project',esc)} in the library, add the ${bold(title(step.reuse),esc)} `
    +`of “${esc(step.from)}”. It keeps that workflow's table and settings, so nothing is fetched or set up again.`;
  if('select' in step)return `Select ${node(step.select)} on the canvas.`;
  if('connect' in step)return `Connect the output of ${node(step.connect.from)} to the <em>${esc(step.connect.port)}</em> `
    +`input of ${node(step.connect.to)}.`;
  if('click' in step)return sentence(`Press ${bold(step.label,esc)}.${step.opens?` The ${esc(step.opens)} dialog opens.`:''}`);
  // A VALUE TO TYPE CAN BE COPIED. The practitioner, 2026-11-04: *"whenever there is an opportunity to copy and paste
  // instead of typing we should offer it for labels, titles, subjects, URLs like the Zenodo one."*
  if('fill' in step)return sentence(`Set ${bold(step.label,esc)}${where(step.in)} to <code>${esc(step.value)}</code>`
    +`<button type="button" class="manual-copy" data-copy="${esc(step.value)}" aria-label="Copy ${esc(step.label)}">Copy</button>.`);
  if('choose' in step)return sentence(`For ${bold(step.label,esc)}${where(step.in)}, choose ${bold(step.shown??step.value,esc)}.`);
  if('tick' in step)return sentence(`Under ${bold(step.label,esc)}, keep only ${step.values.map(v=>`<code>${esc(v)}</code>`).join(', ')}.`);
  if('pick' in step)return sentence(`Under ${bold(step.label,esc)}, choose ${step.values.map(v=>bold(v,esc)).join(', ')}. `
    +'Hold Ctrl, or \u2318 on a Mac, to choose more than one.');
  if('keyRole' in step)return sentence(`Make <code>${esc(step.keyRole)}</code> a ${bold(step.shown,esc)}.`);
  if('run' in step)return `Press ${bold('Run workflow',esc)}.`;
  if('see' in step)return `You should see ${esc(step.see)}.`;
  return esc(step.note);
}

/** The whole manual as HTML, the open workflow's section first and marked. */
/** A step's key in the practitioner's progress: its workflow's and its own position in the file. Positions rather than
 *  text, so rewording a step keeps its tick; a manual that adds or removes steps moves later ticks, which is why the
 *  progress is kept per manual digest and starts over when the manual changes. */
export const stepKey=(workflowIndex:number,stepIndex:number)=>`${workflowIndex}:${stepIndex}`;

/** The first step not yet done, in file order, for resuming where the practitioner left off. */
export function firstUndone(manual:WorkedExampleManual,done:ReadonlySet<string>):string|undefined{
  for(const [w,workflow] of manual.workflows.entries())
    for(const [i,step] of workflow.steps.entries())
      if(!('note' in step)&&!done.has(stepKey(w,i)))return stepKey(w,i);
  return undefined;
}

export function renderManual(manual:WorkedExampleManual,openName:string|undefined,
    title:(type:string)=>string,esc:(s:string)=>string,done:ReadonlySet<string>=new Set()):string{
  const ordered=[...manual.workflows.entries()].sort(([,a],[,b])=>Number(b.name===openName)-Number(a.name===openName));
  return (manual.intro?`<p class="description">${esc(manual.intro)}</p>`:'')
    +ordered.map(([w,workflow])=>{
      const types:Record<string,string>={};
      for(const step of workflow.steps){if('add' in step)types[step.as]=step.add;if('reuse' in step)types[step.as]=step.reuse;}
      // Notes are prose between steps, so they are not numbered: the numbers count what you do.
      let n=0,dialog:string|undefined;
      const items=workflow.steps.map((step,i)=>{
        if('note' in step)return `<p class="manual-note">${stepSentence(step,types,title,esc)}</p>`;
        const here='dialog' in step?step.dialog:undefined,sameDialog=!!here&&here===dialog;dialog=here;
        const key=stepKey(w,i),ticked=done.has(key);
        return `<li value="${++n}" class="manual-step${'see' in step?' manual-see':''}${ticked?' done':''}" data-step="${key}" `
          +`tabindex="0" aria-pressed="${ticked}" title="${ticked?'Done. Click to mark not done.':'Click when done.'}">`
          +`${stepSentence(step,types,title,esc,{sameDialog})}</li>`;
      });
      // A run of numbered steps is one list; a note closes it and the next step opens another, numbered on.
      let html='',open=false;
      for(const item of items){
        const isStep=item.startsWith('<li');
        if(isStep&&!open){html+='<ol class="manual-steps">';open=true;}
        if(!isStep&&open){html+='</ol>';open=false;}
        html+=item;
      }
      if(open)html+='</ol>';
      return `<section class="manual-workflow${workflow.name===openName?' open':''}" data-manual-workflow="${esc(workflow.name)}">`
        +`<h3>${esc(workflow.name)}${workflow.name===openName?' <span class="pill">Open now</span>':''}</h3>`
        +(workflow.question?`<p class="muted">${esc(workflow.question)}</p>`:'')+html+'</section>';
    }).join('');
}
