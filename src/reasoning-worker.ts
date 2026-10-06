import type {ReasoningRequest,ReasoningResponse} from './worker-types.js';
interface Term {value:string;termType:string;datatype?:{value:string};language?:string}
interface Quad {subject:Term;predicate:Term;object:Term}
declare const self:DedicatedWorkerGlobalScope & {
  eyereasoner:{n3reasoner:(input:string,query:undefined,options:{outputType:'quads'})=>Promise<Quad[]>};
};
importScripts('../vendor/eye-21.1.24.js');
self.onmessage=async ({data}:MessageEvent<ReasoningRequest>)=>{
  let response:ReasoningResponse;
  try {
    const quads=await self.eyereasoner.n3reasoner(data.input,undefined,{outputType:'quads'});
    response={id:data.id,quads:quads.map(q=>({subject:q.subject.value,subjectType:q.subject.termType,predicate:q.predicate.value,object:q.object.value,objectType:q.object.termType,...(q.object.termType==='Literal'?{datatype:q.object.datatype?.value,language:q.object.language}:{})}))};
  }catch(error){response={id:data.id,error:error instanceof Error?error.message:String(error)};}
  self.postMessage(response);
};
