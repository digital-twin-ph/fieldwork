import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {requestOSM,abortMessage,ATTEMPT_MS,STALL_MS,RATE_WINDOW_MS} from '../build/street-network.js';

// The practitioner, 2026-10-22, watching a province download stop at 59.4 MB: *"If the upcoming
// constraints are response timeouts, why use them to stop ongoing downloads already, meaning the
// API already responded?!"* ATTEMPT_MS was armed before the fetch and never cleared when the
// response arrived, so it ran on through the body and aborted a transfer that was working.
const boundary={type:'Polygon',coordinates:[[[-0.14,51.51],[-0.13,51.51],[-0.13,51.52],[-0.14,51.52],[-0.14,51.51]]]};
const way=(id,a,b)=>({type:'way',id,nodes:[a,b],tags:{highway:'residential'}});
const osm={version:0.6,elements:[
  {type:'node',id:1,lat:51.511,lon:-0.139},{type:'node',id:2,lat:51.512,lon:-0.138},
  {type:'node',id:3,lat:51.513,lon:-0.137},way(10,1,2),way(11,2,3)]};

const isStatus=url=>String(url).endsWith('/status');
const isProbe=init=>String(init?.body??'').includes('node%281%29');
const isCount=init=>/out\+count|out%20count/.test(String(init?.body??''));

test('a transfer that keeps delivering is not stopped for taking longer than the response budget',async()=>{
  mock.timers.enable({apis:['setTimeout','Date']});
  try{
    const body=JSON.stringify(osm),parts=[body.slice(0,40),body.slice(40,90),body.slice(90)];
    let sent=0,releaseChunk;
    // THE FIXTURE HONOURS THE SIGNAL, as a real fetch does: aborting the controller errors the
    // body stream. Without this the mock Response ignores the abort entirely and the test passes
    // whether or not the budget is rearmed -- which is how it was first written, and it proved
    // nothing until it was run against the unfixed code and passed.
    const streamFor=signal=>new ReadableStream({async pull(controller){
      if(sent>=parts.length){controller.close();return;}
      // Each chunk waits on a gate the test opens, so the test decides how much silence sits
      // between them. Four minutes of it in total, well past the 3-minute response budget.
      const aborted=new Promise((_,reject)=>signal?.addEventListener('abort',
        ()=>reject(new Error('signal is aborted without reason')),{once:true}));
      try{await Promise.race([new Promise(resolve=>{releaseChunk=resolve;}),aborted]);}
      catch(error){controller.error(error);return;}
      controller.enqueue(new TextEncoder().encode(parts[sent++]));
    }});
    const fetcher=async(url,init)=>{
      if(isStatus(url))return new Response('Rate limit: 2\n2 slots available now.\n',{status:200});
      if(isProbe(init))return new Response(JSON.stringify({version:0.6,elements:[]}));
      if(isCount(init))return new Response(JSON.stringify({version:0.6,elements:[
        {type:'count',id:0,tags:{ways:'2',total:'2'}}]}));
      return new Response(streamFor(init?.signal),{headers:{'content-type':'application/json'}});
    };
    const pending=requestOSM(boundary,250,fetcher);
    // Let the probe, the status read and the count settle, ticking the inter-round pause.
    for(let i=0;i<40;i++){mock.timers.tick(2100);await Promise.resolve();}
    // Now feed the body with 80 seconds of silence before each chunk: 240 s in all, where the
    // response budget is 180 s. Before this fix the second gap aborted the transfer.
    for(const _ of parts){
      for(let i=0;i<40;i++)await Promise.resolve();
      assert.ok(releaseChunk,'the stream asked for a chunk');
      mock.timers.tick(80_000);
      releaseChunk();releaseChunk=undefined;
      for(let i=0;i<40;i++)await Promise.resolve();
    }
    for(let i=0;i<60;i++){mock.timers.tick(10);await Promise.resolve();}
    const network=await pending;
    assert.equal(network.nodes.length,3,'the graph arrives whole after four minutes of transfer');
  }finally{mock.timers.reset();}
});

// *"If nothing ever arrives, that means there is no download. But there is an ongoing download --
// this is where we are applying that wrong cap."* So the response budget keeps its sentence, and
// it is only ever said of a request that never began to answer.
test('the response budget speaks only for a request that never began to answer',()=>{
  const aborted=new Error('signal is aborted without reason');
  assert.match(abortMessage(aborted),/did not answer within 180 seconds/);
  assert.ok(!/stopped sending|said nothing/.test(abortMessage(aborted)),
    'nothing times out mid-stream, so there is no mid-stream timeout to report');
  // And the silence threshold is no longer that number: it says when a sentence appears, so it
  // is shorter. At 180,000 a stalled transfer looked like a working one for three minutes.
  assert.equal(STALL_MS,90_000,'the practitioner set this: time to give feedback, not to give up');
});

// *"There should be a cancel button for the user to stop downloads."* Nothing else ends one.
test('a download in progress is ended by the practitioner, and says what it had',async()=>{
  const body=JSON.stringify(osm),parts=[body.slice(0,40),body.slice(40)];
  let sent=0,releaseChunk;
  const streamFor=signal=>new ReadableStream({async pull(controller){
    if(sent>=parts.length){controller.close();return;}
    const aborted=new Promise((_,reject)=>signal?.addEventListener('abort',
      ()=>reject(new Error('signal is aborted without reason')),{once:true}));
    try{await Promise.race([new Promise(resolve=>{releaseChunk=resolve;}),aborted]);}
    catch(error){controller.error(error);return;}
    controller.enqueue(new TextEncoder().encode(parts[sent++]));
  }});
  const fetcher=async(url,init)=>{
    if(isStatus(url))return new Response('Rate limit: 2\n2 slots available now.\n',{status:200});
    if(isProbe(init))return new Response(JSON.stringify({version:0.6,elements:[]}));
    if(isCount(init))return new Response(JSON.stringify({version:0.6,elements:[
      {type:'count',id:0,tags:{ways:'2',total:'2'}}]}));
    return new Response(streamFor(init?.signal),{headers:{'content-type':'application/json'}});
  };
  const stop=new AbortController();
  const pending=requestOSM(boundary,250,fetcher,undefined,undefined,undefined,undefined,undefined,
    false,undefined,'walking',stop.signal);
  for(let i=0;i<200;i++)await Promise.resolve();
  assert.ok(releaseChunk,'the stream asked for its first chunk');
  releaseChunk();releaseChunk=undefined;
  for(let i=0;i<200;i++)await Promise.resolve();
  stop.abort();
  await assert.rejects(pending,error=>{
    assert.match(error.message,/^Stopped at 0\.0 MB\./);
    assert.match(error.message,/what arrived was not kept/);
    return true;
  });
});
