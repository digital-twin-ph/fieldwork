/** Shared browser-origin pacing for public OSM acquisition. Never queues retries. */

/** The minimum pause between requests, and a floor rather than a value: nothing in this module can
 *  produce a shorter one, so a practitioner can be more respectful of the service but not less. */
export const OSM_PAUSE_MS=60_000;
/** Added to the pause for each megabyte actually received, so a request pays for what it took.
 *  A 7.4 MB extent -- the largest a shipped example needs -- earns about a 3.7 minute pause, while
 *  the 1.4 MB ordinary case stays at the 60-second floor. */
export const OSM_PAUSE_PER_MB_MS=30_000;
/** No single response should be able to lock the button for longer than this. */
export const OSM_PAUSE_MAX_MS=900_000;
/** The pause a response has earned: the floor, the volume charge, and whatever the practitioner
 *  asked for, whichever is longest. Raising `chosenMs` is always allowed; lowering it below the
 *  floor has no effect, which is the point. */
export function earnedPause(bytes:number,chosenMs=0):number{
  const volume=Number.isFinite(bytes)&&bytes>0?(bytes/1e6)*OSM_PAUSE_PER_MB_MS:0;
  return Math.min(OSM_PAUSE_MAX_MS,Math.max(OSM_PAUSE_MS,volume,Number.isFinite(chosenMs)?chosenMs:0));
}
const key='fieldwork-osm-next-request-at';
let nextAllowed=0,inFlight=false;
function readDeadline(){try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved))nextAllowed=Math.max(nextAllowed,saved);}catch{/* Node tests and unavailable storage use this session's guard. */}return nextAllowed;}
function writeDeadline(value:number){nextAllowed=Math.max(readDeadline(),value);try{localStorage.setItem(key,String(nextAllowed));}catch{/* Session pacing still applies. */}}
/** Clears the pacing deadline. Exists so that automated checks are independent of each other:
 *  without it, the first test to make a paced request decides whether the next one is allowed to
 *  run, and a suite would pass or fail on its own ordering. Not reachable from the interface,
 *  because waiting is the point of the pacing. */
export function resetNetworkPacing(){nextAllowed=0;inFlight=false;try{localStorage.removeItem(key);}catch{/* Nothing stored to clear. */}}
export function networkDownloadStatus(now=Date.now()){return {inFlight,waitSeconds:Math.max(0,Math.ceil((readDeadline()-now)/1000))};}
export function deferNetworkDownload(retryAfter:string|null,now=Date.now()){
  const seconds=retryAfter!==null&&/^\d+$/.test(retryAfter)?Number(retryAfter):NaN,date=retryAfter?Date.parse(retryAfter):NaN;
  const requested=Number.isFinite(seconds)?now+seconds*1000:Number.isFinite(date)?date:now+OSM_PAUSE_MS;
  writeDeadline(Math.max(now+OSM_PAUSE_MS,requested));
}
/** The pause to recommend before a download of a given size, in whole seconds. It is simply the
 *  pause that size will earn anyway, surfaced in advance so a practitioner can set the knob rather
 *  than discover the wait afterwards. Rounded up, so the advice is never shorter than the charge.
 *
 *  | up to 2 MB | 60 s, the floor |
 *  | 4 MB | 120 s |
 *  | 8 MB | 240 s |
 *  | 16 MB | 480 s |
 *  | 30 MB and over | 900 s, the ceiling | */
export const recommendedPauseSeconds=(bytes:number):number=>Math.ceil(earnedPause(bytes)/1000);

/** Charges a completed download against the shared pause. Called once the response size is known,
 *  which is after the body has been read, so it raises the deadline the paced wrapper already set
 *  rather than replacing it -- `writeDeadline` keeps whichever is later. */
export function chargeNetworkDownload(bytes:number,chosenMs=0,now=Date.now()){
  writeDeadline(now+earnedPause(bytes,chosenMs));
}
export async function pacedNetworkDownload<T>(action:()=>Promise<T>):Promise<T>{
  async function run(){const state=networkDownloadStatus();if(inFlight)throw new Error('An OSM request is already running. Wait for it to finish.');if(state.waitSeconds)throw new Error(`Please wait ${state.waitSeconds} seconds before another OSM request. Saved networks remain available offline.`);inFlight=true;writeDeadline(Date.now()+OSM_PAUSE_MS);try{return await action();}finally{inFlight=false;writeDeadline(Date.now()+OSM_PAUSE_MS);}}
  if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request('fieldwork-osm-download',{ifAvailable:true},lock=>{if(!lock)throw new Error('Another Fieldwork tab is downloading from OSM. Wait for it to finish.');return run();});
  return run();
}
