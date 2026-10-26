/** How often each widget has actually been RUN, in this browser.
 *
 *  The practitioner's definition, 2026-10-26: *"use is defined as widget connected to another
 *  and run in a workflow, that's a use instance, regardless of whether it's in a worked example,
 *  a user developed one or an imported one."* So an appearance in a shipped template is not a
 *  use, and `npm run usage:widgets` answers a different question -- which node types some
 *  example instantiates.
 *
 *  The data was already there and discarded: every `WorkflowRun` carries a `trace` of the nodes
 *  that executed, with their types, and `app.ts` read it for a summary line and dropped it. This
 *  accumulates it, and nothing else.
 *
 *  WHAT IT CANNOT TELL YOU, and the limit is the practitioner's own, stated so that no reader
 *  mistakes the number for more than it is: *"since the app is browser based and does not
 *  include what other browsers do, the use stats is only good for that one specific browser for
 *  that one specific user."* Not this person's use -- their second browser keeps its own tally,
 *  and a cleared store starts again at zero. Certainly not the field's. It answers "do I use
 *  this, here", which is enough to decide whether a widget earns its place on this machine and
 *  is not evidence about anybody else's.
 *
 *  Local by construction. Nothing is sent: this application runs offline and a count that phoned
 *  home would contradict the premise it is built on. */
const KEY='fieldwork-widget-runs-v1';

export interface WidgetRuns {runs:number; lastRunAt:string}
export type RunTally=Record<string,WidgetRuns>;

const read=():RunTally=>{
  try{
    const raw=localStorage.getItem(KEY);
    const parsed=raw?JSON.parse(raw) as unknown:null;
    if(!parsed||typeof parsed!=='object')return {};
    const out:RunTally={};
    for(const [type,value] of Object.entries(parsed as Record<string,unknown>)){
      const v=value as {runs?:unknown;lastRunAt?:unknown};
      if(typeof v?.runs==='number'&&Number.isFinite(v.runs)&&v.runs>=0)
        out[type]={runs:Math.floor(v.runs),lastRunAt:typeof v.lastRunAt==='string'?v.lastRunAt:''};
    }
    return out;
  }catch{return {};}
};

/** Every type that executed, counted once per run rather than once per node.
 *
 *  A workflow with three map outputs is one use of `map_output` on that run: the question is
 *  whether the widget was used, not how many copies were on the canvas. Counting nodes would
 *  make a habit of duplicating a step look like evidence of its worth. */
export function recordRun(trace:readonly {type:string}[],at=new Date().toISOString()):RunTally{
  const tally=read();
  for(const type of new Set(trace.map(step=>step.type))){
    const held=tally[type]??{runs:0,lastRunAt:''};
    tally[type]={runs:held.runs+1,lastRunAt:at};
  }
  try{localStorage.setItem(KEY,JSON.stringify(tally));}catch{/* a full store loses a count, not a run */}
  return tally;
}

export const widgetRuns=():RunTally=>read();
export const runsFor=(nodeType:string):WidgetRuns|undefined=>read()[nodeType];
/** Cleared with the rest of this browser's Fieldwork data, and on request. */
export const forgetRuns=():void=>{try{localStorage.removeItem(KEY);}catch{/* nothing to forget */}};
