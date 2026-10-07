import {isochrone} from './catchments.js';
import type {Network} from './catchments.js';
import type {PointCollection,ParamsByType} from './types.js';
const scope=self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage=({data}:MessageEvent<{sites:PointCollection;network:Network;params:ParamsByType['isochrone']}>)=>{
  try{scope.postMessage({value:isochrone(data.sites,data.network,data.params)});}catch(error){scope.postMessage({error:error instanceof Error?error.message:'Isochrone computation failed.'});}
};
