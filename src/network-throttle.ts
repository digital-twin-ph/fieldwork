/** Shared browser-origin pacing for public OSM acquisition. Never queues retries. */
export const OSM_PAUSE_MS=60_000;
const key='fieldwork-osm-next-request-at';
let nextAllowed=0,inFlight=false;
function readDeadline(){try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved))nextAllowed=Math.max(nextAllowed,saved);}catch{/* Node tests and unavailable storage use this session's guard. */}return nextAllowed;}
function writeDeadline(value:number){nextAllowed=Math.max(readDeadline(),value);try{localStorage.setItem(key,String(nextAllowed));}catch{/* Session pacing still applies. */}}
export function networkDownloadStatus(now=Date.now()){return {inFlight,waitSeconds:Math.max(0,Math.ceil((readDeadline()-now)/1000))};}
export function deferNetworkDownload(retryAfter:string|null,now=Date.now()){
  const seconds=retryAfter!==null&&/^\d+$/.test(retryAfter)?Number(retryAfter):NaN,date=retryAfter?Date.parse(retryAfter):NaN;
  const requested=Number.isFinite(seconds)?now+seconds*1000:Number.isFinite(date)?date:now+OSM_PAUSE_MS;
  writeDeadline(Math.max(now+OSM_PAUSE_MS,requested));
}
export async function pacedNetworkDownload<T>(action:()=>Promise<T>):Promise<T>{
  async function run(){const state=networkDownloadStatus();if(inFlight)throw new Error('An OSM request is already running. Wait for it to finish.');if(state.waitSeconds)throw new Error(`Please wait ${state.waitSeconds} seconds before another OSM request. Saved networks remain available offline.`);inFlight=true;writeDeadline(Date.now()+OSM_PAUSE_MS);try{return await action();}finally{inFlight=false;writeDeadline(Date.now()+OSM_PAUSE_MS);}}
  if(typeof navigator!=='undefined'&&navigator.locks)return navigator.locks.request('fieldwork-osm-download',{ifAvailable:true},lock=>{if(!lock)throw new Error('Another Fieldwork tab is downloading from OSM. Wait for it to finish.');return run();});
  return run();
}
