import {isochrone} from './catchments.js';
import type {Network} from './catchments.js';
import type {PointCollection,ParamsByType} from './types.js';
const scope=self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage=({data}:MessageEvent<{sites:PointCollection;network:Network;params:ParamsByType['isochrone']}>)=>{
  // Posted before any work, so the executor can tell a worker that never loaded from one that is
  // busy. A timer would be useless here: the computation is synchronous, so setInterval inside this
  // worker cannot fire until the work is already over.
  scope.postMessage({alive:true});
  try{
    scope.postMessage({value:isochrone(data.sites,data.network,data.params,
      (done,total)=>scope.postMessage({alive:true,done,total}))});
  }catch(error){scope.postMessage({error:error instanceof Error?error.message:'Isochrone computation failed.'});}
};
