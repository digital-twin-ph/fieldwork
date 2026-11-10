/** PROGRESS WITHIN A STEP, for steps that take minutes: Sample satellite files at points or over areas reads a file at
 *  a time, and a year of MODIS over Rio de Janeiro state is 180 files and four minutes. The practitioner, 2026-11-06:
 *  *"For long running jobs with sample satellite files over point or area we need an animation on screen to indicate
 *  to the user that processing is ongoing."* The run reports here; the page draws it. No imports, so a step can report
 *  without knowing how it is shown. */
export interface RunDetail {nodeId:string; label:string; done:number; of:number; what:string;
  /** What is being done to them, "Reading" where not said: the space-time scan is shuffling dates, not reading files. */
  verb?:string}
type Listener=(detail:RunDetail|null)=>void;
const listeners=new Set<Listener>();
export function onRunDetail(listener:Listener):()=>void{listeners.add(listener);return ()=>{listeners.delete(listener);};}
export function runDetail(detail:RunDetail|null):void{for(const l of listeners)l(detail);}
