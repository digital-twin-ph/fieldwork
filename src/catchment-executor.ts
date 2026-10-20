import {isochrone,ISOCHRONE_MEASURED_NODES} from './catchments.js';
import type {Network,Polygons} from './catchments.js';
import type {PointCollection,ParamsByType} from './types.js';
/** The whole operation's budget. */
export const ISOCHRONE_TIMEOUT_MS=45_000;
/** How long to wait for the worker's first message before concluding it never started. A worker
 *  that fails to load -- a missing build file, a syntax error in a chunk -- does not reliably fire
 *  `onerror`, and before this it showed up as a 45-second wait.
 *
 *  This is deliberately only a BOOT check. A worker reclaimed for memory part-way through also goes
 *  quiet, and a watchdog that kept running would have to tell that silence apart from a long
 *  synchronous computation, which from outside looks identical. An earlier draft of this file ran
 *  the watchdog throughout and would have killed a healthy ten-second isochrone after four
 *  seconds. Telling the two apart needs the search broken into steps: the blocker
 *  `isochrone-does-not-scale`. */
export const BOOT_MS=4_000;
/** One disposable Worker per operation; failure never returns partial polygons. */
export function computeIsochrone(sites:PointCollection,network:Network,params:ParamsByType['isochrone']):Promise<Polygons>{
  if(typeof Worker==='undefined')return Promise.resolve(isochrone(sites,network,params));
  return new Promise((resolve,reject)=>{
    const worker=new Worker('./build/catchment-worker.js');
    const size=`${network.nodes.length} junctions and ${network.edges.length} segments`;
    // Above the measured ceiling, memory is the likeliest cause of a run that does not come back,
    // so the timeout says so instead of blaming time alone.
    const large=network.nodes.length>ISOCHRONE_MEASURED_NODES;
    const finish=()=>{clearTimeout(timer);clearTimeout(boot);worker.terminate();};
    const boot=setTimeout(()=>{finish();reject(new Error(
      'The isochrone worker did not start, so nothing was computed. Reload the page; if it '
      +'persists, the offline cache may be incomplete.'));},BOOT_MS);
    const timer=setTimeout(()=>{finish();reject(new Error(
      `The isochrone did not finish within ${ISOCHRONE_TIMEOUT_MS/1000} seconds on a network of ${size}`
      +(large?`, which is above the ${ISOCHRONE_MEASURED_NODES}-junction size this has been measured at. `
        +`A graph this large can also exhaust the browser's memory, which looks the same from here. `
        +`Lower the graph limit on the Street network widget`
        :`. Reduce the sites or the time budget`)
      +'. Nothing was changed.'));},ISOCHRONE_TIMEOUT_MS);
    worker.onmessage=({data}:MessageEvent<{value?:Polygons;error?:string;alive?:boolean}>)=>{
      if(data.alive){clearTimeout(boot);return;}
      finish();
      if(data.error||!data.value)reject(new Error(data.error||'Missing catchment result.'));
      else resolve(data.value);
    };
    worker.onerror=()=>{finish();reject(new Error(`The isochrone worker failed on a network of ${size}.`));};
    worker.postMessage({sites,network,params});
  });
}
