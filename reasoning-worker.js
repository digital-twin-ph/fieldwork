importScripts('./vendor/eye-21.1.24.js');
self.onmessage=async ({data})=>{
  try {
    const quads=await self.eyereasoner.n3reasoner(data.input,undefined,{outputType:'quads'});
    self.postMessage({id:data.id,quads:quads.map(q=>({subject:q.subject.value,predicate:q.predicate.value,object:q.object.value}))});
  }catch(error){self.postMessage({id:data.id,error:String(error.message||error)});}
};
