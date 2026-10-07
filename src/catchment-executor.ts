import {isochrone} from './catchments.js';
import type {Network,Polygons} from './catchments.js';
import type {PointCollection,ParamsByType} from './types.js';
/** One disposable Worker per operation; failure never returns partial polygons. */
export function computeIsochrone(sites:PointCollection,network:Network,params:ParamsByType['isochrone']):Promise<Polygons>{
  if(typeof Worker==='undefined')return Promise.resolve(isochrone(sites,network,params));
  return new Promise((resolve,reject)=>{const worker=new Worker('./build/catchment-worker.js'),timer=setTimeout(()=>{worker.terminate();reject(new Error('Isochrone exceeded 45 seconds. Reduce sites, network size or time budget.'));},45000);
    const finish=()=>{clearTimeout(timer);worker.terminate();};
    worker.onmessage=({data}:MessageEvent<{value?:Polygons;error?:string}>)=>{finish();if(data.error||!data.value)reject(new Error(data.error||'Missing catchment result.'));else resolve(data.value);};
    worker.onerror=()=>{finish();reject(new Error('Isochrone worker failed.'));};worker.postMessage({sites,network,params});
  });
}
